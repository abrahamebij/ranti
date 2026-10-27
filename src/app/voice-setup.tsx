import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../lib/colors';

const WAVEFORM_BARS = [4, 10, 18, 12, 24, 16, 30, 20, 14, 26, 18, 32, 22, 16, 10, 24, 20, 14, 8, 18, 22, 16, 20, 12, 14];

export default function VoiceSetupScreen() {
  const [recorded, setRecorded] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-sm font-medium text-foreground">Voice setup</Text>
        {/* Step indicators */}
        <View className="flex-row gap-2 items-center">
          <View className="w-5 h-0.5 bg-primary rounded-full" />
          <View className="w-5 h-0.5 bg-border rounded-full" />
        </View>
      </View>

      <View className="flex-1 px-6 pt-8">
        {/* Heading */}
        <Text className="text-4xl font-bold text-foreground leading-tight mb-3">
          Let's get to know{'\n'}your voice.
        </Text>
        <Text className="text-sm text-foreground-secondary mb-10">
          Read the line below to record a short sample.
        </Text>

        {/* Voice sample card */}
        <Card className="mb-4">
          <Text className="text-xs font-semibold text-muted tracking-widest mb-4">
            SAY SOMETHING SIMPLE
          </Text>
          <Text className="text-lg font-medium text-foreground mb-6 leading-snug">
            "Hi Ranti, help me remember{'\n'}what matters."
          </Text>

          {/* Waveform */}
          <View className="flex-row items-center justify-center gap-0.5 mb-4 h-10">
            {WAVEFORM_BARS.map((h, i) => (
              <View
                key={i}
                style={{ height: h, width: 3, borderRadius: 2, backgroundColor: colors.primary }}
              />
            ))}
          </View>

          {/* Sample saved */}
          {recorded && (
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.foregroundSecondary} />
              <Text className="text-xs text-foreground-secondary">Sample saved · 0:08</Text>
            </View>
          )}
        </Card>

        {/* Record again */}
        <Button
          label="Record again"
          variant="outline"
          icon="mic-outline"
          iconPosition="left"
          onPress={() => setRecorded(false)}
        />
      </View>

      {/* Bottom */}
      <View className="px-6 pb-6 gap-3">
        <Text className="text-center text-sm text-muted">
          Next, meet your assistant.
        </Text>
        <Button
          label="Continue"
          icon="arrow-forward"
          iconPosition="right"
          onPress={() => router.replace('/(tabs)/assistant')}
        />
      </View>
    </SafeAreaView>
  );
}
