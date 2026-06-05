import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

/**
 * Gelen istekteki Supabase oturumunu yeniler ve güncel oturum çerezlerini
 * verilen response'a yazar. i18n middleware'inin ürettiği response ile
 * birlikte kullanılır (bkz. middleware.ts).
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() çağrısı oturum token'ını doğrular ve gerekiyorsa yeniler.
  await supabase.auth.getUser();

  return response;
}
