import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

// Next.js 16: "middleware" → "proxy" dosya konvansiyonu.
export default async function proxy(request: NextRequest) {
  // 1) Locale yönlendirmesi (tr/en) — response üretir
  const response = handleI18nRouting(request);
  // 2) Aynı response üzerine Supabase oturum çerezlerini yenile
  return await updateSession(request, response);
}

export const config = {
  // API, auth callback, statik dosyalar ve Next dahili yolları hariç tüm yollar
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
