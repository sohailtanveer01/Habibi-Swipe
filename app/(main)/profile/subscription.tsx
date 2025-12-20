import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(184,134,11,0.5)",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(184,134,11,0.12)",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#B8860B" />
        </Pressable>

        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>My Subscription</Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: "rgba(184,134,11,0.25)",
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.04)",
            padding: 18,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Coming soon</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", lineHeight: 20 }}>
            Subscription management will live here. For now, you can boost from the swipe screen using the flash button.
          </Text>
        </View>
      </View>
    </View>
  );
}


