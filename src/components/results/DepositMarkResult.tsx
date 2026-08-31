import { useTranslation } from "react-i18next";
import type { DepositMarkDetection } from "../../lib/deposit-mark/types";

interface Props {
  result: DepositMarkDetection;
  onScanAgain: () => void;
  onFindNearby: () => void;
}

export function DepositMarkResultCard({ result, onScanAgain, onFindNearby }: Props) {
  const { t } = useTranslation();
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className={`border rounded-2xl p-5 text-center ${result.detected ? "bg-green-950 border-green-800" : "bg-red-950 border-red-800"}`}>
        <span className="text-4xl block mb-2">{result.detected ? "✅" : "❌"}</span>
        <h2 className={`text-lg font-bold ${result.detected ? "text-green-400" : "text-red-400"}`}>
          {result.detected ? t("depositResult.detected") : t("depositResult.notDetected")}
        </h2>
        <p className="text-sm text-gray-400 mt-2">{result.reason}</p>
        <p className="text-xs text-gray-500 mt-1">{t("depositResult.confidence", { pct: confidencePct })}</p>
      </div>

      <div className="border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("depositResult.detectionSignals")}</h3>
        <div className="space-y-2.5">
          <SignalBar label={t("depositResult.circularShape")} value={result.signals.circularShape} />
          <SignalBar label={t("depositResult.textPattern")} value={result.signals.textPattern} />
          <SignalBar label={t("depositResult.colorContrast")} value={result.signals.colorContrast} />
          <SignalBar label={t("depositResult.signalsProximity")} value={result.signals.proximity} />
        </div>
      </div>

      <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 text-sm text-blue-300 space-y-2">
        <p><strong>{t("depositResult.aboutMark").split(":")[0]}:</strong> {t("depositResult.aboutMark").split(":").slice(1).join(":")}</p>
        <p className="text-xs text-blue-400">{t("depositResult.transitionNote")}</p>
      </div>

      {result.detected && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-4 text-sm text-green-300">
          <strong>{t("depositResult.likelyEligible")}</strong>
        </div>
      )}

      {!result.detected && (
        <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 text-sm text-amber-300">
          <strong>{t("depositResult.noMarkNote")}</strong>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onScanAgain} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium active:bg-gray-800">{t("depositResult.scanAgain")}</button>
        {result.detected && (
          <button onClick={onFindNearby} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-medium active:bg-brand-700">{t("depositResult.findReturnPoints")}</button>
        )}
      </div>
    </div>
  );
}

function SignalBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${value > 0.5 ? "bg-brand-500" : "bg-gray-600"}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}
