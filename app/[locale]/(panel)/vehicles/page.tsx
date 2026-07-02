import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { VehiclesClient, type VehicleRow } from "./vehicles-client";

const PAGE_SIZE = 25;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("Vehicles");
  const supabase = await createClient();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS, listeyi otomatik olarak giriş yapan kullanıcının firmasıyla sınırlar.
  const { data: vehicles, count } = await supabase
    .from("vehicles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<VehicleRow[]>();

  const total = count ?? 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <VehiclesClient vehicles={vehicles ?? []} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </main>
  );
}
