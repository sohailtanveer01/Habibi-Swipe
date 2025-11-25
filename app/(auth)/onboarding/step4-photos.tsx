import { View, Text, Pressable, Image, FlatList, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useRouter } from "expo-router";
import { useState } from "react";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  // React Native: Read file as base64 and convert to ArrayBuffer
  const response = await fetch(uri);
  const blob = await response.arrayBuffer();
  
  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, blob, {
      contentType: `image/${ext}`,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function Step4Photos() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    console.log("pickImage called");
    try {

      // 1. Check & request permission
      console.log("Checking permissions...");
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log("Existing permission status:", existingStatus);
      
      let hasPermission = existingStatus === 'granted';
      
      if (!hasPermission) {
        console.log("Requesting permission...");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log("Permission request result:", status);
        hasPermission = status === 'granted';
      }

      if (!hasPermission) {
        Alert.alert(
          "Permission needed",
          "We need access to your gallery to add photos. Please enable photo permissions in your device settings."
        );
        return;
      }

      // 2. Calculate remaining slots
      const remainingSlots = 6 - data.photos.length;
      console.log("Remaining slots:", remainingSlots);

      if (remainingSlots <= 0) {
        Alert.alert("Limit reached", "You can only upload up to 6 photos.");
        return;
      }

      // 3. Open gallery
      console.log("Launching image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      console.log("Image picker result:", result.canceled ? "Canceled" : `Selected ${result.assets?.length || 0} images`);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // Check if user is authenticated - if not, store local URIs temporarily
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is authenticated - upload immediately
        setUploading(true);
        const uploadPromises = result.assets.map((asset) =>
          uploadPhoto(asset.uri, user.id)
        );
        const urls = await Promise.all(uploadPromises);
        console.log("Uploaded URLs:", urls);
        setData((d) => ({ ...d, photos: [...d.photos, ...urls] }));
      } else {
        // User not authenticated yet - store local URIs temporarily
        // These will be uploaded when user completes onboarding
        const localUris = result.assets.map((asset) => asset.uri);
        console.log("Storing local URIs (will upload later):", localUris);
        setData((d) => ({ ...d, photos: [...d.photos, ...localUris] }));
      }
    } catch (e: any) {
      console.error("Error in pickImage:", e);
      Alert.alert("Error", e.message || "Failed to pick/upload photos. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setData((d) => ({ ...d, photos: d.photos.filter((p) => p !== url) }));
  };

  const next = () => {
    if (data.photos.length < 3) {
      alert("Please upload at least 3 photos.");
      return;
    }
    router.push("/onboarding/step5-location");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-3xl font-bold mb-2">Your Photos</Text>
      <Text className="text-white/70 mb-4">Upload 3–6 best photos.</Text>

      <Pressable
        className="bg-white/10 p-4 rounded-2xl items-center mb-4"
        onPress={pickImage}
        disabled={uploading || data.photos.length >= 6}
      >
        <Text className="text-white font-semibold ">
          {uploading ? "Uploading..." : `Add Photos (${data.photos.length}/6)`}
        </Text>
      </Pressable>

      <FlatList
        data={data.photos}
        numColumns={3}
        keyExtractor={(u) => u}
        columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => removePhoto(item)}>
            <Image
              source={{ uri: item }}
              className="w-24 h-32 rounded-xl"
            />
          </Pressable>
        )}
      />

      <Pressable
        className="bg-pink-500 p-4 rounded-2xl items-center mt-auto mb-4"
        onPress={next}
      >
        <Text className="text-white text-lg font-semibold">Next</Text>
      </Pressable>

      <Text className="text-white/40 text-xs text-center mb-6">
        Long-press a photo to remove it.
      </Text>
    </View>
  );
}
