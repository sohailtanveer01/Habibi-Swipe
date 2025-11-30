import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../../../lib/supabase";
import Slider from "@react-native-community/slider";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Image } from "expo-image";

const MAX_RADIUS_MILES = 400;
const MIN_AGE = 18;
const MAX_AGE = 100;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

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

type LocationFilterType = "distance" | "country" | null;

export default function FiltersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
  
  // Age filter
  const [ageMin, setAgeMin] = useState<number | null>(null);
  const [ageMax, setAgeMax] = useState<number | null>(null);
  
  // Height filter
  const [heightMinCm, setHeightMinCm] = useState<number | null>(null);
  
  // Ethnicity filter
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);

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
        setFilterType(data.location_filter_type || "distance");
        setSearchRadiusMiles(data.search_radius_miles || 50);
        setSelectedCountry(data.search_country || "");
        setAgeMin(data.age_min || null);
        setAgeMax(data.age_max || null);
        setHeightMinCm(data.height_min_cm || null);
        setSelectedEthnicities(data.ethnicity_preferences || []);
        
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

      // Location is enabled if a filter type is selected
      const isLocationFilterEnabled = !!filterType;
      
      if (isLocationFilterEnabled) {
        if (filterType === "distance") {
          // Use searchLocation if set, otherwise fall back to userLocation
          const locationToUse = searchLocation || userLocation;
          if (!locationToUse) {
            Alert.alert("Error", "Please set a location for distance filtering. Tap 'Get My Location' to use your current location.");
            setSaving(false);
            return;
          }
          locationPoint = `SRID=4326;POINT(${locationToUse.lon} ${locationToUse.lat})`;
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
            location_enabled: isLocationFilterEnabled,
            location_filter_type: filterType,
            search_radius_miles: searchRadiusMilesValue,
            search_location: locationPoint,
            search_country: searchCountryValue,
            age_min: ageMin,
            age_max: ageMax,
            height_min_cm: heightMinCm,
            ethnicity_preferences: selectedEthnicities.length > 0 ? selectedEthnicities : null,
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
      <View className="pt-14 px-6 pb-6 flex-row items-center justify-between border-b border-white/10">
        <Pressable 
          onPress={() => router.back()}
          className="px-2 py-1"
        >
          <Text className="text-white text-lg font-medium">← Back</Text>
        </Pressable>
        <Text className="text-white text-2xl font-bold">Location Filters</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Type Selection */}
        <View className="mb-8">
          <Text className="text-white text-2xl font-bold mb-6">Choose Your Filter</Text>
              <View className="flex-row gap-3">
                <Pressable
                  className={`flex-1 p-4 rounded-2xl ${
                    filterType === "distance" ? "bg-pink-500" : "bg-white/10"
                  }`}
                  onPress={() => {
                    setFilterType("distance");
                    // Clear country selection when switching to distance
                    setSelectedCountry("");
                    if (userLocation) {
                      // Use existing user location
                      setSearchLocation(userLocation);
                    } else {
                      // Get current location if not available
                      getCurrentLocation();
                    }
                  }}
                  style={filterType === "distance" ? styles.activeFilterButton : styles.inactiveFilterButton}
                >
                  <Text
                    className={`text-center font-semibold text-sm ${
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
                  style={filterType === "country" ? styles.activeFilterButton : styles.inactiveFilterButton}
                >
                  <Text
                    className={`text-center font-semibold text-sm ${
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
              <View className="mb-8">
                {!userLocation ? (
                  <View className="mb-6">
                    <Pressable
                      className="bg-white/10 p-5 rounded-2xl items-center border border-white/20"
                      onPress={getCurrentLocation}
                      disabled={loading}
                      style={styles.getLocationButton}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text className="text-white font-bold text-base mb-1">📍</Text>
                          <Text className="text-white font-semibold text-base">Get My Location</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View className="mb-4">
                      <Text className="text-white text-lg font-bold mb-1">
                        Search Radius
                      </Text>
                      <Text className="text-pink-400 text-2xl font-bold">
                        {searchRadiusMiles} miles
                      </Text>
                    </View>

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
                    <View className="mt-6">
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
                      <View className="flex-row justify-between mt-3">
                        <Text className="text-white/60 text-xs font-medium">1 mile</Text>
                        <Text className="text-white/60 text-xs font-medium">{MAX_RADIUS_MILES} miles</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
        )}

        {/* Country Filter */}
        {filterType === "country" && (
              <View className="mb-8">
                <Text className="text-white text-lg font-bold mb-4">Select Country</Text>
                <ScrollView
                  style={styles.countryList}
                  className="bg-white/5 rounded-2xl"
                  contentContainerStyle={{ padding: 12 }}
                  showsVerticalScrollIndicator={true}
                >
                  {COUNTRIES.map((country) => (
                    <Pressable
                      key={country}
                      className={`p-4 rounded-xl mb-2 ${
                        selectedCountry === country ? "bg-pink-500" : "bg-white/5"
                      }`}
                      onPress={() => setSelectedCountry(country)}
                      style={selectedCountry === country ? styles.selectedCountryItem : styles.countryItem}
                    >
                      <Text
                        className={`text-base ${
                          selectedCountry === country ? "text-white font-bold" : "text-white/80 font-medium"
                        }`}
                      >
                        {country}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {selectedCountry && (
                  <View className="mt-4 bg-pink-500/20 border border-pink-500/30 p-4 rounded-xl">
                    <Text className="text-white/70 text-sm font-medium mb-1">Selected Country</Text>
                    <Text className="text-white font-bold text-lg">{selectedCountry}</Text>
                  </View>
                )}
              </View>
        )}

        {/* Age Filter */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Age Range</Text>
          <View className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2">Minimum Age</Text>
              <View className="flex-row items-center gap-4">
                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={MIN_AGE}
                  maximumValue={ageMax || MAX_AGE}
                  step={1}
                  value={ageMin || MIN_AGE}
                  onValueChange={(value) => setAgeMin(Math.floor(value))}
                  minimumTrackTintColor="#EC4899"
                  maximumTrackTintColor="#ffffff33"
                  thumbTintColor="#EC4899"
                />
                <Text className="text-white font-bold text-lg w-12 text-right">
                  {ageMin || MIN_AGE}
                </Text>
              </View>
            </View>
            <View>
              <Text className="text-white/70 text-sm mb-2">Maximum Age</Text>
              <View className="flex-row items-center gap-4">
                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={ageMin || MIN_AGE}
                  maximumValue={MAX_AGE}
                  step={1}
                  value={ageMax || MAX_AGE}
                  onValueChange={(value) => setAgeMax(Math.floor(value))}
                  minimumTrackTintColor="#EC4899"
                  maximumTrackTintColor="#ffffff33"
                  thumbTintColor="#EC4899"
                />
                <Text className="text-white font-bold text-lg w-12 text-right">
                  {ageMax || MAX_AGE}
                </Text>
              </View>
            </View>
            <Pressable
              className="mt-4 bg-white/10 p-3 rounded-xl"
              onPress={() => {
                setAgeMin(null);
                setAgeMax(null);
              }}
            >
              <Text className="text-white/70 text-center font-medium">Clear Age Filter</Text>
            </Pressable>
          </View>
        </View>

        {/* Height Filter */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Minimum Height</Text>
          <View className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <View>
              <Text className="text-white/70 text-sm mb-2">Minimum Height (cm)</Text>
              <View className="flex-row items-center gap-4">
                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={MIN_HEIGHT_CM}
                  maximumValue={MAX_HEIGHT_CM}
                  step={5}
                  value={heightMinCm || MIN_HEIGHT_CM}
                  onValueChange={(value) => setHeightMinCm(Math.floor(value))}
                  minimumTrackTintColor="#EC4899"
                  maximumTrackTintColor="#ffffff33"
                  thumbTintColor="#EC4899"
                />
                <Text className="text-white font-bold text-lg w-16 text-right">
                  {heightMinCm || MIN_HEIGHT_CM} cm
                </Text>
              </View>
            </View>
            <Pressable
              className="mt-4 bg-white/10 p-3 rounded-xl"
              onPress={() => {
                setHeightMinCm(null);
              }}
            >
              <Text className="text-white/70 text-center font-medium">Clear Height Filter</Text>
            </Pressable>
          </View>
        </View>

        {/* Ethnicity Filter */}
        <View className="mb-8">
          <Text className="text-white text-lg font-bold mb-4">Ethnicity</Text>
          <ScrollView
            style={styles.countryList}
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
                    isSelected ? "bg-pink-500" : "bg-white/5"
                  }`}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedEthnicities(selectedEthnicities.filter((e) => e !== ethnicity));
                    } else {
                      setSelectedEthnicities([...selectedEthnicities, ethnicity]);
                    }
                  }}
                  style={isSelected ? styles.selectedCountryItem : styles.countryItem}
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
            <View className="mt-4 bg-pink-500/20 border border-pink-500/30 p-4 rounded-xl">
              <Text className="text-white/70 text-sm font-medium mb-2">
                Selected ({selectedEthnicities.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedEthnicities.map((ethnicity) => (
                  <View key={ethnicity} className="bg-pink-500/30 px-3 py-1.5 rounded-full">
                    <Text className="text-white text-xs font-medium">{ethnicity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <Pressable
          className="bg-pink-500 p-5 rounded-2xl items-center mt-2 mb-4"
          onPress={savePreferences}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Save Preferences</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  enabledButton: {
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  activeFilterButton: {
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveFilterButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  getLocationButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: {
    width: "100%",
    height: 400,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#EC4899",
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 28,
  },
  countryList: {
    maxHeight: 350,
  },
  countryItem: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectedCountryItem: {
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButton: {
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
