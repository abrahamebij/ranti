import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Button } from "./Button";
import { colors } from "../lib/colors";

interface PrivacyNoticeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyNoticeModal({ visible, onClose }: PrivacyNoticeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-6 gap-4 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text className="text-lg font-bold text-foreground">Privacy &amp; Data Policy</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1" activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Policy Sections */}
          <ScrollView showsVerticalScrollIndicator={false} className="gap-4">
            <View className="gap-1 mb-3">
              <Text className="text-sm font-bold text-foreground">1. What is recorded</Text>
              <Text className="text-xs text-foreground-secondary leading-relaxed">
                Ranti accesses your microphone only when you explicitly trigger it: during the sound check, via the Assistant dictation mic button, or when background listening is toggled on. The microphone is never accessed silently.
              </Text>
            </View>

            <View className="gap-1 mb-3">
              <Text className="text-sm font-bold text-foreground">2. Cloud Transcription via Meta API</Text>
              <Text className="text-xs text-foreground-secondary leading-relaxed">
                Audio recordings are transmitted over secure HTTPS to Meta&apos;s Cloud API (Meta Llama &amp; speech models) for transcription and memory extraction. Ranti does not perform on-device speech-to-text processing.
              </Text>
            </View>

            <View className="gap-1 mb-3">
              <Text className="text-sm font-bold text-foreground">3. What is stored in Firestore</Text>
              <Text className="text-xs text-foreground-secondary leading-relaxed">
                Extracted memories, tasks, reminders, calendar events, and your display name are stored in your private Cloud Firestore database. Audio clips are saved temporarily on your device and are never permanently hosted in Firestore.
              </Text>
            </View>

            <View className="gap-1 mb-4">
              <Text className="text-sm font-bold text-foreground">4. How to stop &amp; delete data</Text>
              <Text className="text-xs text-foreground-secondary leading-relaxed">
                You retain complete control over your data. You can stop listening at any moment from Settings or the listening toggle. You can delete individual memories, or tap &ldquo;Delete all my data&rdquo; in Settings to permanently erase all Firestore records and local files.
              </Text>
            </View>
          </ScrollView>

          <Button label="I Understand" variant="primary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
