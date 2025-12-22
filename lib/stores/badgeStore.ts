import { create } from "zustand";
import { supabase } from "../supabase";

interface BadgeState {
  // Counts
  unreadMessages: number;
  newLikes: number;
  pendingCompliments: number;

  // Actions
  setUnreadMessages: (count: number) => void;
  setNewLikes: (count: number) => void;
  setPendingCompliments: (count: number) => void;
  
  incrementUnread: (by?: number) => void;
  decrementUnread: (by?: number) => void;
  incrementLikes: (by?: number) => void;
  
  resetUnread: () => void;
  resetLikes: () => void;
  resetAll: () => void;

  // Async actions
  loadAllCounts: () => Promise<void>;
  loadUnreadMessages: () => Promise<void>;
  loadNewLikes: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  // Initial state
  unreadMessages: 0,
  newLikes: 0,
  pendingCompliments: 0,

  // Setters
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  setNewLikes: (count) => set({ newLikes: count }),
  setPendingCompliments: (count) => set({ pendingCompliments: count }),

  // Increment/Decrement
  incrementUnread: (by = 1) => set((s) => ({ unreadMessages: s.unreadMessages + by })),
  decrementUnread: (by = 1) => set((s) => ({ unreadMessages: Math.max(0, s.unreadMessages - by) })),
  incrementLikes: (by = 1) => set((s) => ({ newLikes: s.newLikes + by })),

  // Reset
  resetUnread: () => set({ unreadMessages: 0 }),
  resetLikes: () => set({ newLikes: 0 }),
  resetAll: () => set({ unreadMessages: 0, newLikes: 0, pendingCompliments: 0 }),

  // Async: Load all counts from database
  loadAllCounts: async () => {
    await Promise.all([
      get().loadUnreadMessages(),
      get().loadNewLikes(),
    ]);
  },

  // Load unread messages count
  loadUnreadMessages: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let totalUnread = 0;

      // Get all matches for the user
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`);

      if (matches && matches.length > 0) {
        // Count unread messages (not sent by current user AND read = false)
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("match_id", matches.map((m) => m.id))
          .neq("sender_id", user.id)
          .eq("read", false);

        totalUnread = count || 0;
      }

      // Also count pending compliments (not yet accepted/rejected)
      const { count: complimentCount } = await supabase
        .from("compliments")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("accepted", null);

      set({
        unreadMessages: totalUnread,
        pendingCompliments: complimentCount || 0,
      });
    } catch (e) {
      console.error("Error loading unread messages:", e);
    }
  },

  // Load new likes count
  loadNewLikes: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count users who liked me that I haven't seen yet
      const { count } = await supabase
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("target_user", user.id)
        .eq("action", "like")
        .eq("seen_by_target", false);

      set({ newLikes: count || 0 });
    } catch (e) {
      console.error("Error loading new likes:", e);
    }
  },
}));

// Selector hooks for optimized re-renders
export const useUnreadMessages = () => useBadgeStore((state) => state.unreadMessages);
export const useNewLikes = () => useBadgeStore((state) => state.newLikes);
export const useTotalBadgeCount = () => useBadgeStore((state) => state.unreadMessages + state.pendingCompliments);

