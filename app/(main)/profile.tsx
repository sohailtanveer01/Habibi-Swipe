import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, FlatList, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DraggableProfilePhoto from "@/components/DraggableProfilePhoto";

async function uploadPhoto(uri: string, userId: string) {
  const ext = uri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  // React Native: Read file as ArrayBuffer
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

export default function ProfileScreen() {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [getToKnowTimeline, setGetToKnowTimeline] = useState("");
  const [marriageTimeline, setMarriageTimeline] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [religion, setReligion] = useState("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Handle name - prefer first_name/last_name, fallback to name
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        // Split existing name field as fallback
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
      
      setHeight(data.height || "");
      setMaritalStatus(data.marital_status || "");
      setHasChildren(data.has_children !== undefined ? data.has_children : null);
      setGender(data.gender || "");
      setDob(data.dob || "");
      setGetToKnowTimeline(data.get_to_know_timeline || "");
      setMarriageTimeline(data.marriage_timeline || "");
      setEducation(data.education || "");
      setProfession(data.profession || "");
      setReligion(data.religion || "");
      setBio(data.bio || "");
      setPhotos(data.photos || []);
    } catch (e: any) {
      console.error("Error loading profile:", e);
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate that at least 1 photo exists
      if (!photos || photos.length === 0) {
        Alert.alert("Photo Required", "Please add at least 1 photo to your profile.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSaving(true);

      // Build PostGIS geography point if location exists
      const locationPoint = profile?.location
        ? `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`
        : null;

      const { error } = await supabase.from("users").upsert({
        id: user.id,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(), // Combined for backward compatibility
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        height: height.trim(),
        marital_status: maritalStatus,
        has_children: hasChildren,
        gender,
        dob,
        get_to_know_timeline: getToKnowTimeline,
        marriage_timeline: marriageTimeline,
        education: education.trim(),
        profession: profession.trim(),
        religion: religion.trim(),
        bio: bio.trim(),
        photos,
        location: locationPoint,
        last_active_at: new Date().toISOString(),
      });

      if (error) throw error;

      setEditing(false);
      await loadProfile();
      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
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
      if (remainingSlots <= 0) {
        Alert.alert("Limit reached", "You can only upload up to 6 photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUploading(true);
      const uploadPromises = result.assets.map((asset) =>
        uploadPhoto(asset.uri, user.id)
      );

      const urls = await Promise.all(uploadPromises);
      setPhotos([...photos, ...urls]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to upload photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    if (photos.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least 1 photo in your profile.");
      return;
    }
    setPhotos(photos.filter((p) => p !== url));
  };

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverTargetIndex, setHoverTargetIndex] = useState<number | null>(null);
  const [layoutPositions, setLayoutPositions] = useState<{ [key: number]: { x: number; y: number; width: number; height: number } }>({});

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex === null) return;
    
    // Remove the dragged photo from its current position
    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(fromIndex, 1);
    
    // Insert it at the target position (other photos will automatically shift)
    newPhotos.splice(toIndex, 0, draggedPhoto);
    
    setPhotos(newPhotos);
  };

  const onPhotoLayout = (index: number, event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setLayoutPositions((prev) => ({
      ...prev,
      [index]: { x, y, width, height },
    }));
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  const mainPhoto = photos && photos.length > 0 ? photos[0] : null;

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="px-6 pt-16 pb-8">
        {/* Header with Profile Picture */}
        <View className="items-center mb-8">
          {mainPhoto ? (
            <Image
              source={{ uri: mainPhoto }}
              className="w-32 h-32 rounded-full mb-4 border-4 border-pink-500"
              resizeMode="cover"
            />
          ) : (
            <View className="w-32 h-32 rounded-full mb-4 border-4 border-pink-500 bg-white/10 items-center justify-center">
              <Text className="text-white/50 text-4xl">👤</Text>
            </View>
          )}
          <Text className="text-white text-3xl font-bold mb-2">
            {firstName && lastName ? `${firstName} ${lastName}` : "Profile"}
          </Text>
        </View>

        {/* Edit Button */}
        <View className="flex-row justify-end mb-6">
          {!editing ? (
            <Pressable
              className="bg-pink-500 px-4 py-2 rounded-full"
              onPress={() => setEditing(true)}
            >
              <Text className="text-white font-semibold">Edit</Text>
            </Pressable>
          ) : (
            <View className="flex-row gap-2">
              <Pressable
                className="bg-white/10 px-4 py-2 rounded-full"
                onPress={() => {
                  setEditing(false);
                  loadProfile(); // Reset to original values
                }}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                className="bg-pink-500 px-4 py-2 rounded-full"
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Photos Section */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">Photos</Text>
          <Text className="text-white/60 text-sm mb-3">
            {editing ? "Long press and drag to reorder. First photo is your main profile picture." : ""}
          </Text>
          <FlatList
            data={photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item, index }) => (
              <DraggableProfilePhoto
                photo={item}
                index={index}
                isMainPhoto={index === 0}
                isDragging={draggingIndex === index}
                onLayout={(e) => onPhotoLayout(index, e)}
                onLongPress={() => editing && setDraggingIndex(index)}
                onDragUpdate={(targetIndex) => {
                  setHoverTargetIndex(targetIndex);
                }}
                onDragEnd={(targetIndex) => {
                  setDraggingIndex(null);
                  setHoverTargetIndex(null);
                  if (targetIndex !== null && targetIndex !== index) {
                    handleReorder(index, targetIndex);
                  }
                }}
                onRemove={() => removePhoto(item)}
                layoutPositions={layoutPositions}
                hoverTargetIndex={hoverTargetIndex}
                draggingIndex={draggingIndex}
              />
            )}
            ListFooterComponent={
              editing && photos.length < 6 ? (
                <Pressable
                  className="w-24 h-32 rounded-xl bg-white/10 items-center justify-center border-2 border-dashed border-white/30 ml-3"
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white/70 text-2xl">+</Text>
                  )}
                </Pressable>
              ) : null
            }
          />
        </View>

        {/* Basic Info */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">About You</Text>
          
          <Text className="text-white/70 mb-1">First Name</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="First Name"
              placeholderTextColor="#777"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          ) : (
            <Text className="text-white text-lg mb-4">{firstName || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Last Name</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="Last Name"
              placeholderTextColor="#777"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          ) : (
            <Text className="text-white text-lg mb-4">{lastName || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Height</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="Height (e.g., 5'10 or 178 cm)"
              placeholderTextColor="#777"
              value={height}
              onChangeText={setHeight}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{height || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Marital Status</Text>
          {editing ? (
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {["single", "divorced", "widowed", "separated"].map((status) => (
                <Pressable
                  key={status}
                  onPress={() => setMaritalStatus(status)}
                  className={`px-4 py-2 rounded-full ${
                    maritalStatus === status ? "bg-pink-500" : "bg-white/10"
                  }`}
                >
                  <Text className="text-white capitalize">{status}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="text-white text-lg mb-4 capitalize">{maritalStatus || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Do you have children?</Text>
          {editing ? (
            <View className="flex-row gap-2 mb-4">
              {[
                { value: true, label: "Yes" },
                { value: false, label: "No" },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => setHasChildren(option.value)}
                  className={`flex-1 px-4 py-3 rounded-full ${
                    hasChildren === option.value ? "bg-pink-500" : "bg-white/10"
                  }`}
                >
                  <Text className="text-white text-center font-semibold">{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="text-white text-lg mb-4">
              {hasChildren === null ? "Not set" : hasChildren ? "Yes" : "No"}
            </Text>
          )}

          <Text className="text-white/70 mb-1">Gender</Text>
          {editing ? (
            <View className="flex-row gap-2 mb-4">
              {["male", "female"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`px-4 py-2 rounded-full ${
                    gender === g ? "bg-pink-500" : "bg-white/10"
                  }`}
                >
                  <Text className="text-white capitalize">{g}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="text-white text-lg mb-4 capitalize">{gender || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Date of Birth</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#777"
              value={dob}
              onChangeText={setDob}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{dob || "Not set"}</Text>
          )}
        </View>

        {/* Background */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">Marriage Intentions</Text>
          
          <Text className="text-white/70 mb-1">I would like to get to know someone for</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="e.g., 6-12 months"
              placeholderTextColor="#777"
              value={getToKnowTimeline}
              onChangeText={setGetToKnowTimeline}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{getToKnowTimeline || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">I would like to be married within</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="e.g., 1-2 years"
              placeholderTextColor="#777"
              value={marriageTimeline}
              onChangeText={setMarriageTimeline}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{marriageTimeline || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Education</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="Education"
              placeholderTextColor="#777"
              value={education}
              onChangeText={setEducation}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{education || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Profession</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="Profession"
              placeholderTextColor="#777"
              value={profession}
              onChangeText={setProfession}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{profession || "Not set"}</Text>
          )}

          <Text className="text-white/70 mb-1">Religion</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4"
              placeholder="Religion"
              placeholderTextColor="#777"
              value={religion}
              onChangeText={setReligion}
            />
          ) : (
            <Text className="text-white text-lg mb-4">{religion || "Not set"}</Text>
          )}
        </View>

        {/* Bio */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">Bio</Text>
          {editing ? (
            <TextInput
              className="bg-white/10 text-white p-4 rounded-2xl mb-4 h-28"
              placeholder="Tell us about yourself"
              placeholderTextColor="#777"
              value={bio}
              onChangeText={setBio}
              multiline
            />
          ) : (
            <Text className="text-white text-lg mb-4">{bio || "No bio yet"}</Text>
          )}
        </View>

        {/* Subscription */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">Subscription</Text>
          
          <Pressable
            className="bg-pink-500/20 border border-pink-500 p-4 rounded-2xl mb-3"
            onPress={() => router.push("/(main)/paywall")}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white font-semibold">Manage Subscription</Text>
                <Text className="text-white/70 text-sm">Upgrade to Premium</Text>
              </View>
              <Text className="text-pink-500 text-xl">💎</Text>
            </View>
          </Pressable>
        </View>

        {/* Account Actions */}
        <View className="mb-6">
          <Text className="text-white text-xl font-semibold mb-3">Account</Text>
          
          <Pressable
            className="bg-white/10 p-4 rounded-2xl mb-3"
            onPress={handleLogout}
          >
            <Text className="text-white font-semibold text-center">Logout</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

