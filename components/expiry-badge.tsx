"use client";

import { useFormatter, useTranslations } from "next-intl";

import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { expiryStatus } from "@/lib/expiry";
import { formatDate } from "@/lib/format-date";

/**
 * Belge geçerlilik rozeti — drivers/vehicles'taki iki farklı lokal sürümün
 * tek karşılığı. `label` verilirse "SRC: 12.05.2026" biçiminde yazar ve
 * tarih yoksa hiç render etmez; verilmezse yalnız tarihi yazar ve tarih
 * yoksa "—" gösterir (vehicles davranışı). `showOk` geçerli tarihleri
 * yeşil tonda vurgular.
 */
export function ExpiryBadge({
  label,
  date,
  showOk = false,
}: {
  label?: string;
  date?: string | null;
  showOk?: boolean;
}) {
  const t = useTranslations("Expiry");
  const format = useFormatter();

  if (!date) {
    return label ? null : <span className="text-muted-foreground">—</span>;
  }

  const status = expiryStatus(date);
  const tone: StatusTone =
    status === "expired"
      ? "danger"
      : status === "expiring"
        ? "wait"
        : showOk
          ? "done"
          : "idle";
  const title =
    status === "expired"
      ? t("expired")
      : status === "expiring"
        ? t("expiringSoon")
        : t("ok");

  const text = formatDate(format, date);
  return (
    <StatusChip tone={tone} title={title} className="tabular-nums">
      {label ? `${label}: ${text}` : text}
    </StatusChip>
  );
}
