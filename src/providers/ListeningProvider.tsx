/**
 * App-level ambient listening controller.
 *
 * Owns the microphone stream and the Meta realtime ASR socket so the Settings
 * switch (or anything else) controls the real mic. One state machine:
 *   idle -> starting -> listening <-> reconnecting
 *   any -> error (readable message), stop() -> idle
 *
 * LIMITATION: expo-audio's Android foreground service is attached to the file
 * recorder, not to useAudioStream. Listening therefore works while the app is
 * open (the screen is kept awake). It may be cut off when the app is backgrounded.
 */

import { useKeepAwake } from 'expo-keep-awake';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  MetaRealtimeAsrSession,
  RealtimeTranscriptEvent,
  RealtimeTurnCompleteEvent,
} from '../services/metaRealtimeAsr';
import { processTranscript } from '../services/transcriptProcessor';
import { storageService } from '../services/storage';

export type ListeningStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'reconnecting'
  | 'error';

interface ListeningContextValue {
  status: ListeningStatus;
  /** True whenever the user wants the mic on (starting, listening or reconnecting). */
  isListening: boolean;
  isProcessing: boolean;
  lastError: string | null;
  note: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const ListeningContext = createContext<ListeningContextValue | null>(null);

const FINAL_FALLBACK_MS = 10_000;
const MAX_BACKOFF_MS = 15_000;
const TRANSCRIPT_FLUSH_INTERVAL_MS = 60_000;

function KeepScreenAwake() {
  useKeepAwake('ranti-listening');
  return null;
}

export function ListeningProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ListeningStatus>('idle');
  const [pendingJobs, setPendingJobs] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const statusRef = useRef<ListeningStatus>('idle');
  const wantListeningRef = useRef(false);
  const sessionRef = useRef<MetaRealtimeAsrSession | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const seenTurnIdsRef = useRef<Set<string>>(new Set());
  const finalsBufferRef = useRef<string[]>([]);
  const finalFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const unsavedTranscriptsRef = useRef<string[]>([]);
  const transcriptFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlushingTranscriptsRef = useRef(false);

  const updateStatus = useCallback((next: ListeningStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // ---- Durable transcript buffer -------------------------------------------

  const enqueueTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    transcriptWriteQueueRef.current = transcriptWriteQueueRef.current.then(async () => {
      try {
        await storageService.addPendingTranscript(trimmed);
      } catch (err) {
        unsavedTranscriptsRef.current.push(trimmed);
        const msg = err instanceof Error ? err.message : String(err);
        setLastError(`Couldn't buffer what I heard: ${msg}`);
        console.error('[Listening] transcript buffer failed:', err);
      }
    });
  }, []);

