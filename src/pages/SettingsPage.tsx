import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { PrivacyNotice } from "../components/privacy/PrivacyNotice";
import { Button } from "../components/ui/Button";
import { clearAllData } from "../lib/storage/local";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await clearAllData();
    setDeleted(true);
    setConfirming(false);
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("settings.title")}</h1>
      </div>

      {/* Language selector */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          {t("settings.language")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? "bg-brand-600 border-brand-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 active:bg-gray-700"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          {t("settings.dataPrivacy")}
        </h2>

        <button
          onClick={() => setShowPrivacy(!showPrivacy)}
          className="w-full text-left border border-gray-800 rounded-xl p-4 active:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{t("settings.privacyNotice")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t("settings.privacyNoticeDesc")}</p>
            </div>
            <span className="text-gray-500">{showPrivacy ? "▲" : "▼"}</span>
          </div>
        </button>

        {showPrivacy && <PrivacyNotice />}

        <div className="border border-gray-800 rounded-xl p-4">
          <p className="font-medium text-white mb-1">{t("settings.deleteLocalData")}</p>
          <p className="text-xs text-gray-400 mb-3">{t("settings.deleteDesc")}</p>
          {deleted ? (
            <p className="text-sm text-green-700 font-medium">{t("settings.dataCleared")}</p>
          ) : (
            <Button variant={confirming ? "danger" : "secondary"} size="sm" onClick={handleDelete} onBlur={() => setConfirming(false)}>
              {confirming ? t("settings.confirmDelete") : t("settings.deleteLocalData")}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{t("settings.about")}</h2>
        <div className="border border-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
          <p><Trans i18nKey="settings.aboutText"><strong>Can Return?</strong> helps you check if a drink container carries a 10-cent deposit under Singapore's Beverage Container Return Scheme (BCRS).</Trans></p>
          <p>{t("settings.notAffiliated")}</p>
          <p className="text-xs text-gray-400">{t("settings.version", { version: "0.1.0" })}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{t("settings.bcrsInfo")}</h2>
        <div className="border border-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
          <p><Trans i18nKey="settings.bcrsInfoText1">From <strong>1 April 2026</strong>, beverage producers in Singapore must register eligible containers (PET plastic, aluminium, steel; 150ml–3L) with a Deposit Mark.</Trans></p>
          <p>{t("settings.bcrsInfoText2")}</p>
          <p><strong>{t("settings.transitionPeriod")}</strong> {t("settings.transitionPeriodText")}</p>
        </div>
      </section>
    </div>
  );
}
