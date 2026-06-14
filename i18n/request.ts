import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // İstek başına sabit referans zaman: relativeTime/useNow'un sunucu↔istemci
    // tutarlılığını sağlar ve ENVIRONMENT_FALLBACK uyarısını kaynağında keser.
    now: new Date(),
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
