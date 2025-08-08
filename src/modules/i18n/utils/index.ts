interface DetectLanguageOptions {
  userPreference?: string;
  browserLang?: string;
  default: string;
}

export function detectLanguage({
  userPreference,
  browserLang,
  default: defaultLang,
}: DetectLanguageOptions): string {
  // Priority order:
  // 1. User preference (from database/profile)
  // 2. Browser language
  // 3. Default language

  if (userPreference && isValidLanguage(userPreference)) {
    return userPreference;
  }

  if (browserLang) {
    // Extract language code from browser lang (e.g., 'en-US' -> 'en')
    const langCode = browserLang.toLowerCase().split("-")[0];
    if (isValidLanguage(langCode)) {
      return langCode;
    }
  }

  return defaultLang;
}

function isValidLanguage(lang: string): boolean {
  // Check against supported languages
  const supportedLanguages = ["en", "th"];
  return supportedLanguages.includes(lang.toLowerCase());
}

export function getLanguageDisplayName(code: string): string {
  const languageNames: Record<string, string> = {
    en: "English",
    th: "ภาษาไทย",
  };

  return languageNames[code] || code;
}

export function getLanguageDirection(code: string): "ltr" | "rtl" {
  // Most languages are left-to-right
  // Add RTL languages as needed
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  return rtlLanguages.includes(code) ? "rtl" : "ltr";
}
