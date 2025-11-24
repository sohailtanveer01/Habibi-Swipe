import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

export default function Step2Background() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [intent, setIntent] = useState(data.intent);
  const [education, setEducation] = useState(data.education);
  const [profession, setProfession] = useState(data.profession);
  const [religion, setReligion] = useState(data.religion);

  const next = () => {
    if (!intent || !education.trim() || !profession.trim() || !religion.trim()) {
      alert("Please fill all fields.");
      return;
    }
    setData((d) => ({
      ...d,
      intent,
      education: education.trim(),
      profession: profession.trim(),
      religion: religion.trim(),
    }));
    router.push("/onboarding/step3-bio");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-3xl font-bold mb-6">Background</Text>

      <Text className="text-white mb-2">Intent</Text>
      <View className="flex-row gap-2 mb-4 flex-wrap">
        {["serious", "marriage", "casual"].map((i) => (
          <Pressable
            key={i}
            onPress={() => setIntent(i)}
            className={`px-4 py-2 rounded-full ${
              intent === i ? "bg-pink-500" : "bg-white/10"
            }`}
          >
            <Text className="text-white capitalize">{i}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="Education (e.g., Bachelor's)"
        placeholderTextColor="#777"
        value={education}
        onChangeText={setEducation}
      />

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="Profession"
        placeholderTextColor="#777"
        value={profession}
        onChangeText={setProfession}
      />

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="Religion"
        placeholderTextColor="#777"
        value={religion}
        onChangeText={setReligion}
      />

      <Pressable className="bg-pink-500 p-4 rounded-2xl items-center" onPress={next}>
        <Text className="text-white text-lg font-semibold">Next</Text>
      </Pressable>
    </View>
  );
}
