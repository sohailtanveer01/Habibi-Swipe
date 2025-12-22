import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { View, Text, Dimensions, Pressable, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, FlatList, ScrollView, StyleSheet } from "react-native";
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
import * as Haptics from "expo-haptics";
import { useSwipeStore } from "../../../lib/stores/swipeStore";

// RewindHistoryItem type imported from swipeStore

const { width } = Dimensions.get("window");
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
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
  
  // Zustand store for swipe state (allows other components to access feed state)
  const storeSetProfiles = useSwipeStore((s) => s.setProfiles);
  const storeSetIndex = useSwipeStore((s) => s.setCurrentIndex);
  const storeSetIsSwiping = useSwipeStore((s) => s.setIsSwiping);
  const storeSetLastPassed = useSwipeStore((s) => s.setLastPassedProfile);
  const storeLastPassed = useSwipeStore((s) => s.lastPassedProfile);
  const storeSetIsRewinding = useSwipeStore((s) => s.setIsRewinding);
  const storeIsRewinding = useSwipeStore((s) => s.isRewinding);
  
  // Local state (synced with store via useEffect) - keeps animations working
  const [profiles, setProfilesLocal] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [isSwiping, setIsSwipingLocal] = useState(false);
  const viewedProfileIds = useRef<Set<string>>(new Set());
  
  // Sync local profiles to store
  const setProfiles = useCallback((newProfiles: any[]) => {
    setProfilesLocal(newProfiles);
    storeSetProfiles(newProfiles);
  }, [storeSetProfiles]);
  
  // Sync local index to store via useEffect (avoids setState during render)
  useEffect(() => {
    storeSetIndex(index);
  }, [index, storeSetIndex]);
  
  const setIsSwiping = useCallback((val: boolean) => {
    setIsSwipingLocal(val);
    storeSetIsSwiping(val);
  }, [storeSetIsSwiping]);
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

  // Boost (moved from Profile tab to Swipe screen)
  const [boostExpiresAt, setBoostExpiresAt] = useState<string | null>(null);
  const [boostRemaining, setBoostRemaining] = useState<string | null>(null);
  const [boostActivating, setBoostActivating] = useState(false);
  const [boostModalVisible, setBoostModalVisible] = useState(false);

  // Photo gallery modal (tap main image -> swipe left/right through photos)
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryListRef = useRef<FlatList<string> | null>(null);

  // Profile details bottom sheet (opened by swipe-down)
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsProfile, setDetailsProfile] = useState<any | null>(null);
  const [detailsPrompts, setDetailsPrompts] = useState<any[]>([]);
  const detailsPhotosRef = useRef<string[]>([]);
  // When user taps an image inside the details sheet, we close the sheet first,
  // then open the full-screen gallery AFTER the sheet is dismissed.
  // This avoids nested-modal presentation quirks (esp. iOS) where the gallery may not appear.
  const [pendingGallery, setPendingGallery] = useState<{ photos: string[]; startIndex: number } | null>(null);
  const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.92, SCREEN_HEIGHT - 40);
  const sheetY = useSharedValue(SHEET_HEIGHT);
  const backdrop = useSharedValue(0);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  
  // Track the exiting card to prevent blink during transitions
  const [exitingCard, setExitingCard] = useState<{ profile: any; exitX: number } | null>(null);
  const exitingX = useSharedValue(0);

  // ============================================================================
  // REWIND FEATURE STATE (synced with Zustand store)
  // ============================================================================
  // Use store state directly (via selectors above)
  const lastPassedProfile = storeLastPassed;
  const setLastPassedProfile = storeSetLastPassed;
  const isRewinding = storeIsRewinding;
  const setIsRewinding = storeSetIsRewinding;
  // Track the card being rewound (for animation)
  const [rewindingCard, setRewindingCard] = useState<any | null>(null);
  // Rewind animation shared values
  const rewindX = useSharedValue(-width * 1.5);
  const rewindScale = useSharedValue(0.9);
  const rewindOpacity = useSharedValue(0);
  const rewindRotation = useSharedValue(-15);

  const BOOST_ICON_SIZE = 22;

  // Countdown timer for active boost
  useEffect(() => {
    if (!boostExpiresAt) {
      setBoostRemaining(null);
      return;
    }

    const tick = () => {
      const ms = new Date(boostExpiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setBoostExpiresAt(null);
        setBoostRemaining(null);
        return;
      }
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setBoostRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boostExpiresAt]);

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

  const openGallery = useCallback((photos: string[], startIndex: number) => {
    if (!photos || photos.length === 0) return;
    setGalleryPhotos(photos);
    setGalleryIndex(startIndex);
    setGalleryVisible(true);

    // Prefetch for smoother swipe inside gallery
    try {
      const anyImage: any = Image as any;
      if (typeof anyImage?.prefetch === "function") {
        photos.forEach((u) => {
          if (u) anyImage.prefetch(u);
        });
      }
    } catch {
      // ignore prefetch errors (should never block opening the gallery)
    }

    setTimeout(() => {
      try {
        galleryListRef.current?.scrollToIndex({ index: startIndex, animated: false });
      } catch {}
    }, 0);
  }, []);

  useEffect(() => {
    if (!detailsVisible && pendingGallery) {
      openGallery(pendingGallery.photos, pendingGallery.startIndex);
      setPendingGallery(null);
    }
  }, [detailsVisible, openGallery, pendingGallery]);

  // (Removed) goToGalleryIndex helper when tap-zones are disabled; swipe is primary navigation.

  const closeGallery = useCallback(() => {
    setGalleryVisible(false);
    // keep photos cached but clear state for next open
    setGalleryPhotos([]);
    setGalleryIndex(0);
  }, []);

  const refreshActiveBoost = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: activeBoost, error } = await supabase
        .from("profile_boosts")
        .select("expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading active boost:", error);
        return;
      }

      setBoostExpiresAt(activeBoost?.expires_at ?? null);
    } catch (e) {
      console.error("Error refreshing boost:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Keep boost status fresh when returning to the swipe screen
      refreshActiveBoost();
    }, [refreshActiveBoost])
  );

  const handleBoost = useCallback(async () => {
    if (boostActivating) return;

    // If already active, show remaining time
    if (boostExpiresAt) {
      Alert.alert("Boost Active", boostRemaining ? `Time left: ${boostRemaining}` : "Your boost is currently active.");
      return;
    }

    setBoostActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate_profile_boost", {
        body: { minutes: 30 },
      });
      if (error) throw error;

      const expiresAt = data?.boost?.expires_at ?? null;
      if (expiresAt) {
        setBoostExpiresAt(expiresAt);
      } else {
        await refreshActiveBoost();
      }
      Alert.alert("Boost Activated", "Your profile is boosted for 30 minutes.");
    } catch (e: any) {
      console.error("Boost activation error:", e);
      Alert.alert("Error", e?.message || "Failed to activate boost.");
    } finally {
      setBoostActivating(false);
    }
  }, [boostActivating, boostExpiresAt, boostRemaining, refreshActiveBoost]);

  const openBoostModal = useCallback(() => {
    // Keep state fresh when opening
    refreshActiveBoost();
    setBoostModalVisible(true);
  }, [refreshActiveBoost]);

  const closeBoostModal = useCallback(() => {
    setBoostModalVisible(false);
  }, []);

  const handleBoostNowFromModal = useCallback(async () => {
    await handleBoost();
    // If boost was activated, close the modal (or keep it open if already active)
    closeBoostModal();
  }, [handleBoost, closeBoostModal]);

  // Open profile details bottom sheet
  const openDetails = useCallback(async (profile: any) => {
    if (!profile) return;
    setDetailsProfile(profile);
    setDetailsPrompts([]);
    setDetailsVisible(true);
    sheetY.value = SHEET_HEIGHT;
    backdrop.value = 0;
    // Animate in
    sheetY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    backdrop.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Fetch prompts for this profile
    if (profile.id) {
      const { data } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", profile.id)
        .order("display_order", { ascending: true });
      if (data) setDetailsPrompts(data);
    }
  }, [SHEET_HEIGHT, backdrop, sheetY]);

  // Close profile details bottom sheet
  const closeDetails = useCallback(() => {
    sheetY.value = withTiming(
      SHEET_HEIGHT,
      { duration: 240, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setDetailsVisible)(false);
          runOnJS(setDetailsProfile)(null);
          runOnJS(setDetailsPrompts)([]);
        }
      }
    );
    backdrop.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [SHEET_HEIGHT, backdrop, sheetY]);

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

  // Unified pan gesture that handles both horizontal swipes (like/pass) and vertical swipes (open details)
  const cardGesture = Gesture.Pan()
    .enabled(!galleryVisible && !detailsVisible)
    .minDistance(10)
    .onUpdate((e) => {
      if (isSwiping) return;
      // Only apply horizontal translation (for visual feedback during swipe)
      x.value = e.translationX;
      y.value = e.translationY * 0.05; // Slight vertical feedback
    })
    .onEnd((e) => {
      if (isSwiping) return;

      const absX = Math.abs(e.translationX);
      const absY = Math.abs(e.translationY);

      // Determine dominant direction
      const isHorizontal = absX > absY;
      const isVerticalUp = e.translationY < 0 && absY > absX; // Swipe UP (negative Y)

      if (isHorizontal && absX > 50) {
        // Horizontal swipe - check for like/pass
        const shouldLike = e.translationX > SWIPE_THRESHOLD && availableActions.showLike;
        const shouldPass = e.translationX < -SWIPE_THRESHOLD && availableActions.showPass;

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
      } else if (isVerticalUp && (absY > 40 || Math.abs(e.velocityY) > 300)) {
        // Swipe UP detected - open profile details
        x.value = withSpring(0, SPRING_CONFIG);
        y.value = withSpring(0, SPRING_CONFIG);
        const currentProfile = profiles[index];
        if (currentProfile) {
          runOnJS(openDetails)(currentProfile);
        }
      } else {
        // Reset position
        x.value = withSpring(0, SPRING_CONFIG);
        y.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Sheet drag-to-dismiss gesture
  const sheetGesture = useMemo(() => {
    return Gesture.Pan()
      // Important: allow taps inside the sheet (photo tap, buttons, etc).
      // Without this, micro-movements during a tap can activate the pan and cancel Pressable onPress.
      .minDistance(12)
      .onUpdate((e) => {
        const nextY = Math.max(0, e.translationY);
        sheetY.value = nextY;
        backdrop.value = 1 - Math.min(1, nextY / SHEET_HEIGHT);
      })
      .onEnd((e) => {
        const shouldClose = e.translationY > SHEET_HEIGHT * 0.25 || e.velocityY > 800;
        if (shouldClose) {
          runOnJS(closeDetails)();
        } else {
          sheetY.value = withSpring(0, TRANSITION_SPRING);
          backdrop.value = withTiming(1, { duration: 120 });
        }
      });
  }, [SHEET_HEIGHT, backdrop, sheetY, closeDetails]);

  // Tap on the main photo inside the details sheet should open gallery.
  // We close the sheet first (pendingGallery handles opening after dismissal).
  const queueGalleryFromDetails = useCallback(
    (startIndex: number) => {
      const photos = detailsPhotosRef.current;
      if (!photos || photos.length === 0) return;
      setPendingGallery({ photos, startIndex });
      closeDetails();
    },
    [closeDetails]
  );

  const detailsMainPhotoTapGesture = useMemo(() => {
    return Gesture.Tap().onEnd(() => {
      // Only pass primitives across the worklet -> JS boundary (arrays/objects can crash on device)
      runOnJS(queueGalleryFromDetails)(0);
    });
  }, [queueGalleryFromDetails]);

  // Important: memoize combined gestures so we don't create new native gesture objects on every render.
  const detailsMainPhotoGesture = useMemo(() => {
    return Gesture.Simultaneous(detailsMainPhotoTapGesture, sheetGesture);
  }, [detailsMainPhotoTapGesture, sheetGesture]);

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

  // Bottom sheet animated styles
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.6,
  }));

  // Computed details for the modal
  const detailsAge = useMemo(() => {
    const dob = detailsProfile?.dob;
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const md = today.getMonth() - birthDate.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birthDate.getDate())) a--;
    return a;
  }, [detailsProfile?.dob]);

  const detailsPhotos: string[] = useMemo(() => detailsProfile?.photos || [], [detailsProfile?.photos]);
  const detailsInterests: string[] = detailsProfile?.hobbies || [];

  useEffect(() => {
    detailsPhotosRef.current = detailsPhotos;
  }, [detailsPhotos]);

  // Additional profile details for the modal
  const detailsHeight = detailsProfile?.height || "";
  const detailsMaritalStatus = detailsProfile?.marital_status || "";
  const detailsHasChildren = detailsProfile?.has_children ?? null;
  const detailsEducation = detailsProfile?.education || "";
  const detailsProfession = detailsProfile?.profession || "";
  const detailsSect = detailsProfile?.sect || "";
  const detailsBornMuslim = detailsProfile?.born_muslim ?? null;
  const detailsReligiousPractice = detailsProfile?.religious_practice || "";
  const detailsAlcoholHabit = detailsProfile?.alcohol_habit || "";
  const detailsSmokingHabit = detailsProfile?.smoking_habit || "";
  const detailsEthnicity = detailsProfile?.ethnicity || "";
  const detailsNationality = detailsProfile?.nationality || "";
  const detailsBio = detailsProfile?.bio || "";

  // Check if sections should be shown
  const hasPersonalInfo = detailsHeight || detailsMaritalStatus || detailsHasChildren !== null || detailsEducation || detailsProfession;
  const hasReligiousInfo = detailsSect || detailsBornMuslim !== null || detailsReligiousPractice || detailsAlcoholHabit || detailsSmokingHabit;
  const hasBackgroundInfo = detailsEthnicity || detailsNationality;

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
  }, [isRewinding, isSwiping, lastPassedProfile, rewindX, rewindScale, rewindOpacity, rewindRotation, setIndex, setIsRewinding, setLastPassedProfile]);

  // Check if rewind is available (only after ONE left swipe, can't chain rewinds)
  // Uses store state + local isSwiping for comprehensive check
  const canRewindNow = lastPassedProfile !== null && !isRewinding && !isSwiping;

  const current = profiles[index];

  if (loadingSpecificProfile) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Loading profile...</Text>
      </View>
    );
  }

  // Full-screen photo gallery modal (swipe left/right)
  const renderGallery = () => (
    <Modal
      visible={galleryVisible}
      // Use a real full-screen modal so it reliably appears above other modals (like the details sheet)
      transparent={false}
      presentationStyle="fullScreen"
      statusBarTranslucent
      animationType="fade"
      onRequestClose={closeGallery}
    >
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {/* Close button */}
        <Pressable
          onPress={closeGallery}
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 16,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>

        {/* Gold counter (1/N) */}
        {galleryPhotos.length > 1 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: insets.top + 18,
              left: 16,
              zIndex: 20,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: "rgba(0,0,0,0.35)",
              borderWidth: 1,
              borderColor: "rgba(184,134,11,0.5)",
            }}
          >
            <Text style={{ color: "#B8860B", fontSize: 12, fontWeight: "700" }}>
              {galleryIndex + 1}/{galleryPhotos.length}
            </Text>
          </View>
        )}

        <FlatList
          ref={(r) => (galleryListRef.current = r)}
          data={galleryPhotos}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setGalleryIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: "100%", alignItems: "center", justifyContent: "center" }}>
              <Image
                source={{ uri: item }}
                style={{ width, height: "100%" }}
                contentFit="contain"
                transition={0}
                cachePolicy="memory-disk"
              />
            </View>
          )}
        />

        {/* Chevrons + tap-zones removed; primary navigation is swipe */}

        {/* Dots indicator */}
        {galleryPhotos.length > 1 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: Math.max(insets.bottom, 10) + 14,
              zIndex: 20,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
            }}
          >
            {galleryPhotos.slice(0, 12).map((_, i) => {
              const active = i === galleryIndex;
              return (
                <View
                  key={`dot-${i}`}
                  style={{
                    width: active ? 9 : 7,
                    height: active ? 9 : 7,
                    borderRadius: 999,
                    backgroundColor: active ? "#B8860B" : "rgba(255,255,255,0.4)",
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );

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
          {/* BOOST + REWIND (Top Right) */}
          {/* ================================================================ */}
          <View
            style={{
              position: "absolute",
              right: 16,
              top: insets.top + 8,
              zIndex: 50,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={openBoostModal}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: boostExpiresAt ? "rgba(255,255,255,0.06)" : "#B8860B",
                borderWidth: 1,
                borderColor: boostExpiresAt ? "rgba(184, 134, 11, 0.6)" : "#B8860B",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="flash" size={BOOST_ICON_SIZE} color={boostExpiresAt ? "#B8860B" : "#FFFFFF"} />
                {!!boostRemaining && (
                  <Text style={{ marginTop: 2, fontSize: 10, fontWeight: "800", color: "#B8860B" }}>
                    {boostRemaining}
                  </Text>
                )}
              </View>
            </Pressable>

            {canRewindNow && (
              <Pressable
                className="w-12 h-12 rounded-full items-center justify-center bg-[#B8860B]"
                onPress={handleRewind}
              >
                <Ionicons name="arrow-undo" size={22} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
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
                  <GestureDetector gesture={cardGesture}>
                    <View style={{ width: "100%", height: "100%" }}>
                      <SwipeCard 
                        profile={profile} 
                        onTap={() => openDetails(profile)}
                      />
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
                onPress={() => {
                  // Always capture taps so they don't fall through to the card (which can open details/gallery).
                  if (isSwiping) return;
                  sendSwipe("pass");
                }}
              >
                <Text className="text-black text-2xl">✕</Text>
              </Pressable>
            )}

            {!hasCompliment && (!source || source === "likedMe") && (
              <Pressable
                className="bg-red-500 w-20 h-20 rounded-full items-center justify-center"
                onPress={() => {
                  if (isSwiping) return;
                  setComplimentModalVisible(true);
                }}
              >
                <DiamondIcon size={22} color="#FFFFFF" />
              </Pressable>
            )}

            {availableActions.showLike && (
              <Pressable
                className="bg-[#B8860B] w-20 h-20 rounded-full items-center justify-center"
                onPress={() => {
                  if (isSwiping) return;
                  sendSwipe("like");
                }}
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
          {/* No background tint behind the compliment sheet */}
          <View className="flex-1 justify-end">
            <Pressable
              className="flex-1"
              onPress={() => {
                setComplimentModalVisible(false);
                setComplimentMessage("");
              }}
            />
            <View className="bg-[#0B0B0B] border-t border-[#B8860B]/30 rounded-t-[32px] p-6">
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center">
                  {/* Match the red compliment action button (red circle + white diamond) */}
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-[#EF4444] border border-[#EF4444]/50 mr-3">
                    <DiamondIcon size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text className="text-white text-xl font-extrabold">Send Compliment</Text>
                    <Text className="text-white/60 text-xs mt-0.5">
                      Stand out with a thoughtful message
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setComplimentModalVisible(false);
                    setComplimentMessage("");
                  }}
                  className="w-10 h-10 rounded-full items-center justify-center bg-white/5 border border-white/10"
                >
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
              
              {profiles[index] && (
                <>
                  <View className="mb-4">
                    <Text className="text-white/80 text-sm">
                      To{" "}
                      <Text className="text-white font-semibold">
                        {profiles[index].first_name || profiles[index].name || "this user"}
                      </Text>
                    </Text>
                  </View>
                  
                  <TextInput
                    className="bg-white/5 text-white rounded-3xl p-4 min-h-[120px] text-base border border-white/10"
                    placeholder="Write your compliment (max 200 characters)..."
                    placeholderTextColor="#FFFFFF60"
                    multiline
                    numberOfLines={5}
                    maxLength={200}
                    value={complimentMessage}
                    onChangeText={setComplimentMessage}
                    style={{ textAlignVertical: "top" }}
                  />
                  
                  <View className="flex-row items-center justify-between mt-3 mb-5">
                    <Text className="text-white/50 text-xs">
                      Keep it kind and respectful
                    </Text>
                    <Text className="text-white/50 text-xs">
                      {complimentMessage.length}/200
                    </Text>
                  </View>
                  
                  <Pressable
                    className={`bg-[#EF4444] rounded-3xl py-4 items-center flex-row justify-center ${sendingCompliment || !complimentMessage.trim() ? "opacity-50" : ""}`}
                    disabled={sendingCompliment || !complimentMessage.trim()}
                    onPress={sendCompliment}
                  >
                    <DiamondIcon size={18} color="#FFFFFF" />
                    <Text className="text-white text-base font-extrabold ml-2">
                      {sendingCompliment ? "Sending..." : "Send Compliment"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Boost pop-up (similar to compliment pop-up) */}
      <Modal
        visible={boostModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeBoostModal}
      >
        <View className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={closeBoostModal} />

          <View className="bg-[#0B0B0B] border-t border-[#B8860B]/30 rounded-t-[32px] p-6">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-[#B8860B]/15 border border-[#B8860B]/30 mr-3">
                  <Ionicons name="flash" size={18} color="#B8860B" />
                </View>
                <View>
                  <Text className="text-white text-xl font-extrabold">Boost My Profile</Text>
                  <Text className="text-white/60 text-xs mt-0.5">
                    Get more visibility for 30 minutes
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={closeBoostModal}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/5 border border-white/10"
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>

            {/* Timer */}
            <View
              style={{
                borderRadius: 24,
                paddingVertical: 18,
                paddingHorizontal: 18,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(184,134,11,0.25)",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" }}>
                {boostExpiresAt ? "BOOST ACTIVE" : "BOOST DURATION"}
              </Text>
              <Text style={{ color: "#B8860B", fontSize: 36, fontWeight: "900", marginTop: 6 }}>
                {boostExpiresAt ? (boostRemaining || "—") : "30:00"}
              </Text>
            </View>

            {/* Big CTA */}
            <Pressable
              onPress={() => {
                if (boostActivating) return;
                handleBoostNowFromModal();
              }}
              className={`rounded-3xl py-4 items-center flex-row justify-center ${boostActivating ? "opacity-70" : ""}`}
              style={{
                backgroundColor: boostExpiresAt ? "rgba(184, 134, 11, 0.18)" : "#B8860B",
                borderWidth: 1,
                borderColor: boostExpiresAt ? "rgba(184, 134, 11, 0.6)" : "#B8860B",
              }}
            >
              <Ionicons name="flash" size={18} color={boostExpiresAt ? "#B8860B" : "#FFFFFF"} />
              <Text
                className="ml-2 text-base font-extrabold"
                style={{ color: boostExpiresAt ? "#B8860B" : "#000000" }}
              >
                {boostExpiresAt ? "Boost Active" : boostActivating ? "Boosting..." : "Boost Now"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Profile Details Bottom Sheet Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="none"
        onRequestClose={closeDetails}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <Pressable onPress={closeDetails} style={StyleSheet.absoluteFill}>
            <Animated.View style={[{ flex: 1, backgroundColor: "#000" }, backdropStyle]} />
          </Pressable>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              {
                height: SHEET_HEIGHT,
                backgroundColor: "#000000",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                overflow: "hidden",
              },
              sheetStyle,
            ]}
          >
            {/* Floating close button (gold X) - pinned to the sheet (does NOT scroll) */}
            <Pressable
              onPress={closeDetails}
              style={{
                position: "absolute",
                // Slightly higher than before
                top: 10,
                right: 16,
                zIndex: 50,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.35)",
                borderWidth: 1,
                borderColor: "rgba(184,134,11,0.6)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={22} color="#B8860B" />
            </Pressable>

            {/* Scrollable Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              // Extra bottom padding so content can scroll "behind" the fixed action buttons bar
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 10) + 180 }}
              bounces={true}
            >
                {/* Main Photo at Top - tap to open gallery, drag down to close */}
                {detailsPhotos && detailsPhotos.length > 0 && (
                  <View style={{ width: width, height: width * 1.1, marginBottom: 16, position: "relative" }}>
                    {/* Photo gestures: tap opens gallery, drag-down closes sheet */}
                    <GestureDetector gesture={detailsMainPhotoGesture}>
                      <View style={{ width: "100%", height: "100%" }}>
                        <Image
                          source={{ uri: detailsPhotos[0] }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={0}
                        />
                      </View>
                    </GestureDetector>

                    {/* Name + Age overlay (bottom-left of main image) */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: 16,
                        bottom: 16,
                        right: 16,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 26,
                          fontWeight: "900",
                          textShadowColor: "rgba(0,0,0,0.75)",
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 8,
                        }}
                      >
                        {detailsProfile?.first_name && detailsProfile?.last_name
                          ? `${detailsProfile.first_name} ${detailsProfile.last_name}`
                          : detailsProfile?.name || "Unknown"}
                        {detailsAge !== null ? `, ${detailsAge}` : ""}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Gallery (moved to directly after action buttons) */}
                {detailsPhotos && detailsPhotos.length > 1 && (
                  <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                    {/* Big tiles (match Profile tab grid feel) */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 }}>
                      {detailsPhotos.slice(1, 5).map((p: string, i: number) => (
                        <Pressable
                          key={`${p}-${i}`}
                          onPress={() => {
                            queueGalleryFromDetails(i + 1);
                          }}
                          style={{
                            width: "48%",
                            aspectRatio: 0.8,
                            borderRadius: 24,
                            overflow: "hidden",
                          }}
                        >
                          <Image
                            source={{ uri: p }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={0}
                            cachePolicy="memory-disk"
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Profile Details */}
                <View style={{ paddingHorizontal: 20 }}>
                  {/* Personal Info Section */}
                  {hasPersonalInfo && (
                    <View style={{ marginTop: 20, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 16 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {detailsHeight ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>📏 {detailsHeight}</Text>
                          </View>
                        ) : null}
                        {detailsMaritalStatus ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>💍 {detailsMaritalStatus.charAt(0).toUpperCase() + detailsMaritalStatus.slice(1)}</Text>
                          </View>
                        ) : null}
                        {detailsHasChildren !== null ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>{detailsHasChildren ? "👶 Has children" : "👶 No children"}</Text>
                          </View>
                        ) : null}
                        {detailsEducation ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🎓 {detailsEducation}</Text>
                          </View>
                        ) : null}
                        {detailsProfession ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>💼 {detailsProfession}</Text>
                          </View>
                        ) : null}
                      </ScrollView>
                    </View>
                  )}

                  {/* Religious Info Section */}
                  {hasReligiousInfo && (
                    <View style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 }}>Religious</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {detailsSect ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🕌 {detailsSect.charAt(0).toUpperCase() + detailsSect.slice(1)}</Text>
                          </View>
                        ) : null}
                        {detailsBornMuslim !== null ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>{detailsBornMuslim ? "⭐ Born Muslim" : "⭐ Converted to Islam"}</Text>
                          </View>
                        ) : null}
                        {detailsReligiousPractice ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>📿 {detailsReligiousPractice.charAt(0).toUpperCase() + detailsReligiousPractice.slice(1)}</Text>
                          </View>
                        ) : null}
                        {detailsAlcoholHabit ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🍷 Alcohol: {detailsAlcoholHabit.charAt(0).toUpperCase() + detailsAlcoholHabit.slice(1)}</Text>
                          </View>
                        ) : null}
                        {detailsSmokingHabit ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🚬 Smoking: {detailsSmokingHabit.charAt(0).toUpperCase() + detailsSmokingHabit.slice(1)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Lifestyle / Interests Section */}
                  {detailsInterests && detailsInterests.length > 0 && (
                    <View style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 }}>Lifestyle</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {detailsInterests.map((hobby: string, i: number) => (
                          <View
                            key={`${hobby}-${i}`}
                            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}
                          >
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🎯 {hobby}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Background Section */}
                  {hasBackgroundInfo && (
                    <View style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 }}>Background</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {detailsEthnicity ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🌍 {detailsEthnicity}</Text>
                          </View>
                        ) : null}
                        {detailsNationality ? (
                          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#B8860B" }}>
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500" }}>🏳️ {detailsNationality}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* About / Bio Section */}
                  {detailsBio ? (
                    <View style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 16 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 }}>About Me</Text>
                      <Text style={{ fontSize: 16, lineHeight: 24, color: "rgba(255,255,255,0.9)" }}>{detailsBio}</Text>
                    </View>
                  ) : null}

                  {/* Prompts / Q&A Section */}
                  {detailsPrompts && detailsPrompts.length > 0 && detailsPrompts.some((p: any) => p.question && p.answer) && (
                    <View style={{ marginTop: 16, gap: 12 }}>
                      {detailsPrompts
                        .filter((p: any) => p.question && p.answer)
                        .map((prompt: any, idx: number) => (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: "rgba(255,255,255,0.05)",
                              borderRadius: 18,
                              padding: 18,
                              borderWidth: 1,
                              borderColor: "rgba(184,134,11,0.2)",
                            }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginBottom: 8 }}>{prompt.question}</Text>
                            <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)" }}>{prompt.answer}</Text>
                          </View>
                        ))}
                    </View>
                  )}

                </View>
            </ScrollView>

              {/* Fixed Action Buttons bar (modal content scrolls behind) */}
              <View
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingBottom: Math.max(insets.bottom, 10) + 10,
                  paddingTop: 12,
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 48 }}>
                  {availableActions.showPass && (
                    <Pressable
                      onPress={() => {
                        // Always capture taps so they don't fall through to the scroll content (images) and open the gallery.
                        if (isSwiping) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        closeDetails();
                        setTimeout(() => sendSwipe("pass"), 150);
                      }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#000", fontSize: 24 }}>✕</Text>
                    </Pressable>
                  )}

                  {!hasCompliment && (!source || source === "likedMe") && (
                    <Pressable
                      onPress={() => {
                        if (isSwiping) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        closeDetails();
                        setTimeout(() => setComplimentModalVisible(true), 200);
                      }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "#EF4444",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DiamondIcon size={22} color="#FFFFFF" />
                    </Pressable>
                  )}

                  {availableActions.showLike && (
                    <Pressable
                      onPress={() => {
                        if (isSwiping) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        closeDetails();
                        setTimeout(() => sendSwipe("like"), 150);
                      }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "#B8860B",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFF", fontSize: 24 }}>♥</Text>
                    </Pressable>
                  )}
                </View>
              </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Keep gallery modal rendered LAST so it appears above the details sheet modal */}
      {renderGallery()}
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