  const flushPendingTranscripts = useCallback(async () => {
    if (isFlushingTranscriptsRef.current) return;
    isFlushingTranscriptsRef.current = true;
    try {
      const unsaved = unsavedTranscriptsRef.current.splice(0);
      unsaved.forEach((text) => enqueueTranscript(text));
      await transcriptWriteQueueRef.current;

      const pending = await storageService.getPendingTranscripts();
      for (const transcript of pending) {
        setPendingJobs((n) => n + 1);
        try {
          await processTranscript(transcript.text);
          await storageService.deletePendingTranscript(transcript.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLastError(`Couldn't process buffered transcript: ${msg}`);
          console.error('[Listening] buffered transcript failed:', err);
          break;
        } finally {
          setPendingJobs((n) => Math.max(0, n - 1));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`Couldn't read buffered transcripts: ${msg}`);
      console.error('[Listening] transcript flush failed:', err);
    } finally {
      isFlushingTranscriptsRef.current = false;
    }
  }, [enqueueTranscript]);

  const startTranscriptFlushTimer = useCallback(() => {
    if (transcriptFlushIntervalRef.current) return;
    transcriptFlushIntervalRef.current = setInterval(() => {
      void flushPendingTranscripts();
    }, TRANSCRIPT_FLUSH_INTERVAL_MS);
  }, [flushPendingTranscripts]);

  const stopTranscriptFlushTimer = useCallback(() => {
    if (transcriptFlushIntervalRef.current) {
      clearInterval(transcriptFlushIntervalRef.current);
      transcriptFlushIntervalRef.current = null;
    }
  }, []);

  const clearFinalFallback = useCallback(() => {
    if (finalFallbackTimerRef.current) {
      clearTimeout(finalFallbackTimerRef.current);
      finalFallbackTimerRef.current = null;
    }
  }, []);

  // ---- Socket events --------------------------------------------------------

  const handleTranscript = useCallback(
    (evt: RealtimeTranscriptEvent) => {
      // Only finalized segments matter; partials are cumulative previews.
      if (!evt.final || !evt.transcript?.trim()) return;
      finalsBufferRef.current = [evt.transcript.trim()];
      // Safety net: if the whole-turn event never arrives, use the finals.
      clearFinalFallback();
      finalFallbackTimerRef.current = setTimeout(() => {
        if (finalsBufferRef.current.length > 0) {
          enqueueTranscript(finalsBufferRef.current.join(' '));
          finalsBufferRef.current = [];
        }
      }, FINAL_FALLBACK_MS);
    },
    [clearFinalFallback, enqueueTranscript]
  );

  const handleTurnComplete = useCallback(
    (evt: RealtimeTurnCompleteEvent) => {
      const id = String(evt.turnId);
      // Whole-turn transcript replaces the finals we were holding for it.
      finalsBufferRef.current = [];
      clearFinalFallback();
      if (seenTurnIdsRef.current.has(id)) return;
      seenTurnIdsRef.current.add(id);
      if (seenTurnIdsRef.current.size > 200) seenTurnIdsRef.current.clear();
      enqueueTranscript(evt.transcript ?? '');
    },
    [clearFinalFallback, enqueueTranscript]
  );

  // ---- Microphone stream ----------------------------------------------------

  const onBuffer = useCallback((buffer: { data: ArrayBuffer }) => {
    const session = sessionRef.current;
    if (!session || !session.isOpen() || !buffer.data) return;
    try {
      session.sendPcmChunk(buffer.data);
    } catch {
      // Socket dropped between the check and the send. Reconnect logic handles it.
    }
  }, []);

  const { stream, isStreaming } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer,
  });

  // ---- Socket lifecycle -----------------------------------------------------

  const scheduleReconnectRef = useRef<(minDelayMs?: number) => void>(() => {});

  const openSession = useCallback(async () => {
    const session = new MetaRealtimeAsrSession({
      mode: 'ENDPOINTING',
      audioEncoding: 'PCM_16KHZ',
      onTranscript: handleTranscript,
      onTurnComplete: handleTurnComplete,
      onError: (err) => {
        console.warn('[Listening] ASR error:', err.message);
        setLastError(err.message);
      },
      onClose: (code, reason) => {
        if (sessionRef.current !== session) return; // old session, ignore
        sessionRef.current = null;
        if (!wantListeningRef.current) return; // we closed it on purpose
        if (code === 1008) {
          // Bad request. Retrying would loop forever.
          wantListeningRef.current = false;
          stream.stop();
          setLastError(
            `Transcription service rejected the connection (${reason || 'code 1008'}).`
          );
          updateStatus('error');
          return;
        }
        // 1011 (server error / 60 minute cap), 1013 (rate limit) and network drops.
        scheduleReconnectRef.current(code === 1013 ? 10_000 : 0);
      },
    });
    await session.connect();
    sessionRef.current = session;
  }, [handleTranscript, handleTurnComplete, stream, updateStatus]);

