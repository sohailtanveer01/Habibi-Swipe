import { View, Text, TextInput, Pressable, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

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

  // Height input state
  const [heightUnit, setHeightUnit] = useState<"ft" | "cm">("ft");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [centimeters, setCentimeters] = useState("");

  // Parse existing height value
  useEffect(() => {
    if (height) {
      const cmMatch = height.match(/(\d+)\s*cm/i);
      const ftMatch = height.match(/(\d+)'(\d+)/);
      
      if (cmMatch) {
        setHeightUnit("cm");
        setCentimeters(cmMatch[1]);
      } else if (ftMatch) {
        setHeightUnit("ft");
        setFeet(ftMatch[1]);
        setInches(ftMatch[2]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update height string when values change
  useEffect(() => {
    if (heightUnit === "ft" && feet && inches) {
      setHeight(`${feet}'${inches}"`);
    } else if (heightUnit === "cm" && centimeters) {
      setHeight(`${centimeters} cm`);
    }
  }, [feet, inches, centimeters, heightUnit]);

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

  const next = () => {
    const heightValid = heightUnit === "ft" 
      ? (feet.trim() && inches.trim())
      : centimeters.trim();
    
    if (!firstName.trim() || !lastName.trim() || !gender || !heightValid || !maritalStatus || hasChildren === null) {
      alert("Please fill all fields.");
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
    router.push("/onboarding/step2-Marriage_Intent");
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
            You are in !!
          </Text>
          <Text className="text-white/80 text-xl font-medium">
            Let&apos;s get to know you
          </Text>
        </View>

        {/* Name Fields Section */}
        <View className="mb-8">
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
             
              <TextInput
                className="bg-white/10 text-white p-4 rounded-2xl border border-white/5"
                placeholder="First Name"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                style={{ fontSize: 16 }}
              />
            </View>
            <View className="flex-1">
             
              <TextInput
                className="bg-white/10 text-white p-4 rounded-2xl border border-white/5"
                placeholder="Last Name"
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                style={{ fontSize: 16 }}
              />
            </View>
          </View>
        </View>

        {/* Gender Section */}
        <View className="mb-8">
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
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Date of Birth
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="bg-white/10 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-white text-lg">
              {formatDateForDisplay(dob)}
            </Text>
          </Pressable>
          {showDatePicker && (
            <View className="mt-4">
              {Platform.OS === "ios" ? (
                <View className="bg-white/10 rounded-2xl border border-white/5 p-4">
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
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Height
          </Text>
          
          {/* Unit Selector */}
          <View className="flex-row gap-3 mb-4">
            <Pressable
              onPress={() => setHeightUnit("ft")}
              className={`flex-1 px-4 py-3 rounded-2xl border ${
                heightUnit === "ft"
                  ? "bg-[#B8860B] border-[#B8860B]"
                  : "bg-white/10 border-white/20"
              }`}
            >
              <Text className={`text-center font-semibold ${
                heightUnit === "ft" ? "text-white" : "text-white/90"
              }`}>
                Feet & Inches
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setHeightUnit("cm")}
              className={`flex-1 px-4 py-3 rounded-2xl border ${
                heightUnit === "cm"
                  ? "bg-[#B8860B] border-[#B8860B]"
                  : "bg-white/10 border-white/20"
              }`}
            >
              <Text className={`text-center font-semibold ${
                heightUnit === "cm" ? "text-white" : "text-white/90"
              }`}>
                Centimeters
              </Text>
            </Pressable>
          </View>

          {/* Height Inputs */}
          {heightUnit === "ft" ? (
            <View className="flex-row gap-3 items-end">
              <View className="flex-1">
                <TextInput
                  className="bg-white/10 text-white p-4 rounded-2xl border border-white/5 text-center"
                  placeholder="5"
                  placeholderTextColor="#999"
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                  style={{ fontSize: 18, fontWeight: "600" }}
                />
                <Text className="text-white/70 text-center mt-2 text-sm">Feet</Text>
              </View>
              <Text className="text-white/70 text-3xl font-bold mb-2">&apos;</Text>
              <View className="flex-1">
                <TextInput
                  className="bg-white/10 text-white p-4 rounded-2xl border border-white/5 text-center"
                  placeholder="10"
                  placeholderTextColor="#999"
                  value={inches}
                  onChangeText={setInches}
                  keyboardType="number-pad"
                  style={{ fontSize: 18, fontWeight: "600" }}
                />
                <Text className="text-white/70 text-center mt-2 text-sm">Inches</Text>
              </View>
              <Text className="text-white/70 text-3xl font-bold mb-2">&quot;</Text>
            </View>
          ) : (
            <View>
              <TextInput
                className="bg-white/10 text-white p-4 rounded-2xl border border-white/5 text-center"
                placeholder="178"
                placeholderTextColor="#999"
                value={centimeters}
                onChangeText={setCentimeters}
                keyboardType="number-pad"
                style={{ fontSize: 18, fontWeight: "600" }}
              />
              <Text className="text-white/70 text-center mt-2 text-sm">Centimeters</Text>
            </View>
          )}
        </View>

        {/* Marital Status Section */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm font-medium mb-3 ml-1">
            Marital Status
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            {["single", "divorced", "widowed", "separated"].map((status) => (
              <Pressable
                key={status}
                onPress={() => setMaritalStatus(status)}
                className={`px-5 py-3 rounded-full border ${
                  maritalStatus === status 
                    ? "bg-[#B8860B] border-[#B8860B]" 
                    : "bg-white/10 border-white/20"
                }`}
              >
                <Text className={`text-center capitalize font-medium ${
                  maritalStatus === status ? "text-white" : "text-white/90"
                }`}>
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Children Section */}
        <View className="mb-10">
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
                    : "bg-white/10 border-white/20"
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

        {/* Next Button */}
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
