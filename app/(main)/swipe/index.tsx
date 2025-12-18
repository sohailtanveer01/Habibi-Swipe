import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Dimensions, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SwipeCard from "../../../components/SwipeCard";
import LikesProfileView from "../../../components/LikesProfileView";
import { supabase } from "../../../lib/supabase";
import Logo from "../../../components/Logo";
import DiamondIcon from "../../../components/DiamondIcon";

// ============================================================================
// REWIND FEATURE TYPES
// ============================================================================
interface RewindHistoryItem {
  profile: any;           // The profile that was passed
  swipedId: string;       // ID of the swiped user (for DB deletion)
  index: number;          // Index in the profiles array when passed
}

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

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
  const insets = useSafeAreaInsets();
  const { userId, source } = useLocalSearchParams<{ userId?: string; source?: string }>();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const viewedProfileIds = useRef<Set<string>>(new Set());
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
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  
  // Track the exiting card to prevent blink during transitions
  const [exitingCard, setExitingCard] = useState<{ profile: any; exitX: number } | null>(null);
  const exitingX = useSharedValue(0);

  // ============================================================================
  // REWIND FEATURE STATE
  // ============================================================================
  // Last passed profile - only ONE rewind allowed (to previous user only)
  const [lastPassedProfile, setLastPassedProfile] = useState<RewindHistoryItem | null>(null);
  // Track if rewind is in progress
  const [isRewinding, setIsRewinding] = useState(false);
  // Track the card being rewound (for animation)
  const [rewindingCard, setRewindingCard] = useState<any | null>(null);
  // Rewind animation shared values
  const rewindX = useSharedValue(-width * 1.5);
  const rewindScale = useSharedValue(0.9);
  const rewindOpacity = useSharedValue(0);
  const rewindRotation = useSharedValue(-15);

  const fetchSpecificProfile = async (targetUserId: string) => {
    setLoadingSpecificProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        const { data: promptsData } = await supabase
          .from("user_prompts")
          .select("question, answer, display_order")
          .eq("user_id", targetUserId)
          .order("display_order", { ascending: true });

        const { data: existingSwipeData } = await supabase
          .from("swipes")
          .select("action")
          .eq("swiper_id", user.id)
          .eq("swiped_id", targetUserId)
          .maybeSingle();
        
        setExistingSwipe(existingSwipeData);

        const { data: existingCompliment } = await supabase
          .from("compliments")
          .select("id")
          .eq("sender_id", user.id)
          .eq("recipient_id", targetUserId)
          .maybeSingle();
        
        setHasCompliment(!!existingCompliment);

        const profileWithPrompts = {
          ...profile,
          prompts: promptsData || []
        };

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
      viewedProfileIds.current.clear();
      // Clear last passed profile when fetching new feed
      setLastPassedProfile(null);
    } else {
      setProfiles([]);
      setLastPassedProfile(null);
    }
  };

  const determineAvailableActions = (source: string | undefined, existingSwipe: { action: string } | null) => {
    if (source === "myLikes") return { showLike: false, showPass: true };
    if (source === "likedMe") return { showLike: true, showPass: true };
    if (source === "passedOn") return { showLike: true, showPass: false };
    if (source === "chat") return { showLike: false, showPass: false };
    
    if (source === "viewers") {
      if (existingSwipe?.action === "like" || existingSwipe?.action === "superlike") {
        return { showLike: false, showPass: false };
      } else if (existingSwipe?.action === "pass") {
        return { showLike: true, showPass: true };
      } else {
        return { showLike: true, showPass: true };
      }
    }
    
    return { showLike: true, showPass: true };
  };

  useEffect(() => {
    if (userId && source) {
      fetchSpecificProfile(userId);
    } else if (!userId && !source) {
      fetchFeed();
    } else {
      if (userId || source) {
        router.setParams({ userId: undefined, source: undefined });
        fetchFeed();
      }
    }
  }, [userId, source, router]);

  useEffect(() => {
    const actions = determineAvailableActions(source, existingSwipe);
    setAvailableActions(actions);
  }, [source, existingSwipe]);

  useFocusEffect(
    useCallback(() => {
      if (userId && source) {
        // Both exist - intentional
      } else if (userId || source) {
        router.setParams({ userId: undefined, source: undefined });
        fetchFeed();
      } else {
        fetchFeed();
      }
    }, [userId, source, router])
  );

  useEffect(() => {
    const trackProfileView = async () => {
      const currentProfile = profiles[index];
      if (!currentProfile || !currentProfile.id) return;

      if (viewedProfileIds.current.has(currentProfile.id)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === currentProfile.id) return;

      viewedProfileIds.current.add(currentProfile.id);

      try {
        await supabase.functions.invoke("create-profile-view", {
          body: { viewed_id: currentProfile.id },
        });
        console.log("✅ Profile view recorded for swipe feed:", currentProfile.id);
      } catch (error) {
        console.error("Error recording profile view from swipe feed:", error);
        viewedProfileIds.current.delete(currentProfile.id);
      }
    };

    if (profiles.length > 0 && index < profiles.length) {
      trackProfileView();
    }

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

  useEffect(() => {
    setComplimentMessage("");
    setHasCompliment(false);
  }, [index]);

  // Track if we're transitioning from a swipe (vs initial load)
  const isSwipeTransition = useRef(false);

  const moveToNextCard = useCallback(() => {
    isSwipeTransition.current = true;  // Mark as swipe transition
    
    // Capture exiting card with its current x position
    const currentProfile = profiles[index];
    if (currentProfile) {
      const exitDirection = x.value >= 0 ? 1 : -1;
      exitingX.value = x.value;
      // Animate it flying off screen quickly with timing (faster than spring)
      exitingX.value = withTiming(exitDirection * width * 1.5, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      });
      setExitingCard({ profile: currentProfile, exitX: x.value });
      
      // Clear exiting card after animation completes
      setTimeout(() => {
        setExitingCard(null);
      }, 180);
    }
    
    setIndex((i) => i + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, index]);

  useEffect(() => {
    // Reset position
    x.value = 0;
    y.value = 0;
    
    if (isSwipeTransition.current) {
      // Coming from swipe - card was already visible, just reset position
      // NO entry animation needed - prevents blink!
      cardScale.value = 1;
      cardOpacity.value = 1;
      cardTranslateY.value = 0;
      isSwipeTransition.current = false;
    } else {
      // Initial load or refresh - do the entry animation
      cardScale.value = 0.95;
      cardOpacity.value = 0.7;
      cardTranslateY.value = 20;
      
      cardScale.value = withSpring(1, TRANSITION_SPRING);
      cardOpacity.value = withSpring(1, TRANSITION_SPRING);
      cardTranslateY.value = withSpring(0, TRANSITION_SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Prefetch images for upcoming profiles to prevent any loading flashes
  useEffect(() => {
    const prefetchUpcomingImages = async () => {
      // Prefetch next 5 profiles' images
      for (let i = 1; i <= 5; i++) {
        const nextProfile = profiles[index + i];
        if (nextProfile?.photos?.length > 0) {
          // Prefetch all photos for this profile
          nextProfile.photos.forEach((photoUrl: string) => {
            if (photoUrl) {
              Image.prefetch(photoUrl);
            }
          });
        }
      }
    };
    
    if (profiles.length > 0) {
      prefetchUpcomingImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, profiles.length]);

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

      let responseData = data;
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          console.error("Error parsing response:", e);
        }
      }

      console.log("Swipe response:", responseData);

      // ================================================================
      // REWIND: Track last pass (left swipe) for ONE rewind only
      // Only passes can be rewound - likes/superlikes clear the option
      // ================================================================
      if (action === "pass") {
        // Store only the last passed profile (ONE rewind allowed)
        setLastPassedProfile({
          profile: currentProfile,
          swipedId: currentProfile.id,
          index: index,
        });
      } else {
        // Clear rewind option on like/superlike (can't rewind after liking)
        setLastPassedProfile(null);
      }

      if (responseData?.matched && responseData?.matchId) {
        console.log("🎉 MATCHED with", currentProfile.name || currentProfile.first_name);
        console.log("Match data:", responseData);
        setMatchData({
          matchId: responseData.matchId,
          otherUser: responseData.otherUser || currentProfile,
        });
      } else {
        if (userId) {
          setTimeout(() => {
            if (source === "chat") {
              router.back();
            } else {
              router.push("/(main)/likes");
            }
          }, 300);
        } else {
          moveToNextCard();
        }
      }
    } catch (err) {
      console.error("Error in sendSwipe:", err);
      setIsSwiping(false);
      return;
    } finally {
      setIsSwiping(false);
    }
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      if (isSwiping) return;
    })
    .onUpdate((e) => {
      if (isSwiping) return;
      x.value = e.translationX;
      y.value = e.translationY * 0.1;
    })
    .onEnd((e) => {
      if (isSwiping) return;

      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);
      
      const isHorizontalSwipe = absX > absY * 1.5 && absX > 50;

      if (isHorizontalSwipe) {
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
      } else {
        x.value = withSpring(0, SPRING_CONFIG);
        y.value = withSpring(0, SPRING_CONFIG);
      }
    })
    .simultaneousWithExternalGesture();

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

  const nextCardAnimatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(x.value);
    const dragProgress = Math.min(absX / (width * 0.4), 1);
    
    const scale = 0.95 + (dragProgress * 0.05);
    const opacity = 0.8 + (dragProgress * 0.2);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for exiting card (continues from where swipe left off)
  const exitingCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: exitingX.value },
        { rotateZ: `${exitingX.value / 20}deg` },
      ],
      opacity: 1,
    };
  });

  // ============================================================================
  // REWIND ANIMATION STYLE
  // ============================================================================
  const rewindCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: rewindX.value },
        { scale: rewindScale.value },
        { rotateZ: `${rewindRotation.value}deg` },
      ],
      opacity: rewindOpacity.value,
    };
  });

  // ============================================================================
  // REWIND FUNCTION - Undo last LEFT swipe (pass) - ONE REWIND ONLY
  // ============================================================================
  const handleRewind = useCallback(async () => {
    // Guard: Don't rewind if already rewinding, swiping, or no last pass
    if (isRewinding || isSwiping || !lastPassedProfile) return;
    
    setIsRewinding(true);
    
    try {
      // Get current user for database operation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsRewinding(false);
        return;
      }

      // Delete the swipe record from database
      const { error: deleteError } = await supabase
        .from("swipes")
        .delete()
        .eq("swiper_id", user.id)
        .eq("swiped_id", lastPassedProfile.swipedId);

      if (deleteError) {
        console.error("Error deleting swipe for rewind:", deleteError);
        Alert.alert("Error", "Failed to undo swipe. Please try again.");
        setIsRewinding(false);
        return;
      }

      // Set the rewinding card for animation
      setRewindingCard(lastPassedProfile.profile);

      // Initialize rewind animation values (card starts from off-screen left)
      rewindX.value = -width * 1.5;
      rewindScale.value = 0.9;
      rewindOpacity.value = 0;
      rewindRotation.value = -15;

      // Animate the card back into view with a smooth spring
      rewindOpacity.value = withTiming(1, { duration: 150 });
      rewindX.value = withSpring(0, {
        damping: 18,
        stiffness: 100,
        mass: 0.8,
      });
      rewindScale.value = withSpring(1, {
        damping: 15,
        stiffness: 120,
      });
      rewindRotation.value = withSequence(
        withSpring(-5, { damping: 10, stiffness: 200 }),
        withSpring(0, { damping: 15, stiffness: 100 })
      );

      // Store the index before clearing
      const rewindToIndex = lastPassedProfile.index;

      // After animation completes, update state
      setTimeout(() => {
        // Clear the last passed profile (ONE rewind only - can't rewind again)
        setLastPassedProfile(null);
        
        // Go back to the rewound profile's index
        setIndex(rewindToIndex);
        
        // Clear the rewinding card
        setRewindingCard(null);
        
        // Reset animation values
        rewindX.value = -width * 1.5;
        rewindScale.value = 0.9;
        rewindOpacity.value = 0;
        rewindRotation.value = -15;
        
        setIsRewinding(false);
      }, 400);

    } catch (err) {
      console.error("Error in handleRewind:", err);
      Alert.alert("Error", "Failed to undo swipe. Please try again.");
      setIsRewinding(false);
    }
  }, [isRewinding, isSwiping, lastPassedProfile, rewindX, rewindScale, rewindOpacity, rewindRotation]);

  // Check if rewind is available (only after ONE left swipe, can't chain rewinds)
  const canRewind = lastPassedProfile !== null && !isRewinding && !isSwiping;

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
      const matchIdToNavigate = matchData.matchId;
      console.log("Navigating to chat with matchId:", matchIdToNavigate);
      setMatchData(null);
      if (userId) {
        setTimeout(() => {
          router.push(`/(main)/chat/${matchIdToNavigate}`);
        }, 100);
      } else {
        moveToNextCard();
        setTimeout(() => {
          router.push(`/(main)/chat/${matchIdToNavigate}`);
        }, 400);
      }
    } else {
      setMatchData(null);
      if (userId) {
        setTimeout(() => {
          if (source === "chat") {
            router.back();
          } else {
            router.push("/(main)/likes");
          }
        }, 100);
      } else {
        moveToNextCard();
      }
    }
  };

  return (
    <View className="flex-1 bg-black">
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

      {source && (source === "myLikes" || source === "likedMe" || source === "viewers" || source === "passedOn" || source === "chat") && (
        <Pressable
          className="absolute left-4 z-50 bg-black/50 w-10 h-10 rounded-full items-center justify-center"
          style={{ top: insets.top + 8 }}
          onPress={() => {
            router.setParams({ userId: undefined, source: undefined });
            if (source === "chat") {
              router.back();
            } else {
              router.push("/(main)/likes");
            }
          }}
        >
          <Text className="text-white text-xl">←</Text>
        </Pressable>
      )}

      {(!source || (source !== "myLikes" && source !== "likedMe" && source !== "viewers" && source !== "passedOn" && source !== "chat")) && (
        <>
          {/* Apply Filters Button - Top Left */}
          <Pressable
            className="absolute left-4 z-50 bg-[#B8860B] px-4 py-2 rounded-full flex-row items-center gap-2"
            style={{ top: insets.top + 8 }}
            onPress={() => router.push("/(main)/swipe/filters/")}
          >
            <Text className="text-white font-semibold text-sm">Apply Filters</Text>
          </Pressable>

          {/* ================================================================ */}
          {/* REWIND BUTTON - Top Right */}
          {/* Only visible after left swipes (passes) - hidden when no history */}
          {/* ================================================================ */}
          {canRewind && (
            <Pressable
              className="absolute right-4 z-50 w-12 h-12 rounded-full items-center justify-center bg-[#B8860B]"
              style={{ top: insets.top + 8 }}
              onPress={handleRewind}
            >
              <Ionicons name="arrow-undo" size={22} color="#FFFFFF" />
            </Pressable>
          )}
        </>
      )}

      {(!source || (source !== "myLikes" && source !== "likedMe" && source !== "viewers" && source !== "passedOn" && source !== "chat")) ? (
        <>
          {/* ================================================================ */}
          {/* REWINDING CARD - Animates in from left during rewind */}
          {/* Renders above everything with highest z-index */}
          {/* ================================================================ */}
          {rewindingCard && (
            <Animated.View
              key={`rewinding-${rewindingCard.id}`}
              style={[
                {
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 20, // Above exiting card
                },
                rewindCardStyle,
              ]}
              pointerEvents="none"
            >
              <SwipeCard profile={rewindingCard} />
            </Animated.View>
          )}

          {/* Exiting card - renders above everything during swipe transition */}
          {exitingCard && (
            <Animated.View
              key={`exiting-${exitingCard.profile.id}`}
              style={[
                {
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 10,
                },
                exitingCardStyle,
              ]}
              pointerEvents="none"
            >
              <SwipeCard profile={exitingCard.profile} />
            </Animated.View>
          )}

          {/* 
            Render cards by profile ID with a STABLE root element.
            IMPORTANT: The previous implementation swapped the root element type between
            "next" (Animated.View) and "current" (GestureDetector), which can cause React
            to remount the card when it changes roles — leading to blink/glitches.
            We keep Animated.View as the stable root for all slots and only conditionally
            wrap the inner content with GestureDetector for the active card.
          */}
          {profiles.slice(index, index + 3).map((profile, slotIndex) => {
            if (!profile) return null;

            // Skip if this is the exiting card (already rendered above)
            if (exitingCard && profile.id === exitingCard.profile.id) return null;

            const isCurrent = slotIndex === 0;
            const isNext = slotIndex === 1;

            const baseStyle = {
              width: "100%",
              height: "100%",
              position: "absolute" as const,
              top: 0,
              left: 0,
              zIndex: isCurrent ? 2 : isNext ? 1 : 0,
            };

            const slotStyle = isCurrent
              ? cardAnimatedStyle
              : isNext
                ? nextCardAnimatedStyle
                : { opacity: 0 };

            return (
              <Animated.View
                key={profile.id}
                style={[baseStyle, slotStyle]}
                pointerEvents={isCurrent ? "auto" : "none"}
              >
                {isCurrent ? (
                  <GestureDetector gesture={pan}>
                    <View style={{ width: "100%", height: "100%" }}>
                      <SwipeCard profile={profile} />
                    </View>
                  </GestureDetector>
                ) : (
                  <SwipeCard profile={profile} />
                )}
              </Animated.View>
            );
          })}
          
          <View 
            className="absolute left-0 right-0 flex-row items-center justify-center gap-12 z-50"
            style={{ bottom: Math.max(insets.bottom, 10) + 100 }}
          >
            {availableActions.showPass && (
              <Pressable
                className="bg-white w-20 h-20 rounded-full items-center justify-center"
                onPress={() => sendSwipe("pass")}
                disabled={isSwiping}
              >
                <Text className="text-black text-2xl">✕</Text>
              </Pressable>
            )}

            {!hasCompliment && (!source || source === "likedMe") && (
              <Pressable
                className="bg-red-500 w-20 h-20 rounded-full items-center justify-center"
                onPress={() => setComplimentModalVisible(true)}
                disabled={isSwiping}
              >
                <DiamondIcon size={22} color="#FFFFFF" />
              </Pressable>
            )}

            {availableActions.showLike && (
              <Pressable
                className="bg-[#B8860B] w-20 h-20 rounded-full items-center justify-center"
                onPress={() => sendSwipe("like")}
                disabled={isSwiping}
              >
                <Text className="text-white text-2xl">♥</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={{ width: "100%", height: "100%" }}>
            <LikesProfileView profile={current} />
          </View>
          
          {source && (source === "myLikes" || source === "likedMe" || source === "viewers" || source === "passedOn") && (
            <View 
              className="absolute left-0 right-0 flex-row items-center justify-center gap-8 z-50"
              style={{ bottom: Math.max(insets.bottom, 10) + 100 }}
            >
              {availableActions.showPass && (
                <Pressable
                  className="bg-white w-16 h-16 rounded-full items-center justify-center"
                  onPress={() => sendSwipe("pass")}
                  disabled={isSwiping}
                >
                  <Text className="text-black text-2xl">✕</Text>
                </Pressable>
              )}

              {availableActions.showLike && (
                <Pressable
                  className="bg-[#B8860B] w-16 h-16 rounded-full items-center justify-center"
                  onPress={() => sendSwipe("like")}
                  disabled={isSwiping}
                >
                  <Text className="text-white text-2xl">♥</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

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
        <View style={matchModalStyles.logoContainer}>
          <Logo variant="transparent" width={100} />
        </View>
        <Text style={matchModalStyles.title}>🎉</Text>
        <Text style={matchModalStyles.congratsText}>It&apos;s a Match!</Text>
        <Text style={matchModalStyles.subtitle}>
          You and {fullName} liked each other
        </Text>

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