import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Image, View, Text, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";

export default function MainLayout() {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ec4899",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 50 : 28,
          left: 30,
          right: 30,
          elevation: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 65 : 58,
          borderRadius: 18,
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
          paddingTop: 2,
          paddingBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="swipe/index"
        options={{
          title: "Swipe",
          tabBarLabel: "Swipe",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 24 }}>💕</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="likes/index"
        options={{
          title: "Likes",
          tabBarLabel: "Likes",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 24 }}>❤️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Chat",
          tabBarLabel: "Chat",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 24 }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ size }) => {
            if (profilePhoto) {
              return (
                <View style={styles.profileIconWrapper}>
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{
                      width: size + 4,
                      height: size + 4,
                      borderRadius: (size + 4) / 2,
                    }}
                    resizeMode="cover"
                  />
                </View>
              );
            }
            return (
              <View
                style={{
                  width: size + 4,
                  height: size + 4,
                  borderRadius: (size + 4) / 2,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#ec4899",
                }}
              >
                <Text style={{ fontSize: (size + 4) * 0.6 }}>👤</Text>
              </View>
            );
          },
        }}
      />
      <Tabs.Screen name="chat/[chatId]" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
      <Tabs.Screen name="profile/preview" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  premiumGlass: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 18,
  },
  androidGlass: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
  },
  profileIconWrapper: {
    borderWidth: 2,
    borderColor: "#ec4899",
    borderRadius: 100,
    padding: 0,
  },
});
