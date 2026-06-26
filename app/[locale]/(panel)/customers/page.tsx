import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/export-button";
import { Pagination } from "@/components/pagination";
import { CustomersClient } from "./customers-client";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("Customers");
  const tc = await getTranslations("Common");
  const me = await getCurrentUser();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let customers: CustomerRow[] = [];
  let tripCounts: Record<string, number> = {};
  let total = 0;
  if (me?.organization_id) {
    const supabase = await createClient();
    const [customersRes, tripsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("organization_id", me.organization_id)
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("trips")
        .select("customer_id")
        .eq("organization_id", me.organization_id),
    ]);
    customers = customersRes.data ?? [];
    total = customersRes.count ?? 0;
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
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
      </div>
    </main>
  );
}
