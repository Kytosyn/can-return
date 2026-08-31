import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/assets/MarkerCluster.css";
import "react-leaflet-cluster/assets/MarkerCluster.Default.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";

// --- Custom marker icons ---

function makeIcon(color: string, size = 28): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
    html: `<svg width="${size}" height="${size * 1.3}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="13" r="6" fill="white" opacity="0.95"/>
      <text x="14" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">♻</text>
    </svg>`,
  });
}

const ICON_RUNNING = makeIcon("#22c55e");    // green
const ICON_FULL = makeIcon("#f59e0b");       // amber
const ICON_ERROR = makeIcon("#ef4444");      // red
const ICON_OFFLINE = makeIcon("#6b7280");    // gray
const ICON_DEFAULT = makeIcon("#3b82f6");    // blue

function getStatusIcon(status: string): L.DivIcon {
  switch (status?.toUpperCase()) {
    case "RUNNING": return ICON_RUNNING;
    case "FULL": return ICON_FULL;
    case "ERROR": return ICON_ERROR;
    case "OFFLINE":
    case "MAINTENANCE": return ICON_OFFLINE;
    default: return ICON_DEFAULT;
  }
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status?.toUpperCase()) {
    case "RUNNING": return { label: "Online", color: "text-green-400" };
    case "FULL": return { label: "Full", color: "text-amber-400" };
    case "ERROR": return { label: "Error", color: "text-red-400" };
    case "OFFLINE": return { label: "Offline", color: "text-gray-400" };
    case "MAINTENANCE": return { label: "Maintenance", color: "text-gray-400" };
    default: return { label: "Unknown", color: "text-gray-500" };
  }
}

// --- Map internals ---

function RecenterMap({ position }: { position: GeoPosition }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.latitude, position.longitude], 15, { animate: true });
  }, [position, map]);
  return null;
}

function FitBounds({ points }: { points: ReturnPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
}

// --- Component ---

interface Props {
  points: (ReturnPoint & { distanceKm?: number })[];
  userPosition: GeoPosition | null;
}

export function ReturnPointMap({ points, userPosition }: Props) {
  const center: [number, number] = userPosition
    ? [userPosition.latitude, userPosition.longitude]
    : [1.3521, 103.8198]; // Singapore center

  // Filter to only show points with valid coordinates
  const validPoints = useMemo(
    () => points.filter((p) => p.latitude && p.longitude),
    [points],
  );

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-800 relative">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Fit bounds to show all markers if no user position */}
        {!userPosition && validPoints.length > 0 && (
          <FitBounds points={validPoints} />
        )}

        {/* Recenter on user position */}
        {userPosition && <RecenterMap position={userPosition} />}

        {/* User location marker */}
        {userPosition && (
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={8}
            pathOptions={{
              fillColor: "#3b82f6",
              fillOpacity: 1,
              color: "#ffffff",
              weight: 3,
            }}
          />
        )}

        {/* RVM markers with clustering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            let color = "#3b82f6";
            if (count > 50) color = "#ef4444";
            else if (count > 20) color = "#f59e0b";
            return L.divIcon({
              html: `<div style="
                background: ${color};
                color: white;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: 700;
                font-family: system-ui;
                border: 2px solid rgba(255,255,255,0.3);
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              ">${count}</div>`,
              className: "",
              iconSize: [36, 36],
            });
          }}
        >
          {validPoints.map((p) => {
            const status = getStatusLabel(p.status || "");
            return (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={getStatusIcon(p.status || "")}
              >
                <Popup className="rvm-popup">
                  <div
                    style={{
                      background: "#1f2937",
                      color: "#e5e7eb",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      minWidth: "220px",
                      maxWidth: "280px",
                      fontFamily: "system-ui, sans-serif",
                      border: "1px solid #374151",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "14px",
                        marginBottom: "6px",
                        color: "#fff",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}
                    >
                      {p.address}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        fontSize: "11px",
                      }}
                    >
                      <span
                        style={{
                          background:
                            p.status?.toUpperCase() === "RUNNING"
                              ? "#065f46"
                              : p.status?.toUpperCase() === "FULL"
                                ? "#78350f"
                                : "#374151",
                          color:
                            p.status?.toUpperCase() === "RUNNING"
                              ? "#6ee7b7"
                              : p.status?.toUpperCase() === "FULL"
                                ? "#fcd34d"
                                : "#9ca3af",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontWeight: 600,
                        }}
                      >
                        {status.label}
                      </span>
                      {p.hours && (
                        <span style={{ color: "#9ca3af" }}>
                          {p.hours}
                        </span>
                      )}
                    </div>
                    {"distanceKm" in p && p.distanceKm !== undefined && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        {p.distanceKm < 1
                          ? `${Math.round(p.distanceKm * 1000)}m away`
                          : `${p.distanceKm.toFixed(1)}km away`}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 flex gap-3 border border-gray-700">
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
