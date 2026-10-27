import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { router } from 'expo-router';
import { Card } from '../../components/Card';
import { SettingsRow } from '../../components/SettingsRow';
import { Switch } from '../../components/Switch';
import { colors } from '../../lib/colors';

export default function SettingsScreen() {
  const [backgroundListening, setBackgroundListening] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-2 pb-5">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-sm text-foreground-secondary mt-1">Make Ranti feel right for you.</Text>
        </View>

        {/* Profile card */}
        <View className="px-5 mb-6">
          <Card>
            <TouchableOpacity activeOpacity={0.7} className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-full bg-tag-bg items-center justify-center">
                <Text className="text-sm font-bold text-tag-text">AL</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Alex Lee</Text>
                <Text className="text-xs text-muted">Manage profile</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Listening & voice */}
        <View className="px-5 mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Listening & voice</Text>
          <SettingsRow
            icon="ear-outline"
            title="Background listening"
            subtitle={`${backgroundListening ? 'On' : 'Off'} · Save moments as you go`}
            trailing={
              <Switch
                value={backgroundListening}
                onValueChange={setBackgroundListening}
              />
            }
          />
          <SettingsRow
            icon="volume-medium-outline"
            title="Audio delivery"
            subtitle="Play replies when asked"
            onPress={() => {}}
          />
          <SettingsRow
            icon="mic-outline"
            title="Voice setup"
            subtitle="Voice sample saved"
            onPress={() => router.push('/voice-setup')}
            showDivider={false}
          />
        </View>

        {/* Reminders */}
        <View className="px-5 mb-8">
          <Text className="text-sm font-semibold text-foreground mb-2">Reminders</Text>
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={`${notifications ? 'On' : 'Off'} · Reminders and tasks`}
            trailing={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
              />
            }
            showDivider={false}
          />
        </View>

        {/* Footer */}
        <View className="px-5 gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
            <Text className="text-xs text-muted">You choose when Ranti listens.</Text>
          </View>
          <Text className="text-xs text-muted">Ranti · Version 1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
