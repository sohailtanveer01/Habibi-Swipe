import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
});
