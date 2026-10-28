import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
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

type PickerStep = "date" | "time" | "idle";

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function startOfTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function startOfNextWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  return d;
}

const DATE_PRESETS: { label: string; getValue: () => Date }[] = [
  { label: "Today", getValue: startOfToday },
  { label: "Tomorrow", getValue: startOfTomorrow },
  { label: "Next week", getValue: startOfNextWeek },
];

export default function RemindersScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerStep, setPickerStep] = useState<PickerStep>("idle");
  const { tasks, toggleTask, addTask } = useTasks(activeFilter);

  const resetForm = () => {
    setNewTitle("");
    setSelectedDate(null);
    setPickerStep("idle");
    setIsAdding(false);
  };

  const handleSaveReminder = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const time = selectedDate ? formatDate(selectedDate) : "Scheduled";
    const dueAt = selectedDate ? selectedDate.toISOString() : undefined;
    resetForm();
    await addTask({ title, time, dueAt, completed: false });
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setPickerStep("idle");
      return;
    }
    if (!date) return;

    if (pickerStep === "date") {
      // Merge just the date portion into selectedDate, preserve existing time or default 09:00
      const base = selectedDate ?? startOfToday();
      const merged = new Date(date);
      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
      setSelectedDate(merged);
      setPickerStep("time");
    } else if (pickerStep === "time") {
      // Merge time into the already-set date
      const base = selectedDate ?? startOfToday();
      const merged = new Date(base);
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setSelectedDate(merged);
      setPickerStep("idle");
    }
  };

  const applyPreset = (getValue: () => Date) => {
    setSelectedDate(getValue());
  };

  const isPresetActive = (getValue: () => Date) => {
    if (!selectedDate) return false;
    const preset = getValue();
    return (
      selectedDate.getFullYear() === preset.getFullYear() &&
      selectedDate.getMonth() === preset.getMonth() &&
      selectedDate.getDate() === preset.getDate()
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      {/* Native date/time picker — rendered outside scroll so it floats */}
      {pickerStep !== "idle" && (
        <DateTimePicker
          value={selectedDate ?? startOfToday()}
          mode={pickerStep}
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* Header */}
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground">
          Reminders &amp; tasks
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
                placeholder="What do you need to remember?"
                placeholderTextColor={colors.muted}
                className="bg-input rounded-xl px-3 py-2 text-sm text-foreground mb-2"
                autoFocus
              />

              {/* Date/time trigger button */}
              <TouchableOpacity
                onPress={() => setPickerStep("date")}
                className="bg-input rounded-xl px-3 py-2 mb-2 flex-row items-center"
              >
                <Text
                  className="text-sm flex-1"
                  style={{ color: selectedDate ? colors.foreground : colors.muted }}
                >
                  {selectedDate ? formatDate(selectedDate) : "Set date & time"}
                </Text>
                {selectedDate && (
                  <TouchableOpacity
                    onPress={() => setSelectedDate(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Quick date presets */}
              <View className="flex-row gap-2 mb-3">
                {DATE_PRESETS.map(({ label, getValue }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => applyPreset(getValue)}
                    className={`px-3 py-1 rounded-full border ${
                      isPresetActive(getValue)
                        ? "bg-tag-bg border-tag-bg"
                        : "border-border"
                    }`}
                  >
                    <Text className="text-xs text-foreground-secondary">
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row gap-2 justify-end">
                <TouchableOpacity
                  onPress={resetForm}
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

          {/* Tasks list with optimistic check/uncheck */}
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
