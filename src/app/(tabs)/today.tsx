import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTasks } from "../../hooks/useTasks";
import { useMemories } from "../../hooks/useMemories";
import { useListeningSession } from "../../hooks/useListeningSession";
import { userSettingsService } from "../../services/userSettings";
import { colors } from "../../lib/colors";

export default function TodayScreen() {
  const [displayName, setDisplayName] = useState("Friend");
  const { allTasks, toggleTask } = useTasks();
  const { allMemories } = useMemories();
  const { isListening } = useListeningSession();

  useEffect(() => {
    userSettingsService.getSettings().then((s) => {
      if (s.displayName) setDisplayName(s.displayName);
    });
  }, []);

  const upNextTask = allTasks.find((t) => !t.completed);
  const listTasks = allTasks.filter((t) => t.id !== upNextTask?.id).slice(0, 3);
  const recentMemories = allMemories.slice(0, 2);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Morning" : hours < 17 ? "Afternoon" : "Evening";
  const dateFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-3xl font-bold text-foreground">
            {greeting}, {displayName}
          </Text>
          <Text className="text-sm text-foreground-secondary mt-1">
            {dateFormatted}
          </Text>
        </View>

        {/* Up Next card */}
        {upNextTask ? (
          <View className="mx-5 mb-6 bg-surface-muted rounded-2xl p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-muted tracking-widest mb-1">
                  UP NEXT {upNextTask.time ? `· ${upNextTask.time}` : ""}
                </Text>
                <Text className="text-xl font-bold text-foreground mb-1">
                  {upNextTask.title}
                </Text>
                {upNextTask.dueAt ? (
                  <Text className="text-sm text-foreground-secondary">
                    {upNextTask.dueAt}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.foregroundSecondary}
              />
            </View>
          </View>
        ) : (
          <View className="mx-5 mb-6 bg-surface-muted rounded-2xl p-4">
            <Text className="text-sm text-foreground-secondary">
              No upcoming tasks right now.
            </Text>
          </View>
        )}

        {/* On your list */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">
              On your list
            </Text>
            {allTasks.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(tabs)/reminders")}
              >
                <Text className="text-sm text-muted">View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {listTasks.length === 0 ? (
            <Text className="text-sm text-muted py-2">
              No additional tasks in your database.
            </Text>
          ) : (
            listTasks.map((task, i) => (
              <View key={task.id}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleTask(task.id)}
                  className="flex-row items-center py-3 gap-3"
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      task.completed ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {task.completed && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.primaryForeground}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${
                        task.completed
                          ? "text-muted line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </Text>
                    {task.dueAt ? (
                      <Text className="text-xs text-muted mt-0.5">
                        {task.dueAt}
                      </Text>
                    ) : null}
                  </View>
                  {task.time ? (
                    <Text className="text-xs text-muted">{task.time}</Text>
                  ) : null}
                </TouchableOpacity>
                {i < listTasks.length - 1 && <View className="h-px bg-border" />}
              </View>
            ))
          )}
        </View>

        {/* Fresh in your memory */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">
              Fresh in your memory
            </Text>
            {allMemories.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/(tabs)/memories" as never)}
              >
                <Text className="text-sm text-muted">See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentMemories.length === 0 ? (
            <Text className="text-sm text-muted py-2">
              No memories captured in your database yet.
            </Text>
          ) : (
            recentMemories.map((mem) => (
              <TouchableOpacity
                key={mem.id}
                activeOpacity={0.7}
                className="bg-surface rounded-2xl p-4 mb-3"
                onPress={() => router.push(`/(tabs)/memories/${mem.id}` as never)}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-muted">{mem.category}</Text>
                  <Text className="text-xs text-muted">
                    {mem.sourceTimestamp || new Date(mem.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">
                    {mem.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </View>
                <Text
                  className="text-sm text-foreground-secondary mt-1"
                  numberOfLines={2}
                >
                  {mem.content}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Background listening banner */}
        <View className="mx-5 bg-surface-muted rounded-xl px-4 py-3 flex-row items-center gap-2">
          <View
            className={`w-2 h-2 rounded-full ${
              isListening ? "bg-active-dot" : "bg-muted"
            }`}
          />
          <Text className="text-sm font-semibold text-primary">
            {isListening
              ? "Background listening on"
              : "Background listening paused"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
