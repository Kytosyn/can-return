import { useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";

// Mapbox token from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

// Singapore center
const SG_CENTER: [number, number] = [103.8198, 1.3521];

// Status colors
const STATUS_COLORS: Record<string, string> = {
  RUNNING: "#22c55e",
  FULL: "#f59e0b",
  ERROR: "#ef4444",
  OFFLINE: "#6b7280",
  MAINTENANCE: "#6b7280",
};

interface Props {
  points: (ReturnPoint & { distanceKm?: number })[];
  userPosition: GeoPosition | null;
}

export function ReturnPointMap({ points, userPosition }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Filter valid points
  const validPoints = useMemo(
    () => points.filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0),
    [points],
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: userPosition ? [userPosition.longitude, userPosition.latitude] : SG_CENTER,
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when points change
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Wait for map to load
    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add RVM markers
      validPoints.forEach((p) => {
        const color = STATUS_COLORS[(p.status || "").toUpperCase()] || "#3b82f6";

        // Create custom marker element
        const el = document.createElement("div");
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = color;
        el.style.border = "2px solid rgba(255,255,255,0.3)";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.15s ease";

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        // Status label
        const statusMap: Record<string, string> = {
          RUNNING: "Online",
          FULL: "Full",
          ERROR: "Error",
          OFFLINE: "Offline",
          MAINTENANCE: "Maintenance",
        };
        const statusLabel = statusMap[(p.status || "").toUpperCase()] || "Unknown";
        const statusColor = STATUS_COLORS[(p.status || "").toUpperCase()] || "#6b7280";

        // Popup content
        const popupHtml = `
          <div style="background:#1f2937;color:#e5e7eb;padding:14px 16px;border-radius:12px;min-width:220px;max-width:300px;font-family:system-ui,sans-serif;border:1px solid #374151;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#fff;">${p.name}</div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${p.address}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;align-items:center;">
              <span style="background:${statusColor === "#22c55e" ? "#065f46" : statusColor === "#f59e0b" ? "#78350f" : "#374151"};color:${statusColor === "#22c55e" ? "#6ee7b7" : statusColor === "#f59e0b" ? "#fcd34d" : "#9ca3af"};padding:2px 8px;border-radius:999px;font-weight:600;">${statusLabel}</span>
              ${p.operatingHours ? `<span style="color:#9ca3af;">${p.operatingHours}</span>` : ""}
            </div>
            ${p.distanceKm !== undefined ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;">${p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)}m away` : `${p.distanceKm.toFixed(1)}km away`}</div>` : ""}
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: false,
          maxWidth: "320px",
        }).setHTML(popupHtml);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(popup)
          .addTo(m);

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers if no user position
      if (!userPosition && validPoints.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validPoints.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        m.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    };

    if (m.isStyleLoaded()) {
      addMarkers();
    } else {
      m.on("load", addMarkers);
    }
  }, [validPoints, userPosition]);

  // Update user position marker
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userPosition) {
      // Create user location dot
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

      m.flyTo({
        center: [userPosition.longitude, userPosition.latitude],
        zoom: 14,
        essential: true,
      });
    }
  }, [userPosition]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 flex gap-3 border border-gray-700">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Full
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Error
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Offline
        </span>
      </div>
    </div>
  );
}
