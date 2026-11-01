import { Ionicons } from "@react-native-vector-icons/ionicons";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from "expo-audio";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChat } from "../../hooks/useChat";
import { useMemories } from "../../hooks/useMemories";
import { colors } from "../../lib/colors";
import { MetaRealtimeAsrSession } from "../../services/metaRealtimeAsr";
export default function AssistantScreen() {
  const params = useLocalSearchParams<{
    memoryId?: string;
    memoryTitle?: string;
  }>();
  const [input, setInput] = useState("");
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<string | null>(null);

  const { messages, askQuestion, isThinking, error } = useChat();
  const { allMemories } = useMemories();

  const dictationSessionRef = useRef<MetaRealtimeAsrSession | null>(null);
  const handledParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      params.memoryTitle &&
      handledParamRef.current !== (params.memoryId || params.memoryTitle)
    ) {
      handledParamRef.current = params.memoryId || params.memoryTitle;
      setInput(`What do my notes say about ${params.memoryTitle}?`);
    }
  }, [params.memoryTitle, params.memoryId]);

  const onBuffer = useCallback((buffer: { data: ArrayBuffer }) => {
    if (dictationSessionRef.current && buffer.data) {
      try {
        dictationSessionRef.current.sendPcmChunk(buffer.data);
      } catch (err) {
        console.warn("[Dictation] send error:", err);
      }
    }
  }, []);

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: "int16",
    onBuffer,
  });

  const startDictation = async () => {
    try {
      setDictationStatus("Connecting...");
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setDictationStatus("Mic permission denied");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const session = new MetaRealtimeAsrSession({
        audioEncoding: "PCM_16KHZ",
        mode: "PUSH_TO_TALK",
        onTranscript: (evt) => {
          if (evt.transcript) {
            setInput((prev) => `${prev} ${evt.transcript}`.trim());
          }
        },
        onError: (err) => {
          setDictationStatus(`Error: ${err.message}`);
        },
      });

      dictationSessionRef.current = session;
      await session.connect();

      setIsDictating(true);
      setDictationStatus("Listening... tap mic to finish");
      await stream.start();
    } catch (err) {
      setDictationStatus(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsDictating(false);
    }
  };

  const stopDictation = async () => {
    try {
      setDictationStatus("Transcribing...");
      stream.stop();

      if (dictationSessionRef.current) {
        dictationSessionRef.current.endStream();
        setTimeout(() => {
          dictationSessionRef.current?.close();
          dictationSessionRef.current = null;
          setDictationStatus(null);
          setIsDictating(false);
        }, 500);
      } else {
        setIsDictating(false);
        setDictationStatus(null);
      }
    } catch (err) {
      setDictationStatus(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsDictating(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isThinking) return;
    setInput("");
    await askQuestion(text);
  };

  const suggestions = useMemo(() => {
    if (allMemories.length > 0) {
      const topMemories = allMemories.slice(0, 2);
      return topMemories.map((m) => `What did I note about ${m.title}?`);
    }
    return [
      "What do I need to do today?",
      "What should I remember for this week?",
    ];
  }, [allMemories]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View className="items-center py-4">
        <Text className="text-lg font-bold text-primary">Ranti</Text>
        <Text className="text-[11px] text-muted">
          A little more to remember.
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View className="pt-8">
            <Text className="text-sm text-foreground-secondary text-center">
              Good afternoon
            </Text>
            <Text className="text-3xl font-bold text-foreground text-center mt-1">
              What can I help you remember?
            </Text>
            <Text className="text-sm text-muted text-center px-8 mt-3">
              Ask naturally. I&apos;ll look through your saved memories and give
              you a grounded answer.
            </Text>

            <View className="flex-row flex-wrap justify-between mt-8">
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion}
                  activeOpacity={0.75}
                  onPress={() => handleSend(suggestion)}
                  className="w-[48%] bg-surface rounded-2xl border border-border p-4 mb-3"
                >
                  <View className="w-8 h-8 rounded-xl bg-surface-muted items-center justify-center mb-3">
                    <Ionicons
                      name={
                        index === 0 ? "sparkles-outline" : "calendar-outline"
                      }
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                  <Text className="text-sm font-semibold text-foreground leading-5">
                    {suggestion}
                  </Text>
                  <Text className="text-xs text-primary mt-3">Ask Ranti</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="items-center mt-12">
              <View className="flex-row items-end h-14">
                <View className="w-12 h-10 rounded-2xl bg-surface-muted rotate-[-8deg]" />
                <View className="w-14 h-14 rounded-2xl bg-primary/15 rotate-[8deg] -ml-4 items-center justify-center">
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={25}
                    color={colors.primary}
                  />
                </View>
              </View>
              <Text className="text-xs text-muted mt-4">
                Start a conversation whenever you&apos;re ready.
              </Text>
            </View>
          </View>
        ) : (
          <View className="pt-2">
            {messages.map((msg) =>
              msg.sender === "user" ? (
                <View key={msg.id} className="items-end mb-4">
                  <View className="bg-surface-muted rounded-2xl rounded-tr-sm px-4 py-3 max-w-[84%]">
                    <Text className="text-sm leading-5 text-foreground">
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ) : (
                <View key={msg.id} className="mb-7">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Image
                      source={require("../../../assets/images/logo.png")}
                      className="w-6 h-6 rounded-full"
                    />
                    <Text className="text-xs font-semibold text-foreground-secondary">
                      Ranti
                    </Text>
                  </View>
                  <Text className="text-base leading-6 text-foreground">
                    {msg.text}
                  </Text>
                  {msg.sources && msg.sources.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                      {msg.sources.map((src) => (
                        <TouchableOpacity
                          key={src.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (src.type === "memory") {
                              router.push(
                                `/(tabs)/memories/${src.id}` as never,
                              );
                            }
                          }}
                          className="flex-row items-center gap-1.5 bg-surface-muted px-3 py-1.5 rounded-full border border-border"
                        >
                          <Ionicons
                            name={
                              src.type === "task"
                                ? "checkbox-outline"
                                : src.type === "reminder"
                                  ? "alarm-outline"
                                  : src.type === "event"
                                    ? "calendar-outline"
                                    : "layers-outline"
                            }
                            size={13}
                            color={colors.primary}
                          />
                          <Text
                            className="text-xs text-primary font-medium"
                            numberOfLines={1}
                          >
                            From {src.title}
                          </Text>
                          {src.type === "memory" && (
                            <Ionicons
                              name="chevron-forward"
                              size={12}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : msg.sourceMemoryTitle ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        if (msg.sourceMemoryId) {
                          router.push(
                            `/(tabs)/memories/${msg.sourceMemoryId}` as never,
                          );
                        }
                      }}
                      className="flex-row items-center gap-1 mt-3"
                    >
                      <Ionicons
                        name="layers-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text className="text-sm text-primary font-medium">
                        From {msg.sourceMemoryTitle}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ),
            )}
          </View>
        )}

        {isThinking && (
          <View className="flex-row items-center gap-2 mb-4">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-muted">
              Ranti is checking memories...
            </Text>
          </View>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="alert-circle" size={16} color="#b91c1c" />
              <Text className="text-xs font-semibold text-red-700">
                Unable to get answer
              </Text>
            </View>
            <Text className="text-xs text-red-600">
              {error instanceof Error
                ? error.message
                : "Something went wrong fetching the answer. Please try again."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Dictation Status Banner */}
      {dictationStatus && (
        <View className="px-5 py-1">
          <Text className="text-xs text-primary font-medium">
            {dictationStatus}
          </Text>
        </View>
      )}

      {/* Input bar */}
      <View className="px-5 pb-4 pt-2">
        <View className="flex-row items-center bg-surface rounded-[26px] px-3 pl-4 gap-2 border border-border">
          <Ionicons name="add" size={20} color={colors.muted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            placeholder={
              isDictating ? "Listening... speak now" : "Ask or tell Ranti..."
            }
            placeholderTextColor={colors.muted}
            className="flex-1 py-3 text-sm text-foreground"
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={
              input.trim()
                ? () => handleSend()
                : isDictating
                  ? stopDictation
                  : startDictation
            }
            disabled={isThinking}
            style={{
              backgroundColor: isDictating ? "#b91c1c" : colors.primary,
            }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            {input.trim() ? (
              <Ionicons
                name="arrow-up"
                size={18}
                color={colors.primaryForeground}
              />
            ) : isDictating ? (
              <Ionicons
                name="stop"
                size={18}
                color={colors.primaryForeground}
              />
            ) : (
              <Ionicons name="mic" size={18} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
