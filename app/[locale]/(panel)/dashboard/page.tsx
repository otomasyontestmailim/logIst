import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PIPELINE_STATUSES } from "@/lib/trip-status";
import type { Database, TripStatus } from "@/lib/supabase/database.types";
import { DashboardMap, type DriverInfo } from "./dashboard-map";

type LocationRow = Database["public"]["Tables"]["driver_locations"]["Row"];
type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];

const STAT_KEYS = [
  "activeTrips",
  "pendingDocuments",
  "lateDeliveries",
  "drivers",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const ts = await getTranslations("TripStatus");
  const me = await getCurrentUser();

  const stats: Record<StatKey, number> = {
    activeTrips: 0,
    pendingDocuments: 0,
    lateDeliveries: 0,
    drivers: 0,
  };
  const pipeline: Record<TripStatus, number> = {
    requested: 0,
    driver_approval: 0,
    dispatched: 0,
    loading: 0,
    in_transit: 0,
    delivering: 0,
    delivery_approval: 0,
    completed: 0,
  };

  let locations: LocationRow[] = [];
  let mapDrivers: DriverInfo[] = [];
  let activeTrips: TripRow[] = [];
  let tripStops: StopRow[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();
    const todayISO = new Date().toISOString().slice(0, 10);

    const [activeRes, pendingRes, lateRes, driversRes, ...pipelineRes] =
      await Promise.all([
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id)
          .neq("status", "completed"),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id)
          .eq("status", "pending"),
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id)
          .neq("status", "completed")
          .lt("delivery_date", todayISO),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id)
          .eq("role", "driver"),
        ...PIPELINE_STATUSES.map((status) =>
          supabase
            .from("trips")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", me.organization_id!)
            .eq("status", status),
        ),
      ]);

    stats.activeTrips = activeRes.count ?? 0;
    stats.pendingDocuments = pendingRes.count ?? 0;
    stats.lateDeliveries = lateRes.count ?? 0;
    stats.drivers = driversRes.count ?? 0;
    PIPELINE_STATUSES.forEach((status, i) => {
      pipeline[status] = pipelineRes[i]?.count ?? 0;
    });

    // Harita verileri: son konumlar + şoför bilgileri + aktif seferler + duraklar
    const [locRes, usersRes, profilesRes, tripsRes, stopsRes] =
      await Promise.all([
        supabase
          .from("driver_locations")
          .select("*")
          .eq("organization_id", me.organization_id),
        supabase
          .from("users")
          .select("id, full_name, phone")
          .eq("organization_id", me.organization_id)
          .eq("role", "driver"),
        supabase.from("driver_profiles").select("user_id, plate"),
        supabase
          .from("trips")
          .select("*")
          .eq("organization_id", me.organization_id)
          .neq("status", "completed"),
        supabase
          .from("trip_stops")
          .select("*")
          .eq("organization_id", me.organization_id)
          .order("seq"),
      ]);

    const plateMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.user_id, p.plate]),
    );
    locations = locRes.data ?? [];
    mapDrivers = (usersRes.data ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      plate: plateMap.get(u.id) ?? null,
    }));
    activeTrips = tripsRes.data ?? [];
    tripStops = stopsRes.data ?? [];
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* TIRPORT tarzı pipeline sayaç barı — tıklayınca duruma göre filtreli sefer listesi */}
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PIPELINE_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/trips?status=${status}`}
            className="rounded-lg border bg-card p-3 text-center shadow-sm transition-colors hover:bg-accent"
          >
            <div className="text-2xl font-bold">{pipeline[status]}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {ts(status)}
            </div>
          </Link>
        ))}
      </div>

      <DashboardMap
        locations={locations}
        drivers={mapDrivers}
        trips={activeTrips}
        stops={tripStops}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_KEYS.map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(key)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats[key]}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
