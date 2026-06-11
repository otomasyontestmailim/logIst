import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const STAT_KEYS = [
  "activeTrips",
  "pendingDocuments",
  "lateDeliveries",
  "drivers",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const me = await getCurrentUser();

  const stats: Record<StatKey, number> = {
    activeTrips: 0,
    pendingDocuments: 0,
    lateDeliveries: 0,
    drivers: 0,
  };

  if (me?.organization_id) {
    const supabase = await createClient();
    const todayISO = new Date().toISOString().slice(0, 10);

    const [activeRes, pendingRes, lateRes, driversRes] = await Promise.all([
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
    ]);

    stats.activeTrips = activeRes.count ?? 0;
    stats.pendingDocuments = pendingRes.count ?? 0;
    stats.lateDeliveries = lateRes.count ?? 0;
    stats.drivers = driversRes.count ?? 0;
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
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
