import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../../../lib/supabase";
import Slider from "@react-native-community/slider";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Image } from "expo-image";

const MAX_RADIUS_MILES = 400;

// Common countries list
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden",
  "Norway", "Denmark", "Finland", "Poland", "Ireland", "Portugal", "Greece",
  "Turkey", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman",
  "Jordan", "Lebanon", "Egypt", "Pakistan", "India", "Bangladesh", "Malaysia",
  "Singapore", "Indonesia", "Philippines", "Thailand", "Japan", "South Korea",
  "China", "Brazil", "Mexico", "Argentina", "Chile", "South Africa", "Nigeria",
  "Kenya", "Morocco", "Tunisia", "Algeria", "Other"
];

type LocationFilterType = "distance" | "country" | null;

export default function FiltersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [filterType, setFilterType] = useState<LocationFilterType>(null);
  const [searchRadiusMiles, setSearchRadiusMiles] = useState(50);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  useEffect(() => {
    loadPreferences();
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filterType === "distance" && userLocation) {
      // Update map region to show user location with appropriate zoom
      const radiusKm = (searchRadiusMiles * 1.60934); // Convert miles to km
      const delta = (radiusKm / 111) * 2.5; // Approximate degrees for radius
      
      setMapRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lon,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
    }
  }, [filterType, userLocation, searchRadiusMiles]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("photos, location")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserProfile(data);
        
        // Extract user's location from profile
        if (data.location) {
          const locationStr = data.location;
          const match = locationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (match) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            setUserLocation({ lat, lon });
            setSearchLocation({ lat, lon });
          }
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading preferences:", error);
      }

      if (data) {
        setLocationEnabled(data.location_enabled || false);
        setFilterType(data.location_filter_type || "distance");
        setSearchRadiusMiles(data.search_radius_miles || 50);
        setSelectedCountry(data.search_country || "");
        
        // Extract lat/lon from PostGIS point if exists
        if (data.search_location) {
          const locationStr = data.search_location;
          const match = locationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (match) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            setSearchLocation({ lat, lon });
            if (!userLocation) {
              setUserLocation({ lat, lon });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to use location filters.");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      setUserLocation({ lat, lon });
      setSearchLocation({ lat, lon });
      setLocationEnabled(true);
      setFilterType("distance");
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your location. Please try again.");
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

      let locationPoint: string | null = null;
      let searchRadiusMilesValue: number | null = null;
      let searchCountryValue: string | null = null;

      if (locationEnabled) {
        if (filterType === "distance") {
          if (!searchLocation) {
            Alert.alert("Error", "Please set a location for distance filtering.");
            setSaving(false);
            return;
          }
          locationPoint = `SRID=4326;POINT(${searchLocation.lon} ${searchLocation.lat})`;
          searchRadiusMilesValue = searchRadiusMiles;
          // Clear country when saving distance filter
          searchCountryValue = null;
        } else if (filterType === "country") {
          if (!selectedCountry) {
            Alert.alert("Error", "Please select a country.");
            setSaving(false);
            return;
          }
          searchCountryValue = selectedCountry;
          // Clear distance settings when saving country filter
          locationPoint = null;
          searchRadiusMilesValue = null;
        }
      }

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            location_enabled: locationEnabled,
            location_filter_type: filterType,
            search_radius_miles: searchRadiusMilesValue,
            search_location: locationPoint,
            search_country: searchCountryValue,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      Alert.alert("Success", "Preferences saved! Swipe feed will update with your filters.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", error.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !userLocation) {
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
      <View className="pt-12 px-4 pb-4 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-lg">← Back</Text>
        </Pressable>
        <Text className="text-white text-xl font-bold">Location Filters</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Location Toggle */}
        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-3">Enable Location Filter</Text>
          <Pressable
            className={`p-4 rounded-2xl ${locationEnabled ? "bg-pink-500" : "bg-white/10"}`}
            onPress={() => setLocationEnabled(!locationEnabled)}
          >
            <Text className={`text-center font-semibold ${locationEnabled ? "text-white" : "text-white/70"}`}>
              {locationEnabled ? "Location Filter Enabled" : "Location Filter Disabled"}
            </Text>
          </Pressable>
        </View>

        {locationEnabled && (
          <>
            {/* Filter Type Selection */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">Filter Type</Text>
              <View className="flex-row gap-3">
                <Pressable
                  className={`flex-1 p-4 rounded-2xl ${
                    filterType === "distance" ? "bg-pink-500" : "bg-white/10"
                  }`}
                  onPress={() => {
                    setFilterType("distance");
                    // Clear country selection when switching to distance
                    setSelectedCountry("");
                    if (!userLocation) {
                      getCurrentLocation();
                    }
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      filterType === "distance" ? "text-white" : "text-white/70"
                    }`}
                  >
                    Select by Distance
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 p-4 rounded-2xl ${
                    filterType === "country" ? "bg-pink-500" : "bg-white/10"
                  }`}
                  onPress={() => {
                    setFilterType("country");
                    // Clear distance-related settings when switching to country
                    setSearchLocation(null);
                    setSearchRadiusMiles(50);
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      filterType === "country" ? "text-white" : "text-white/70"
                    }`}
                  >
                    Select by Country
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Distance Filter with Map */}
            {filterType === "distance" && (
              <View className="mb-6">
                {!userLocation ? (
                  <View className="mb-4">
                    <Pressable
                      className="bg-white/10 p-4 rounded-2xl items-center"
                      onPress={getCurrentLocation}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-semibold">📍 Get My Location</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text className="text-white text-lg font-semibold mb-3">
                      Search Radius: {searchRadiusMiles} miles
                    </Text>

                    {/* Map View */}
                    <View style={styles.mapContainer}>
                      <MapView
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        scrollEnabled={true}
                        zoomEnabled={true}
                      >
                        {/* User Location Marker with Profile Picture */}
                        {userLocation && (
                          <Marker
                            coordinate={{
                              latitude: userLocation.lat,
                              longitude: userLocation.lon,
                            }}
                            anchor={{ x: 0.5, y: 0.5 }}
                          >
                            <View style={styles.markerContainer}>
                              {userProfile?.photos?.[0] ? (
                                <Image
                                  source={{ uri: userProfile.photos[0] }}
                                  style={styles.profileImage}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={styles.profilePlaceholder}>
                                  <Text style={styles.profilePlaceholderText}>👤</Text>
                                </View>
                              )}
                            </View>
                          </Marker>
                        )}

                        {/* Radius Circle */}
                        {userLocation && (
                          <Circle
                            center={{
                              latitude: userLocation.lat,
                              longitude: userLocation.lon,
                            }}
                            radius={searchRadiusMiles * 1609.34} // Convert miles to meters
                            fillColor="rgba(255, 235, 59, 0.3)" // Yellow transparent
                            strokeColor="rgba(255, 235, 59, 0.6)"
                            strokeWidth={2}
                          />
                        )}
                      </MapView>
                    </View>

                    {/* Radius Slider */}
                    <View className="mt-4">
                      <Slider
                        style={{ width: "100%", height: 40 }}
                        minimumValue={1}
                        maximumValue={MAX_RADIUS_MILES}
                        step={1}
                        value={searchRadiusMiles}
                        onValueChange={setSearchRadiusMiles}
                        minimumTrackTintColor="#EC4899"
                        maximumTrackTintColor="#ffffff33"
                        thumbTintColor="#EC4899"
                      />
                      <View className="flex-row justify-between mt-2">
                        <Text className="text-white/70 text-xs">1 mile</Text>
                        <Text className="text-white/70 text-xs">{MAX_RADIUS_MILES} miles</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Country Filter */}
            {filterType === "country" && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-3">Select Country</Text>
                <ScrollView
                  style={{ maxHeight: 300 }}
                  className="bg-white/5 rounded-xl p-2"
                  showsVerticalScrollIndicator={true}
                >
                  {COUNTRIES.map((country) => (
                    <Pressable
                      key={country}
                      className={`p-3 rounded-lg mb-1 ${
                        selectedCountry === country ? "bg-pink-500" : "bg-transparent"
                      }`}
                      onPress={() => setSelectedCountry(country)}
                    >
                      <Text
                        className={`${
                          selectedCountry === country ? "text-white font-semibold" : "text-white/70"
                        }`}
                      >
                        {country}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {selectedCountry && (
                  <View className="mt-3 bg-white/5 p-3 rounded-xl">
                    <Text className="text-white/70 text-sm">Selected:</Text>
                    <Text className="text-white font-semibold">{selectedCountry}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Save Button */}
        <Pressable
          className="bg-pink-500 p-4 rounded-2xl items-center mb-8 mt-4"
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Save Preferences</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#EC4899",
    overflow: "hidden",
    backgroundColor: "white",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePlaceholderText: {
    fontSize: 24,
  },
});
