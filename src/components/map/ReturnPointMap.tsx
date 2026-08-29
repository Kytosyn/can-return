import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPosition, ReturnPoint } from "../../lib/return-points/types";

// Fix Leaflet default icon issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SINGAPORE_CENTER: GeoPosition = { latitude: 1.3521, longitude: 103.8198 };

function RecenterMap({ position }: { position: GeoPosition }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.latitude, position.longitude], 14);
  }, [position, map]);
  return null;
}

interface Props {
  points: (ReturnPoint & { distanceKm?: number })[];
  userPosition: GeoPosition | null;
}

export function ReturnPointMap({ points, userPosition }: Props) {
  const center = userPosition ?? SINGAPORE_CENTER;

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-800">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userPosition && <RecenterMap position={userPosition} />}
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <div className="text-sm">
                <strong>{p.name}</strong>
                <br />
                {p.address}
                <br />
                <span className="text-gray-500">{p.operatingHours}</span>
                {!p.isOperational && (
                  <span className="block text-red-600 font-medium mt-1">
                    Currently offline
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
