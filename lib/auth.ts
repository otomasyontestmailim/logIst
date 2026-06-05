import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  authEmail: string | null;
  organization_id: string | null;
  role: "admin" | "dispatcher" | "driver" | null;
  full_name: string | null;
};

/**
 * Oturum açmış kullanıcıyı ve public.users profil satırını döndürür.
 * Oturum yoksa null döner.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    authEmail: user.email ?? null,
    organization_id: profile?.organization_id ?? null,
    role: profile?.role ?? null,
    full_name: profile?.full_name ?? null,
  };
}
