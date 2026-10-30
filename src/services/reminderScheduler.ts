import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { Reminder } from '../types';
import { userSettingsService } from './userSettings';

export const REMINDER_CHANNEL_ID = 'ranti-reminders';

// Configure foreground notification behavior: alert banner + sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let isInitialized = false;

export const reminderScheduler = {
  /**
   * Initialize notification channels and listeners.
   */
  async init(): Promise<void> {
    if (isInitialized) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Ranti Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#166e3d',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Foreground listener for spoken delivery
    Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const settings = await userSettingsService.getSettings();
        const data = notification.request.content.data;
        const preference = data?.deliveryPreference ?? settings.deliveryPreference;
        const title = notification.request.content.title;

        if (preference === 'audio' && title) {
          const isSpeaking = await Speech.isSpeakingAsync().catch(() => false);
          if (isSpeaking) {
            Speech.stop();
          }
          Speech.speak(`Reminder: ${title}`, { language: 'en', rate: 0.95 });
        }
      } catch (err) {
        console.warn('[reminderScheduler] Foreground listener speech error:', err);
      }
    });

    isInitialized = true;
  },

  /**
   * Request notification permissions. Should be called contextually (e.g. when creating a reminder).
   */
  async requestPermissions(): Promise<boolean> {
    await this.init();
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('[reminderScheduler] Error requesting notification permissions:', e);
      return false;
    }
  },

  /**
   * Schedule a notification for a reminder date. Returns the scheduled notificationId.
   */
  async scheduleReminder(reminder: {
    id?: string;
    title: string;
    scheduledAt: string;
    deliveryPreference?: 'audio' | 'notification';
  }): Promise<string | null> {
    await this.init();

    const targetDate = new Date(reminder.scheduledAt);
    const now = new Date();

    if (targetDate.getTime() <= now.getTime()) {
      return null;
    }

    try {
      const settings = await userSettingsService.getSettings();
      const preference = reminder.deliveryPreference ?? settings.deliveryPreference ?? 'notification';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: `Scheduled for ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          data: {
            reminderId: reminder.id,
            deliveryPreference: preference,
          },
          channelId: REMINDER_CHANNEL_ID,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: REMINDER_CHANNEL_ID,
        },
      });

      return notificationId;
    } catch (e) {
      console.error('[reminderScheduler] Failed to schedule notification:', e);
      return null;
    }
  },

  /**
   * Cancel an existing notification by ID.
   */
  async cancelReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('[reminderScheduler] Failed to cancel notification:', notificationId, e);
    }
  },

  /**
   * Reconcile all pending reminders on app startup:
   * Reschedules any future reminders that lack a notificationId or aren't currently scheduled.
   */
  async reconcileReminders(
    reminders: Reminder[],
    updateReminderFn: (id: string, patch: Partial<Reminder>) => Promise<void>
  ): Promise<void> {
    await this.init();

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const activeNotificationIds = new Set(scheduled.map((s) => s.identifier));
      const nowMs = Date.now();

      for (const r of reminders) {
        if (r.status !== 'pending') continue;

        const scheduledTime = new Date(r.scheduledAt).getTime();
        if (scheduledTime <= nowMs) continue; // Past reminder

        const isCurrentlyScheduled = r.notificationId && activeNotificationIds.has(r.notificationId);

        if (!isCurrentlyScheduled) {
          const newId = await this.scheduleReminder(r);
          if (newId) {
            await updateReminderFn(r.id, { notificationId: newId });
          }
        }
      }
    } catch (err) {
      console.warn('[reminderScheduler] Reconcile error:', err);
    }
  },
};
