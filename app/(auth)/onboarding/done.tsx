import OnboardingBackground from "@/components/OnboardingBackground";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useOnboarding } from "../../../lib/onboardingStore";
import { supabase } from "../../../lib/supabase";

export default function OnboardingDone() {
  const { data } = useOnboarding();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("Please log in to complete your profile.");
      return;
    }

    setSaving(true);

    try {
      // Upload any local photo URIs that haven't been uploaded yet
      const uploadedPhotos: string[] = [];

      for (const photo of data.photos) {
        // Check if it's already a URL (uploaded) or a local URI (needs upload)
        if (photo.startsWith('http://') || photo.startsWith('https://')) {
          uploadedPhotos.push(photo);
        } else {
          // It's a local URI - upload it
          try {
            const ext = photo.split(".").pop() || "jpg";
            const filePath = `${user.id}/${Date.now()}.${ext}`;

            const res = await fetch(photo);
            const blob = await res.arrayBuffer();

            const { error: uploadError } = await supabase.storage
              .from("profile-photos")
              .upload(filePath, blob, { contentType: `image/${ext}` });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("profile-photos")
              .getPublicUrl(filePath);

            uploadedPhotos.push(urlData.publicUrl);
          } catch (e: any) {
            console.error("Error uploading photo:", e);
            // Continue with other photos even if one fails
          }
        }
      }

      // Build PostGIS geography point if location exists
      const locationPoint = data.location
        ? `SRID=4326;POINT(${data.location.lon} ${data.location.lat})`
        : null;

      const { error } = await supabase.from("users").upsert({
        id: user.id,
        name: `${data.firstName} ${data.lastName}`, // Combine for backward compatibility
        first_name: data.firstName,
        last_name: data.lastName,
        height: data.height,
        marital_status: data.maritalStatus,
        has_children: data.hasChildren,
        gender: data.gender,
        dob: data.dob,
        sect: data.sect,
        born_muslim: data.bornMuslim,
        religious_practice: data.religiousPractice,
        alcohol_habit: data.alcoholHabit,
        smoking_habit: data.smokingHabit,
        hobbies: data.hobbies,
        ethnicity: data.ethnicity,
        nationality: data.nationality,
        education: data.education,
        profession: data.profession,
        religion: data.religion,
        bio: data.bio,
        photos: uploadedPhotos,
        location: locationPoint,
        city: data.city,
        country: data.country,
        verified: false,
        last_active_at: new Date().toISOString(),
      });

      if (error) {
        alert(error.message);
        return;
      }

      // Save prompts to user_prompts table
      if (data.prompts && data.prompts.length > 0) {
        // First, delete any existing prompts for this user
        await supabase
          .from("user_prompts")
          .delete()
          .eq("user_id", user.id);

        // Then insert new prompts with display_order
        const promptsToInsert = data.prompts.map((prompt, index) => ({
          user_id: user.id,
          question: prompt.question,
          answer: prompt.answer,
          display_order: index,
        }));

        const { error: promptsError } = await supabase
          .from("user_prompts")
          .insert(promptsToInsert);

        if (promptsError) {
          console.error("Error saving prompts:", promptsError);
          // Don't block the flow if prompts fail to save
        }
      }

      // Create default preferences for the user (no filters enabled)
      // This ensures the swipe feed works immediately after onboarding
      const { error: prefsError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          location_enabled: false,
          location_filter_type: "distance",
          search_radius_miles: 50,
          search_location: null,
          search_country: null,
          age_min: null,
          age_max: null,
          height_min_cm: null,
          height_max_cm: null,
          ethnicity_preferences: null,
        }, {
          onConflict: "user_id",
        });

      if (prefsError) {
        console.error("Error creating default preferences:", prefsError);
        // Don't block the flow if preferences fail to save
      }

      // Send welcome email (non-blocking - don't wait for it)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Call welcome email function asynchronously - don't await
          supabase.functions.invoke("send-welcome-email", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }).catch((error) => {
            // Silently fail - don't block onboarding completion
            console.error("Failed to send welcome email:", error);
          });
        }
      } catch (emailError) {
        // Silently fail - don't block onboarding completion
        console.error("Error calling welcome email function:", emailError);
      }

      router.replace("/swipe");
    } catch (e: any) {
      alert(e.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingBackground>
      <View className="flex-1 px-6 pt-16 items-center justify-center">
        <Text className="text-white text-3xl font-bold mb-2">All Set!</Text>
        <Text className="text-white/70 mb-8 text-center">
          Your profile is ready. Let’s find your Habibi 💗
        </Text>

        <Pressable
          className="bg-[#eebd2b] px-8 py-4 rounded-2xl items-center"
          onPress={finish}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black text-lg font-semibold">Start Swiping</Text>
          )}
        </Pressable>
      </View>
    </OnboardingBackground>
  );
}
