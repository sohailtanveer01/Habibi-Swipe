import { create } from "zustand";
import { supabase } from "../supabase";

// ============================================================================
// TYPES
// ============================================================================
export interface SwipeProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  photos?: string[];
  age?: number;
  profession?: string;
  bio?: string;
  hobbies?: string[];
  is_boosted?: boolean;
  boost_expires_at?: string;
  [key: string]: any;
}

export interface RewindHistoryItem {
  profile: SwipeProfile;
  swipedId: string;
  index: number;
}

interface SwipeState {
  // Feed state
  profiles: SwipeProfile[];
  currentIndex: number;
  isLoading: boolean;
  isSwiping: boolean;
  viewedProfileIds: Set<string>;

  // Rewind state
  lastPassedProfile: RewindHistoryItem | null;
  isRewinding: boolean;

  // Match state
  matchData: { matchId: string; otherUser: any } | null;

  // Actions - Feed
  setProfiles: (profiles: SwipeProfile[]) => void;
  addProfiles: (profiles: SwipeProfile[]) => void;
  setCurrentIndex: (index: number) => void;
  nextProfile: () => void;
  setIsSwiping: (isSwiping: boolean) => void;
  markAsViewed: (profileId: string) => void;
  clearViewedProfiles: () => void;
  resetFeed: () => void;

  // Actions - Rewind
  setLastPassedProfile: (item: RewindHistoryItem | null) => void;
  setIsRewinding: (isRewinding: boolean) => void;
  clearRewindHistory: () => void;

  // Actions - Match
  setMatchData: (matchData: { matchId: string; otherUser: any } | null) => void;
  clearMatchData: () => void;

  // Async Actions
  loadFeed: () => Promise<void>;
  sendSwipe: (action: "like" | "pass" | "superlike", targetProfile?: SwipeProfile) => Promise<{ matched: boolean; matchId?: string; otherUser?: any }>;
  rewindLastPass: () => Promise<boolean>;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  // Initial state
  profiles: [],
  currentIndex: 0,
  isLoading: false,
  isSwiping: false,
  viewedProfileIds: new Set(),

  lastPassedProfile: null,
  isRewinding: false,

  matchData: null,

  // ============================================================================
  // SYNC ACTIONS - FEED
  // ============================================================================
  setProfiles: (profiles) => set({ profiles, currentIndex: 0 }),

