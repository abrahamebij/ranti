/**
 * Dev-only API check screen.
 * Reachable from Settings only when __DEV__ is true.
 *
 * Runs:
 *   1. A trivial chat completion against muse-spark-1.3
 *   2. A transcription call against muse-voice-transcribe-1.0
 *      using a validated 16kHz mono 16-bit WAV file created in cache.
 *
 * Displays: raw status, latency, response details / exact error.
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
import * as FileSystem from 'expo-file-system/legacy';
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

// Single continuous verified base64 string for 16kHz mono 16-bit PCM WAV (684 bytes).
const VERIFIED_WAV_BASE64 =
  'UklGRqQCAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YYACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

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

    // --- Check 2: ASR transcription ---
    updateResult(1, { status: 'running', detail: 'Writing valid 16kHz WAV to cache...' });
    const t1 = Date.now();
    const tempWavUri = `${FileSystem.cacheDirectory}test_sample_${Date.now()}.wav`;

    try {
      // Clean base64 string of any extraneous characters or whitespace
      const cleanBase64 = VERIFIED_WAV_BASE64.replace(/[^A-Za-z0-9+/=]/g, '');

      // 1. Write the clean valid WAV bytes to cache
      await FileSystem.writeAsStringAsync(tempWavUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      updateResult(1, { status: 'running', detail: 'Validating & uploading WAV to Meta ASR...' });

      // 2. Call the updated transcribeAudio matching Meta's cookbook contract
      const response = await metaApiService.transcribeAudio(tempWavUri, {
        mode: 'PUSH_TO_TALK',
        keywords: ['Ranti', 'test'],
      });

      updateResult(1, {
        status: 'ok',
        latencyMs: Date.now() - t1,
        statusCode: 200,
        detail: `sessionId: ${response.sessionId || 'n/a'}\nduration: ${response.audioDurationMs ?? 'n/a'}ms\ntranscript: "${response.transcript || '(silent sample)'}"`,
      });
    } catch (err: unknown) {
      updateResult(1, {
        status: 'error',
        latencyMs: Date.now() - t1,
        statusCode: err instanceof MetaApiError ? err.status : undefined,
        detail:
          err instanceof MetaApiError
            ? `[${err.code}] status=${err.status ?? 'n/a'}\n${err.message}\n\nRaw: ${(err.rawBody ?? '').slice(0, 300)}`
            : String(err),
      });
    } finally {
      // 3. Clean up the temp file
      try {
        const info = await FileSystem.getInfoAsync(tempWavUri);
        if (info.exists) {
          await FileSystem.deleteAsync(tempWavUri, { idempotent: true });
        }
      } catch (cleanupErr) {
        if (__DEV__) {
          console.warn('[ApiCheckScreen] Failed to delete temp wav file:', cleanupErr);
        }
      }
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
          Dev only. Tests live Meta Chat &amp; ASR endpoints matching cookbook contract.
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
          Validates 16kHz mono WAV header before uploading &apos;request&apos; JSON + &apos;audio&apos; WAV parts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
