import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { metaApiService } from '../services/metaApi';
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
      // 1. Add user message
      await storageService.addChatMessage({
        sender: 'user',
        text: questionText,
        createdAt: 'Just now',
      });
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY });

      // 2. Fetch latest memories as grounding context
      const memories = await storageService.getMemories();

      // 3. Query Muse Spark 1.3
      const response = await metaApiService.answerQuestion(questionText, memories);

      // 4. Save assistant response
      await storageService.addChatMessage({
        sender: 'assistant',
        text: response.text,
        createdAt: 'Just now',
        sourceMemoryTitle: response.sourceMemory?.title,
        sourceMemoryId: response.sourceMemory?.id,
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
  };
}
