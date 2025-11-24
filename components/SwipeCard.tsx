import { View, Text, Image } from "react-native";

export default function SwipeCard({ profile }: any) {
  const photo = profile.photos?.[0];

  return (
    <View className="bg-white/10 rounded-3xl overflow-hidden w-full h-full">
      {photo ? (
        <Image source={{ uri: photo }} className="w-full h-4/5" resizeMode="cover" />
      ) : (
        <View className="w-full h-4/5 bg-white/5 items-center justify-center">
          <Text className="text-white/60">No photo</Text>
        </View>
      )}

      <View className="p-4">
        <Text className="text-white text-2xl font-bold">
          {profile.name}
        </Text>
        <Text className="text-white/70 mt-1" numberOfLines={2}>
          {profile.bio}
        </Text>
      </View>
    </View>
  );
}
