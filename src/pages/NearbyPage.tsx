import { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { ReturnPointMap } from "../components/map/ReturnPointMap";
import { getCurrentPosition } from "../lib/return-points/service";
import { Button } from "../components/ui/Button";

export function NearbyPage() {
  const {
    nearbyPoints,
    returnPointsCache,
    userPosition,
    fetchReturnPoints,
    setUserPosition,
    searchByPostal,
  } = useAppStore();

  const [postalInput, setPostalInput] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPermissionHint, setShowPermissionHint] = useState(false);

  useEffect(() => {
    fetchReturnPoints();
  }, [fetchReturnPoints]);

  const handleUseLocation = async () => {
    setShowPermissionHint(true);
  };

  const confirmLocation = async () => {
    setShowPermissionHint(false);
    setLocationError(null);
    try {
      const pos = await getCurrentPosition();
      setUserPosition(pos);
    } catch (err: any) {
      setLocationError(
        err.code === 1
          ? "Location permission denied. Use postal code instead."
          : "Could not get location. Try postal code instead.",
      );
    }
  };

  const handlePostalSearch = () => {
    if (/^\d{6}$/.test(postalInput)) {
      searchByPostal(postalInput);
    }
  };

  return (
    <div className="px-4 pt-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Nearby Return Points
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Find Return Right reverse vending machines near you
        </p>
      </div>

      {showPermissionHint && (
        <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 text-sm">
          <p className="text-blue-300 font-medium mb-1">Location access</p>
          <p className="text-blue-400 text-xs mb-3">
            Used only to find nearby return points and sort by distance. Your
            location is never stored or sent to any server.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmLocation}>
              Allow
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPermissionHint(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUseLocation}
          disabled={showPermissionHint}
        >
          📍 Use my location
        </Button>
        <span className="text-gray-500 text-sm self-center">or</span>
        <div className="flex gap-1 flex-1">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Postal code"
            value={postalInput}
            onChange={(e) =>
              setPostalInput(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-500"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePostalSearch}
            disabled={postalInput.length !== 6}
          >
            Go
          </Button>
        </div>
      </div>

      {locationError && (
        <p className="text-red-600 text-xs">{locationError}</p>
      )}

      <ReturnPointMap points={nearbyPoints} userPosition={userPosition} />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300">
          {userPosition
            ? "Sorted by distance"
            : postalInput
              ? `Results near ${postalInput}`
              : "All return points"}
          {returnPointsCache && (
            <span className="font-normal text-gray-500 ml-2">
              Updated{" "}
              {new Date(returnPointsCache.lastSynced).toLocaleDateString()}
            </span>
          )}
        </h2>

        {nearbyPoints.length === 0 && !returnPointsCache && (
          <p className="text-gray-500 text-sm">Loading return points…</p>
        )}

        {nearbyPoints.length > 0 && (
          <p className="text-xs text-gray-500">
            {nearbyPoints.length} return points found
          </p>
        )}

        {nearbyPoints.slice(0, 50).map((p) => {
          const statusMap: Record<string, { bg: string; text: string; label: string }> = {
            RUNNING: { bg: "bg-green-900", text: "text-green-300", label: "Online" },
            FULL: { bg: "bg-amber-900", text: "text-amber-300", label: "Full" },
            ERROR: { bg: "bg-red-900", text: "text-red-300", label: "Error" },
            OFFLINE: { bg: "bg-gray-800", text: "text-gray-400", label: "Offline" },
            MAINTENANCE: { bg: "bg-gray-800", text: "text-gray-400", label: "Maintenance" },
          };
          const st = statusMap[(p.status || "").toUpperCase()] || statusMap.RUNNING;
          return (
            <div
              key={p.id}
              className="border border-gray-800 rounded-xl p-3 space-y-1.5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm text-white leading-tight">{p.name}</h3>
                <span className={`text-xs ${st.bg} ${st.text} px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}>
                  {st.label}
                </span>
              </div>
              <p className="text-xs text-gray-400">{p.address}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {p.operatingHours && <span>{p.operatingHours}</span>}
                {"distanceKm" in p && (p as any).distanceKm !== undefined && (
                  <span className="text-gray-400">
                    {(p as any).distanceKm < 1
                      ? `${Math.round((p as any).distanceKm * 1000)}m`
                      : `${(p as any).distanceKm.toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
