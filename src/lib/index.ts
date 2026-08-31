export { scanFromCamera, scanFromImage } from "./barcode/scanner";
export type {
  BarcodeResult,
  ScanOptions,
  ScanStatus,
  ScanError,
} from "./barcode/types";

export { checkEligibility, getSampleDatabase } from "./eligibility/matcher";
export type {
  DepositMarkEntry,
  EligibilityDatabase,
  EligibilityResult,
  EligibilityVerdict,
  Material,
} from "./eligibility/types";

export {
  initClassifier,
  classifyPackaging,
  computeEmbedding,
  videoToCanvas,
  fileToImage,
  subscribeClassifier,
  getClassifierState,
} from "./classifier/packaging-classifier";
export type {
  PackagingCategory,
  ClassificationResult,
  ClassifierState,
  ReferenceEmbedding,
} from "./classifier/types";

export { detectDepositMark } from "./deposit-mark/detector";
export type {
  DepositMarkDetection,
  DepositMarkSpec,
} from "./deposit-mark/types";
export { BCRS_DEPOSIT_MARK_SPEC } from "./deposit-mark/types";

export {
  loadReturnPoints,
  fetchNearby,
  getCurrentPosition,
  sortByDistance,
  filterByPostal,
  distanceKm,
} from "./return-points/service";
export type {
  ReturnPoint,
  ReturnPointsCache,
  GeoPosition,
} from "./return-points/types";

export {
  saveEligibilityDb,
  loadEligibilityDb,
  addScanRecord,
  getScanHistory,
  clearAllData,
} from "./storage/local";
export type { ScanRecord } from "./storage/local";
