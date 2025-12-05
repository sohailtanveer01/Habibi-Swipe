import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// Ethnicity options
const ETHNICITY_OPTIONS = [
  "Arab",
  "South Asian",
  "African",
  "East Asian",
  "Central Asian",
  "European",
  "North African",
  "Mixed",
  "Other",
  "Prefer not to say",
];

export default function EthnicityFilterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const { data } = await supabase
        .from("user_preferences")
        .select("ethnicity_preferences")
        .eq("user_id", user.id)
        .single();

      if (data && data.ethnicity_preferences) {
        setSelectedEthnicities(data.ethnicity_preferences);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      // Get existing preferences to preserve other filter settings
      const { data: existingPrefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            ethnicity_preferences: selectedEthnicities.length > 0 ? selectedEthnicities : null,
            location_enabled: existingPrefs?.location_enabled || false,
            location_filter_type: existingPrefs?.location_filter_type || null,
            search_radius_miles: existingPrefs?.search_radius_miles || null,
            search_location: existingPrefs?.search_location || null,
            search_country: existingPrefs?.search_country || null,
            age_min: existingPrefs?.age_min || null,
            age_max: existingPrefs?.age_max || null,
            height_min_cm: existingPrefs?.height_min_cm || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Ethnicity filter saved!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", error.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white/70 mt-4">Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="pt-14 px-6 pb-6 flex-row items-center justify-between border-b border-white/10">
        <Pressable 
          onPress={() => router.back()}
          className="px-2 py-1"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-2xl font-bold">Ethnicity</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ethnicity Filter */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Ethnicity</Text>
          <ScrollView
            style={styles.ethnicityList}
            className="bg-white/5 rounded-2xl"
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={true}
          >
            {ETHNICITY_OPTIONS.map((ethnicity) => {
              const isSelected = selectedEthnicities.includes(ethnicity);
              return (
                <Pressable
                  key={ethnicity}
                  className={`p-4 rounded-xl mb-2 ${
                    isSelected ? "bg-[#B8860B]" : "bg-white/5"
                  }`}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedEthnicities(selectedEthnicities.filter((e) => e !== ethnicity));
                    } else {
                      setSelectedEthnicities([...selectedEthnicities, ethnicity]);
                    }
                  }}
                  style={isSelected ? styles.selectedItem : styles.ethnicityItem}
                >
                  <Text
                    className={`text-base ${
                      isSelected ? "text-white font-bold" : "text-white/80 font-medium"
                    }`}
                  >
                    {ethnicity}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedEthnicities.length > 0 && (
            <View className="mt-4 bg-[#B8860B]/20 border border-[#B8860B]/30 p-4 rounded-xl">
              <Text className="text-white/70 text-sm font-medium mb-2">
                Selected ({selectedEthnicities.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedEthnicities.map((ethnicity) => (
                  <View key={ethnicity} className="bg-[#B8860B]/30 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-medium">{ethnicity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <Pressable
          className="bg-[#B8860B] p-5 rounded-2xl items-center mt-2 mb-4"
          onPress={savePreferences}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ethnicityList: {
    maxHeight: 400,
  },
  ethnicityItem: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedItem: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButton: {
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

