import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { Task } from '../types';

export const TASKS_QUERY_KEY = ['tasks'];

interface MutationContext {
  previousTasks?: Task[];
}

export function useTasks(filter?: 'All' | 'Upcoming' | 'Completed') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => storageService.getTasks(),
  });

  // Optimistic Toggle Task (immediate check/uncheck)
  const toggleTaskMutation = useMutation<Task[], Error, string, MutationContext>({
    mutationFn: (taskId: string) => storageService.toggleTask(taskId),
    onMutate: async (taskId: string) => {
      // 1. Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });

      // 2. Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);

      // 3. Optimistically toggle the task in cache
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) =>
        old.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      // Always sync with server in background
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  // Optimistic Add Task (immediate appearance on save)
  const addTaskMutation = useMutation<
    Task,
    Error,
    Omit<Task, 'id' | 'createdAt' | 'userId'>,
    MutationContext
  >({
    mutationFn: (newTask) => storageService.addTask(newTask),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY);

      const optimisticTask: Task = {
        ...newTask,
        id: `optimistic-${Date.now()}`,
        userId: 'current-user',
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) => [
        optimisticTask,
        ...old,
      ]);

      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const tasks = query.data ?? [];

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'Completed') return t.completed;
    if (filter === 'Upcoming') return !t.completed;
    return true;
  });

  return {
    ...query,
    tasks: filteredTasks,
    allTasks: tasks,
    toggleTask: toggleTaskMutation.mutate,
    addTask: addTaskMutation.mutateAsync,
    isToggling: toggleTaskMutation.isPending,
    isAdding: addTaskMutation.isPending,
  };
}
