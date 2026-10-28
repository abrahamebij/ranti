import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { Task } from '../types';

export const TASKS_QUERY_KEY = ['tasks'];

export function useTasks(filter?: 'All' | 'Upcoming' | 'Completed') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => storageService.getTasks(),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: string) => storageService.toggleTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (newTask: Omit<Task, 'id' | 'createdAt' | 'userId'>) =>
      storageService.addTask(newTask),
    onSuccess: () => {
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
  };
}
