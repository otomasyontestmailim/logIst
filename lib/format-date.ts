import type { useFormatter } from "next-intl";

type Formatter = ReturnType<typeof useFormatter>;

/**
 * Locale-bilinçli tarih biçimleme.
 * - Date-only string'ler ("YYYY-MM-DD") UTC olarak biçimlenir; aksi halde
 *   `new Date("2026-01-01")` UTC gece yarısı olduğundan batı dilimlerinde
 *   bir gün geriye kayar.
 * - null/undefined → "—"
 */
export function formatDate(
  format: Formatter,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return format.dateTime(date, {
    dateStyle: "medium",
    ...(isDateOnly ? { timeZone: "UTC" } : {}),
  });
}
