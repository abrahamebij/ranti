import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { metaApiService } from '../services/metaApi';
import { storageService } from '../services/storage';
import { audioRecorder, AudioSegment } from '../services/audioRecorder';
import { MEMORIES_QUERY_KEY } from './useMemories';
import { TASKS_QUERY_KEY } from './useTasks';

export function useListeningSession() {
  const [isListening, setIsListening] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript || transcript.trim().length === 0) return;
      setIsProcessing(true);
      try {
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
        setIsProcessing(false);
      }
    },
    [queryClient]
  );

  const handleAudioSegment = useCallback(
    async (segment: AudioSegment) => {
      setIsProcessing(true);
      try {
        const transcript = await metaApiService.transcribeAudio(segment.uri);
        if (transcript) {
          await processTranscript(transcript);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [processTranscript]
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
    toggleListening,
    startListening,
    stopListening,
    processTranscript,
  };
}
