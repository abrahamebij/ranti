import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterPill } from "../../../components/FilterPill";
import { MemoryListItem } from "../../../components/MemoryListItem";
import { useMemories } from "../../../hooks/useMemories";
import { MemoryCategory } from "../../../types";
import { colors } from "../../../lib/colors";

type Filter = "All" | MemoryCategory;
const FILTERS: Filter[] = ["All", "People", "Plans", "Notes"];

export default function MemoriesScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const { memories } = useMemories(activeFilter);

  const filtered = memories.filter((m) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      m.title.toLowerCase().includes(term) ||
      m.content.toLowerCase().includes(term)
    );
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      {/* Header */}
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground">Memories</Text>
        <Text className="text-sm text-foreground-secondary mt-1">
          The little things, kept for you.
        </Text>
      </View>

      {/* Search */}
      <View className="mx-5 mb-4 flex-row items-center bg-surface rounded-full px-4 gap-3 border border-border">
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your memories"
          placeholderTextColor={colors.muted}
          className="flex-1 py-3 text-sm text-foreground"
        />
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

      {/* Count */}
      <View className="flex-row items-center justify-between px-5 mb-3">
        <Text className="text-sm text-muted">{filtered.length} memories</Text>
        <Text className="text-sm text-muted">Newest first</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {filtered.length === 0 ? (
          <Text className="text-sm text-muted text-center py-10">
            No memories found in your database.
          </Text>
        ) : (
          filtered.map((m) => (
            <MemoryListItem
              key={m.id}
              category={m.category}
              title={m.title}
              preview={m.content}
              date={m.sourceTimestamp || "Recent"}
              onPress={() => router.push(`/(tabs)/memories/${m.id}` as never)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
