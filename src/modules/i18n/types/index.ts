export type Language = "th" | "en";

export interface Translation {
  th: string;
  en: string;
}

export interface TranslationSet {
  [key: string]: Translation | TranslationSet;
}

export interface LocaleConfig {
  code: Language;
  name: string;
  nameLocal: string;
  flag: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  direction: "ltr" | "rtl";
  isDefault?: boolean;
}
