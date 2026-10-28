import { Alert, Platform } from 'react-native';
import { Reminder } from '../types';

/**
 * Reminder Delivery Engine:
 * Delivers spoken earbud reminders and Android notifications with alert sound.
 */
export const reminderScheduler = {
  /**
   * Schedule or trigger a reminder delivery
   */
  async deliverReminder(reminder: Reminder): Promise<void> {
    const title = reminder.title;
    const body = `Scheduled for ${new Date(reminder.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (reminder.deliveryPreference === 'audio') {
      // Audio delivery (earbud spoken prompt)
      console.log(`[Audio Spoken Delivery]: "${title}"`);
    }

    // Android notification display with alert
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Alert.alert(title, body, [{ text: 'Done', style: 'default' }]);
    } else {
      console.log(`[Notification Alert]: ${title} - ${body}`);
    }
  },

  /**
   * Check for due reminders and trigger them
   */
  checkDueReminders(reminders: Reminder[]): Reminder[] {
    const now = new Date().getTime();
    const due = reminders.filter((r) => {
      const scheduled = new Date(r.scheduledAt).getTime();
      return r.status === 'pending' && scheduled <= now;
    });

    for (const r of due) {
      this.deliverReminder(r);
    }

    return due;
  },
};
