import { View, Text, ScrollView, Pressable, Dimensions, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

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
  const [prompts, setPrompts] = useState<any[]>([]);
  const [location, setLocation] = useState<string | null>(null);
  const [bornMuslim, setBornMuslim] = useState<boolean | null>(null);
  const [alcoholHabit, setAlcoholHabit] = useState("");
  const [smokingHabit, setSmokingHabit] = useState("");

  const loadProfile = useCallback(async () => {
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

      // Fetch prompts from user_prompts table
      const { data: promptsData } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", profileUserId)
        .order("display_order", { ascending: true });

      if (promptsData) {
        setPrompts(promptsData);
      }

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
      setBornMuslim(data.born_muslim ?? null);
      setAlcoholHabit(data.alcohol_habit || "");
      setSmokingHabit(data.smoking_habit || "");
      
      // Handle location data (could be PostGIS point, object, or string)
      if (data.location) {
        if (typeof data.location === 'string') {
          setLocation(data.location);
        } else if (data.location.city || data.location.country) {
          setLocation(`${data.location.city || ''}${data.location.city && data.location.country ? ', ' : ''}${data.location.country || ''}`);
        } else if (data.location.lat && data.location.lon) {
          // PostGIS point - could reverse geocode or show coordinates
          setLocation(`${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`);
        }
      }
      
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
  }, [userId, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Reload profile when screen comes into focus (e.g., after removing a photo)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF' }}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF' }}>No profile found</Text>
      </View>
    );
  }

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : profile?.name || "Unknown";
  const age = calculateAge(dob);

  // Helper functions to check if sections should be shown
  const hasPersonalInfo = height || maritalStatus || hasChildren !== null || education || profession;
  const hasReligiousInfo = sect || bornMuslim !== null || religiousPractice || alcoholHabit || smokingHabit;
  const hasLifestyleInfo = (hobbies && hobbies.length > 0) || location;
  const hasBackgroundInfo = ethnicity || nationality;
  const hasPrompts = prompts && prompts.length > 0 && prompts.some((p: any) => p.question && p.answer);


  // Render image with optional name/age overlay (only for first image)
  const renderImage = (photo: string, index: number) => {
    const isMainPhoto = index === 0;
    
    return (
      <View 
        key={index} 
        style={[
          isMainPhoto ? styles.mainImageContainer : styles.secondaryImageContainer
        ]}
      >
        <Image 
          source={{ uri: photo }} 
          style={[
            isMainPhoto ? styles.mainImage : styles.secondaryImage
          ]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority={isMainPhoto ? "high" : "normal"}
        />
        
        {/* Name and Age overlay on first image only */}
        {isMainPhoto && (
          <View style={styles.nameOverlay}>
            <Text style={styles.nameOverlayText}>
              {fullName}{age !== null ? `, ${age}` : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Back Button - Fixed at top */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Scrollable Profile Preview */}
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Build alternating layout: Image -> Data -> Image -> Data... */}
        {(() => {
          const sections: JSX.Element[] = [];
          let imageIndex = 0;
          let sectionIndex = 0;

          // Always start with first image (with name/age overlay)
          if (photos.length > 0) {
            sections.push(renderImage(photos[0], 0));
            imageIndex = 1;
          }

          // Collect all data sections
          const dataSections: JSX.Element[] = [];

          if (hasPersonalInfo) {
            dataSections.push(
              <View key="personal" style={styles.sectionCard}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalChipsContainer}
                >
                  {height && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📏 {height}</Text>
                    </View>
                  )}
                  {maritalStatus && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💍 {maritalStatus.charAt(0).toUpperCase() + maritalStatus.slice(1)}</Text>
                    </View>
                  )}
                  {hasChildren !== null && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{hasChildren ? "👶 Has children" : "👶 No children"}</Text>
                    </View>
                  )}
                  {education && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🎓 {education}</Text>
                    </View>
                  )}
                  {profession && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>💼 {profession}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          }

          if (hasReligiousInfo) {
            dataSections.push(
              <View key="religious" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Religious</Text>
                <View style={styles.chipsContainer}>
                  {sect && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🕌 {sect.charAt(0).toUpperCase() + sect.slice(1)}</Text>
                    </View>
                  )}
                  {bornMuslim !== null && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>{bornMuslim ? "⭐ Born Muslim" : "⭐ Converted to Islam"}</Text>
                    </View>
                  )}
                  {religiousPractice && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📿 {religiousPractice.charAt(0).toUpperCase() + religiousPractice.slice(1)}</Text>
                    </View>
                  )}
                  {alcoholHabit && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🍷 Alcohol: {alcoholHabit.charAt(0).toUpperCase() + alcoholHabit.slice(1)}</Text>
                    </View>
                  )}
                  {smokingHabit && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🚬 Smoking: {smokingHabit.charAt(0).toUpperCase() + smokingHabit.slice(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }

          if (hasLifestyleInfo) {
            dataSections.push(
              <View key="lifestyle" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Lifestyle</Text>
                <View style={styles.chipsContainer}>
                  {hobbies && hobbies.length > 0 && hobbies.map((hobby: string, index: number) => (
                    <View key={index} style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🎯 {hobby}</Text>
                    </View>
                  ))}
                  {location && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>📍 {location}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }

          if (hasBackgroundInfo) {
            dataSections.push(
              <View key="background" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Background</Text>
                <View style={styles.chipsContainer}>
                  {ethnicity && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🌍 {ethnicity}</Text>
                    </View>
                  )}
                  {nationality && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🏳️ {nationality}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }

          if (bio) {
            dataSections.push(
              <View key="about" style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{bio}</Text>
              </View>
            );
          }

          if (hasPrompts) {
            dataSections.push(
              <View key="prompts" style={styles.promptsContainer}>
                {prompts
                  .filter((p: any) => p.question && p.answer)
                  .map((prompt: any, index: number) => (
                    <View key={index} style={styles.promptCard}>
                      <Text style={styles.promptQuestion}>{prompt.question}</Text>
                      <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                    </View>
                  ))}
              </View>
            );
          }

          // Alternate between images and data sections
          while (imageIndex < photos.length || sectionIndex < dataSections.length) {
            // Add data section if available
            if (sectionIndex < dataSections.length) {
              sections.push(dataSections[sectionIndex]);
              sectionIndex++;
            }
            
            // Add image if available
            if (imageIndex < photos.length) {
              sections.push(renderImage(photos[imageIndex], imageIndex));
              imageIndex++;
            }
          }

          return sections;
        })()}
      </ScrollView>
    </View>
  );
}

const getStyles = () => {
  const screenHeight = Dimensions.get('window').height;
  
  return StyleSheet.create({
    topBar: {
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 20,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: 'transparent',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainImageContainer: {
      width: '100%',
      height: screenHeight * 0.65,
      position: 'relative',
      marginBottom: 16,
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    secondaryImageContainer: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    secondaryImage: {
      width: '100%',
      height: screenHeight * 0.5,
      borderRadius: 20,
    },
    nameOverlay: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    nameOverlayText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
    sectionContent: {
      gap: 12,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    horizontalChipsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 20,
    },
    infoChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#B8860B',
    },
    infoChipText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '500',
    },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  promptsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  promptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.2)',
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
    promptAnswer: {
      fontSize: 15,
      lineHeight: 22,
      color: '#FFFFFF',
      opacity: 0.85,
    },
  });
};

const styles = getStyles();