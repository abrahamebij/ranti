import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { SettingsRow } from "../../components/SettingsRow";
import { Switch } from "../../components/Switch";
import { useListeningSession } from "../../hooks/useListeningSession";
import { userSettingsService, UserSettings } from "../../services/userSettings";
import { colors } from "../../lib/colors";

export default function SettingsScreen() {
  const { isListening, startListening, stopListening } = useListeningSession();
  const [notifications, setNotifications] = useState(true);
  const [deliveryPreference, setDeliveryPreference] = useState<'audio' | 'notification'>('notification');
  const [settings, setSettings] = useState<UserSettings>({
    isOnboarded: true,
    displayName: "Friend",
    deliveryPreference: 'notification',
    notificationsEnabled: true,
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    userSettingsService.getSettings().then((s) => {
      setSettings(s);
      setNewName(s.displayName);
      if (s.deliveryPreference) setDeliveryPreference(s.deliveryPreference);
      if (s.notificationsEnabled !== undefined) setNotifications(s.notificationsEnabled);
    });
  }, []);

  const handleListeningToggle = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const saveName = async () => {
    const updated = await userSettingsService.saveSettings({
      displayName: newName.trim() || "Friend",
    });
    setSettings(updated);
    setIsEditingName(false);
  };

  const toggleDeliveryPreference = async () => {
    const next = deliveryPreference === 'audio' ? 'notification' : 'audio';
    setDeliveryPreference(next);
    const updated = await userSettingsService.saveSettings({ deliveryPreference: next });
    setSettings(updated);
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifications(val);
    const updated = await userSettingsService.saveSettings({ notificationsEnabled: val });
    setSettings(updated);
  };

  const initials = settings.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-2 pb-5">
          <Text className="text-3xl font-bold text-foreground">Settings</Text>
          <Text className="text-sm text-foreground-secondary mt-1">
            Make Ranti feel right for you.
          </Text>
        </View>

        {/* Profile card */}
        <View className="px-5 mb-6">
          <Card>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditingName(true)}
              className="flex-row items-center gap-3"
            >
              <View className="w-11 h-11 rounded-full bg-tag-bg items-center justify-center">
                <Text className="text-sm font-bold text-tag-text">{initials || "R"}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {settings.displayName}
                </Text>
                <Text className="text-xs text-muted">Tap to edit name</Text>
              </View>
              <Ionicons name="pencil-outline" size={18} color={colors.muted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Listening & voice */}
        <View className="px-5 mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">
            Listening &amp; voice
          </Text>
          <SettingsRow
            icon="ear-outline"
            title="Background listening"
            subtitle={`${isListening ? "On" : "Off"} · Save moments as you go`}
            trailing={
              <Switch
                value={isListening}
                onValueChange={handleListeningToggle}
              />
            }
          />
          <SettingsRow
            icon="volume-medium-outline"
            title="Spoken audio delivery"
            subtitle={
              deliveryPreference === "audio"
                ? "Reads reminders aloud when app is open (shows text notification when closed)"
                : "Text notifications only"
            }
            trailing={
              <Switch
                value={deliveryPreference === "audio"}
                onValueChange={toggleDeliveryPreference}
              />
            }
          />
          <SettingsRow
            icon="mic-outline"
            title="Sound check &amp; Profile"
            subtitle="Manage voice setup"
            onPress={() => router.push("/voice-setup")}
            showDivider={false}
          />
        </View>

        {/* Reminders */}
        <View className="px-5 mb-8">
          <Text className="text-sm font-semibold text-foreground mb-2">
            Reminders
          </Text>
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={`${notifications ? "On" : "Off"} · Reminders and tasks`}
            trailing={
              <Switch value={notifications} onValueChange={toggleNotifications} />
            }
            showDivider={false}
          />
        </View>

        {/* Footer */}
        <View className="px-5 gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={colors.muted}
            />
            <Text className="text-xs text-muted">
              You choose when Ranti listens.
            </Text>
          </View>
          <Text className="text-xs text-muted">Ranti · Version 1.0</Text>

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => router.push("/api-check")}
              style={{ marginTop: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: "underline" }}>
                Dev: API connection check
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditingName} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <Text className="text-lg font-bold text-foreground mb-2">Edit Display Name</Text>
            <Text className="text-xs text-muted mb-4">What should Ranti call you?</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Alex"
              placeholderTextColor={colors.muted}
              className="bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground mb-4"
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setIsEditingName(false)}
                className="px-4 py-2 rounded-full"
              >
                <Text className="text-sm text-muted">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveName}
                className="bg-primary px-5 py-2 rounded-full"
              >
                <Text className="text-sm font-semibold text-primary-foreground">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
