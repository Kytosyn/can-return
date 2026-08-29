# Can Return?

**Check if your drink container carries a 10-cent BCRS deposit — and find the nearest return machine in Singapore.**

Singapore's Beverage Container Return Scheme (BCRS) launches 1 April 2026.
Consumers pay a 10-cent deposit on eligible PET plastic, aluminium, and steel
containers (150ml–3L) and reclaim it at Return Right reverse vending machines.

**Can Return?** helps you instantly check whether a container is eligible, and
finds the nearest RVM to return it.

## Features

- **Barcode scan** — point your camera at the barcode, get an instant verdict.
  Runs entirely on-device; no image ever leaves your phone.
- **Manual entry** — type the barcode number if you prefer or camera isn't
  available.
- **Container identification** — snap a photo to identify the packaging type
  (aluminium can, plastic bottle, glass bottle, Tetra Pak carton) using an
  on-device AI model (MobileNet). Instantly tells you if the material is
  BCRS-eligible — useful when a barcode isn't available or returns uncertain.
- **Three verdicts** — Eligible / Not eligible / Not yet registered (uncertain),
  with clear explanations including the transition period (Apr–Sep 2026).
- **Nearby return points** — map and list of Return Right machines, sorted by
  distance or postal code. Works offline with cached data.
- **Redemption guidance** — how to use DBS PayLah! QR or EZ-Link at the machine.
- **Full privacy** — no account, no cookies, no data uploaded. Delete all local
  data with one tap.

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Zustand** for state management
- **BarcodeDetector API** (native) + **barcode-detector** polyfill (zxing-wasm)
- **TensorFlow.js** + **MobileNet v2** for on-device container type classification
- **Leaflet** + **react-leaflet** for maps
- **Capacitor 6** for Android/iOS native wrappers
- **idb-keyval** for IndexedDB persistence
- **vite-plugin-pwa** for service worker and offline support

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Capacitor (Android/iOS)

```bash
# Build the web app, then sync to native projects
npm run build
npx cap sync

# Open in Android Studio
npm run cap:android

# Open in Xcode
npm run cap:ios
```

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root component, initialises DB
├── router.tsx               # Route definitions
├── store.ts                 # Zustand global store
├── index.css                # Tailwind base styles
├── lib/
│   ├── index.ts             # Re-exports all library modules
│   ├── barcode/
│   │   ├── scanner.ts       # Camera + image barcode decoding
│   │   └── types.ts
│   ├── eligibility/
│   │   ├── matcher.ts       # Client-side eligibility engine
│   │   └── types.ts
│   ├── return-points/
│   │   ├── service.ts       # API fetch, geolocation, sorting
│   │   └── types.ts
│   └── storage/
│       └── local.ts         # IndexedDB persistence layer
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── Layout.tsx       # Shell with bottom nav
│   ├── scanner/
│   │   ├── BarcodeScanner.tsx
│   │   └── ManualEntry.tsx
│   ├── results/
│   │   └── EligibilityResult.tsx
│   ├── map/
│   │   └── ReturnPointMap.tsx
│   └── privacy/
│       └── PrivacyNotice.tsx
└── pages/
    ├── ScanPage.tsx          # Camera scan / manual entry
    ├── NearbyPage.tsx        # Map + list of return points
    └── SettingsPage.tsx      # Privacy notice, delete data, about

public/
├── manifest.json             # PWA manifest
└── icons/                    # App icons (192, 512, maskable)

docs/
├── ARCHITECTURE.md           # Architecture diagram + design decisions
└── PRIVACY.md                # Full privacy notice (plain language)
```

## Privacy

This app is designed for privacy by default:

- Barcode decoding happens entirely on your device.
- No barcode, photo, or location data is ever sent to a server.
- The eligibility database is synced as a bulk file once per day — individual
  scans are never transmitted.
- No accounts, cookies, analytics, or ad SDKs.
- Full details in `docs/PRIVACY.md` and the in-app Settings → Privacy Notice.

## License

MIT
