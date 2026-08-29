export interface ReturnPoint {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  /** e.g. "08:00–22:00" */
  operatingHours: string;
  /** Machine type: "RVM" (reverse vending machine) or "Collection Point" */
  type: "rvm" | "collection_point";
  /** Whether the machine is currently operational */
  isOperational: boolean;
  /** 0–100 capacity remaining, null if unknown */
  capacityPercent: number | null;
}

export interface ReturnPointsCache {
  lastSynced: string;
  points: ReturnPoint[];
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}
