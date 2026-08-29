import type { ClassificationResult } from "../../lib/classifier/types";

const categoryIcons: Record<string, string> = {
  "can/aluminium": "🥫",
  "can/steel": "🥫",
  "bottle/plastic": "🧴",
  "bottle/glass": "🍾",
  "packet/tetrapak": "🧃",
};

interface Props {
  result: ClassificationResult;
  onScanAgain: () => void;
  onFindNearby: () => void;
}

export function ClassificationResultCard({ result, onScanAgain, onFindNearby }: Props) {
  const icon = categoryIcons[result.category] ?? "📦";

  return (
    <div className="flex flex-col gap-4 px-4">
      <div
        className={`border rounded-2xl p-5 text-center ${
          result.bcrsEligible
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <span className="text-4xl block mb-2">{icon}</span>
        <h2
          className={`text-lg font-bold ${
            result.bcrsEligible ? "text-green-800" : "text-red-800"
          }`}
        >
          {result.label}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Confidence: {Math.round(result.confidence * 100)}%
        </p>

        {result.bcrsEligible ? (
          <p className="text-sm text-green-700 mt-2">
            This packaging type ({result.materialHint.toUpperCase()}) is eligible
            for BCRS — if it's between 150ml and 3L and carries a Deposit Mark.
          </p>
        ) : (
          <p className="text-sm text-red-700 mt-2">
            This packaging type ({result.materialHint === "other" ? "Tetra Pak" : result.materialHint.toUpperCase()}) is{" "}
            <strong>not covered</strong> by BCRS. Only PET plastic, aluminium,
            and steel containers (150ml–3L) are eligible.
          </p>
        )}
      </div>

      {/* All predictions */}
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          All predictions
        </h3>
        <div className="space-y-2">
          {result.predictions.map((p, i) => (
            <div key={p.category} className="flex items-center gap-2">
              <span className="text-lg">{categoryIcons[p.category] ?? "📦"}</span>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">{p.category.replace("/", " / ")}</span>
                  <span className="text-gray-500">
                    {Math.round(p.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      i === 0 ? "bg-brand-500" : "bg-gray-300"
                    }`}
                    style={{ width: `${Math.round(p.confidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BCRS eligibility note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> This visual identification is a guide only. For a
        definitive eligibility check, scan the barcode on the container using the
        "Scan" tab. The AI identifies the packaging material, not whether the
        specific product is registered.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onScanAgain}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium active:bg-gray-100"
        >
          Scan Another
        </button>
        {result.bcrsEligible && (
          <button
            onClick={onFindNearby}
            className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-medium active:bg-brand-700"
          >
            Find Return Points
          </button>
        )}
      </div>
    </div>
  );
}
