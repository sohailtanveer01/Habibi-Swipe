import { useEffect, useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, RefreshControl } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isUserActive } from "../../../lib/useActiveStatus";
import Logo from "../../../components/Logo";
import DiamondIcon from "../../../components/DiamondIcon";

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
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch chat list with React Query (cached)
  const { data: chatListData, isLoading, error, refetch } = useQuery({
    queryKey: ["chat-list"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-chat-list");

      if (error) throw error;
      
      if (data && data.matches) {
        // Log unread counts and active status for debugging
        console.log("Chat list loaded:", 
          data.matches.map((m: any) => ({ 
            matchId: m.id, 
            unreadCount: m.unreadCount,
            otherUser: m.otherUser?.name || m.otherUser?.first_name,
            otherUserLastActive: m.otherUser?.last_active_at,
            isOtherUserActive: isUserActive(m.otherUser?.last_active_at),
            isCompliment: m.isCompliment,
            complimentId: m.complimentId,
          }))
        );
        
        // Log compliments specifically
        const compliments = data.matches.filter((m: any) => m.isCompliment);
        if (compliments.length > 0) {
          console.log("💬 Compliments in chat list:", compliments.length, compliments);
        } else {
          console.log("ℹ️ No compliments found in chat list response");
        }
        
        return data.matches;
      }
      return [];
    },
    staleTime: 1000 * 60 * 1, // 1 minute - cache is fresh for 1 min
    gcTime: 1000 * 60 * 15, // 15 minutes - cache persists for 15 min
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
  });

  const matches = chatListData || [];

  // Real-time subscription for matches, messages, and user activity
  useEffect(() => {
    let userId: string | null = null;
    
    // Get user ID first
    supabase.auth.getUser().then(({ data: { user } }) => {
      userId = user?.id || null;
    });

    const channel = supabase
      .channel("chat-list-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        () => {
          // Invalidate cache to refetch chat list
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Invalidate cache to refetch chat list (for last message updates)
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "messages"
        },
        (payload) => {
          // When messages are updated (especially when marked as read), refresh the list
          // Check if read status changed from false to true
          if (payload.new.read === true && payload.old?.read === false) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          // When a matched user's last_active_at is updated, refresh the chat list
          // to update active status indicators
          if (payload.new.last_active_at !== payload.old?.last_active_at) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "compliments"
        },
        (payload) => {
          console.log("🔔 Real-time: New compliment inserted:", payload);
          console.log("🔔 Compliment recipient_id:", payload.new?.recipient_id);
          // Invalidate cache when a new compliment is inserted
          // RLS will ensure only relevant compliments are shown
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "compliments"
        },
        (payload) => {
          console.log("🔔 Real-time: Compliment updated:", payload);
          // Invalidate cache when compliment status changes (accepted/declined)
          // This will refresh the list to remove accepted compliments and show match instead
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
        }
      )
      .subscribe((status) => {
        console.log("📡 Real-time subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Refresh when screen comes into focus (e.g., when returning from chat detail)
  useFocusEffect(
    useCallback(() => {
      // Refetch chat list when screen comes into focus
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
    }, [queryClient])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading chats: {error.message}
        </Text>
        <Pressable 
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black pt-12">
      <View className="px-4 mb-4 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Chats</Text>
        <Pressable
          onPress={() => router.push("/(main)/chat/unmatches")}
          className="px-4 py-2 bg-white/10 rounded-full border border-[#B8860B]/30"
        >
          <Text className="text-[#B8860B] text-sm font-semibold">Unmatches</Text>
        </Pressable>
      </View>

      {/* Notification Banner */}
      {showNotificationBanner && (
        <View className="mx-4 mb-4 bg-[#B8860B] rounded-2xl px-4 py-3 flex-row items-center justify-between">
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
          <View className="mb-6">
            <Logo variant="colored" width={120} />
          </View>
          <Text className="text-white/60 text-base">No matches yet</Text>
          <Text className="text-white/50 text-sm mt-2">Start swiping to find your Habibi! 💕</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refetch()}
              tintColor="#B8860B"
            />
          }
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
            
            // Check if OTHER USER is active (not current user)
            const otherUserLastActive = item.otherUser?.last_active_at;
            const isOtherUserActive = isUserActive(otherUserLastActive);
            
            // Debug: Log active status for each user
            if (__DEV__) {
              console.log("👤 User active check:", {
                userName: fullName,
                lastActive: otherUserLastActive,
                isActive: isOtherUserActive,
              });
            }

            return (
              <Pressable
                className="bg-white/10 p-4 rounded-2xl mb-3 flex-row items-center border border-white/10"
                onPress={() => router.push(`/(main)/chat/${item.id}`)}
              >
                <View className="relative mr-4">
                  {mainPhoto ? (
                    <Image
                      source={{ uri: mainPhoto }}
                      className="w-16 h-16 rounded-full border-2 border-[#B8860B]"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center border-2 border-[#B8860B]">
                      <Text className="text-white/60 text-2xl">👤</Text>
                    </View>
                  )}
                  {/* Active indicator - shows if OTHER USER is active */}
                  {isOtherUserActive && (
                    <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text 
                      className={`text-lg ${hasUnread ? 'font-bold' : 'font-semibold'} text-white`}
                      numberOfLines={1}
                    >
                      {fullName}
                    </Text>
                    {item.isCompliment && (
                      <View className="bg-purple-500 rounded-full px-2 py-0.5">
                        <DiamondIcon size={16} color="#FF0000" />
                      </View>
                    )}
                    {hasUnread && (
                      <View className="bg-[#B8860B] rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.isCompliment ? (
                    <Text 
                      className={`text-sm mt-1 ${hasUnread ? 'text-white font-medium' : 'text-white/60'}`}
                      numberOfLines={1}
                    >
                      {item.isComplimentSender 
                        ? (item.complimentStatus === 'declined' 
                            ? 'Compliment declined' 
                            : 'You sent a compliment')
                        : `${fullName} sent you a compliment`}
                    </Text>
                  ) : item.lastMessage ? (
                    <Text 
                      className={`text-sm mt-1 ${hasUnread ? 'text-white font-medium' : 'text-white/60'}`}
                      numberOfLines={1}
                    >
                      {item.lastMessage.content || item.lastMessage.message}
                    </Text>
                  ) : (
                    <Text className="text-[#B8860B] text-sm mt-1 italic">
                      New match! Say salam 👋
                    </Text>
                  )}
                </View>
                <View className="items-end">
                  {item.lastMessage && (
                    <Text className="text-white/50 text-xs mb-1">
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
