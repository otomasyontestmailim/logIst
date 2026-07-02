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
import { ExpiryBadge } from "@/components/expiry-badge";
import { STATUS_TONE_NAME } from "@/lib/trip-status";
import type { Database, TripStatus } from "@/lib/supabase/database.types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type TripRow = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  "id" | "origin" | "destination" | "status" | "load_date" | "delivery_date"
>;

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("VehicleDetail");
  const tv = await getTranslations("Vehicles");
  const ts = await getTranslations("TripStatus");
  const format = await getFormatter();
  const me = await getCurrentUser();

  if (!me?.organization_id) notFound();

  const supabase = await createClient();

  const [vehicleRes, tripsRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", me.organization_id)
      .single<VehicleRow>(),
    supabase
      .from("trips")
      .select("id, origin, destination, status, load_date, delivery_date")
      .eq("organization_id", me.organization_id)
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false })
      .returns<TripRow[]>(),
  ]);

  if (!vehicleRes.data) notFound();

  const vehicle = vehicleRes.data;
  const trips = tripsRes.data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <Link
        href="/vehicles"
        className="text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        {t("back")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{vehicle.plate}</h1>
          {vehicle.trailer_plate && (
            <p className="text-sm text-muted-foreground">
              {tv("trailerPlate")}: {vehicle.trailer_plate}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 space-y-3 shadow-resting">
          <h2 className="font-semibold">{tv("title")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow
              label={tv("brand")}
              value={[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
            />
            <InfoRow label={tv("year")} value={vehicle.year?.toString()} />
            <InfoRow
              label={tv("capacityTon")}
              value={
                vehicle.capacity_ton != null
                  ? `${vehicle.capacity_ton} TON`
                  : undefined
              }
            />
            <InfoRow
              label={tv("lastServiceKm")}
              value={vehicle.last_service_km?.toString()}
            />
            <InfoRow
              label={tv("currentKm")}
              value={vehicle.current_km?.toString()}
            />
          </dl>
          {vehicle.notes && (
            <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {vehicle.notes}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-3 shadow-resting">
          <h2 className="font-semibold">{t("expiriesTitle")}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {tv("inspectionExpiry")}
              </span>
              <ExpiryBadge date={vehicle.inspection_expiry} showOk />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {tv("insuranceExpiry")}
              </span>
              <ExpiryBadge date={vehicle.insurance_expiry} showOk />
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">{tv("linkedTrips")}</h2>
        {trips.length === 0 ? (
          <EmptyState title={t("noTrips")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colRoute")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
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
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
