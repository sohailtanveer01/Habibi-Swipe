import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { View, TextInput, FlatList, Text, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [text, setText] = useState("");
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  // Fetch chat data with React Query (cached)
  // Always refetch on mount to ensure messages are marked as read
  const { data: chatData, isLoading, error } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-chat", {
        body: { matchId: chatId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 0, // Always consider stale - we need to mark messages as read on every open
    gcTime: 1000 * 60 * 30, // 30 minutes - cache persists for 30 min
    refetchOnMount: true, // Always refetch when opening chat to mark messages as read
    refetchOnWindowFocus: false,
  });

  const otherUser = chatData?.otherUser || null;
  const currentUser = chatData?.currentUserId ? { id: chatData.currentUserId } : null;
  const messages = chatData?.messages || [];

  // Mutation for sending messages with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: { matchId: chatId, content },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setText("");
      // Invalidate and refetch chat data to get updated messages
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    },
  });

  // Mark messages as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refetch chat data to trigger marking messages as read
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      // Also invalidate chat list to update unread counts
      queryClient.invalidateQueries({ queryKey: ["chat-list"] });
    }, [chatId, queryClient])
  );

  // Real-time subscription for new messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        async (payload) => {
          const newMessage = payload.new;
          
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          // If message is from the other user (not current user), mark it as read immediately
          if (newMessage.sender_id !== user.id && !newMessage.read) {
            // Mark message as read in database
            const { error: updateError } = await supabase
              .from("messages")
              .update({ read: true })
              .eq("id", newMessage.id);
            
            if (!updateError) {
              // Update the message in cache to reflect read status
              newMessage.read = true;
            }
          }
          
          // Update React Query cache with new message
          queryClient.setQueryData(["chat", chatId], (oldData: any) => {
            if (!oldData) return oldData;
            
            // Check if message already exists
            const exists = oldData.messages?.some((msg: any) => msg.id === newMessage.id);
            if (exists) return oldData;

            return {
              ...oldData,
              messages: [...(oldData.messages || []), newMessage],
            };
          });
          
          // Invalidate chat list to update unread counts
          queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          
          // Scroll to bottom when new message arrives
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        (payload) => {
          // Update message in cache (e.g., when marked as read)
          queryClient.setQueryData(["chat", chatId], (oldData: any) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              messages: oldData.messages?.map((msg: any) =>
                msg.id === payload.new.id ? payload.new : msg
              ) || [],
            };
          });
          
          // Invalidate chat list when messages are marked as read
          if (payload.new.read === true && payload.old?.read === false) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, queryClient]);

  const send = useCallback(() => {
    if (!text.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(text.trim());
  }, [text, sendMessageMutation]);

  const fullName = otherUser?.first_name && otherUser?.last_name
    ? `${otherUser.first_name} ${otherUser.last_name}`
    : otherUser?.name || "Unknown";

  const mainPhoto = useMemo(() => {
    return otherUser?.photos && otherUser.photos.length > 0
      ? cleanPhotoUrl(otherUser.photos[0])
      : null;
  }, [otherUser?.photos]);

  // Memoize message processing (deduplication, sorting, grouping)
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Deduplicate messages by ID
    const messageMap = new Map();
    messages.forEach((msg: any) => {
      if (!messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });
    
    const uniqueMessages = Array.from(messageMap.values());
    
    // Sort by created_at
    uniqueMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group messages by date for timestamps
    return uniqueMessages.reduce((acc: any[], msg: any, index: number) => {
      const prevMsg = index > 0 ? uniqueMessages[index - 1] : null;
      const msgDate = new Date(msg.created_at);
      const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
      
      // Add timestamp if it's a new day or first message
      if (!prevDate || msgDate.toDateString() !== prevDate.toDateString()) {
        acc.push({ 
          type: 'timestamp', 
          date: msgDate, 
          id: `timestamp-${msgDate.toISOString().split('T')[0]}-${acc.length}`,
          _index: acc.length
        });
      }
      acc.push({ ...msg, _index: acc.length });
      return acc;
    }, []);
  }, [messages]);

  // Show loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading chat: {error.message}
        </Text>
        <Pressable 
          className="bg-purple-600 px-6 py-3 rounded-full"
          onPress={() => queryClient.invalidateQueries({ queryKey: ["chat", chatId] })}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-3 flex-row items-center justify-between border-b border-gray-100">
        <Pressable 
          onPress={() => {
            // Invalidate chat list cache to refresh unread counts
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            router.back();
          }} 
          className="mr-3"
        >
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
        keyExtractor={(item, index) => {
          if (item.type === 'timestamp') {
            return `timestamp-${item._index !== undefined ? item._index : index}`;
          }
          // Combine ID and index to ensure absolute uniqueness
          return `msg-${item.id}-${item._index !== undefined ? item._index : index}`;
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
        windowSize={10}
        // Optimize scroll events
        onScrollToIndexFailed={() => {}}
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
          <Pressable onPress={send} disabled={sendMessageMutation.isPending} className="ml-3">
            <View className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center">
              <Text className="text-white text-lg">✓</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}