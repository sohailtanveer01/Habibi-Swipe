import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, Alert, Keyboard, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";

export default function EmailOTP() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const emailAddress = (email as string) || "";
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!emailAddress) {
      Alert.alert("Error", "Missing email address. Please start again.", [
        { text: "OK", onPress: () => router.replace("/(auth)/signup") },
      ]);
    }
  }, [emailAddress, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");
    
    if (numericText.length > 1) {
      // Handle paste: distribute digits across fields
      const digits = numericText.slice(0, 6).split("");
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      
      // Focus the next empty field or the last field
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      // If all 6 digits are filled, dismiss keyboard
      if (newCode.every(d => d !== "")) {
        Keyboard.dismiss();
      }
    } else {
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      // Auto-focus next field if digit entered
      if (numericText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else if (numericText && index === 5) {
        // Last field filled, dismiss keyboard
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous field
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }

    // Dismiss keyboard when verifying
    Keyboard.dismiss();
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: emailAddress,
      token: fullCode,
      type: "email",
    });
    setVerifying(false);

    if (error) {
      Alert.alert("Error", error.message);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("id, name, photos")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.name && profile.photos?.length > 0) {
        // User has completed onboarding - go to main app
        router.replace("/(main)/swipe");
      } else {
        // User needs to complete onboarding (new signup)
        router.replace("/(auth)/onboarding/step1-basic");
      }
    } else {
      router.replace("/(auth)/onboarding/step1-basic");
    }
  };

  const resend = async () => {
    if (countdown > 0) return;

    setResending(true);
    // Resend OTP - allow user creation in case it's a signup flow
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddress,
      options: { shouldCreateUser: true },
    });
    setResending(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Sent", "We sent you another code.");
      setCountdown(60); // Reset countdown
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
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

      {/* Content */}
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View className="flex-row items-center justify-center gap-2 mb-12">
          <Text className="text-[#eebd2b] text-4xl">💛</Text>
          <Text className="text-white text-3xl font-bold tracking-tight">
            Habibi Swipe
          </Text>
        </View>

        {/* Heading */}
        <Text className="text-white text-3xl font-bold text-center mb-3 tracking-tight">
          Enter Verification Code
        </Text>

        {/* Instructional Text */}
        <Text className="text-white/70 text-base text-center mb-8 px-4">
          We sent a 6-digit code to your email. Please enter it below to continue.
        </Text>

        {/* 6 Input Fields with Glassmorphism */}
        <View className="flex-row justify-center gap-3 mb-6 px-4">
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              className="text-white text-2xl font-bold text-center"
              style={[styles.input, digit ? styles.inputFilled : null]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
            />
          ))}
        </View>

        {/* Resend Section */}
        <View className="flex-row items-center justify-center mb-6 px-4">
          <Text className="text-white/50 text-sm">Didn&apos;t receive the code? </Text>
          <Pressable onPress={resend} disabled={countdown > 0 || resending}>
            <Text 
              className="text-[#eebd2b] text-sm font-bold underline"
              style={{ opacity: countdown > 0 ? 0.5 : 1 }}
            >
              Resend OTP
            </Text>
          </Pressable>
          {countdown > 0 && (
            <Text className="text-white/50 text-sm">
              {" "}({formatTime(countdown)})
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <View className="px-4">
          <Pressable
            className="bg-[#eebd2b] rounded-full items-center justify-center"
            style={[
              styles.button,
              { opacity: code.join("").length !== 6 ? 0.5 : 1 }
            ]}
            onPress={verify}
            disabled={verifying || code.join("").length !== 6}
          >
            <Text className="text-[#0A0A0A] font-bold text-base tracking-wide">
              {verifying ? "Verifying..." : "Verify"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    paddingHorizontal: 24,
    position: "relative",
  },
  content: {
    zIndex: 1,
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
  input: {
    width: 48,
    height: 64,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(238, 189, 43, 0.3)",
    borderRadius: 8,
  },
  inputFilled: {
    borderColor: "rgba(238, 189, 43, 0.6)",
  },
  button: {
    height: 56,
    paddingHorizontal: 20,
  },
});