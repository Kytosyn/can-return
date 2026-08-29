import { get, set } from "idb-keyval";
import type { GeoPosition, ReturnPoint, ReturnPointsCache } from "./types";

const CACHE_KEY = "bcrs:return-points";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// In production this would be the actual Return Right API endpoint.
// Using a placeholder URL that can be swapped when the API is documented.
const API_URL = "https://api.returnright.sg/v1/machines";

/**
 * Fetch return points from the API and cache locally.
 */
async function fetchReturnPoints(): Promise<ReturnPoint[]> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.machines ?? data;
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
    return { lastSynced: new Date().toISOString(), points: getSamplePoints() };
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
