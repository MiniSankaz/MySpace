import { useState, useEffect } from "react";
import dashboardTh from "@/locales/th/dashboard.json";

type TranslationKeys = typeof dashboardTh;

export function useThaiLanguage() {
  const [lang, setLang] = useState<"th" | "en">("th");
  const [translations, setTranslations] = useState(dashboardTh);

  useEffect(() => {
    // Check localStorage for language preference
    const savedLang = localStorage.getItem("language") as "th" | "en" | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
      if (!value) return key;
    }

    if (typeof value === "string" && params) {
      // Replace parameters like {{count}} with actual values
      return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
        return params[param]?.toString() || match;
      });
    }

    return value?.toString() || key;
  };

  const switchLanguage = (newLang: "th" | "en") => {
    setLang(newLang);
    localStorage.setItem("language", newLang);
    window.location.reload(); // Reload to apply language change
  };

  const formatNumber = (num: number): string => {
    if (lang === "th") {
      return new Intl.NumberFormat("th-TH").format(num);
    }
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatCurrency = (amount: number): string => {
    if (lang === "th") {
      return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
      }).format(amount * 35); // Convert USD to THB (approximate)
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    if (lang === "th") {
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    if (lang === "th") {
      return d.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("activity.justNow");
    if (diffMins < 60) return t("activity.minutesAgo", { count: diffMins });

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t("activity.hoursAgo", { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t("activity.daysAgo", { count: diffDays });

    return formatDate(d);
  };

  return {
    t,
    lang,
    switchLanguage,
    formatNumber,
    formatCurrency,
    formatDate,
    formatTime,
    formatRelativeTime,
  };
}
