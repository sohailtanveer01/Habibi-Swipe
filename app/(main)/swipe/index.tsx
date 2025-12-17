import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Dimensions, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import SwipeCard from "../../../components/SwipeCard";
import LikesProfileView from "../../../components/LikesProfileView";
import { supabase } from "../../../lib/supabase";
import Logo from "../../../components/Logo";
import DiamondIcon from "../../../components/DiamondIcon";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

// Spring config for soft, premium feel
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1,
};

const TRANSITION_SPRING = {
  damping: 25,
  stiffness: 120,
  mass: 0.8,
};

export default function SwipeScreen() {
  const router = useRouter();
  const { userId, source } = useLocalSearchParams<{ userId?: string; source?: string }>();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false); // prevents double swipe
  const viewedProfileIds = useRef<Set<string>>(new Set()); // Track which profiles have been viewed
  const [matchData, setMatchData] = useState<{
    matchId: string;
    otherUser: any;
  } | null>(null);
  const [loadingSpecificProfile, setLoadingSpecificProfile] = useState(false);
  const [existingSwipe, setExistingSwipe] = useState<{ action: "like" | "pass" | "superlike" } | null>(null);
  const [availableActions, setAvailableActions] = useState<{ showLike: boolean; showPass: boolean }>({ showLike: true, showPass: true });
  const [complimentModalVisible, setComplimentModalVisible] = useState(false);
  const [complimentMessage, setComplimentMessage] = useState("");
  const [sendingCompliment, setSendingCompliment] = useState(false);
  const [hasCompliment, setHasCompliment] = useState(false);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  
  // Entry animation for new card
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);

  // Fetch a specific user's profile
  const fetchSpecificProfile = async (targetUserId: string) => {
    setLoadingSpecificProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the specific user's profile
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) {
        console.error("Error fetching specific profile:", error);
        alert(`Error loading profile: ${error.message}`);
        setLoadingSpecificProfile(false);
        return;
      }

      if (profile) {
        // Fetch prompts for this user
        const { data: promptsData } = await supabase
          .from("user_prompts")
          .select("question, answer, display_order")
          .eq("user_id", targetUserId)
          .order("display_order", { ascending: true });

        // Check if current user has already swiped on this profile
        const { data: existingSwipeData } = await supabase
          .from("swipes")
          .select("action")
          .eq("swiper_id", user.id)
          .eq("swiped_id", targetUserId)
          .maybeSingle();
        
        setExistingSwipe(existingSwipeData);

        // Check if user has already sent a compliment to this profile
        const { data: existingCompliment } = await supabase
          .from("compliments")
          .select("id")
          .eq("sender_id", user.id)
          .eq("recipient_id", targetUserId)
          .maybeSingle();
        
        setHasCompliment(!!existingCompliment);

        // Add prompts to profile object (SwipeCard expects it this way)
        const profileWithPrompts = {
          ...profile,
          prompts: promptsData || []
        };

        // Set this profile as the first (and only) profile in the feed
        setProfiles([profileWithPrompts]);
        setIndex(0);
        viewedProfileIds.current.clear();
      }
    } catch (error) {
      console.error("Error in fetchSpecificProfile:", error);
    } finally {
      setLoadingSpecificProfile(false);
    }
  };

  // Fetch swipe feed
  const fetchFeed = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("get_swipe_feed", {
      body: { user_id: user.id, limit: 20 },
    });

    if (error) {
      console.error("Error fetching swipe feed:", error);
      alert(`Error loading profiles: ${error.message}`);
      return;
    }

    if (data?.profiles) {
      setProfiles(data.profiles);
      setIndex(0);
      // Reset viewed profiles when feed refreshes
      viewedProfileIds.current.clear();
    } else {
      setProfiles([]);
    }
  };

  // Determine available actions based on source and existing swipe
  const determineAvailableActions = (source: string | undefined, existingSwipe: { action: string } | null) => {
    if (source === "myLikes") {
      // User already liked them - only show Pass button
      return { showLike: false, showPass: true };
    }
    
    if (source === "likedMe") {
      // User hasn't swiped yet - show both buttons
      return { showLike: true, showPass: true };
    }
    
    if (source === "passedOn") {
      // User previously passed on them - only show Like button (allow changing mind)
      return { showLike: true, showPass: false };
    }
    
    if (source === "chat") {
      // Viewing from chat - they're already matched, show no buttons (just view profile)
      return { showLike: false, showPass: false };
    }
    
    if (source === "viewers") {
      // Check existing swipe status
      if (existingSwipe?.action === "like" || existingSwipe?.action === "superlike") {
        // Already liked - show no buttons
        return { showLike: false, showPass: false };
      } else if (existingSwipe?.action === "pass") {
        // Already passed - show both (allow changing mind)
        return { showLike: true, showPass: true };
      } else {
        // No swipe yet - show both
        return { showLike: true, showPass: true };
      }
    }
    
    // Default (normal swipe feed) - show both
    return { showLike: true, showPass: true };
  };

  useEffect(() => {
    // If userId and source are both provided, fetch that specific profile
    if (userId && source) {
      fetchSpecificProfile(userId);
    } else if (!userId && !source) {
      // Otherwise, fetch the normal swipe feed
      fetchFeed();
    } else {
      // If we have one but not the other, clear both and fetch normal feed
      // This handles cases where parameters are lingering from previous navigation
      if (userId || source) {
        router.setParams({ userId: undefined, source: undefined });
        fetchFeed();
      }
    }
  }, [userId, source, router]);

  // Update available actions when source or existingSwipe changes
  useEffect(() => {
    const actions = determineAvailableActions(source, existingSwipe);
    setAvailableActions(actions);
  }, [source, existingSwipe]);

  // Refresh feed when screen comes into focus (e.g., returning from filters)
  // Clear userId and source if navigating to normal swipe feed
  useFocusEffect(
    useCallback(() => {
      // When screen comes into focus, if we have parameters, it means we're viewing from likes
      // But if user tapped the swipe tab directly, we should clear parameters and show normal feed
      // We detect this by checking if both userId and source exist - if only one exists, it's stale
      if (userId && source) {
        // Both exist - this is intentional (viewing from likes), do nothing
        // The useEffect above will handle fetching the specific profile
      } else if (userId || source) {
        // Only one exists - this is stale state, clear both and fetch normal feed
        router.setParams({ userId: undefined, source: undefined });
        fetchFeed();
      } else {
        // No parameters - fetch normal feed
        fetchFeed();
      }
    }, [userId, source, router])
  );

  // Track profile views when a profile becomes current in the swipe feed
  useEffect(() => {
    const trackProfileView = async () => {
      const currentProfile = profiles[index];
      if (!currentProfile || !currentProfile.id) return;

      // Skip if we've already tracked a view for this profile
      if (viewedProfileIds.current.has(currentProfile.id)) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === currentProfile.id) {
        // Don't track views for own profile
        return;
      }

      // Mark as viewed to prevent duplicates
      viewedProfileIds.current.add(currentProfile.id);

      // Record the view
      try {
        await supabase.functions.invoke("create-profile-view", {
          body: { viewed_id: currentProfile.id },
        });
        console.log("✅ Profile view recorded for swipe feed:", currentProfile.id);
      } catch (error) {
        console.error("Error recording profile view from swipe feed:", error);
        // Remove from set if it failed so we can retry
        viewedProfileIds.current.delete(currentProfile.id);
      }
    };

    // Track view when index changes (new profile shown)
    if (profiles.length > 0 && index < profiles.length) {
      trackProfileView();
    }

    // Check if user has already sent a compliment to current profile
    const checkCompliment = async () => {
      if (profiles.length > 0 && index < profiles.length) {
        const currentProfile = profiles[index];
        if (currentProfile) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: existingCompliment } = await supabase
              .from("compliments")
              .select("id")
              .eq("sender_id", user.id)
              .eq("recipient_id", currentProfile.id)
              .maybeSingle();
            
            setHasCompliment(!!existingCompliment);
          }
        }
      }
    };

    checkCompliment();
  }, [index, profiles]);

  // Reset compliment state when index changes
  useEffect(() => {
    setComplimentMessage("");
    setHasCompliment(false);
  }, [index]);

  // Move to next card (simple index increment, animation handled by useEffect)
  const moveToNextCard = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  // Animate card entry when index changes
  useEffect(() => {
    // Reset swipe position immediately
    x.value = 0;
    y.value = 0;
    
    // Start card slightly scaled down and offset, then animate to final position
    // Use direct assignment for initial state, then spring animation
    cardScale.value = 0.95;
    cardOpacity.value = 0.7;
    cardTranslateY.value = 20;
    
    // Animate to full visibility with spring
    cardScale.value = withSpring(1, TRANSITION_SPRING);
    cardOpacity.value = withSpring(1, TRANSITION_SPRING);
    cardTranslateY.value = withSpring(0, TRANSITION_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Send compliment
  const sendCompliment = async () => {
    const currentProfile = profiles[index];
    if (!currentProfile || !complimentMessage.trim()) return;

    setSendingCompliment(true);
    try {
      const { error } = await supabase.functions.invoke("send-compliment", {
        body: {
          recipientId: currentProfile.id,
          message: complimentMessage.trim(),
        },
      });

      if (error) {
        Alert.alert("Error", error.message || "Failed to send compliment. Please try again.");
        setSendingCompliment(false);
        return;
      }

      Alert.alert("Success", "Compliment sent! They'll see it in their chat list.", [
        {
          text: "OK",
          onPress: () => {
            setComplimentModalVisible(false);
            setComplimentMessage("");
            setHasCompliment(true);
            setSendingCompliment(false);
            // Move to next card
            if (index < profiles.length - 1) {
              moveToNextCard();
            } else {
              fetchFeed();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error sending compliment:", error);
      Alert.alert("Error", error.message || "Failed to send compliment. Please try again.");
      setSendingCompliment(false);
    }
  };

  // Send swipe to server
  const sendSwipe = async (action: "like" | "pass" | "superlike") => {
    if (isSwiping) return;
    setIsSwiping(true);

    const currentProfile = profiles[index];
    if (!currentProfile) {
      setIsSwiping(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send_swipe", {
        body: {
          swiped_id: currentProfile.id,
          action,
        },
      });

      if (error) {
        console.error("Swipe error:", error);
        setIsSwiping(false);
        return;
      }

      // Parse response if it's a string
      let responseData = data;
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          console.error("Error parsing response:", e);
        }
      }

      console.log("Swipe response:", responseData);

      // If matched, show celebration screen
      if (responseData?.matched && responseData?.matchId) {
        console.log("🎉 MATCHED with", currentProfile.name || currentProfile.first_name);
        console.log("Match data:", responseData);
        setMatchData({
          matchId: responseData.matchId,
          otherUser: responseData.otherUser || currentProfile,
        });
        // Don't move to next card yet - wait for user to dismiss celebration
      } else {
        // Move to next card if no match
        // If we're viewing a specific user, navigate back based on source
        if (userId) {
          setTimeout(() => {
            // Navigate back to the appropriate section based on source
            if (source === "chat") {
              router.back(); // Go back to chat
            } else {
              router.push("/(main)/likes");
            }
          }, 300); // Small delay to show the swipe animation
        } else {
          // Move to next card with animation
          moveToNextCard();
        }
      }
    } catch (err) {
      console.error("Error in sendSwipe:", err);
      // Don't navigate on error - just reset the swiping state
      setIsSwiping(false);
      return;
    } finally {
      setIsSwiping(false);
    }
  };

  // Gesture handler
  const pan = Gesture.Pan()
    .onBegin(() => {
      if (isSwiping) return;
    })
    .onUpdate((e) => {
      if (isSwiping) return;
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      if (isSwiping) return;

      const shouldLike = x.value > SWIPE_THRESHOLD && availableActions.showLike;
      const shouldPass = x.value < -SWIPE_THRESHOLD && availableActions.showPass;

      if (shouldLike) {
        x.value = withSpring(width * 1.5, SPRING_CONFIG);
        runOnJS(sendSwipe)("like");
      } else if (shouldPass) {
        x.value = withSpring(-width * 1.5, SPRING_CONFIG);
        runOnJS(sendSwipe)("pass");
      } else {
        x.value = withSpring(0, SPRING_CONFIG);
        y.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Card animation style (handles both swipe and entry animation)
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x.value },
        { translateY: y.value + cardTranslateY.value },
        { rotateZ: `${x.value / 20}deg` },
        { scale: cardScale.value },
      ],
      opacity: cardOpacity.value,
    };
  });


  const current = profiles[index];

  if (loadingSpecificProfile) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Loading profile...</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <View className="mb-8">
          <Logo variant="colored" width={120} />
        </View>
        <Text className="text-white/70 text-center mb-4">
          {userId ? "Profile not found" : "No profiles found matching your filters."}
        </Text>
        {!userId && (
          <>
            <Pressable
              className="mt-4 bg-[#B8860B] px-6 py-3 rounded-full"
              onPress={() => router.push("/(main)/swipe/filters/")}
            >
              <Text className="text-white font-semibold">Adjust Filters for More Profiles</Text>
            </Pressable>
            <Pressable
              className="mt-4 bg-white/10 px-6 py-3 rounded-full"
              onPress={fetchFeed}
            >
              <Text className="text-white/70">Refresh</Text>
            </Pressable>
          </>
        )}
        {userId && (
          <Pressable
            className="mt-4 bg-white/10 px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white/70">Go Back</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const handleMatchCelebrationClose = (navigateToChat: boolean) => {
    if (navigateToChat && matchData?.matchId) {
      // Capture matchId before clearing state
      const matchIdToNavigate = matchData.matchId;
      console.log("Navigating to chat with matchId:", matchIdToNavigate);
      // Close modal first
      setMatchData(null);
      // If we're viewing a specific user, navigate to likes screen; otherwise move to next card
      if (userId) {
        setTimeout(() => {
          router.push(`/(main)/chat/${matchIdToNavigate}`);
        }, 100);
      } else {
        // Move to next card
        moveToNextCard();
        // Navigate to chat
        setTimeout(() => {
          router.push(`/(main)/chat/${matchIdToNavigate}`);
        }, 400);
      }
    } else {
      // Keep swiping
      setMatchData(null);
      // If we're viewing a specific user, navigate back based on source; otherwise move to next card
      if (userId) {
        setTimeout(() => {
          // Navigate back to the appropriate section based on source
          if (source === "chat") {
            router.back(); // Go back to chat
          } else {
            router.push("/(main)/likes");
          }
        }, 100);
      } else {
        // Move to next card
        moveToNextCard();
      }
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Match Celebration Modal */}
      <Modal
        visible={!!matchData}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleMatchCelebrationClose(false)}
      >
        {matchData && (
          <MatchCelebrationModal
            matchId={matchData.matchId}
            otherUser={matchData.otherUser}
            onSendMessage={() => handleMatchCelebrationClose(true)}
            onKeepSwiping={() => handleMatchCelebrationClose(false)}
          />
        )}
      </Modal>

      {/* Back Button - Top Left (when viewing from likes or chat) */}
      {source && (source === "myLikes" || source === "likedMe" || source === "viewers" || source === "passedOn" || source === "chat") && (
        <Pressable
          className="absolute top-12 left-4 z-50 bg-black/50 w-10 h-10 rounded-full items-center justify-center"
          onPress={() => {
            // Clear parameters before navigating to ensure clean state
            router.setParams({ userId: undefined, source: undefined });
            // Navigate back to the appropriate section based on source
            if (source === "chat") {
              router.back(); // Go back to chat
            } else {
              router.push("/(main)/likes");
            }
          }}
        >
          <Text className="text-white text-xl">←</Text>
        </Pressable>
      )}

      {/* Apply Filters Button - Top Left (only for normal swipe feed) */}
      {(!source || (source !== "myLikes" && source !== "likedMe" && source !== "viewers" && source !== "passedOn" && source !== "chat")) && (
        <Pressable
          className="absolute top-12 left-4 z-50 bg-[#B8860B] px-4 py-2 rounded-full flex-row items-center gap-2"
          onPress={() => router.push("/(main)/swipe/filters/")}
        >
          <Text className="text-white font-semibold text-sm">Apply Filters</Text>
        </Pressable>
      )}

      {/* Conditionally wrap with gesture detector only for normal swipe feed */}
      {(!source || (source !== "myLikes" && source !== "likedMe" && source !== "viewers" && source !== "passedOn" && source !== "chat")) ? (
        <>
          {/* Current card with swipe gesture and entry animation */}
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                { 
                  width: "100%", 
                  height: "100%",
                },
                cardAnimatedStyle
              ]}
            >
              <SwipeCard profile={current} />
            </Animated.View>
          </GestureDetector>
          
          {/* Action buttons for normal swipe feed */}
          <View className={`absolute bottom-40 left-0 right-0 flex-row items-center justify-center gap-10 z-50`}>
            {/* Pass - only show if available */}
            {availableActions.showPass && (
              <Pressable
                className="bg-white w-20 h-20 rounded-full items-center justify-center"
                onPress={() => sendSwipe("pass")}
                disabled={isSwiping}
              >
                <Text className="text-black text-3xl">✕</Text>
              </Pressable>
            )}

            {/* Send Compliment - show if not already sent and viewing normal feed */}
            {!hasCompliment && (!source || source === "likedMe") && (
              <Pressable
                className="bg-red-500 w-20 h-20 rounded-full items-center justify-center"
                onPress={() => setComplimentModalVisible(true)}
                disabled={isSwiping}
              >
                <DiamondIcon size={28} color="#FFFFFF" />
              </Pressable>
            )}

            {/* Like - only show if available */}
            {availableActions.showLike && (
              <Pressable
                className="bg-[#B8860B] w-20 h-20 rounded-full items-center justify-center"
                onPress={() => sendSwipe("like")}
                disabled={isSwiping}
              >
                <Text className="text-white text-3xl">♥</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={{ width: "100%", height: "100%" }}>
            <LikesProfileView profile={current} />
          </View>
          
          {/* Action buttons - only show when viewing from likes section (not from chat) */}
          {source && (source === "myLikes" || source === "likedMe" || source === "viewers" || source === "passedOn") && (
            <View className={`absolute bottom-40 left-0 right-0 flex-row items-center justify-center gap-10 z-50`}>
              {/* Pass - only show if available */}
              {availableActions.showPass && (
                <Pressable
                  className="bg-white w-20 h-20 rounded-full items-center justify-center"
                  onPress={() => sendSwipe("pass")}
                  disabled={isSwiping}
                >
                  <Text className="text-black text-3xl">✕</Text>
                </Pressable>
              )}

              {/* Like - only show if available */}
              {availableActions.showLike && (
                <Pressable
                  className="bg-[#B8860B] w-20 h-20 rounded-full items-center justify-center"
                  onPress={() => sendSwipe("like")}
                  disabled={isSwiping}
                >
                  <Text className="text-white text-3xl">♥</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

      {/* Compliment Modal */}
      <Modal
        visible={complimentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setComplimentModalVisible(false);
          setComplimentMessage("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/80 justify-end">
            <Pressable
              className="flex-1"
              onPress={() => {
                setComplimentModalVisible(false);
                setComplimentMessage("");
              }}
            />
            <View className="bg-black border-t border-white/20 rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-xl font-bold">
                  Send Compliment 💬
                </Text>
                <Pressable
                  onPress={() => {
                    setComplimentModalVisible(false);
                    setComplimentMessage("");
                  }}
                >
                  <Text className="text-white/70 text-lg">✕</Text>
                </Pressable>
              </View>
              
              {profiles[index] && (
                <>
                  <Text className="text-white/80 text-sm mb-4">
                    Send a message to {profiles[index].first_name || profiles[index].name || "this user"} before matching
                  </Text>
                  
                  <TextInput
                    className="bg-white/10 text-white rounded-2xl p-4 mb-4 min-h-[120px] text-base"
                    placeholder="Write your compliment (max 200 characters)..."
                    placeholderTextColor="#FFFFFF60"
                    multiline
                    numberOfLines={5}
                    maxLength={200}
                    value={complimentMessage}
                    onChangeText={setComplimentMessage}
                    style={{ textAlignVertical: "top" }}
                  />
                  
                  <Text className="text-white/50 text-xs mb-4 text-right">
                    {complimentMessage.length}/200
                  </Text>
                  
                  <Pressable
                    className={`bg-[#B8860B] rounded-2xl py-4 items-center ${sendingCompliment || !complimentMessage.trim() ? "opacity-50" : ""}`}
                    disabled={sendingCompliment || !complimentMessage.trim()}
                    onPress={sendCompliment}
                  >
                    <Text className="text-white text-base font-bold">
                      {sendingCompliment ? "Sending..." : "Send Compliment"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Match Celebration Modal Component
function MatchCelebrationModal({
  matchId,
  otherUser,
  onSendMessage,
  onKeepSwiping,
}: {
  matchId: string;
  otherUser: any;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}) {
  const fullName =
    otherUser?.first_name && otherUser?.last_name
      ? `${otherUser.first_name} ${otherUser.last_name}`
      : otherUser?.name || "Someone";

  const mainPhoto =
    otherUser?.photos && otherUser.photos.length > 0
      ? otherUser.photos[0]
      : null;

  return (
    <View style={matchModalStyles.container}>
      <View style={matchModalStyles.content}>
        {/* Logo */}
        <View style={matchModalStyles.logoContainer}>
          <Logo variant="transparent" width={100} />
        </View>
        <Text style={matchModalStyles.title}>🎉</Text>
        <Text style={matchModalStyles.congratsText}>It&apos;s a Match!</Text>
        <Text style={matchModalStyles.subtitle}>
          You and {fullName} liked each other
        </Text>

        {/* Matched User Photo */}
        <View style={matchModalStyles.photoContainer}>
          {mainPhoto ? (
            <Image
              source={{ uri: mainPhoto }}
              style={matchModalStyles.photo}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={matchModalStyles.photoPlaceholder}>
              <Text style={matchModalStyles.photoPlaceholderText}>👤</Text>
            </View>
          )}
          <View style={matchModalStyles.photoRing} />
        </View>

        <Text style={matchModalStyles.nameText}>{fullName}</Text>

        {/* Action Buttons */}
        <View style={matchModalStyles.buttonContainer}>
          <Pressable
            style={[matchModalStyles.button, matchModalStyles.keepSwipingButton]}
            onPress={onKeepSwiping}
          >
            <Text style={matchModalStyles.keepSwipingText}>Keep Swiping</Text>
          </Pressable>

          <Pressable
            style={[matchModalStyles.button, matchModalStyles.sendMessageButton]}
            onPress={onSendMessage}
          >
            <Text style={matchModalStyles.sendMessageText}>Send Message</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const matchModalStyles = {
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  logoContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 80,
    marginBottom: 20,
  },
  congratsText: {
    fontSize: 36,
    fontWeight: "bold" as const,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 18,
    color: "#9CA3AF",
    marginBottom: 40,
    textAlign: "center" as const,
  },
  photoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
    position: "relative" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  photo: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  photoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#B8860B",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  photoPlaceholderText: {
    fontSize: 80,
  },
  photoRing: {
    position: "absolute" as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#B8860B",
  },
  nameText: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 60,
  },
  buttonContainer: {
    gap: 16,
    width: "100%",
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  keepSwipingButton: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  keepSwipingText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  sendMessageButton: {
    backgroundColor: "#B8860B",
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sendMessageText: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#000000",
  },
};