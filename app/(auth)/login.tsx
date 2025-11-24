import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (!error) router.push({ pathname: "/(auth)/otp", params: { phone } });
    else alert(error.message);
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-pink-500 text-3xl font-bold mb-6">Habibi Swipe</Text>

      <TextInput
        placeholder="+1 555 555 5555"
        placeholderTextColor="#777"
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        onChangeText={setPhone}
        keyboardType="phone-pad"
        value={phone}
      />

      <Pressable
        className="bg-pink-500 p-4 rounded-2xl items-center"
        onPress={sendOtp}
        disabled={loading}
      >
        <Text className="text-white font-semibold">
          {loading ? "Sending..." : "Send Otp"}
        </Text>
      </Pressable>
    </View>
  );
}
