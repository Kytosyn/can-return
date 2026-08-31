export interface DepositMarkDetection {
  /** Whether a deposit mark was detected */
  detected: boolean;
  /** Confidence score 0–1 */
  confidence: number;
  /** Individual signal scores */
  signals: {
    /** Circular shape detected */
    circularShape: number;
    /** Text-like patterns found ("10c") */
    textPattern: number;
    /** Color contrast matches (dark on light) */
    colorContrast: number;
    /** Proximity of signals (shape + text close together) */
    proximity: number;
  };
  /** Bounding box of the detected mark region, if found */
  region?: { x: number; y: number; width: number; height: number };
  /** Human-readable explanation */
  reason: string;
}

export interface DepositMarkSpec {
  /** Standard width in mm */
  standardWidthMm: number;
  /** Standard height in mm */
  standardHeightMm: number;
  /** Minimum width in mm */
  minWidthMm: number;
  /** Minimum height in mm */
  minHeightMm: number;
  /** Clearance around mark in mm */
  clearanceMm: number;
  /** Text content of the mark */
  textContent: string;
  /** Recommended colors */
  recommendedColors: string;
}

/** BCRS Deposit Mark specifications from the official spec sheet */
export const BCRS_DEPOSIT_MARK_SPEC: DepositMarkSpec = {
  standardWidthMm: 11.0,
  standardHeightMm: 11.7,
  minWidthMm: 9.0,
  minHeightMm: 9.7,
  clearanceMm: 1.9,
  textContent: "10c SG Return",
  recommendedColors: "Black text on white background",
};
