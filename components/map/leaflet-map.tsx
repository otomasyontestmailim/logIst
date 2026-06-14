"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
};

// Petrol-teal tasarım sistemiyle uyumlu, canlı nabız efektli konum işareti.
// Leaflet'in varsayılan PNG ikonları yerine inline SVG/divIcon kullanır —
// Next bundling'in ikon yolu sorununu da tamamen ortadan kaldırır.
function pinIcon(label: string): L.DivIcon {
  const initial = (label.trim()[0] ?? "•").toUpperCase();
  return L.divIcon({
    className: "driver-pin",
    html: `
      <span class="driver-pin__pulse"></span>
      <span class="driver-pin__dot">${initial}</span>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Dünya geneli güvenli varsayılan (yalnızca hiç konum yokken görünür).
const WORLD_CENTER: [number, number] = [20, 0];

/** Markörler değiştikçe haritayı konuma göre otomatik çerçeveler. */
function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 11, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: true });
  }, [map, markers]);

  return null;
}

export default function LeafletMap({
  markers,
  onSelect,
  className,
  emptyTitle = "Canlı konum bekleniyor",
  emptyDesc = "Şoför uygulaması açıldığında konum burada görünür.",
}: {
  markers: MapMarker[];
  onSelect?: (id: string) => void;
  className?: string;
  emptyTitle?: string;
  emptyDesc?: string;
}) {
  const hasMarkers = markers.length > 0;

  return (
    <div
      className={`relative overflow-hidden ${className ?? "h-96 w-full rounded-lg"}`}
    >
      <MapContainer
        center={hasMarkers ? [markers[0].lat, markers[0].lng] : WORLD_CENTER}
        zoom={hasMarkers ? 11 : 2}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        {/* CARTO Voyager: OSM'den belirgin daha temiz ve modern bir görünüm */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitToMarkers markers={markers} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={pinIcon(m.label)}
            eventHandlers={
              onSelect ? { click: () => onSelect(m.id) } : undefined
            }
          >
            <Popup>
              <div className="text-sm font-medium">{m.label}</div>
              {m.sublabel && (
                <div className="text-xs text-muted-foreground">
                  {m.sublabel}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Henüz konum yoksa: boş Türkiye haritası yerine bilgilendirici overlay */}
      {!hasMarkers && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
          <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-lg border bg-card/90 px-5 py-4 text-center shadow-sm">
            <span className="driver-pin__dot driver-pin__dot--static">•</span>
            <p className="mt-1 text-sm font-medium">{emptyTitle}</p>
            <p className="text-xs text-muted-foreground">{emptyDesc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
