import type { DepositMarkDetection } from "../../lib/deposit-mark/types";

interface Props {
  result: DepositMarkDetection;
  onScanAgain: () => void;
  onFindNearby: () => void;
}

export function DepositMarkResultCard({
  result,
  onScanAgain,
  onFindNearby,
}: Props) {
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="flex flex-col gap-4 px-4">
      <div
        className={`border rounded-2xl p-5 text-center ${
          result.detected
            ? "bg-green-950 border-green-800"
            : "bg-red-950 border-red-800"
        }`}
      >
        <span className="text-4xl block mb-2">
          {result.detected ? "✅" : "❌"}
        </span>
        <h2
          className={`text-lg font-bold ${
            result.detected ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.detected
            ? "Deposit Mark Detected"
            : "No Deposit Mark Found"}
        </h2>
        <p className="text-sm text-gray-400 mt-2">{result.reason}</p>
        <p className="text-xs text-gray-500 mt-1">
          Confidence: {confidencePct}%
        </p>
      </div>

      {/* Signal breakdown */}
      <div className="border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Detection signals
        </h3>
        <div className="space-y-2.5">
          <SignalBar
            label='Circular shape'
            value={result.signals.circularShape}
          />
          <SignalBar
            label='"10c" text pattern'
            value={result.signals.textPattern}
          />
          <SignalBar
            label="Color contrast"
            value={result.signals.colorContrast}
          />
          <SignalBar
            label="Signals proximity"
            value={result.signals.proximity}
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 text-sm text-blue-300 space-y-2">
        <p>
          <strong>About the Deposit Mark:</strong> BCRS-eligible containers carry
          a circular logo with "10c SG Return" text, placed within 10mm of the
          barcode. Standard size is ~11mm diameter.
        </p>
        <p className="text-xs text-blue-400">
          From 1 Oct 2026, all regulated beverages must carry this mark. During
          the transition period (Apr–Sep 2026), some eligible products may not
          have it yet.
        </p>
      </div>

      {result.detected && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-4 text-sm text-green-300">
          <strong>This container is likely eligible for a 10¢ refund.</strong>{" "}
          Take it to any Return Right reverse vending machine. Use DBS PayLah!
          "My QR" or tap your EZ-Link/SimplyGo card to receive your deposit.
        </div>
      )}

      {!result.detected && (
        <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 text-sm text-amber-300">
          <strong>No mark doesn't always mean ineligible.</strong> During the
          transition period, some products are registered but haven't added the
          mark yet. Try scanning the barcode for a definitive check.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onScanAgain}
          className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium active:bg-gray-800"
        >
          Scan Again
        </button>
        {result.detected && (
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

function SignalBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            value > 0.5 ? "bg-brand-500" : "bg-gray-600"
          }`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
