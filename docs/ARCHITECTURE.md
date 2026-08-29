# Architecture — Can Return?

## Overview

**Can Return?** is an offline-first, privacy-by-design application that lets
Singapore consumers check whether a beverage container carries a 10-cent
deposit under the BCRS (Beverage Container Return Scheme), and find the
nearest Return Right reverse vending machine to redeem it.

The product serves two user groups: regular users who install a native app,
and privacy-focused users who want a no-signup, no-install web experience
with identical core functionality. All three surfaces — PWA, Android, and
iOS — are built from a single React codebase, with Capacitor providing
native wrappers for the app stores.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **UI framework** | React 18 + TypeScript | Mature ecosystem, huge component library pool, excellent PWA support via Vite. |
| **Build tool** | Vite | Sub-second HMR, native ESM dev server, optimised production builds with code splitting. PWA plugin for service worker generation. |
| **Styling** | Tailwind CSS | Utility-first, zero-runtime CSS. Small production bundle via purging. Works identically in PWA and Capacitor webview. |
| **State** | Zustand | 1.1 KB, no boilerplate, hooks-based. Works outside React for service-worker or Capacitor bridge scenarios. |
| **Persistence** | idb-keyval (IndexedDB) | Simple key-value wrapper over IndexedDB. Works in all modern browsers and Capacitor webviews. No server dependency. |
| **Barcode scanning** | BarcodeDetector API + barcode-detector polyfill (zxing-wasm) | Native API where available (Chrome 83+), WASM polyfill elsewhere. Fully client-side — images never leave the device. |
| **Image classification** | TensorFlow.js + MobileNet v2 | On-device image classification for identifying container type (can, bottle, carton). MobileNet runs as a feature extractor with cosine similarity matching against reference embeddings. ~8 MB model, cached after first load, code-split from main bundle. |
| **Maps** | Leaflet + react-leaflet | Free, no API key required (uses OSM tiles). Lighter than Mapbox/Google Maps. |
| **Mobile wrapper** | Capacitor 6 | Wraps the same PWA build in a native shell. Provides access to native camera, geolocation, and push notifications. Single codebase for Android + iOS. |
| **PWA** | vite-plugin-pwa (Workbox) | Automatic service worker generation, offline caching, install prompt support. |

### Why Capacitor over React Native or Flutter?

- **Maximum code reuse:** The PWA *is* the app. Capacitor wraps it — no separate
  mobile codebase to maintain. React Native would require rewriting the UI layer
  and barcode-scanning integration. Flutter would mean a full rewrite in Dart.
- **Barcode scanning:** The BarcodeDetector Web API (with WASM polyfill) works
  identically in browsers and Capacitor webviews. No native camera bridge needed.
- **Bundle size:** The PWA loads in ~150 KB gzipped (JS + CSS). React Native or
  Flutter apps start at 10+ MB. For the privacy-focused no-install web version,
  fast load on mobile data is critical.
- **App store presence:** Capacitor produces real Android/iOS binaries for users
  who want home-screen presence and camera shortcuts.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Client Surfaces                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PWA (Web)   │  │  Android     │  │  iOS         │    │
│  │  (primary)   │  │  (Capacitor) │  │  (Capacitor) │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         └────────┬────────┴────────┬────────┘             │
│                  │                 │                       │
│          ┌───────▼─────────────────▼───────┐              │
│          │     Shared React Codebase       │              │
│          │  ┌──────────────────────────┐   │              │
│          │  │  Barcode Scanner Module  │   │              │
│          │  │  (BarcodeDetector API /  │   │              │
│          │  │   zxing-wasm polyfill)   │   │              │
│          │  └──────────────────────────┘   │              │
│          │  ┌──────────────────────────┐   │              │
│          │  │  Eligibility Engine      │   │              │
│          │  │  (client-side matching)  │   │              │
│          │  └──────────────────────────┘   │              │
│          │  ┌──────────────────────────┐   │              │
│          │  │  Return Points Service   │   │              │
│          │  │  (API + local cache)     │   │              │
│          │  └──────────────────────────┘   │              │
│          │  ┌──────────────────────────┐   │              │
│          │  │  Local Storage (IDB)     │   │              │
│          │  │  - Eligibility DB        │   │              │
│          │  │  - Scan history          │   │              │
│          │  │  - Return points cache   │   │              │
│          │  └──────────────────────────┘   │              │
│          └─────────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘
                         │
                    HTTPS (daily)
                         │
               ┌─────────▼─────────┐
               │  Dataset Sync API  │
               │  (lightweight)     │
               │                    │
               │  - Eligibility DB  │
               │  - Return points   │
               │  (read-only JSON)  │
               └────────────────────┘
