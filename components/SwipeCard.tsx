import { View, Text, Image, Dimensions, StyleSheet } from "react-native";

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
  const mainPhoto = photos.length > 0 ? photos[0] : null;

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);

  return (
    <View style={styles.container}>
      {mainPhoto ? (
        <Image
          source={{ uri: mainPhoto }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}

      {/* Name & age centered above buttons */}
      <View style={styles.nameContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{fullName}</Text>
          {age !== null && <Text style={styles.ageText}>{age}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    position: "relative",
    backgroundColor: "black",
  },
  image: {
    width: "100%",
    height: "100%",
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
  nameContainer: {
    position: "absolute",
    bottom: 230,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  nameText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 6,
  },
  ageText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 28,
    fontWeight: "600",
  },
});

