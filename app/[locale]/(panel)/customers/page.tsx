import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/export-button";
import { CustomersClient } from "./customers-client";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export default async function CustomersPage() {
  const t = await getTranslations("Customers");
  const tc = await getTranslations("Common");
  const me = await getCurrentUser();

  let customers: CustomerRow[] = [];
  let tripCounts: Record<string, number> = {};
  if (me?.organization_id) {
    const supabase = await createClient();
    const [customersRes, tripsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("*")
        .eq("organization_id", me.organization_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("trips")
        .select("customer_id")
        .eq("organization_id", me.organization_id),
    ]);
    customers = customersRes.data ?? [];
    const counts: Record<string, number> = {};
    for (const tr of tripsRes.data ?? []) {
      if (tr.customer_id)
        counts[tr.customer_id] = (counts[tr.customer_id] ?? 0) + 1;
    }
    tripCounts = counts;
  }

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ExportButton href="/api/export/customers" label={tc("exportCsv")} />
      </div>
      <div className="mt-4">
        <CustomersClient customers={customers} tripCounts={tripCounts} />
      </div>
    </main>
  );
}
