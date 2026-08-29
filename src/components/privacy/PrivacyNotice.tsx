export function PrivacyNotice() {
  return (
    <div className="px-4 py-6 space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-lg font-bold text-white">Privacy Notice</h2>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">
          What stays on your device
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Barcode scanning:</strong> Images from your camera are
            decoded entirely on your device. No photo or barcode image is ever
            uploaded to any server.
          </li>
          <li>
            <strong>Eligibility checks:</strong> Your scanned barcodes are
            matched against a local database stored in your browser. The
            matching logic runs 100% on your device.
          </li>
          <li>
            <strong>Scan history:</strong> A short history of recent scans is
            kept locally so you can revisit results. You can delete this at any
            time.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">
          What may use the network
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Database updates:</strong> The eligibility database is
            synced over HTTPS approximately once per day so you have the latest
            product registrations. No scan data is included in this request.
          </li>
          <li>
            <strong>Return point locations:</strong> Nearby return machine data
            is fetched from the Return Right API when you open the "Nearby"
            tab. Your location is used only for distance sorting and is never
            stored on any server.
          </li>
          <li>
            <strong>Geolocation:</strong> If you grant location permission, it
            is used solely to sort return points by distance. The permission
            request appears only when you tap the location button, with a clear
            explanation. You can decline and use postal code search instead.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">
          What we never do
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>No account creation or login required.</li>
          <li>No cookies, fingerprinting, or cross-site tracking.</li>
          <li>
            No third-party analytics, advertising SDKs, or data brokers.
          </li>
          <li>
            No barcode, photo, or location data is sold, shared, or used for
            profiling.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-200 mb-1">Your controls</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Delete local data:</strong> Use the button in Settings to
            erase all cached scan history and return point data from this
            device.
          </li>
          <li>
            <strong>Camera permission:</strong> Can be revoked at any time
            through your browser or OS settings. Manual barcode entry is always
            available as an alternative.
          </li>
          <li>
            <strong>Location permission:</strong> Can be revoked at any time.
            Postal code search works without it.
          </li>
        </ul>
      </section>

      <p className="text-xs text-gray-500 pt-4 border-t border-gray-800">
        This app is an independent tool for checking BCRS eligibility. It is
        not affiliated with, endorsed by, or officially connected to NEA
        Singapore, the BCRS operator, or Return Right.
      </p>
    </div>
  );
}
