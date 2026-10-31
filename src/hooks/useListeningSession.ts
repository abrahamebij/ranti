import { useCallback, useState } from 'react';
import { useListening } from '../providers/ListeningProvider';
import { processTranscript as runExtraction } from '../services/transcriptProcessor';

export { EVENTS_QUERY_KEY } from '../services/transcriptProcessor';

/**
 * Thin hook over the app-level ListeningProvider. Every screen sees the same
 * real microphone state, so a switch can never contradict the mic.
 */
export function useListeningSession() {
  const listening = useListening();
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Used by the dev API check screen to extract from a transcript on demand.
  const processTranscript = useCallback(async (transcript: string) => {
    setIsManualProcessing(true);
    setManualError(null);
    try {
      await runExtraction(transcript);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setManualError(msg);
      console.error('[useListeningSession] Extraction/Save error:', err);
    } finally {
      setIsManualProcessing(false);
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (listening.isListening) {
      await listening.stop();
    } else {
      await listening.start();
    }
  }, [listening]);

  return {
    status: listening.status,
    isListening: listening.isListening,
    isProcessing: listening.isProcessing || isManualProcessing,
    lastError: manualError ?? listening.lastError,
    note: listening.note,
    toggleListening,
    startListening: listening.start,
    stopListening: listening.stop,
    processTranscript,
  };
}
