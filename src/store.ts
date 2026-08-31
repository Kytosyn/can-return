import { create } from "zustand";
import type { EligibilityResult } from "./lib/eligibility/types";
import type { EligibilityDatabase } from "./lib/eligibility/types";
import type { GeoPosition, ReturnPoint, ReturnPointsCache } from "./lib/return-points/types";
import type { ClassificationResult } from "./lib/classifier/types";
import type { DepositMarkDetection } from "./lib/deposit-mark/types";
import { checkEligibility, getSampleDatabase } from "./lib/eligibility/matcher";
import { loadReturnPoints, sortByDistance, filterByPostal } from "./lib/return-points/service";
import { saveEligibilityDb, loadEligibilityDb, addScanRecord } from "./lib/storage/local";

interface AppState {
  // Eligibility DB
  eligibilityDb: EligibilityDatabase;
  dbReady: boolean;

  // Last scan result
  lastScan: { barcode: string; result: EligibilityResult } | null;

  // Last classification result
  lastClassification: ClassificationResult | null;

  // Last deposit mark detection
  lastDepositMark: DepositMarkDetection | null;

  // Return points
  returnPointsCache: ReturnPointsCache | null;
  userPosition: GeoPosition | null;
  manualPostal: string | null;
  nearbyPoints: (ReturnPoint & { distanceKm?: number })[];

  // Actions
  initDb: () => Promise<void>;
  scanBarcode: (barcode: string) => Promise<EligibilityResult>;
  classifyContainer: (result: ClassificationResult) => void;
  setDepositMarkResult: (result: DepositMarkDetection) => void;
  fetchReturnPoints: () => Promise<void>;
  setUserPosition: (pos: GeoPosition) => void;
  searchByPostal: (postal: string) => void;
  clearLastScan: () => void;
  clearLastClassification: () => void;
  clearLastDepositMark: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  eligibilityDb: getSampleDatabase(),
  dbReady: false,
  lastScan: null,
  lastClassification: null,
  lastDepositMark: null,
  returnPointsCache: null,
  userPosition: null,
  manualPostal: null,
  nearbyPoints: [],

  initDb: async () => {
    try {
      const cached = await loadEligibilityDb();
      if (cached && typeof cached === "object" && "entries" in cached) {
        set({ eligibilityDb: cached as EligibilityDatabase, dbReady: true });
        return;
      }
    } catch {
      // IndexedDB corrupted — fall through to sample data
    }
    const sample = getSampleDatabase();
    await saveEligibilityDb(sample);
    set({ eligibilityDb: sample, dbReady: true });
  },

  scanBarcode: async (barcode: string) => {
    const { eligibilityDb } = get();
    const result = checkEligibility(barcode, eligibilityDb);
    set({ lastScan: { barcode, result } });
    await addScanRecord({
      barcode,
      verdict: result.verdict,
      productName: result.entry?.productName,
      scannedAt: new Date().toISOString(),
    });
    return result;
  },

  fetchReturnPoints: async () => {
    const cache = await loadReturnPoints();
    set({ returnPointsCache: cache });
    const { userPosition } = get();
    if (userPosition) {
      set({ nearbyPoints: sortByDistance(cache.points, userPosition) });
    } else {
      // Show all points even without user location
      set({ nearbyPoints: cache.points });
    }
  },

  setUserPosition: (pos) => {
    set({ userPosition: pos, manualPostal: null });
    const { returnPointsCache } = get();
    if (returnPointsCache) {
      set({ nearbyPoints: sortByDistance(returnPointsCache.points, pos) });
    }
  },

  searchByPostal: (postal) => {
    set({ manualPostal: postal, userPosition: null });
    const { returnPointsCache } = get();
    if (returnPointsCache) {
      set({ nearbyPoints: filterByPostal(returnPointsCache.points, postal) });
    }
  },

  classifyContainer: (result: ClassificationResult) => {
    set({ lastClassification: result });
  },

  setDepositMarkResult: (result: DepositMarkDetection) => {
    set({ lastDepositMark: result });
  },

  clearLastScan: () => set({ lastScan: null }),
  clearLastClassification: () => set({ lastClassification: null }),
  clearLastDepositMark: () => set({ lastDepositMark: null }),
}));
