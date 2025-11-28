import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";

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
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const router = useRouter();

  const loadMatches = async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // Call the Edge Function to get chat list with unread counts
      const { data, error } = await supabase.functions.invoke("get-chat-list");

      if (error) {
        console.error("Error loading chat list:", error);
        alert(`Error loading chats: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data && data.matches) {
        // Log unread counts for debugging
        console.log("Chat list loaded with unread counts:", 
          data.matches.map((m: any) => ({ 
            matchId: m.id, 
            unreadCount: m.unreadCount,
            otherUser: m.otherUser?.name || m.otherUser?.first_name 
          }))
        );
        setMatches(data.matches);
      } else {
        setMatches([]);
      }
    } catch (e: any) {
      console.error("Error in loadMatches:", e);
      alert(`Error loading chats: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();

    // Subscribe to new matches and message updates
    const channel = supabase
      .channel("chat-list-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        () => {
          loadMatches();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          loadMatches();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "messages",
          filter: "read=eq.true"
        },
        () => {
          // When messages are marked as read, refresh the list
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Refresh when screen comes into focus (e.g., when returning from chat detail)
  useFocusEffect(
    useCallback(() => {
      // Refresh immediately and also after a delay to catch any delayed updates
      loadMatches();
      const timer = setTimeout(() => {
        loadMatches();
      }, 500);
      return () => clearTimeout(timer);
    }, [])
  );

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-12">
      <View className="px-4 mb-4">
        <Text className="text-gray-900 text-2xl font-bold">Chats</Text>
      </View>

      {/* Notification Banner */}
      {showNotificationBanner && (
        <View className="mx-4 mb-4 bg-pink-500 rounded-2xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Text className="text-white text-xl mr-3">🔔</Text>
            <Text className="text-white text-sm font-medium flex-1">
              Get notified when someone great messages you
            </Text>
          </View>
          <Pressable onPress={() => setShowNotificationBanner(false)}>
            <Text className="text-white text-lg ml-2">→</Text>
          </Pressable>
        </View>
      )}

      <View className="flex-1 px-4">

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
            
            // Ensure unreadCount is a number
            const unreadCount = typeof item.unreadCount === 'number' ? item.unreadCount : 0;
            const hasUnread = unreadCount > 0;

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
                  <View className="flex-row items-center gap-2">
                    <Text 
                      className={`text-lg ${hasUnread ? 'font-bold' : 'font-semibold'}`}
                      style={{ color: '#111827' }}
                      numberOfLines={1}
                    >
                      {fullName}
                    </Text>
                    {hasUnread && (
                      <View className="bg-pink-500 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.lastMessage ? (
                    <Text 
                      className={`text-sm mt-1 ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                      numberOfLines={1}
                    >
                      {item.lastMessage.content}
                    </Text>
                  ) : (
                    <Text className="text-pink-500 text-sm mt-1 italic">
                      New match! Say salam 👋
                    </Text>
                  )}
                </View>
                <View className="items-end">
                  {item.lastMessage && (
                    <Text className="text-gray-400 text-xs mb-1">
                      {new Date(item.lastMessage.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      </View>
    </View>
  );
}

