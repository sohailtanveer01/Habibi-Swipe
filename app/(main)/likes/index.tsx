import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Dimensions, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
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
  const [myLikes, setMyLikes] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [passedOn, setPassedOn] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"myLikes" | "likedMe" | "viewers" | "passedOn">("likedMe");
  const [complimentModalVisible, setComplimentModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [complimentMessage, setComplimentMessage] = useState("");
  const [sendingCompliment, setSendingCompliment] = useState(false);

  const loadLikes = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }

    console.log("Fetching users who liked me for user:", user.id);

    const { data, error } = await supabase.functions.invoke("get-liked-me");

    if (error) {
      console.error("Error fetching liked me:", error);
      alert(`Error loading liked me: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("Liked me response:", data);
    
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
      } else if (parsedData.likedMe && Array.isArray(parsedData.likedMe)) {
        // If data has a likedMe property
        likesArray = parsedData.likedMe;
      } else if (parsedData.likes && Array.isArray(parsedData.likes)) {
        // Fallback to likes property
        likesArray = parsedData.likes;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        // If data is wrapped in a data property
        likesArray = parsedData.data;
      }
    }
    
    console.log("Parsed liked me array:", likesArray.length);
    console.log("First liked me item:", likesArray[0] ? JSON.stringify(likesArray[0], null, 2) : "none");
    
    setLikes(likesArray);
    setLoading(false);
  };

  const loadMyLikes = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }

    console.log("Fetching my likes for user:", user.id);

    const { data, error } = await supabase.functions.invoke("get-my-likes");

    if (error) {
      console.error("Error fetching my likes:", error);
      alert(`Error loading my likes: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("My likes response:", data);
    
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
    let myLikesArray = [];
    if (parsedData) {
      if (Array.isArray(parsedData)) {
        myLikesArray = parsedData;
      } else if (parsedData.myLikes && Array.isArray(parsedData.myLikes)) {
        myLikesArray = parsedData.myLikes;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        myLikesArray = parsedData.data;
      }
    }
    
    console.log("Parsed my likes array:", myLikesArray.length);
    console.log("First my like item:", myLikesArray[0] ? JSON.stringify(myLikesArray[0], null, 2) : "none");
    setMyLikes(myLikesArray);
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

  const loadPassedOn = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.log("No user found");
      setLoading(false);
      return;
    }

    console.log("Fetching users passed on by user:", user.id);

    const { data, error } = await supabase.functions.invoke("get-passed-on");

    if (error) {
      console.error("Error fetching passed on:", error);
      alert(`Error loading passed on: ${error.message}`);
      setLoading(false);
      return;
    }

    console.log("Passed on response:", data);
    
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
    let passedOnArray = [];
    if (parsedData) {
      if (Array.isArray(parsedData)) {
        passedOnArray = parsedData;
      } else if (parsedData.passedOn && Array.isArray(parsedData.passedOn)) {
        passedOnArray = parsedData.passedOn;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        passedOnArray = parsedData.data;
      }
    }
    
    console.log("Parsed passed on array:", passedOnArray.length);
    setPassedOn(passedOnArray);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "myLikes") {
      loadMyLikes();
    } else if (activeTab === "likedMe") {
      loadLikes();
    } else if (activeTab === "viewers") {
      loadViewers();
    } else if (activeTab === "passedOn") {
      loadPassedOn();
    }
  }, [activeTab]);

  // Real-time subscription for profile views
  useEffect(() => {
    if (activeTab !== "viewers") return;

    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("profile-views-updates")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "profile_views",
            filter: `viewed_id=eq.${user.id}`, // Only listen for views of current user
          },
          (payload) => {
            console.log("🔄 New profile view detected, refreshing viewers list");
            // Refresh viewers list to get updated counts
            loadViewers();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeTab]);

  return (
    <View className="flex-1 bg-black pt-12 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-2xl font-bold">Likes</Text>
        <Pressable
          onPress={
            activeTab === "myLikes" 
              ? loadMyLikes 
              : activeTab === "likedMe" 
              ? loadLikes 
              : activeTab === "viewers"
              ? loadViewers
              : loadPassedOn
          }
          disabled={loading}
          className="bg-[#B8860B] px-4 py-2 rounded-full flex-row items-center gap-2"
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold">Refresh</Text>
          )}
        </Pressable>
      </View>

      {/* Top tabs: My Likes / Liked Me / Viewers / Passed On */}
      <View className="flex-row bg-white/5 rounded-full p-1 mb-4">
        {[
          { key: "myLikes", label: "my likes" },
          { key: "likedMe", label: "liked me" },
          { key: "viewers", label: "viewers" },
          { key: "passedOn", label: "passed on" },
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
        myLikes.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-base">No likes yet</Text>
          </View>
        ) : (
          <FlatList
            data={myLikes}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            keyExtractor={(item, index) => item.id || `my-like-${index}`}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadMyLikes} tintColor="#fff" />
            }
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
              
              return (
                <Pressable
                  className="bg-white/10 rounded-2xl overflow-hidden"
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
                  onPress={async () => {
                    // Track profile view when tapping from my likes tab
                    try {
                      await supabase.functions.invoke("create-profile-view", {
                        body: { viewed_id: item.id },
                      });
                      console.log("✅ Profile view recorded from my likes tab:", item.id);
                    } catch (error) {
                      console.error("Error recording profile view from my likes tab:", error);
                      // Continue with navigation even if view tracking fails
                    }
                    router.push(`/(main)/swipe?userId=${item.id}&source=myLikes`);
                  }}
                >
                  {mainPhoto ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image
                        source={{ uri: mainPhoto }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        priority="normal"
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
        )
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
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadViewers} tintColor="#fff" />
            }
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
                  onPress={async () => {
                    // Track profile view when tapping from viewers tab
                    try {
                      await supabase.functions.invoke("create-profile-view", {
                        body: { viewed_id: item.id },
                      });
                      console.log("✅ Profile view recorded from viewers tab:", item.id);
                    } catch (error) {
                      console.error("Error recording profile view from viewers tab:", error);
                      // Continue with navigation even if view tracking fails
                    }
                    // Navigate to swipe screen with this user's profile
                    router.push(`/(main)/swipe?userId=${item.id}&source=viewers`);
                  }}
                >
                  {mainPhoto ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image
                        source={{ uri: mainPhoto }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        priority="normal"
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

      {activeTab === "passedOn" && (
        passedOn.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-base">No passed profiles yet</Text>
          </View>
        ) : (
          <FlatList
            data={passedOn}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            keyExtractor={(item, index) => item.id || `passed-${index}`}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadPassedOn} tintColor="#fff" />
            }
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
              
              return (
                <Pressable
                  className="bg-white/10 rounded-2xl overflow-hidden"
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
                  onPress={async () => {
                    // Navigate to swipe screen with this user's profile
                    // From passed on, user can change their mind and like them
                    router.push(`/(main)/swipe?userId=${item.id}&source=passedOn`);
                  }}
                >
                  {mainPhoto ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image
                        source={{ uri: mainPhoto }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        priority="normal"
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
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLikes} tintColor="#fff" />
          }
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
                  onPress={async () => {
                    // Track profile view when tapping from likes tab
                    try {
                      await supabase.functions.invoke("create-profile-view", {
                        body: { viewed_id: item.id },
                      });
                      console.log("✅ Profile view recorded from likes tab:", item.id);
                    } catch (error) {
                      console.error("Error recording profile view from likes tab:", error);
                      // Continue with navigation even if view tracking fails
                    }
                    // Navigate to swipe screen with this user's profile
                    router.push(`/(main)/swipe?userId=${item.id}&source=likedMe`);
                  }}
              >
                {mainPhoto ? (
                  <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <Image
                      source={{ uri: mainPhoto }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      priority="normal"
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

      {/* Compliment Modal */}
      <Modal
        visible={complimentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setComplimentModalVisible(false);
          setComplimentMessage("");
          setSelectedUser(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/80 justify-end">
            <Pressable
              className="flex-1"
              onPress={() => {
                setComplimentModalVisible(false);
                setComplimentMessage("");
                setSelectedUser(null);
              }}
            />
            <View className="bg-black border-t border-white/20 rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-xl font-bold">
                  Send Compliment 💬
                </Text>
                <Pressable
                  onPress={() => {
                    setComplimentModalVisible(false);
                    setComplimentMessage("");
                    setSelectedUser(null);
                  }}
                >
                  <Text className="text-white/70 text-lg">✕</Text>
                </Pressable>
              </View>
              
              {selectedUser && (
                <>
                  <Text className="text-white/80 text-sm mb-4">
                    Send a message to {selectedUser.first_name || selectedUser.name || "this user"} before matching
                  </Text>
                  
                  <TextInput
                    className="bg-white/10 text-white rounded-2xl p-4 mb-4 min-h-[120px] text-base"
                    placeholder="Write your compliment (max 200 characters)..."
                    placeholderTextColor="#FFFFFF60"
                    multiline
                    numberOfLines={5}
                    maxLength={200}
                    value={complimentMessage}
                    onChangeText={setComplimentMessage}
                    style={{ textAlignVertical: "top" }}
                  />
                  
                  <Text className="text-white/50 text-xs mb-4 text-right">
                    {complimentMessage.length}/200
                  </Text>
                  
                  <Pressable
                    className={`bg-[#B8860B] rounded-2xl py-4 items-center ${sendingCompliment || !complimentMessage.trim() ? "opacity-50" : ""}`}
                    disabled={sendingCompliment || !complimentMessage.trim()}
                    onPress={async () => {
                      if (!complimentMessage.trim() || !selectedUser) return;
                      
                      setSendingCompliment(true);
                      try {
                        const { error, data } = await supabase.functions.invoke("send-compliment", {
                          body: {
                            recipientId: selectedUser.id,
                            message: complimentMessage.trim(),
                          },
                        });
                        
                        if (error) {
                          Alert.alert("Error", error.message || "Failed to send compliment. Please try again.");
                          setSendingCompliment(false);
                          return;
                        }
                        
                        Alert.alert("Success", "Compliment sent! They'll see it in their chat list.", [
                          {
                            text: "OK",
                            onPress: () => {
                              setComplimentModalVisible(false);
                              setComplimentMessage("");
                              setSelectedUser(null);
                              setSendingCompliment(false);
                              // Refresh the likes list
                              loadMyLikes();
                            },
                          },
                        ]);
                      } catch (error: any) {
                        console.error("Error sending compliment:", error);
                        Alert.alert("Error", error.message || "Failed to send compliment. Please try again.");
                        setSendingCompliment(false);
                      }
                    }}
                  >
                    <Text className="text-white text-base font-bold">
                      {sendingCompliment ? "Sending..." : "Send Compliment"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

