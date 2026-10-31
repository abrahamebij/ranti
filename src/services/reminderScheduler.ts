import * as Speech from 'expo-speech';
import { Reminder } from '../types';
import { userSettingsService } from './userSettings';

export const REMINDER_CHANNEL_ID = 'ranti-reminders';

// Active in-memory timers for foreground spoken delivery
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const reminderScheduler = {
  /**
   * Initialize reminder system. (Native notifications disabled for Expo Go compatibility)
   */
  async init(): Promise<void> {
    // In Expo Go, native notifications require a dev build.
    // Foreground audio delivery via expo-speech remains active.
  },

  /**
   * Request notification permissions stub.
   */
  async requestPermissions(): Promise<boolean> {
    return true;
  },

  /**
   * Schedule a reminder. Sets an in-memory timer for foreground spoken delivery
   * if scheduled in the future and audio preference is active.
   */
  async scheduleReminder(reminder: {
    id?: string;
    title: string;
    scheduledAt: string;
    deliveryPreference?: 'audio' | 'notification';
  }): Promise<string | null> {
    const targetDate = new Date(reminder.scheduledAt);
    const now = new Date();
    const delay = targetDate.getTime() - now.getTime();

    if (delay <= 0) {
      return null;
    }

    const timerId = reminder.id || `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Cancel any existing timer for this ID
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId)!);
      activeTimers.delete(timerId);
    }

    // Schedule in-memory speech trigger if delay is within 32-bit int limit (~24 days)
    if (delay < 2147483647) {
      const timer = setTimeout(async () => {
        try {
          const settings = await userSettingsService.getSettings();
          const preference = reminder.deliveryPreference ?? settings.deliveryPreference;

          if (preference === 'audio') {
            const isSpeaking = await Speech.isSpeakingAsync().catch(() => false);
            if (isSpeaking) {
              await Speech.stop();
            }
            Speech.speak(`Reminder: ${reminder.title}`, { language: 'en', rate: 0.95 });
          }
        } catch (err) {
          console.warn('[reminderScheduler] In-memory speech trigger error:', err);
        } finally {
          activeTimers.delete(timerId);
        }
      }, delay);

      activeTimers.set(timerId, timer);
    }

    return timerId;
  },

  /**
   * Cancel an existing reminder timer.
   */
  async cancelReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    const timer = activeTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(notificationId);
    }
  },

  /**
   * Reconcile all pending reminders on app startup:
   * Re-arms in-memory spoken reminders for future events.
   */
  async reconcileReminders(
    reminders: Reminder[],
    _updateReminderFn: (id: string, patch: Partial<Reminder>) => Promise<void>
  ): Promise<void> {
    const nowMs = Date.now();

    for (const r of reminders) {
      if (r.status !== 'pending') continue;

      const scheduledTime = new Date(r.scheduledAt).getTime();
      if (scheduledTime <= nowMs) continue;

      await this.scheduleReminder(r);
    }
  },

  /**
   * Manually speak a reminder immediately using expo-speech.
   */
  async speakReminderNow(title: string): Promise<void> {
    try {
      const isSpeaking = await Speech.isSpeakingAsync().catch(() => false);
      if (isSpeaking) {
        await Speech.stop();
      }
      Speech.speak(`Reminder: ${title}`, { language: 'en', rate: 0.95 });
    } catch (e) {
      console.warn('[reminderScheduler] Failed to speak reminder:', e);
    }
  },
};
