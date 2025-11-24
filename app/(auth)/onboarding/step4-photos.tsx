// import { View, Text, Pressable, Image, FlatList } from "react-native";
// import * as ImagePicker from "expo-image-picker";
// import { supabase } from "../../../lib/supabase";
// import { useOnboarding } from "../../../lib/onboardingStore";
// import { useRouter } from "expo-router";
// import { useState } from "react";

// async function uploadPhoto(uri: string, userId: string) {
//   const ext = uri.split(".").pop() || "jpg";
//   const filePath = `${userId}/${Date.now()}.${ext}`;

//   const res = await fetch(uri);
//   const blob = await res.blob();

//   const { error } = await supabase.storage
//     .from("profile-photos")
//     .upload(filePath, blob, { contentType: `image/${ext}` });

//   if (error) throw error;

//   const { data } = supabase.storage
//     .from("profile-photos")
//     .getPublicUrl(filePath);

//   return data.publicUrl;
// }

// export default function Step4Photos() {
//   const router = useRouter();
//   const { data, setData } = useOnboarding();
//   const [uploading, setUploading] = useState(false);
//   const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
//   const pickImage = async () => {
//     const user = (await supabase.auth.getUser()).data.user;
//     if (!user) return;
  
//     // 1. Check & request permission
//     if (!permission?.granted) {
//       const p = await requestPermission();
//       console.log("Permission response → ", p);
  
//       if (!p.granted) {
//         alert("We need permission to access your photos.");
//         return;
//       }
//     }
  
//     // 2. Open gallery
//     const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ["images"],
//         allowsMultipleSelection: true,
//         selectionLimit: slots - data.filter((item) => item.photo).length,
//         aspect: [4, 3],
//         quality: 1,
//       });
  
//     if (result.canceled) return;
  
//     try {
//       setUploading(true);
//       const url = await uploadPhoto(result.assets[0].uri, user.id);
//       setData((d) => ({ ...d, photos: [...d.photos, url] }));
//     } catch (e: any) {
//       alert(e.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const removePhoto = (url: string) => {
//     setData((d) => ({ ...d, photos: d.photos.filter((p) => p !== url) }));
//   };

//   const next = () => {
//     if (data.photos.length < 3) {
//       alert("Please upload at least 3 photos.");
//       return;
//     }
//     router.push("/onboarding/step5-location");
//   };

//   return (
//     <View className="flex-1 bg-black px-6 pt-16">
//       <Text className="text-white text-3xl font-bold mb-2">Your Photos</Text>
//       <Text className="text-white/70 mb-4">Upload 3–6 best photos.</Text>

//       <Pressable
//         className="bg-white/10 p-4 rounded-2xl items-center mb-4"
//         onPress={pickImage}
//         disabled={uploading || data.photos.length >= 6}
//       >
//         <Text className="text-white font-semibold">
//           {uploading ? "Uploading..." : "Add Photos"}
//         </Text>
//       </Pressable>

//       <FlatList
//         data={data.photos}
//         numColumns={3}
//         keyExtractor={(u) => u}
//         columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
//         renderItem={({ item }) => (
//           <Pressable onLongPress={() => removePhoto(item)}>
//             <Image
//               source={{ uri: item }}
//               className="w-24 h-32 rounded-xl"
//             />
//           </Pressable>
//         )}
//       />

//       <Pressable
//         className="bg-pink-500 p-4 rounded-2xl items-center mt-auto mb-4"
//         onPress={next}
//       >
//         <Text className="text-white text-lg font-semibold">Next</Text>
//       </Pressable>

//       <Text className="text-white/40 text-xs text-center mb-6">
//         Long-press a photo to remove it.
//       </Text>
//     </View>
//   );
// }

import { View, Text, Pressable, Image, FlatList } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useRouter } from "expo-router";
import { useState } from "react";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const res = await fetch(uri);
  const blob = await res.blob();

  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, blob, { contentType: `image/${ext}` });

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
  const [permission, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  
  const pickImage = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
  
    // 1. Check & request permission
    if (!permission?.granted) {
      const p = await requestPermission();
      console.log("Permission response → ", p);
  
      if (!p.granted) {
        alert("We need permission to access your photos.");
        return;
      }
    }
  
    // 2. Calculate remaining slots
    const remainingSlots = 6 - data.photos.length;
    
    // 3. Open gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8, // Compress a bit for faster uploads
    });
  
    if (result.canceled) return;
  
    try {
      setUploading(true);
      
      // Upload all selected images
      const uploadPromises = result.assets.map(asset => 
        uploadPhoto(asset.uri, user.id)
      );
      
      const urls = await Promise.all(uploadPromises);
      
      setData((d) => ({ ...d, photos: [...d.photos, ...urls] }));
    } catch (e: any) {
      console.error("Upload error:", e);
      alert(e.message || "Failed to upload photos");
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