import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase istemcisi — RLS'i BYPASS eder.
 * SADECE sunucu tarafında (Server Action / Route Handler) kullan.
 * `server-only` importu sayesinde yanlışlıkla istemciye sızarsa build kırılır.
 *
 * Kullanım amacı: yeni şoför oluştururken auth.users kaydı açmak gibi
 * yalnızca yetkili sunucu işlemlerinde gereken yönetimsel çağrılar.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil (.env.local).");
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * createAdminClient'in fırlatmayan sürümü: servis anahtarı yoksa `null` döner.
 * Mutasyon action'larında, eksik yapılandırmada 500/çökme yerine kullanıcıya
 * temiz bir hata toast'u göstermek için kullanılır.
 */
export function adminClientOrNull() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createAdminClient();
}
