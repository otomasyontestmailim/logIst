import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı (Client Component) tarafı Supabase istemcisi.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
