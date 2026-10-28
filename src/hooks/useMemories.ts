import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { Memory, MemoryCategory } from '../types';

export const MEMORIES_QUERY_KEY = ['memories'];

export function useMemories(filter?: MemoryCategory | 'All') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: MEMORIES_QUERY_KEY,
    queryFn: () => storageService.getMemories(),
  });

  const addMemoryMutation = useMutation({
    mutationFn: (newMem: Omit<Memory, 'id' | 'createdAt' | 'userId'>) =>
      storageService.addMemory(newMem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY });
    },
  });

  const memories = query.data ?? [];

  const filteredMemories =
    !filter || filter === 'All'
      ? memories
      : memories.filter((m) => m.category === filter);

  return {
    ...query,
    memories: filteredMemories,
    allMemories: memories,
    addMemory: addMemoryMutation.mutateAsync,
    isAdding: addMemoryMutation.isPending,
  };
}

export function useMemory(id: string) {
  const { allMemories } = useMemories();
  return allMemories.find((m) => m.id === id);
}
