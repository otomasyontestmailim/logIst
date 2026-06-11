import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations("Trips");
  const { status } = await searchParams;
  const me = await getCurrentUser();

  let trips: TripRow[] = [];
  let customers: CustomerRow[] = [];
  let drivers: UserRow[] = [];
  let stops: StopRow[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();

    const [tripsRes, customersRes, driversRes, stopsRes] = await Promise.all([
      supabase
        .from("trips")
        .select("*")
        .eq("organization_id", me.organization_id)
        .order("created_at", { ascending: false }),
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

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
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
