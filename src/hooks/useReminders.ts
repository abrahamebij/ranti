import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storageService } from '../services/storage';
import { reminderScheduler } from '../services/reminderScheduler';
import { Reminder } from '../types';

export const REMINDERS_QUERY_KEY = ['reminders'];

interface MutationContext {
  previousReminders?: Reminder[];
}

export function useReminders(filter?: 'All' | 'Upcoming' | 'Completed') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: REMINDERS_QUERY_KEY,
    queryFn: () => storageService.getReminders(),
  });

  // Toggle Reminder status (pending <-> delivered)
  const toggleReminderMutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (reminderId: string) => {
      const all = query.data ?? [];
      const target = all.find((r) => r.id === reminderId);
      if (!target) return;

      const newStatus = target.status === 'delivered' ? 'pending' : 'delivered';

      if (newStatus === 'delivered' && target.notificationId) {
        await reminderScheduler.cancelReminder(target.notificationId);
      } else if (newStatus === 'pending') {
        const newNotifId = await reminderScheduler.scheduleReminder(target);
        await storageService.updateReminder(reminderId, {
          status: newStatus,
          notificationId: newNotifId || undefined,
        });
        return;
      }

      await storageService.updateReminder(reminderId, { status: newStatus });
    },
    onMutate: async (reminderId: string) => {
      await queryClient.cancelQueries({ queryKey: REMINDERS_QUERY_KEY });
      const previousReminders = queryClient.getQueryData<Reminder[]>(REMINDERS_QUERY_KEY);

      queryClient.setQueryData<Reminder[]>(REMINDERS_QUERY_KEY, (old = []) =>
        old.map((r) =>
          r.id === reminderId
            ? { ...r, status: r.status === 'delivered' ? 'pending' : 'delivered' }
            : r
        )
      );

      return { previousReminders };
    },
    onError: (_err, _id, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(REMINDERS_QUERY_KEY, context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_QUERY_KEY });
    },
  });

  // Add Reminder (schedules local notification and saves notificationId)
  const addReminderMutation = useMutation<
    Reminder,
    Error,
    Omit<Reminder, 'id' | 'createdAt' | 'userId'>,
    MutationContext
  >({
    mutationFn: async (newReminder) => {
      // 1. Request permissions if needed
      await reminderScheduler.requestPermissions();

      // 2. Schedule notification if scheduledAt is in the future
      const notificationId = await reminderScheduler.scheduleReminder(newReminder);

      // 3. Save to storage
      return await storageService.addReminder({
        ...newReminder,
        notificationId: notificationId || undefined,
      });
    },
    onMutate: async (newReminder) => {
      await queryClient.cancelQueries({ queryKey: REMINDERS_QUERY_KEY });
      const previousReminders = queryClient.getQueryData<Reminder[]>(REMINDERS_QUERY_KEY);

      const optimisticReminder: Reminder = {
        ...newReminder,
        id: `optimistic-${Date.now()}`,
        userId: 'current-user',
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Reminder[]>(REMINDERS_QUERY_KEY, (old = []) => [
        optimisticReminder,
        ...old,
      ]);

      return { previousReminders };
    },
    onError: (_err, _newReminder, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(REMINDERS_QUERY_KEY, context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_QUERY_KEY });
    },
  });

  const reminders = query.data ?? [];

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'Completed') return r.status === 'delivered';
    if (filter === 'Upcoming') return r.status === 'pending';
    return true;
  });

  return {
    ...query,
    reminders: filteredReminders,
    allReminders: reminders,
    toggleReminder: toggleReminderMutation.mutate,
    addReminder: addReminderMutation.mutateAsync,
    isToggling: toggleReminderMutation.isPending,
    isLoading: query.isLoading,
    isError: query.isError,
  };}