  const scheduleReconnect = useCallback(
    (minDelayMs = 0) => {
      if (!wantListeningRef.current || reconnectTimerRef.current) return;
      updateStatus('reconnecting');
      const attempt = reconnectAttemptsRef.current++;
      const delay = Math.max(minDelayMs, Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS));
      reconnectTimerRef.current = setTimeout(async () => {
        reconnectTimerRef.current = null;
        if (!wantListeningRef.current) return;
        try {
          await openSession();
          reconnectAttemptsRef.current = 0;
          setLastError(null);
          updateStatus('listening');
        } catch (err) {
          console.warn('[Listening] reconnect failed:', err);
          scheduleReconnectRef.current();
        }
      }, delay);
    },
    [openSession, updateStatus]
  );
  scheduleReconnectRef.current = scheduleReconnect;

  // ---- Public controls ------------------------------------------------------

  const start = useCallback(async () => {
    if (statusRef.current === 'starting' || statusRef.current === 'listening' || statusRef.current === 'reconnecting') {
      return;
    }
    setLastError(null);
    setNote(null);
    updateStatus('starting');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setLastError(
          'Microphone permission is off. Allow it for Ranti in your phone settings, then try again.'
        );
        updateStatus('error');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: true,
      });

      wantListeningRef.current = true;
      reconnectAttemptsRef.current = 0;
      startTranscriptFlushTimer();
      await openSession();
      await stream.start();
      updateStatus('listening');
    } catch (err) {
      wantListeningRef.current = false;
      stopTranscriptFlushTimer();
      sessionRef.current?.close();
      sessionRef.current = null;
      try {
        stream.stop();
      } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`Couldn't start listening: ${msg}`);
      updateStatus('error');
    }
  }, [openSession, startTranscriptFlushTimer, stopTranscriptFlushTimer, stream, updateStatus]);

  const stop = useCallback(async () => {
    wantListeningRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    try {
      stream.stop();
    } catch {}

    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      session.endStream();
      // Give the server a moment to deliver the last turn, then close.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      session.close();
    }

    // Persist any final server events, but leave processing to the one-minute timer.
    if (finalsBufferRef.current.length > 0) {
      enqueueTranscript(finalsBufferRef.current.join(' '));
      finalsBufferRef.current = [];
    }
    clearFinalFallback();
    await transcriptWriteQueueRef.current;
    updateStatus('idle');
  }, [
    clearFinalFallback,
    enqueueTranscript,
    startTranscriptFlushTimer,
    stopTranscriptFlushTimer,
    stream,
    updateStatus,
  ]);

  // ---- Background / foreground handling ------------------------------------

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !wantListeningRef.current) return;
      // Back in the foreground: make sure mic and socket are alive again.
      try {
        if (!isStreaming) {
          setNote('Listening was interrupted while Ranti was in the background. Resumed.');
          await stream.start();
        }
        if (!sessionRef.current || !sessionRef.current.isOpen()) {
          scheduleReconnectRef.current();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        wantListeningRef.current = false;
        setLastError(`Couldn't resume listening: ${msg}`);
        updateStatus('error');
      }
    });
    return () => sub.remove();
  }, [isStreaming, stream, updateStatus]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopTranscriptFlushTimer();
      if (finalFallbackTimerRef.current) clearTimeout(finalFallbackTimerRef.current);
      sessionRef.current?.close();
    };
  }, [stopTranscriptFlushTimer]);

  const isListening =
    status === 'starting' || status === 'listening' || status === 'reconnecting';

  const value = useMemo<ListeningContextValue>(
    () => ({
      status,
      isListening,
      isProcessing: pendingJobs > 0,
      lastError,
      note,
      start,
      stop,
    }),
    [status, isListening, pendingJobs, lastError, note, start, stop]
  );

  return (
    <ListeningContext.Provider value={value}>
      {isListening ? <KeepScreenAwake /> : null}
      {children}
    </ListeningContext.Provider>
  );
}

export function useListening(): ListeningContextValue {
  const ctx = useContext(ListeningContext);
  if (!ctx) {
    throw new Error('useListening must be used inside <ListeningProvider>.');
  }
  return ctx;
}
