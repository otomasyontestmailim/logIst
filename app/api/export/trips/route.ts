import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/export/csv";
import { isTripStatus } from "@/lib/trip-status";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me?.organization_id) {
    return new Response("unauthorized", { status: 401 });
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return new Response("forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const late = url.searchParams.get("late") === "1";
  const customer = url.searchParams.get("customer");

  const supabase = await createClient();

  let query = supabase
    .from("trips")
    .select("*")
    .eq("organization_id", me.organization_id)
    .order("created_at", { ascending: false });

  if (status && isTripStatus(status)) query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);
  if (late) {
    const todayISO = new Date().toISOString().slice(0, 10);
    query = query.neq("status", "completed").lt("delivery_date", todayISO);
  }

  const [tripsRes, customersRes, driversRes] = await Promise.all([
    query,
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", me.organization_id),
    supabase
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", me.organization_id)
      .eq("role", "driver"),
  ]);

  const trips = (tripsRes.data as TripRow[]) ?? [];
  const customerMap = new Map(
    (customersRes.data ?? []).map((c) => [c.id, c.name]),
  );
  const driverMap = new Map(
    (driversRes.data ?? []).map((u) => [u.id, u.full_name ?? u.email ?? ""]),
  );

  const columns: CsvColumn<TripRow>[] = [
    { header: "Origin", value: (t) => t.origin },
    { header: "Destination", value: (t) => t.destination },
    {
      header: "Customer",
      value: (t) =>
        t.customer_id ? (customerMap.get(t.customer_id) ?? "") : "",
    },
    {
      header: "Driver",
      value: (t) => (t.driver_id ? (driverMap.get(t.driver_id) ?? "") : ""),
    },
    { header: "Status", value: (t) => t.status },
    { header: "Load date", value: (t) => t.load_date },
    { header: "Delivery date", value: (t) => t.delivery_date },
    { header: "Cargo type", value: (t) => t.cargo_type },
    { header: "Tonnage (kg)", value: (t) => t.tonnage_kg },
    { header: "Distance (km)", value: (t) => t.distance_km },
    { header: "Tracking no", value: (t) => t.tracking_no },
    { header: "Created", value: (t) => t.created_at },
  ];

  const csv = toCsv(trips, columns);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `trips-${date}.csv`);
}
