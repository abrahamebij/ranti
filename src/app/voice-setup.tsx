import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAudioRecorder,
  useAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { userSettingsService } from "../services/userSettings";
import { colors } from "../lib/colors";

export default function VoiceSetupScreen() {
  const [name, setName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micLevel, setMicLevel] = useState(0.2); // 0 to 1

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(recordedUri);

  useEffect(() => {
    userSettingsService.getSettings().then((s) => {
      if (s.displayName && s.displayName !== "Friend") setName(s.displayName);
      if (s.voiceSampleUri) setRecordedUri(s.voiceSampleUri);
    });
  }, []);

  const startRecord = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      setDurationSec(0);
      setIsRecording(true);
      setRecordedUri(null);

      timerRef.current = setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);

      levelIntervalRef.current = setInterval(() => {
        setMicLevel(0.2 + Math.random() * 0.8);
      }, 120);
    } catch (e) {
      console.warn("Error starting record:", e);
      setIsRecording(false);
    }
  };

  const stopRecord = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
      setIsRecording(false);
      setMicLevel(0.2);

      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;

      const permanentUri = `${FileSystem.documentDirectory}voice_sample_${Date.now()}.m4a`;
      await FileSystem.copyAsync({ from: uri, to: permanentUri });
      setRecordedUri(permanentUri);
    } catch (e) {
      console.warn("Error stopping record:", e);
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!recordedUri) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleFinish = async (skip = false) => {
    const finalName = name.trim() || "Friend";
    await userSettingsService.saveSettings({
      isOnboarded: true,
      displayName: finalName,
      voiceSampleUri: skip ? undefined : recordedUri ?? undefined,
      voiceSampleDurationMs: skip ? undefined : durationSec * 1000,
    });
    router.replace("/(tabs)/assistant");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-sm font-medium text-foreground">Sound check &amp; Profile</Text>
        <TouchableOpacity onPress={() => handleFinish(true)}>
          <Text className="text-sm text-muted font-medium">Skip</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold text-foreground leading-tight mb-2">
          Make Ranti yours.
        </Text>
        <Text className="text-xs text-foreground-secondary mb-6">
          Set your preferred name and run a microphone sound check.
        </Text>

        {/* Name input */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-muted tracking-wider mb-2">
            WHAT SHOULD RANTI CALL YOU?
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex, Sarah, Baba"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground"
          />
        </View>

        {/* Microphone sound check card */}
        <Card className="mb-4">
          <Text className="text-xs font-semibold text-muted tracking-wider mb-3">
            MICROPHONE SOUND CHECK
          </Text>
          <Text className="text-sm font-medium text-foreground mb-4">
            &ldquo;Hi Ranti, help me remember what matters.&rdquo;
          </Text>

          {/* Metering / Waveform Bar */}
          <View className="flex-row items-center justify-center gap-1 mb-4 h-10">
            {Array.from({ length: 18 }).map((_, i) => {
              const height = isRecording
                ? Math.max(6, Math.round(micLevel * 36 * Math.sin((i / 18) * Math.PI)))
                : recordedUri
                  ? 14
                  : 4;
              return (
                <View
                  key={i}
                  style={{
                    height,
                    width: 4,
                    borderRadius: 2,
                    backgroundColor: isRecording ? colors.primary : colors.muted,
                  }}
                />
              );
            })}
          </View>

          {/* Running Timer or Duration */}
          <View className="items-center justify-center mb-2">
            {isRecording ? (
              <Text className="text-sm font-bold text-primary">
                Recording 0:0{durationSec}
              </Text>
            ) : recordedUri ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text className="text-xs text-foreground font-medium">
                  Sound sample recorded (0:0{durationSec || 4})
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-muted">Tap below to test microphone</Text>
            )}
          </View>

          {/* Playback Button */}
          {recordedUri && !isRecording && (
            <TouchableOpacity
              onPress={togglePlayback}
              className="flex-row items-center justify-center gap-2 py-2 mt-2 bg-surface-muted rounded-xl"
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={18}
                color={colors.foreground}
              />
              <Text className="text-xs font-medium text-foreground">
                {isPlaying ? "Pause playback" : "Play back sample"}
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Record / Re-record button */}
        <Button
          label={
            isRecording
              ? "Stop sound check"
              : recordedUri
                ? "Record sample again"
                : "Start sound check"
          }
          variant={isRecording ? "primary" : "outline"}
          icon={isRecording ? "stop" : "mic-outline"}
          iconPosition="left"
          onPress={isRecording ? stopRecord : startRecord}
        />
      </View>

      <View className="px-6 pb-6 gap-3">
        <Button
          label="Continue"
          icon="arrow-forward"
          iconPosition="right"
          disabled={!recordedUri && isRecording}
          onPress={() => handleFinish(false)}
        />
      </View>
    </SafeAreaView>
  );
}
