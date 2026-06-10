import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DriverClient } from "./driver-client";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type DocumentRow = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  "id" | "trip_id" | "type" | "status" | "created_at"
>;
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

  let trips: TripRow[] = [];
  let documents: DocumentRow[] = [];
  let customers: CustomerName[] = [];

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

      const [docsRes, customersRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, trip_id, type, status, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false }),
        customerIds.length > 0
          ? supabase.from("customers").select("id, name").in("id", customerIds)
          : Promise.resolve({ data: [] as CustomerName[] }),
      ]);

      documents = (docsRes.data as DocumentRow[]) ?? [];
      customers = (customersRes.data as CustomerName[]) ?? [];
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <SignOutButton />
      </div>
      <DriverClient
        trips={trips}
        documents={documents}
        customers={customers}
        organizationId={user?.organization_id ?? ""}
      />
    </main>
  );
}
