import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UnifiedScanner } from "../components/scanner/UnifiedScanner";
import { ManualEntry } from "../components/scanner/ManualEntry";
import { EligibilityResultCard } from "../components/results/EligibilityResult";
import { useAppStore } from "../store";
import type { EligibilityResult } from "../lib/eligibility/types";

type ScanMode = "scan" | "manual";

export function ScanPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ScanMode>("scan");
  const { lastScan, scanBarcode, clearLastScan } = useAppStore();
  const navigate = useNavigate();

  const handleManual = async (barcode: string) => {
    await scanBarcode(barcode);
  };

  const handleEligibilityResult = async (barcode: string, _result: EligibilityResult) => {
    await scanBarcode(barcode);
  };

  if (lastScan) {
    return (
      <div className="pt-6">
        <EligibilityResultCard
          result={lastScan.result}
          barcode={lastScan.barcode}
          onScanAgain={clearLastScan}
          onFindNearby={() => navigate("/nearby")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">{t("app.name")}</h1>
        <p className="text-sm text-gray-400 mt-1">{t("app.tagline")}</p>
      </div>

      <div className="flex rounded-xl bg-gray-800 p-1">
        <button
          onClick={() => setMode("scan")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "scan" ? "bg-gray-700 shadow text-white" : "text-gray-400"
          }`}
        >
          {t("scan.barcode")}
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual" ? "bg-gray-700 shadow text-white" : "text-gray-400"
          }`}
        >
          {t("scan.manual")}
        </button>
      </div>

      {mode === "scan" && <UnifiedScanner onEligibilityResult={handleEligibilityResult} />}
      {mode === "manual" && <ManualEntry onSubmit={handleManual} />}

      <p className="text-xs text-center text-gray-500">
        {t("scan.privacyNote")}
      </p>
    </div>
  );
}
