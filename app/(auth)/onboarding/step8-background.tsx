import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";

const PROFESSION_OPTIONS = [
  "Unemployed",
  "Accountant",
  "Architect",
  "Artist",
  "Business Analyst",
  "Chef",
  "Consultant",
  "Dentist",
  "Designer",
  "Doctor",
  "Engineer",
  "Entrepreneur",
  "Financial Advisor",
  "Graphic Designer",
  "HR Manager",
  "IT Professional",
  "Journalist",
  "Lawyer",
  "Marketing Manager",
  "Nurse",
  "Pharmacist",
  "Photographer",
  "Physician",
  "Project Manager",
  "Real Estate Agent",
  "Sales Manager",
  "Software Developer",
  "Teacher",
  "Therapist",
  "Veterinarian",
  "Writer",
  "Other",
];

export default function Step8Background() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  const [education, setEducation] = useState(data.education || "");
  const [profession, setProfession] = useState(data.profession || "");
  const [bio, setBio] = useState(data.bio || "");
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);
  const [professionSearch, setProfessionSearch] = useState("");

  const filteredProfessions = PROFESSION_OPTIONS.filter((p) =>
    p.toLowerCase().includes(professionSearch.toLowerCase())
  );

  const next = () => {
    setData((d) => ({
      ...d,
      education: education.trim(),
      profession: profession.trim(),
      bio: bio.trim(),
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
        <View className="mb-10">
          <Text className="text-white text-4xl font-bold mb-3 leading-tight">
            About You
          </Text>
          <Text className="text-white/80 text-xl font-medium mb-2">
            Tell us more about yourself
          </Text>
          <Text className="text-white/60 text-sm">
            Share your education, profession, and a bit about yourself
          </Text>
        </View>

        {/* Education Input */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Education
          </Text>
          <TextInput
            className="bg-white/10 text-white p-4 rounded-2xl border border-white/5 text-lg"
            placeholder="e.g., Bachelor's in Computer Science"
            placeholderTextColor="#999"
            value={education}
            onChangeText={setEducation}
            multiline={false}
          />
        </View>

        {/* Profession Dropdown */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Profession
          </Text>
          <Pressable
            onPress={() => {
              setShowProfessionDropdown(!showProfessionDropdown);
            }}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {profession || "Select profession"}
            </Text>
          </Pressable>
          {showProfessionDropdown && (
            <View className="bg-white/10 rounded-2xl border border-white/5 mt-2 overflow-hidden max-h-80">
              {/* Search Input */}
              <View className="p-3 border-b border-white/5">
                <TextInput
                  className="bg-white/10 text-white p-3 rounded-xl border border-white/5"
                  placeholder="Search profession..."
                  placeholderTextColor="#999"
                  value={professionSearch}
                  onChangeText={setProfessionSearch}
                  autoFocus={false}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredProfessions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setProfession(option);
                      setShowProfessionDropdown(false);
                      setProfessionSearch("");
                    }}
                    className={`p-4 border-b border-white/5 ${
                      profession === option ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-white text-lg">{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bio Input */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Bio
          </Text>
          <TextInput
            className="bg-white/10 text-white p-4 rounded-2xl border border-white/5 text-lg"
            placeholder="Tell us about yourself..."
            placeholderTextColor="#999"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{ minHeight: 120 }}
          />
          <Text className="text-white/50 text-xs mt-2 ml-1">
            {bio.length} characters
          </Text>
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

