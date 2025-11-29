import { useEffect, useState } from "react";
import { View, Text, Dimensions, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import SwipeCard from "../../../components/SwipeCard";
import { supabase } from "../../../lib/supabase";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

export default function SwipeScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false); // prevents double swipe

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Fetch swipe feed
  const fetchFeed = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("get_swipe_feed", {
      body: { user_id: user.id, limit: 20 },
    });

    if (error) {
      console.error("Error fetching swipe feed:", error);
      alert(`Error loading profiles: ${error.message}`);
      return;
    }

    if (data?.profiles) {
      setProfiles(data.profiles);
      setIndex(0);
    } else {
      setProfiles([]);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Send swipe to server
  const sendSwipe = async (action: "like" | "pass" | "superlike") => {
    if (isSwiping) return;
    setIsSwiping(true);

    const currentProfile = profiles[index];
    if (!currentProfile) return;

    const { data, error } = await supabase.functions.invoke("send_swipe", {
      body: {
        swiped_id: currentProfile.id,
        action,
      },
    });

    if (error) {
      console.error("Swipe error:", error);
      setIsSwiping(false);
      return;
    }

    // If matched, you can trigger a popup
    if (data?.matched) {
      console.log("🎉 MATCHED with", currentProfile.name);
      // TODO: Show match modal
    }

    // Move to next card
    setIndex((i) => i + 1);
    setIsSwiping(false);
  };

  // Gesture handler
  const pan = Gesture.Pan()
    .onBegin(() => {
      if (isSwiping) return;
    })
    .onUpdate((e) => {
      if (isSwiping) return;
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      if (isSwiping) return;

      const shouldLike = x.value > SWIPE_THRESHOLD;
      const shouldPass = x.value < -SWIPE_THRESHOLD;

      if (shouldLike) {
        x.value = withSpring(width * 1.5);
        runOnJS(sendSwipe)("like");
      } else if (shouldPass) {
        x.value = withSpring(-width * 1.5);
        runOnJS(sendSwipe)("pass");
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotateZ: `${x.value / 20}deg` },
    ],
  }));

  const current = profiles[index];

  if (!current) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white/70">No more profiles nearby.</Text>
        <Pressable
          className="mt-4 bg-pink-500 px-4 py-2 rounded-full"
          onPress={fetchFeed}
        >
          <Text className="text-white">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ width: "100%", height: "100%" }, cardStyle]}
        >
          <SwipeCard profile={current} />

          {/* Action buttons overlaid well above bottom tab bar */}
          <View className="absolute bottom-40 left-0 right-0 flex-row items-center justify-center gap-24">
            {/* Pass */}
            <Pressable
              className="bg-white w-16 h-16 rounded-full items-center justify-center"
              onPress={() => sendSwipe("pass")}
              disabled={isSwiping}
            >
              <Text className="text-black text-2xl">✕</Text>
            </Pressable>

            {/* Like */}
            <Pressable
              className="bg-pink-500 w-16 h-16 rounded-full items-center justify-center"
              onPress={() => sendSwipe("like")}
              disabled={isSwiping}
            >
              <Text className="text-white text-2xl">♥</Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Legacy buttons container removed since buttons are now overlaid */}
      {/* <View className="flex-row justify-around mt-6">
        <Pressable
          className="bg-white/10 w-16 h-16 rounded-full items-center justify-center"
          onPress={() => sendSwipe("pass")}
          disabled={isSwiping}
        >
          <Text className="text-white text-xl">✕</Text>
        </Pressable>

        <Pressable
          className="bg-pink-500 w-20 h-20 rounded-full items-center justify-center"
          onPress={() => sendSwipe("like")}
          disabled={isSwiping}
        >
          <Text className="text-white text-2xl">♥</Text>
        </Pressable>

        <Pressable
          className="bg-blue-500 w-16 h-16 rounded-full items-center justify-center"
          onPress={() => sendSwipe("superlike")}
          disabled={isSwiping}
        >
          <Text className="text-white text-xl">★</Text>
        </Pressable>
      </View> */}
    </View>
  );
}