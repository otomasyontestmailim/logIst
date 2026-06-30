import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <VehiclesClient vehicles={vehicles ?? []} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </main>
  );
}
