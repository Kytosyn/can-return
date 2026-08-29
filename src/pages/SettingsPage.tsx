import { useState } from "react";
import { PrivacyNotice } from "../components/privacy/PrivacyNotice";
import { Button } from "../components/ui/Button";
import { clearAllData } from "../lib/storage/local";

export function SettingsPage() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await clearAllData();
    setDeleted(true);
    setConfirming(false);
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Data & Privacy
        </h2>

        <button
          onClick={() => setShowPrivacy(!showPrivacy)}
          className="w-full text-left border border-gray-200 rounded-xl p-4 active:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Privacy Notice</p>
              <p className="text-xs text-gray-500 mt-0.5">
                What data is used and what stays on your device
              </p>
            </div>
            <span className="text-gray-400">{showPrivacy ? "▲" : "▼"}</span>
          </div>
        </button>

        {showPrivacy && <PrivacyNotice />}

        <div className="border border-gray-200 rounded-xl p-4">
          <p className="font-medium text-gray-900 mb-1">Delete Local Data</p>
          <p className="text-xs text-gray-500 mb-3">
            Erases all cached scan history and return point data from this
            device. The eligibility database will be re-downloaded on next
            visit.
          </p>
          {deleted ? (
            <p className="text-sm text-green-700 font-medium">
              All local data has been cleared.
            </p>
          ) : (
            <Button
              variant={confirming ? "danger" : "secondary"}
              size="sm"
              onClick={handleDelete}
              onBlur={() => setConfirming(false)}
            >
              {confirming ? "Confirm Delete" : "Delete Local Data"}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          About
        </h2>
        <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-2">
          <p>
            <strong>Can Return?</strong> helps you check if a drink container
            carries a 10-cent deposit under Singapore's Beverage Container
            Return Scheme (BCRS).
          </p>
          <p>
            This is an independent tool — not affiliated with NEA, the BCRS
            operator, or Return Right.
          </p>
          <p className="text-xs text-gray-400">Version 0.1.0</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          BCRS Info
        </h2>
        <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-2">
          <p>
            From <strong>1 April 2026</strong>, beverage producers in Singapore
            must register eligible containers (PET plastic, aluminium, steel;
            150ml–3L) with a Deposit Mark.
          </p>
          <p>
            Consumers pay a 10-cent deposit at purchase and reclaim it by
            returning the container at a Return Right reverse vending machine.
          </p>
          <p>
            <strong>Transition period:</strong> 1 Apr – 30 Sep 2026. Not all
            products may carry the mark yet during this time.
          </p>
        </div>
      </section>
    </div>
  );
}
