import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarcodeScanner } from "../components/scanner/BarcodeScanner";
import { ManualEntry } from "../components/scanner/ManualEntry";
import { PackageScanner } from "../components/scanner/PackageScanner";
import { DepositMarkScanner } from "../components/scanner/DepositMarkScanner";
import { EligibilityResultCard } from "../components/results/EligibilityResult";
import { ClassificationResultCard } from "../components/results/ClassificationResult";
import { DepositMarkResultCard } from "../components/results/DepositMarkResult";
import { useAppStore } from "../store";
import type { BarcodeResult } from "../lib/barcode/types";
import type { ClassificationResult } from "../lib/classifier/types";
import type { DepositMarkDetection } from "../lib/deposit-mark/types";

type ScanMode = "scan" | "manual" | "identify" | "deposit";

export function ScanPage() {
  const [mode, setMode] = useState<ScanMode>("scan");
  const {
    lastScan, lastClassification, lastDepositMark,
    scanBarcode, classifyContainer, setDepositMarkResult,
    clearLastScan, clearLastClassification, clearLastDepositMark,
  } = useAppStore();
  const navigate = useNavigate();

  const handleDetected = async (result: BarcodeResult) => {
    await scanBarcode(result.rawValue);
  };

  const handleManual = async (barcode: string) => {
    await scanBarcode(barcode);
  };

  const handleClassified = async (result: ClassificationResult) => {
    classifyContainer(result);
  };

  const handleDepositMark = async (result: DepositMarkDetection) => {
    setDepositMarkResult(result);
  };

  const clearAll = () => {
    clearLastScan();
    clearLastClassification();
    clearLastDepositMark();
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

  if (lastClassification && mode === "identify") {
    return (
      <div className="pt-6">
        <ClassificationResultCard
          result={lastClassification}
          onScanAgain={clearLastClassification}
          onFindNearby={() => navigate("/nearby")}
        />
      </div>
    );
  }

  if (lastDepositMark && mode === "deposit") {
    return (
      <div className="pt-6">
        <DepositMarkResultCard
          result={lastDepositMark}
          onScanAgain={clearLastDepositMark}
          onFindNearby={() => navigate("/nearby")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Can Return?</h1>
        <p className="text-sm text-gray-400 mt-1">
          Check if your drink container carries a 10¢ BCRS deposit
        </p>
      </div>

      <div className="flex rounded-xl bg-gray-800 p-1">
        <button
          onClick={() => { setMode("scan"); clearAll(); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "scan"
              ? "bg-gray-700 shadow text-white"
              : "text-gray-400"
          }`}
        >
          Barcode
        </button>
        <button
          onClick={() => { setMode("manual"); clearAll(); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-gray-700 shadow text-white"
              : "text-gray-400"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => { setMode("identify"); clearAll(); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "identify"
              ? "bg-gray-700 shadow text-white"
              : "text-gray-400"
          }`}
        >
          Package
        </button>
        <button
          onClick={() => { setMode("deposit"); clearAll(); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "deposit"
              ? "bg-gray-700 shadow text-white"
              : "text-gray-400"
          }`}
        >
          10c Mark
        </button>
      </div>

      {mode === "scan" && <BarcodeScanner onDetected={handleDetected} />}
      {mode === "manual" && <ManualEntry onSubmit={handleManual} />}
      {mode === "identify" && <PackageScanner onClassified={handleClassified} />}
      {mode === "deposit" && <DepositMarkScanner onDetected={handleDepositMark} />}

      <p className="text-xs text-center text-gray-500">
        {mode === "deposit"
          ? "Deposit mark detection runs on-device — no image is uploaded."
          : mode === "identify"
            ? "Image analysis runs on-device — nothing is uploaded."
            : "Scanning runs entirely on your device — no data is uploaded."}
      </p>
    </div>
  );
}
