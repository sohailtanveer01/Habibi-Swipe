import { View, Text, Dimensions, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

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

/**
 * Minimal image-first swipe card.
 * Shows only the main photo with a subtle gradient + name/age overlay.
 * Swipe down to open profile details modal (handled in parent).
 */
export default function SwipeCard({ profile }: { profile: any }) {
  const photos = profile?.photos || [];
  const mainPhoto = photos.length > 0 ? photos[0] : null;

  const fullName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.name || "Unknown";

  const age = calculateAge(profile?.dob);
  const profession = profile?.profession || "";
  const location = profile?.location
    ? typeof profile.location === "string"
      ? profile.location
      : `${profile.location.city || ""}${profile.location.city && profile.location.country ? ", " : ""}${profile.location.country || ""}`
    : "";

  return (
    <View style={styles.container}>
      {mainPhoto ? (
        <Image
          source={{ uri: mainPhoto }}
          style={styles.image}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
          priority="high"
          placeholderContentFit="cover"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}

      {/* Subtle gradient at bottom for readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Name, Age, and optional profession/location */}
      <View style={styles.infoContainer} pointerEvents="none">
        <Text style={styles.nameText}>
          {profile?.is_boosted ? "⚡ " : ""}
          {fullName}
          {age !== null ? `, ${age}` : ""}
        </Text>
        {(profession || location) && (
          <Text style={styles.subText} numberOfLines={1}>
            {profession}
            {profession && location ? " • " : ""}
            {location}
          </Text>
        )}

        {/* Swipe up hint */}
        <View style={styles.swipeHint}>
          <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.6)" />
          <Text style={styles.swipeHintText}>Swipe up for more</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "#000",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 80,
    opacity: 0.5,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.35,
  },
  infoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 180, // Above the action buttons
    paddingHorizontal: 24,
    alignItems: "center",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  swipeHint: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.7,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
});
