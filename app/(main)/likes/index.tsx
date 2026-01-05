import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { supabase } from "../../../lib/supabase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 54) / 2; // 2 columns with padding

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

  // Real-time subscription for matches - refresh likes when a match is created
  useEffect(() => {
    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("matches-updates-likes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "matches",
          },
          (payload) => {
            const newMatch = payload.new;
            // Check if this match involves the current user
            if (newMatch.user1 === user.id || newMatch.user2 === user.id) {
              console.log("🔄 New match detected, refreshing likes lists");
              // Refresh both "my likes" and "liked me" since a match affects both
              loadMyLikes();
              loadLikes();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "unmatches",
          },
          (payload) => {
            const newUnmatch = payload.new;
            // Check if this unmatch involves the current user
            if (newUnmatch.user1_id === user.id || newUnmatch.user2_id === user.id) {
              console.log("🔄 New unmatch detected, refreshing likes lists");
              // Refresh both "my likes" and "liked me" since an unmatch affects both
              loadMyLikes();
              loadLikes();
            }
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
  }, []); // Run once on mount, not dependent on activeTab

  const tabs = [
    { key: "myLikes", label: "My likes", count: myLikes.length },
    { key: "likedMe", label: "Liked me", count: likes.length },
    { key: "viewers", label: "Viewers", count: viewers.length },
    { key: "passedOn", label: "Passed on", count: passedOn.length },
  ] as const;

  if (loading && !likes.length && !myLikes.length && !viewers.length && !passedOn.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black pt-20 px-4 pb-16">
      <View className="flex-row rounded-full px-1 py-1.5 mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-full items-center justify-center ${isActive ? "bg-[#B8860B]" : "bg-transparent"
                }`}
            >
              <Text
                className={`text-sm font-semibold ${isActive ? "text-black" : "text-white/70"
                  }`}
              >
                {tab.label}
                {tab.count > 0 ? ` (${tab.count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content per tab */}
      {activeTab === "myLikes" && (
        myLikes.length === 0 ? (
          <View className="flex-1 items-center justify-center px-16">
            <Text className="text-4xl mb-4">✨</Text>
            <Text className="text-white text-lg font-semibold mb-2">No likes yet</Text>
            <Text className="text-white/60 text-center text-sm mb-5">
              Keep swiping to find your perfect match. Your likes will show up here.
            </Text>
            <Pressable
              className="bg-[#B8860B] px-6 py-3 rounded-full"
              onPress={() => router.push("/(main)/swipe")}
            >
              <Text className="text-black font-semibold text-sm">Go to swipe</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={myLikes}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
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
                  className="bg-white/5 rounded-3xl overflow-hidden"
                  style={{
                    width: CARD_WIDTH,
                    height: CARD_WIDTH * 1.45,
                    borderWidth: 1,
                    borderColor: "rgba(184,134,11,0.7)",
                    shadowColor: "#000",
                    shadowOpacity: 0.4,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 16,
                  }}
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              You liked
                            </Text>
                          </View>
                        </View>
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              You liked
                            </Text>
                          </View>
                        </View>
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
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">👀</Text>
            <Text className="text-white text-lg font-semibold mb-2">No viewers yet</Text>
            <Text className="text-white/60 text-center text-sm">
              People who check your profile will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={viewers}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
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
                  className="bg-white/5 rounded-3xl overflow-hidden"
                  style={{
                    width: CARD_WIDTH,
                    height: CARD_WIDTH * 1.45,
                    borderWidth: 1,
                    borderColor: "rgba(184,134,11,0.7)",
                    shadowColor: "#000",
                    shadowOpacity: 0.4,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 16,
                  }}
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              {viewCount > 1 ? `Viewed ${viewCount} times` : "Viewed you"}
                            </Text>
                          </View>
                        </View>
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              {viewCount > 1 ? `Viewed ${viewCount} times` : "Viewed you"}
                            </Text>
                          </View>
                        </View>
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
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">⏳</Text>
            <Text className="text-white text-lg font-semibold mb-2">No passed profiles yet</Text>
            <Text className="text-white/60 text-center text-sm">
              Profiles you skip will show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={passedOn}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
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
                  className="bg-white/5 rounded-3xl overflow-hidden"
                  style={{
                    width: CARD_WIDTH,
                    height: CARD_WIDTH * 1.45,
                    borderWidth: 1,
                    borderColor: "rgba(184,134,11,0.7)",
                    shadowColor: "#000",
                    shadowOpacity: 0.4,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 16,
                  }}
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              You passed
                            </Text>
                          </View>
                        </View>
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              You passed
                            </Text>
                          </View>
                        </View>
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
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl mb-4">💛</Text>
            <Text className="text-white text-lg font-semibold mb-2">No likes yet</Text>
            <Text className="text-white/60 text-center text-sm mb-5">
              When someone likes you, they will appear here.
            </Text>
            <Pressable
              className="bg-[#B8860B] px-6 py-3 rounded-full"
              onPress={() => router.push("/(main)/swipe")}
            >
              <Text className="text-black font-semibold text-sm">Go to swipe</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={likes}
            numColumns={2}
            columnWrapperStyle={{ gap: 14 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 80, paddingTop: 4 }}
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
                  className="bg-white/5 rounded-3xl overflow-hidden"
                  style={{
                    width: CARD_WIDTH,
                    height: CARD_WIDTH * 1.45,
                    borderWidth: 1,
                    borderColor: "rgba(184,134,11,0.7)",
                    shadowColor: "#000",
                    shadowOpacity: 0.4,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 16,
                  }}
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              Liked you
                            </Text>
                          </View>
                        </View>
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
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <View className="flex-row mt-2">
                          <View className="px-2.5 py-1.5 rounded-full bg-white/10">
                            <Text className="text-[11px] text-white/90 font-semibold">
                              Liked you
                            </Text>
                          </View>
                        </View>
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
