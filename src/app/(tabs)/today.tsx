import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTasks } from "../../hooks/useTasks";
import { useMemories } from "../../hooks/useMemories";
import { useReminders } from "../../hooks/useReminders";
import { userSettingsService } from "../../services/userSettings";
import { colors } from "../../lib/colors";

export default function TodayScreen() {
  const [displayName, setDisplayName] = useState("Friend");

  const tasksQuery = useTasks();
  const memoriesQuery = useMemories();
  const remindersQuery = useReminders();

  const { allTasks, toggleTask } = tasksQuery;
  const { allMemories } = memoriesQuery;
  const { allReminders } = remindersQuery;

  const isLoading =
    tasksQuery.isLoading || memoriesQuery.isLoading || remindersQuery.isLoading;
  const hasError =
    tasksQuery.isError || memoriesQuery.isError || remindersQuery.isError;

  useEffect(() => {
    userSettingsService.getSettings().then((s) => {
      if (s.displayName) setDisplayName(s.displayName);
    });
  }, []);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "Morning" : hours < 17 ? "Afternoon" : "Evening";
  const dateFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Derive Up Next: earliest upcoming task with a due time OR earliest pending reminder
  const upcomingTasks = allTasks
    .filter((t) => !t.completed && t.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

  const upcomingReminders = allReminders
    .filter((r) => r.status === "pending" && new Date(r.scheduledAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const upNextTask = upcomingTasks[0];
  const upNextReminder = upcomingReminders[0];

  // Pick the soonest of task vs reminder for the Up Next card
  const showReminderFirst =
    !upNextTask ||
    (upNextReminder &&
      new Date(upNextReminder.scheduledAt).getTime() <
        new Date(upNextTask.dueAt!).getTime());

  const listTasks = allTasks.filter((t) => !t.completed).slice(0, 4);
  const recentMemories = allMemories.slice(0, 2);

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

        {/* Loading state */}
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-muted mt-2">Loading your day...</Text>
          </View>
        )}

        {/* Error state */}
        {!isLoading && hasError && (
          <View className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="alert-circle" size={16} color="#b91c1c" />
              <Text className="text-xs font-semibold text-red-700">Could not load your data</Text>
            </View>
            <Text className="text-xs text-red-600">
              Check your connection and pull to refresh.
            </Text>
          </View>
        )}

        {!isLoading && (
          <>
            {/* Up Next card */}
            {showReminderFirst && upNextReminder ? (
              <View className="mx-5 mb-6 bg-surface-muted rounded-2xl p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted tracking-widest mb-1">
                      UP NEXT · REMINDER
                    </Text>
                    <Text className="text-xl font-bold text-foreground mb-1">
                      {upNextReminder.title}
                    </Text>
                    <Text className="text-sm text-foreground-secondary">
                      {new Date(upNextReminder.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    name="alarm-outline"
                    size={20}
                    color={colors.foregroundSecondary}
                  />
                </View>
              </View>
            ) : upNextTask ? (
              <View className="mx-5 mb-6 bg-surface-muted rounded-2xl p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted tracking-widest mb-1">
                      UP NEXT{upNextTask.time ? ` · ${upNextTask.time}` : ""}
                    </Text>
                    <Text className="text-xl font-bold text-foreground mb-1">
                      {upNextTask.title}
                    </Text>
                    {upNextTask.dueAt ? (
                      <Text className="text-sm text-foreground-secondary">
                        {new Date(upNextTask.dueAt).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
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
                  Nothing coming up right now.
                </Text>
              </View>
            )}

            {/* On your list */}
            <View className="px-5 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-foreground">
                  On your list
                </Text>
                {allTasks.filter((t) => !t.completed).length > 0 && (
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
                  No open tasks in your database.
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
                            task.completed ? "text-muted line-through" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </Text>
                        {task.time ? (
                          <Text className="text-xs text-muted mt-0.5">{task.time}</Text>
                        ) : null}
                      </View>
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
                  No memories captured yet. Start a conversation to save moments.
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
