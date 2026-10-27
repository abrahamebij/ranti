import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { colors } from "../lib/colors";

export default function WelcomeScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
    >
      <View className="flex-1 px-6">
        {/* Top tagline */}
        <Text className="text-sm text-foreground-secondary mt-4">
          A little less to remember.
        </Text>

        {/* Hero section */}
        <View className="flex-1 justify-center">
          {/* Logo mark */}
          <View className="w-14 h-14 bg-primary rounded-2xl items-center justify-center mb-6">
            <Text className="text-primary-foreground text-xl font-bold">
              r.
            </Text>
          </View>

          {/* App name */}
          <Text className="text-5xl font-bold text-foreground mb-3">Ranti</Text>

          {/* Subtitle */}
          <Text className="text-lg text-foreground-secondary">
            Your AI-powered memory assistant.
          </Text>
        </View>

        {/* Bottom section */}
        <View className="pb-6 gap-4">
          {/* Privacy note */}
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.foregroundSecondary}
            />
            <Text className="text-sm text-foreground-secondary">
              Your memories. Always in your control.
            </Text>
          </View>

          {/* CTA */}
          <Button
            label="Get Started"
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => router.push("/voice-setup")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
