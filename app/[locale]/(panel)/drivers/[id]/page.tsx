import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { expiryStatus } from "@/lib/expiry";
import { STATUS_CLASSES } from "@/lib/trip-status";
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
    <main className="flex flex-1 flex-col gap-6 p-8">
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
        <div className="rounded-lg border bg-card p-6 space-y-4">
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
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{td("colExpiries")}</h2>
          <div className="space-y-2">
            {expiryFields.map(({ label, date }) => {
              if (!date)
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-muted-foreground">—</span>
                  </div>
                );
              const status = expiryStatus(date);
              let cls = "text-foreground";
              let badge = "";
              if (status === "expired") {
                cls = "text-destructive font-medium";
                badge = td("expired");
              } else if (status === "expiring") {
                cls = "text-amber-600 dark:text-amber-400 font-medium";
                badge = td("expiringSoon");
              }
              return (
                <div
                  key={label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cls}>
                    {formatDate(format, date)}
                    {badge && <span className="ml-2 text-xs">({badge})</span>}
                  </span>
                </div>
              );
            })}
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
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("noTrips")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{td("colVehicle")}</th>
                  <th className="px-4 py-3 font-medium">{td("colExpiries")}</th>
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
                      {formatDate(format, trip.delivery_date)}
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
