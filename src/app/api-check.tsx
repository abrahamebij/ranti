/**
 * Dev-only API check screen.
 * Tests live Meta Chat, Realtime WebSocket ASR, and Phase 4 Extraction & Save Pipeline.
 */

import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioStream, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { useListeningSession } from '../hooks/useListeningSession';
import { MetaApiError, metaApiService } from '../services/metaApi';
import { MetaRealtimeAsrSession, RealtimeTranscriptEvent } from '../services/metaRealtimeAsr';
import { runExtractionFixtures } from '../services/extractionFixtures';
import { colors } from '../lib/colors';

interface CheckResult {
  label: string;
  status: 'idle' | 'running' | 'ok' | 'error';
  latencyMs?: number;
  detail: string;
}

const INITIAL_RESULTS: CheckResult[] = [
  { label: 'Chat completion (muse-spark-1.3)', status: 'idle', detail: 'Not run yet.' },
  { label: 'Realtime WebSocket Handshake', status: 'idle', detail: 'Not run yet.' },
];

export default function ApiCheckScreen() {
  const [results, setResults] = useState<CheckResult[]>(INITIAL_RESULTS);
  const [running, setRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [liveStatus, setLiveStatus] = useState<string>('Press below to record voice.');

  const { processTranscript, isProcessing } = useListeningSession();
  const liveSessionRef = useRef<MetaRealtimeAsrSession | null>(null);

  const onBuffer = useCallback((buffer: { data: ArrayBuffer }) => {
    if (liveSessionRef.current && buffer.data) {
      try {
        liveSessionRef.current.sendPcmChunk(buffer.data);
      } catch (err) {
        console.warn('[ApiCheck] sendPcmChunk error:', err);
      }
    }
  }, []);

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer,
  });

  const startVoiceRecording = async () => {
    try {
      setLiveTranscript('');
      setLiveStatus('Requesting mic permissions...');
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setLiveStatus('Microphone permission denied.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      setLiveStatus('Connecting to Meta Realtime ASR...');

      const session = new MetaRealtimeAsrSession({
        audioEncoding: 'PCM_16KHZ',
        mode: 'PUSH_TO_TALK',
        onTranscript: (evt: RealtimeTranscriptEvent) => {
          if (evt.transcript) {
            setLiveTranscript((prev) => `${prev} ${evt.transcript}`.trim());
          }
        },
        onError: (err) => setLiveStatus(`Error: ${err.message}`),
      });

      liveSessionRef.current = session;
      const sid = await session.connect();
      setLiveStatus(`Listening live! Speak now... (Session: ${sid.slice(0, 10)}...)`);
      setIsRecording(true);
      await stream.start();
    } catch (err) {
      setLiveStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      setLiveStatus('Finalizing audio...');
      stream.stop();
      if (liveSessionRef.current) {
        liveSessionRef.current.endStream();
        setTimeout(async () => {
          liveSessionRef.current?.close();
          liveSessionRef.current = null;
          setIsRecording(false);

          if (liveTranscript.trim()) {
            setLiveStatus('Extracting structured memories/tasks & saving to db...');
            await processTranscript(liveTranscript);
            setLiveStatus('Saved to database! Check Today & Reminders tabs.');
          } else {
            setLiveStatus('Done (no speech detected).');
          }
        }, 600);
      } else {
        setIsRecording(false);
      }
    } catch (err) {
      setLiveStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
    }
  };

  const updateResult = (index: number, patch: Partial<CheckResult>) => {
    setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const runChecks = async () => {
    setRunning(true);
    setResults(INITIAL_RESULTS.map((r) => ({ ...r, status: 'idle', detail: 'Waiting...' })));

    // 1. Chat Completion
    updateResult(0, { status: 'running', detail: 'Sending prompt...' });
    const t0 = Date.now();
    try {
      const res = await metaApiService.answerQuestion('Say the word OK and nothing else.', [
        { id: '1', userId: 'dev', title: 'T', content: 'OK', category: 'General', people: [], createdAt: '' },
      ]);
      updateResult(0, { status: 'ok', latencyMs: Date.now() - t0, detail: `Response: "${res.text.slice(0, 100)}"` });
    } catch (err) {
      updateResult(0, { status: 'error', latencyMs: Date.now() - t0, detail: err instanceof MetaApiError ? err.message : String(err) });
    }

    // 2. Realtime WebSocket
    updateResult(1, { status: 'running', detail: 'Connecting to WebSocket...' });
    const t1 = Date.now();
    try {
      const session = new MetaRealtimeAsrSession({ audioEncoding: 'PCM_16KHZ', mode: 'PUSH_TO_TALK' });
      const sid = await session.connect();
      session.sendPcmChunk(new Uint8Array(2560));
      session.endStream();
      await new Promise((r) => setTimeout(r, 300));
      session.close();
      updateResult(1, { status: 'ok', latencyMs: Date.now() - t1, detail: `Connected! Session: ${sid}` });
    } catch (err) {
      updateResult(1, { status: 'error', latencyMs: Date.now() - t1, detail: err instanceof Error ? err.message : String(err) });
    }

    // 3. Run Extraction Fixtures
    const fixtures = await runExtractionFixtures();
    const fixtureSummary = fixtures.map((f) => `${f.name}: ${f.passed ? 'PASSED' : 'FAILED'}\n  ${f.detail}`).join('\n');
    setResults((prev) => [
      ...prev,
      {
        label: 'Extraction Schema & Temporal Test',
        status: fixtures.every((f) => f.passed) ? 'ok' : 'error',
        detail: fixtureSummary,
      },
    ]);

    setRunning(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>Back to Settings</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>
          Live Voice &amp; Extraction Test
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
          Speak to test live transcription + structured extraction + Firestore save.
        </Text>

        {/* Live Voice Box */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
            Speak Live &amp; Save
          </Text>

          <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 14, minHeight: 90, marginBottom: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
            {liveTranscript ? (
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                &ldquo;{liveTranscript}&rdquo;
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: colors.muted, fontStyle: 'italic' }}>
                {isRecording ? 'Listening live... speak now.' : 'Say e.g. "Remind me to call James tomorrow at 3pm"'}
              </Text>
            )}
          </View>

          <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 14, fontFamily: 'monospace' }}>
            {isProcessing ? 'Processing extraction & Firestore write...' : liveStatus}
          </Text>

          <TouchableOpacity
            onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isProcessing}
            style={{ backgroundColor: isRecording ? '#b91c1c' : colors.primary, borderRadius: 24, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {isRecording ? 'Stop & Save to DB' : 'Record My Voice'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Diagnostic Checks */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Automated Diagnostics</Text>
          <TouchableOpacity onPress={runChecks} disabled={running}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              {running ? 'Running...' : 'Run Diagnostics'}
            </Text>
          </TouchableOpacity>
        </View>

        {results.map((r, i) => (
          <View key={`${r.label}-${i}`} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, flex: 1 }}>{r.label}</Text>
              {r.status === 'running' && <ActivityIndicator size="small" color={colors.primary} />}
              {(r.status === 'ok' || r.status === 'error') && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: r.status === 'ok' ? '#166e3d' : '#b91c1c' }}>
                  {r.status.toUpperCase()} {r.latencyMs != null ? `${r.latencyMs}ms` : ''}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, fontFamily: 'monospace' }}>{r.detail}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
