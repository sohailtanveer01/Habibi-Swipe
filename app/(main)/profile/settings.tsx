import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: SettingsItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 bg-white/5 rounded-2xl mb-3"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-[#B8860B]/20'}`}>
        <Ionicons name={icon} size={20} color={danger ? "#EF4444" : "#B8860B"} />
      </View>
      <View className="flex-1 ml-3">
        <Text className={`text-base font-medium ${danger ? 'text-red-500' : 'text-white'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-400 text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Error logging out:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // TODO: Implement account deletion
            Alert.alert("Coming Soon", "Account deletion will be available soon. Please contact support for now.");
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-xl font-bold ml-4">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text className="text-gray-400 text-sm font-medium mb-3 mt-4">ACCOUNT</Text>
        
        <SettingsItem
          icon="person-outline"
          title="Account Information"
          subtitle="Email, phone number"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />
        
        <SettingsItem
          icon="notifications-outline"
          title="Notifications"
          subtitle="Push notifications, email alerts"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />
        
        <SettingsItem
          icon="lock-closed-outline"
          title="Privacy"
          subtitle="Profile visibility, blocking"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />

        {/* Preferences Section */}
        <Text className="text-gray-400 text-sm font-medium mb-3 mt-6">PREFERENCES</Text>
        
        <SettingsItem
          icon="options-outline"
          title="Discovery Settings"
          subtitle="Age range, distance, filters"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />
        
        <SettingsItem
          icon="language-outline"
          title="Language"
          subtitle="English"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />

        {/* Support Section */}
        <Text className="text-gray-400 text-sm font-medium mb-3 mt-6">SUPPORT</Text>
        
        <SettingsItem
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="FAQ, contact us"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />
        
        <SettingsItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />
        
        <SettingsItem
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => Alert.alert("Coming Soon", "This feature is coming soon.")}
        />

        {/* Danger Zone */}
        <Text className="text-gray-400 text-sm font-medium mb-3 mt-6">DANGER ZONE</Text>
        
        <SettingsItem
          icon="log-out-outline"
          title="Log Out"
          onPress={handleLogout}
          showChevron={false}
          danger
        />
        
        <SettingsItem
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account"
          onPress={handleDeleteAccount}
          showChevron={false}
          danger
        />

        {/* App Version */}
        <View className="items-center py-8">
          <Text className="text-gray-500 text-sm">Habibi Swipe v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {loggingOut && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="large" color="#B8860B" />
          <Text className="text-white mt-4">Logging out...</Text>
        </View>
      )}
    </View>
  );
}

