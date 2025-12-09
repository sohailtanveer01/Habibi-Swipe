import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { View, TextInput, FlatList, Text, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Dimensions } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { isUserActive } from "../../../lib/useActiveStatus";

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

// Upload image to Supabase Storage
async function uploadChatMedia(uri: string, matchId: string, userId: string): Promise<string> {
  const ext = uri.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const filePath = `${matchId}/${userId}/${timestamp}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();
  
  const { error } = await supabase.storage
    .from("chat-media")
    .upload(filePath, blob, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) throw error;

  // Try public URL first, fallback to signed URL if needed
  const { data: publicData } = supabase.storage
    .from("chat-media")
    .getPublicUrl(filePath);

  // Return public URL (bucket should be public)
  return publicData.publicUrl;
}

// Get signed URL for chat media (fallback if bucket is not public)
async function getChatMediaUrl(mediaUrl: string): Promise<string> {
  // If it's already a full URL, return it
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    // Extract file path from public URL
    const urlParts = mediaUrl.split('/storage/v1/object/public/chat-media/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      
      // Try to get a signed URL (valid for 1 hour)
      const { data: signedData, error } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (!error && signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    }
  }
  
  // Fallback to original URL
  return mediaUrl;
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const router = useRouter();
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSentTypingStartedRef = useRef<boolean>(false);
  const typingIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

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
  
  // Track OTHER USER's active status with real-time updates
  const [otherUserActive, setOtherUserActive] = useState<boolean>(false);
  
  // Check initial active status of OTHER USER
  useEffect(() => {
    if (otherUser?.last_active_at) {
      const active = isUserActive(otherUser.last_active_at);
      setOtherUserActive(active);
      console.log("🔍 Other user active status:", {
        userId: otherUser.id,
        lastActiveAt: otherUser.last_active_at,
        isActive: active,
      });
    } else {
      setOtherUserActive(false);
    }
  }, [otherUser?.last_active_at, otherUser?.id]);
  
  // Subscribe to OTHER USER's active status broadcasts (ephemeral events)
  useEffect(() => {
    if (!otherUser?.id) return;
    
    // Subscribe to the other user's active status channel
    const activeStatusChannel = supabase
      .channel(`active-status:${otherUser.id}`)
      .on(
        "broadcast",
        { event: "active_status" },
        (payload) => {
          // Only update if it's from the OTHER user
          if (payload.payload.userId === otherUser.id) {
            setOtherUserActive(payload.payload.isActive);
            console.log("🔄 Active status broadcast received:", {
              userId: payload.payload.userId,
              isActive: payload.payload.isActive,
            });
          }
        }
      )
      .subscribe();
    
    // Also check initial status from database as fallback
    if (otherUser?.last_active_at) {
      const active = isUserActive(otherUser.last_active_at);
      setOtherUserActive(active);
    }
    
    return () => {
      supabase.removeChannel(activeStatusChannel);
    };
  }, [otherUser?.id]);

  // Debug: Log messages to see if media is present
  useEffect(() => {
    if (messages.length > 0) {
      const messagesWithMedia = messages.filter((msg: any) => msg.image_url || msg.voice_url);
      if (messagesWithMedia.length > 0) {
        console.log("📸 Messages with media:", messagesWithMedia.length);
        console.log("📸 Sample message with media:", JSON.stringify(messagesWithMedia[0], null, 2));
      } else {
        console.log("⚠️ No messages with media found. Total messages:", messages.length);
        if (messages.length > 0) {
          console.log("📝 Sample message structure:", JSON.stringify(messages[0], null, 2));
        }
      }
    }
  }, [messages]);

  // Mutation for sending messages with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType }: { content?: string; mediaUrl?: string; mediaType?: string }) => {
      // Build request body - only include fields that have values
      const requestBody: any = { 
        matchId: chatId,
      };
      
      if (content && content.trim()) {
        requestBody.content = content.trim();
      }
      
      if (mediaUrl) {
        requestBody.mediaUrl = mediaUrl;
        requestBody.mediaType = mediaType || "image";
      }
      
      console.log("📤 Request body to Edge Function:", JSON.stringify(requestBody, null, 2));
      
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: requestBody,
      });
      
      if (error) {
        console.error("❌ Send message error:", error);
        throw error;
      }
      
      console.log("✅ Send message response:", JSON.stringify(data, null, 2));
      
      // Check if the response includes media
      if (data?.message) {
        console.log("📸 Response message image_url:", data.message.image_url);
        console.log("🎤 Response message voice_url:", data.message.voice_url);
        console.log("📸 Response message media_type:", data.message.media_type);
      }
      
      return data;
    },
    onSuccess: () => {
      setText("");
      setSelectedImage(null);
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
      .channel(`messages:${chatId}`);
    
    // Store channel reference for broadcasting
    channelRef.current = channel;
    
    channel
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
          
          // Ensure image_url, voice_url and media_type are included in the message
          // The payload should already include all columns, but we'll make sure
          const messageWithMedia = {
            ...newMessage,
            image_url: newMessage.image_url || null,
            voice_url: newMessage.voice_url || null,
            media_type: newMessage.media_type || null,
          };
          
          // Update React Query cache with new message
          queryClient.setQueryData(["chat", chatId], (oldData: any) => {
            if (!oldData) return oldData;
            
            // Check if message already exists
            const exists = oldData.messages?.some((msg: any) => msg.id === messageWithMedia.id);
            if (exists) return oldData;

            return {
              ...oldData,
              messages: [...(oldData.messages || []), messageWithMedia],
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
          // Ensure image_url and voice_url are preserved
          const updatedMessage = {
            ...payload.new,
            image_url: payload.new.image_url || null,
            voice_url: payload.new.voice_url || null,
          };
          
          queryClient.setQueryData(["chat", chatId], (oldData: any) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              messages: oldData.messages?.map((msg: any) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              ) || [],
            };
          });
          
          // Invalidate chat list when messages are marked as read
          if (payload.new.read === true && payload.old?.read === false) {
            queryClient.invalidateQueries({ queryKey: ["chat-list"] });
          }
        }
      )
      .on(
        "broadcast",
        { event: "typing" },
        async (payload) => {
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          // Only show typing indicator if it's from the OTHER user (not current user)
          if (payload.payload.userId !== user.id) {
            if (payload.payload.type === "typing_started") {
              setIsOtherUserTyping(true);
              
              // Clear any existing timeout
              if (typingIndicatorTimeoutRef.current) {
                clearTimeout(typingIndicatorTimeoutRef.current);
              }
              
              // Auto-hide typing indicator after 3 seconds if no update
              typingIndicatorTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000);
            } else if (payload.payload.type === "typing_stopped") {
              setIsOtherUserTyping(false);
              
              // Clear timeout
              if (typingIndicatorTimeoutRef.current) {
                clearTimeout(typingIndicatorTimeoutRef.current);
              }
            }
          }
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      channelRef.current = null;
      // Clean up timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
    };
  }, [chatId, queryClient]);

  // Function to broadcast typing events
  const broadcastTyping = async (type: "typing_started" | "typing_stopped") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !chatId || !channelRef.current) return;

      // Use the existing subscribed channel to send broadcast
      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: user.id,
          type: type,
        },
      });
    } catch (error) {
      console.error("Error broadcasting typing event:", error);
    }
  };

  // Handle text input changes and broadcast typing events
  const handleTextChange = (newText: string) => {
    setText(newText);
    
    // If user starts typing and we haven't sent typing_started yet
    if (newText.length > 0 && !hasSentTypingStartedRef.current) {
      hasSentTypingStartedRef.current = true;
      broadcastTyping("typing_started");
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // If text is empty, send typing_stopped immediately
    if (newText.length === 0) {
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
      return;
    }
    
    // Set timeout to send typing_stopped after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
    }, 1000); // 1 second debounce
  };

  // Clean up typing indicator when message is sent
  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      // Message was sent, stop typing indicator
      if (hasSentTypingStartedRef.current) {
        hasSentTypingStartedRef.current = false;
        broadcastTyping("typing_stopped");
      }
    }
  }, [sendMessageMutation.isSuccess]);

  const pickImage = async () => {
    try {
      // Check & request permission
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = existingStatus === 'granted';
      
      if (!hasPermission) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = status === 'granted';
      }

      if (!hasPermission) {
        Alert.alert(
          "Permission needed",
          "We need access to your gallery to send photos. Please enable photo permissions in your device settings."
        );
        return;
      }

      // Open gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;
      setSelectedImage(selectedUri);
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const send = useCallback(async () => {
    // Allow sending if there's text OR an image
    const hasText = text && text.trim().length > 0;
    const hasImage = !!selectedImage;
    
    if ((!hasText && !hasImage) || sendMessageMutation.isPending || uploadingMedia) return;
    
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    // If image is selected, upload it first
    if (selectedImage) {
      try {
        setUploadingMedia(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "Please log in to send messages.");
          setUploadingMedia(false);
          return;
        }
        
        mediaUrl = await uploadChatMedia(selectedImage, chatId as string, user.id);
        mediaType = "image";
      } catch (error: any) {
        console.error("Error uploading media:", error);
        Alert.alert("Error", "Failed to upload image. Please try again.");
        setUploadingMedia(false);
        return;
      }
    }

    // Send message with text and/or media
    console.log("📤 Sending message:", {
      hasText,
      hasImage: !!mediaUrl,
      mediaUrl,
      mediaType,
    });
    
    sendMessageMutation.mutate({
      content: hasText ? text.trim() : undefined,
      mediaUrl,
      mediaType,
    });
    setUploadingMedia(false);
  }, [text, selectedImage, sendMessageMutation, uploadingMedia, chatId]);

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
          <View className="relative mr-3">
            {mainPhoto ? (
              <Image
                source={{ uri: mainPhoto }}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center">
                <Text className="text-white/60 text-xl">👤</Text>
              </View>
            )}
            {/* Active indicator */}
            {otherUserActive && (
              <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">{fullName}</Text>
            {otherUserActive && !isOtherUserTyping && (
              <Text className="text-green-500 text-xs mt-0.5">Active now</Text>
            )}
          </View>
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
                  className={`rounded-2xl ${
                    isMe
                      ? "bg-[#B8860B] rounded-br-sm"
                      : "bg-white/10 rounded-bl-sm"
                  }`}
                >
                  {/* Show image if image_url exists */}
                  {item.image_url && (
                    <Pressable
                      onPress={() => {
                        const imageUrl = cleanPhotoUrl(item.image_url) || item.image_url;
                        setFullScreenImage(imageUrl);
                      }}
                    >
                      <ExpoImage
                        source={{ uri: cleanPhotoUrl(item.image_url) || item.image_url }}
                        style={{ 
                          width: 250, 
                          height: 250, 
                          borderTopLeftRadius: 16,
                          borderTopRightRadius: 16,
                          borderBottomLeftRadius: (item.content && item.content.trim()) ? 0 : 16,
                          borderBottomRightRadius: (item.content && item.content.trim()) ? 0 : 16,
                        }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        onError={(error) => {
                          console.error("❌ Image load error:", error);
                          console.error("❌ Image URL:", item.image_url);
                        }}
                        onLoad={() => {
                          console.log("✅ Image loaded successfully:", item.image_url);
                        }}
                      />
                    </Pressable>
                  )}
                  
                  {/* Show voice note if voice_url exists (for future implementation) */}
                  {item.voice_url && (
                    <View className="px-4 py-3">
                      <Text className="text-white/60 text-sm">
                        🎤 Voice note (coming soon)
                      </Text>
                    </View>
                  )}
                  
                  {/* Show text content if exists */}
                  {item.content && item.content.trim() && (
                    <Text
                      className={`text-base px-4 py-2.5 ${
                        isMe ? "text-white" : "text-white"
                      }`}
                    >
                      {item.content}
                    </Text>
                  )}
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
        ListFooterComponent={
          isOtherUserTyping ? (
            <View className="mb-2 flex-row justify-start items-end">
              <View className="mr-2 mb-1">
                {mainPhoto ? (
                  <Image
                    source={{ uri: mainPhoto }}
                    className="w-8 h-8 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                    <Text className="text-white/60 text-xs">👤</Text>
                  </View>
                )}
              </View>
              <View className="max-w-[75%] items-start">
                <View className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <Text className="text-white/70 text-sm italic">typing...</Text>
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Image Preview */}
      {selectedImage && (
        <View className="px-4 py-2 bg-black border-t border-white/10">
          <View className="relative">
            <ExpoImage
              source={{ uri: selectedImage }}
              style={{ width: 100, height: 100, borderRadius: 12 }}
              contentFit="cover"
            />
            <Pressable
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Input */}
      <View className="bg-black px-4 py-3 flex-row items-center gap-3" style={{ paddingBottom: Platform.OS === "ios" ? 20 : 10 }}>
        {/* Add/Attachment Button */}
        <Pressable 
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-[#B8860B]/30"
          onPress={pickImage}
          disabled={uploadingMedia}
        >
          <Ionicons name="add" size={24} color="#B8860B" />
        </Pressable>

        {/* Message Input Field */}
        <TextInput
          className="flex-1 bg-white/10 text-white px-4 py-3 rounded-2xl border border-[#B8860B]/30"
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={500}
          style={{ maxHeight: 100, fontSize: 16 }}
          returnKeyType="send"
          onSubmitEditing={send}
        />

        {/* Send Button */}
        <Pressable 
          onPress={send} 
          disabled={((!text || !text.trim()) && !selectedImage) || sendMessageMutation.isPending || uploadingMedia}
          className={`w-10 h-10 rounded-full bg-[#B8860B] items-center justify-center ${
            ((!text || !text.trim()) && !selectedImage) ? 'opacity-50' : ''
          }`}
        >
          {uploadingMedia ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons 
              name="send" 
              size={18} 
              color="#FFFFFF" 
            />
          )}
        </Pressable>
      </View>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <Pressable
            onPress={() => setFullScreenImage(null)}
            className="absolute top-12 right-4 z-10 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Image Container */}
          <Pressable 
            className="flex-1 items-center justify-center"
            onPress={() => setFullScreenImage(null)}
          >
            {fullScreenImage && (
              <ExpoImage
                source={{ uri: fullScreenImage }}
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height,
                }}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            )}
          </Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}