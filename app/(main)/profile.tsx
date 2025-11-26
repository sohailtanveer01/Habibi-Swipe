import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

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
  const [editingSection, setEditingSection] = useState<string | null>(null); // 'photos' | 'about' | 'marriage' | 'bio' | null
  const [editingField, setEditingField] = useState<string | null>(null); // 'name' | 'height' | 'maritalStatus' | 'children' | 'dob' | 'sect' | 'bornMuslim' | 'religiousPractice' | 'alcoholHabit' | 'smokingHabit' | null
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
  const [dob, setDob] = useState("");
  const [sect, setSect] = useState("");
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(null);
  const [religiousPractice, setReligiousPractice] = useState("");
  const [alcoholHabit, setAlcoholHabit] = useState("");
  const [smokingHabit, setSmokingHabit] = useState("");
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
      setDob(data.dob || "");
      setSect(data.sect || "");
      setBornMuslim(data.born_muslim !== undefined ? data.born_muslim : null);
      setReligiousPractice(data.religious_practice || "");
      setAlcoholHabit(data.alcohol_habit || "");
      setSmokingHabit(data.smoking_habit || "");
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

  const handleSave = async (overrideValues?: {
    sect?: string;
    bornMuslim?: boolean | null;
    religiousPractice?: string;
    alcoholHabit?: string;
    smokingHabit?: string;
  }) => {
    try {
      // Validate that at least 1 photo exists
      if (!photos || photos.length === 0) {
        Alert.alert("Photo Required", "Please add at least 1 photo to your profile.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSaving(true);

      // Use override values if provided, otherwise use state values
      const currentSect = overrideValues?.sect !== undefined ? overrideValues.sect : sect;
      const currentBornMuslim = overrideValues?.bornMuslim !== undefined ? overrideValues.bornMuslim : bornMuslim;
      const currentReligiousPractice = overrideValues?.religiousPractice !== undefined ? overrideValues.religiousPractice : religiousPractice;
      const currentAlcoholHabit = overrideValues?.alcoholHabit !== undefined ? overrideValues.alcoholHabit : alcoholHabit;
      const currentSmokingHabit = overrideValues?.smokingHabit !== undefined ? overrideValues.smokingHabit : smokingHabit;

      // Build update payload - only include location if it's valid
      const updatePayload: any = {
        id: user.id,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(), // Combined for backward compatibility
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        height: height.trim(),
        marital_status: maritalStatus,
        has_children: hasChildren,
        dob,
        sect: currentSect.trim(),
        born_muslim: currentBornMuslim,
        religious_practice: currentReligiousPractice,
        alcohol_habit: currentAlcoholHabit,
        smoking_habit: currentSmokingHabit,
        get_to_know_timeline: getToKnowTimeline,
        marriage_timeline: marriageTimeline,
        education: education.trim(),
        profession: profession.trim(),
        religion: religion.trim(),
        bio: bio.trim(),
        photos,
        last_active_at: new Date().toISOString(),
      };

      // Only include location if it exists and is valid
      if (profile?.location && 
          typeof profile.location === 'object' &&
          typeof profile.location.lon === 'number' &&
          typeof profile.location.lat === 'number' &&
          !isNaN(profile.location.lon) &&
          !isNaN(profile.location.lat)) {
        updatePayload.location = `SRID=4326;POINT(${profile.location.lon} ${profile.location.lat})`;
      }

      const { error } = await supabase.from("users").upsert(updatePayload);

      if (error) throw error;

      setEditingSection(null);
      await loadProfile();
      Alert.alert("Success", "Profile updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
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
      if (remainingSlots <= 0) {
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

      // Insert at specific index or append
      if (targetIndex !== undefined) {
        const newPhotos = [...photos];
        newPhotos.splice(targetIndex, 0, url);
        setPhotos(newPhotos);
        
        // Auto-save after upload
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
        
        // Auto-save after upload
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
    
    // Auto-save after removal
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

        {/* Photos Card */}
        <View className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-4">
          <Text className="text-white text-xl font-semibold mb-4">Photos</Text>
          {photos.length < 6 && (
            <View className="bg-pink-500/20 border border-pink-500/30 rounded-xl p-3 mb-3">
              <Text className="text-pink-400 text-sm font-medium text-center">
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
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text className="text-white/50 text-3xl mb-1">+</Text>
                        <Text className="text-white/50 text-xs text-center">
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
                    <View className="absolute top-1 left-1 bg-pink-500 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-bold">Main</Text>
                    </View>
                  )}
                  <Pressable
                    className="absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                    onPress={() => removePhoto(photo)}
                  >
                    <Text className="text-white text-xs">×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* About You Card */}
        <View className="bg-white/10 rounded-2xl border border-white/10 p-5 mb-4">
          <Text className="text-white text-xl font-semibold mb-5">About You</Text>
          
          {/* Name Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'name' ? null : 'name')}
            className="flex-row items-center justify-between py-3 border-b border-white/10"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">👤</Text>
              <Text className="text-white/80 text-base">Name</Text>
            </View>
            {editingField === 'name' ? (
              <View className="items-end">
                <TextInput
                  className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-right min-w-[120] mb-2"
                  placeholder="First Name"
                  placeholderTextColor="#999"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoFocus
                />
                <TextInput
                  className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-right min-w-[120]"
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2">
                  {firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Not set"}
                </Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>

          {/* Height Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'height' ? null : 'height')}
            className="flex-row items-center justify-between py-3 border-b border-white/10"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">📏</Text>
              <Text className="text-white/80 text-base">Height</Text>
            </View>
            {editingField === 'height' ? (
              <TextInput
                className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-right min-w-[120]"
                placeholder="5'10 or 178 cm"
                placeholderTextColor="#999"
                value={height}
                onChangeText={setHeight}
                autoFocus
              />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2">{height || "Not set"}</Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>

          {/* Marital Status Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'maritalStatus' ? null : 'maritalStatus')}
            className="py-3 border-b border-white/10"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-xl mr-3">💍</Text>
                <Text className="text-white/80 text-base">Marital Status</Text>
              </View>
              {editingField !== 'maritalStatus' && (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 capitalize">{maritalStatus || "Not set"}</Text>
                  <Text className="text-white/40 text-lg">›</Text>
                </View>
              )}
            </View>
            {editingField === 'maritalStatus' && (
              <View className="flex-row gap-2 flex-wrap ml-10">
                {["single", "divorced", "widowed", "separated"].map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setMaritalStatus(status);
                      setEditingField(null);
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      maritalStatus === status ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-sm capitalize">{status}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>

          {/* Children Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'children' ? null : 'children')}
            className="py-3 border-b border-white/10"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-xl mr-3">👶</Text>
                <Text className="text-white/80 text-base">Children</Text>
              </View>
              {editingField !== 'children' && (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2">
                    {hasChildren === null ? "Not set" : hasChildren ? "Yes" : "No"}
                  </Text>
                  <Text className="text-white/40 text-lg">›</Text>
                </View>
              )}
            </View>
            {editingField === 'children' && (
              <View className="flex-row gap-2 ml-10">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((option) => (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setHasChildren(option.value);
                      setEditingField(null);
                    }}
                    className={`flex-1 px-3 py-2 rounded-full ${
                      hasChildren === option.value ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-center text-sm font-semibold">{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>

          {/* Date of Birth Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'dob' ? null : 'dob')}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">📅</Text>
              <Text className="text-white/80 text-base">Date of Birth</Text>
            </View>
            {editingField === 'dob' ? (
              <TextInput
                className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-right min-w-[120]"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={dob}
                onChangeText={setDob}
                autoFocus
              />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2">{dob || "Not set"}</Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>
          {/* Save button for text inputs */}
          {(editingField === 'name' || editingField === 'height' || editingField === 'dob') && (
            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 bg-white/10 px-4 py-2 rounded-xl"
                onPress={() => {
                  setEditingField(null);
                  loadProfile();
                }}
              >
                <Text className="text-white font-semibold text-center text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-pink-500 px-4 py-2 rounded-xl"
                onPress={async () => {
                  await handleSave();
                  setEditingField(null);
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-center text-sm">Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Religiosity Card */}
        <View className="bg-white/10 rounded-2xl border border-white/10 p-5 mb-4">
          <Text className="text-white text-xl font-semibold mb-5">Religiosity</Text>
          
          {/* Sect Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'sect' ? null : 'sect')}
            className="flex-row items-center justify-between py-3 border-b border-white/10"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">🕌</Text>
              <Text className="text-white/80 text-base">Sect</Text>
            </View>
            {editingField === 'sect' ? (
              <View className="items-end">
                {["sunni", "shia", "sufi", "other", "prefer not to say"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={async () => {
                      setSect(option);
                      setEditingField(null);
                      await handleSave({ sect: option });
                    }}
                    className={`px-3 py-1.5 rounded-full mb-2 ${
                      sect === option ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-sm capitalize">{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2 capitalize">{sect || "Not set"}</Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>

          {/* Born Muslim Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'bornMuslim' ? null : 'bornMuslim')}
            className="flex-row items-center justify-between py-3 border-b border-white/10"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">🌙</Text>
              <Text className="text-white/80 text-base">Born Muslim?</Text>
            </View>
            {editingField === 'bornMuslim' ? (
              <View className="flex-row gap-2">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((option) => (
                  <Pressable
                    key={option.label}
                    onPress={async () => {
                      setBornMuslim(option.value);
                      setEditingField(null);
                      await handleSave({ bornMuslim: option.value });
                    }}
                    className={`flex-1 px-3 py-2 rounded-full ${
                      bornMuslim === option.value ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-center text-sm font-semibold">{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2">
                  {bornMuslim === true ? "Yes" : bornMuslim === false ? "No" : "Not set"}
                </Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>

          {/* Religious Practice Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'religiousPractice' ? null : 'religiousPractice')}
            className="flex-row items-center justify-between py-3 border-b border-white/10"
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-xl mr-3">🙏</Text>
              <Text className="text-white/80 text-base">Religious Practice</Text>
            </View>
            {editingField === 'religiousPractice' ? (
              <View className="flex-row gap-2 flex-wrap">
                {["actively practicing", "moderately practicing", "not practicing"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={async () => {
                      setReligiousPractice(option);
                      setEditingField(null);
                      await handleSave({ religiousPractice: option });
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      religiousPractice === option ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-sm capitalize">{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-base mr-2 capitalize">{religiousPractice || "Not set"}</Text>
                <Text className="text-white/40 text-lg">›</Text>
              </View>
            )}
          </Pressable>

          {/* Alcohol Habit Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'alcoholHabit' ? null : 'alcoholHabit')}
            className="py-3 border-b border-white/10"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-xl mr-3">🍷</Text>
                <Text className="text-white/80 text-base">Alcohol</Text>
              </View>
              {editingField !== 'alcoholHabit' && (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 capitalize">{alcoholHabit || "Not set"}</Text>
                  <Text className="text-white/40 text-lg">›</Text>
                </View>
              )}
            </View>
            {editingField === 'alcoholHabit' && (
              <View className="flex-row gap-2 flex-wrap ml-10">
                {["drinks", "doesn't drink", "sometimes"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={async () => {
                      setAlcoholHabit(option);
                      setEditingField(null);
                      await handleSave({ alcoholHabit: option });
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      alcoholHabit === option ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-sm capitalize">{option}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>

          {/* Smoking Habit Row */}
          <Pressable
            onPress={() => setEditingField(editingField === 'smokingHabit' ? null : 'smokingHabit')}
            className="py-3"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-xl mr-3">🚬</Text>
                <Text className="text-white/80 text-base">Smoking</Text>
              </View>
              {editingField !== 'smokingHabit' && (
                <View className="flex-row items-center">
                  <Text className="text-white text-base mr-2 capitalize">{smokingHabit || "Not set"}</Text>
                  <Text className="text-white/40 text-lg">›</Text>
                </View>
              )}
            </View>
            {editingField === 'smokingHabit' && (
              <View className="flex-row gap-2 flex-wrap ml-10">
                {["smokes", "doesn't smoke", "sometimes"].map((option) => (
                  <Pressable
                    key={option}
                    onPress={async () => {
                      setSmokingHabit(option);
                      setEditingField(null);
                      await handleSave({ smokingHabit: option });
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      smokingHabit === option ? "bg-pink-500" : "bg-white/20"
                    }`}
                  >
                    <Text className="text-white text-sm capitalize">{option}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </View>

        {/* Marriage Intentions Card */}
        <View className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-semibold">Marriage Intentions</Text>
            {editingSection !== 'marriage' && (
              <Pressable
                onPress={() => setEditingSection('marriage')}
                className="px-3 py-1 bg-pink-500/20 rounded-lg"
              >
                <Text className="text-pink-500 text-xs font-semibold">Edit</Text>
              </Pressable>
            )}
          </View>
          
          <View className="mb-3">
            <Text className="text-white/70 text-sm mb-1">I would like to get to know someone for</Text>
            {editingSection === 'marriage' ? (
              <TextInput
                className="bg-white/10 text-white p-3 rounded-xl mt-1"
                placeholder="e.g., 6-12 months"
                placeholderTextColor="#777"
                value={getToKnowTimeline}
                onChangeText={setGetToKnowTimeline}
              />
            ) : (
              <Text className="text-white text-base mt-1">{getToKnowTimeline || "Not set"}</Text>
            )}
          </View>

          <View>
            <Text className="text-white/70 text-sm mb-1">I would like to be married within</Text>
            {editingSection === 'marriage' ? (
              <TextInput
                className="bg-white/10 text-white p-3 rounded-xl mt-1"
                placeholder="e.g., 1-2 years"
                placeholderTextColor="#777"
                value={marriageTimeline}
                onChangeText={setMarriageTimeline}
              />
            ) : (
              <Text className="text-white text-base mt-1">{marriageTimeline || "Not set"}</Text>
            )}
          </View>
          {editingSection === 'marriage' && (
            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 bg-white/10 px-4 py-2 rounded-xl"
                onPress={() => {
                  setEditingSection(null);
                  loadProfile();
                }}
              >
                <Text className="text-white font-semibold text-center text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-pink-500 px-4 py-2 rounded-xl"
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-center text-sm">Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Bio Card */}
        <View className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-semibold">Bio</Text>
            {editingSection !== 'bio' && (
              <Pressable
                onPress={() => setEditingSection('bio')}
                className="px-3 py-1 bg-pink-500/20 rounded-lg"
              >
                <Text className="text-pink-500 text-xs font-semibold">Edit</Text>
              </Pressable>
            )}
          </View>
          {editingSection === 'bio' ? (
            <TextInput
              className="bg-white/10 text-white p-3 rounded-xl h-24"
              placeholder="Tell us about yourself"
              placeholderTextColor="#777"
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text className="text-white text-base">{bio || "No bio yet"}</Text>
          )}
          {editingSection === 'bio' && (
            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 bg-white/10 px-4 py-2 rounded-xl"
                onPress={() => {
                  setEditingSection(null);
                  loadProfile();
                }}
              >
                <Text className="text-white font-semibold text-center text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-pink-500 px-4 py-2 rounded-xl"
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-center text-sm">Save</Text>
                )}
              </Pressable>
            </View>
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

