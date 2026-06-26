import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/export-button";
import { Link } from "@/i18n/navigation";
import { Pagination } from "@/components/pagination";
import type { Database } from "@/lib/supabase/database.types";
import { DriversClient, type DriverRow } from "./drivers-client";

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;
type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];

const PAGE_SIZE = 25;

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("Drivers");
  const tc = await getTranslations("Common");
  const supabase = await createClient();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS, listeyi otomatik olarak giriş yapan admin'in firmasıyla sınırlar.
  const { data: users, count } = await supabase
    .from("users")
    .select("id, full_name, email, phone, created_at", { count: "exact" })
    .eq("role", "driver")
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<UserRow[]>();

  const total = count ?? 0;
  const ids = (users ?? []).map((u) => u.id);
  let profiles: ProfileRow[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("driver_profiles")
      .select("*")
      .in("user_id", ids)
      .returns<ProfileRow[]>();
    profiles = data ?? [];
  }

  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));

  // Karne sayaçları: teslim edilen sefer sayısı + toplam km (distance_km)
  const stats = new Map<string, { tripCount: number; totalKm: number }>();
  if (ids.length > 0) {
    const { data: tripRows } = await supabase
      .from("trips")
      .select("driver_id, status, distance_km")
      .in("driver_id", ids)
      .in("status", ["delivery_approval", "completed"]);
    for (const tr of tripRows ?? []) {
      if (!tr.driver_id) continue;
      const s = stats.get(tr.driver_id) ?? { tripCount: 0, totalKm: 0 };
      s.tripCount += 1;
      s.totalKm += Number(tr.distance_km ?? 0);
      stats.set(tr.driver_id, s);
    }
  }

  const drivers: DriverRow[] = (users ?? []).map((u) => ({
    ...u,
    profile: profileByUser.get(u.id) ?? null,
    stats: stats.get(u.id) ?? { tripCount: 0, totalKm: 0 },
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/drivers/invite"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {t("inviteDriver")}
          </Link>
          <ExportButton href="/api/export/drivers" label={tc("exportCsv")} />
        </div>
      </div>
      <DriversClient drivers={drivers} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </main>
  );
}
