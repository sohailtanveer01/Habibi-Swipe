import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function OTP() {
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const router = useRouter();

  const verify = async () => {
    const { error } = await supabase.auth.verifyOtp({
      phone: phone as string,
      token: code,
      type: "sms",
    });
    if (error) return alert(error.message);
    router.replace("/(auth)/onboarding");
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-white text-xl mb-2">Enter OTP</Text>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4 text-lg tracking-widest"
        placeholder="123456"
        placeholderTextColor="#777"
        onChangeText={setCode}
        keyboardType="number-pad"
        value={code}
      />

      <Pressable className="bg-pink-500 p-4 rounded-2xl items-center" onPress={verify}>
        <Text className="text-white font-semibold">Verify</Text>
      </Pressable>
    </View>
  );
}
