import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PIPELINE_STATUSES } from "@/lib/trip-status";
import type { TripStatus } from "@/lib/supabase/database.types";

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
