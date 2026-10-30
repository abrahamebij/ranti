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

  const updateMemoryMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Memory> }) =>
      storageService.updateMemory(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMORIES_QUERY_KEY });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: (id: string) => storageService.deleteMemory(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: MEMORIES_QUERY_KEY });
      const prev = queryClient.getQueryData<Memory[]>(MEMORIES_QUERY_KEY);
      queryClient.setQueryData<Memory[]>(MEMORIES_QUERY_KEY, (old = []) =>
        old.filter((m) => m.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(MEMORIES_QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
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
    updateMemory: updateMemoryMutation.mutateAsync,
    deleteMemory: deleteMemoryMutation.mutateAsync,
    isDeleting: deleteMemoryMutation.isPending,
  };
}

export function useMemory(id: string) {
  const { allMemories } = useMemories();
  return allMemories.find((m) => m.id === id);
}
