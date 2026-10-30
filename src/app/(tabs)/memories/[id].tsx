import { Ionicons } from "@react-native-vector-icons/ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { useMemories, useMemory } from "../../../hooks/useMemories";
import { colors } from "../../../lib/colors";

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memory = useMemory(id as string);
  const { updateMemory, deleteMemory, isDeleting } = useMemories();

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openMenu = () => {
    setMenuVisible(true);
  };

  const openEdit = () => {
    setMenuVisible(false);
    if (memory) {
      setEditTitle(memory.title);
      setEditContent(memory.content);
    }
    setEditVisible(true);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete memory",
      "This cannot be undone. Remove this memory from your database?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemory(id as string);
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete this memory. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      await updateMemory({ id: id as string, patch: { title: editTitle.trim(), content: editContent.trim() } });
      setEditVisible(false);
    } catch {
      Alert.alert("Error", "Could not update this memory. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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

      {!memory ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-foreground mb-2">
            Memory not found
          </Text>
          <Text className="text-sm text-muted text-center mb-6">
            This memory is not present in your database.
          </Text>
          <Button
            label="Back to Memories"
            variant="outline"
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Title row */}
            <View className="flex-row items-start justify-between px-5 pt-2 pb-3">
              <Text className="text-3xl font-bold text-foreground flex-1 mr-3">
                {memory.title}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                className="mt-1 p-1"
                onPress={openMenu}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={colors.foreground}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Tag + date */}
            <View className="flex-row items-center gap-3 px-5 mb-5">
              <View className="bg-tag-bg rounded-full px-3 py-1">
                <Text className="text-xs font-medium text-tag-text">
                  {memory.category}
                </Text>
              </View>
              <Text className="text-xs text-muted">
                {memory.sourceTimestamp || new Date(memory.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Content card */}
            <View className="px-5 mb-6">
              <Card>
                <Text className="text-base text-foreground leading-relaxed mb-4">
                  {memory.content}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="mic-outline" size={14} color={colors.muted} />
                  <Text className="text-xs text-muted">From your conversation</Text>
                </View>
              </Card>
            </View>

            {/* People mentioned */}
            {memory.people && memory.people.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-foreground mb-3">
                  People mentioned
                </Text>
                {memory.people.map((p) => (
                  <View key={p.name} className="flex-row items-center gap-3 mb-2">
                    <View className="w-10 h-10 rounded-full bg-tag-bg items-center justify-center">
                      <Text className="text-sm font-semibold text-tag-text">
                        {p.name[0]}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-foreground">
                        {p.name}
                      </Text>
                      <Text className="text-xs text-muted">
                        {p.relation || "Contact"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Ask button */}
          <View className="px-5 pb-6 pt-2 bg-background border-t border-border">
            <Button
              label="Ask Ranti about this"
              icon="chatbubble-outline"
              iconPosition="left"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/assistant",
                  params: { memoryId: memory.id, memoryTitle: memory.title },
                })
              }
            />
          </View>

          {/* Action menu modal */}
          <Modal visible={menuVisible} transparent animationType="fade">
            <TouchableOpacity
              className="flex-1 bg-black/40 justify-end"
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            >
              <View className="bg-surface rounded-t-3xl p-6 gap-2">
                <TouchableOpacity
                  onPress={openEdit}
                  className="flex-row items-center gap-3 py-3"
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.foreground} />
                  <Text className="text-base text-foreground">Edit title &amp; content</Text>
                </TouchableOpacity>
                <View className="h-px bg-border" />
                <TouchableOpacity
                  onPress={handleDelete}
                  className="flex-row items-center gap-3 py-3"
                >
                  <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                  <Text className="text-base" style={{ color: "#b91c1c" }}>Delete memory</Text>
                </TouchableOpacity>
                <View className="h-px bg-border" />
                <TouchableOpacity
                  onPress={() => setMenuVisible(false)}
                  className="items-center py-3"
                >
                  <Text className="text-sm text-muted">Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Edit modal */}
          <Modal visible={editVisible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-surface rounded-t-3xl px-6 pt-6 pb-10 gap-4">
                <Text className="text-lg font-bold text-foreground">Edit memory</Text>
                <View>
                  <Text className="text-xs font-medium text-muted mb-1">Title</Text>
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Memory title"
                    placeholderTextColor={colors.muted}
                    className="bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground"
                    autoFocus
                  />
                </View>
                <View>
                  <Text className="text-xs font-medium text-muted mb-1">Content</Text>
                  <TextInput
                    value={editContent}
                    onChangeText={setEditContent}
                    placeholder="Memory content"
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground"
                    style={{ minHeight: 100 }}
                  />
                </View>
                <View className="flex-row justify-end gap-3">
                  <TouchableOpacity
                    onPress={() => setEditVisible(false)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-full"
                  >
                    <Text className="text-sm text-muted">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isSaving || !editTitle.trim()}
                    className="bg-primary px-5 py-2 rounded-full"
                    style={{ opacity: isSaving || !editTitle.trim() ? 0.5 : 1 }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text className="text-sm font-semibold text-primary-foreground">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
