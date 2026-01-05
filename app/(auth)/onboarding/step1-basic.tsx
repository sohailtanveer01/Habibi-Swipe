import { View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const TOTAL_STEPS = 8;
const CURRENT_STEP = 1;

export default function Step1Basic() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [gender, setGender] = useState(data.gender);
  // Initialize DOB from data or default to 25 years ago
  const getInitialDob = () => {
    if (data.dob) {
      const parsed = new Date(data.dob);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    // Default to 25 years ago
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  };
  const [dob, setDob] = useState(getInitialDob());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [height, setHeight] = useState(data.height);
  const [maritalStatus, setMaritalStatus] = useState(data.maritalStatus);
  const [hasChildren, setHasChildren] = useState<boolean | null>(data.hasChildren);
  const [showMaritalStatusDropdown, setShowMaritalStatusDropdown] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Height input state
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");

  // Parse existing height value
  useEffect(() => {
    if (height) {
      const ftMatch = height.match(/(\d+)'(\d+)/);
      if (ftMatch) {
        setFeet(ftMatch[1]);
        setInches(ftMatch[2]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   // If user switches to male, "widowed" should not be selectable.
  // Also clear it if it was previously selected.
  useEffect(() => {
    if (gender === "male" && maritalStatus === "widowed") {
      setMaritalStatus("");
      setShowMaritalStatusDropdown(false);
    }
  }, [gender, maritalStatus]);

  // Update height string when values change
  useEffect(() => {
    if (feet && inches) {
      setHeight(`${feet}'${inches}"`);
    }
  }, [feet, inches]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selectedDate) {
        setDob(selectedDate);
      }
    } else {
      // iOS
      if (selectedDate) {
        setDob(selectedDate);
      }
    }
  };

  const validateInputs = (): string | null => {
    // Validate first name
    const trimmedFirstName = firstName.trim();
    if (!trimmedFirstName) {
      return "First name is required.";
    }
    if (trimmedFirstName.length < 2) {
      return "First name must be at least 2 characters.";
    }
    if (trimmedFirstName.length > 50) {
      return "First name must be less than 50 characters.";
    }
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedFirstName)) {
      return "First name can only contain letters, spaces, hyphens, and apostrophes.";
    }

    // Validate last name
    const trimmedLastName = lastName.trim();
    if (!trimmedLastName) {
      return "Last name is required.";
    }
    if (trimmedLastName.length < 2) {
      return "Last name must be at least 2 characters.";
    }
    if (trimmedLastName.length > 50) {
      return "Last name must be less than 50 characters.";
    }
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedLastName)) {
      return "Last name can only contain letters, spaces, hyphens, and apostrophes.";
    }

    // Validate gender
    if (!gender) {
      return "Please select your gender.";
    }

    // Validate date of birth
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    if (actualAge < 18) {
      return "You must be at least 18 years old to use this app.";
    }
    if (actualAge > 120) {
      return "Please enter a valid date of birth.";
    }
    if (dob > today) {
      return "Date of birth cannot be in the future.";
    }

    // Validate height
    if (!feet || !inches) {
      return "Please enter your height.";
    }
    const feetNum = parseInt(feet, 10);
    const inchesNum = parseInt(inches, 10);
    
    if (isNaN(feetNum) || isNaN(inchesNum)) {
      return "Please enter valid height values.";
    }
    if (feetNum < 4 || feetNum > 7) {
      return "Height must be between 4 and 7 feet.";
    }
    if (inchesNum < 0 || inchesNum > 11) {
      return "Inches must be between 0 and 11.";
    }

    // Validate marital status
    if (!maritalStatus) {
      return "Please select your marital status.";
    }

    // Validate has children
    if (hasChildren === null) {
      return "Please indicate whether you have children.";
    }

    return null;
  };

  const next = () => {
    const validationError = validateInputs();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    setData((d) => ({ 
      ...d, 
      firstName: firstName.trim(), 
      lastName: lastName.trim(),
      gender,
      dob: formatDateForDB(dob),
      height: height.trim(),
      maritalStatus,
      hasChildren,
    }));
    router.push("/onboarding/step2-Religiosity");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: keyboardVisible ? 20 : 120 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-6 pb-8">
          {/* Header Section */}
          <View className="mb-8">
            <Text className="text-white text-4xl font-bold mb-3 leading-tight">
              You are in !!
            </Text>
            <Text className="text-white/80 text-xl font-medium">
              Let&apos;s get to know you
            </Text>
          </View>

          {/* Name Fields Section */}
          <View className="mb-6">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  className="bg-white/5 text-white p-4 rounded-2xl border border-[#eebd2b]/40"
                  placeholder="First Name"
                  placeholderTextColor="#999"
                  value={firstName}
                  onChangeText={(text) => {
                    // Limit to 50 characters and allow letters, spaces, hyphens, apostrophes
                    const cleaned = text.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 50);
                    setFirstName(cleaned);
                  }}
                  autoCapitalize="words"
                  maxLength={50}
                  style={{ fontSize: 16 }}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  className="bg-white/5 text-white p-4 rounded-2xl border border-[#eebd2b]/40"
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                  value={lastName}
                  onChangeText={(text) => {
                    // Limit to 50 characters and allow letters, spaces, hyphens, apostrophes
                    const cleaned = text.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 50);
                    setLastName(cleaned);
                  }}
                  autoCapitalize="words"
                  maxLength={50}
                  style={{ fontSize: 16 }}
                />
              </View>
            </View>
          </View>

          {/* Gender Section */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Gender
            </Text>
            <View className="flex-row gap-3">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  className={`flex-1 px-4 py-4 rounded-2xl border ${
                    gender === option.value 
                      ? "bg-[#B8860B] border-[#B8860B]" 
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  <Text className={`text-center font-semibold text-lg ${
                    gender === option.value ? "text-white" : "text-white/90"
                  }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date of Birth Section */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Date of Birth
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-white/5 p-4 rounded-2xl border border-[#eebd2b]/30"
            >
              <Text className="text-white text-lg">
                {formatDateForDisplay(dob)}
              </Text>
            </Pressable>
            {showDatePicker && (
              <View className="mt-4">
                {Platform.OS === "ios" ? (
                  <View className="bg-white/5 rounded-2xl border border-[#eebd2b]/30 p-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-lg font-semibold">Select Date</Text>
                      <Pressable onPress={() => setShowDatePicker(false)}>
                        <Text className="text-[#B8860B] text-lg font-semibold">Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={dob}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1950, 0, 1)}
                      textColor="#ffffff"
                    />
                  </View>
                ) : (
                  <DateTimePicker
                    value={dob}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                  />
                )}
              </View>
            )}
          </View>

          {/* Height Field */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Height
            </Text>
            <View className="flex-row gap-3 items-end">
              <View className="flex-1">
                <TextInput
                  className="bg-white/5 text-white p-4 rounded-2xl border border-[#eebd2b]/40 text-center"
                  // placeholder="5"
                  placeholderTextColor="#999"
                  value={feet}
                  onChangeText={(text) => {
                    // Only allow digits, max 1 digit (4-7)
                    const numericValue = text.replace(/[^0-9]/g, '');
                    if (numericValue === '' || (parseInt(numericValue, 10) >= 4 && parseInt(numericValue, 10) <= 7)) {
                      setFeet(numericValue);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={{ fontSize: 18, fontWeight: "600" }}
                />
                <Text className="text-white/70 text-center mt-2 text-sm">Feet</Text>
              </View>
              <Text className="text-white/70 text-3xl font-bold mb-2">&apos;</Text>
              <View className="flex-1">
                <TextInput
                  className="bg-white/5 text-white p-4 rounded-2xl border border-[#eebd2b]/40 text-center"
                  // placeholder="10"
                  placeholderTextColor="#999"
                  value={inches}
                  onChangeText={(text) => {
                    // Only allow digits, max 2 digits (0-11)
                    const numericValue = text.replace(/[^0-9]/g, '');
                    if (numericValue === '' || parseInt(numericValue, 10) <= 11) {
                      setInches(numericValue);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ fontSize: 18, fontWeight: "600" }}
                />
                <Text className="text-white/70 text-center mt-2 text-sm">Inches</Text>
              </View>
              <Text className="text-white/70 text-3xl font-bold mb-2">&quot;</Text>
            </View>
          </View>

          {/* Marital Status Section */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Marital Status
            </Text>
            <Pressable
              onPress={() => setShowMaritalStatusDropdown(!showMaritalStatusDropdown)}
              className="bg-white/5 p-4 rounded-2xl border border-[#eebd2b]/30"
            >
              <Text className="text-white text-lg">
                {maritalStatus ? maritalStatus.charAt(0).toUpperCase() + maritalStatus.slice(1) : "Select marital status"}
              </Text>
            </Pressable>
            {showMaritalStatusDropdown && (
              <View className="bg-white/5 rounded-2xl border border-[#eebd2b]/30 mt-2 overflow-hidden">
                {(gender === "male"
                  ? ["single", "divorced", "separated"]
                  : ["single", "divorced", "widowed", "separated"]
                ).map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setMaritalStatus(status);
                      setShowMaritalStatusDropdown(false);
                    }}
                    className={`p-4 border-b border-white/5 ${
                      maritalStatus === status ? "bg-[#B8860B]/20" : ""
                    }`}
                  >
                    <Text className="text-white text-lg capitalize">{status}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Children Section */}
          <View className="mb-6">
            <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
              Do you have children?
            </Text>
            <View className="flex-row gap-3">
              {[
                { value: true, label: "Yes" },
                { value: false, label: "No" },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => setHasChildren(option.value)}
                  className={`flex-1 px-4 py-4 rounded-2xl border ${
                    hasChildren === option.value 
                      ? "bg-[#B8860B] border-[#B8860B]" 
                      : "bg-white/5 border-[#eebd2b]/20"
                  }`}
                >
                  <Text className={`text-center font-semibold text-lg ${
                    hasChildren === option.value ? "text-white" : "text-white/90"
                  }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Next Button */}
      {!keyboardVisible && (
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
      )}
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}
