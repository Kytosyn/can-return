import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ms from "./locales/ms.json";
import ta from "./locales/ta.json";

const SUPPORTED = ["en", "zh", "ms", "ta"] as const;

function detectLanguage(): string {
  // 1. User explicitly chose a language before
  const saved = localStorage.getItem("bcrs:lang");
  if (saved && SUPPORTED.includes(saved as any)) return saved;

  // 2. Browser/system language
  const browser = navigator.language; // e.g. "zh-SG", "ms", "ta-LK", "en-GB"
  const langCode = browser.split("-")[0].toLowerCase();
  if (SUPPORTED.includes(langCode as any)) return langCode;

  // 3. Fallback
  return "en";
}

const savedLang = detectLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    ms: { translation: ms },
    ta: { translation: ta },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("bcrs:lang", lng);
  document.documentElement.lang = lng;
});

export default i18n;
