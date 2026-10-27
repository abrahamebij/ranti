import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { colors } from "../../../lib/colors";

const MEMORIES: Record<
  string,
  {
    title: string;
    category: string;
    saved: string;
    content: string;
    note: string;
    people: { name: string; relation: string }[];
    reminder: { title: string; when: string } | null;
  }
> = {
  "1": {
    title: "Lunch with Maya",
    category: "Plans",
    saved: "Saved Oct 26 · 6:15 PM",
    content: "Lunch with Maya on Oct 28 at 12:30 PM, at Olive Café.",
    note: "Bring the book you borrowed.",
    people: [{ name: "Maya", relation: "Friend" }],
    reminder: { title: "Lunch with Maya", when: "Wed, Oct 28 · 12:30 PM" },
  },
  "2": {
    title: "Maya's coffee order",
    category: "People",
    saved: "Saved Oct 26 · 3:00 PM",
    content: "Maya's coffee order is an oat flat white, no sugar.",
    note: "",
    people: [{ name: "Maya", relation: "Friend" }],
    reminder: null,
  },
};

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memory = MEMORIES[id] ?? MEMORIES["1"];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      {/* Back header */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        className="flex-row items-center gap-1 px-5 pt-2 pb-1"
      >
        <Ionicons name="arrow-back" size={18} color={colors.muted} />
        <Text className="text-sm text-muted">Memories</Text>
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Title row */}
        <View className="flex-row items-start justify-between px-5 pt-2 pb-3">
          <Text className="text-3xl font-bold text-foreground flex-1 mr-3">
            {memory.title}
          </Text>
          <TouchableOpacity activeOpacity={0.7} className="mt-1">
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>

        {/* Tag + date */}
        <View className="flex-row items-center gap-3 px-5 mb-5">
          <View className="bg-tag-bg rounded-full px-3 py-1">
            <Text className="text-xs font-medium text-tag-text">
              {memory.category}
            </Text>
          </View>
          <Text className="text-xs text-muted">{memory.saved}</Text>
        </View>

        {/* Content card */}
        <View className="px-5 mb-6">
          <Card>
            <Text className="text-base text-foreground leading-relaxed mb-2">
              {memory.content}
            </Text>
            {memory.note ? (
              <Text className="text-sm text-foreground-secondary mb-4">
                {memory.note}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Ionicons name="mic-outline" size={14} color={colors.muted} />
              <Text className="text-xs text-muted">From your conversation</Text>
            </View>
          </Card>
        </View>

        {/* People mentioned */}
        {memory.people.length > 0 && (
          <View className="px-5 mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              People mentioned
            </Text>
            {memory.people.map((p) => (
              <View key={p.name} className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-tag-bg items-center justify-center">
                  <Text className="text-sm font-semibold text-tag-text">
                    {p.name[0]}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-medium text-foreground">
                    {p.name}
                  </Text>
                  <Text className="text-xs text-muted">{p.relation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Linked reminder */}
        {memory.reminder && (
          <View className="px-5 mb-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              Linked reminder
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center gap-3"
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.foregroundSecondary}
              />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {memory.reminder.title}
                </Text>
                <Text className="text-xs text-muted">
                  {memory.reminder.when}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Ask button */}
      <View className="px-5 pb-6 pt-2 bg-background border-t border-border">
        <Button
          label="Ask Ranti about this"
          icon="chatbubble-outline"
          iconPosition="left"
          onPress={() => router.push("/(tabs)/assistant")}
        />
      </View>
    </SafeAreaView>
  );
}
