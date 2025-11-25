import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Linking } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const continueWithEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setEmailLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.push({ pathname: "/(auth)/email-otp", params: { email: trimmed } });
  };

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "habibiswipe://phone-link",
      },
    });
    setGoogleLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    if (data?.url) {
      await Linking.openURL(data.url);
    } else {
      Alert.alert("Check your browser", "Continue in the browser to finish signing in.");
    }
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-pink-500 text-3xl font-bold mb-2">Create Account</Text>
      <Text className="text-white/70 mb-6">Sign up to find your Habibi</Text>

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

      <Pressable
        className="bg-pink-500 p-4 rounded-2xl items-center mb-4"
        onPress={continueWithEmail}
        disabled={emailLoading}
      >
        <Text className="text-white font-semibold">
          {emailLoading ? "Sending code..." : "Continue with Email"}
        </Text>
      </Pressable>

      <Text className="text-white/50 text-center mb-4 text-sm">
        We&apos;ll send a 6-digit code to verify your email.
      </Text>

      <Pressable
        className="bg-white/10 p-4 rounded-2xl items-center mb-6 border border-white/20"
        onPress={continueWithGoogle}
        disabled={googleLoading}
      >
        <Text className="text-white font-semibold">
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/login")}>
        <Text className="text-white/70 text-center">
          Already have an account? <Text className="text-pink-500">Log In</Text>
        </Text>
      </Pressable>
    </View>
  );
}

