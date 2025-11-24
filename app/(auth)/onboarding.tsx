import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [intent, setIntent] = useState("serious");
  const router = useRouter();

  const save = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name,
      bio,
      intent,
      photos: [],
    });

    if (error) return alert(error.message);
    router.replace("/(main)/swipe");
  };

  return (
    <View className="flex-1 bg-black px-6 pt-20">
      <Text className="text-white text-2xl font-bold mb-6">Create Profile</Text>

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4"
        placeholder="Name"
        placeholderTextColor="#777"
        onChangeText={setName}
        value={name}
      />

      <TextInput
        className="bg-white/10 text-white p-4 rounded-2xl mb-4 h-28"
        placeholder="Bio"
        placeholderTextColor="#777"
        onChangeText={setBio}
        value={bio}
        multiline
      />

      <View className="flex-row gap-2 mb-6">
        {["serious","marriage","casual"].map(i => (
          <Pressable
            key={i}
            className={`px-4 py-2 rounded-full ${intent===i?"bg-pink-500":"bg-white/10"}`}
            onPress={()=>setIntent(i)}
          >
            <Text className="text-white">{i}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable className="bg-pink-500 p-4 rounded-2xl items-center" onPress={save}>
        <Text className="text-white font-semibold">Continue</Text>
      </Pressable>
    </View>
  );
}
