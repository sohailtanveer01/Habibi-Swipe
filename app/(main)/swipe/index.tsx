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

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

export default function SwipeScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const fetchFeed = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("get_swipe_feed", {
      body: { user_id: user.id, limit: 20 },
    });

    if (!error) setProfiles(data.profiles);
  };

  useEffect(() => { fetchFeed(); }, []);

  const onSwipe = async (action: "like" | "pass" | "superlike") => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const swipedUser = profiles[index];
    if (!swipedUser) return;

    await supabase.from("swipes").insert({
      swiper_id: user.id,
      swiped_id: swipedUser.id,
      action,
    });

    if (action !== "pass") {
      await supabase.functions.invoke("create_match", {
        body: { swiper_id: user.id, swiped_id: swipedUser.id, action },
      });
    }

    setIndex((i) => i + 1);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      const shouldLike = x.value > SWIPE_THRESHOLD;
      const shouldPass = x.value < -SWIPE_THRESHOLD;

      if (shouldLike) {
        x.value = withSpring(width * 1.5);
        runOnJS(onSwipe)("like");
      } else if (shouldPass) {
        x.value = withSpring(-width * 1.5);
        runOnJS(onSwipe)("pass");
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
        <Pressable className="mt-4 bg-pink-500 px-4 py-2 rounded-full" onPress={fetchFeed}>
          <Text className="text-white">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black px-4 pt-12">
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ width: "100%", height: height * 0.75 }, cardStyle]}>
          <SwipeCard profile={current} />
        </Animated.View>
      </GestureDetector>

      <View className="flex-row justify-around mt-6">
        <Pressable
          className="bg-white/10 w-16 h-16 rounded-full items-center justify-center"
          onPress={() => onSwipe("pass")}
        >
          <Text className="text-white text-xl">✕</Text>
        </Pressable>

        <Pressable
          className="bg-pink-500 w-20 h-20 rounded-full items-center justify-center"
          onPress={() => onSwipe("like")}
        >
          <Text className="text-white text-2xl">♥</Text>
        </Pressable>

        <Pressable
          className="bg-blue-500 w-16 h-16 rounded-full items-center justify-center"
          onPress={() => onSwipe("superlike")}
        >
          <Text className="text-white text-xl">★</Text>
        </Pressable>
      </View>
    </View>
  );
}

