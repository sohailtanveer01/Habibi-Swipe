import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

const HOBBIES = [
  { emoji: "📚", name: "Reading" },
  { emoji: "🎬", name: "Movies" },
  { emoji: "🎵", name: "Music" },
  { emoji: "🎮", name: "Gaming" },
  { emoji: "⚽", name: "Sports" },
  { emoji: "🏋️", name: "Fitness" },
  { emoji: "🥊", name: "Boxing" },
  { emoji: "🍳", name: "Cooking" },
  { emoji: "✈️", name: "Travel" },
  { emoji: "📸", name: "Photography" },
  { emoji: "🎨", name: "Art" },
  { emoji: "🎤", name: "Singing" },
  { emoji: "🎹", name: "Music Instruments" },
  { emoji: "🧘", name: "Yoga" },
  { emoji: "🏃", name: "Running" },
  { emoji: "🚴", name: "Cycling" },
  { emoji: "🏊", name: "Swimming" },
  { emoji: "🎯", name: "Archery" },
  { emoji: "🎲", name: "Board Games" },
  { emoji: "🧩", name: "Puzzles" },
  { emoji: "🛍️", name: "Shopping" },
  { emoji: "🌱", name: "Gardening" },
  { emoji: "🐕", name: "Pets" },
  { emoji: "✍️", name: "Writing" },
  { emoji: "🎪", name: "Theater" },
  { emoji: "🍷", name: "Wine Tasting" },
  { emoji: "☕", name: "Coffee" },
  { emoji: "🍺", name: "Craft Beer" },
  { emoji: "🎣", name: "Fishing" },
  { emoji: "🏔️", name: "Hiking" },
  { emoji: "⛷️", name: "Skiing" },
  { emoji: "🏄", name: "Surfing" },
  { emoji: "🤿", name: "Diving" },
  { emoji: "🎪", name: "Circus" },
  { emoji: "🎭", name: "Drama" },
  { emoji: "💃", name: "Dancing" },
  { emoji: "🎪", name: "Magic" },
  { emoji: "🔬", name: "Science" },
  { emoji: "🌍", name: "Languages" },
  { emoji: "📱", name: "Technology" },
  { emoji: "🚗", name: "Cars" },
  { emoji: "✈️", name: "Aviation" },
  { emoji: "🏰", name: "History" },
  { emoji: "🌌", name: "Astronomy" },
];

export default function Step4Hobbies() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(data.hobbies || []);

  const toggleHobby = (hobbyName: string) => {
    setSelectedHobbies((prev) => {
      if (prev.includes(hobbyName)) {
        return prev.filter((h) => h !== hobbyName);
      } else {
        return [...prev, hobbyName];
      }
    });
  };

  const next = () => {
    if (selectedHobbies.length === 0) {
      alert("Please select at least one hobby.");
      return;
    }
    setData((d) => ({
      ...d,
      hobbies: selectedHobbies,
    }));
    router.push("/onboarding/step5-photos");
  };

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-20 pb-8">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-white text-4xl font-bold mb-3 leading-tight">
            Hobbies
          </Text>
          <Text className="text-white/80 text-xl font-medium">
            What do you love to do?
          </Text>
        </View>

        {/* Hobbies Grid */}
        <View className="mb-10">
          <View className="flex-row flex-wrap gap-3">
            {HOBBIES.map((hobby) => {
              const isSelected = selectedHobbies.includes(hobby.name);
              return (
                <Pressable
                  key={hobby.name}
                  onPress={() => toggleHobby(hobby.name)}
                  className={`px-4 py-3 rounded-full border ${
                    isSelected
                      ? "bg-pink-500 border-pink-500"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl">{hobby.emoji}</Text>
                    <Text className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-white/90"
                    }`}>
                      {hobby.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Continue Button */}
        <Pressable
          className="bg-pink-500 p-5 rounded-2xl items-center shadow-lg"
          onPress={next}
          style={{
            shadowColor: "#ec4899",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white text-lg font-bold">Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

