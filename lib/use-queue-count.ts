"use client";

/**
 * Sadece bekleyen kuyruk sayısını okur — flush tetiklemez.
 * OfflineQueueBadge tarafından kullanılır.
 */
import { useEffect, useState } from "react";
import { getPending } from "@/lib/upload-queue";

export function useQueueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const pending = await getPending();
        if (!cancelled) setCount(pending.length);
      } catch {
        // IndexedDB erişilemiyorsa sessiz
      }
    }

    void refresh();

    // online/offline değişince sayıyı güncelle
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);

    // Her 5 saniyede yenile (flush progress izlemek için)
    const id = setInterval(refresh, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      clearInterval(id);
    };
  }, []);

  return count;
}
