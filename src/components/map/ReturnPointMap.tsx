import { useEffect, useRef, useMemo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";
import { getRvmReportSummary, syncReportsFromApi } from "../../lib/reports/service";
import { ISSUE_LABELS, type ReportIssueType } from "../../lib/reports/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

const SG_CENTER: [number, number] = [103.8198, 1.3521];

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "#22c55e",
  FULL: "#f59e0b",
  ERROR: "#ef4444",
  OFFLINE: "#6b7280",
  MAINTENANCE: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  RUNNING: "Online",
  FULL: "Full",
  ERROR: "Error",
  OFFLINE: "Offline",
  MAINTENANCE: "Maintenance",
};

interface Props {
  points: (ReturnPoint & { distanceKm?: number })[];
  userPosition: GeoPosition | null;
}

export function ReturnPointMap({ points, userPosition }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [reportSummary, setReportSummary] = useState<Map<string, { count: number; topIssue: ReportIssueType; latest: string }>>(new Map());

  const validPoints = useMemo(
    () => points.filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0),
    [points],
  );

  // Load reports on mount
  useEffect(() => {
    syncReportsFromApi().then(() => getRvmReportSummary()).then(setReportSummary).catch(() => {});
  }, []);

  // Build GeoJSON from points
  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: validPoints.map((p) => {
      const report = reportSummary.get(p.id);
      return {
        type: "Feature" as const,
        properties: {
          id: p.id,
          name: p.name,
          address: p.address,
          status: p.status || "RUNNING",
          hours: p.operatingHours || "",
          distance: p.distanceKm,
          reportCount: report?.count ?? 0,
          topIssue: report?.topIssue ?? "",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude, p.latitude],
        },
      };
    }),
  }), [validPoints]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: userPosition ? [userPosition.longitude, userPosition.latitude] : SG_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      popupRef.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add clustered source and layers
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const setup = () => {
      // Remove existing layers/source if re-running
      if (m.getLayer("clusters")) m.removeLayer("clusters");
      if (m.getLayer("cluster-count")) m.removeLayer("cluster-count");
      if (m.getLayer("unclustered-point")) m.removeLayer("unclustered-point");
      if (m.getSource("rvms")) m.removeSource("rvms");

      m.addSource("rvms", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50,
      });

      // Cluster circles
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "rvms",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#22c55e", 20,
            "#f59e0b", 50,
            "#ef4444",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            18, 20,
            24, 50,
            32,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.2)",
        },
      });

      // Cluster count labels
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "rvms",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual (unclustered) points
      m.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "rvms",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match", ["get", "status"],
            "RUNNING", "#22c55e",
            "FULL", "#f59e0b",
            "ERROR", "#ef4444",
            "#6b7280",
          ],
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
        },
      });

      // Click on cluster → zoom in
      m.on("click", "clusters", (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] }) as any[];
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = m.getSource("rvms") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          m.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom + 0.5,
            duration: 400,
          });
        });
      });

      // Click on individual point → show popup
      m.on("click", "unclustered-point", (e) => {
        if (!e.features?.length) return;
        const f = e.features[0] as any;
        const props = f.properties;
        const coords = f.geometry.coordinates.slice();
        const rvmId = props.id;

        const status = (props.status || "RUNNING").toUpperCase();
        const statusColor = STATUS_COLORS[status] || "#6b7280";
        const statusLabel = STATUS_LABELS[status] || "Unknown";
        const statusBg = statusColor === "#22c55e" ? "#065f46" : statusColor === "#f59e0b" ? "#78350f" : "#374151";
        const statusText = statusColor === "#22c55e" ? "#6ee7b7" : statusColor === "#f59e0b" ? "#fcd34d" : "#9ca3af";
        const dist = props.distance != null
          ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;">${props.distance < 1 ? `${Math.round(props.distance * 1000)}m away` : `${Number(props.distance).toFixed(1)}km away`}</div>`
          : "";

        // Report indicator
        const reportCount = props.reportCount || 0;
        const topIssue = props.topIssue || "";
        const reportHtml = reportCount > 0
          ? `<div style="margin-top:8px;padding:6px 8px;background:#7f1d1d;border:1px solid #991b1b;border-radius:8px;font-size:11px;color:#fca5a5;">
              ⚠️ ${reportCount} user report${reportCount > 1 ? "s" : ""}${topIssue ? ` — ${ISSUE_LABELS[topIssue as ReportIssueType]?.label || topIssue}` : ""}
            </div>`
          : "";

        const html = `
          <div style="background:#1f2937;color:#e5e7eb;padding:14px 16px;border-radius:12px;min-width:220px;max-width:300px;font-family:system-ui,sans-serif;border:1px solid #374151;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#fff;">${props.name}</div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${props.address}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;align-items:center;">
              <span style="background:${statusBg};color:${statusText};padding:2px 8px;border-radius:999px;font-weight:600;">${statusLabel}</span>
              ${props.hours ? `<span style="color:#9ca3af;">${props.hours}</span>` : ""}
            </div>
            ${dist}
            ${reportHtml}
            <button
              onclick="window.__reportRvm('${rvmId}', '${props.name?.replace(/'/g, "\\'")}')"
              style="margin-top:10px;width:100%;padding:8px;background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:system-ui,sans-serif;"
            >📝 Report an issue</button>
          </div>
        `;

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          offset: 12,
          closeButton: true,
          closeOnClick: false,
          maxWidth: "320px",
          className: "rvm-popup",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(m);
      });

      // Cursor changes
      m.on("mouseenter", "clusters", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "clusters", () => { m.getCanvas().style.cursor = ""; });
      m.on("mouseenter", "unclustered-point", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "unclustered-point", () => { m.getCanvas().style.cursor = ""; });

      // Fit bounds if no user position
      if (!userPosition && validPoints.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validPoints.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        m.fitBounds(bounds, { padding: 40, maxZoom: 13 });
      }
    };

    if (m.isStyleLoaded()) {
      setup();
    } else {
      m.on("load", setup);
    }
  }, [geojson, userPosition, validPoints]);

  // User position marker
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userPosition) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid #ffffff";
      el.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3)";

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userPosition.longitude, userPosition.latitude])
        .addTo(m);

      m.flyTo({ center: [userPosition.longitude, userPosition.latitude], zoom: 14, essential: true });
    }
  }, [userPosition]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 flex gap-3 border border-gray-700">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Full</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Error</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Offline</span>
      </div>
    </div>
  );
}
