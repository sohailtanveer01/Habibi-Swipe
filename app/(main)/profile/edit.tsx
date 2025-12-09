import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
  { emoji: "🎭", name: "Drama" },
  { emoji: "💃", name: "Dancing" },
  { emoji: "🔬", name: "Science" },
  { emoji: "🌍", name: "Languages" },
  { emoji: "📱", name: "Technology" },
  { emoji: "🚗", name: "Cars" },
  { emoji: "✈️", name: "Aviation" },
  { emoji: "🏰", name: "History" },
  { emoji: "🌌", name: "Astronomy" },
];

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

const DEFAULT_PROMPTS = [
  "My love language is…",
  "One thing I'm proud of…",
  "The most spontaneous thing I've done…",
  "A green flag about me…",
  "A red flag about me…",
  "My perfect weekend is…",
  "My best habit is…",
  "A secret talent I have…",
  "My friends describe me as…",
  "A dream I'm chasing…",
];

interface Prompt {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [sect, setSect] = useState("");
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(null);
  const [religiousPractice, setReligiousPractice] = useState("");
  const [alcoholHabit, setAlcoholHabit] = useState("");
  const [smokingHabit, setSmokingHabit] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [religion, setReligion] = useState("");
  const [bio, setBio] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [nationality, setNationality] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showPromptDropdown, setShowPromptDropdown] = useState<number | null>(null);
  
  // Height picker state
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("10");
  const feetScrollRef = useRef<ScrollView>(null);
  const inchesScrollRef = useRef<ScrollView>(null);
  
  const FEET_OPTIONS = Array.from({ length: 4 }, (_, i) => (i + 4).toString()); // 4-7 feet
  const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11 inches

  // Scroll to current value when picker opens
  useEffect(() => {
    if (editingField === 'height' && feetScrollRef.current && inchesScrollRef.current) {
      // Small delay to ensure ScrollView is rendered
      setTimeout(() => {
        const feetIndex = FEET_OPTIONS.indexOf(feet);
        const inchesIndex = INCHES_OPTIONS.indexOf(inches);
        
        if (feetIndex >= 0) {
          feetScrollRef.current?.scrollTo({
            y: feetIndex * 44,
            animated: false,
          });
        }
        
        if (inchesIndex >= 0) {
          inchesScrollRef.current?.scrollTo({
            y: inchesIndex * 44,
            animated: false,
          });
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingField, feet, inches]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      
      setGender(data.gender || "");
      setHeight(data.height || "");
      
      // Parse height into feet and inches
      if (data.height) {
        const ftMatch = data.height.match(/(\d+)'(\d+)/);
        if (ftMatch) {
          setFeet(ftMatch[1]);
          setInches(ftMatch[2]);
        }
      }
      
      setMaritalStatus(data.marital_status || "");
      setHasChildren(data.has_children !== undefined ? data.has_children : null);
      setDob(data.dob || "");
      setSect(data.sect || "");
      setBornMuslim(data.born_muslim !== undefined ? data.born_muslim : null);
      setReligiousPractice(data.religious_practice || "");
      setAlcoholHabit(data.alcohol_habit || "");
      setSmokingHabit(data.smoking_habit || "");
      setEducation(data.education || "");
      setProfession(data.profession || "");
      setReligion(data.religion || "");
      setBio(data.bio || "");
      setEthnicity(data.ethnicity || "");
      setNationality(data.nationality || "");
      setHobbies(data.hobbies || []);

      // Fetch prompts from user_prompts table
      const { data: promptsData } = await supabase
        .from("user_prompts")
        .select("id, question, answer, display_order")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true });

      if (promptsData && promptsData.length > 0) {
        // Fill remaining slots up to 3
        const filledPrompts = [...promptsData];
        while (filledPrompts.length < 3) {
          filledPrompts.push({
            id: `prompt-${filledPrompts.length}`,
            question: "",
            answer: "",
            display_order: filledPrompts.length,
          });
        }
        setPrompts(filledPrompts.slice(0, 3));
      } else {
        // Initialize with 3 empty prompt slots
        setPrompts([
          { id: "prompt-0", question: "", answer: "", display_order: 0 },
          { id: "prompt-1", question: "", answer: "", display_order: 1 },
          { id: "prompt-2", question: "", answer: "", display_order: 2 },
        ]);
      }
    } catch (e: any) {
      console.error("Error loading profile:", e);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (overrideValues?: {
    sect?: string;
    bornMuslim?: boolean | null;
    religiousPractice?: string;
    alcoholHabit?: string;
    smokingHabit?: string;
    ethnicity?: string;
    nationality?: string;
    maritalStatus?: string;
    hasChildren?: boolean | null;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSaving(true);

      // Build update payload - ONLY include fields that are being edited
      const updatePayload: any = {
        last_active_at: new Date().toISOString(),
      };

      // Only include fields that are being edited
      switch (editingField) {
        case 'name':
          updatePayload.name = `${firstName.trim()} ${lastName.trim()}`.trim();
          updatePayload.first_name = firstName.trim();
          updatePayload.last_name = lastName.trim();
          break;
        
        case 'height':
          // Combine feet and inches into height string format
          updatePayload.height = `${feet}'${inches}`;
          break;
        
        case 'dob':
          updatePayload.dob = dob;
          break;
        
        case 'maritalStatus':
          updatePayload.marital_status = overrideValues?.maritalStatus !== undefined ? overrideValues.maritalStatus : maritalStatus;
          break;
        
        case 'children':
          updatePayload.has_children = overrideValues?.hasChildren !== undefined ? overrideValues.hasChildren : hasChildren;
          break;
        
        case 'sect':
          updatePayload.sect = (overrideValues?.sect !== undefined ? overrideValues.sect : sect).trim();
          break;
        
        case 'bornMuslim':
          updatePayload.born_muslim = overrideValues?.bornMuslim !== undefined ? overrideValues.bornMuslim : bornMuslim;
          break;
        
        case 'religiousPractice':
          updatePayload.religious_practice = overrideValues?.religiousPractice !== undefined ? overrideValues.religiousPractice : religiousPractice;
          break;
        
        case 'alcoholHabit':
          updatePayload.alcohol_habit = overrideValues?.alcoholHabit !== undefined ? overrideValues.alcoholHabit : alcoholHabit;
          break;
        
        case 'smokingHabit':
          updatePayload.smoking_habit = overrideValues?.smokingHabit !== undefined ? overrideValues.smokingHabit : smokingHabit;
          break;
        
        case 'education':
          updatePayload.education = education.trim();
          break;
        
        case 'profession':
          updatePayload.profession = profession.trim();
          break;
        
        case 'ethnicity':
          updatePayload.ethnicity = (overrideValues?.ethnicity !== undefined ? overrideValues.ethnicity : ethnicity).trim();
          break;
        
        case 'nationality':
          updatePayload.nationality = (overrideValues?.nationality !== undefined ? overrideValues.nationality : nationality).trim();
          break;
        
        case 'hobbies':
          updatePayload.hobbies = hobbies;
          break;
        
        case 'bio':
          updatePayload.bio = bio.trim();
          break;
        
        default:
          // If no specific field is being edited, include all fields (fallback)
          // This handles cases where overrideValues are used for quick saves
          updatePayload.name = `${firstName.trim()} ${lastName.trim()}`.trim();
          updatePayload.first_name = firstName.trim();
          updatePayload.last_name = lastName.trim();
          updatePayload.height = height.trim();
          updatePayload.marital_status = maritalStatus;
          updatePayload.has_children = hasChildren;
          updatePayload.sect = (overrideValues?.sect !== undefined ? overrideValues.sect : sect).trim();
          updatePayload.born_muslim = overrideValues?.bornMuslim !== undefined ? overrideValues.bornMuslim : bornMuslim;
          updatePayload.religious_practice = overrideValues?.religiousPractice !== undefined ? overrideValues.religiousPractice : religiousPractice;
          updatePayload.alcohol_habit = overrideValues?.alcoholHabit !== undefined ? overrideValues.alcoholHabit : alcoholHabit;
          updatePayload.smoking_habit = overrideValues?.smokingHabit !== undefined ? overrideValues.smokingHabit : smokingHabit;
          updatePayload.education = education.trim();
          updatePayload.profession = profession.trim();
          updatePayload.religion = religion.trim();
          updatePayload.bio = bio.trim();
          updatePayload.ethnicity = (overrideValues?.ethnicity !== undefined ? overrideValues.ethnicity : ethnicity).trim();
          updatePayload.nationality = (overrideValues?.nationality !== undefined ? overrideValues.nationality : nationality).trim();
          updatePayload.hobbies = hobbies;
          break;
      }

      // Prepare prompts data if editing prompts
      let promptsData = null;
      if (editingField === 'prompts') {
        promptsData = prompts;
      }

      // Call Edge Function to update profile
      const { error } = await supabase.functions.invoke("edit-profile", {
        body: {
          updatePayload,
          prompts: promptsData,
        },
      });

      if (error) {
        throw error;
      }

      setEditingField(null);
      await loadProfile();
      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Premium Header */}
      <View className="pt-16 px-6 pb-6 bg-black border-b border-[#B8860B]/20">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => {
              // Navigate back to profile page instead of using router.back()
              router.push("/(main)/profile");
            }}
            className="w-10 h-10 rounded-full items-center justify-center bg-white/10 active:bg-white/20"
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text className="text-white text-2xl font-bold">Edit Profile</Text>
          <View className="w-10" />
        </View>
        <View className="h-1 w-16 bg-[#B8860B] rounded-full self-center mt-2" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-8">
          {/* About You Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">About You</Text>
            </View>
            
            {/* Name Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'name' ? null : 'name')}
              className="flex-row items-center justify-between py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">👤</Text>
                </View>
                <Text className="text-white text-base font-medium">Name</Text>
              </View>
              {editingField === 'name' ? (
                <View className="items-end flex-1 ml-4">
                  <TextInput
                    className="bg-white/10 border border-[#B8860B]/30 text-white px-4 py-2.5 rounded-xl text-right min-w-[140] mb-2 focus:border-[#B8860B]"
                    placeholder="First Name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <TextInput
                    className="bg-white/10 border border-[#B8860B]/30 text-white px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                    placeholder="Last Name"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">
                    {firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Not set"}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Height Row */}
            <View className="py-4 border-b border-white/10">
              <Pressable
                onPress={() => setEditingField(editingField === 'height' ? null : 'height')}
                className="flex-row items-center justify-between"
                disabled={editingField === 'height'}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">📏</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Height</Text>
                </View>
                {editingField !== 'height' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 font-medium">{height || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </Pressable>
              {editingField === 'height' && (
                <View className="mt-4">
                  <View className="bg-white/5 rounded-2xl border border-[#B8860B]/30 p-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-lg font-semibold">Select Height</Text>
                      <Pressable onPress={async () => { await handleSave(); setEditingField(null); }} disabled={saving}>
                        {saving ? (
                          <ActivityIndicator color="#B8860B" size="small" />
                        ) : (
                          <Text className="text-[#B8860B] text-lg font-semibold">Done</Text>
                        )}
                      </Pressable>
                    </View>
                    <View className="flex-row items-center justify-center gap-2">
                      {/* Feet Picker */}
                      <View className="flex-1" style={{ height: 200 }}>
                        <ScrollView
                          ref={feetScrollRef}
                          showsVerticalScrollIndicator={false}
                          snapToInterval={44}
                          decelerationRate="fast"
                          scrollEventThrottle={16}
                          onMomentumScrollEnd={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / 44);
                            const selectedFeet = FEET_OPTIONS[Math.max(0, Math.min(index, FEET_OPTIONS.length - 1))];
                            setFeet(selectedFeet);
                            setHeight(`${selectedFeet}'${inches}`);
                          }}
                          contentContainerStyle={{
                            paddingVertical: 78,
                          }}
                          nestedScrollEnabled={true}
                        >
                          {FEET_OPTIONS.map((ft) => (
                            <View
                              key={ft}
                              style={{
                                height: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 21,
                                  color: '#FFFFFF',
                                }}
                              >
                                {ft}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                        {/* Center indicator overlay */}
                        <View
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 44,
                            borderTopWidth: 0.5,
                            borderBottomWidth: 0.5,
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            marginTop: -22,
                            pointerEvents: 'none',
                          }}
                        />
                      </View>
                      
                      <Text style={{ fontSize: 21, color: '#FFFFFF', marginHorizontal: 8 }}>&apos;</Text>
                      
                      {/* Inches Picker */}
                      <View className="flex-1" style={{ height: 200 }}>
                        <ScrollView
                          ref={inchesScrollRef}
                          showsVerticalScrollIndicator={false}
                          snapToInterval={44}
                          decelerationRate="fast"
                          scrollEventThrottle={16}
                          onMomentumScrollEnd={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / 44);
                            const selectedInches = INCHES_OPTIONS[Math.max(0, Math.min(index, INCHES_OPTIONS.length - 1))];
                            setInches(selectedInches);
                            setHeight(`${feet}'${selectedInches}`);
                          }}
                          contentContainerStyle={{
                            paddingVertical: 78,
                          }}
                          nestedScrollEnabled={true}
                        >
                          {INCHES_OPTIONS.map((inch) => (
                            <View
                              key={inch}
                              style={{
                                height: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 21,
                                  color: '#FFFFFF',
                                }}
                              >
                                {inch}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                        {/* Center indicator overlay */}
                        <View
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 44,
                            borderTopWidth: 0.5,
                            borderBottomWidth: 0.5,
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            marginTop: -22,
                            pointerEvents: 'none',
                          }}
                        />
                      </View>
                      
                      <Text style={{ fontSize: 21, color: '#FFFFFF', marginLeft: 8 }}>&quot;</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Marital Status Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'maritalStatus' ? null : 'maritalStatus')}
              className="py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">💍</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Marital Status</Text>
                </View>
                {editingField !== 'maritalStatus' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 capitalize font-medium">{maritalStatus || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'maritalStatus' && (
                <View className="flex-row gap-2 flex-wrap ml-13 mt-2">
                  {["single", "divorced", "widowed", "separated"].map((status) => (
                    <Pressable
                      key={status}
                      onPress={async () => {
                        setMaritalStatus(status);
                        // Save with the new value directly
                        await handleSave({ maritalStatus: status });
                        setEditingField(null);
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        maritalStatus === status 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium ${
                        maritalStatus === status ? "text-white" : "text-white/90"
                      }`}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Children Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'children' ? null : 'children')}
              className="py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">👶</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Children</Text>
                </View>
                {editingField !== 'children' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 font-medium">
                      {hasChildren === null ? "Not set" : hasChildren ? "Yes" : "No"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'children' && (
                <View className="flex-row gap-3 ml-13 mt-2">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ].map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={async () => {
                        setHasChildren(option.value);
                        // Save with the new value directly
                        await handleSave({ hasChildren: option.value });
                        setEditingField(null);
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-xl border ${
                        hasChildren === option.value 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-center text-sm font-semibold ${
                        hasChildren === option.value ? "text-white" : "text-white/90"
                      }`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Date of Birth Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'dob' ? null : 'dob')}
              className="flex-row items-center justify-between py-4 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">📅</Text>
                </View>
                <Text className="text-white text-base font-medium">Date of Birth</Text>
              </View>
              {editingField === 'dob' ? (
                <TextInput
                  className="bg-white/10 border border-[#B8860B]/30 text-white px-4 py-2.5 rounded-xl text-right min-w-[140] focus:border-[#B8860B]"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={dob}
                  onChangeText={setDob}
                  autoFocus
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">{dob || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Save button for text inputs */}
            {(editingField === 'name' || editingField === 'dob') && (
              <View className="flex-row gap-3 mt-6">
                <Pressable
                  className="flex-1 bg-white/10 px-4 py-3 rounded-xl border border-white/20 active:bg-white/15"
                  onPress={() => {
                    setEditingField(null);
                    loadProfile();
                  }}
                >
                  <Text className="text-white font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                  onPress={async () => {
                    await handleSave();
                    setEditingField(null);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-center">Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Religiosity Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Religiosity</Text>
            </View>
            
            {/* Sect Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'sect' ? null : 'sect')}
              className="flex-row items-center justify-between py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🕌</Text>
                </View>
                <Text className="text-white text-base font-medium">Sect</Text>
              </View>
              {editingField === 'sect' ? (
                <View className="items-end flex-1 ml-4">
                  {["sunni", "shia", "sufi", "other", "prefer not to say"].map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setSect(option);
                        setEditingField(null);
                        await handleSave({ sect: option });
                      }}
                      className={`px-4 py-2 rounded-xl mb-2 border w-full ${
                        sect === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium text-center ${
                        sect === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 capitalize font-medium">{sect || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Born Muslim Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'bornMuslim' ? null : 'bornMuslim')}
              className="flex-row items-center justify-between py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🌙</Text>
                </View>
                <Text className="text-white text-base font-medium">Born Muslim?</Text>
              </View>
              {editingField === 'bornMuslim' ? (
                <View className="flex-row gap-3 flex-1 ml-4">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ].map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={async () => {
                        setBornMuslim(option.value);
                        setEditingField(null);
                        await handleSave({ bornMuslim: option.value });
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-xl border ${
                        bornMuslim === option.value 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-center text-sm font-semibold ${
                        bornMuslim === option.value ? "text-white" : "text-white/90"
                      }`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">
                    {bornMuslim === true ? "Yes" : bornMuslim === false ? "No" : "Not set"}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Religious Practice Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'religiousPractice' ? null : 'religiousPractice')}
              className="py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">🤲</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Religious Practice</Text>
                </View>
                {editingField !== 'religiousPractice' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 capitalize font-medium">{religiousPractice || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'religiousPractice' && (
                <View className="flex-row gap-2 flex-wrap ml-13 mt-2">
                  {["actively practicing", "moderately practicing", "not practicing", "Prays 5 times a day"].map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setReligiousPractice(option);
                        setEditingField(null);
                        await handleSave({ religiousPractice: option });
                      }}
                      className={`px-4 py-2 rounded-xl border ${
                        religiousPractice === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium ${
                        religiousPractice === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Alcohol Habit Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'alcoholHabit' ? null : 'alcoholHabit')}
              className="py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">🍷</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Alcohol</Text>
                </View>
                {editingField !== 'alcoholHabit' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 capitalize font-medium">{alcoholHabit || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'alcoholHabit' && (
                <View className="flex-row gap-2 flex-wrap ml-13 mt-2">
                  {["never", "socially", "often"].map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setAlcoholHabit(option);
                        setEditingField(null);
                        await handleSave({ alcoholHabit: option });
                      }}
                      className={`px-4 py-2 rounded-xl border ${
                        alcoholHabit === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium ${
                        alcoholHabit === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Smoking Habit Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'smokingHabit' ? null : 'smokingHabit')}
              className="py-4 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">🚬</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Smoking</Text>
                </View>
                {editingField !== 'smokingHabit' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 capitalize font-medium">{smokingHabit || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'smokingHabit' && (
                <View className="flex-row gap-2 flex-wrap ml-13 mt-2">
                  {["never", "socially", "often"].map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setSmokingHabit(option);
                        setEditingField(null);
                        await handleSave({ smokingHabit: option });
                      }}
                      className={`px-4 py-2 rounded-xl border ${
                        smokingHabit === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm capitalize font-medium ${
                        smokingHabit === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          </View>

          {/* Background Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Background</Text>
            </View>
            
            {/* Education Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'education' ? null : 'education')}
              className="flex-row items-center justify-between py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🎓</Text>
                </View>
                <Text className="text-white text-base font-medium">Education</Text>
              </View>
              {editingField === 'education' ? (
                <TextInput
                  className="bg-white/10 border border-[#B8860B]/30 text-white px-4 py-2.5 rounded-xl text-right min-w-[140] flex-1 ml-4 focus:border-[#B8860B]"
                  placeholder="Enter education"
                  placeholderTextColor="#9CA3AF"
                  value={education}
                  onChangeText={setEducation}
                  autoCapitalize="words"
                  autoFocus
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">{education || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Profession Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'profession' ? null : 'profession')}
              className="flex-row items-center justify-between py-4 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">💼</Text>
                </View>
                <Text className="text-white text-base font-medium">Profession</Text>
              </View>
              {editingField === 'profession' ? (
                <TextInput
                  className="bg-white/10 border border-[#B8860B]/30 text-white px-4 py-2.5 rounded-xl text-right min-w-[140] flex-1 ml-4 focus:border-[#B8860B]"
                  placeholder="Enter profession"
                  placeholderTextColor="#9CA3AF"
                  value={profession}
                  onChangeText={setProfession}
                  autoCapitalize="words"
                  autoFocus
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">{profession || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Save button for text inputs */}
            {(editingField === 'education' || editingField === 'profession') && (
              <View className="flex-row gap-3 mt-6">
                <Pressable
                  className="flex-1 bg-white/10 px-4 py-3 rounded-xl border border-white/20 active:bg-white/15"
                  onPress={() => {
                    setEditingField(null);
                    loadProfile();
                  }}
                >
                  <Text className="text-white font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                  onPress={async () => {
                    await handleSave();
                    setEditingField(null);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-center">Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Ethnicity & Nationality Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Ethnicity & Nationality</Text>
            </View>
            
            {/* Ethnicity Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'ethnicity' ? null : 'ethnicity')}
              className="flex-row items-center justify-between py-4 border-b border-white/10 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                  <Text className="text-lg">🌍</Text>
                </View>
                <Text className="text-white text-base font-medium">Ethnicity</Text>
              </View>
              {editingField === 'ethnicity' ? (
                <ScrollView className="max-h-64 flex-1 ml-4" showsVerticalScrollIndicator={false}>
                  {ETHNICITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setEthnicity(option);
                        setEditingField(null);
                        await handleSave({ ethnicity: option });
                      }}
                      className={`px-4 py-2.5 rounded-xl mb-2 border ${
                        ethnicity === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm font-medium text-center ${
                        ethnicity === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 font-medium">{ethnicity || "Not set"}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                </View>
              )}
            </Pressable>

            {/* Nationality Row */}
            <Pressable
              onPress={() => setEditingField(editingField === 'nationality' ? null : 'nationality')}
              className="py-4 active:bg-white/5 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                    <Text className="text-lg">🏳️</Text>
                  </View>
                  <Text className="text-white text-base font-medium">Nationality</Text>
                </View>
                {editingField !== 'nationality' && (
                  <View className="flex-row items-center">
                    <Text className="text-white text-base mr-2 font-medium">{nationality || "Not set"}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                )}
              </View>
              {editingField === 'nationality' && (
                <ScrollView className="max-h-64 ml-13 mt-2" showsVerticalScrollIndicator={false}>
                  {NATIONALITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={async () => {
                        setNationality(option);
                        setEditingField(null);
                        await handleSave({ nationality: option });
                      }}
                      className={`px-4 py-2.5 rounded-xl mb-2 border ${
                        nationality === option 
                          ? "bg-[#B8860B] border-[#B8860B]" 
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        nationality === option ? "text-white" : "text-white/90"
                      }`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </View>

          {/* Hobbies Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Hobbies</Text>
            </View>
            
            {editingField === 'hobbies' ? (
              <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap gap-3">
                  {HOBBIES.map((hobby) => {
                    const isSelected = hobbies.includes(hobby.name);
                    return (
                      <Pressable
                        key={hobby.name}
                        onPress={() => {
                          if (isSelected) {
                            setHobbies(hobbies.filter((h) => h !== hobby.name));
                          } else {
                            if (hobbies.length < 3) {
                              setHobbies([...hobbies, hobby.name]);
                            } else {
                              Alert.alert("Limit Reached", "You can only select up to 3 hobbies.");
                            }
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl flex-row items-center gap-2 border ${
                          isSelected 
                            ? "bg-[#B8860B] border-[#B8860B]" 
                            : "bg-white/10 border-white/20"
                        } ${hobbies.length >= 3 && !isSelected ? "opacity-50" : ""}`}
                      >
                        <Text className="text-base">{hobby.emoji}</Text>
                        <Text className={`text-sm font-medium ${
                          isSelected ? "text-white" : "text-white/90"
                        }`}>
                          {hobby.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <Pressable
                onPress={() => setEditingField(editingField === 'hobbies' ? null : 'hobbies')}
                className="py-4 active:bg-white/5 rounded-lg"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                      <Text className="text-lg">🎯</Text>
                    </View>
                    <Text className="text-white text-base font-medium">Hobbies</Text>
                  </View>
                  <View className="flex-row items-center flex-shrink-0">
                    {hobbies.length > 0 ? (
                      <View className="flex-row flex-wrap gap-1.5 mr-2 items-center" style={{ maxWidth: 180 }}>
                        {hobbies.map((hobbyName) => {
                          const hobby = HOBBIES.find((h) => h.name === hobbyName);
                          return (
                            <View key={hobbyName} className="bg-[#B8860B]/30 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-[#B8860B]/50">
                              {hobby && <Text className="text-xs">{hobby.emoji}</Text>}
                              <Text className="text-white text-xs font-medium" numberOfLines={1}>{hobbyName}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text className="text-white/50 text-base mr-2 font-medium">Not set</Text>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                </View>
              </Pressable>
            )}
            {editingField === 'hobbies' && (
              <View className="flex-row gap-3 mt-6">
                <Pressable
                  className="flex-1 bg-white/10 px-4 py-3 rounded-xl border border-white/20 active:bg-white/15"
                  onPress={() => {
                    setEditingField(null);
                    loadProfile();
                  }}
                >
                  <Text className="text-white font-semibold text-center">Cancel</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                  onPress={async () => {
                    await handleSave();
                    setEditingField(null);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-center">Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Bio Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Bio</Text>
            </View>
            
            <Pressable
              onPress={() => setEditingField(editingField === 'bio' ? null : 'bio')}
              className="py-4 active:bg-white/5 rounded-lg"
            >
              {editingField === 'bio' ? (
                <View>
                  <TextInput
                    className="bg-white/10 border border-[#B8860B]/30 text-white p-4 rounded-xl h-32 focus:border-[#B8860B]"
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#9CA3AF"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    textAlignVertical="top"
                    style={{ fontSize: 16 }}
                    autoFocus
                  />
                  <View className="flex-row gap-3 mt-6">
                    <Pressable
                      className="flex-1 bg-white/10 px-4 py-3 rounded-xl border border-white/20 active:bg-white/15"
                      onPress={() => {
                        setEditingField(null);
                        loadProfile();
                      }}
                    >
                      <Text className="text-white font-semibold text-center">Cancel</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                      onPress={async () => {
                        await handleSave();
                        setEditingField(null);
                      }}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white font-semibold text-center">Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                      <Text className="text-lg">✍️</Text>
                    </View>
                    <Text className="text-white text-base font-medium">Bio</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-white/70 text-base mr-2" numberOfLines={1}>
                      {bio || "Not set"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                </View>
              )}
            </Pressable>
          </View>

          {/* Prompts Section */}
          <View className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/10 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="w-1 h-6 bg-[#B8860B] rounded-full mr-3" />
              <Text className="text-white text-xl font-bold">Prompts</Text>
            </View>
            
            {editingField === 'prompts' ? (
              <View>
                {prompts.map((prompt, index) => (
                  <View key={prompt.id} className="mb-4 pb-4 border-b border-white/10 last:border-0 last:pb-0">
                    <View className="mb-3">
                      <Text className="text-white/80 text-sm mb-2 font-medium">Prompt {index + 1}</Text>
                      <Pressable
                        onPress={() => setShowPromptDropdown(showPromptDropdown === index ? null : index)}
                        className="bg-white/10 border border-[#B8860B]/30 rounded-xl p-3 flex-row items-center justify-between"
                      >
                        <Text className="text-white flex-1" numberOfLines={1}>
                          {prompt.question || "Select a prompt..."}
                        </Text>
                        <Ionicons name={showPromptDropdown === index ? "chevron-up" : "chevron-down"} size={20} color="#B8860B" />
                      </Pressable>
                      {showPromptDropdown === index && (
                        <ScrollView className="max-h-48 mt-2 bg-white/5 rounded-xl border border-white/10">
                          {DEFAULT_PROMPTS.map((defaultPrompt) => (
                            <Pressable
                              key={defaultPrompt}
                              onPress={() => {
                                const newPrompts = [...prompts];
                                newPrompts[index].question = defaultPrompt;
                                setPrompts(newPrompts);
                                setShowPromptDropdown(null);
                              }}
                              className="px-4 py-3 border-b border-white/10 last:border-0 active:bg-white/10"
                            >
                              <Text className="text-white">{defaultPrompt}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                    <TextInput
                      className="bg-white/10 border border-[#B8860B]/30 text-white p-4 rounded-xl min-h-[80] focus:border-[#B8860B]"
                      placeholder="Your answer..."
                      placeholderTextColor="#9CA3AF"
                      value={prompt.answer}
                      onChangeText={(text) => {
                        const newPrompts = [...prompts];
                        newPrompts[index].answer = text;
                        setPrompts(newPrompts);
                      }}
                      multiline
                      textAlignVertical="top"
                      style={{ fontSize: 16 }}
                    />
                  </View>
                ))}
                <View className="flex-row gap-3 mt-6">
                  <Pressable
                    className="flex-1 bg-white/10 px-4 py-3 rounded-xl border border-white/20 active:bg-white/15"
                    onPress={() => {
                      setEditingField(null);
                      loadProfile();
                    }}
                  >
                    <Text className="text-white font-semibold text-center">Cancel</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-[#B8860B] px-4 py-3 rounded-xl active:bg-[#B8860B]/90"
                    onPress={async () => {
                      await handleSave();
                      setEditingField(null);
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-white font-semibold text-center">Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setEditingField(editingField === 'prompts' ? null : 'prompts')}
                className="py-4 active:bg-white/5 rounded-lg"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-[#B8860B]/20 items-center justify-center mr-3">
                      <Text className="text-lg">💬</Text>
                    </View>
                    <Text className="text-white text-base font-medium">Prompts</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-white/70 text-base mr-2">
                      {prompts.filter((p) => p.question && p.answer).length}/3
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#B8860B" />
                  </View>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

