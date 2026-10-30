import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { metaApiService } from '../services/metaApi';
import { storageService } from '../services/storage';
import { audioRecorder, AudioSegment } from '../services/audioRecorder';
import { reminderScheduler } from '../services/reminderScheduler';
import { MEMORIES_QUERY_KEY } from './useMemories';
import { TASKS_QUERY_KEY } from './useTasks';
import { REMINDERS_QUERY_KEY } from './useReminders';

export const EVENTS_QUERY_KEY = ['events'];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function useListeningSession() {
  const [isListening, setIsListening] = useState(audioRecorder.isRecording());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const previousTranscriptRef = useRef<string>('');
  const recentSavedHashesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = audioRecorder.onStateChange((recording) => {
      setIsListening(recording);
    });
    return unsub;
  }, []);

  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript || transcript.trim().length === 0) return;
      setIsProcessing(true);
      setLastError(null);

      try {
        // Fetch recent memories for rolling context to avoid duplicate extractions
        const existingMemories = await storageService.getMemories().catch(() => []);
        const recentMemoryTitles = existingMemories.slice(0, 5).map((m) => m.title);

        const insights = await metaApiService.extractInsights(transcript, {
          previousTranscriptChunk: previousTranscriptRef.current,
          recentMemoryTitles,
          nowIso: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        previousTranscriptRef.current = transcript;

        let hasNewWrites = false;

        // 1. Memories (with deterministic duplicate check)
        for (const mem of insights.memories) {
          const hash = normalizeText(mem.title);
          if (!recentSavedHashesRef.current.has(hash)) {
            recentSavedHashesRef.current.add(hash);
            await storageService.addMemory(mem);
            hasNewWrites = true;
          }
        }

        // 2. Tasks
        for (const task of insights.tasks) {
          const hash = normalizeText(task.title);
          if (!recentSavedHashesRef.current.has(hash)) {
            recentSavedHashesRef.current.add(hash);
            await storageService.addTask(task);
            hasNewWrites = true;
          }
        }

        // 3. Reminders
        for (const rem of insights.reminders) {
          const hash = normalizeText(rem.title + (rem.scheduledAt || ''));
          if (!recentSavedHashesRef.current.has(hash)) {
            recentSavedHashesRef.current.add(hash);
            const notifId = await reminderScheduler.scheduleReminder(rem);
            await storageService.addReminder({
              ...rem,
              notificationId: notifId || undefined,
            });
            hasNewWrites = true;
          }
        }

        // 4. Events
        for (const ev of insights.events) {
          const hash = normalizeText(ev.title + (ev.startAt || ''));
          if (!recentSavedHashesRef.current.has(hash)) {
            recentSavedHashesRef.current.add(hash);
            await storageService.addEvent(ev);
            hasNewWrites = true;
          }
        }

        // Keep cache size bounded
        if (recentSavedHashesRef.current.size > 100) {
          recentSavedHashesRef.current.clear();
        }

        // Invalidate only after successful writes
        if (hasNewWrites) {
          queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: REMINDERS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLastError(msg);
        console.error('[useListeningSession] Extraction/Save error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [queryClient]
  );

  const handleAudioSegment = useCallback(
    async (segment: AudioSegment) => {
      // In Phase 2/3, raw segments can be processed or connected
    },
    []
  );

  useEffect(() => {
    const unsubscribe = audioRecorder.onSegment(handleAudioSegment);
    return () => unsubscribe();
  }, [handleAudioSegment]);

  const toggleListening = useCallback(() => {
    setIsListening((prev) => {
      const next = !prev;
      if (next) {
        audioRecorder.startListening();
      } else {
        audioRecorder.stopListening();
      }
      return next;
    });
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    audioRecorder.startListening();
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    audioRecorder.stopListening();
  }, []);

  return {
    isListening,
    isProcessing,
    lastError,
    toggleListening,
    startListening,
    stopListening,
    processTranscript,
  };
}
