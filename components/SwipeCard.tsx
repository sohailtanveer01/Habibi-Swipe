import { View, Text, Dimensions, StyleSheet, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

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

export default function SwipeCard({ profile }: any) {
  const photos = profile.photos || [];
  const [prompts, setPrompts] = useState<any[]>([]);

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);

  // Extract profile data
  const height = profile.height || "";
  const maritalStatus = profile.marital_status || "";
  const hasChildren = profile.has_children ?? null;
  const education = profile.education || "";
  const profession = profile.profession || "";
  const sect = profile.sect || "";
  const bornMuslim = profile.born_muslim ?? null;
  const religiousPractice = profile.religious_practice || "";
  const alcoholHabit = profile.alcohol_habit || "";
  const smokingHabit = profile.smoking_habit || "";
  const ethnicity = profile.ethnicity || "";
  const nationality = profile.nationality || "";
  const hobbies = profile.hobbies || [];
  const bio = profile.bio || "";
  const location = profile.location ? (typeof profile.location === 'string' ? profile.location : `${profile.location.city || ''}${profile.location.city && profile.location.country ? ', ' : ''}${profile.location.country || ''}`) : null;

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!profile.id) return;
      const { data } = await supabase
        .from("user_prompts")
        .select("question, answer, display_order")
        .eq("user_id", profile.id)
        .order("display_order", { ascending: true });
      if (data) setPrompts(data);
    };
    fetchPrompts();
  }, [profile.id]);

  // Check if sections should be shown
  const hasPersonalInfo = height || maritalStatus || hasChildren !== null || education || profession;
  const hasReligiousInfo = sect || bornMuslim !== null || religiousPractice || alcoholHabit || smokingHabit;
  const hasLifestyleInfo = (hobbies && hobbies.length > 0) || location;
  const hasBackgroundInfo = ethnicity || nationality;
  const hasPrompts = prompts && prompts.length > 0 && prompts.some((p: any) => p.question && p.answer);

  // Render image with optional name/age overlay (only for first image)
  const renderImage = (photo: string, index: number) => {
    const isMainPhoto = index === 0;
    const screenHeight = Dimensions.get('window').height;
    
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

  // Build sections array - alternate between images and data
  const sections: JSX.Element[] = [];
  let imageIndex = 0;
  let sectionIndex = 0;

  const dataSections: JSX.Element[] = [];

  // Add first image
  if (photos.length > 0) {
    sections.push(renderImage(photos[0], 0));
    imageIndex = 1;
  }

  // Personal Info
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

  // Religious Info
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

  // Lifestyle Info
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

  // Background Info
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

  // Bio
  if (bio) {
    dataSections.push(
      <View key="about" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bioText}>{bio}</Text>
      </View>
    );
  }

  // Prompts
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

  return (
    <View style={styles.container}>
      {photos.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections}
        </ScrollView>
      ) : (
        <View style={[styles.mainImageContainer, styles.placeholder]}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = () => {
  const screenHeight = Dimensions.get('window').height;
  
  return StyleSheet.create({
    container: {
      width,
      height,
      position: "relative",
      backgroundColor: "#000000",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 200, // Space for action buttons
    },
    mainImageContainer: {
      width: '100%',
      height: height, // Full screen height like before
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
    placeholder: {
      justifyContent: "center",
      alignItems: "center",
    },
    placeholderText: {
      fontSize: 80,
      opacity: 0.5,
      color: "white",
    },
  });
};

const styles = getStyles();

