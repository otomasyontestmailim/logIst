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
import { DriverDetailActions } from "./driver-detail-client";
import type { Database, TripStatus } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;
type TripRow = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  "id" | "origin" | "destination" | "status" | "load_date" | "delivery_date"
>;

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("DriverDetail");
  const td = await getTranslations("Drivers");
  const ts = await getTranslations("TripStatus");
  const format = await getFormatter();
  const me = await getCurrentUser();

  if (!me?.organization_id) notFound();

  const supabase = await createClient();

  const [userRes, profileRes, tripsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, phone, created_at")
      .eq("id", id)
      .eq("organization_id", me.organization_id)
      .eq("role", "driver")
      .single<UserRow>(),
    supabase
      .from("driver_profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("trips")
      .select("id, origin, destination, status, load_date, delivery_date")
      .eq("organization_id", me.organization_id)
      .eq("driver_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<TripRow[]>(),
  ]);

  if (!userRes.data) notFound();

  const driver = userRes.data;
  const profile = profileRes.data ?? null;
  const trips = tripsRes.data ?? [];

  const expiryFields = [
    { label: "SRC", date: profile?.src_expiry },
    { label: "ADR", date: profile?.adr_expiry },
    { label: "Psikoteknik", date: profile?.psikoteknik_expiry },
    { label: "Yeşil Kart", date: profile?.green_card_expiry },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/drivers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("back")}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{driver.full_name ?? "—"}</h1>
          <p className="text-sm text-muted-foreground">{driver.email}</p>
        </div>
      </div>

      {/* Profile grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info card */}
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-resting">
          <h2 className="font-semibold">{td("vehicleInfo")}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label={td("phone")} value={driver.phone} />
            <InfoRow label={td("licenseNo")} value={profile?.license_no} />
            <InfoRow label={td("plate")} value={profile?.plate} />
            <InfoRow label={td("trailerNo")} value={profile?.trailer_no} />
            <InfoRow
              label={td("vehicleModel")}
              value={profile?.vehicle_model}
            />
            <InfoRow
              label={td("vehicleYear")}
              value={profile?.vehicle_year?.toString()}
            />
            <InfoRow
              label={td("capacityTon")}
              value={
                profile?.capacity_ton != null
                  ? `${profile.capacity_ton} TON`
                  : null
              }
            />
          </dl>
        </div>

        {/* Expiry badges */}
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-resting">
          <h2 className="font-semibold">{td("colExpiries")}</h2>
          <div className="space-y-2">
            {expiryFields.map(({ label, date }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <ExpiryBadge date={date} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit / Delete actions */}
      {(me.role === "admin" || me.role === "dispatcher") && (
        <DriverDetailActions driver={{ ...driver, profile }} />
      )}

      {/* Recent trips */}
      <section className="space-y-3">
        <h2 className="font-semibold">{t("recentTrips")}</h2>
        {trips.length === 0 ? (
          <EmptyState title={t("noTrips")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colRoute")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colLoadDate")}</TableHead>
                <TableHead>{t("colDeliveryDate")}</TableHead>
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
                    {formatDate(format, trip.delivery_date)}
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
