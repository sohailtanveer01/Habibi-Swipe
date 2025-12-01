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
    try {
      setGoogleLoading(true);

      // Use Supabase OAuth for Google Sign-In
      // The redirectTo is your app's deep link scheme
      // Supabase will use its callback URL when talking to Google
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "habibiswipe://",
          // The actual redirect URI sent to Google will be: ${supabaseUrl}/auth/v1/callback
          // Make sure this URL is added to Google OAuth authorized redirect URIs
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in browser
        await Linking.openURL(data.url);
        Alert.alert(
          "Continue in Browser",
          "Please complete the sign-in process in your browser, then return to the app."
        );
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in with Google";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Redirect URI mismatch. Please add this URL to Google OAuth settings:\n\n${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback\n\nAlso add it to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-[#B8860B] text-3xl font-bold mb-2">Create Account</Text>
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
        className="bg-[#B8860B] p-4 rounded-2xl items-center mb-4"
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

      {/* <Pressable
        className="bg-white p-4 rounded-2xl items-center mb-6 flex-row justify-center gap-2"
        onPress={continueWithGoogle}
        disabled={googleLoading}
      >
        <Text className="text-2xl">🔍</Text>
        <Text className="text-gray-900 font-semibold text-base">
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </Text>
      </Pressable> */}

      <Pressable onPress={() => router.push("/(auth)/login")}>
        <Text className="text-white/70 text-center">
          Already have an account? <Text className="text-[#B8860B]">Log In</Text>
        </Text>
      </Pressable>
    </View>
  );
}

