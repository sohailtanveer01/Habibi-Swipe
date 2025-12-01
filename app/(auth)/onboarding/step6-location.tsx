import { View, Text, Pressable, Platform, KeyboardAvoidingView } from "react-native";
import * as Location from "expo-location";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const TOTAL_STEPS = 8;
const CURRENT_STEP = 6;

export default function Step6Location() {
  const router = useRouter();
  const { setData } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const enableLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLoading(false);
      alert("Location permission needed to show nearby matches.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setData((d) => ({
      ...d,
      location: { lat: loc.coords.latitude, lon: loc.coords.longitude },
    }));

    setLoading(false);
    router.push("/onboarding/step7-ethnicity");
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 bg-black">
        {/* Header with Back Button and Progress Indicators */}
        <View className="pt-20 px-6 pb-8">
        <View className="flex-row items-center justify-between mb-8">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </Pressable>

          {/* Step Indicators - Centered */}
          <View className="flex-row items-center gap-2 flex-1 justify-center px-4">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((indicator) => {
              const getIndicatorForStep = (step: number) => {
                if (step <= 5) return step;
                return 5;
              };
              const activeIndicator = getIndicatorForStep(CURRENT_STEP);
              const isActive = indicator === activeIndicator;
              return (
                <View
                  key={indicator}
                  className={`h-1 rounded-full ${
                    isActive ? "bg-[#F5F573] w-8" : "bg-[#B8860B] w-6"
                  }`}
                />
              );
            })}
          </View>

          {/* Step Text - Right Aligned */}
          <Text className="text-[#B8860B] text-xs font-medium" style={{ width: 50, textAlign: 'right' }}>
            step {CURRENT_STEP}/8
          </Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-4">
        <Text className="text-white text-3xl font-bold mb-4">Enable Location</Text>
        <Text className="text-white/70 mb-8">
          We use your location to show nearby Habibis.
        </Text>

        <Pressable
          className="bg-[#B8860B] p-4 rounded-2xl items-center"
          onPress={enableLocation}
          disabled={loading}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "Getting location..." : "Enable Location"}
          </Text>
        </Pressable>

        <Pressable
          className="bg-white/10 p-4 rounded-2xl items-center mt-3"
          onPress={() => router.push("/onboarding/step7-ethnicity")}
        >
          <Text className="text-white/80">Skip for now</Text>
        </Pressable>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}
