import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../services/queryClient";
import { userSettingsService } from "../services/userSettings";
import { reminderScheduler } from "../services/reminderScheduler";
import { storageService } from "../services/storage";
import "../global.css";
import { colors } from "../lib/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await reminderScheduler.init();
        const settings = await userSettingsService.getSettings();
        if (settings.isOnboarded) {
          router.replace("/(tabs)/assistant");
        }
        // Reconcile pending reminders with scheduled notifications
        storageService.getReminders().then((reminders) => {
          reminderScheduler.reconcileReminders(reminders, (id, patch) =>
            storageService.updateReminder(id, patch)
          );
        }).catch((err) => console.warn("Failed to reconcile reminders:", err));
      } catch (e) {
        console.warn("Failed to check onboarded status:", e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if ((loaded || error) && isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error, isReady]);

  if ((!loaded && !error) || !isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider
        style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      >
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade_from_bottom",
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
