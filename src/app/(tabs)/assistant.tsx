import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  useAudioStream,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useChat } from "../../hooks/useChat";
import { useMemories } from "../../hooks/useMemories";
import { useListeningSession } from "../../hooks/useListeningSession";
import { MetaRealtimeAsrSession } from "../../services/metaRealtimeAsr";
import { colors } from "../../lib/colors";

export default function AssistantScreen() {
  const [input, setInput] = useState("");
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<string | null>(null);

  const { messages, askQuestion, isThinking } = useChat();
  const { allMemories } = useMemories();
  const { isListening, isProcessing, lastError, toggleListening } =
    useListeningSession();

  const dictationSessionRef = useRef<MetaRealtimeAsrSession | null>(null);

  // Buffer handler for live dictation stream
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

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

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
      setDictationStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
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
      setDictationStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setIsDictating(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isThinking) return;
    setInput("");
    await askQuestion(text);
  };

  // Generate suggested questions from real memories or fallback to generic
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
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
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
        {suggestions.map((s) => (
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

      {/* Dictation Status Banner */}
      {dictationStatus && (
        <View className="px-5 py-1">
          <Text className="text-xs text-primary font-medium">{dictationStatus}</Text>
        </View>
      )}

      {/* Input bar */}
      <View className="px-5 pb-4 pt-2">
        <View className="flex-row items-center bg-surface rounded-full px-4 gap-3 border border-border">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            placeholder={isDictating ? "Listening... speak now" : "Ask or tell Ranti..."}
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
              <Ionicons name="arrow-up" size={18} color={colors.primaryForeground} />
            ) : isDictating ? (
              <Ionicons name="stop" size={18} color={colors.primaryForeground} />
            ) : (
              <Ionicons name="mic" size={18} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-center text-xs text-muted mt-2">
          {isDictating
            ? "Tap the red stop button to complete dictation."
            : "Tap the mic to dictate speech into the message box."}
        </Text>
      </View>
    </SafeAreaView>
  );
}
