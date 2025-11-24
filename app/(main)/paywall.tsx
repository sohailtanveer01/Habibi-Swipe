import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Purchases from "react-native-purchases";

export default function Paywall() {
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    Purchases.configure({
      apiKey: process.env.EXPO_PUBLIC_RCAT_IOS!,
    });

    (async () => {
      const offerings = await Purchases.getOfferings();
      const available = offerings.current?.availablePackages || [];
      setPackages(available);
    })();
  }, []);

  const buy = async (p: any) => {
    try {
      await Purchases.purchasePackage(p);
      alert("You're premium now 💎");
    } catch (e:any) {
      alert(e.message);
    }
  };

  return (
    <View className="flex-1 bg-black pt-16 px-6">
      <Text className="text-white text-3xl font-bold mb-2">Go Premium</Text>
      <Text className="text-white/70 mb-6">
        See who likes you, undo swipes, and boost visibility.
      </Text>

      {packages.map((p) => (
        <Pressable
          key={p.identifier}
          className="bg-white/10 p-5 rounded-2xl mb-3"
          onPress={() => buy(p)}
        >
          <Text className="text-white text-lg font-semibold">
            {p.product.title}
          </Text>
          <Text className="text-white/70">{p.product.description}</Text>
          <Text className="text-pink-400 mt-1 font-bold">
            {p.product.priceString}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
