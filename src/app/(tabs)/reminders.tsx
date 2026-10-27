import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { FilterPill } from "../../components/FilterPill";
import { TaskItem } from "../../components/TaskItem";
import { colors } from "../../lib/colors";

type Filter = "All" | "Upcoming" | "Completed";
const FILTERS: Filter[] = ["All", "Upcoming", "Completed"];

interface Task {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  completed: boolean;
}

interface DayGroup {
  label: string;
  date: string;
  tasks: Task[];
}

const DAYS: DayGroup[] = [
  {
    label: "Today",
    date: "Tue, Oct 27",
    tasks: [
      { id: "1", title: "Confirm lunch", time: "8:00 AM", completed: true },
      {
        id: "2",
        title: "Call the dentist",
        subtitle: "Book your next checkup",
        time: "10:00 AM",
        completed: false,
      },
      {
        id: "3",
        title: "Pick up the parcel",
        time: "5:30 PM",
        completed: false,
      },
    ],
  },
  {
    label: "Tomorrow",
    date: "Wed, Oct 28",
    tasks: [
      {
        id: "4",
        title: "Lunch with Maya",
        subtitle: "Olive Café · Bring her book",
        time: "12:30 PM",
        completed: false,
      },
    ],
  },
  {
    label: "Friday",
    date: "Oct 30",
    tasks: [
      { id: "5", title: "Water the plants", time: "9:00 AM", completed: false },
    ],
  },
];

export default function RemindersScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(["1"]));

  const toggle = (id: string) =>
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const shouldShow = (task: Task) => {
    const done = completedIds.has(task.id);
    if (activeFilter === "Completed") return done;
    if (activeFilter === "Upcoming") return !done;
    return true;
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
        {DAYS.map((day) => {
          const visible = day.tasks.filter(shouldShow);
          if (visible.length === 0) return null;
          return (
            <View key={day.label} className="px-5 mb-4">
              {/* Day header */}
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-semibold text-foreground">
                  {day.label}
                </Text>
                <Text className="text-xs text-muted">{day.date}</Text>
              </View>

              {/* Tasks */}
              {visible.map((task, i) => (
                <TaskItem
                  key={task.id}
                  title={task.title}
                  subtitle={task.subtitle}
                  time={task.time}
                  completed={completedIds.has(task.id)}
                  onToggle={() => toggle(task.id)}
                  showDivider={i < visible.length - 1}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Add reminder */}
      <View className="px-5 pb-6 pt-2 bg-background border-t border-border">
        <Button label="Add reminder" icon="add" iconPosition="left" />
      </View>
    </SafeAreaView>
  );
}