```

## Data Flow

### Packaging Identification (Image Classifier)

A secondary, optional flow lets users photograph a container to identify its
packaging type using an on-device AI model. This helps when a barcode lookup
returns "uncertain" or when a container has no scannable barcode.

**How it works:**

1. User opens the "Identify" tab and either captures a photo or uploads one.
2. TensorFlow.js loads MobileNet v2 (~8 MB, cached after first load) as a
   feature extractor, producing a 1280-dim embedding from the image.
3. The embedding is compared via cosine similarity against stored reference
   embeddings for five categories:
   - `can/aluminium` → BCRS eligible (aluminium)
   - `can/steel` → BCRS eligible (steel)
   - `bottle/plastic` → BCRS eligible (PET)
   - `bottle/glass` → **not eligible**
   - `packet/tetrapak` → **not eligible**
4. The classifier returns the top-3 predictions with confidence scores and a
   BCRS eligibility hint based on the identified material.

**Privacy:** The model and all inference run entirely on-device. The image
never leaves the browser. The MobileNet model weights are downloaded once from
a CDN and cached by the service worker.

**Limitations:** This is a material/shape classifier, not a product
identifier. It tells you the *type* of container (can vs bottle vs carton),
not whether a specific product is registered with BCRS. For a definitive
answer, scan the barcode.

### Barcode Scan → Eligibility Check

1. User taps "Start Scanning" → camera stream opens via `getUserMedia`.
2. `BarcodeDetector` (native or polyfill) runs on each video frame.
3. First detected barcode is returned as a string (EAN-13/UPC-A).
4. The barcode is matched against the local IndexedDB eligibility database.
5. A verdict is returned: **Eligible** / **Not eligible** / **Uncertain**.
6. The scan is recorded to local history (never leaves the device).

### Return Point Lookup

1. User taps "Use my location" → just-in-time permission prompt with
   plain-language explanation.
2. If granted, coordinates are used to sort return points by distance.
3. If denied, user can enter a 6-digit Singapore postal code instead.
4. Return point data is fetched from the API once per day and cached in
   IndexedDB. If offline, stale data is used.

## Data Models

### Eligibility Database

```typescript
interface DepositMarkEntry {
  barcode: string;        // EAN-13 or UPC-A
  material: "pet" | "aluminium" | "steel" | "glass" | "other";
  volumeMl: number;       // 150–3000 for BCRS range
  hasDepositMark: boolean;
  productName?: string;
  producer?: string;
}

interface EligibilityDatabase {
  version: number;
  lastSynced: string;     // ISO 8601
  entries: DepositMarkEntry[];
}
```

### Return Point

```typescript
interface ReturnPoint {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  operatingHours: string;
  type: "rvm" | "collection_point";
  isOperational: boolean;
  capacityPercent: number | null;  // 0–100, null if unknown
}
```

### Scan Record (local only)

```typescript
interface ScanRecord {
  barcode: string;
  verdict: string;
  productName?: string;
  scannedAt: string;  // ISO 8601
}
```

## Offline-First, Client-Side Design

**Why this approach:**

1. **Privacy:** Barcodes and camera images never leave the device for
   eligibility checks. The only network requests are bulk dataset syncs
   (once per day) and return-point fetching — both are read-only and carry
   no user-identifying data.

2. **Speed:** Client-side matching is instant. No network round-trip per
   scan means the result appears in <50 ms, even on slow mobile connections.

3. **Reliability:** The app works fully offline after the first sync.
   Singapore MRT tunnels and areas with poor coverage won't break the
   experience.

4. **Low friction:** No account, no login, no cookies. Privacy-focused
   users can open the PWA URL, scan a barcode, and close the tab with zero
   persistent footprint.

5. **Transition period awareness:** The eligibility engine explicitly handles
   the Apr–Sep 2026 transition window, returning "uncertain" instead of a
   false negative for products that haven't been registered yet.
