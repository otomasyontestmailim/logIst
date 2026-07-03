import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { routing } from "@/i18n/routing";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.length < 10) notFound();

  const admin = adminClientOrNull();
  if (!admin) notFound();

  const { data: trip } = await admin
    .from("trips")
    .select(
      "id, origin, destination, status, load_date, delivery_date, driver_id, delivered_at",
    )
    .eq("tracking_token", token)
    .maybeSingle();

  if (!trip) notFound();

  // Şoför adı: yalnızca ad (soyad gizli)
  let driverFirstName: string | null = null;
  if (trip.driver_id) {
    const { data: driver } = await admin
      .from("users")
      .select("full_name")
      .eq("id", trip.driver_id)
      .maybeSingle();
    if (driver?.full_name) {
      const parts = driver.full_name.trim().split(/\s+/);
      driverFirstName =
        parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
          : parts[0];
    }
  }

  // Halka açık sayfa: oturum/locale yok → varsayılan dilde çevir.
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Tracking" });
  const ts = await getTranslations({ locale, namespace: "TripStatus" });
  const format = await getFormatter({ locale });

  const isCompleted =
    trip.status === "completed" || trip.status === "delivery_approval";

  function fmt(dateStr: string | null) {
    if (!dateStr) return null;
    try {
      return format.dateTime(new Date(dateStr), { dateStyle: "medium" });
    } catch {
      return dateStr;
    }
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4 pt-8">
        {/* Başlık */}
        <div className="rounded-xl border bg-card p-6 shadow-resting">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("title")}
          </p>
          <h1 className="text-xl font-bold tracking-tight">
            {trip.origin ?? "—"} → {trip.destination ?? "—"}
          </h1>
        </div>

        {/* Durum */}
        <div className="rounded-xl border bg-card p-6 shadow-resting">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("status")}
          </p>
          <div
            className={`flex items-center gap-3 ${isCompleted ? "status-done" : "status-active"}`}
          >
            <span
              className={`status-dot inline-block size-2.5 rounded-full ${isCompleted ? "" : "animate-pulse"}`}
            />
            <span className="text-lg font-semibold">
              {ts(trip.status as Parameters<typeof ts>[0])}
            </span>
          </div>
          {trip.delivered_at && isCompleted && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("deliveredOn", { date: fmt(trip.delivered_at) ?? "—" })}
            </p>
          )}
        </div>

        {/* Tarihler */}
        <div className="grid grid-cols-2 gap-4">
          {trip.load_date && (
            <div className="rounded-xl border bg-card p-5 shadow-resting">
              <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                {t("loadDate")}
              </p>
              <p className="font-semibold tabular-nums">
                {fmt(trip.load_date)}
              </p>
            </div>
          )}
          {trip.delivery_date && (
            <div className="rounded-xl border bg-card p-5 shadow-resting">
              <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                {t("estimatedDelivery")}
              </p>
              <p className="font-semibold tabular-nums">
                {fmt(trip.delivery_date)}
              </p>
            </div>
          )}
        </div>

        {/* Şoför */}
        {driverFirstName && (
          <div className="rounded-xl border bg-card p-5 shadow-resting">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">
              {t("driver")}
            </p>
            <p className="font-semibold">{driverFirstName}</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t("lastUpdate")}: {fmt(new Date().toISOString())}
        </p>
      </div>
    </main>
  );
}
