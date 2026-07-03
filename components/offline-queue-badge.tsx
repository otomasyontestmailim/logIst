"use client";

import { useTranslations } from "next-intl";
import { CloudUpload } from "lucide-react";
import { useQueueCount } from "@/lib/use-queue-count";

/**
 * Çevrimdışı yükleme kuyruğu rozeti — bekleyen yükleme varsa gösterir.
 * Yalnızca sayıyı okur; flush tetiklemez (DocumentSection yapar).
 */
export function OfflineQueueBadge() {
  const t = useTranslations("OfflineQueue");
  const count = useQueueCount();

  if (count === 0) return null;

  return (
    <div
      title={t("pendingTitle", { count })}
      className="status-chip status-wait flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
    >
      <CloudUpload className="size-3" />
      {t("pending", { count })}
    </div>
  );
}
