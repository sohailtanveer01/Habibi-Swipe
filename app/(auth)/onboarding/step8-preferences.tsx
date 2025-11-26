import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";
import Slider from "@react-native-community/slider";

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

const SECT_OPTIONS = ["sunni", "shia", "sufi", "other", "prefer not to say"];
const ALCOHOL_OPTIONS = ["drinks", "doesn't drink", "sometimes"];
const SMOKING_OPTIONS = ["smokes", "doesn't smoke", "sometimes"];

export default function Step8Preferences() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [ageMin, setAgeMin] = useState(data.preferences?.ageMin || 18);
  const [ageMax, setAgeMax] = useState(data.preferences?.ageMax || 50);
  const [nationalities, setNationalities] = useState<string[]>(
    data.preferences?.nationalities || []
  );
  const [ethnicities, setEthnicities] = useState<string[]>(
    data.preferences?.ethnicities || []
  );
  const [sects, setSects] = useState<string[]>(data.preferences?.sects || []);
  const [alcoholPreferences, setAlcoholPreferences] = useState<string[]>(
    data.preferences?.alcoholPreferences || []
  );
  const [smokingPreferences, setSmokingPreferences] = useState<string[]>(
    data.preferences?.smokingPreferences || []
  );
  const [bornMuslim, setBornMuslim] = useState<"yes" | "no" | "both" | null>(
    data.preferences?.bornMuslim || null
  );

  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showEthnicityDropdown, setShowEthnicityDropdown] = useState(false);
  const [showSectDropdown, setShowSectDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");

  const filteredNationalities = NATIONALITY_OPTIONS.filter((n) =>
    n.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const toggleArrayItem = (
    item: string,
    array: string[],
    setArray: (arr: string[]) => void
  ) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const next = () => {
    setData((d) => ({
      ...d,
      preferences: {
        ageMin,
        ageMax,
        nationalities,
        ethnicities,
        sects,
        alcoholPreferences,
        smokingPreferences,
        bornMuslim,
      },
    }));
    router.push("/onboarding/done");
  };

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-20 pb-8">
        {/* Header Section */}
        <View className="mb-6">
          <Text className="text-white text-4xl font-bold mb-3 leading-tight">
            Preferences
          </Text>
          <Text className="text-white/80 text-lg font-medium mb-2">
            Set your filters
          </Text>
          <Text className="text-white/60 text-sm">
            Choose who you&apos;d like to see. You can change these anytime in settings.
          </Text>
        </View>

        {/* Age Range */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-4 ml-1">
            Age Range
          </Text>
          <View className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-2">
            <Text className="text-white text-2xl font-bold text-center mb-6">
              {Math.round(ageMin)} - {Math.round(ageMax)} years
            </Text>
            <Text className="text-white/70 text-sm mb-2">Minimum Age</Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={18}
              maximumValue={ageMax - 1}
              step={1}
              value={ageMin}
              onValueChange={(value) => setAgeMin(Math.round(value))}
              minimumTrackTintColor="#ec4899"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#ec4899"
            />
            <Text className="text-white/70 text-sm mb-2 mt-4">Maximum Age</Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={ageMin + 1}
              maximumValue={80}
              step={1}
              value={ageMax}
              onValueChange={(value) => setAgeMax(Math.round(value))}
              minimumTrackTintColor="#ec4899"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#ec4899"
            />
          </View>
        </View>

        {/* Nationality */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Nationality
          </Text>
          <Pressable
            onPress={() => {
              setShowNationalityDropdown(!showNationalityDropdown);
              setShowEthnicityDropdown(false);
              setShowSectDropdown(false);
            }}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {nationalities.length > 0
                ? `${nationalities.length} selected`
                : "Select nationalities (optional)"}
            </Text>
          </Pressable>
          {showNationalityDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden max-h-80">
              <View className="p-3 border-b border-white/5">
                <TextInput
                  className="bg-white/10 text-white p-3 rounded-xl border border-white/5"
                  placeholder="Search nationality..."
                  placeholderTextColor="#999"
                  value={nationalitySearch}
                  onChangeText={setNationalitySearch}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredNationalities.map((option) => {
                  const isSelected = nationalities.includes(option);
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        toggleArrayItem(option, nationalities, setNationalities)
                      }
                      className={`p-4 border-b border-white/5 flex-row items-center justify-between ${
                        isSelected ? "bg-pink-500/20" : ""
                      }`}
                    >
                      <Text className="text-white text-lg">{option}</Text>
                      {isSelected && (
                        <Text className="text-pink-500 text-xl">✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Ethnicity */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Ethnicity
          </Text>
          <Pressable
            onPress={() => {
              setShowEthnicityDropdown(!showEthnicityDropdown);
              setShowNationalityDropdown(false);
              setShowSectDropdown(false);
            }}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {ethnicities.length > 0
                ? `${ethnicities.length} selected`
                : "Select ethnicities (optional)"}
            </Text>
          </Pressable>
          {showEthnicityDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden max-h-64">
              <ScrollView showsVerticalScrollIndicator={false}>
                {ETHNICITY_OPTIONS.map((option) => {
                  const isSelected = ethnicities.includes(option);
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        toggleArrayItem(option, ethnicities, setEthnicities)
                      }
                      className={`p-4 border-b border-white/5 flex-row items-center justify-between ${
                        isSelected ? "bg-pink-500/20" : ""
                      }`}
                    >
                      <Text className="text-white text-lg">{option}</Text>
                      {isSelected && (
                        <Text className="text-pink-500 text-xl">✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Sect */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Sect
          </Text>
          <Pressable
            onPress={() => {
              setShowSectDropdown(!showSectDropdown);
              setShowNationalityDropdown(false);
              setShowEthnicityDropdown(false);
            }}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {sects.length > 0
                ? `${sects.length} selected`
                : "Select sects (optional)"}
            </Text>
          </Pressable>
          {showSectDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden">
              {SECT_OPTIONS.map((option) => {
                const isSelected = sects.includes(option);
                return (
                  <Pressable
                    key={option}
                    onPress={() => toggleArrayItem(option, sects, setSects)}
                    className={`p-4 border-b border-white/5 flex-row items-center justify-between ${
                      isSelected ? "bg-pink-500/20" : ""
                    }`}
                  >
                    <Text className="text-white text-lg capitalize">{option}</Text>
                    {isSelected && (
                      <Text className="text-pink-500 text-xl">✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Alcohol Preference */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Alcohol Preference
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            {ALCOHOL_OPTIONS.map((option) => {
              const isSelected = alcoholPreferences.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() =>
                    toggleArrayItem(
                      option,
                      alcoholPreferences,
                      setAlcoholPreferences
                    )
                  }
                  className={`px-5 py-3 rounded-full border ${
                    isSelected
                      ? "bg-pink-500 border-pink-500"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    isSelected ? "text-white" : "text-white/90"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Smoking Preference */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Smoking Preference
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            {SMOKING_OPTIONS.map((option) => {
              const isSelected = smokingPreferences.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() =>
                    toggleArrayItem(
                      option,
                      smokingPreferences,
                      setSmokingPreferences
                    )
                  }
                  className={`px-5 py-3 rounded-full border ${
                    isSelected
                      ? "bg-pink-500 border-pink-500"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <Text className={`text-center capitalize font-medium ${
                    isSelected ? "text-white" : "text-white/90"
                  }`}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Born Muslim */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Born Muslim?
          </Text>
          <View className="flex-row gap-3">
            {[
              { value: "yes" as const, label: "Yes" },
              { value: "no" as const, label: "No" },
              { value: "both" as const, label: "Either" },
            ].map((option) => (
              <Pressable
                key={option.value}
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

