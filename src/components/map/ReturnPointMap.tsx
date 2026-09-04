import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";
import { getRvmReportSummary, syncReportsFromApi } from "../../lib/reports/service";
import { ISSUE_LABELS, type ReportIssueType } from "../../lib/reports/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const SG_CENTER: [number, number] = [1.3521, 103.8198];

const MAPBOX_TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : null;
const CARTO_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_URL = MAPBOX_TILE_URL || CARTO_TILE_URL;
const TILE_ATTR = MAPBOX_TILE_URL
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "#22c55e", FULL: "#f59e0b", ERROR: "#ef4444", OFFLINE: "#6b7280", MAINTENANCE: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  RUNNING: "Online", FULL: "Full", ERROR: "Error", OFFLINE: "Offline", MAINTENANCE: "Maintenance",
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  points: (ReturnPoint & { distanceKm?: number })[];
  userPosition: GeoPosition | null;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export function ReturnPointMap({ points, userPosition }: Props) {
  const [useMapbox, setUseMapbox] = useState(() => hasWebGL() && !!MAPBOX_TOKEN);

  if (useMapbox) {
    return <MapboxMap points={points} userPosition={userPosition} onError={() => setUseMapbox(false)} />;
  }
  return <LeafletMap points={points} userPosition={userPosition} />;
}

// ==================== MAPBOX GL JS (primary) ====================

function MapboxMap({ points, userPosition, onError }: Props & { onError: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mbglRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [reportSummary, setReportSummary] = useState<Map<string, { count: number; topIssue: ReportIssueType; latest: string }>>(new Map());

  const validPoints = useMemo(() => points.filter((p) => p.latitude && p.longitude), [points]);

  useEffect(() => {
    syncReportsFromApi().then(() => getRvmReportSummary()).then(setReportSummary).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !containerRef.current) return;
        mbglRef.current = mapboxgl;
        if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: userPosition ? [userPosition.longitude, userPosition.latitude] : [SG_CENTER[1], SG_CENTER[0]],
          zoom: 12,
          attributionControl: false,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", () => { if (!cancelled) onError(); });
        map.on("load", () => { if (!cancelled) setReady(true); });
        mapRef.current = map;
      } catch { if (!cancelled) onError(); }
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mbglRef.current;
    if (!map || !ready || !mapboxgl) return;

    const geojson = {
      type: "FeatureCollection" as const,
      features: validPoints.map((p) => {
        const r = reportSummary.get(p.id);
        return {
          type: "Feature" as const,
          properties: { id: p.id, name: p.name, address: p.address, status: p.status || "RUNNING", hours: p.operatingHours || "", distance: p.distanceKm, reportCount: r?.count ?? 0, topIssue: r?.topIssue ?? "" },
          geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
        };
      }),
    };

    if (map.getSource("rvms")) {
      (map.getSource("rvms") as any).setData(geojson);
    } else {
      map.addSource("rvms", { type: "geojson", data: geojson, cluster: true, clusterMaxZoom: 15, clusterRadius: 50 });
      map.addLayer({ id: "clusters", type: "circle", source: "rvms", filter: ["has", "point_count"], paint: { "circle-color": ["step", ["get", "point_count"], "#22c55e", 20, "#f59e0b", 50, "#ef4444"], "circle-radius": ["step", ["get", "point_count"], 18, 20, 24, 50, 32], "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,0.2)" } });
      map.addLayer({ id: "cluster-count", type: "symbol", source: "rvms", filter: ["has", "point_count"], layout: { "text-field": "{point_count_abbreviated}", "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"], "text-size": 13 }, paint: { "text-color": "#fff" } });
      map.addLayer({ id: "unclustered-point", type: "circle", source: "rvms", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["match", ["get", "status"], "RUNNING", "#22c55e", "FULL", "#f59e0b", "ERROR", "#ef4444", "#6b7280"], "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,0.3)" } });

      map.on("click", "clusters", (e: any) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] }) as any[];
        if (!f.length) return;
        (map.getSource("rvms") as any).getClusterExpansionZoom(f[0].properties.cluster_id, (err: any, zoom: number) => {
          if (!err && zoom) map.easeTo({ center: f[0].geometry.coordinates, zoom: zoom + 0.5, duration: 400 });
        });
      });

      map.on("click", "unclustered-point", (e: any) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = (f.geometry as any).coordinates.slice();
        new mapboxgl.Popup({ offset: 12, closeButton: true, closeOnClick: false, maxWidth: "320px" })
          .setLngLat(coords)
          .setHTML(buildPopupHtml(f.properties))
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });
    }

    if (!userPosition && validPoints.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validPoints.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }, [ready, validPoints, userPosition, reportSummary]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <div ref={containerRef} className="w-full h-full" />
      <Legend />
    </div>
  );
}

