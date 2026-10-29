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
}

const SETTINGS_FILE_URI = `${FileSystem.documentDirectory}ranti_user_settings.json`;

const DEFAULT_SETTINGS: UserSettings = {
  isOnboarded: false,
  displayName: 'Friend',
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
};
