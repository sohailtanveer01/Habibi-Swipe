import { Tabs, usePathname, useGlobalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { BlurView } from "expo-blur";
import { useActiveStatus } from "../../lib/useActiveStatus";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function MainLayout() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  
  // Track user's active status (updates last_active_at periodically)
  useActiveStatus();
  
  // Check if we're on a chat detail screen or filters screen
  const isChatDetail = pathname?.includes("/chat/") && pathname !== "/chat";
  const isFiltersScreen = pathname?.includes("/swipe/filters");
  
  // Check if viewing from likes section (has source parameter in URL)
  const isViewingFromLikes = pathname?.includes("/swipe") && (searchParams?.source === "myLikes" || searchParams?.source === "likedMe" || searchParams?.source === "viewers" || searchParams?.source === "passedOn" || searchParams?.source === "chat");
  
  // Hide tab bar on chat detail or filters screen
  const hideTabBar = isChatDetail || isFiltersScreen;

  useEffect(() => {
    const loadProfilePhoto = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("photos")
        .eq("id", user.id)
        .single();

      if (data?.photos && data.photos.length > 0) {
        setProfilePhoto(data.photos[0]);
      } else {
        setProfilePhoto(null);
      }
    };

    loadProfilePhoto();

    const channel = supabase
      .channel("profile-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && payload.new.id === user.id && payload.new.photos) {
            if (payload.new.photos.length > 0) {
              setProfilePhoto(payload.new.photos[0]);
            } else {
              setProfilePhoto(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check for unread messages
  useEffect(() => {
    const checkUnreadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all matches for the user
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`);

      if (matches && matches.length > 0) {
        // Count unread messages (messages not sent by current user AND read = false)
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("match_id", matches.map(m => m.id))
          .neq("sender_id", user.id)
          .eq("read", false);

        setUnreadCount(count || 0);
      } else {
        setUnreadCount(0);
      }
    };

    checkUnreadMessages();

    // Subscribe to new messages and message updates (when marked as read)
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          checkUnreadMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000", // Black for active icon
        tabBarInactiveTintColor: "#FFFFFF", // White for inactive icons
        tabBarStyle: hideTabBar ? { display: "none" } : {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 34 : 20,
          left: 20,
          right: 20,
          elevation: 20,
          backgroundColor: "rgba(237, 237, 237, 0.6)", // More transparent
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 70 : 65,
          borderRadius: 35,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 12,
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
              
                <MaterialCommunityIcons name= "cards-outline" size={28} color={isActive ? "#B8860B" : "#9CA3AF"} />
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
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons 
                  name={isActive ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isActive ? "#B8860B" : "#9CA3AF"} 
                />
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
                name={focused ? "chatbubble" : "chatbubble-outline"} 
                size={28} 
                color={focused ? "#B8860B" : "#9CA3AF"} 
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <View style={styles.notificationDot} />
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
                      width: 32,
                      height: 32,
                      borderRadius: 16,
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
                    width: 32,
                    height: 32,
                    borderRadius: 16,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
});
