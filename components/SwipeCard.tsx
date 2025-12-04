import { View, Text, Dimensions, StyleSheet, ScrollView } from "react-native";
import { Image } from "expo-image";

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

  const fullName =
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.name || "Unknown";

  const age = calculateAge(profile.dob);

  return (
    <View style={styles.container}>
      {photos.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {photos.map((photo: string, index: number) => (
            <View key={index} style={styles.photoWrapper}>
              <Image
                source={{ uri: photo }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                priority="high"
              />

              {/* Name & age only on the first (main) photo */}
              {index === 0 && (
                <View style={styles.nameOverlay}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nameText}>{fullName}</Text>
                    {age !== null && <Text style={styles.ageText}>{age}</Text>}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>👤</Text>
        </View>
      )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  photoWrapper: {
    width,
    height,
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
  nameOverlay: {
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

