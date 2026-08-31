import { get, set } from "idb-keyval";
import type { GeoPosition, ReturnPoint, ReturnPointsCache } from "./types";

const CACHE_KEY = "bcrs:return-points";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// BCRS BTS backend — same API that powers the official Return Right map
// at https://returnright.sg/p/find-my-nearest-rvm
const API_BASE = "https://bts.bcrs.sg/api/v1";

/**
 * Fetch all RVM locations from the BCRS API and cache locally.
 */
async function fetchReturnPoints(): Promise<ReturnPoint[]> {
  const res = await fetch(`${API_BASE}/locations`, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data : [];
  return raw.map(normaliseLocation);
}

/**
 * Fetch nearby RVMs from the BCRS API (server-side filtering).
 */
export async function fetchNearby(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<ReturnPoint[]> {
  const res = await fetch(
    `${API_BASE}/locations/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data : [];
  return raw.map(normaliseLocation);
}

/**
 * Normalise a raw BCRS API location object into our ReturnPoint type.
 * The API shape may vary, so we handle common field name patterns.
 */
function normaliseLocation(raw: any): ReturnPoint {
  return {
    id: String(raw.id ?? raw._id ?? raw.locationId ?? ""),
    name: raw.locationName ?? raw.name ?? "Return Right Machine",
    address: raw.address ?? raw.streetAddress ?? "",
    postalCode: raw.postalCode ?? raw.postal ?? "",
    latitude: parseFloat(raw.latitude ?? raw.lat ?? 0),
    longitude: parseFloat(raw.longitude ?? raw.lng ?? 0),
    operatingHours: raw.rvmOpeningHours ?? raw.operatingHours ?? raw.hours ?? "",
    type: "rvm",
    isOperational: raw.status === "RUNNING",
    capacityPercent: raw.capacityPercent ?? raw.binLevel ?? null,
    status: raw.status ?? "",
  };
}

/**
 * Load the static scraped RVM data as an offline fallback.
 */
async function loadStaticFallback(): Promise<ReturnPoint[]> {
  try {
    const res = await fetch("/rvm-locations.json");
    if (!res.ok) return getSamplePoints();
    const json = await res.json();
    return (json.locations || []).map((l: any) => ({
      id: String(l.id),
      name: l.name,
      address: l.address,
      postalCode: l.postalCode,
      latitude: l.lat,
      longitude: l.lng,
      operatingHours: l.hours || "",
      type: "rvm" as const,
      isOperational: l.status === "RUNNING",
      capacityPercent: null,
      status: l.status || "",
    }));
  } catch {
    return getSamplePoints();
  }
}

/**
 * Load return points: use cache if fresh, otherwise fetch from API.
 * Falls back to stale cache if the network request fails.
 */
export async function loadReturnPoints(): Promise<ReturnPointsCache> {
  const cached = await get<ReturnPointsCache>(CACHE_KEY);

  if (cached) {
    const age = Date.now() - new Date(cached.lastSynced).getTime();
    if (age < CACHE_MAX_AGE_MS) {
      return cached;
    }
  }

  try {
    const points = await fetchReturnPoints();
    const fresh: ReturnPointsCache = {
      lastSynced: new Date().toISOString(),
      points,
    };
    await set(CACHE_KEY, fresh);
    return fresh;
  } catch {
    if (cached) return cached;
    // Use the static scraped data as offline fallback
    const fallback = await loadStaticFallback();
    return { lastSynced: new Date().toISOString(), points: fallback };
  }
}

/**
 * Get the device's current position with a just-in-time permission prompt.
 */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

/** Haversine distance in km */
export function distanceKm(
  a: GeoPosition,
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Sort return points by distance from a reference position.
 */
export function sortByDistance(
  points: ReturnPoint[],
  from: GeoPosition,
): (ReturnPoint & { distanceKm: number })[] {
  return points
    .map((p) => ({ ...p, distanceKm: distanceKm(from, p) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Filter return points by postal code prefix (first 2 digits = sector).
 */
export function filterByPostal(
  points: ReturnPoint[],
  postalCode: string,
): ReturnPoint[] {
  const prefix = postalCode.replace(/\s/g, "").slice(0, 2);
  return points.filter((p) => p.postalCode.replace(/\s/g, "").startsWith(prefix));
}

/**
 * Sample data for development and offline fallback.
 */
function getSamplePoints(): ReturnPoint[] {
  return [
    {
      id: "rvm-001",
      name: "NTUC FairPrice — Ang Mo Kio Hub",
      address: "53 Ang Mo Kio Ave 3, #B2-10",
      postalCode: "569933",
      latitude: 1.3691,
      longitude: 103.8491,
      operatingHours: "08:00–22:00",
      type: "rvm",
      isOperational: true,
      capacityPercent: 72,
    },
    {
      id: "rvm-002",
      name: "Giant — Tampines Mall",
      address: "4 Tampines Central 5, #B1-12",
      postalCode: "529510",
      latitude: 1.3526,
      longitude: 103.9445,
      operatingHours: "09:00–21:30",
      type: "rvm",
      isOperational: true,
      capacityPercent: 45,
    },
    {
      id: "rvm-003",
      name: "Sheng Siong — Clementi Blk 328",
      address: "328 Clementi Ave 2, #01-188",
      postalCode: "120328",
      latitude: 1.3158,
      longitude: 103.7649,
      operatingHours: "07:00–23:00",
      type: "rvm",
      isOperational: true,
      capacityPercent: 90,
    },
    {
      id: "rvm-004",
      name: "Cheers — MRT Bugis",
      address: "200 Victoria St, #B1-K1",
      postalCode: "188021",
      latitude: 1.3008,
      longitude: 103.8554,
      operatingHours: "06:00–00:00",
      type: "rvm",
      isOperational: false,
      capacityPercent: null,
    },
    {
      id: "rvm-005",
      name: "Cold Storage — VivoCity",
      address: "1 HarbourFront Walk, #B2-25",
      postalCode: "098585",
      latitude: 1.2644,
      longitude: 103.8222,
      operatingHours: "09:00–22:00",
      type: "rvm",
      isOperational: true,
      capacityPercent: 30,
    },
  ];
}
