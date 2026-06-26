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
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    >
      <CloudUpload className="size-3" />
      {t("pending", { count })}
    </div>
  );
}
