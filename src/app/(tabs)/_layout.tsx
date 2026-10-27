import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import { type ComponentProps } from "react";
import { colors } from "../../lib/colors";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  iconFocused: IconName;
}

const TABS: TabConfig[] = [
  {
    name: "assistant",
    title: "Assistant",
    icon: "chatbubble-outline",
    iconFocused: "chatbubble",
  },
  {
    name: "today",
    title: "Today",
    icon: "sunny-outline",
    iconFocused: "sunny",
  },
  {
    name: "memories",
    title: "Memories",
    icon: "layers-outline",
    iconFocused: "layers",
  },
  {
    name: "reminders",
    title: "Reminders",
    icon: "checkmark-done-outline",
    iconFocused: "checkmark-done",
  },
  {
    name: "settings",
    title: "Settings",
    icon: "settings-outline",
    iconFocused: "settings",
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "400",
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarStyle: {
              padding: 14,
            },
            title: tab.title,
            tabBarActiveTintColor: colors.primary,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={22}
                color={focused ? colors.primary : colors.muted}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
