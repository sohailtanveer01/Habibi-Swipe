import { View, Text, Pressable, ScrollView, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../../lib/onboardingStore";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import OnboardingBackground from "@/components/OnboardingBackground";

const DEFAULT_PROMPTS = [
  "My love language is…",
  "One thing I'm proud of…",
  "The most spontaneous thing I've done…",
  "A green flag about me…",
  "A red flag about me…",
  "My perfect weekend is…",
  "My best habit is…",
  "A secret talent I have…",
  "My friends describe me as…",
  "A dream I'm chasing…",
];

const TOTAL_STEPS = 9;
const CURRENT_STEP = 5;

interface Prompt {
  id: string;
  question: string;
  answer: string;
}

export default function Step5Prompts() {
  const router = useRouter();
  const { data, setData } = useOnboarding();

  // Initialize with 3 empty prompt slots
  const initializePrompts = (): Prompt[] => {
    if (data.prompts && data.prompts.length > 0) {
      const existing = data.prompts.map((p: any, index: number) => ({
        id: p.id || `prompt-${index}`,
        question: p.question || "",
        answer: p.answer || "",
      }));
      // Fill remaining slots up to 3
      while (existing.length < 3) {
        existing.push({
          id: `prompt-${Date.now()}-${existing.length}`,
          question: "",
          answer: "",
        });
      }
      return existing.slice(0, 3);
    }
    // Return 3 empty slots
    return [
      { id: "prompt-0", question: "", answer: "" },
      { id: "prompt-1", question: "", answer: "" },
      { id: "prompt-2", question: "", answer: "" },
    ];
  };

  const [prompts, setPrompts] = useState<Prompt[]>(initializePrompts());
  const [showDropdown, setShowDropdown] = useState<number | null>(null);

  const clearPrompt = (index: number) => {
    const newPrompts = [...prompts];
    newPrompts[index] = {
      id: `prompt-${index}`,
      question: "",
      answer: "",
    };
    setPrompts(newPrompts);
  };

  const updatePromptQuestion = (id: string, question: string) => {
    setPrompts(
      prompts.map((p) => (p.id === id ? { ...p, question } : p))
    );
    setShowDropdown(null);
  };

  const updatePromptAnswer = (id: string, answer: string) => {
    setPrompts(
      prompts.map((p) => (p.id === id ? { ...p, answer } : p))
    );
  };

  const next = () => {
    // Filter out empty prompts (where both question and answer are empty)
    const filledPrompts = prompts.filter(
      (p) => p.question.trim() && p.answer.trim()
    );
    
    // Validate that all filled prompts have both question and answer
    const incompletePrompts = filledPrompts.filter(
      (p) => !p.question.trim() || !p.answer.trim()
    );
    
    if (incompletePrompts.length > 0) {
      alert("Please fill in both the prompt and answer for all prompts you've started.");
      return;
    }

    // Save only filled prompts
    setData((d) => ({
      ...d,
      prompts: filledPrompts,
    }));
    router.push("/onboarding/step6-photos");
  };

  return (
    <OnboardingBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
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
                step {CURRENT_STEP}/{TOTAL_STEPS}
              </Text>
            </View>

            {/* Header Section */}
            <View className="mb-10">
              <Text className="text-white text-4xl font-bold mb-3 leading-tight">
                Add Your Prompts
              </Text>
              <Text className="text-white/80 text-xl font-medium">
                Choose up to 3 prompts and write your answers
              </Text>
            </View>
          </View>

          <View className="px-6 pb-10">
            {/* All 3 Prompt Slots */}
            {prompts.map((prompt, index) => (
              <View key={prompt.id} className="mb-6">
                <View className="bg-white/5 rounded-2xl border border-[#eebd2b]/30 p-4">
                  {/* Prompt Header with Clear Button */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white text-base font-bold">
                      Prompt {index + 1}
                    </Text>
                    {(prompt.question || prompt.answer) && (
                      <Pressable
                        onPress={() => clearPrompt(index)}
                        className="p-2"
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>

                  {/* Prompt Question Dropdown */}
                  <View className="mb-4">
                    <Text className="text-white/70 text-sm font-medium mb-2">
                      Select a prompt
                    </Text>
                    <Pressable
                      onPress={() => setShowDropdown(showDropdown === index ? null : index)}
                      className="bg-white/5 p-4 rounded-xl border border-[#eebd2b]/30"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-base ${
                          prompt.question ? "text-white" : "text-white/50"
                        }`}>
                          {prompt.question || DEFAULT_PROMPTS[index] || DEFAULT_PROMPTS[0]}
                        </Text>
                        <Ionicons 
                          name={showDropdown === index ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#eebd2b" 
                        />
                      </View>
                    </Pressable>

                    {/* Dropdown Options */}
                    {showDropdown === index && (
                      <View className="bg-white/5 rounded-xl border border-[#eebd2b]/30 mt-2 overflow-hidden max-h-64">
                        <ScrollView showsVerticalScrollIndicator={true}>
                          {DEFAULT_PROMPTS.map((option) => {
                            // Check if this prompt is already used in another slot
                            const isUsed = prompts.some(
                              (p, i) => i !== index && p.question === option
                            );
                            return (
                              <Pressable
                                key={option}
                                onPress={() => updatePromptQuestion(prompt.id, option)}
                                disabled={isUsed}
                                className={`p-4 border-b border-white/5 ${
                                  prompt.question === option 
                                    ? "bg-[#B8860B]/20" 
                                    : isUsed
                                    ? "opacity-50"
                                    : ""
                                }`}
                              >
                                <View className="flex-row items-center justify-between">
                                  <Text className={`text-base ${
                                    prompt.question === option 
                                      ? "text-white font-semibold" 
                                      : isUsed
                                      ? "text-white/40"
                                      : "text-white"
                                  }`}>
                                    {option}
                                  </Text>
                                  {isUsed && (
                                    <Text className="text-white/40 text-xs">(Used)</Text>
                                  )}
                                </View>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Answer Input */}
                  {prompt.question && (
                    <View>
                      <Text className="text-white/70 text-sm font-medium mb-2">
                        Your answer
                      </Text>
                      <TextInput
                        className="bg-white/5 text-white p-4 rounded-xl border border-[#eebd2b]/30 text-base"
                        placeholder="Write your answer here..."
                        placeholderTextColor="#999"
                        value={prompt.answer}
                        onChangeText={(text) => updatePromptAnswer(prompt.id, text)}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ minHeight: 100 }}
                      />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Fixed Buttons */}
        <View className="px-6 pb-8 pt-4">
          <Pressable
            className="bg-white/10 p-5 rounded-2xl items-center mb-3"
            onPress={() => router.push("/onboarding/step6-photos")}
          >
            <Text className="text-white/80 text-lg font-semibold">Skip</Text>
          </Pressable>
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
            <Text className="text-white text-lg font-bold">Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </OnboardingBackground>
  );
}

