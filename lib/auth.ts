import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "organization_id" | "role" | "full_name"
>;

export type CurrentUser = {
  id: string;
  authEmail: string | null;
  organization_id: string | null;
  role: "admin" | "dispatcher" | "driver" | null;
  full_name: string | null;
  is_superadmin: boolean;
};

/**
 * Oturum açmış kullanıcıyı ve public.users profil satırını döndürür.
 * Oturum yoksa null döner. is_superadmin: platform_admins tablosundan
 * security-definer fonksiyon ile kontrol edilir.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, superadminResult] = await Promise.all([
    supabase
      .from("users")
      .select("organization_id, role, full_name")
      .eq("id", user.id)
      .single<ProfileRow>(),
    supabase.rpc("is_superadmin"),
  ]);

  return {
    id: user.id,
    authEmail: user.email ?? null,
    organization_id: profileResult.data?.organization_id ?? null,
    role: profileResult.data?.role ?? null,
    full_name: profileResult.data?.full_name ?? null,
    is_superadmin: superadminResult.data === true,
  };
}
