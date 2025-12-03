import { View, Text, ScrollView, Pressable, Image, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [sect, setSect] = useState("");
  const [religiousPractice, setReligiousPractice] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [nationality, setNationality] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [bio, setBio] = useState("");

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

      // If userId is provided, view that user's profile; otherwise view own profile
      const profileUserId = userId || user.id;
      const isViewingOtherProfile = userId && userId !== user.id;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", profileUserId)
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Handle name - prefer first_name/last_name, fallback to name
      if (data.first_name && data.last_name) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      } else if (data.name) {
        const nameParts = data.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      setHeight(data.height || "");
      setMaritalStatus(data.marital_status || "");
      setHasChildren(data.has_children ?? null);
      setDob(data.dob || "");
      setEducation(data.education || "");
      setProfession(data.profession || "");
      setSect(data.sect || "");
      setReligiousPractice(data.religious_practice || "");
      setEthnicity(data.ethnicity || "");
      setNationality(data.nationality || "");
      setHobbies(data.hobbies || []);
      setBio(data.bio || "");
      setPhotos(data.photos || []);
      
      // Track view if viewing someone else's profile
      if (isViewingOtherProfile) {
        try {
          await supabase.functions.invoke("create-profile-view", {
            body: { viewed_id: profileUserId },
          });
          console.log("✅ Profile view recorded for:", profileUserId);
        } catch (viewError) {
          console.error("Error recording profile view:", viewError);
          // Don't fail the profile load if view tracking fails
        }
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Header with Back Button */}
      <View className="pt-12 pb-4 px-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="mr-4"
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <Text className="text-white text-xl font-bold">Profile Preview</Text>
      </View>

      {/* Scrollable Profile Preview */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {profile && (
          <>
            {/* All Photos */}
            {photos.map((photo: string, index: number) => (
              <View 
                key={index} 
                style={{ 
                  width: '100%', 
                  height: Dimensions.get('window').height * 0.75,
                  position: 'relative' 
                }}
              >
                <Image 
                  source={{ uri: photo }} 
                  className="w-full h-full" 
                  resizeMode="cover" 
                />
                
                {/* Show name and age only on first photo */}
                {index === 0 && (
                  <>
                    {/* Gradient Overlay */}
                    <View 
                      style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        height: 120, 
                        backgroundColor: 'rgba(0,0,0,0.6)' 
                      }} 
                    />
                    
                    {/* Name and Age */}
                    <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <View className="flex-row items-baseline gap-2">
                        <Text className="text-white text-3xl font-bold">
                          {firstName && lastName ? `${firstName} ${lastName}` : profile.name || "Unknown"}
                        </Text>
                        {calculateAge(dob) !== null && (
                          <Text className="text-white/90 text-2xl">
                            {calculateAge(dob)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            ))}
            
            {/* Profile Details */}
            <View className="bg-white/10 rounded-t-3xl -mt-4 px-4 pt-6 pb-8">
              {/* Bio */}
              {bio && (
                <View className="mb-6">
                  <Text className="text-white text-base leading-6">
                    {bio}
                  </Text>
                </View>
              )}

              {/* Key Details */}
              <View style={{ gap: 12 }}>
                {height && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">📏</Text>
                    <Text className="text-white/90 text-base">{height}</Text>
                  </View>
                )}

                {maritalStatus && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">💍</Text>
                    <Text className="text-white/90 text-base capitalize">{maritalStatus}</Text>
                  </View>
                )}

                {hasChildren !== null && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">👶</Text>
                    <Text className="text-white/90 text-base">
                      {hasChildren ? "Has children" : "No children"}
                    </Text>
                  </View>
                )}

                {education && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">🎓</Text>
                    <Text className="text-white/90 text-base">{education}</Text>
                  </View>
                )}

                {profession && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">💼</Text>
                    <Text className="text-white/90 text-base">{profession}</Text>
                  </View>
                )}

                {(sect || religiousPractice) && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">🕌</Text>
                    <Text className="text-white/90 text-base">
                      {[sect, religiousPractice].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                )}

                {(ethnicity || nationality) && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/70 text-base">🌍</Text>
                    <Text className="text-white/90 text-base">
                      {[ethnicity, nationality].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                )}

                {hobbies && hobbies.length > 0 && (
                  <View className="flex-row items-start gap-2">
                    <Text className="text-white/70 text-base">🎯</Text>
                    <View className="flex-1 flex-row flex-wrap gap-2">
                      {hobbies.slice(0, 5).map((hobby: string, index: number) => (
                        <View key={index} className="bg-white/10 px-3 py-1 rounded-full">
                          <Text className="text-white/90 text-sm">{hobby}</Text>
                        </View>
                      ))}
                      {hobbies.length > 5 && (
                        <View className="bg-white/10 px-3 py-1 rounded-full">
                          <Text className="text-white/90 text-sm">+{hobbies.length - 5} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

