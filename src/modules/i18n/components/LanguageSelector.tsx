"use client";

import React from "react";
import { useTranslation } from "../hooks/useTranslation";
import { locales } from "../config/locales";
import { Language } from "../types";

interface LanguageSelectorProps {
  className?: string;
  variant?: "button" | "dropdown" | "inline";
}

export function LanguageSelector({
  className = "",
  variant = "inline",
}: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();

  if (variant === "button") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {Object.entries(locales).map(([code, locale]) => (
          <button
            key={code}
            onClick={() => setLanguage(code as Language)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              language === code
                ? "bg-primary-100 text-primary-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <span className="mr-1">{locale.flag}</span>
            {locale.nameLocal}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className={`relative ${className}`}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.entries(locales).map(([code, locale]) => (
            <option key={code} value={code}>
              {locale.flag} {locale.nameLocal}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {Object.entries(locales).map(([code, locale], index) => (
        <React.Fragment key={code}>
          {index > 0 && <span className="text-gray-300">|</span>}
          <button
            onClick={() => setLanguage(code as Language)}
            className={`px-2 py-1 rounded transition-colors ${
              language === code
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {locale.code.toUpperCase()}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
