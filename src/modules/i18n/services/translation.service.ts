import { Language, Translation, TranslationSet } from "../types";
import { commonTranslations } from "../translations/common";

export class TranslationService {
  private static instance: TranslationService;
  private translations: Map<string, TranslationSet> = new Map();
  private currentLanguage: Language = "th";

  private constructor() {
    this.registerTranslations("common", commonTranslations);
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Register translations for a namespace
   */
  registerTranslations(namespace: string, translations: TranslationSet) {
    this.translations.set(namespace, translations);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setCurrentLanguage(language: Language) {
    this.currentLanguage = language;
  }

  /**
   * Translate a key
   * @param key Format: "namespace.path.to.key" or just "path.to.key" for common namespace
   * @param language Optional language override
   * @param params Optional parameters for interpolation
   */
  translate(
    key: string,
    language?: Language,
    params?: Record<string, any>,
  ): string {
    const lang = language || this.currentLanguage;
    const parts = key.split(".");

    let namespace = "common";
    let path = parts;

    // Check if first part is a namespace
    if (this.translations.has(parts[0])) {
      namespace = parts[0];
      path = parts.slice(1);
    }

    const translations = this.translations.get(namespace);
    if (!translations) {
      return key; // Return key if namespace not found
    }

    // Navigate through the translation object
    let current: any = translations;
    for (const part of path) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return key; // Return key if path not found
      }
    }

    // Get the translation
    let translation: string;
    if (current && typeof current === "object" && lang in current) {
      translation = current[lang];
    } else {
      translation = key; // Return key if translation not found
    }

    // Interpolate parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(
          new RegExp(`{{${param}}}`, "g"),
          String(value),
        );
      });
    }

    return translation;
  }

  /**
   * Shorthand translate function
   */
  t = this.translate.bind(this);

  /**
   * Get all translations for a key (returns Translation object)
   */
  getTranslations(key: string): Translation | null {
    const parts = key.split(".");

    let namespace = "common";
    let path = parts;

    if (this.translations.has(parts[0])) {
      namespace = parts[0];
      path = parts.slice(1);
    }

    const translations = this.translations.get(namespace);
    if (!translations) {
      return null;
    }

    let current: any = translations;
    for (const part of path) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    if (
      current &&
      typeof current === "object" &&
      "th" in current &&
      "en" in current
    ) {
      return current as Translation;
    }

    return null;
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";
    return date.toLocaleDateString(locale);
  }

  /**
   * Format time according to locale
   */
  formatTime(date: Date, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Format date and time according to locale
   */
  formatDateTime(date: Date, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";
    return date.toLocaleString(locale);
  }

  /**
   * Format number according to locale
   */
  formatNumber(number: number, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";
    return number.toLocaleString(locale);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount: number, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";
    const currency = lang === "th" ? "THB" : "USD";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(date: Date, language?: Language): string {
    const lang = language || this.currentLanguage;
    const locale = lang === "th" ? "th-TH" : "en-US";

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, "second");
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
    }
  }
}

// Export singleton instance
export const translationService = TranslationService.getInstance();
