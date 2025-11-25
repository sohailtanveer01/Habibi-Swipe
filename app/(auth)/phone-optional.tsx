import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function PhoneOptional() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const savePhone = async () => {
    if (!phone.trim()) {
      // Skip phone number
      router.push("/(auth)/onboarding/step1-basic");
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Please log in first.");
        return;
      }

      // Update user metadata with phone number
      const { error } = await supabase.auth.updateUser({
        data: { phone: phone.trim() },
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      router.push("/(auth)/onboarding/step1-basic");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save phone number.");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    router.push("/(auth)/onboarding/step1-basic");
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-2">Add Phone Number</Text>
      <Text className="text-white/70 mb-6">
        Add your phone number for better account security (optional)
      </Text>

      <TextInput
        placeholder="+1 555 555 5555"
        placeholderTextColor="#777"
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        onChangeText={setPhone}
        keyboardType="phone-pad"
        value={phone}
      />

      <Pressable
        className="bg-pink-500 p-4 rounded-2xl items-center mb-4"
        onPress={savePhone}
        disabled={loading}
      >
        <Text className="text-white font-semibold">
          {loading ? "Saving..." : "Continue"}
        </Text>
      </Pressable>

      <Pressable
        className="bg-white/10 p-4 rounded-2xl items-center"
        onPress={skip}
      >
        <Text className="text-white/80">Skip for now</Text>
      </Pressable>
    </View>
  );
}

