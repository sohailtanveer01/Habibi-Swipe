import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

// Complete OAuth session in web browser
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  // Handle OAuth callback from deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        
        // Supabase OAuth redirects use hash fragments
        const hash = url.hash.substring(1); // Remove #
        const hashParams = new URLSearchParams(hash);
        let accessToken = hashParams.get("access_token");
        let refreshToken = hashParams.get("refresh_token");

        // Fallback to query params
        if (!accessToken || !refreshToken) {
          accessToken = url.searchParams.get("access_token");
          refreshToken = url.searchParams.get("refresh_token");
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            Alert.alert("Error", "Failed to sign in with Google. Please try again.");
            setGoogleLoading(false);
            return;
          }

          if (session?.user) {
            await handlePostGoogleSignIn(session.user);
          }
        } else {
          // If no tokens in URL, check if Supabase already set the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            await handlePostGoogleSignIn(session.user);
          }
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
        setGoogleLoading(false);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("auth/callback")) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePostGoogleSignIn = async (user: any) => {
    try {
      // Check if user is deactivated
      const { data: statusData, error: statusError } = await supabase.functions.invoke("check-user-status", {
        body: { email: user.email }
      });

      if (statusError) {
        console.error("Error checking user status:", statusError);
      } else if (statusData && statusData.exists && statusData.account_active === false) {
        setGoogleLoading(false);
        // User is deactivated - reactivate account
        const { error: activeError } = await supabase
          .from("users")
          .update({ account_active: true })
          .eq("id", user.id);

        if (activeError) {
          console.error("Error reactivating account:", activeError);
        }
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos, email")
        .eq("id", user.id)
        .maybeSingle();

      // If profile doesn't exist, create a basic one with Google info
      if (!profile) {
        const { error: createError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || "",
            account_active: true,
            photos: user.user_metadata?.avatar_url ? [user.user_metadata.avatar_url] : [],
            verified: false,
            last_active_at: new Date().toISOString(),
          });

        if (createError) {
          console.error("Error creating user profile:", createError);
        }
      } else if (profile.email !== user.email) {
        // Update email if it changed
        await supabase
          .from("users")
          .update({ email: user.email })
          .eq("id", user.id);
      }

      // Re-fetch profile to check onboarding status
      const { data: updatedProfile } = await supabase
        .from("users")
        .select("id, name, photos")
        .eq("id", user.id)
        .maybeSingle();

      setGoogleLoading(false);

      if (updatedProfile && updatedProfile.name && updatedProfile.photos?.length > 0) {
        // User has completed onboarding - go to main app
        router.replace("/(main)/swipe");
      } else {
        // User needs to complete onboarding
        router.replace("/(auth)/onboarding/step1-basic");
      }
    } catch (error: any) {
      console.error("Error in post-Google sign-in:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
      setGoogleLoading(false);
    }
  };

  const loginWithEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user is deactivated
      const { data: statusData, error: statusError } = await supabase.functions.invoke("check-user-status", {
        body: { email: trimmed }
      });

      console.log("User status check response:", { statusData, statusError });

      if (statusError) {
        console.error("Error checking user status:", statusError);
        // Fallback: proceed to login if check fails
      } else if (statusData && statusData.exists && statusData.account_active === false) {
        setLoading(false);
        // User is deactivated - go to reactivation screen
        router.push({ pathname: "/(auth)/reactivate", params: { email: trimmed } });
        return;
      }

      // 2. Proceed with OTP if active or doesn't exist
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false }, // Don't create user on login, only signup
      });

      if (error) {
        if (error.message.includes("signups are not allowed")) {
          Alert.alert(
            "Account Not Found",
            "This email is not registered yet. Please click 'Sign Up' below to create a new account.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Error", error.message);
        }
        return;
      }

      // 3. Navigate to email OTP verification screen
      router.push({ pathname: "/(auth)/email-otp", params: { email: trimmed } });
    } catch (error) {
      console.error("Unexpected error in login:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Supabase URL not configured");
      }

      // Use a simple deep link format that Supabase can handle
      // The scheme is "habibiswipe" as defined in app.config.js
      const redirectUrl = "habibiswipe://auth/callback";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === "success" && result.url) {
          // Supabase redirects with hash fragments, not query params
          // Parse the URL to extract tokens from hash
          const url = new URL(result.url);
          
          // Check hash fragment first (Supabase uses this)
          const hash = url.hash.substring(1); // Remove #
          const hashParams = new URLSearchParams(hash);
          let accessToken = hashParams.get("access_token");
          let refreshToken = hashParams.get("refresh_token");

          // Fallback to query params if hash doesn't have tokens
          if (!accessToken || !refreshToken) {
            accessToken = url.searchParams.get("access_token");
            refreshToken = url.searchParams.get("refresh_token");
          }

          if (accessToken && refreshToken) {
            // Set the session
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }

            if (session?.user) {
              await handlePostGoogleSignIn(session.user);
            }
          } else {
            // If no tokens in URL, try to get session from Supabase
            // This handles cases where Supabase sets the session automatically
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (!sessionError && session?.user) {
              await handlePostGoogleSignIn(session.user);
            } else {
              throw new Error("Failed to get authentication tokens");
            }
          }
        } else if (result.type === "cancel") {
          setGoogleLoading(false);
        } else {
          setGoogleLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      const errorMessage = error.message || "Failed to sign in with Google";
      
      if (errorMessage.includes("redirect_uri_mismatch")) {
        Alert.alert(
          "Configuration Error",
          `Please add this URL to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:\n\nhabibiswipe://auth/callback`
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
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
        <Logo variant="transparent" width={150} height={150} style="" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#666"
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={loginWithEmail}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending code..." : "Continue"}
            </Text>
          </Pressable>

          <Text style={styles.helperText}>
            We&apos;ll send a 6-digit code to verify your email.
          </Text>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <Pressable
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={loginWithGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>🔍</Text>
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.linkContainer}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.linkText}>
            Don&apos;t have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
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
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 48,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(238, 189, 43, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#FFFFFF",
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
    lineHeight: 18,
  },
  linkContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  linkText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  linkHighlight: {
    color: "#B8860B",
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
