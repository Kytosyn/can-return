export type Material = "pet" | "aluminium" | "steel" | "glass" | "other";

export type EligibilityVerdict = "eligible" | "not_eligible" | "uncertain";

export interface DepositMarkEntry {
  /** EAN-13 or UPC-A barcode */
  barcode: string;
  /** Container material */
  material: Material;
  /** Volume in millilitres */
  volumeMl: number;
  /** Whether the producer has registered a Deposit Mark */
  hasDepositMark: boolean;
  /** Brand / product name for display */
  productName?: string;
  /** Producer / company name */
  producer?: string;
}

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  /** Human-readable reason */
  reason: string;
  /** The matched DB entry, if any */
  entry?: DepositMarkEntry;
}

export interface EligibilityDatabase {
  version: number;
  /** ISO 8601 timestamp of last sync */
  lastSynced: string;
  entries: DepositMarkEntry[];
}
