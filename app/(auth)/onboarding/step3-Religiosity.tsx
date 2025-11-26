import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

const SECT_OPTIONS = ["sunni", "shia", "sufi", "other", "prefer not to say"];
const RELIGIOUS_PRACTICE_OPTIONS = [
  "actively practicing",
  "moderately practicing",
  "not practicing",
];
const ALCOHOL_OPTIONS = ["drinks", "doesn't drink", "sometimes"];
const SMOKING_OPTIONS = ["smokes", "doesn't smoke", "sometimes"];

export default function Step3Religiosity() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [sect, setSect] = useState(data.sect);
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(data.bornMuslim);
  const [religiousPractice, setReligiousPractice] = useState(data.religiousPractice);
  const [alcoholHabit, setAlcoholHabit] = useState(data.alcoholHabit);
  const [smokingHabit, setSmokingHabit] = useState(data.smokingHabit);
  const [showSectDropdown, setShowSectDropdown] = useState(false);

  const next = () => {
    if (!sect || bornMuslim === null || !religiousPractice || !alcoholHabit || !smokingHabit) {
      alert("Please fill all fields.");
      return;
    }
    setData((d) => ({
      ...d,
      sect,
      bornMuslim,
      religiousPractice,
      alcoholHabit,
      smokingHabit,
    }));
    router.push("/onboarding/step4-hobbies");
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
            Religiosity
          </Text>
          <Text className="text-white/80 text-xl font-medium">
            Tell us about your faith and lifestyle
          </Text>
        </View>

        {/* Sect Dropdown */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Sect
          </Text>
          <Pressable
            onPress={() => setShowSectDropdown(!showSectDropdown)}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {sect ? sect.charAt(0).toUpperCase() + sect.slice(1) : "Select sect"}
            </Text>
          </Pressable>
          {showSectDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden">
              {SECT_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSect(option);
                    setShowSectDropdown(false);
                  }}
                  className={`p-4 border-b border-white/5 ${
                    sect === option ? "bg-pink-500/20" : ""
                  }`}
                >
                  <Text className="text-white text-lg capitalize">{option}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Born Muslim */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Born Muslim?
          </Text>
          <View className="flex-row gap-3">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <Pressable
                key={option.label}
                onPress={() => setBornMuslim(option.value)}
                className={`flex-1 px-4 py-4 rounded-2xl border ${
                  bornMuslim === option.value
                    ? "bg-pink-500 border-pink-500"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <Text className={`text-center font-semibold text-lg ${
                  bornMuslim === option.value ? "text-white" : "text-white/90"
                }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Religious Practice */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Religious Practice
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            {RELIGIOUS_PRACTICE_OPTIONS.map((practice) => (
              <Pressable
                key={practice}
                onPress={() => setReligiousPractice(practice)}
                className={`px-5 py-3 rounded-full border ${
                  religiousPractice === practice
                    ? "bg-pink-500 border-pink-500"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <Text className={`text-center capitalize font-medium ${
                  religiousPractice === practice ? "text-white" : "text-white/90"
                }`}>
                  {practice}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Habits */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-4 ml-1">
            Habits
          </Text>

          {/* Alcohol */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Alcohol
            </Text>
            <View className="flex-row gap-3 flex-wrap">
              {ALCOHOL_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setAlcoholHabit(option)}
                  className={`px-5 py-3 rounded-full border ${
                    alcoholHabit === option
                      ? "bg-pink-500 border-pink-500"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    alcoholHabit === option ? "text-white" : "text-white/90"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Smoking */}
          <View>
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Smoking
            </Text>
            <View className="flex-row gap-3 flex-wrap">
              {SMOKING_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSmokingHabit(option)}
                  className={`px-5 py-3 rounded-full border ${
                    smokingHabit === option
                      ? "bg-pink-500 border-pink-500"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    smokingHabit === option ? "text-white" : "text-white/90"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
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
