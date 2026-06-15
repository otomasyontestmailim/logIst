import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ExportButton } from "@/components/export-button";
import { TripsClient } from "./trips-client";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; late?: string; customer?: string }>;
}) {
  const t = await getTranslations("Trips");
  const tc = await getTranslations("Common");
  const { status, late, customer } = await searchParams;
  const lateMode = late === "1";
  const me = await getCurrentUser();

  let trips: TripRow[] = [];
  let customers: CustomerRow[] = [];
  let drivers: UserRow[] = [];
  let stops: StopRow[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();

    // Geciken teslimat görünümü: tamamlanmamış + teslim tarihi bugünden önce.
    let tripsQuery = supabase
      .from("trips")
      .select("*")
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false });
    if (lateMode) {
      const todayISO = new Date().toISOString().slice(0, 10);
      tripsQuery = tripsQuery
        .neq("status", "completed")
        .lt("delivery_date", todayISO);
    }
    if (customer) {
      tripsQuery = tripsQuery.eq("customer_id", customer);
    }

    const [tripsRes, customersRes, driversRes, stopsRes] = await Promise.all([
      tripsQuery,
      supabase
        .from("customers")
        .select("*")
        .eq("organization_id", me.organization_id)
        .order("name"),
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", me.organization_id)
        .eq("role", "driver")
        .order("full_name"),
      supabase
        .from("trip_stops")
        .select("*")
        .eq("organization_id", me.organization_id)
        .order("seq"),
    ]);

    trips = tripsRes.data ?? [];
    customers = customersRes.data ?? [];
    drivers = driversRes.data ?? [];
    stops = stopsRes.data ?? [];
  }

  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (lateMode) exportParams.set("late", "1");
  if (customer) exportParams.set("customer", customer);
  const exportQs = exportParams.toString();
  const exportHref = `/api/export/trips${exportQs ? `?${exportQs}` : ""}`;

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ExportButton href={exportHref} label={tc("exportCsv")} />
      </div>

      {lateMode && (
        <div className="status-chip status-wait mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-medium">
          <span>
            {t("lateFilterActive")}
            {trips.length > 0 ? ` (${trips.length})` : ""}
          </span>
          <Link href="/trips" className="shrink-0 underline underline-offset-2">
            {t("clearFilter")}
          </Link>
        </div>
      )}

      <div className="mt-4">
        <TripsClient
          trips={trips}
          customers={customers}
          drivers={drivers}
          stops={stops}
          initialStatus={status}
        />
      </div>
    </main>
  );
}
