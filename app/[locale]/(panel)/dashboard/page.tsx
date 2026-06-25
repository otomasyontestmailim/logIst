import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  FileText,
  Package,
  Plus,
  Truck,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PIPELINE_STATUSES, STATUS_TONE } from "@/lib/trip-status";
import { daysUntil, expiryStatus, type ExpiryStatus } from "@/lib/expiry";
import type { Database, TripStatus } from "@/lib/supabase/database.types";
import { DashboardMap, type DriverInfo } from "./dashboard-map";

type LocationRow = Database["public"]["Tables"]["driver_locations"]["Row"];
type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type DocStatus = Database["public"]["Tables"]["documents"]["Row"]["status"];
type DocType = Database["public"]["Tables"]["documents"]["Row"]["type"];

const EXPIRY_FIELDS = [
  { col: "src_expiry" as const, key: "src" },
  { col: "adr_expiry" as const, key: "adr" },
  { col: "psikoteknik_expiry" as const, key: "psikoteknik" },
  { col: "green_card_expiry" as const, key: "greenCard" },
];

type ExpiringDoc = {
  driverName: string;
  docKey: string;
  date: string;
  days: number;
  status: Exclude<ExpiryStatus, "ok">;
};

type RecentTrip = {
  id: string;
  origin: string;
  destination: string;
  status: TripStatus;
  driverName: string | null;
};

type RecentDoc = {
  id: string;
  type: DocType;
  status: DocStatus;
  tripLabel: string;
  createdAt: string;
};

