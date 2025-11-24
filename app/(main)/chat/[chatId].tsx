import { useEffect, useState } from "react";
import { View, TextInput, FlatList, Text, Pressable } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useLocalSearchParams } from "expo-router";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", chatId)
      .order("created_at", { ascending: false });

    setMessages(data || []);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  const send = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !text.trim()) return;

    const res = await supabase.functions.invoke("send_message", {
      body: { match_id: chatId, sender_id: user.id, content: text.trim() },
    });

    if (res.error) alert(res.error.message || "Message failed");
    setText("");
  };

  return (
    <View className="flex-1 bg-black px-4 pt-12">
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View className="mb-2">
            <View className="bg-white/10 p-3 rounded-2xl max-w-[80%] self-start">
              <Text className="text-white">{item.content}</Text>
              <Text className="text-white/40 text-xs mt-1">
                {new Date(item.created_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}
      />

      <View className="flex-row items-center gap-2 pb-6">
        <TextInput
          className="flex-1 bg-white/10 text-white p-3 rounded-2xl"
          placeholder="Say salam..."
          placeholderTextColor="#777"
          value={text}
          onChangeText={setText}
        />
        <Pressable className="bg-pink-500 px-4 py-3 rounded-2xl" onPress={send}>
          <Text className="text-white font-semibold">Send</Text>
        </Pressable>
      </View>
    </View>
  );
}
