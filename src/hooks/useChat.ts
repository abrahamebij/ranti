import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { metaApiService } from '../services/metaApi';
import { buildGroundingContext } from '../services/recallContext';
import { ChatMessage } from '../types';

export const CHAT_QUERY_KEY = ['chat'];

export function useChat() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CHAT_QUERY_KEY,
    queryFn: () => storageService.getChatMessages(),
  });

  const askMutation = useMutation({
    mutationFn: async (questionText: string) => {
      const nowIso = new Date().toISOString();

      // 1. Add user message
      await storageService.addChatMessage({
        sender: 'user',
        text: questionText,
        createdAt: nowIso,
      });
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY });

      // 2. Fetch full grounding context (memories, tasks, reminders, events)
      const [memories, tasks, reminders, events] = await Promise.all([
        storageService.getMemories().catch(() => []),
        storageService.getTasks().catch(() => []),
        storageService.getReminders().catch(() => []),
        storageService.getEvents().catch(() => []),
      ]);

      const groundingContext = buildGroundingContext(questionText, {
        memories,
        tasks,
        reminders,
        events,
      });

      // 3. Query Muse Spark 1.3 with structured recall schema
      const response = await metaApiService.answerQuestionWithContext(
        questionText,
        groundingContext
      );

      // 4. Save assistant response with verified sources
      await storageService.addChatMessage({
        sender: 'assistant',
        text: response.text,
        createdAt: new Date().toISOString(),
        sources: response.sources.length > 0 ? response.sources : undefined,
        sourceMemoryTitle: response.sources[0]?.title,
        sourceMemoryId: response.sources[0]?.id,
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY });
    },
  });

  return {
    ...query,
    messages: query.data ?? [],
    askQuestion: askMutation.mutateAsync,
    isThinking: askMutation.isPending,
    error: askMutation.error,
  };
}
