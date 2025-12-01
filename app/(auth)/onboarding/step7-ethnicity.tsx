import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

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
    router.push("/onboarding/step8-background");
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
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {ethnicity || "Select ethnicity"}
            </Text>
          </Pressable>
          {showEthnicityDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden max-h-64">
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
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {nationality || "Select nationality"}
            </Text>
          </Pressable>
          {showNationalityDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden max-h-80">
              {/* Search Input */}
              <View className="p-3 border-b border-white/5">
                <TextInput
                  className="bg-white/10 text-white p-3 rounded-xl border border-white/5"
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

        {/* Continue Button */}
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
          <Text className="text-white text-lg font-bold">Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

