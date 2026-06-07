import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { DriversClient, type DriverRow } from "./drivers-client";

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;
type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];

export default async function DriversPage() {
  const t = await getTranslations("Drivers");
  const supabase = await createClient();

  // RLS, listeyi otomatik olarak giriş yapan admin'in firmasıyla sınırlar.
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "driver")
    .order("created_at", { ascending: false })
    .returns<UserRow[]>();

  const ids = (users ?? []).map((u) => u.id);
  let profiles: ProfileRow[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("driver_profiles")
      .select("*")
      .in("user_id", ids)
      .returns<ProfileRow[]>();
    profiles = data ?? [];
  }

  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));
  const drivers: DriverRow[] = (users ?? []).map((u) => ({
    ...u,
    profile: profileByUser.get(u.id) ?? null,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <DriversClient drivers={drivers} />
    </main>
  );
}
