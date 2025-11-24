import { ImageBackground, View, Text, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
    <ImageBackground
      source={{ uri: "https://i.imgur.com/mtbl1qF.jpeg" }} // replace with your own bg image
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View className="flex-1 bg-black/50 justify-end px-6 pb-20">

        {/* Title */}
        <Text className="text-4xl font-bold text-white mb-10">
          Habibi Swipe
        </Text>

        {/* Create Account Button */}
        <Pressable
          className="bg-pink-500 p-4 rounded-2xl mb-4 items-center"
          onPress={() => router.push("/onboarding/step1-basic")}
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
    </ImageBackground>
  );
}
