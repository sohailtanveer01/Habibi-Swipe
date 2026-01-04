import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Tabs, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBadgeStore, useNewLikes, useTotalBadgeCount } from "../../lib/stores/badgeStore";
import { useMainPhoto, useUserStore } from "../../lib/stores/userStore";
import { supabase } from "../../lib/supabase";
import { useActiveStatus } from "../../lib/useActiveStatus";

const { width: SCREEN_WIDTH } = Dimensions.get("window");


export default function MainLayout() {
  // Zustand stores
  const profilePhoto = useMainPhoto();
  const totalUnreadCount = useTotalBadgeCount();
  const newLikesCount = useNewLikes();
  const loadProfile = useUserStore((s) => s.loadProfile);
  const loadAllCounts = useBadgeStore((s) => s.loadAllCounts);
  const setNewLikes = useBadgeStore((s) => s.setNewLikes);

  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const insets = useSafeAreaInsets();

  // Track user's active status (updates last_active_at periodically)
  useActiveStatus();

  // Check if we're on a chat detail screen or filters screen
  const isChatDetail = pathname?.includes("/chat/") && pathname !== "/chat";
  const isFiltersScreen = pathname?.includes("/swipe/filters");

  // Check if viewing from likes section (has source parameter in URL)
  const isViewingFromLikes = pathname?.includes("/swipe") && (searchParams?.source === "myLikes" || searchParams?.source === "likedMe" || searchParams?.source === "viewers" || searchParams?.source === "passedOn" || searchParams?.source === "chat");

  // Hide tab bar on chat detail or filters screen
  const hideTabBar = isChatDetail || isFiltersScreen;

  // Load profile on mount (uses Zustand store)
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Refresh profile when navigating (backup for catching updates)
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Check for unread messages and pending compliments (uses Zustand store)
  useEffect(() => {
    loadAllCounts();

    // Subscribe to new messages, message updates, and compliments
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "compliments" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "compliments" },
        () => {
          useBadgeStore.getState().loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAllCounts]);

  // Check for new likes (people who liked the current user)
  const checkNewLikesRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const checkNewLikes = async () => {
      console.log("🔍 checkNewLikes() called");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("⚠️ No user found");
        return;
      }

      console.log("👤 Checking likes for user:", user.id);

      const { data: swipes, error: swipesError } = await supabase
        .from("swipes")
        .select("swiper_id, action")
        .eq("swiped_id", user.id)
        .eq("action", "like");

      if (swipesError) {
        return;
      }

      if (!swipes || swipes.length === 0) {
        setNewLikes(0);
        return;
      }

      // Get all matches to exclude matched users
      const { data: matches } = await supabase
        .from("matches")
        .select("user1, user2")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`);

      // Get blocked users (both ways)
      const { data: blocksIBlocked } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      const { data: blocksIAmBlocked } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);

      // Create sets for filtering
      const matchedUserIds = new Set<string>();
      if (matches) {
        matches.forEach((match) => {
          if (match.user1 === user.id) {
            matchedUserIds.add(match.user2);
          } else {
            matchedUserIds.add(match.user1);
          }
        });
      }

      const blockedUserIds = new Set<string>();
      if (blocksIBlocked) {
        blocksIBlocked.forEach(block => blockedUserIds.add(block.blocked_id));
      }
      if (blocksIAmBlocked) {
        blocksIAmBlocked.forEach(block => blockedUserIds.add(block.blocker_id));
      }

      // Filter out matched and blocked users
      const uniqueLikerIds = new Set(swipes.map(s => s.swiper_id));
      const newLikesCount = Array.from(uniqueLikerIds).filter(
        (id) => !matchedUserIds.has(id) && !blockedUserIds.has(id)
      );

      setNewLikes(newLikesCount.length);
    };

    // Store the function in a ref so subscription callbacks can access the latest version
    checkNewLikesRef.current = checkNewLikes;

    checkNewLikes();

    // Subscribe to swipes table changes
    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("⚠️ No user found for subscription");
        return null;
      }

      console.log("📡 Setting up real-time subscription for user:", user.id);

      const newChannel = supabase
        .channel("new-likes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "swipes",
          },
          (payload) => {
            // Check if this swipe is for the current user
            if (payload.new.swiped_id === user.id && payload.new.action === "like") {
              if (checkNewLikesRef.current) {
                checkNewLikesRef.current();
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "matches",
          },
          () => {
            // Use the ref to get the latest function
            if (checkNewLikesRef.current) {
              checkNewLikesRef.current();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "swipes",
          },
          (payload) => {
            // Check if this swipe is for the current user
            if (payload.new.swiped_id === user.id) {
              if (checkNewLikesRef.current) {
                checkNewLikesRef.current();
              }
            }
          }
        )
        .subscribe();

      return newChannel;
    };

    setupSubscription().then((ch) => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setNewLikes]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000", // Black for active icon
        tabBarInactiveTintColor: "#FFFFFF", // White for inactive icons
        tabBarStyle: hideTabBar ? { display: "none" } : {
          position: "absolute",
          bottom: Math.max(insets.bottom, 10) + 8, // Use safe area inset + padding
          left: 0,
          right: 0,
          marginHorizontal: SCREEN_WIDTH * 0.1, // 10% margin = 80% width centered
          elevation: 20,
          backgroundColor: "rgba(237, 237, 237, 0.6)", // More transparent
          borderTopWidth: 0,
          height: 75,
          borderRadius: 35,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 8,
          overflow: "hidden", // Clip content to prevent shadow bleed
          // Minimal shadow to prevent visible shade outside
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.01,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill}>
              <View style={styles.tabBarBackground} />
            </BlurView>
          ) : (
            <View style={styles.tabBarBackground} />
          ),
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 4,
          borderRadius: 20,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="swipe/index"
        options={{
          title: "Swipe",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => {
            // If viewing from likes, make swipe tab inactive
            const isActive = !isViewingFromLikes && focused;
            return (
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>

                <MaterialCommunityIcons name={isActive ? "cards" : "cards-outline"} size={36} color={isActive ? "#B8860B" : "#9CA3AF"} />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="likes/index"
        options={{
          title: "Likes",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => {
            // If viewing from likes, make likes tab active
            const isActive = isViewingFromLikes || focused;
            return (
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer, { position: "relative" }]}>
                <Ionicons
                  name={isActive ? "heart" : "heart-outline"}
                  size={36}
                  color={isActive ? "#B8860B" : "#9CA3AF"}
                />
                {newLikesCount > 0 && (
                  <View style={styles.likesCountBadge}>
                    <Text style={styles.likesCountText}>
                      {newLikesCount > 99 ? "99+" : newLikesCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chats",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer, { position: "relative" }]}>
              <Ionicons
                name={focused ? "paper-plane" : "paper-plane-outline"}
                size={32}
                color={focused ? "#B8860B" : "#9CA3AF"}
              />
              {totalUnreadCount > 0 && (
                <View style={styles.likesCountBadge}>
                  <Text style={styles.likesCountText}>
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarLabel: "",
          tabBarIcon: ({ size, focused }) => {
            if (profilePhoto) {
              return (
                <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 17,
                    }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </View>
              );
            }
            return (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 17,
                    backgroundColor: "#9CA3AF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#FFFFFF" }}>👤</Text>
                </View>
              </View>
            );
          },
        }}
      />
      <Tabs.Screen name="chat/[chatId]" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
      <Tabs.Screen name="profile/preview" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/index" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/location" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/age" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/height" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/ethnicity" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/marital-status" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/children" options={{ href: null }} />
      <Tabs.Screen name="swipe/filters/religiosity" options={{ href: null }} />
      <Tabs.Screen name="profile/subscription" options={{ href: null }} />
      <Tabs.Screen name="chat/unmatches" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/account-info" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      <Tabs.Screen name="chat/user-profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(237, 237, 237, 0.6)",
    borderRadius: 35,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    borderWidth: 2,
    borderColor: "#B8860B", // Gold border for active tab
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444", // Red dot for notifications
  },
  likesCountBadge: {
    position: "absolute",
    top: -8,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  likesCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});