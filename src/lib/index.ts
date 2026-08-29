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

export {
  loadReturnPoints,
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
