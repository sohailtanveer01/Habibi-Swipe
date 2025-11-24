import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useOnboarding } from "../../../lib/onboardingStore";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function OnboardingDone() {
  const { data } = useOnboarding();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    setSaving(true);

    // Build PostGIS geography point if location exists
    const locationPoint = data.location
      ? `SRID=4326;POINT(${data.location.lon} ${data.location.lat})`
      : null;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name: data.name,
      gender: data.gender,
      dob: data.dob,
      intent: data.intent,
      education: data.education,
      profession: data.profession,
      religion: data.religion,
      bio: data.bio,
      photos: data.photos,
      location: locationPoint,
      verified: false,
      last_active_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/swipe");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-16 items-center justify-center">
      <Text className="text-white text-3xl font-bold mb-2">All Set!</Text>
      <Text className="text-white/70 mb-8 text-center">
        Your profile is ready. Let’s find your Habibi 💗
      </Text>

      <Pressable
        className="bg-pink-500 px-8 py-4 rounded-2xl items-center"
        onPress={finish}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-lg font-semibold">Start Swiping</Text>
        )}
      </Pressable>
    </View>
  );
}
