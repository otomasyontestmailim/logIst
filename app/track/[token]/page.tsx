import { notFound } from "next/navigation";
import { adminClientOrNull } from "@/lib/supabase/admin";

const STATUS_LABELS: Record<string, string> = {
  requested: "Order Received",
  driver_approval: "Awaiting Driver",
  dispatched: "Dispatched",
  loading: "Loading",
  in_transit: "In Transit",
  delivering: "Out for Delivery",
  delivery_approval: "Delivered — Pending Confirmation",
  completed: "Completed",
};

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

  const statusLabel = STATUS_LABELS[trip.status] ?? trip.status;
  const isCompleted =
    trip.status === "completed" || trip.status === "delivery_approval";

  function fmt(dateStr: string | null) {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-4 pt-8">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Shipment Tracking
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            {trip.origin ?? "—"} → {trip.destination ?? "—"}
          </h1>
        </div>

        {/* Status */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Status
          </p>
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-block h-2.5 w-2.5 rounded-full",
                isCompleted ? "bg-green-500" : "bg-blue-500 animate-pulse",
              ].join(" ")}
            />
            <span className="text-lg font-semibold text-gray-900">
              {statusLabel}
            </span>
          </div>
          {trip.delivered_at && isCompleted && (
            <p className="mt-1 text-sm text-gray-500">
              Delivered on {fmt(trip.delivered_at)}
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          {trip.load_date && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Load Date
              </p>
              <p className="font-semibold text-gray-900">
                {fmt(trip.load_date)}
              </p>
            </div>
          )}
          {trip.delivery_date && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Est. Delivery
              </p>
              <p className="font-semibold text-gray-900">
                {fmt(trip.delivery_date)}
              </p>
            </div>
          )}
        </div>

        {/* Driver */}
        {driverFirstName && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Driver
            </p>
            <p className="font-semibold text-gray-900">{driverFirstName}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Last updated: {fmt(new Date().toISOString())}
        </p>
      </div>
    </main>
  );
}
