import { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { FilterPill } from "../../components/FilterPill";
import { TaskItem } from "../../components/TaskItem";
import { useTasks } from "../../hooks/useTasks";
import { colors } from "../../lib/colors";

type Filter = "All" | "Upcoming" | "Completed";
const FILTERS: Filter[] = ["All", "Upcoming", "Completed"];

export default function RemindersScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { tasks, toggleTask, addTask } = useTasks(activeFilter);

  const handleSaveReminder = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setIsAdding(false);
    await addTask({
      title,
      time: "Scheduled",
      completed: false,
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      {/* Header */}
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground">
          Reminders & tasks
        </Text>
      </View>

      {/* Filters */}
      <View className="flex-row gap-2 px-5 mb-4">
        {FILTERS.map((f) => (
          <FilterPill
            key={f}
            label={f}
            active={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-foreground">
              {activeFilter === "All" ? "All Tasks" : activeFilter}
            </Text>
            <Text className="text-xs text-muted">{tasks.length} items</Text>
          </View>

          {/* Creation card */}
          {isAdding && (
            <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
              <Text className="text-sm font-semibold text-foreground mb-2">
                New Reminder
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={handleSaveReminder}
                returnKeyType="done"
                placeholder="What do you need to remember?"
                placeholderTextColor={colors.muted}
                className="bg-input rounded-xl px-3 py-2 text-sm text-foreground mb-3"
                autoFocus
              />
              <View className="flex-row gap-2 justify-end">
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setNewTitle("");
                  }}
                  className="px-4 py-2 rounded-full"
                >
                  <Text className="text-sm text-muted">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveReminder}
                  disabled={!newTitle.trim()}
                  className={`bg-primary px-4 py-2 rounded-full ${
                    !newTitle.trim() ? "opacity-50" : ""
                  }`}
                >
                  <Text className="text-sm text-primary-foreground font-medium">
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actual tasks list with optimistic check/uncheck */}
          {tasks.map((task, i) => (
            <TaskItem
              key={task.id}
              title={task.title}
              subtitle={task.dueAt}
              time={task.time || "Scheduled"}
              completed={task.completed}
              onToggle={() => toggleTask(task.id)}
              showDivider={i < tasks.length - 1}
            />
          ))}

          {tasks.length === 0 && !isAdding && (
            <Text className="text-sm text-muted py-8 text-center">
              No {activeFilter.toLowerCase()} tasks found in your database.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Add reminder */}
      <View className="px-5 pb-6 pt-2 bg-background border-t border-border">
        <Button
          label="Add reminder"
          icon="add"
          iconPosition="left"
          onPress={() => setIsAdding(true)}
        />
      </View>
    </SafeAreaView>
  );
}
