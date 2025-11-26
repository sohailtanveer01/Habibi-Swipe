import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState, useEffect } from "react";
import Slider from "@react-native-community/slider";

const TIMELINE_OPTIONS = [
  "Less than 3 months",
  "3-6 months",
  "6-12 months",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5+ years",
];

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
    <ScrollView 
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-20 pb-8">
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
              minimumTrackTintColor="#ec4899"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#ec4899"
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
              minimumTrackTintColor="#ec4899"
              maximumTrackTintColor="#ffffff40"
              thumbTintColor="#ec4899"
            />
            
            <View className="flex-row justify-between mt-2">
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[0]}</Text>
              <Text className="text-white/50 text-xs">{TIMELINE_OPTIONS[TIMELINE_OPTIONS.length - 1]}</Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <Pressable
          className="bg-pink-500 p-5 rounded-2xl items-center shadow-lg"
          onPress={next}
          style={{ 
            shadowColor: "#ec4899",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white text-lg font-bold">Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
