import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Linking, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import Logo from "../../components/Logo";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const continueWithEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setEmailLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.push({ pathname: "/(auth)/email-otp", params: { email: trimmed } });
  };

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      // Use Supabase OAuth for Google Sign-In
      // The redirectTo is your app's deep link scheme
      // Supabase will use its callback URL when talking to Google
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "habibiswipe://",
          // The actual redirect URI sent to Google will be: ${supabaseUrl}/auth/v1/callback
          // Make sure this URL is added to Google OAuth authorized redirect URIs
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in browser
        await Linking.openURL(data.url);
        Alert.alert(
          "Continue in Browser",
          "Please complete the sign-in process in your browser, then return to the app."
        );
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in with Google";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Redirect URI mismatch. Please add this URL to Google OAuth settings:\n\n${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback\n\nAlso add it to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Backgrounds - matching onboarding */}
      <LinearGradient
        colors={["rgba(238,189,43,0.65)", "rgba(10,10,10,0)"]}
        style={[styles.gradientBase, styles.gradientTopLeft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(10,10,10,0)", "rgba(238,189,43,0.55)"]}
        style={[styles.gradientBase, styles.gradientBottomRight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Logo variant="transparent" width={150} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to find your Habibi</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#777"
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Pressable
          style={[styles.button, emailLoading && styles.buttonDisabled]}
          onPress={continueWithEmail}
          disabled={emailLoading}
        >
          <Text style={styles.buttonText}>
            {emailLoading ? "Sending code..." : "Continue with Email"}
          </Text>
        </Pressable>

        <Text style={styles.helperText}>
          We&apos;ll send a 6-digit code to verify your email.
        </Text>

        {/* <Pressable
          className="bg-white p-4 rounded-2xl items-center mb-6 flex-row justify-center gap-2"
          onPress={continueWithGoogle}
          disabled={googleLoading}
        >
          <Text className="text-2xl">🔍</Text>
          <Text className="text-gray-900 font-semibold text-base">
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </Text>
        </Pressable> */}

        <Pressable 
          style={styles.linkContainer}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    position: "relative",
  },
  gradientBase: {
    position: "absolute",
    width: 620,
    height: 620,
    borderRadius: 310,
    opacity: 0.9,
    transform: [{ scale: 1.3 }],
  },
  gradientTopLeft: {
    top: -260,
    left: -220,
  },
  gradientBottomRight: {
    bottom: -260,
    right: -220,
  },
  logoContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#B8860B",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#B8860B",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#B8860B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  helperText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 16,
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  linkHighlight: {
    color: "#B8860B",
    fontWeight: "600",
  },
});

