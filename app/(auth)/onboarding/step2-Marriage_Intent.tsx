import { View, Text, Pressable, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState, useEffect } from "react";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

const TIMELINE_OPTIONS = [
  "Less than 3 months",
  "3-6 months",
  "6-12 months",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5+ years",
];

const TOTAL_STEPS = 8;
const CURRENT_STEP = 2;

export default function Step2MarriageIntent() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  // Convert timeline string to index, default to middle option (index 3)
  const getTimelineIndex = (timeline: string) => {
    const index = TIMELINE_OPTIONS.indexOf(timeline);
    return index !== -1 ? index : 3;
  };

  const [getToKnowIndex, setGetToKnowIndex] = useState(getTimelineIndex(data.getToKnowTimeline));
  const [marriageIndex, setMarriageIndex] = useState(getTimelineIndex(data.marriageTimeline));

  const [getToKnowTimeline, setGetToKnowTimeline] = useState(
    data.getToKnowTimeline || TIMELINE_OPTIONS[3]
  );
  const [marriageTimeline, setMarriageTimeline] = useState(
    data.marriageTimeline || TIMELINE_OPTIONS[3]
  );

  // Update timeline string when slider index changes
  useEffect(() => {
    setGetToKnowTimeline(TIMELINE_OPTIONS[getToKnowIndex]);
  }, [getToKnowIndex]);

  useEffect(() => {
    setMarriageTimeline(TIMELINE_OPTIONS[marriageIndex]);
  }, [marriageIndex]);

  const next = () => {
    if (!getToKnowTimeline || !marriageTimeline) {
      alert("Please select both timeline options.");
      return;
    }
    setData((d) => ({
      ...d,
      getToKnowTimeline,
      marriageTimeline,
    }));
    router.push("/onboarding/step3-Religiosity");
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Header with Back Button and Progress Indicators */}
        <View className="pt-20 px-6 pb-8">
          <View className="flex-row items-center justify-between mb-8">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full border border-[#B8860B] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </Pressable>

          {/* Step Indicators - Centered */}
          <View className="flex-row items-center gap-2 flex-1 justify-center px-4">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((indicator) => {
              const getIndicatorForStep = (step: number) => {
                if (step <= 5) return step;
                return 5;
              };
              const activeIndicator = getIndicatorForStep(CURRENT_STEP);
              const isActive = indicator === activeIndicator;
              return (
                <View
                  key={indicator}
                  className={`h-1 rounded-full ${
                    isActive ? "bg-[#F5F573] w-8" : "bg-[#B8860B] w-6"
                  }`}
                />
              );
            })}
          </View>

          {/* Step Text - Right Aligned */}
          <Text className="text-[#B8860B] text-xs font-medium" style={{ width: 50, textAlign: 'right' }}>
            step {CURRENT_STEP}/8
          </Text>
          </View>
        </View>

        <View className="px-6 pb-10">
        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-white text-4xl font-bold mb-3 leading-tight">
            Marriage Intentions
          </Text>
          <Text className="text-white/80 text-xl font-medium">
            Let&apos;s understand your timeline
          </Text>
        </View>

        {/* Get to Know Timeline */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-4 ml-1">
            I would like to get to know someone for
          </Text>
          
          <View className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-2">
            <Text className="text-white text-2xl font-bold text-center mb-6">
              {getToKnowTimeline}
            </Text>
            
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={TIMELINE_OPTIONS.length - 1}
              step={1}
              value={getToKnowIndex}
              onValueChange={(value) => setGetToKnowIndex(Math.round(value))}
              minimumTrackTintColor="#B8860B"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#B8860B"
            />
            
            <View className="flex-row justify-between mt-2">
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[0]}</Text>
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[TIMELINE_OPTIONS.length - 1]}</Text>
            </View>
          </View>
        </View>

        {/* Marriage Timeline */}
        <View className="mb-10">
          <Text className="text-white/70 text-sm font-medium mb-4 ml-1">
            I would like to be married within
          </Text>
          
          <View className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-2">
            <Text className="text-white text-2xl font-bold text-center mb-6">
              {marriageTimeline}
            </Text>
            
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={TIMELINE_OPTIONS.length - 1}
              step={1}
              value={marriageIndex}
              onValueChange={(value) => setMarriageIndex(Math.round(value))}
              minimumTrackTintColor="#B8860B"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#B8860B"
            />
            
            <View className="flex-row justify-between mt-2">
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[0]}</Text>
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[TIMELINE_OPTIONS.length - 1]}</Text>
            </View>
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Fixed Continue Button */}
      <View className="px-6 pb-8 pt-4 bg-black border-t border-white/10">
        <Pressable
          className="bg-[#B8860B] p-5 rounded-2xl items-center shadow-lg"
          onPress={next}
          style={{ 
            shadowColor: "#B8860B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white text-lg font-bold">Continue</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
