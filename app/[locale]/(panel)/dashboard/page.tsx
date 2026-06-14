import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, Package, Truck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PIPELINE_STATUSES, STATUS_TONE } from "@/lib/trip-status";
import type { Database, TripStatus } from "@/lib/supabase/database.types";
import { DashboardMap, type DriverInfo } from "./dashboard-map";

type LocationRow = Database["public"]["Tables"]["driver_locations"]["Row"];
type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];

// Başlık yanındaki özet KPI'lar — gecikme en kritik, en başta.
const KPI_KEYS = ["lateDeliveries", "pendingDocuments", "drivers"] as const;
type KpiKey = (typeof KPI_KEYS)[number];

export default function DashboardPage() {
  // Veri çekimi alt bileşene taşındı; kabuk anında çizilir, içerik streamlenir.
  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const t = await getTranslations("Dashboard");
  const ts = await getTranslations("TripStatus");
  const me = await getCurrentUser();

  const kpis: Record<KpiKey, number> = {
    lateDeliveries: 0,
    pendingDocuments: 0,
    drivers: 0,
  };
  const pipeline: Record<TripStatus, number> = {
    requested: 0,
    driver_approval: 0,
    dispatched: 0,
    loading: 0,
    in_transit: 0,
    delivering: 0,
    delivery_approval: 0,
    completed: 0,
  };

  let tripsTotal = 0;
  let customersTotal = 0;
  let locations: LocationRow[] = [];
  let mapDrivers: DriverInfo[] = [];
  let activeTrips: TripRow[] = [];
  let tripStops: StopRow[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();
    const todayISO = new Date().toISOString().slice(0, 10);

    const [
      pendingRes,
      lateRes,
      driversRes,
      tripsTotalRes,
      customersRes,
      ...pipelineRes
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id)
        .eq("status", "pending"),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id)
        .neq("status", "completed")
        .lt("delivery_date", todayISO),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id)
        .eq("role", "driver"),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id),
      ...PIPELINE_STATUSES.map((status) =>
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id!)
          .eq("status", status),
      ),
    ]);

    kpis.pendingDocuments = pendingRes.count ?? 0;
    kpis.lateDeliveries = lateRes.count ?? 0;
    kpis.drivers = driversRes.count ?? 0;
    tripsTotal = tripsTotalRes.count ?? 0;
    customersTotal = customersRes.count ?? 0;
    PIPELINE_STATUSES.forEach((status, i) => {
      pipeline[status] = pipelineRes[i]?.count ?? 0;
    });

    // İlk çalıştırma: hiç sefer yoksa harita/pipeline verisi çekmeye gerek yok.
    if (tripsTotal > 0) {
      const [locRes, usersRes, profilesRes, tripsRes, stopsRes] =
        await Promise.all([
          supabase
            .from("driver_locations")
            .select("*")
            .eq("organization_id", me.organization_id),
          supabase
            .from("users")
            .select("id, full_name, phone")
            .eq("organization_id", me.organization_id)
            .eq("role", "driver"),
          supabase.from("driver_profiles").select("user_id, plate"),
          supabase
            .from("trips")
            .select("*")
            .eq("organization_id", me.organization_id)
            .neq("status", "completed"),
          supabase
            .from("trip_stops")
            .select("*")
            .eq("organization_id", me.organization_id)
            .order("seq"),
        ]);

      const plateMap = new Map(
        (profilesRes.data ?? []).map((p) => [p.user_id, p.plate]),
      );
      locations = locRes.data ?? [];
      mapDrivers = (usersRes.data ?? []).map((u) => ({
        id: u.id,
        full_name: u.full_name,
        phone: u.phone,
        plate: plateMap.get(u.id) ?? null,
      }));
      activeTrips = tripsRes.data ?? [];
      tripStops = stopsRes.data ?? [];
    }
  }

  // İlk çalıştırma boş durumu: paneli öğretip ilk adımlara yönlendir.
  if (tripsTotal === 0) {
    return (
      <SetupEmptyState
        hasDrivers={kpis.drivers > 0}
        hasCustomers={customersTotal > 0}
      />
    );
  }

  return (
    <>
      {/* Başlık + özet KPI şeridi: gecikme >0 ise uyarı tonunda öne çıkar */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
          {KPI_KEYS.map((key) => {
            const alert = key === "lateDeliveries" && kpis[key] > 0;
            const body = (
              <>
                <dt className="text-xs text-muted-foreground">{t(key)}</dt>
                <dd
                  className={cn(
                    "text-2xl font-semibold tabular-nums leading-none underline-offset-4 group-hover:underline group-focus-visible:underline",
                    alert && "text-warning",
                  )}
                >
                  {kpis[key]}
                </dd>
              </>
            );
            // Geciken teslimat varsa tek tıkla filtreli listeye git.
            return alert ? (
              <Link
                key={key}
                href="/trips?late=1"
                className="group flex flex-col gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {body}
              </Link>
            ) : (
              <div key={key} className="flex flex-col gap-0.5">
                {body}
              </div>
            );
          })}
        </dl>
      </div>

      {/* Kahraman: TIRPORT tarzı sefer hattı — tıklayınca duruma göre filtreli liste */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("pipelineTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PIPELINE_STATUSES.map((status) => {
            const count = pipeline[status];
            const isEmpty = count === 0;
            return (
              <Link
                key={status}
                href={`/trips?status=${status}`}
                className={cn(
                  "rounded-lg border bg-card p-3 text-center transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isEmpty && "opacity-55",
                )}
              >
                <div
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    isEmpty && "font-semibold text-muted-foreground",
                  )}
                >
                  {count}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full status-dot",
                      STATUS_TONE[status],
                    )}
                  />
                  {ts(status)}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <DashboardMap
        locations={locations}
        drivers={mapDrivers}
        trips={activeTrips}
        stops={tripStops}
      />
    </>
  );
}

async function SetupEmptyState({
  hasDrivers,
  hasCustomers,
}: {
  hasDrivers: boolean;
  hasCustomers: boolean;
}) {
  const t = await getTranslations("Dashboard");
  const steps = [
    {
      href: "/drivers",
      label: t("setupDrivers"),
      icon: Truck,
      done: hasDrivers,
    },
    {
      href: "/customers",
      label: t("setupCustomers"),
      icon: Users,
      done: hasCustomers,
    },
    { href: "/trips", label: t("setupTrips"), icon: Package, done: false },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="max-w-xl rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("setupTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("setupDesc")}</p>
        <ol className="mt-5 flex flex-col gap-2">
          {steps.map(({ href, label, icon: Icon, done }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    done
                      ? "status-chip status-done"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {label}
                </span>
                {!done && (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                )}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const SK = "animate-pulse rounded bg-muted motion-reduce:animate-none";

function DashboardSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className={cn(SK, "h-8 w-32")} />
        <div className="flex gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className={cn(SK, "h-3 w-16")} />
              <div className={cn(SK, "h-6 w-10")} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className={cn(SK, "h-4 w-24")} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={cn(SK, "h-[4.5rem] border bg-muted/40")} />
          ))}
        </div>
      </div>
      <div className={cn(SK, "h-[28rem] w-full border bg-muted/40")} />
    </>
  );
}
