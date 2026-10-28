import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { metaApiService } from '../services/metaApi';
import { storageService } from '../services/storage';
import { AudioSegment, SEGMENT_DURATION_MS, MIN_SEGMENT_BYTES } from '../services/audioRecorder';
import { MEMORIES_QUERY_KEY } from './useMemories';
import { TASKS_QUERY_KEY } from './useTasks';

/**
 * Manages the full ambient listening pipeline:
 *   mic capture (rolling 30s segments)
 *   -> muse-voice-transcribe-1.0
 *   -> muse-spark-1.3 extraction
 *   -> Firestore storage
 *   -> React Query cache invalidation
 */
export function useListeningSession() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    // 16kHz mono is sufficient for speech transcription and reduces file size
    sampleRate: 16_000,
    numberOfChannels: 1,
    bitRate: 64_000,
  });

  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartRef = useRef<number>(0);
  const processingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Transcription + extraction pipeline
  // ---------------------------------------------------------------------------

  const processSegment = useCallback(
    async (segment: AudioSegment) => {
      if (processingRef.current) return; // drop if previous still running
      processingRef.current = true;
      setIsProcessing(true);
      try {
        const transcript = await metaApiService.transcribeAudio(segment.uri);
        if (!transcript || transcript.trim().length === 0) return;

        const insights = await metaApiService.extractInsights(transcript);

        for (const mem of insights.memories) {
          await storageService.addMemory(mem);
        }
        for (const task of insights.tasks) {
          await storageService.addTask(task);
        }

        queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [queryClient]
  );

  // ---------------------------------------------------------------------------
  // Rolling segment rotation
  // ---------------------------------------------------------------------------

  const rotateSegment = useCallback(async () => {
    const startedAt = segmentStartRef.current;

    // Stop current recording and grab the URI before starting the next one
    await recorder.stop();
    const uri = recorder.uri;

    // Immediately begin a fresh segment so there is no gap
    await recorder.prepareToRecordAsync();
    recorder.record();
    segmentStartRef.current = Date.now();

    if (!uri) return;

    // Discard near-silent chunks by fetching Content-Length
    try {
      const info = await fetch(uri, { method: 'HEAD' });
      const size = parseInt(info.headers.get('Content-Length') ?? '0', 10);
      if (size < MIN_SEGMENT_BYTES) return;
    } catch {
      // If HEAD fails, proceed anyway — better to transcribe silence than lose speech
    }

    const segment: AudioSegment = {
      uri,
      durationMs: Date.now() - startedAt,
      timestamp: new Date(startedAt).toISOString(),
    };

    processSegment(segment);
  }, [recorder, processSegment]);

  // ---------------------------------------------------------------------------
  // Start / stop
  // ---------------------------------------------------------------------------

  const startListening = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      console.warn('Microphone permission denied.');
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    segmentStartRef.current = Date.now();
    setIsListening(true);

    segmentTimerRef.current = setInterval(rotateSegment, SEGMENT_DURATION_MS);
  }, [recorder, rotateSegment]);

  const stopListening = useCallback(async () => {
    if (segmentTimerRef.current !== null) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    // Finalise and emit the last partial segment
    const startedAt = segmentStartRef.current;
    await recorder.stop();
    const uri = recorder.uri;
    setIsListening(false);

    if (uri) {
      const segment: AudioSegment = {
        uri,
        durationMs: Date.now() - startedAt,
        timestamp: new Date(startedAt).toISOString(),
      };
      processSegment(segment);
    }
  }, [recorder, processSegment]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (segmentTimerRef.current !== null) {
        clearInterval(segmentTimerRef.current);
      }
      recorder.stop().catch(() => null);
    };
  }, [recorder]);

  return {
    isListening,
    isProcessing,
    toggleListening,
    startListening,
    stopListening,
  };
}
