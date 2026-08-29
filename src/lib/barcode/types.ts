export interface BarcodeResult {
  rawValue: string;
  format: BarcodeFormat;
  confidence?: number;
}

export type BarcodeFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39"
  | "unknown";

export interface ScanOptions {
  /** Preferred camera facing mode */
  facingMode?: "environment" | "user";
  /** Timeout in ms before giving up */
  timeoutMs?: number;
}

export type ScanStatus =
  | "idle"
  | "requesting-camera"
  | "scanning"
  | "detected"
  | "error";

export class ScanError extends Error {
  constructor(
    message: string,
    public code:
      | "CAMERA_DENIED"
      | "CAMERA_UNAVAILABLE"
      | "NOT_SUPPORTED"
      | "TIMEOUT"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "ScanError";
  }
}
