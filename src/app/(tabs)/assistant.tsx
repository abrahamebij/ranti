import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useChat } from "../../hooks/useChat";
import { useListeningSession } from "../../hooks/useListeningSession";
import { colors } from "../../lib/colors";

const SUGGESTIONS = ["What do I need to do today?", "What does Maya like?"];

export default function AssistantScreen() {
  const [input, setInput] = useState("");
  const { messages, askQuestion, isThinking } = useChat();
  const { isListening, isProcessing, lastError, toggleListening } = useListeningSession();

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isThinking) return;
    setInput("");
    await askQuestion(text);
  };

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
      <View className="mx-5 mb-4 bg-surface rounded-xl px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2 h-2 rounded-full ${
              isListening ? "bg-active-dot" : "bg-muted"
            }`}
          />
          <View>
            <Text className="text-sm font-semibold text-primary">
              {isListening
                ? isProcessing
                  ? "Processing..."
                  : "Background listening on"
                : "Background listening paused"}
            </Text>
            <Text className="text-xs text-muted">
              {lastError
                ? lastError
                : isListening
                  ? "Saving moments as you go."
                  : "Tap to resume capture."}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleListening}
          className="border border-border rounded-full px-3 py-1"
        >
          <Text className="text-sm font-medium text-foreground">
            {isListening ? "Stop" : "Resume"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      >
        {messages.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-base font-semibold text-foreground mb-1">
              Ask Ranti anything
            </Text>
            <Text className="text-sm text-muted text-center px-4">
              Answers are grounded directly in your stored database memories.
            </Text>
          </View>
        ) : (
          messages.map((msg) =>
            msg.sender === "user" ? (
              <View key={msg.id} className="items-end mb-4">
                <View className="bg-surface-muted rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                  <Text className="text-sm text-foreground">{msg.text}</Text>
                </View>
              </View>
            ) : (
              <View key={msg.id} className="mb-6">
                <Text className="text-xs font-semibold text-foreground mb-1">
                  Ranti
                </Text>
                <Text className="text-2xl font-bold text-foreground leading-tight mb-1">
                  {msg.text}
                </Text>
                {msg.sourceMemoryTitle && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      if (msg.sourceMemoryId) {
                        router.push(`/(tabs)/memories/${msg.sourceMemoryId}` as never);
                      }
                    }}
                    className="flex-row items-center gap-1 mt-2"
                  >
                    <Ionicons name="layers-outline" size={14} color={colors.primary} />
                    <Text className="text-sm text-primary font-medium">
                      From {msg.sourceMemoryTitle}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )
          )
        )}

        {isThinking && (
          <View className="flex-row items-center gap-2 mb-4">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-muted">Ranti is checking memories...</Text>
          </View>
        )}

        {/* Suggestions */}
        <Text className="text-xs text-muted mb-3 mt-2">You can also ask</Text>
        {SUGGESTIONS.map((s) => (
          <View key={s}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSend(s)}
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
      </ScrollView>

      {/* Input bar */}
      <View className="px-5 pb-4 pt-2">
        <View className="flex-row items-center bg-surface rounded-full px-4 gap-3 border border-border">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            placeholder="Ask or tell Ranti..."
            placeholderTextColor={colors.muted}
            className="flex-1 py-3 text-sm text-foreground"
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSend()}
            disabled={isThinking}
            className="w-10 h-10 bg-primary rounded-full items-center justify-center"
          >
            {input.trim() ? (
              <Ionicons name="arrow-up" size={18} color={colors.primaryForeground} />
            ) : (
              <Ionicons name="mic" size={18} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-center text-xs text-muted mt-2">
          Tap the mic to speak to Ranti directly.
        </Text>
      </View>
    </SafeAreaView>
  );
}
