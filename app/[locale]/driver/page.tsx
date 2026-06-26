import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Truck } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { OfflineQueueBadge } from "@/components/offline-queue-badge";
import { DriverClient } from "./driver-client";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type DocumentRow = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  "id" | "trip_id" | "type" | "status" | "created_at"
>;
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type CustomerName = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  "id" | "name"
>;

export default async function DriverPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("Driver");
  const tApp = await getTranslations("App");

  let trips: TripRow[] = [];
  let documents: DocumentRow[] = [];
  let customers: CustomerName[] = [];
  let stops: StopRow[] = [];

  if (user?.organization_id) {
    const supabase = await createClient();

    // RLS şoföre yalnızca kendi seferlerini gösterir; yine de açık filtre
    const { data: tripData } = await supabase
      .from("trips")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });
    trips = tripData ?? [];

    if (trips.length > 0) {
      const tripIds = trips.map((trip) => trip.id);
      const customerIds = [
        ...new Set(trips.map((trip) => trip.customer_id).filter(Boolean)),
      ] as string[];

      const [docsRes, customersRes, stopsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, trip_id, type, status, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false }),
        customerIds.length > 0
          ? supabase.from("customers").select("id, name").in("id", customerIds)
          : Promise.resolve({ data: [] as CustomerName[] }),
        supabase
          .from("trip_stops")
          .select("*")
          .in("trip_id", tripIds)
          .order("seq"),
      ]);

      documents = (docsRes.data as DocumentRow[]) ?? [];
      customers = (customersRes.data as CustomerName[]) ?? [];
      stops = (stopsRes.data as StopRow[]) ?? [];
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Sabit marka başlığı — mobil PWA'da uygulama çubuğu hissi */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-4" />
          </div>
          <span className="text-sm font-semibold">{tApp("name")}</span>
        </div>
        <div className="flex items-center gap-2">
          <OfflineQueueBadge />
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <DriverClient
          trips={trips}
          documents={documents}
          customers={customers}
          stops={stops}
          organizationId={user?.organization_id ?? ""}
        />
      </main>
    </div>
  );
}
