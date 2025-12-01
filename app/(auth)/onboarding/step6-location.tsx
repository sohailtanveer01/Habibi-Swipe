import { View, Text, Pressable } from "react-native";
import * as Location from "expo-location";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useRouter } from "expo-router";
import { useState } from "react";

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
    <View className="flex-1 bg-black px-6 pt-16">
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
  );
}
