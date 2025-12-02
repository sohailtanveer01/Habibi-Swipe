import { View, Text, Pressable, ScrollView, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const ETHNICITY_OPTIONS = [
  "Arab",
  "South Asian",
  "African",
  "East Asian",
  "Central Asian",
  "European",
  "North African",
  "Mixed",
  "Other",
  "Prefer not to say",
];

const NATIONALITY_OPTIONS = [
  "Afghanistan",
  "Algeria",
  "Bahrain",
  "Bangladesh",
  "Egypt",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Jordan",
  "Kazakhstan",
  "Kuwait",
  "Lebanon",
  "Libya",
  "Malaysia",
  "Morocco",
  "Nigeria",
  "Oman",
  "Pakistan",
  "Palestine",
  "Qatar",
  "Saudi Arabia",
  "Somalia",
  "Sudan",
  "Syria",
  "Tunisia",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Yemen",
  "Other",
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 8;

export default function Step7Ethnicity() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [ethnicity, setEthnicity] = useState(data.ethnicity);
  const [nationality, setNationality] = useState(data.nationality);
  const [showEthnicityDropdown, setShowEthnicityDropdown] = useState(false);
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");

  const filteredNationalities = NATIONALITY_OPTIONS.filter((n) =>
    n.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const next = () => {
    if (!ethnicity || !nationality) {
      alert("Please select both ethnicity and nationality.");
      return;
    }
    setData((d) => ({
      ...d,
      ethnicity,
      nationality,
    }));
    router.push("/onboarding/step9-background");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
      >
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
            step {CURRENT_STEP}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      <View className="px-6 pb-10">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-white text-4xl font-bold mb-3 leading-tight">
            Background
          </Text>
          <Text className="text-white/80 text-xl font-medium">
            Tell us about your heritage
          </Text>
        </View>

        {/* Ethnicity Dropdown */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Ethnicity
          </Text>
          <Pressable
            onPress={() => {
              setShowEthnicityDropdown(!showEthnicityDropdown);
              setShowNationalityDropdown(false);
            }}
            className="bg-white/5 p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-white text-lg">
              {ethnicity || "Select ethnicity"}
            </Text>
          </Pressable>
          {showEthnicityDropdown && (
            <View className="bg-white/5 rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-64">
              <ScrollView showsVerticalScrollIndicator={false}>
                {ETHNICITY_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setEthnicity(option);
                      setShowEthnicityDropdown(false);
                    }}
                    className={`p-4 border-b border-white/5 ${
                      ethnicity === option ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-white text-lg">{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Nationality Dropdown */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Nationality
          </Text>
          <Pressable
            onPress={() => {
              setShowNationalityDropdown(!showNationalityDropdown);
              setShowEthnicityDropdown(false);
            }}
            className="bg-white/5 p-4 rounded-2xl border border-[#eebd2b]/30"
          >
            <Text className="text-white text-lg">
              {nationality || "Select nationality"}
            </Text>
          </Pressable>
          {showNationalityDropdown && (
            <View className="bg-white/5 rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-80">
              {/* Search Input */}
              <View className="p-3 border-b border-[#eebd2b]/20">
                <TextInput
                  className="bg-white/5 text-white p-3 rounded-xl border border-[#eebd2b]/30"
                  placeholder="Search nationality..."
                  placeholderTextColor="#999"
                  value={nationalitySearch}
                  onChangeText={setNationalitySearch}
                  autoFocus={false}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredNationalities.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setNationality(option);
                      setShowNationalityDropdown(false);
                      setNationalitySearch("");
                    }}
                    className={`p-4 border-b border-white/5 ${
                      nationality === option ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-white text-lg">{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
      </ScrollView>

      {/* Fixed Next Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          className="bg-[#B8860B] p-5 rounded-2xl items-center shadow-lg"
          onPress={next}
          style={{
            shadowColor: "#B8860B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white text-lg font-bold">Next</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}

