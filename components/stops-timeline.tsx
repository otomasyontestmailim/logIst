"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Database } from "@/lib/supabase/database.types";

type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];

/** Ekran görüntüsündeki gibi dikey durak zaman çizelgesi:
 *  "1. Yükleme / 2. Yükleme / 1. Teslim" + planlanan tarih. */
export function StopsTimeline({ stops }: { stops: StopRow[] }) {
  const t = useTranslations("Stops");
  const format = useFormatter();

  if (stops.length === 0) return null;

  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  let pickupCount = 0;
  let deliveryCount = 0;

  return (
    <ol className="space-y-0">
      {sorted.map((stop, i) => {
        const n = stop.stop_type === "pickup" ? ++pickupCount : ++deliveryCount;
        const label =
          stop.stop_type === "pickup"
            ? t("pickupN", { n })
            : t("deliveryN", { n });
        const last = i === sorted.length - 1;
        return (
          <li key={stop.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`mt-0.5 size-3 shrink-0 rounded-full border-2 ${
                  stop.actual_at
                    ? "border-success bg-success"
                    : stop.stop_type === "pickup"
                      ? "border-primary bg-primary"
                      : "border-primary bg-background"
                }`}
              />
              {!last && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="text-sm">
              <div className="font-medium">{label}</div>
              {stop.address && (
                <div className="text-muted-foreground">{stop.address}</div>
              )}
              {stop.planned_at && (
                <div className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(stop.planned_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
