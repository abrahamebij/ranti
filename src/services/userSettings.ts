/**
 * Local Settings & User Preferences storage service.
 * Persists to device document directory using expo-file-system.
 */

import * as FileSystem from 'expo-file-system/legacy';

export interface UserSettings {
  isOnboarded: boolean;
  displayName: string;
  voiceSampleUri?: string;
  voiceSampleDurationMs?: number;
  deliveryPreference?: 'audio' | 'notification';
  notificationsEnabled?: boolean;
}

const SETTINGS_FILE_URI = `${FileSystem.documentDirectory}ranti_user_settings.json`;

const DEFAULT_SETTINGS: UserSettings = {
  isOnboarded: false,
  displayName: 'Friend',
  deliveryPreference: 'notification',
  notificationsEnabled: true,
};

export const userSettingsService = {
  async getSettings(): Promise<UserSettings> {
    try {
      const info = await FileSystem.getInfoAsync(SETTINGS_FILE_URI);
      if (!info.exists) {
        return DEFAULT_SETTINGS;
      }
      const raw = await FileSystem.readAsStringAsync(SETTINGS_FILE_URI);
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('[userSettingsService] Failed to load settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const current = await this.getSettings();
      const updated: UserSettings = { ...current, ...patch };
      await FileSystem.writeAsStringAsync(SETTINGS_FILE_URI, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('[userSettingsService] Failed to save settings:', e);
      throw e;
    }
  },

  async clearAllLocalData(): Promise<void> {
    try {
      if (FileSystem.documentDirectory) {
        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        for (const file of files) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`, { idempotent: true });
        }
      }
    } catch (e) {
      console.warn('[userSettingsService] Error clearing local directory:', e);
      await FileSystem.deleteAsync(SETTINGS_FILE_URI, { idempotent: true }).catch(() => {});
    }
  },
};
