import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { STATUS_CLASSES } from "@/lib/trip-status";
import { CustomerDetailActions } from "./customer-detail-client";
import type { Database, TripStatus } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type TripRow = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  | "id"
  | "origin"
  | "destination"
  | "status"
  | "load_date"
  | "delivery_date"
  | "driver_id"
>;

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("CustomerDetail");
  const tc = await getTranslations("Customers");
  const ts = await getTranslations("TripStatus");
  const format = await getFormatter();
  const me = await getCurrentUser();

  if (!me?.organization_id) notFound();

  const supabase = await createClient();

  const [customerRes, tripsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("organization_id", me.organization_id)
      .single<CustomerRow>(),
    supabase
      .from("trips")
      .select(
        "id, origin, destination, status, load_date, delivery_date, driver_id",
      )
      .eq("organization_id", me.organization_id)
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .returns<TripRow[]>(),
  ]);

  if (!customerRes.data) notFound();

  const customer = customerRes.data;
  const trips = tripsRes.data ?? [];

  // Driver names
  const driverIds = [
    ...new Set(trips.map((t) => t.driver_id).filter(Boolean) as string[]),
  ];
  let driverMap = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: drivers } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", driverIds);
    driverMap = new Map(
      (drivers ?? []).map((u) => [u.id, u.full_name ?? u.email ?? "—"]),
    );
  }

  const typeLabel =
    customer.type === "shipper"
      ? tc("typeShipper")
      : customer.type === "consignee"
        ? tc("typeConsignee")
        : tc("typeBoth");

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <Link
        href="/customers"
        className="text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        {t("back")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{typeLabel}</p>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="font-semibold">{tc("name")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label={tc("country")} value={customer.country} />
            <InfoRow label={tc("city")} value={customer.city} />
            {customer.address && (
              <InfoRow label={tc("address")} value={customer.address} />
            )}
            {customer.contact && (
              <InfoRow label={tc("contact")} value={customer.contact} />
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-6 flex flex-col justify-center items-center gap-1">
          <span className="text-4xl font-bold tabular-nums">
            {trips.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {tc("colTrips")}
          </span>
        </div>
      </div>

      {/* Edit / Delete */}
      {(me.role === "admin" || me.role === "dispatcher") && (
        <CustomerDetailActions customer={customer} />
      )}

      {/* Trip history */}
      <section className="space-y-3">
        <h2 className="font-semibold">{t("tripHistory")}</h2>
        {trips.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("noTrips")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tc("colName")}</th>
                  <th className="px-4 py-3 font-medium">{tc("colType")}</th>
                  <th className="px-4 py-3 font-medium">{tc("colLocation")}</th>
                  <th className="px-4 py-3 font-medium">{tc("colContact")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="text-primary hover:underline underline-offset-2"
                      >
                        {trip.origin} → {trip.destination}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[trip.status as TripStatus]}`}
                      >
                        {ts(trip.status as TripStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(format, trip.load_date)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {trip.driver_id
                        ? (driverMap.get(trip.driver_id) ?? "—")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </>
  );
}
