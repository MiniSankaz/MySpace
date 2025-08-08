"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Language } from "../types";
import { LanguageContext } from "../contexts/LanguageContext";

export function useTranslationDB() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslationDB must be used within LanguageProvider");
  }

  const { language, setLanguage } = context;
  const [translations, setTranslations] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [namespace, setNamespace] = useState("common");

  // Fetch translations from database
  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/translations?locale=${language}&namespace=${namespace}`,
        );
        if (response.ok) {
          const data = await response.json();
          setTranslations(new Map(Object.entries(data)));
        }
      } catch (error) {
        console.error("Error fetching translations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [language, namespace]);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      let translation = translations.get(key) || key;

      // Replace parameters
      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          translation = translation.replace(
            new RegExp(`{{${paramKey}}}`, "g"),
            String(value),
          );
        });
      }

      return translation;
    },
    [translations],
  );

  const formatDate = useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
        dateStyle: "medium",
      }).format(date);
    },
    [language],
  );

  const formatTime = useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
        timeStyle: "short",
      }).format(date);
    },
    [language],
  );

  const formatDateTime = useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    },
    [language],
  );

  const formatNumber = useCallback(
    (number: number) => {
      return new Intl.NumberFormat(
        language === "th" ? "th-TH" : "en-US",
      ).format(number);
    },
    [language],
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat(language === "th" ? "th-TH" : "en-US", {
        style: "currency",
        currency: language === "th" ? "THB" : "USD",
      }).format(amount);
    },
    [language],
  );

  const getRelativeTime = useCallback(
    (date: Date) => {
      const rtf = new Intl.RelativeTimeFormat(
        language === "th" ? "th-TH" : "en-US",
        {
          numeric: "auto",
        },
      );

      const diff = (date.getTime() - Date.now()) / 1000;
      const absDiff = Math.abs(diff);

      if (absDiff < 60) return rtf.format(Math.round(diff), "second");
      if (absDiff < 3600) return rtf.format(Math.round(diff / 60), "minute");
      if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), "hour");
      if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), "day");
      if (absDiff < 31536000)
        return rtf.format(Math.round(diff / 2592000), "month");
      return rtf.format(Math.round(diff / 31536000), "year");
    },
    [language],
  );

  const changeLanguage = useCallback(
    (newLanguage: Language) => {
      setLanguage(newLanguage);
    },
    [setLanguage],
  );

  const changeNamespace = useCallback((newNamespace: string) => {
    setNamespace(newNamespace);
  }, []);

  return {
    t,
    language,
    setLanguage,
    changeLanguage,
    changeNamespace,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatCurrency,
    getRelativeTime,
    loading,
    namespace,
  };
}
