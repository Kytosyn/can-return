import type { EligibilityResult as Result } from "../../lib/eligibility/types";

const verdictConfig = {
  eligible: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "✅",
    title: "Eligible for 10¢ deposit",
    color: "text-green-800",
  },
  not_eligible: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "❌",
    title: "Not eligible",
    color: "text-red-800",
  },
  uncertain: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠️",
    title: "Not yet registered (uncertain)",
    color: "text-amber-800",
  },
};

interface Props {
  result: Result;
  barcode: string;
  onScanAgain: () => void;
  onFindNearby: () => void;
}

export function EligibilityResultCard({
  result,
  barcode,
  onScanAgain,
  onFindNearby,
}: Props) {
  const config = verdictConfig[result.verdict];

  return (
    <div className="flex flex-col gap-4 px-4">
      <div
        className={`${config.bg} ${config.border} border rounded-2xl p-5 text-center`}
      >
        <span className="text-4xl block mb-2">{config.icon}</span>
        <h2 className={`text-lg font-bold ${config.color}`}>{config.title}</h2>
        <p className="text-sm text-gray-600 mt-2">{result.reason}</p>
        {result.entry?.productName && (
          <p className="text-sm font-medium text-gray-800 mt-1">
            {result.entry.productName}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2 font-mono">{barcode}</p>
      </div>

      {result.verdict === "eligible" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            How to redeem your 10¢
          </h3>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li>
              <strong>DBS PayLah!:</strong> Open the app → "My QR" → scan QR at
              the Return Right machine.
            </li>
            <li>
              <strong>EZ-Link / SimplyGo:</strong> Tap your card at the machine
              reader.
            </li>
            <li className="text-xs text-blue-600 mt-2">
              This app does not process payments — bring your container to a
              machine to complete the return.
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onScanAgain}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium active:bg-gray-100"
        >
          Scan Again
        </button>
        {result.verdict !== "not_eligible" && (
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
