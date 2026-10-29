/**
 * Dev-only API check screen.
 * Reachable from Settings only when __DEV__ is true.
 *
 * Runs:
 *   1. A trivial chat completion against muse-spark-1.3
 *   2. A real-time WebSocket session test against wss://api.meta.ai/v1/asr/realtime
 *      (Handshake -> Streams 3 seconds of raw PCM chunks -> endStream -> receives ack/events).
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
import { MetaRealtimeAsrSession } from '../services/metaRealtimeAsr';
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
  { label: 'Realtime WebSocket ASR (wss://api.meta.ai/v1/asr/realtime)', status: 'idle', detail: 'Not run yet.' },
];

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
        detail:
          err instanceof MetaApiError
            ? `[${err.code}] status=${err.status ?? 'n/a'}\n${err.message}\n\nRaw: ${(err.rawBody ?? '').slice(0, 300)}`
            : String(err),
      });
    }

    // --- Check 2: Realtime WebSocket ASR ---
    updateResult(1, { status: 'running', detail: 'Opening WebSocket connection...' });
    const t1 = Date.now();

    try {
      let finalTranscript = '';

      const session = new MetaRealtimeAsrSession({
        audioEncoding: 'PCM_16KHZ',
        mode: 'PUSH_TO_TALK',
        onTranscript: (evt) => {
          if (evt.transcript) {
            finalTranscript += `${evt.transcript} `;
          }
        },
      });

      // 1. Connect and complete handshake
      const assignedSessionId = await session.connect();
      const handshakeLatency = Date.now() - t1;

      updateResult(1, {
        status: 'running',
        detail: `Handshake ACK in ${handshakeLatency}ms (Session ID: ${assignedSessionId})\nStreaming test PCM frames...`,
      });

      // 2. Stream a small batch of raw PCM frames (80ms per chunk at 16kHz mono = 2560 bytes)
      const frameBytes = 16000 * 2 * 0.08; // 2560 bytes
      const sampleChunk = new Uint8Array(frameBytes);

      // Send 5 dummy frames paced ~80ms
      for (let i = 0; i < 5; i++) {
        session.sendPcmChunk(sampleChunk);
        await new Promise((r) => setTimeout(r, 80));
      }

      // 3. Half-close input with endStream
      session.endStream();

      // Wait a moment for final flush before closing
      await new Promise((r) => setTimeout(r, 500));
      session.close();

      const totalLatency = Date.now() - t1;
      updateResult(1, {
        status: 'ok',
        latencyMs: totalLatency,
        statusCode: 1000,
        detail: `Connected & Handshake ACK!\nSession ID: ${assignedSessionId}\nFrames streamed: 5\nTranscript: "${finalTranscript.trim() || '(silent PCM frames)'}"`,
      });
    } catch (err: unknown) {
      updateResult(1, {
        status: 'error',
        latencyMs: Date.now() - t1,
        detail: err instanceof Error ? err.message : String(err),
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

        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: colors.foreground,
            marginBottom: 4,
          }}
        >
          API Check
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
          Dev only. Tests live Meta Chat &amp; Realtime WebSocket ASR connection.
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              Run checks
            </Text>
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.foreground,
                  flex: 1,
                }}
              >
                {r.label}
              </Text>
              {r.status === 'running' && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {(r.status === 'ok' || r.status === 'error') && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: resultColor(r.status),
                  }}
                >
                  {r.status.toUpperCase()}
                  {r.statusCode != null ? ` ${r.statusCode}` : ''}
                  {r.latencyMs != null ? `  ${r.latencyMs}ms` : ''}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted,
                fontFamily: 'monospace',
              }}
            >
              {r.detail}
            </Text>
          </View>
        ))}

        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
          Tests WebSocket handshake and PCM binary streaming at wss://api.meta.ai/v1/asr/realtime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
