import { View, Text, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";

export default function Home() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session) {
        // user already logged in → go to swipe page
        setHasSession(true);
      }

      setCheckingSession(false);
    };

    checkSession();
  }, []);

  if (checkingSession) return null;

  if (hasSession) {
    return <Redirect href="/swipe" />;
  }

  return (
    <View className="flex-1 bg-black justify-end px-6 pb-20">
      {/* Logo at top center */}
      <View className="absolute top-20 left-0 right-0 items-center">
        <Logo variant="colored" width={180} />
      </View>

      {/* Create Account Button */}
      <Pressable
        className="bg-[#B8860B] p-4 rounded-2xl mb-4 items-center"
        onPress={() => router.push("/(auth)/signup")}
      >
        <Text className="text-white text-lg font-semibold">
          Create Account
        </Text>
      </Pressable>

      {/* Login Button */}
      <Pressable
        className="bg-white/20 p-4 rounded-2xl items-center border border-white/30"
        onPress={() => router.push("/login")}
      >
        <Text className="text-white text-lg font-semibold">
          Log In
        </Text>
      </Pressable>
    </View>
  );
}
