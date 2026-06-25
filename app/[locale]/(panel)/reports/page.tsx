import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ReportsClient,
  type DriverStat,
  type TripSummary,
} from "./reports-client";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const t = await getTranslations("Reports");
  const me = await getCurrentUser();
  const params = await searchParams;

  const dateFrom = params.from ?? "";
  const dateTo = params.to ?? "";

  let summary: TripSummary = { total: 0, completed: 0, active: 0 };
  let driverStats: DriverStat[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();

    let query = supabase
      .from("trips")
      .select("id, status, driver_id, created_at")
      .eq("organization_id", me.organization_id);

    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const [tripsRes, driversRes] = await Promise.all([
      query,
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", me.organization_id)
        .eq("role", "driver"),
    ]);

    const trips = (tripsRes.data as TripRow[]) ?? [];
    const drivers = (driversRes.data as UserRow[]) ?? [];

    summary = {
      total: trips.length,
      completed: trips.filter((t) => t.status === "completed").length,
      active: trips.filter((t) => t.status !== "completed").length,
    };

    const driverMap = new Map(
      drivers.map((d) => [d.id, d.full_name ?? d.email ?? "—"]),
    );

    const statMap = new Map<string, { total: number; completed: number }>();
    for (const trip of trips) {
      if (!trip.driver_id) continue;
      const prev = statMap.get(trip.driver_id) ?? { total: 0, completed: 0 };
      statMap.set(trip.driver_id, {
        total: prev.total + 1,
        completed: prev.completed + (trip.status === "completed" ? 1 : 0),
      });
    }

    driverStats = Array.from(statMap.entries())
      .map(([driverId, stats]) => ({
        driverId,
        driverName: driverMap.get(driverId) ?? "—",
        total: stats.total,
        completed: stats.completed,
        rate:
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ReportsClient
        summary={summary}
        driverStats={driverStats}
        initialFrom={dateFrom}
        initialTo={dateTo}
      />
    </main>
  );
}
