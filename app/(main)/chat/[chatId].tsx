import { useEffect, useState, useRef } from "react";
import { View, TextInput, FlatList, Text, Pressable, Image, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";

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

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const loadChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    // Get match info
    const { data: match } = await supabase
      .from("matches")
      .select("*")
      .eq("id", chatId)
      .single();

    if (match) {
      const otherUserId = match.user1 === user.id ? match.user2 : match.user1;
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", otherUserId)
        .single();
      setOtherUser(profile);
    }

    // Load messages
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", chatId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  useEffect(() => {
    loadChat();

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  const send = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !text.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          match_id: chatId,
          sender_id: user.id,
          content: text.trim(),
        });

      if (error) {
        alert(error.message || "Message failed");
      } else {
        setText("");
        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (e: any) {
      alert(e.message || "Message failed");
    } finally {
      setSending(false);
    }
  };

  const fullName = otherUser?.first_name && otherUser?.last_name
    ? `${otherUser.first_name} ${otherUser.last_name}`
    : otherUser?.name || "Unknown";

  const mainPhoto = otherUser?.photos && otherUser.photos.length > 0
    ? cleanPhotoUrl(otherUser.photos[0])
    : null;

  // Group messages by date for timestamps
  const groupedMessages = messages.length > 0 ? messages.reduce((acc: any[], msg: any, index: number) => {
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const msgDate = new Date(msg.created_at);
    const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
    
    // Add timestamp if it's a new day or first message
    if (!prevDate || msgDate.toDateString() !== prevDate.toDateString()) {
      acc.push({ type: 'timestamp', date: msgDate, id: `timestamp-${msg.id}` });
    }
    acc.push(msg);
    return acc;
  }, []) : [];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-3 flex-row items-center justify-between border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-gray-900 text-2xl font-semibold">←</Text>
        </Pressable>
        
        <View className="flex-1 flex-row items-center">
          {mainPhoto ? (
            <Image
              source={{ uri: mainPhoto }}
              className="w-10 h-10 rounded-full mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 items-center justify-center">
              <Text className="text-gray-500 text-lg">👤</Text>
            </View>
          )}
          <Text className="text-gray-900 text-lg font-semibold">{fullName}</Text>
        </View>

        <View className="flex-row items-center gap-4">
          <Pressable>
            <Text className="text-purple-600 text-xl">📞</Text>
          </Pressable>
          <Pressable>
            <Text className="text-purple-600 text-xl">⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Banner */}
      {showNotificationBanner && (
        <View className="bg-purple-50 px-4 py-3 flex-row items-center justify-between border-b border-purple-100">
          <View className="flex-row items-center flex-1">
            <View className="relative mr-3">
              <Text className="text-purple-600 text-lg">🔔</Text>
              <View className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold text-sm">Get notified instantly</Text>
              <Text className="text-gray-600 text-xs">Do not let any chances slip away</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => setShowNotificationBanner(false)}>
              <Text className="text-gray-400 text-lg">✕</Text>
            </Pressable>
            <Pressable className="bg-purple-600 px-3 py-1.5 rounded-full">
              <Text className="text-white text-xs font-semibold">Enable</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        keyExtractor={(item) => item.id || item.type === 'timestamp' ? item.id : `msg-${item.id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.type === 'timestamp') {
            return (
              <View className="items-center my-4">
                <Text className="text-gray-400 text-xs">
                  {item.date.toLocaleDateString([], { 
                    month: 'short', 
                    day: 'numeric',
                    year: item.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })}
                </Text>
              </View>
            );
          }

          const isMe = item.sender_id === currentUser?.id;
          const showProfilePic = !isMe && mainPhoto;
          
          return (
            <View className={`mb-2 flex-row ${isMe ? "justify-end" : "justify-start"} items-end`}>
              {!isMe && (
                <View className="mr-2 mb-1">
                  {showProfilePic ? (
                    <Image
                      source={{ uri: mainPhoto! }}
                      className="w-8 h-8 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                      <Text className="text-gray-400 text-xs">👤</Text>
                    </View>
                  )}
                </View>
              )}
              
              <View className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <View
                  className={`px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? "bg-purple-600 rounded-br-sm"
                      : "bg-gray-100 rounded-bl-sm"
                  }`}
                >
                  <Text
                    className={`text-base ${
                      isMe ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.content}
                  </Text>
                </View>
                
                {/* Unread label for sent messages */}
                {isMe && (
                  <Text className="text-gray-400 text-xs mt-1 mr-1">
                    Unread
                  </Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-gray-100 px-4 py-3 rounded-2xl mb-4">
              <Text className="text-gray-600 text-sm text-center">
                Start the chat with {fullName}
              </Text>
            </View>
          </View>
        }
      />

      {/* Input */}
      <View className="bg-white border-t border-gray-200 px-4 py-2 flex-row items-center" style={{ paddingBottom: Platform.OS === "ios" ? 20 : 10 }}>
        <TextInput
          className="flex-1 bg-gray-100 text-gray-900 px-4 py-3 rounded-full"
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          style={{ maxHeight: 100 }}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        {text.trim() ? (
          <Pressable onPress={send} disabled={sending} className="ml-3">
            <View className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center">
              <Text className="text-white text-lg">✓</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
