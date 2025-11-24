import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

export default function Step1Basic() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [name, setName] = useState(data.name);
  const [gender, setGender] = useState(data.gender);
  const [dob, setDob] = useState(data.dob);

  const next = () => {
    if (!name.trim() || !gender || !dob) {
      alert("Please fill all fields.");
      return;
    }
    setData((d) => ({ ...d, name: name.trim(), gender, dob }));
    router.push("/onboarding/step2-background");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-3xl font-bold mb-6">Basic Info</Text>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="Name"
        placeholderTextColor="#777"
        value={name}
        onChangeText={setName}
      />

      <Text className="text-white mb-2">Gender</Text>
      <View className="flex-row gap-2 mb-4">
        {["male", "female"].map((g) => (
          <Pressable
            key={g}
            onPress={() => setGender(g)}
            className={`px-4 py-2 rounded-full ${
              gender === g ? "bg-pink-500" : "bg-white/10"
            }`}
          >
            <Text className="text-white capitalize">{g}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="DOB (YYYY-MM-DD)"
        placeholderTextColor="#777"
        value={dob}
        onChangeText={setDob}
      />

      <Pressable
        className="bg-pink-500 p-4 rounded-2xl items-center mt-2"
        onPress={next}
      >
        <Text className="text-white text-lg font-semibold">Next</Text>
      </Pressable>
    </View>
  );
}
