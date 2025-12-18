import "../global.css";
import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LikesNotificationProvider } from "../lib/likesNotificationContext";

// Configure QueryClient with optimized cache settings
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min
      gcTime: 1000 * 60 * 30, // 30 minutes - cache persists for 30 min (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <QueryClientProvider client={qc}>
          <LikesNotificationProvider>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                // Keep gestures enabled but prevent back navigation to auth
              }}
            >
              <Stack.Screen 
                name="(auth)" 
                options={{
                  // Allow gestures on auth screen
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen 
                name="(main)" 
                options={{
                  // Disable swipe back gesture on main tabs to prevent going back to auth
                  gestureEnabled: false,
                  // Prevent going back to auth when authenticated
                }}
              />
            </Stack>
          </LikesNotificationProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
