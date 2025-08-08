"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Language } from "../types";
import { translationService } from "../services/translation.service";
import { LanguageContext } from "../contexts/LanguageContext";

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }

  const { language, setLanguage } = context;
  const [, forceUpdate] = useState({});

  // Force re-render when language changes
  useEffect(() => {
    translationService.setCurrentLanguage(language);
    forceUpdate({});
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      return translationService.translate(key, language, params);
    },
    [language],
  );

  const formatDate = useCallback(
    (date: Date) => {
      return translationService.formatDate(date, language);
    },
    [language],
  );

  const formatTime = useCallback(
    (date: Date) => {
      return translationService.formatTime(date, language);
    },
    [language],
  );

  const formatDateTime = useCallback(
    (date: Date) => {
      return translationService.formatDateTime(date, language);
    },
    [language],
  );

  const formatNumber = useCallback(
    (number: number) => {
      return translationService.formatNumber(number, language);
    },
    [language],
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      return translationService.formatCurrency(amount, language);
    },
    [language],
  );

  const getRelativeTime = useCallback(
    (date: Date) => {
      return translationService.getRelativeTime(date, language);
    },
    [language],
  );

  const changeLanguage = useCallback(
    (newLanguage: Language) => {
      setLanguage(newLanguage);
    },
    [setLanguage],
  );

  return {
    t,
    language,
    setLanguage,
    changeLanguage,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatCurrency,
    getRelativeTime,
  };
}
