import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Tarayıcı (Client Component) tarafı Supabase istemcisi.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Build anında gömülmesi gereken bu değerler eksikse (ör. yanlış deploy
  // yapılandırması), sessizce bozuk bir istemci üretmek yerine net hata ver.
  if (!url || !anonKey) {
    throw new Error(
      "Supabase ortam değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (build-time gömülmeli).",
    );
  }
  return createBrowserClient<Database>(url, anonKey);
}
