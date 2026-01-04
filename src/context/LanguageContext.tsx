"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, Translation } from "@/data/translations";
import { useSearchParams } from "next/navigation";

interface LanguageContextType {
  language: Language;
  t: Translation;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ko");
  const searchParams = useSearchParams();

  useEffect(() => {
    const param = searchParams?.get("lang");
    if (param === "en" || param === "ko") setLanguageState(param as Language);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ko" : "en");
  };

  const value = {
    language,
    t: translations[language],
    toggleLanguage,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
