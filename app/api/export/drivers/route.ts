import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/export/csv";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone"
>;
type DriverExport = UserRow & { profile: ProfileRow | null };

export async function GET() {
  const me = await getCurrentUser();
  if (!me?.organization_id) {
    return new Response("unauthorized", { status: 401 });
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return new Response("forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const [usersRes, profilesRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("organization_id", me.organization_id)
      .eq("role", "driver")
      .order("full_name"),
    supabase.from("driver_profiles").select("*"),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p as ProfileRow]),
  );
  const rows: DriverExport[] = ((usersRes.data as UserRow[]) ?? []).map(
    (u) => ({
      ...u,
      profile: profileMap.get(u.id) ?? null,
    }),
  );

  const columns: CsvColumn<DriverExport>[] = [
    { header: "Name", value: (d) => d.full_name },
    { header: "Email", value: (d) => d.email },
    { header: "Phone", value: (d) => d.phone },
    { header: "Plate", value: (d) => d.profile?.plate },
    { header: "Trailer no", value: (d) => d.profile?.trailer_no },
    { header: "License no", value: (d) => d.profile?.license_no },
    { header: "SRC expiry", value: (d) => d.profile?.src_expiry },
    { header: "ADR expiry", value: (d) => d.profile?.adr_expiry },
    {
      header: "Psychotechnical expiry",
      value: (d) => d.profile?.psikoteknik_expiry,
    },
    { header: "Green card expiry", value: (d) => d.profile?.green_card_expiry },
    { header: "Vehicle model", value: (d) => d.profile?.vehicle_model },
    { header: "Vehicle year", value: (d) => d.profile?.vehicle_year },
    { header: "Capacity (ton)", value: (d) => d.profile?.capacity_ton },
  ];

  const csv = toCsv(rows, columns);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `drivers-${date}.csv`);
}
