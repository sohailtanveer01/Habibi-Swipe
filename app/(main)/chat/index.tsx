import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";

// Clean photo URLs
function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('localhost')) {
    const supabasePart = url.split(':http://localhost')[0];
    if (supabasePart && supabasePart.startsWith('http')) return supabasePart;
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return null;
}

export default function ChatListScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadMatches = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("matches")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      // Get the other user's profile and last message for each match
      const matchesWithProfiles = await Promise.all(
        data.map(async (match) => {
          const otherUserId = match.user1 === user.id ? match.user2 : match.user1;
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", otherUserId)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...match,
            otherUser: profile,
            lastMessage: lastMessage || null,
          };
        })
      );
      setMatches(matchesWithProfiles);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMatches();

    // Subscribe to new matches
    const channel = supabase
      .channel("matches-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        () => {
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-12 px-4">
      <Text className="text-gray-900 text-2xl font-bold mb-4">Chat</Text>

      {matches.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-base">No matches yet</Text>
          <Text className="text-gray-400 text-sm mt-2">Start swiping to find your Habibi! 💕</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const mainPhoto = item.otherUser?.photos && item.otherUser.photos.length > 0
              ? cleanPhotoUrl(item.otherUser.photos[0])
              : null;
            const fullName = item.otherUser?.first_name && item.otherUser?.last_name
              ? `${item.otherUser.first_name} ${item.otherUser.last_name}`
              : item.otherUser?.name || "Unknown";

            return (
              <Pressable
                className="bg-gray-50 p-4 rounded-2xl mb-3 flex-row items-center border border-gray-100"
                onPress={() => router.push(`/(main)/chat/${item.id}`)}
              >
                {mainPhoto ? (
                  <Image
                    source={{ uri: mainPhoto }}
                    className="w-16 h-16 rounded-full mr-4 border-2 border-pink-500"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-gray-200 mr-4 items-center justify-center border-2 border-pink-500">
                    <Text className="text-gray-500 text-2xl">👤</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-gray-900 text-lg font-semibold" numberOfLines={1}>
                    {fullName}
                  </Text>
                  {item.lastMessage ? (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                      {item.lastMessage.content}
                    </Text>
                  ) : (
                    <Text className="text-pink-500 text-sm mt-1 italic">
                      New match! Say salam 👋
                    </Text>
                  )}
                </View>
                {item.lastMessage && (
                  <Text className="text-gray-400 text-xs">
                    {new Date(item.lastMessage.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

