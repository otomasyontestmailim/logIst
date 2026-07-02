import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { STATUS_TONE_NAME } from "@/lib/trip-status";
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
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
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
        <div className="rounded-xl border bg-card p-6 space-y-3 shadow-resting">
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

        <StatTile
          label={tc("colTrips")}
          value={trips.length}
          className="flex flex-col justify-center"
        />
      </div>

      {/* Edit / Delete */}
      {(me.role === "admin" || me.role === "dispatcher") && (
        <CustomerDetailActions customer={customer} />
      )}

      {/* Trip history */}
      <section className="space-y-3">
        <h2 className="font-semibold">{t("tripHistory")}</h2>
        {trips.length === 0 ? (
          <EmptyState title={t("noTrips")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colRoute")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colLoadDate")}</TableHead>
                <TableHead>{t("colDriver")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {trip.origin} → {trip.destination}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      tone={STATUS_TONE_NAME[trip.status as TripStatus]}
                    >
                      {ts(trip.status as TripStatus)}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(format, trip.load_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {trip.driver_id
                      ? (driverMap.get(trip.driver_id) ?? "—")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
