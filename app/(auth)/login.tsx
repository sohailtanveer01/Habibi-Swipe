import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loginWithEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/(main)/swipe");
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    setLoading(false);
    
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    
    router.push({ pathname: "/(auth)/otp", params: { phone: phone.trim() } });
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-pink-500 text-3xl font-bold mb-6">Log In</Text>

      {/* Login Method Toggle */}
      <View className="flex-row gap-2 mb-6">
        <Pressable
          className={`flex-1 p-3 rounded-2xl ${
            loginMethod === "email" ? "bg-pink-500" : "bg-white/10"
          }`}
          onPress={() => setLoginMethod("email")}
        >
          <Text className="text-white text-center font-semibold">Email</Text>
        </Pressable>
        <Pressable
          className={`flex-1 p-3 rounded-2xl ${
            loginMethod === "phone" ? "bg-pink-500" : "bg-white/10"
          }`}
          onPress={() => setLoginMethod("phone")}
        >
          <Text className="text-white text-center font-semibold">Phone</Text>
        </Pressable>
      </View>

      {loginMethod === "email" ? (
        <>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#777"
            className="bg-white/10 text-white p-4 rounded-2xl mb-4"
            onChangeText={setEmail}
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#777"
            className="bg-white/10 text-white p-4 rounded-2xl mb-4"
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          <Pressable
            className="bg-pink-500 p-4 rounded-2xl items-center mb-4"
            onPress={loginWithEmail}
            disabled={loading}
          >
            <Text className="text-white font-semibold">
              {loading ? "Logging in..." : "Log In"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
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
            onPress={sendOtp}
            disabled={loading}
          >
            <Text className="text-white font-semibold">
              {loading ? "Sending..." : "Send OTP"}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.push("/(auth)/signup")}>
        <Text className="text-white/70 text-center">
          Don&apos;t have an account? <Text className="text-pink-500">Sign Up</Text>
        </Text>
      </Pressable>
    </View>
  );
}
