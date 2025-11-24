import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function MatchesScreen() {
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

    setMatches(data || []);
  };

  useEffect(() => { loadMatches(); }, []);

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-4">Matches</Text>

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Pressable
            className="bg-white/10 p-4 rounded-2xl mb-3"
            onPress={() => router.push(`/(main)/chat/${item.id}`)}
          >
            <Text className="text-white">Match #{item.id.slice(0,6)}</Text>
            <Text className="text-white/60 text-xs">
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
