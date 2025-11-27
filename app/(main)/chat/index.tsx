import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";

export default function ChatListScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const router = useRouter();

  const loadMatches = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data } = await supabase
      .from("matches")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      // Get the other user's profile for each match
      const matchesWithProfiles = await Promise.all(
        data.map(async (match) => {
          const otherUserId = match.user1 === user.id ? match.user2 : match.user1;
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", otherUserId)
            .single();

          return {
            ...match,
            otherUser: profile,
          };
        })
      );
      setMatches(matchesWithProfiles);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-4">Chat</Text>

      {matches.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/60 text-base">No matches yet</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <Pressable
              className="bg-white/10 p-4 rounded-2xl mb-3 flex-row items-center"
              onPress={() => router.push(`/(main)/chat/${item.id}`)}
            >
              {item.otherUser?.photos && item.otherUser.photos.length > 0 ? (
                <Image
                  source={{ uri: item.otherUser.photos[0] }}
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
                  {item.otherUser?.first_name && item.otherUser?.last_name
                    ? `${item.otherUser.first_name} ${item.otherUser.last_name}`
                    : item.otherUser?.name || "Unknown"}
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

