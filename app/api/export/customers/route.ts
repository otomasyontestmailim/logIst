import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/export/csv";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.organization_id) {
    return new Response("unauthorized", { status: 401 });
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", me.organization_id)
    .order("name");

  const rows = (data as CustomerRow[]) ?? [];

  const columns: CsvColumn<CustomerRow>[] = [
    { header: "Name", value: (c) => c.name },
    { header: "Type", value: (c) => c.type },
    { header: "Country", value: (c) => c.country },
    { header: "City", value: (c) => c.city },
    { header: "Address", value: (c) => c.address },
    { header: "Contact", value: (c) => c.contact },
  ];

  const csv = toCsv(rows, columns);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `customers-${date}.csv`);
}
