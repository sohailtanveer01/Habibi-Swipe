import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';

// Global channel for broadcasting active status
let globalActiveStatusChannel: any = null;

/**
 * Check if a user is currently active (was active within the last 5 minutes)
 */
export function isUserActive(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;
  
  try {
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(lastActive.getTime())) {
      console.warn("Invalid lastActiveAt date:", lastActiveAt);
      return false;
    }
    
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // User is considered active if:
    // 1. lastActive is in the past (diffMs >= 0)
    // 2. They were active within the last 5 minutes (diffMinutes <= 5)
    const isActive = diffMs >= 0 && diffMinutes <= 5;
    
    // Debug logging
    if (__DEV__) {
      console.log("🔍 Active status check:", {
        lastActiveAt,
        lastActiveISO: lastActive.toISOString(),
        nowISO: now.toISOString(),
        diffMs,
        diffMinutes: diffMinutes.toFixed(2),
        isActive,
      });
    }
    
    return isActive;
  } catch (error) {
    console.error("Error checking active status:", error);
    return false;
  }
}

/**
 * Hook to periodically update the current user's last_active_at timestamp
 * and broadcast active status via ephemeral events
 * Updates every 30 seconds when the app is in the foreground
 * Clears active status when app goes to background
 */
export function useActiveStatus() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Set up global channel for broadcasting active status
    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a global channel for active status broadcasts
      if (!globalActiveStatusChannel) {
        globalActiveStatusChannel = supabase.channel(`active-status:${user.id}`);
        await globalActiveStatusChannel.subscribe();
      }
    };

    setupChannel();

    const updateActiveStatus = async (isActive: boolean = true) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Broadcast ephemeral active status event
        if (globalActiveStatusChannel) {
          try {
            await globalActiveStatusChannel.send({
              type: "broadcast",
              event: "active_status",
              payload: {
                userId: user.id,
                isActive: isActive,
              },
            });
          } catch (broadcastError) {
            console.error('Error broadcasting active status:', broadcastError);
          }
        }

        // Also update database for other features (like last seen)
        if (isActive) {
          // Update to current time when active
          await supabase
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', user.id);
        } else {
          // Set to a very old timestamp (6 minutes ago) when inactive
          // This ensures they're immediately shown as inactive
          const inactiveTime = new Date();
          inactiveTime.setMinutes(inactiveTime.getMinutes() - 6);
          await supabase
            .from('users')
            .update({ last_active_at: inactiveTime.toISOString() })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error updating active status:', error);
      }
    };

    // Update immediately when hook mounts (app is active)
    updateActiveStatus(true);

    // Set up interval to update every 30 seconds while app is active
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        updateActiveStatus(true);
      }
    }, 30000); // 30 seconds

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && appStateRef.current !== 'active') {
        // App came to foreground - update immediately
        updateActiveStatus(true);
      } else if (nextAppState.match(/inactive|background/) && appStateRef.current === 'active') {
        // App went to background - clear active status immediately
        updateActiveStatus(false);
        // Clear interval since we're not active
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (nextAppState === 'active' && appStateRef.current.match(/inactive|background/)) {
        // App came back to foreground - restart interval
        updateActiveStatus(true);
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            if (appStateRef.current === 'active') {
              updateActiveStatus(true);
            }
          }, 30000);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
      // Note: We don't remove the global channel here as it's shared
      // It will be cleaned up when the app closes
    };
  }, []);
}

