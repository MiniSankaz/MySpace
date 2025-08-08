"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Language } from "../types";
import { defaultLocale } from "../config/locales";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({
  children,
  defaultLanguage = defaultLocale,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("cms-language") as Language;
    if (savedLanguage && (savedLanguage === "th" || savedLanguage === "en")) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("cms-language", newLanguage);
    // Update document lang attribute
    document.documentElement.lang = newLanguage;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
