import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomersClient } from "./customers-client";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export default async function CustomersPage() {
  const t = await getTranslations("Customers");
  const me = await getCurrentUser();

  let customers: CustomerRow[] = [];
  if (me?.organization_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false });
    customers = data ?? [];
  }

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-4">
        <CustomersClient customers={customers} />
      </div>
    </main>
  );
}
