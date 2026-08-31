import { useTranslation, Trans } from "react-i18next";
import type { ClassificationResult } from "../../lib/classifier/types";

const categoryIcons: Record<string, string> = {
  "can/aluminium": "🥫", "can/steel": "🥫", "bottle/plastic": "🧴", "bottle/glass": "🍾", "packet/tetrapak": "🧃",
};

interface Props {
  result: ClassificationResult;
  onScanAgain: () => void;
  onFindNearby: () => void;
}

export function ClassificationResultCard({ result, onScanAgain, onFindNearby }: Props) {
  const { t } = useTranslation();
  const icon = categoryIcons[result.category] ?? "📦";

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className={`border rounded-2xl p-5 text-center ${result.bcrsEligible ? "bg-green-950 border-green-800" : "bg-red-950 border-red-800"}`}>
        <span className="text-4xl block mb-2">{icon}</span>
        <h2 className={`text-lg font-bold ${result.bcrsEligible ? "text-green-400" : "text-red-400"}`}>{result.label}</h2>
        <p className="text-sm text-gray-400 mt-1">{t("classification.confidence", { pct: Math.round(result.confidence * 100) })}</p>
        {result.bcrsEligible ? (
          <p className="text-sm text-green-400 mt-2">{t("classification.eligibleNote", { material: result.materialHint.toUpperCase() })}</p>
        ) : (
          <p className="text-sm text-red-400 mt-2">
            <Trans i18nKey="classification.notEligibleNote" values={{ material: result.materialHint === "other" ? "Tetra Pak" : result.materialHint.toUpperCase() }}>
              This packaging type (<strong>not covered</strong>) is not covered by BCRS.
            </Trans>
          </p>
        )}
      </div>

      <div className="border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("classification.allPredictions")}</h3>
        <div className="space-y-2">
          {result.predictions.map((p, i) => (
            <div key={p.category} className="flex items-center gap-2">
              <span className="text-lg">{categoryIcons[p.category] ?? "📦"}</span>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-200">{p.category.replace("/", " / ")}</span>
                  <span className="text-gray-400">{Math.round(p.confidence * 100)}%</span>
                </div>
                <div className="mt-0.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-brand-500" : "bg-gray-300"}`} style={{ width: `${Math.round(p.confidence * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 text-sm text-amber-300">
        <strong>{t("classification.note").split(".")[0]}.</strong> {t("classification.note").split(".").slice(1).join(".")}
      </div>

      <div className="flex gap-3">
        <button onClick={onScanAgain} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium active:bg-gray-800">{t("classification.scanAnother")}</button>
        {result.bcrsEligible && (
          <button onClick={onFindNearby} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-medium active:bg-brand-700">{t("classification.findReturnPoints")}</button>
        )}
      </div>
    </div>
  );
}