export default function DashboardPage() {
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
  const tdt = await getTranslations("DocumentTypes");
  const tds = await getTranslations("DocumentStatus");
  const me = await getCurrentUser();

  let pendingDocCount = 0;
  let driverCount = 0;
  let todayDeliveryCount = 0;
  let tripsTotal = 0;
  let customersTotal = 0;
  const expiringDocs: ExpiringDoc[] = [];
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
  let locations: LocationRow[] = [];
  let mapDrivers: DriverInfo[] = [];
  let activeTrips: TripRow[] = [];
  let tripStops: StopRow[] = [];
  let recentTrips: RecentTrip[] = [];
  let recentDocs: RecentDoc[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();
    const todayISO = new Date().toISOString().slice(0, 10);
    const nextDay = new Date(todayISO);
    nextDay.setDate(nextDay.getDate() + 1);
    const tomorrowISO = nextDay.toISOString().slice(0, 10);

    const [
      pendingRes,
      driversRes,
      tripsTotalRes,
      customersRes,
      todayRes,
      ...pipelineRes
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id)
        .eq("status", "pending"),
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
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", me.organization_id)
        .neq("status", "completed")
        .gte("delivery_date", todayISO)
        .lt("delivery_date", tomorrowISO),
      ...PIPELINE_STATUSES.map((status) =>
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", me.organization_id!)
          .eq("status", status),
      ),
    ]);

    pendingDocCount = pendingRes.count ?? 0;
    driverCount = driversRes.count ?? 0;
    tripsTotal = tripsTotalRes.count ?? 0;
    customersTotal = customersRes.count ?? 0;
    todayDeliveryCount = todayRes.count ?? 0;
    PIPELINE_STATUSES.forEach((status, i) => {
      pipeline[status] = pipelineRes[i]?.count ?? 0;
    });

    // Belge süresi uyarıları
    const [profilesRes, driverNamesRes] = await Promise.all([
      supabase
        .from("driver_profiles")
        .select(
          "user_id, src_expiry, adr_expiry, psikoteknik_expiry, green_card_expiry",
        ),
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", me.organization_id)
        .eq("role", "driver"),
    ]);

    const nameMap = new Map(
      (driverNamesRes.data ?? []).map((u) => [
        u.id,
        u.full_name ?? u.email ?? "—",
      ]),
    );

    for (const p of profilesRes.data ?? []) {
      for (const f of EXPIRY_FIELDS) {
        const date = p[f.col];
        const status = expiryStatus(date);
        if (status === "expired" || status === "expiring") {
          expiringDocs.push({
            driverName: nameMap.get(p.user_id) ?? "—",
            docKey: f.key,
            date: date!,
            days: daysUntil(date)!,
            status,
          });
        }
      }
    }
    expiringDocs.sort((a, b) => a.days - b.days);

    if (tripsTotal > 0) {
      const [
        locRes,
        usersRes,
        driverProfilesRes,
        tripsRes,
        stopsRes,
        recentTripsRes,
        recentDocsRes,
      ] = await Promise.all([
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
        supabase
          .from("trips")
          .select("id, origin, destination, status, driver_id")
          .eq("organization_id", me.organization_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("documents")
          .select("id, type, status, trip_id, created_at")
          .eq("organization_id", me.organization_id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const plateMap = new Map(
        (driverProfilesRes.data ?? []).map((p) => [p.user_id, p.plate]),
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

      const driverNameMap = new Map(
        (usersRes.data ?? []).map((u) => [u.id, u.full_name ?? "—"]),
      );
      recentTrips = (recentTripsRes.data ?? []).map((tr) => ({
        id: tr.id,
        origin: tr.origin ?? "—",
        destination: tr.destination ?? "—",
        status: tr.status as TripStatus,
        driverName: tr.driver_id
          ? (driverNameMap.get(tr.driver_id) ?? null)
          : null,
      }));

      // Son belgeler için sefer etiketleri
      const tripLabelMap = new Map(
        (tripsRes.data ?? []).map((tr) => [
          tr.id,
          `${tr.origin} → ${tr.destination}`,
        ]),
      );
      recentDocs = (recentDocsRes.data ?? []).map((doc) => ({
        id: doc.id,
        type: doc.type as DocType,
        status: doc.status as DocStatus,
        tripLabel: tripLabelMap.get(doc.trip_id) ?? "—",
        createdAt: doc.created_at,
      }));
    }
  }

  if (tripsTotal === 0) {
    return (
      <SetupEmptyState
        hasDrivers={driverCount > 0}
        hasCustomers={customersTotal > 0}
      />
    );
  }

  const activeTripsCount = PIPELINE_STATUSES.filter(
    (s) => s !== "completed",
  ).reduce((sum, s) => sum + pipeline[s], 0);

  const metricCards = [
    {
      key: "activeTrips",
      label: t("activeTrips"),
      value: activeTripsCount,
      href: "/trips",
      alert: false,
    },
    {
      key: "pendingDocuments",
      label: t("pendingDocuments"),
      value: pendingDocCount,
      href: "/documents?status=pending",
      alert: pendingDocCount > 0,
    },
    {
      key: "expiringDocs",
      label: t("expiringDocs"),
      value: expiringDocs.length,
      href: "/drivers",
      alert: expiringDocs.length > 0,
    },
    {
      key: "todayDeliveries",
      label: t("todayDeliveries"),
      value: todayDeliveryCount,
      href: "/trips",
      alert: false,
    },
  ] as const;

  return (
    <>
      {/* Başlık + hızlı eylemler */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("quickActions")}
          </span>
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Plus className="size-3" />
            {t("quickNewTrip")}
          </Link>
          <Link
            href="/drivers/invite"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Plus className="size-3" />
            {t("quickNewDriver")}
          </Link>
          <Link
            href="/documents?status=pending"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <FileText className="size-3" />
            {t("quickDocInbox")}
          </Link>
        </div>
      </div>

      {/* Metrik kartları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricCards.map(({ key, label, value, href, alert }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "group flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm transition-all outline-none hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              alert && "border-warning/40 bg-warning/5",
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                "text-3xl font-bold tabular-nums leading-none",
                alert ? "text-warning" : "text-foreground",
              )}
            >
              {value}
            </span>
          </Link>
        ))}
      </div>

      {/* Sefer hattı */}
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

      {/* Son aktiviteler */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Son seferler */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("recentTrips")}
            </h2>
            <Link
              href="/trips"
              className="text-xs text-primary hover:underline underline-offset-2"
            >
              Tümü →
            </Link>
          </div>
          <div className="rounded-lg border bg-card">
            {recentTrips.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t("noRecentTrips")}
              </p>
            ) : (
              <ul className="divide-y">
                {recentTrips.map((tr) => (
                  <li key={tr.id}>
                    <Link
                      href={`/trips/${tr.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {tr.origin} → {tr.destination}
                        </p>
                        {tr.driverName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {tr.driverName}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-2 py-0.5 text-xs font-medium status-chip",
                          STATUS_TONE[tr.status],
                        )}
                      >
                        {ts(tr.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Son belgeler */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("recentDocuments")}
            </h2>
            <Link
              href="/documents"
              className="text-xs text-primary hover:underline underline-offset-2"
            >
              Tümü →
            </Link>
          </div>
          <div className="rounded-lg border bg-card">
            {recentDocs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t("noRecentDocs")}
              </p>
            ) : (
              <ul className="divide-y">
                {recentDocs.map((doc) => {
                  const statusClass =
                    doc.status === "approved"
                      ? "text-green-700 dark:text-green-300"
                      : doc.status === "rejected"
                        ? "text-destructive"
                        : "text-amber-600 dark:text-amber-400";
                  return (
                    <li key={doc.id}>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {tdt(doc.type)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {doc.tripLabel}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-medium",
                            statusClass,
                          )}
                        >
                          {tds(doc.status)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Belge süresi uyarıları */}
      {expiringDocs.length > 0 && <ExpiringDocsSection items={expiringDocs} />}

      <DashboardMap
        locations={locations}
        drivers={mapDrivers}
        trips={activeTrips}
        stops={tripStops}
      />
    </>
  );
}

async function ExpiringDocsSection({ items }: { items: ExpiringDoc[] }) {
  const t = await getTranslations("Dashboard");
  const td = await getTranslations("DocLabels");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("expiringDocsTitle")}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((it, i) => {
          const expired = it.status === "expired";
          return (
            <li
              key={`${it.driverName}-${it.docKey}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    expired ? "bg-destructive" : "bg-warning",
                  )}
                />
                <span className="font-medium">{it.driverName}</span>
                <span className="text-muted-foreground">{td(it.docKey)}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium tabular-nums",
                  expired ? "text-destructive" : "text-warning",
                )}
              >
                {expired
                  ? t("expiredAgo", { days: Math.abs(it.days) })
                  : t("expiringIn", { days: it.days })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={cn(SK, "h-8 w-32")} />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(SK, "h-7 w-28")} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(SK, "h-20 border bg-muted/40")} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className={cn(SK, "h-4 w-24")} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={cn(SK, "h-[4.5rem] border bg-muted/40")} />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cn(SK, "h-48 border bg-muted/40")} />
        <div className={cn(SK, "h-48 border bg-muted/40")} />
      </div>
      <div className={cn(SK, "h-[28rem] w-full border bg-muted/40")} />
    </>
  );
}