// ==================== LEAFLET (fallback) ====================

function LeafletMap({ points, userPosition }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [reportSummary, setReportSummary] = useState<Map<string, { count: number; topIssue: ReportIssueType; latest: string }>>(new Map());

  const validPoints = useMemo(() => points.filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0), [points]);

  useEffect(() => {
    syncReportsFromApi().then(() => getRvmReportSummary()).then(setReportSummary).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const center: [number, number] = userPosition ? [userPosition.latitude, userPosition.longitude] : SG_CENTER;
    leafletMap.current = L.map(mapRef.current, { center, zoom: 12, zoomControl: false });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(leafletMap.current);
    L.control.zoom({ position: "topright" }).addTo(leafletMap.current);
    markersLayer.current = L.layerGroup().addTo(leafletMap.current);
    return () => { leafletMap.current?.remove(); leafletMap.current = null; };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();

    validPoints.forEach((p) => {
      const color = STATUS_COLORS[(p.status || "").toUpperCase()] || "#3b82f6";
      const report = reportSummary.get(p.id);
      const reportCount = report?.count ?? 0;

      const icon = L.divIcon({
        className: "", iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12],
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;${reportCount > 0 ? "box-shadow:0 0 0 2px #ef4444,0 2px 6px rgba(0,0,0,0.4);" : ""}"></div>`,
      });

      const props = { ...p, id: p.id, name: p.name, address: p.address, status: p.status || "RUNNING", hours: p.operatingHours || "", distance: p.distanceKm, reportCount, topIssue: report?.topIssue ?? "" };
      L.marker([p.latitude, p.longitude], { icon }).bindPopup(buildPopupHtml(props), { maxWidth: 320 }).addTo(layer);
    });

    if (!userPosition && validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [validPoints, reportSummary, userPosition]);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !userPosition) return;
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    const icon = L.divIcon({
      className: "", iconSize: [16, 16], iconAnchor: [8, 8],
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 2px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>',
    });
    userMarkerRef.current = L.marker([userPosition.latitude, userPosition.longitude], { icon }).addTo(map);
    map.setView([userPosition.latitude, userPosition.longitude], 14, { animate: true });
  }, [userPosition]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <div ref={mapRef} className="w-full h-full" />
      <Legend />
    </div>
  );
}

// ==================== SHARED ====================

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 flex gap-3 border border-gray-700">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Full</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Error</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Offline</span>
    </div>
  );
}

function buildPopupHtml(p: any): string {
  const status = (p.status || "RUNNING").toUpperCase();
  const color = STATUS_COLORS[status] || "#6b7280";
  const label = STATUS_LABELS[status] || "Unknown";
  const bg = color === "#22c55e" ? "#065f46" : color === "#f59e0b" ? "#78350f" : "#374151";
  const text = color === "#22c55e" ? "#6ee7b7" : color === "#f59e0b" ? "#fcd34d" : "#9ca3af";
  const dist = p.distance != null
    ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;">${p.distance < 1 ? `${Math.round(p.distance * 1000)}m away` : `${Number(p.distance).toFixed(1)}km away`}</div>`
    : "";
  const rc = p.reportCount || 0;
  const ti = p.topIssue || "";
  const rhtml = rc > 0
    ? `<div style="margin-top:8px;padding:6px 8px;background:#7f1d1d;border:1px solid #991b1b;border-radius:8px;font-size:11px;color:#fca5a5;">⚠️ ${rc} user report${rc > 1 ? "s" : ""}${ti ? ` — ${ISSUE_LABELS[ti as ReportIssueType]?.label || ti}` : ""}</div>`
    : "";

  return `<div style="background:#1f2937;color:#e5e7eb;padding:14px 16px;border-radius:12px;min-width:220px;max-width:300px;font-family:system-ui,sans-serif;border:1px solid #374151;">
    <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#fff;">${p.name}</div>
    <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${p.address}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;align-items:center;">
      <span style="background:${bg};color:${text};padding:2px 8px;border-radius:999px;font-weight:600;">${label}</span>
      ${p.hours ? `<span style="color:#9ca3af;">${p.hours}</span>` : ""}
    </div>
    ${dist}${rhtml}
    <button onclick="window.__reportRvm('${p.id}', '${(p.name || "").replace(/'/g, "\\'")}')" style="margin-top:10px;width:100%;padding:8px;background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:system-ui,sans-serif;">📝 Report an issue</button>
  </div>`;
}
