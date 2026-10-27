import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/colors";

const SUGGESTIONS = ["What do I need to do today?", "What does Maya like?"];

export default function AssistantScreen() {
  const [input, setInput] = useState("");

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}
      edges={["top"]}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View>
          <Text className="text-2xl font-bold text-foreground">Ranti</Text>
          <Text className="text-sm text-foreground-secondary">
            A little help remembering.
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Listening banner */}
      {/* <View className="mx-5 mb-4 bg-surface rounded-xl px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-active-dot" />
          <View>
            <Text className="text-sm font-semibold text-primary">
              Background listening on
            </Text>
            <Text className="text-xs text-muted">
              Saving moments as you go.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          className="border border-border rounded-full px-3 py-1"
        >
          <Text className="text-sm font-medium text-foreground">Stop</Text>
        </TouchableOpacity>
      </View> */}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {/* Timestamp */}
        <Text className="text-xs text-muted text-center mb-3">
          Today, 9:40 AM
        </Text>

        {/* User message bubble */}
        <View className="items-end mb-4">
          <View className="bg-surface-muted rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
            <Text className="text-sm text-foreground">
              When is lunch with Maya?
            </Text>
          </View>
        </View>

        {/* Ranti response */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-foreground mb-1">
            Ranti
          </Text>
          <Text className="text-2xl font-bold text-foreground leading-tight mb-1">
            Tomorrow at 12:30 PM,{"\n"}at Olive Café.
          </Text>
          <Text className="text-sm text-foreground-secondary mb-3">
            You're bringing the book you borrowed.
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="layers-outline" size={14} color={colors.primary} />
            <Text className="text-sm text-primary font-medium">
              From Lunch with Maya
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Suggestions */}
        <Text className="text-xs text-muted mb-3">You can also ask</Text>
        {SUGGESTIONS.map((s) => (
          <View key={s}>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between py-3"
            >
              <Text className="text-sm text-foreground">{s}</Text>
              <Ionicons
                name="return-up-back-outline"
                size={16}
                color={colors.muted}
              />
            </TouchableOpacity>
            <View className="h-px bg-border" />
          </View>
        ))}
        <View className="h-4" />
      </ScrollView>

      {/* Input bar */}
      <View className="px-5 pb-4 pt-2">
        <View className="flex-row items-center bg-surface rounded-full px-4 gap-3 border border-border">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask or tell Ranti..."
            placeholderTextColor={colors.muted}
            className="flex-1 py-3 text-sm text-foreground"
          />
          <TouchableOpacity
            activeOpacity={0.8}
            className="w-10 h-10 bg-primary rounded-full items-center justify-center"
          >
            <Ionicons name="mic" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
        <Text className="text-center text-xs text-muted mt-2">
          Tap the mic to speak to Ranti directly.
        </Text>
      </View>
    </SafeAreaView>
  );
}
