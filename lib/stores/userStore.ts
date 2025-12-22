import { create } from "zustand";
import { supabase } from "../supabase";

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  photos?: string[];
  gender?: string;
  dob?: string;
  height?: string;
  marital_status?: string;
  has_children?: boolean;
  sect?: string;
  born_muslim?: boolean;
  religious_practice?: string;
  alcohol_habit?: string;
  smoking_habit?: string;
  hobbies?: string[];
  education?: string;
  profession?: string;
  bio?: string;
  ethnicity?: string;
  nationality?: string;
  location?: { lat: number; lon: number } | null;
  [key: string]: any; // Allow additional fields
}

interface UserState {
  // Auth
  userId: string | null;
  isAuthenticated: boolean;

  // Profile
  profile: UserProfile | null;
  mainPhoto: string | null;
  isLoading: boolean;

  // Actions
  setUser: (userId: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setMainPhoto: (photo: string | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  
  // Async actions
  loadProfile: () => Promise<void>;
  refreshMainPhoto: () => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  userId: null,
  isAuthenticated: false,
  profile: null,
  mainPhoto: null,
  isLoading: false,

  // Sync actions
  setUser: (userId) => {
    set({ userId, isAuthenticated: !!userId });
  },

  setProfile: (profile) => {
    const mainPhoto = profile?.photos?.[0] ?? null;
    set({ profile, mainPhoto });
  },

  setMainPhoto: (photo) => {
    set({ mainPhoto: photo });
    // Also update in profile if it exists
    const { profile } = get();
    if (profile && photo) {
      const currentPhotos = profile.photos || [];
      // If photo is different from first, update the array
      if (currentPhotos[0] !== photo) {
        // Find photo in array and move to front
        const idx = currentPhotos.indexOf(photo);
        if (idx > 0) {
          const newPhotos = [photo, ...currentPhotos.filter((_, i) => i !== idx)];
          set({ profile: { ...profile, photos: newPhotos } });
        }
      }
    }
  },

  updateProfile: (updates) => {
    const { profile } = get();
    if (profile) {
      const newProfile = { ...profile, ...updates };
      const mainPhoto = newProfile.photos?.[0] ?? get().mainPhoto;
      set({ profile: newProfile, mainPhoto });
    }
  },

  // Async actions
  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ userId: null, isAuthenticated: false, profile: null, mainPhoto: null, isLoading: false });
        return;
      }

      set({ userId: user.id, isAuthenticated: true });

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        set({ isLoading: false });
        return;
      }

      const mainPhoto = data?.photos?.[0] ?? null;
      set({ profile: data, mainPhoto, isLoading: false });
    } catch (e) {
      console.error("Error in loadProfile:", e);
      set({ isLoading: false });
    }
  },

  refreshMainPhoto: () => {
    const { profile } = get();
    if (profile?.photos?.[0]) {
      set({ mainPhoto: profile.photos[0] });
    }
  },

  logout: () => {
    set({
      userId: null,
      isAuthenticated: false,
      profile: null,
      mainPhoto: null,
    });
  },
}));

// Selector hooks for optimized re-renders
export const useMainPhoto = () => useUserStore((state) => state.mainPhoto);
export const useProfile = () => useUserStore((state) => state.profile);
export const useUserId = () => useUserStore((state) => state.userId);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);