  addProfiles: (newProfiles) => set((s) => ({
    profiles: [...s.profiles, ...newProfiles],
  })),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  nextProfile: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),

  setIsSwiping: (isSwiping) => set({ isSwiping }),

  markAsViewed: (profileId) => set((s) => {
    const newSet = new Set(s.viewedProfileIds);
    newSet.add(profileId);
    return { viewedProfileIds: newSet };
  }),

  clearViewedProfiles: () => set({ viewedProfileIds: new Set() }),

  resetFeed: () => set({
    profiles: [],
    currentIndex: 0,
    viewedProfileIds: new Set(),
    lastPassedProfile: null,
    isRewinding: false,
    matchData: null,
  }),

  // ============================================================================
  // SYNC ACTIONS - REWIND
  // ============================================================================
  setLastPassedProfile: (item) => set({ lastPassedProfile: item }),

  setIsRewinding: (isRewinding) => set({ isRewinding }),

  clearRewindHistory: () => set({ lastPassedProfile: null }),

  // ============================================================================
  // SYNC ACTIONS - MATCH
  // ============================================================================
  setMatchData: (matchData) => set({ matchData }),

  clearMatchData: () => set({ matchData: null }),

  // ============================================================================
  // ASYNC ACTIONS
  // ============================================================================
  loadFeed: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // Fetch user preferences for filtering
      const { data: myProfile } = await supabase
        .from("users")
        .select("preferences, gender, location")
        .eq("id", user.id)
        .single();

      // Call the get_swipe_feed Edge Function
      const { data, error } = await supabase.functions.invoke("get_swipe_feed", {
        body: {
          userId: user.id,
          preferences: myProfile?.preferences || {},
          myGender: myProfile?.gender,
          myLocation: myProfile?.location,
        },
      });

      if (error) {
        console.error("Error loading swipe feed:", error);
        set({ isLoading: false });
        return;
      }

      const feedProfiles = data?.profiles || [];
      
      // Filter out already-viewed profiles
      const { viewedProfileIds } = get();
      const filteredProfiles = feedProfiles.filter(
        (p: SwipeProfile) => !viewedProfileIds.has(p.id)
      );

      set({
        profiles: filteredProfiles,
        currentIndex: 0,
        isLoading: false,
      });
    } catch (e) {
      console.error("Error in loadFeed:", e);
      set({ isLoading: false });
    }
  },

  sendSwipe: async (action, targetProfile) => {
    const { profiles, currentIndex, setIsSwiping, markAsViewed, setLastPassedProfile, clearRewindHistory } = get();
    const profile = targetProfile || profiles[currentIndex];
    
    if (!profile) {
      return { matched: false };
    }

    setIsSwiping(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSwiping(false);
        return { matched: false };
      }

      // Mark as viewed
      markAsViewed(profile.id);

      // Insert swipe record
      const { error: swipeError } = await supabase.from("swipes").insert({
        swiper_id: user.id,
        swiped_id: profile.id,
        action,
      });

      if (swipeError) {
        console.error("Error inserting swipe:", swipeError);
        setIsSwiping(false);
        return { matched: false };
      }

      // Handle rewind history
      if (action === "pass") {
        // Store this profile for potential rewind
        setLastPassedProfile({
          profile,
          swipedId: profile.id,
          index: currentIndex,
        });
      } else {
        // Clear rewind history on like/superlike
        clearRewindHistory();
      }

      // Check for match on like/superlike
      if (action === "like" || action === "superlike") {
        const { data: reciprocalSwipe } = await supabase
          .from("swipes")
          .select("id")
          .eq("swiper_id", profile.id)
          .eq("swiped_id", user.id)
          .in("action", ["like", "superlike"])
          .maybeSingle();

        if (reciprocalSwipe) {
          // It's a match! Create match record
          const { data: matchRecord, error: matchError } = await supabase
            .from("matches")
            .insert({
              user1: user.id,
              user2: profile.id,
            })
            .select()
            .single();

          if (!matchError && matchRecord) {
            setIsSwiping(false);
            return {
              matched: true,
              matchId: matchRecord.id,
              otherUser: profile,
            };
          }
        }
      }

      setIsSwiping(false);
      return { matched: false };
    } catch (e) {
      console.error("Error in sendSwipe:", e);
      setIsSwiping(false);
      return { matched: false };
    }
  },

  rewindLastPass: async () => {
    const { lastPassedProfile, profiles, setIsRewinding, setLastPassedProfile, setCurrentIndex } = get();
    
    if (!lastPassedProfile) {
      return false;
    }

    setIsRewinding(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsRewinding(false);
        return false;
      }

      // Delete the swipe record from database
      const { error } = await supabase
        .from("swipes")
        .delete()
        .eq("swiper_id", user.id)
        .eq("swiped_id", lastPassedProfile.swipedId);

      if (error) {
        console.error("Error deleting swipe for rewind:", error);
        setIsRewinding(false);
        return false;
      }

      // Remove from viewed set
      const { viewedProfileIds } = get();
      const newViewedSet = new Set(viewedProfileIds);
      newViewedSet.delete(lastPassedProfile.swipedId);
      set({ viewedProfileIds: newViewedSet });

      // Restore the profile by going back to its index
      // The profile should still be in the profiles array
      const rewindIndex = lastPassedProfile.index;
      
      // If the profile is not at the expected index (edge case), find it
      const profileInArray = profiles.findIndex((p) => p.id === lastPassedProfile.swipedId);
      const targetIndex = profileInArray >= 0 ? profileInArray : rewindIndex;

      setCurrentIndex(targetIndex);
      
      // Clear the rewind history (only one rewind allowed)
      setLastPassedProfile(null);

      // Note: setIsRewinding(false) should be called by the component after animation completes
      return true;
    } catch (e) {
      console.error("Error in rewindLastPass:", e);
      setIsRewinding(false);
      return false;
    }
  },
}));

// ============================================================================
// SELECTOR HOOKS (optimized re-renders)
// ============================================================================
export const useCurrentProfile = () => useSwipeStore((s) => s.profiles[s.currentIndex] || null);
export const useNextProfile = () => useSwipeStore((s) => s.profiles[s.currentIndex + 1] || null);
export const useHasMoreProfiles = () => useSwipeStore((s) => s.currentIndex < s.profiles.length);
export const useCanRewind = () => useSwipeStore((s) => s.lastPassedProfile !== null && !s.isRewinding);
export const useIsLoading = () => useSwipeStore((s) => s.isLoading);
export const useIsSwiping = () => useSwipeStore((s) => s.isSwiping);
export const useMatchData = () => useSwipeStore((s) => s.matchData);

