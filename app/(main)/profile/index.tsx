import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable, Alert, Dimensions } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();
  
  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, blob, { contentType: `image/${ext}` });

  if (error) throw error;

  const { data } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  
  let completed = 0;
  const total = 10;
  
  if (profile.first_name && profile.last_name) completed++;
  if (profile.photos && profile.photos.length > 0) completed++;
  if (profile.height) completed++;
  if (profile.dob) completed++;
  if (profile.sect) completed++;
  if (profile.religious_practice) completed++;
  if (profile.education) completed++;
  if (profile.profession) completed++;
  if (profile.ethnicity && profile.nationality) completed++;
  if (profile.bio) completed++;
  
  return Math.round((completed / total) * 100);
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Handle name
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      
      setPhotos(data.photos || []);
    } catch (e: any) {
      console.error("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (targetIndex?: number) => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = status === 'granted';

      if (!hasPermission) {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = newStatus === 'granted';
      }

      if (!hasPermission) {
        Alert.alert("Permission needed", "We need access to your gallery to add photos.");
        return;
      }

      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0 && targetIndex === undefined) {
        Alert.alert("Limit reached", "You can only upload up to 6 photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUploading(true);
      const url = await uploadPhoto(result.assets[0].uri, user.id);

      if (targetIndex !== undefined) {
        const newPhotos = [...photos];
        newPhotos[targetIndex] = url;
        setPhotos(newPhotos);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const locationPoint = profile?.location && 
            typeof profile.location === 'object' &&
            typeof profile.location.lon === 'number' &&
            typeof profile.location.lat === 'number' &&
            !isNaN(profile.location.lon) &&
            !isNaN(profile.location.lat)
            ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
            : null;

          const updatePayload: any = {
            photos: newPhotos,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);
          
          if (updateError) {
            console.error("Error updating photos:", updateError);
            Alert.alert("Error", "Failed to save photo. Please try again.");
            // Revert the state change
            setPhotos(photos);
            return;
          }
          
          // Reload profile to ensure sync
          await loadProfile();
        }
      } else {
        const newPhotosArray = [...photos, url];
        setPhotos(newPhotosArray);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const locationPoint = profile?.location && 
            typeof profile.location === 'object' &&
            typeof profile.location.lon === 'number' &&
            typeof profile.location.lat === 'number' &&
            !isNaN(profile.location.lon) &&
            !isNaN(profile.location.lat)
            ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
            : null;

          const updatePayload: any = {
            photos: newPhotosArray,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);
          
          if (updateError) {
            console.error("Error updating photos:", updateError);
            Alert.alert("Error", "Failed to save photo. Please try again.");
            // Revert the state change
            setPhotos(photos);
            return;
          }
          
          // Reload profile to ensure sync
          await loadProfile();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (url: string) => {
    if (photos.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least 1 photo in your profile.");
      return;
    }
    const newPhotos = photos.filter((p) => p !== url);
    setPhotos(newPhotos);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const locationPoint = profile?.location && 
          typeof profile.location === 'object' &&
          typeof profile.location.lon === 'number' &&
          typeof profile.location.lat === 'number' &&
          !isNaN(profile.location.lon) &&
          !isNaN(profile.location.lat)
          ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
          : null;

          const updatePayload: any = {
            photos: newPhotos,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", user.id);
        
        if (updateError) {
          console.error("Error removing photo:", updateError);
          Alert.alert("Error", "Failed to remove photo. Please try again.");
          // Revert the state change
          setPhotos(photos);
          return;
        }
        
        console.log("Photo removed successfully, reloading profile...");
        // Reload profile to ensure sync
        await loadProfile();
      }
    } catch (e: any) {
      console.error("Error removing photo:", e);
      Alert.alert("Error", "Failed to remove photo. Please try again.");
      // Revert the state change
      setPhotos(photos);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  const mainPhoto = photos && photos.length > 0 ? photos[0] : null;
  const completionPercentage = calculateProfileCompletion(profile);
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile?.name || "Profile";

  return (
    <ScrollView className="flex-1 bg-black" showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-16 pb-8">
        {/* Header with Profile Picture */}
        <View className="items-center mb-8">
          {/* Profile Picture with Gold Circle and Completion Percentage */}
          <View className="relative mb-4">
            {/* Gold Circle Border */}
            <View className="w-36 h-36 rounded-full border-4 border-[#B8860B] items-center justify-center">
              {mainPhoto ? (
                <Image
                  source={{ uri: mainPhoto }}
                  className="w-32 h-32 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-32 h-32 rounded-full bg-white/10 items-center justify-center">
                  <Ionicons name="person" size={48} color="#9CA3AF" />
                </View>
              )}
              {/* Completion Percentage Badge */}
              <View className="absolute -bottom-2 bg-[#B8860B] px-3 py-1 rounded-full border-2 border-black">
                <Text className="text-white text-xs font-bold">
                  {completionPercentage}%
                </Text>
              </View>
            </View>
            {/* Edit Button - Pencil Icon positioned next to profile picture */}
            <Pressable
              onPress={() => router.push("/(main)/profile/edit")}
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 items-center justify-center"
              style={{ elevation: 4 }}
            >
              <Ionicons name="pencil" size={18} color="#B8860B" />
            </Pressable>
          </View>

          {/* Name */}
          <Text className="text-white text-3xl font-bold mb-2">
            {fullName}
          </Text>
          
          {/* Preview Profile Button */}
          <Pressable
            onPress={() => router.push("/(main)/profile/preview")}
            className="mt-2 px-6 py-2 bg-[#B8860B]/10 rounded-full border border-[#B8860B]/30"
          >
            <Text className="text-[#B8860B] text-base font-semibold">
              Preview my profile
            </Text>
          </Pressable>
        </View>

        {/* Photos Section */}
        <View className="mb-6">
          {/* Section Title */}
          <Text className="text-white text-xl font-bold mb-4">My Photos</Text>
          
          {/* 2x2 Grid Layout */}
          <View className="flex-row flex-wrap gap-4">
            {/* New Photo Card - Always show if less than 6 photos */}
            {photos.length < 6 && (
              <Pressable
                onPress={() => {
                  // Find first empty slot
                  const firstEmptyIndex = photos.length;
                  pickImage(firstEmptyIndex);
                }}
                disabled={uploading}
                className="w-[48%]"
                style={{ aspectRatio: 0.8 }}
              >
                <View 
                  className="rounded-3xl items-center justify-center w-full h-full"
                  style={{ 
                    backgroundColor: '#B8860B', // Gold color
                  }}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={48} color="#fff" style={{ marginBottom: 8 }} />
                      <Text className="text-white text-base font-semibold">New Photo</Text>
                      <Text className="text-white/80 text-xs mt-1 text-center">
                        {6 - photos.length} slot{6 - photos.length > 1 ? 's' : ''} left
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>
            )}
            
            {/* Existing Photo Cards */}
            {photos.map((photo, index) => (
              <View 
                key={`photo-${index}`} 
                className="w-[48%] relative"
                style={{ aspectRatio: 0.8 }}
              >
                <Image
                  source={{ uri: photo }}
                  className="w-full h-full rounded-3xl"
                  resizeMode="cover"
                />
                {index === 0 && (
                  <View className="absolute top-3 left-3 bg-[#B8860B] px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">Main</Text>
                  </View>
                )}
                <Pressable
                  className="absolute top-3 right-3 bg-red-500 w-7 h-7 rounded-full items-center justify-center"
                  onPress={() => removePhoto(photo)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
