"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Next bundling'i Leaflet'in varsayılan ikon yollarını kırar — public'ten yükle
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
};

// Türkiye merkezli varsayılan görünüm
const DEFAULT_CENTER: [number, number] = [39.0, 35.0];

export default function LeafletMap({
  markers,
  onSelect,
  className,
}: {
  markers: MapMarker[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const center: [number, number] =
    markers.length > 0 ? [markers[0].lat, markers[0].lng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={markers.length > 0 ? 7 : 6}
      scrollWheelZoom
      className={className ?? "h-96 w-full rounded-lg"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          eventHandlers={onSelect ? { click: () => onSelect(m.id) } : undefined}
        >
          <Popup>
            <div className="text-sm font-medium">{m.label}</div>
            {m.sublabel && <div className="text-xs">{m.sublabel}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
