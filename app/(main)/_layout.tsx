import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle:{ backgroundColor:"#000" }}}>
      <Tabs.Screen name="swipe" options={{ title: "Swipe" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
    </Tabs>
  );
}
