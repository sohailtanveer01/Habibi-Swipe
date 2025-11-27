import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";

export default function LikesScreen() {
  const [likes, setLikes] = useState<any[]>([]);
  const router = useRouter();

  const loadLikes = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Get users who liked the current user
    const { data } = await supabase
      .from("swipes")
      .select("*, swiper:users!swipes_swiper_id_fkey(*)")
      .eq("swiped_id", user.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    if (data) {
      // Extract user profiles from the swipes
      const likedUsers = data.map((swipe: any) => ({
        ...swipe.swiper,
        swipe_id: swipe.id,
        created_at: swipe.created_at,
      }));
      setLikes(likedUsers);
    }
  };

  useEffect(() => {
    loadLikes();
  }, []);

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-4">Likes</Text>

      {likes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/60 text-base">No likes yet</Text>
        </View>
      ) : (
        <FlatList
          data={likes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              className="bg-white/10 p-4 rounded-2xl mb-3 flex-row items-center"
            >
              {item.photos && item.photos.length > 0 ? (
                <Image
                  source={{ uri: item.photos[0] }}
                  className="w-16 h-16 rounded-full mr-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white/20 mr-4 items-center justify-center">
                  <Text className="text-white text-2xl">👤</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">
                  {item.first_name && item.last_name
                    ? `${item.first_name} ${item.last_name}`
                    : item.name || "Unknown"}
                </Text>
                <Text className="text-white/60 text-xs">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

