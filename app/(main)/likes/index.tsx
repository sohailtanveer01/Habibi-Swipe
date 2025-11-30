import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

// Clean photo URLs - remove localhost references and extract valid Supabase URLs
function cleanPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Remove localhost references (e.g., "blob:http://localhost:8081/...")
  if (url.includes('localhost')) {
    // Extract the Supabase URL part before the localhost reference
    const supabasePart = url.split(':http://localhost')[0];
    if (supabasePart && supabasePart.startsWith('http')) {
      return supabasePart;
    }
    return null;
  }
  
  // Check if it's a valid HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  return null;
}

export default function LikesScreen() {
  const router = useRouter();
  const [likes, setLikes] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"myLikes" | "likedMe" | "viewers">("likedMe");

  const loadLikes = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }

    console.log("Fetching likes for user:", user.id);

    const { data, error } = await supabase.functions.invoke("get_likes");

    if (error) {
      console.error("Error fetching likes:", error);
      alert(`Error loading likes: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("Likes response (raw):", data);
    
    // Parse the response if it's a string
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
        console.log("Parsed response:", parsedData);
      } catch (e) {
        console.error("Error parsing response:", e);
        setLoading(false);
        return;
      }
    }
    
    // Handle different response formats
    let likesArray = [];
    if (parsedData) {
      if (Array.isArray(parsedData)) {
        // If data is directly an array
        likesArray = parsedData;
      } else if (parsedData.likes && Array.isArray(parsedData.likes)) {
        // If data has a likes property
        likesArray = parsedData.likes;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        // If data is wrapped in a data property
        likesArray = parsedData.data;
      }
    }
    
    console.log("Parsed likes array:", likesArray.length);
    console.log("First like item:", likesArray[0] ? JSON.stringify(likesArray[0], null, 2) : "none");
    
    setLikes(likesArray);
    setLoading(false);
  };

  const loadViewers = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }

    console.log("Fetching viewers for user:", user.id);

    const { data, error } = await supabase.functions.invoke("get-viewers");

    if (error) {
      console.error("Error fetching viewers:", error);
      alert(`Error loading viewers: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("Viewers response:", data);
    
    // Parse the response if it's a string
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("Error parsing response:", e);
        setLoading(false);
        return;
      }
    }
    
    // Handle different response formats
    let viewersArray = [];
    if (parsedData) {
      if (Array.isArray(parsedData)) {
        viewersArray = parsedData;
      } else if (parsedData.viewers && Array.isArray(parsedData.viewers)) {
        viewersArray = parsedData.viewers;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        viewersArray = parsedData.data;
      }
    }
    
    console.log("Parsed viewers array:", viewersArray.length);
    setViewers(viewersArray);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "likedMe") {
      loadLikes();
    } else if (activeTab === "viewers") {
      loadViewers();
    }
  }, [activeTab]);

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-2xl font-bold">Likes</Text>
        {(activeTab === "likedMe" || activeTab === "viewers") && (
          <Pressable
            onPress={activeTab === "likedMe" ? loadLikes : loadViewers}
            disabled={loading}
            className="bg-pink-500 px-4 py-2 rounded-full flex-row items-center gap-2"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold">Refresh</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Top tabs: My Likes / Liked Me / Viewers */}
      <View className="flex-row bg-white/5 rounded-full p-1 mb-4">
        {[
          { key: "myLikes", label: "my likes" },
          { key: "likedMe", label: "liked me" },
          { key: "viewers", label: "viewers" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-full items-center justify-center ${
                isActive ? "bg-white" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? "text-black" : "text-white/70"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content per tab */}
      {activeTab === "myLikes" && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/70 text-base">
            My Likes page – we will wire this next.
          </Text>
        </View>
      )}

      {activeTab === "viewers" && (
        viewers.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-base">No viewers yet</Text>
          </View>
        ) : (
          <FlatList
            data={viewers}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            keyExtractor={(item, index) => item.id || `viewer-${index}`}
            renderItem={({ item }) => {
              // Clean and get the first valid photo
              let mainPhoto: string | null = null;
              if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
                for (const photo of item.photos) {
                  const cleaned = cleanPhotoUrl(photo);
                  if (cleaned) {
                    mainPhoto = cleaned;
                    break;
                  }
                }
              }
              
              const fullName = item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.name || "Unknown";
              
              const viewCount = item.viewCount || 1;
              
              return (
                <Pressable
                  className="bg-white/10 rounded-2xl overflow-hidden"
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
                  onPress={() => router.push(`/(main)/profile/preview?userId=${item.id}`)}
                >
                  {mainPhoto ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image
                        source={{ uri: mainPhoto }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {/* Gradient overlay for text readability */}
                      <View 
                        style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          height: 80, 
                          backgroundColor: 'rgba(0,0,0,0.6)' 
                        }} 
                      />
                      {/* Name and view count on bottom */}
                      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                        <Text className="text-white text-lg font-bold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        {viewCount > 1 && (
                          <Text className="text-white/70 text-xs mt-1">
                            Viewed {viewCount} times
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View className="w-full h-full bg-white/5 items-center justify-center" style={{ position: 'relative' }}>
                      <Text className="text-white/60 text-4xl">👤</Text>
                      <View 
                        style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          height: 80, 
                          backgroundColor: 'rgba(0,0,0,0.6)' 
                        }} 
                      />
                      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                        <Text className="text-white text-lg font-bold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        {viewCount > 1 && (
                          <Text className="text-white/70 text-xs mt-1">
                            Viewed {viewCount} times
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )
      )}

      {activeTab === "likedMe" && (
        likes.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-base">No likes yet</Text>
          </View>
        ) : (
        <FlatList
          data={likes}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          keyExtractor={(item, index) => item.id || item.swipe_id || `like-${index}`}
          renderItem={({ item }) => {
            // Clean and get the first valid photo
            let mainPhoto: string | null = null;
            if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
              // Try each photo until we find a valid one
              for (const photo of item.photos) {
                const cleaned = cleanPhotoUrl(photo);
                if (cleaned) {
                  mainPhoto = cleaned;
                  break;
                }
              }
            }
            
            const fullName = item.first_name && item.last_name
              ? `${item.first_name} ${item.last_name}`
              : item.name || "Unknown";
            
            console.log("Rendering like card:", {
              name: fullName,
              hasPhotos: item.photos?.length || 0,
              mainPhoto: mainPhoto ? "valid" : "none",
              rawPhotos: item.photos
            });
            
            return (
              <Pressable
                className="bg-white/10 rounded-2xl overflow-hidden"
                style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
                onPress={() => router.push(`/(main)/profile/preview?userId=${item.id}`)}
              >
                {mainPhoto ? (
                  <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <Image
                      source={{ uri: mainPhoto }}
                      className="w-full h-full"
                      resizeMode="cover"
                      onError={(e) => {
                        console.log("Image load error for:", mainPhoto);
                        console.log("Error details:", e.nativeEvent);
                      }}
                      onLoad={() => {
                        console.log("Image loaded successfully:", mainPhoto);
                      }}
                    />
                    {/* Gradient overlay for text readability */}
                    <View 
                      style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        height: 80, 
                        backgroundColor: 'rgba(0,0,0,0.6)' 
                      }} 
                    />
                    {/* Name on bottom left */}
                    <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                      <Text className="text-white text-lg font-bold" numberOfLines={1}>
                        {fullName}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="w-full h-full bg-white/5 items-center justify-center" style={{ position: 'relative' }}>
                    <Text className="text-white/60 text-4xl">👤</Text>
                    {/* Name on bottom left even without photo */}
                    <View 
                      style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        height: 80, 
                        backgroundColor: 'rgba(0,0,0,0.6)' 
                      }} 
                    />
                    <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                      <Text className="text-white text-lg font-bold" numberOfLines={1}>
                        {fullName}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      ))}
    </View>
  );
}

