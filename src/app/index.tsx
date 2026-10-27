import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView>
      <View>
        <Text className="text-lg font-bold">
          Edit src/app/index.tsx to edit this screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
