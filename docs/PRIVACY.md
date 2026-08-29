# Privacy Notice — Can Return?

_Last updated: 29 August 2025_

## Plain-Language Summary

**Can Return?** is built to do one thing — check if a drink container carries
a 10-cent deposit and help you find a machine to return it. To do this with
maximum privacy, almost everything runs on your device.

## What Stays on Your Device (Never Uploaded)

- **Camera images.** When you scan a barcode, the image is processed entirely
  on your device using the BarcodeDetector API. No photo, frame, or visual
  data ever leaves your phone or browser.

- **Your barcodes.** The decoded barcode number is matched against a local
  eligibility database stored in your browser. The barcode is never sent to
  any server.

- **Scan history.** A short list of recent scans is kept locally so you can
  revisit results. This data exists only on your device and can be deleted
  at any time via Settings → Delete Local Data.

- **Your location.** If you grant location permission, coordinates are used
  solely to sort return points by distance. They are never stored or
  transmitted.

## What Uses the Network

- **Eligibility database sync.** Once per day (or when you open the app after
  being away), the app downloads a bulk list of registered barcodes over
  HTTPS. This request contains no user data — it is a one-way download of a
  public dataset.

- **Return point data.** When you open the "Nearby" tab, the app fetches a
  list of Return Right machine locations from the API. This request does not
  include your location — the full list is downloaded and sorting happens on
  your device.

## What We Never Do

- **No account or login.** You never need to sign up, log in, or identify
  yourself.

- **No cookies or tracking.** We do not use cookies, fingerprinting, local
  storage identifiers, or any cross-site tracking technology.

- **No third-party analytics or ads.** No Google Analytics, Facebook Pixel,
  advertising SDKs, or data broker integrations. If we ever add
  privacy-preserving analytics (e.g. Plausible or a self-hosted counter), it
  will be aggregate-only, cookieless, and disclosed here first.

- **No data sales or sharing.** We do not sell, share, or monetise any user
  data. There is no user data to sell — it never leaves your device.

## Your Controls

| Control | How |
|---|---|
| **Delete all local data** | Settings → Delete Local Data. Clears scan history and cached return points. The eligibility database will re-download on next visit. |
| **Camera permission** | Revoke via browser settings or OS settings at any time. Manual barcode entry is always available as an alternative. |
| **Location permission** | Revoke via browser settings or OS settings at any time. Postal code search works without location access. |
| **Offline use** | After the first sync, the app works fully offline. You can turn off mobile data and still check barcodes against the cached database. |

## Data Storage Details

All persistent data is stored in your browser's IndexedDB under the `bcrs:`
key prefix:

| Key | Contents | Retention |
|---|---|---|
| `bcrs:eligibility-db` | The full eligibility database (barcode → material/size/status) | Replaced on each sync (~daily) |
| `bcrs:scan-history` | Last 50 scans (barcode, verdict, product name, timestamp) | Until you delete it |
| `bcrs:return-points` | Cached return point list with coordinates and hours | Replaced on each fetch |

## Capacitor (Native App) Version

When used as a native Android/iOS app via Capacitor, the same privacy
principals apply. The app runs in a webview with the same client-side-only
architecture. No additional native permissions are requested beyond camera
(for barcode scanning) and location (for return point sorting), both of which
are optional and explained at the point of request.

## Changes to This Notice

If this notice is updated, the "Last updated" date at the top will change.
Material changes will be highlighted in the app.

## Contact

This is an independent, open-source tool. It is not affiliated with NEA
Singapore, the BCRS operator, or Return Right. For questions about the app's
privacy practises, open an issue on the project repository.
