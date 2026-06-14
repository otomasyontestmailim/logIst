"use client";

import { useMemo, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { StopsTimeline } from "@/components/stops-timeline";
import { STATUS_CLASSES } from "@/lib/trip-status";
import type { Database } from "@/lib/supabase/database.types";

type LocationRow = Database["public"]["Tables"]["driver_locations"]["Row"];
type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
export type DriverInfo = {
  id: string;
  full_name: string | null;
  phone: string | null;
  plate: string | null;
};

export function DashboardMap({
  locations,
  drivers,
  trips,
  stops,
}: {
  locations: LocationRow[];
  drivers: DriverInfo[];
  trips: TripRow[];
  stops: StopRow[];
}) {
  const t = useTranslations("Dashboard");
  const tt = useTranslations("Trips");
  const tts = useTranslations("TripStatus");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const driverMap = useMemo(
    () => new Map(drivers.map((d) => [d.id, d])),
    [drivers],
  );

  const markers: MapMarker[] = locations.map((loc) => {
    const d = driverMap.get(loc.driver_id);
    return {
      id: loc.driver_id,
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      label: d?.full_name ?? "—",
      sublabel: `${t("lastSeen")}: ${format.relativeTime(new Date(loc.recorded_at), now)}`,
    };
  });

  const driver = selectedDriver ? driverMap.get(selectedDriver) : null;
  const trip = selectedDriver
    ? (trips.find(
        (tr) => tr.driver_id === selectedDriver && tr.status !== "completed",
      ) ?? null)
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <MapView
        markers={markers}
        onSelect={setSelectedDriver}
        emptyTitle={t("mapEmptyTitle")}
        emptyDesc={t("mapEmptyDesc")}
        className="z-0 h-[28rem] w-full rounded-lg border"
      />
      <aside className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">{t("tripInfo")}</h2>
        {!driver ? (
          <p className="text-sm text-muted-foreground">{t("noTripSelected")}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <InfoRow label={t("driver")} value={driver.full_name} />
            <InfoRow label={t("phone")} value={driver.phone} />
            <InfoRow label={t("plate")} value={driver.plate} />
            {!trip ? (
              <p className="text-muted-foreground">{t("noActiveTrip")}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tt("status")}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[trip.status]}`}
                  >
                    {tts(trip.status)}
                  </span>
                </div>
                <InfoRow label={tt("cargoType")} value={trip.cargo_type} />
                <InfoRow
                  label={tt("tonnageKg")}
                  value={
                    trip.tonnage_kg != null
                      ? format.number(Number(trip.tonnage_kg))
                      : null
                  }
                />
                <InfoRow label={tt("origin")} value={trip.origin} />
                <InfoRow label={tt("destination")} value={trip.destination} />
                <InfoRow label={tt("trackingNo")} value={trip.tracking_no} />
                <div className="border-t pt-3">
                  <StopsTimeline
                    stops={stops.filter((s) => s.trip_id === trip.id)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
