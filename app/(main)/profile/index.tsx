import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable, Alert } from "react-native";
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
            id: user.id,
            photos: newPhotos,
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          await supabase.from("users").upsert(updatePayload);
        }
      } else {
        setPhotos([...photos, url]);
        
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
            id: user.id,
            photos: [...photos, url],
            last_active_at: new Date().toISOString(),
          };

          if (locationPoint) {
            updatePayload.location = locationPoint;
          }

          await supabase.from("users").upsert(updatePayload);
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
        id: user.id,
        photos: newPhotos,
        last_active_at: new Date().toISOString(),
      };

      if (locationPoint) {
        updatePayload.location = locationPoint;
      }

      await supabase.from("users").upsert(updatePayload);
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
          {/* Profile Picture with Edit Button */}
          <View className="relative mb-4">
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

          {/* Profile Completion */}
          <View className="w-full max-w-xs mb-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white/70 text-sm font-medium">
                Profile Completion
              </Text>
              <Text className="text-[#B8860B] text-sm font-semibold">
                {completionPercentage}%
              </Text>
            </View>
            <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <View 
                className="h-full bg-[#B8860B] rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </View>
          </View>
          
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
          <Text className="text-white text-xl font-semibold mb-4">Photos</Text>
          {photos.length < 6 && (
            <View className="bg-[#B8860B]/20 border border-[#B8860B]/30 rounded-xl p-3 mb-3">
              <Text className="text-[#B8860B] text-sm font-medium text-center">
                Add {6 - photos.length} more photo{6 - photos.length > 1 ? 's' : ''} to fully complete your profile
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap gap-3 justify-between">
            {Array.from({ length: 6 }).map((_, index) => {
              const photo = photos[index];
              const isEmpty = !photo;
              
              return isEmpty ? (
                <View
                  key={`empty-${index}`}
                  className="w-[30%] aspect-square"
                >
                  <Pressable
                    onPress={() => pickImage(index)}
                    disabled={uploading}
                    className="w-full h-full rounded-xl bg-white/5 items-center justify-center border-2 border-dashed border-white/30"
                  >
                    {uploading ? (
                      <ActivityIndicator color="#B8860B" size="small" />
                    ) : (
                      <>
                        <Ionicons name="add" size={32} color="#9CA3AF" />
                        <Text className="text-white/50 text-xs text-center mt-1">
                          {index === 0 ? "Main Photo" : `Photo ${index + 1}`}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View key={`photo-${index}`} className="w-[30%] aspect-square relative">
                  <Image
                    source={{ uri: photo }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                  {index === 0 && (
                    <View className="absolute top-1 left-1 bg-[#B8860B] px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold">Main</Text>
                    </View>
                  )}
                  <Pressable
                    className="absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                    onPress={() => removePhoto(photo)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
