"use client";

import dynamic from "next/dynamic";

// Leaflet `window` ister — SSR kapalı dinamik import şart
export const MapView = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
  ),
});

export type { MapMarker } from "./leaflet-map";
