import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PrivacyNoticeModal } from "../components/PrivacyNoticeModal";
import { colors } from "../lib/colors";

export default function WelcomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Tagline */}
        <Text className="text-sm text-foreground-secondary mt-2 mb-4">
          A little less to remember.
        </Text>

        {/* Hero Section */}
        <View className="mb-6">
          <View className="w-12 h-12 bg-primary rounded-2xl items-center justify-center mb-3">
            <Text className="text-primary-foreground text-xl font-bold">r.</Text>
          </View>
          <Text className="text-4xl font-bold text-foreground mb-1">Ranti</Text>
          <Text className="text-base text-foreground-secondary">
            Your AI-powered memory assistant.
          </Text>
        </View>

        {/* Transparent In-App Privacy Note Card on First Use */}
        <Card className="mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={colors.primary}
            />
            <Text className="text-xs font-semibold text-primary tracking-wider uppercase">
              Privacy &amp; Data Transparency
            </Text>
          </View>

          <Text className="text-sm font-semibold text-foreground mb-3">
            How your audio and memories are handled:
          </Text>

          <View className="gap-3">
            <View className="flex-row items-start gap-2.5">
              <Ionicons name="mic-outline" size={16} color={colors.foregroundSecondary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground">What is recorded</Text>
                <Text className="text-xs text-foreground-secondary leading-relaxed">
                  Audio is only captured when you dictate, run sound checks, or explicitly switch on listening.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <Ionicons name="cloud-upload-outline" size={16} color={colors.foregroundSecondary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground">Meta API processing</Text>
                <Text className="text-xs text-foreground-secondary leading-relaxed">
                  Audio is sent over HTTPS to Meta&apos;s Cloud API for transcription and entity extraction. Audio is not processed on-device.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <Ionicons name="server-outline" size={16} color={colors.foregroundSecondary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground">What is stored in Firestore</Text>
                <Text className="text-xs text-foreground-secondary leading-relaxed">
                  Extracted memories, tasks, reminders, and your profile name are saved to your Cloud Firestore database.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-2.5">
              <Ionicons name="trash-outline" size={16} color={colors.foregroundSecondary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-foreground">Stop &amp; delete anytime</Text>
                <Text className="text-xs text-foreground-secondary leading-relaxed">
                  Pause listening whenever you want. You can delete individual memories, or use &ldquo;Delete all my data&rdquo; in Settings to permanently erase all Firestore data and local files.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
            className="mt-4 pt-3 border-t border-border flex-row items-center justify-between"
          >
            <Text className="text-xs font-medium text-primary">Read full privacy details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* CTA */}
        <View className="mt-auto pt-2 gap-3">
          <Button
            label="Get Started"
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => router.push("/voice-setup")}
          />
        </View>
      </ScrollView>

      {/* Full Privacy Details Modal */}
      <PrivacyNoticeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
