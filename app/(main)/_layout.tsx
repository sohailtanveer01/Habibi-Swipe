import { Tabs, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Image, View, Text, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { BlurView } from "expo-blur";

export default function MainLayout() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  
  // Check if we're on a chat detail screen or filters screen
  const isChatDetail = pathname?.includes("/chat/") && pathname !== "/chat";
  const isFiltersScreen = pathname?.includes("/swipe/filters");
  
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
        tabBarActiveTintColor: "#F5F573",
        tabBarInactiveTintColor: "#000000",
        tabBarStyle: hideTabBar ? { display: "none" } : {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 60 : 28,
          left: 30,
          right: 30,
          elevation: 20,
          backgroundColor: "#EDEDED",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 65 : 58,
          borderRadius: 28,
          overflow: "hidden",
          // Premium shadow
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
            },
            android: {
              elevation: 12,
            },
          }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill}  >
              <View style={styles.premiumGlass} />
            </BlurView>
          ) : (
            <View style={styles.androidGlass} />
          ),
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="swipe/index"
        options={{
          title: "Swipe",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="likes/index"
        options={{
          title: "Likes",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "heart" : "heart-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chats",
          tabBarLabel: "",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: "relative" }}>
              <Ionicons 
                name={focused ? "chatbubble" : "chatbubble-outline"} 
                size={24} 
                color={color} 
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
          tabBarIcon: ({ size }) => {
            if (profilePhoto) {
              return (
                <Image
                  source={{ uri: profilePhoto }}
                  style={{
                    width: size + 8,
                    height: size + 8,
                    borderRadius: (size + 4) / 2,
                    borderWidth: 2,
                    borderColor: "#ffffff",
                  }}
                  resizeMode="cover"
                />
              );
            }
            return (
              <View
                style={{
                  width: size + 4,
                  height: size + 4,
                  borderRadius: (size + 4) / 2,
                  backgroundColor: "#9ca3af",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#ffffff",
                }}
              >
                <Text style={{ fontSize: (size + 4) * 0.6, color: "#ffffff" }}>👤</Text>
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444", // Red dot
  },
});
