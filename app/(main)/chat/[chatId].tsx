import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { View, TextInput, FlatList, Text, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

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
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading chat: {error.message}
        </Text>
        <Pressable 
          className="bg-[#B8860B] px-6 py-3 rounded-full"
          onPress={() => queryClient.invalidateQueries({ queryKey: ["chat", chatId] })}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      {/* Header */}
      <View className="bg-black px-4 pt-12 pb-4 flex-row items-start border-b border-white/10">
        <Pressable 
          onPress={() => {
            // Invalidate chat list cache to refresh unread counts
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
            router.back();
          }} 
          className="mr-3 mt-1"
        >
          <Text className="text-white text-2xl font-semibold">←</Text>
        </Pressable>
        
        <Pressable 
          className="flex-1 flex-row items-center"
          onPress={() => {
            if (otherUser?.id) {
              router.push(`/(main)/swipe?userId=${otherUser.id}&source=chat`);
            }
          }}
        >
          {mainPhoto ? (
            <Image
              source={{ uri: mainPhoto }}
              className="w-14 h-14 rounded-full mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-white/10 mr-3 items-center justify-center">
              <Text className="text-white/60 text-xl">👤</Text>
            </View>
          )}
          <Text className="text-white text-lg font-semibold">{fullName}</Text>
        </Pressable>
      </View>

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
                <Text className="text-white/50 text-xs">
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
                    <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                      <Text className="text-white/60 text-xs">👤</Text>
                    </View>
                  )}
                </View>
              )}
              
              <View className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <View
                  className={`px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? "bg-[#B8860B] rounded-br-sm"
                      : "bg-white/10 rounded-bl-sm"
                  }`}
                >
                  <Text
                    className={`text-base ${
                      isMe ? "text-white" : "text-white"
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
            <View className="bg-white/10 px-4 py-3 rounded-2xl mb-4">
              <Text className="text-white/70 text-sm text-center">
                Start the chat with {fullName}
              </Text>
            </View>
          </View>
        }
      />

      {/* Input */}
      <View className="bg-black px-4 py-3 flex-row items-center gap-3" style={{ paddingBottom: Platform.OS === "ios" ? 20 : 10 }}>
        {/* Add/Attachment Button */}
        <Pressable 
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-[#B8860B]/30"
          onPress={() => {
            // TODO: Add attachment functionality
          }}
        >
          <Ionicons name="add" size={24} color="#B8860B" />
        </Pressable>

        {/* Message Input Field */}
        <TextInput
          className="flex-1 bg-white/10 text-white px-4 py-3 rounded-2xl border border-[#B8860B]/30"
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          style={{ maxHeight: 100, fontSize: 16 }}
          returnKeyType="send"
          onSubmitEditing={send}
        />

        {/* Send Button */}
        <Pressable 
          onPress={send} 
          disabled={!text.trim() || sendMessageMutation.isPending}
          className={`w-10 h-10 rounded-full bg-[#B8860B] items-center justify-center ${
            !text.trim() ? 'opacity-50' : ''
          }`}
        >
          <Ionicons 
            name="send" 
            size={18} 
            color="#FFFFFF" 
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}