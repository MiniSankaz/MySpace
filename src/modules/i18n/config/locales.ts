import { LocaleConfig } from "../types";

export const locales: Record<string, LocaleConfig> = {
  th: {
    code: "th",
    name: "Thai",
    nameLocal: "ภาษาไทย",
    flag: "🇹🇭",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    currency: "THB",
    direction: "ltr",
    isDefault: true,
  },
  en: {
    code: "en",
    name: "English",
    nameLocal: "English",
    flag: "🇺🇸",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "h:mm A",
    currency: "USD",
    direction: "ltr",
  },
};

export const defaultLocale = "th";
export const availableLocales = Object.keys(locales) as Array<"th" | "en">;
