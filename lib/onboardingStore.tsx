import React, { createContext, useContext, useMemo, useState } from "react";

type OnboardingData = {
  name: string;
  gender: string;
  dob: string; // ISO like "1998-06-14"
  intent: string;
  education: string;
  profession: string;
  religion: string;
  bio: string;
  photos: string[]; // Supabase public URLs
  location: { lat: number; lon: number } | null;
};

const defaultData: OnboardingData = {
  name: "",
  gender: "",
  dob: "",
  intent: "serious",
  education: "",
  profession: "",
  religion: "",
  bio: "",
  photos: [],
  location: null,
};

const Ctx = createContext<{
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
} | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const value = useMemo(() => ({ data, setData }), [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
