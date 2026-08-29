import { get, set, del, keys } from "idb-keyval";

const DB_PREFIX = "bcrs:";

export interface ScanRecord {
  barcode: string;
  verdict: string;
  productName?: string;
  scannedAt: string;
}

const HISTORY_KEY = `${DB_PREFIX}scan-history`;
const ELIGIBILITY_DB_KEY = `${DB_PREFIX}eligibility-db`;
const RETURN_POINTS_KEY = `${DB_PREFIX}return-points`;

// --- Eligibility DB persistence ---

export async function saveEligibilityDb(data: unknown): Promise<void> {
  await set(ELIGIBILITY_DB_KEY, data);
}

export async function loadEligibilityDb(): Promise<unknown | null> {
  return (await get(ELIGIBILITY_DB_KEY)) ?? null;
}

// --- Scan history ---

export async function addScanRecord(record: ScanRecord): Promise<void> {
  const history = await getScanHistory();
  history.unshift(record);
  // Keep last 50 scans
  if (history.length > 50) history.length = 50;
  await set(HISTORY_KEY, history);
}

export async function getScanHistory(): Promise<ScanRecord[]> {
  return (await get(HISTORY_KEY)) ?? [];
}

// --- Clear all local data ---

export async function clearAllData(): Promise<void> {
  const allKeys = await keys();
  const appKeys = allKeys.filter((k) =>
    typeof k === "string" ? k.startsWith(DB_PREFIX) : false,
  );
  for (const k of appKeys) {
    await del(k);
  }
}

export { RETURN_POINTS_KEY };
