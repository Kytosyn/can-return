import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";
import { getRvmReportSummary, syncReportsFromApi } from "../../lib/reports/service";
import { ISSUE_LABELS, type ReportIssueType } from "../../lib/reports/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const SG_CENTER: [number, number] = [1.3521, 103.8198];

// Mapbox raster tiles (no WebGL needed) — falls back to CartoDB if no token
const TILE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const TILE_ATTR = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

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

// Fix Leaflet default icon
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

export function ReturnPointMap({ points, userPosition }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [reportSummary, setReportSummary] = useState<Map<string, { count: number; topIssue: ReportIssueType; latest: string }>>(new Map());

  const validPoints = useMemo(
    () => points.filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0),
    [points],
  );

  // Load reports
  useEffect(() => {
    syncReportsFromApi().then(() => getRvmReportSummary()).then(setReportSummary).catch(() => {});
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const center = userPosition
      ? [userPosition.latitude, userPosition.longitude]
      : SG_CENTER;

    leafletMap.current = L.map(mapRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(leafletMap.current);

    L.control.zoom({ position: "topright" }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    validPoints.forEach((p) => {
      const color = STATUS_COLORS[(p.status || "").toUpperCase()] || "#3b82f6";
      const statusLabel = STATUS_LABELS[(p.status || "").toUpperCase()] || "Unknown";
      const report = reportSummary.get(p.id);
      const reportCount = report?.count ?? 0;
      const topIssue = report?.topIssue ?? "";

      const reportHtml = reportCount > 0
        ? `<div style="margin-top:8px;padding:6px 8px;background:#7f1d1d;border:1px solid #991b1b;border-radius:8px;font-size:11px;color:#fca5a5;">
            ⚠️ ${reportCount} user report${reportCount > 1 ? "s" : ""}${topIssue ? ` — ${ISSUE_LABELS[topIssue as ReportIssueType]?.label || topIssue}` : ""}
          </div>`
        : "";

      const popupHtml = `
        <div style="background:#1f2937;color:#e5e7eb;padding:14px 16px;border-radius:12px;min-width:220px;max-width:300px;font-family:system-ui,sans-serif;border:1px solid #374151;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#fff;">${p.name}</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${p.address}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;align-items:center;">
            <span style="background:${color === "#22c55e" ? "#065f46" : color === "#f59e0b" ? "#78350f" : "#374151"};color:${color === "#22c55e" ? "#6ee7b7" : color === "#f59e0b" ? "#fcd34d" : "#9ca3af"};padding:2px 8px;border-radius:999px;font-weight:600;">${statusLabel}</span>
            ${p.operatingHours ? `<span style="color:#9ca3af;">${p.operatingHours}</span>` : ""}
          </div>
          ${p.distanceKm !== undefined ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;">${p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)}m away` : `${p.distanceKm.toFixed(1)}km away`}</div>` : ""}
          ${reportHtml}
          <button onclick="window.__reportRvm('${p.id}', '${p.name.replace(/'/g, "\\'")}')" style="margin-top:10px;width:100%;padding:8px;background:#374151;color:#d1d5db;border:1px solid #4b5563;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:system-ui,sans-serif;">📝 Report an issue</button>
        </div>
      `;

      const icon = L.divIcon({
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12],
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;${reportCount > 0 ? "box-shadow:0 0 0 2px #ef4444,0 2px 6px rgba(0,0,0,0.4);" : ""}"></div>`,
      });

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(popupHtml, { maxWidth: 320 });

      layer.addLayer(marker);
    });

    // Fit bounds if no user position
    if (!userPosition && validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [validPoints, reportSummary, userPosition]);

  // User position marker
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !userPosition) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    const userIcon = L.divIcon({
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 2px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>',
    });

    userMarkerRef.current = L.marker([userPosition.latitude, userPosition.longitude], { icon: userIcon }).addTo(map);
    map.setView([userPosition.latitude, userPosition.longitude], 14, { animate: true });
  }, [userPosition]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 flex gap-3 border border-gray-700">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Full</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Error</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Offline</span>
      </div>
    </div>
  );
}
