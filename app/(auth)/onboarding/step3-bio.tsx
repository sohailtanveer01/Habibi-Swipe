import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

export default function Step3Bio() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [bio, setBio] = useState(data.bio);

  const next = () => {
    if (!bio.trim()) {
      alert("Please write a short bio.");
      return;
    }
    setData((d) => ({ ...d, bio: bio.trim() }));
    router.push("/onboarding/step4-photos");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-3xl font-bold mb-6">About You</Text>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl h-40 mb-4"
        placeholder="Write a short bio..."
        placeholderTextColor="#777"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Pressable className="bg-pink-500 p-4 rounded-2xl items-center" onPress={next}>
        <Text className="text-white text-lg font-semibold">Next</Text>
      </Pressable>
    </View>
  );
}
