import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function EmailOTP() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const emailAddress = (email as string) || "";

  useEffect(() => {
    if (!emailAddress) {
      Alert.alert("Error", "Missing email address. Please start again.", [
        { text: "OK", onPress: () => router.replace("/(auth)/signup") },
      ]);
    }
  }, [emailAddress, router]);

  const verify = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }

    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: emailAddress,
      token: code.trim(),
      type: "email",
    });
    setVerifying(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.name && profile.photos?.length > 0) {
        // User has completed onboarding - go to main app
        router.replace("/(main)/swipe");
      } else {
        // User needs to complete onboarding (new signup)
        router.replace("/(auth)/phone-optional");
      }
    } else {
      router.replace("/(auth)/phone-optional");
    }
  };

  const resend = async () => {
    setResending(true);
    // Resend OTP - allow user creation in case it's a signup flow
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: true },
    });
    setResending(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Sent", "We sent you another code.");
    }
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-2">Check your email</Text>
      <Text className="text-white/70 mb-6">
        Enter the 6-digit code we sent to{" "}
        <Text className="text-[#B8860B]">{emailAddress}</Text>
      </Text>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4 text-lg tracking-widest text-center"
        placeholder="123456"
        placeholderTextColor="#777"
        onChangeText={setCode}
        keyboardType="number-pad"
        value={code}
        maxLength={6}
      />

      <Pressable
        className="bg-[#B8860B] p-4 rounded-2xl items-center mb-4"
        onPress={verify}
        disabled={verifying}
      >
        <Text className="text-white font-semibold">
          {verifying ? "Verifying..." : "Verify & Continue"}
        </Text>
      </Pressable>

      <Pressable
        className="bg-white/10 p-4 rounded-2xl items-center"
        onPress={resend}
        disabled={resending}
      >
        <Text className="text-white/80">
          {resending ? "Sending..." : "Resend Code"}
        </Text>
      </Pressable>
    </View>
  );
}

