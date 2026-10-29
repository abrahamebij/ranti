/**
 * Dev-only API check screen.
 * Reachable from Settings only when __DEV__ is true.
 *
 * Runs:
 *   1. A trivial chat completion against muse-spark-1.3
 *   2. A transcription call against muse-voice-transcribe-1.0
 *      using a short synthetic WAV embedded as a base64 data URI.
 *
 * Prints: status, latency, trimmed response — or the exact MetaApiError.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetaApiError, metaApiService } from '../services/metaApi';
import { colors } from '../lib/colors';

interface CheckResult {
  label: string;
  status: 'idle' | 'running' | 'ok' | 'error';
  statusCode?: number;
  latencyMs?: number;
  detail: string;
}

const INITIAL: CheckResult[] = [
  { label: 'Chat completion (muse-spark-1.3)', status: 'idle', detail: 'Not run yet.' },
  { label: 'ASR transcription (muse-voice-transcribe-1.0)', status: 'idle', detail: 'Not run yet.' },
];

// A minimal valid WAV file: 44-byte header + 100 bytes of silence (16-bit PCM, 16kHz, mono).
// Generated offline — no network needed to create the test sample.
const SILENT_WAV_BASE64 =
  'UklGRpQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YXAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAA=';

function resultColor(status: CheckResult['status']): string {
  if (status === 'ok') return '#166e3d';
  if (status === 'error') return '#b91c1c';
  return colors.muted;
}

export default function ApiCheckScreen() {
  const [results, setResults] = useState<CheckResult[]>(INITIAL);
  const [running, setRunning] = useState(false);

  function updateResult(index: number, patch: Partial<CheckResult>) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  async function runChecks() {
    setRunning(true);
    setResults(INITIAL.map((r) => ({ ...r, status: 'idle', detail: 'Waiting...' })));

    // --- Check 1: Chat completion ---
    updateResult(0, { status: 'running', detail: 'Sending request...' });
    const t0 = Date.now();
    try {
      const res = await metaApiService.answerQuestion('Say the word OK and nothing else.', [
        {
          id: 'test-1',
          userId: 'dev',
          title: 'Test memory',
          content: 'OK',
          category: 'General',
          people: [],
          createdAt: new Date().toISOString(),
        },
      ]);
      updateResult(0, {
        status: 'ok',
        latencyMs: Date.now() - t0,
        detail: `Response: "${res.text.slice(0, 120)}"`,
      });
    } catch (err: unknown) {
      updateResult(0, {
        status: 'error',
        latencyMs: Date.now() - t0,
        statusCode: err instanceof MetaApiError ? err.status : undefined,
        detail: err instanceof MetaApiError
          ? `[${err.code}] status=${err.status ?? 'n/a'}\n${err.message}\n\nRaw: ${(err.rawBody ?? '').slice(0, 300)}`
          : String(err),
      });
    }

    // --- Check 2: ASR transcription ---
    updateResult(1, { status: 'running', detail: 'Sending audio...' });
    const t1 = Date.now();

    // Send the WAV as a data URI — React Native's fetch handles data: URIs in FormData.
    const wavDataUri = `data:audio/wav;base64,${SILENT_WAV_BASE64}`;

    try {
      const transcript = await metaApiService.transcribeAudio(wavDataUri);
      updateResult(1, {
        status: 'ok',
        latencyMs: Date.now() - t1,
        detail: transcript
          ? `Transcript: "${transcript.slice(0, 120)}"`
          : 'Accepted — empty transcript (silent sample, expected).',
      });
    } catch (err: unknown) {
      updateResult(1, {
        status: 'error',
        latencyMs: Date.now() - t1,
        statusCode: err instanceof MetaApiError ? err.status : undefined,
        detail: err instanceof MetaApiError
          ? `[${err.code}] status=${err.status ?? 'n/a'}\n${err.message}\n\nRaw: ${(err.rawBody ?? '').slice(0, 300)}`
          : String(err),
      });
    }

    setRunning(false);
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>Back to Settings</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>
          API Check
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
          Dev only. Tests the live Meta API connection from this device.
        </Text>

        {/* Run button */}
        <TouchableOpacity
          onPress={runChecks}
          disabled={running}
          style={{
            backgroundColor: running ? colors.muted : colors.primary,
            borderRadius: 24,
            paddingVertical: 12,
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          {running ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Run checks</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {results.map((r) => (
          <View
            key={r.label}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, flex: 1 }}>
                {r.label}
              </Text>
              {r.status === 'running' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {(r.status === 'ok' || r.status === 'error') && (
                <Text style={{ fontSize: 12, fontWeight: '700', color: resultColor(r.status) }}>
                  {r.status.toUpperCase()}
                  {r.statusCode != null ? ` ${r.statusCode}` : ''}
                  {r.latencyMs != null ? `  ${r.latencyMs}ms` : ''}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, fontFamily: 'monospace' }}>
              {r.detail}
            </Text>
          </View>
        ))}

        {/* Notes */}
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
          The transcription test sends a silent WAV (16kHz mono PCM). If the API rejects the audio format it will appear as an error above — report the exact status and raw body from the error card.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
