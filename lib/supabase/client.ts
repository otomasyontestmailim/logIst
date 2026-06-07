import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Tarayıcı (Client Component) tarafı Supabase istemcisi.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
