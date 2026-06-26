"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  enqueue,
  getPending,
  updateEntry,
  cleanDone,
  type QueueEntry,
} from "@/lib/upload-queue";

export type { QueueEntry };

interface UploadParams {
  blob: Blob;
  tripId: string;
  organizationId: string;
  docType: string;
}

/**
 * useUploadQueue — offline-aware belge yükleme kancası.
 *
 * Kullanım:
 *   const { upload, pendingCount, flushQueue } = useUploadQueue();
 *   await upload({ blob, tripId, organizationId, docType });
 *
 * Çevrimiçiyse direkt yükler. Çevrimdışıysa IndexedDB kuyruğuna ekler.
 * Sayfa yüklendiğinde ve online olunca kuyruk otomatik flush edilir.
 */
export function useUploadQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const flushingRef = useRef(false);

  // Bekleyen sayısını güncelle
  const refreshCount = useCallback(async () => {
    try {
      const pending = await getPending();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB erişilemiyorsa sessiz
    }
  }, []);

  // Tek bir girişi yükle
  async function flushEntry(entry: QueueEntry): Promise<boolean> {
    await updateEntry(entry.id, { status: "uploading" });

    const supabase = createClient();
    const filePath = `${entry.organizationId}/${entry.tripId}/${entry.id}.jpg`;

    const { error: storageErr } = await supabase.storage
      .from("documents")
      .upload(filePath, entry.blob, { contentType: "image/jpeg" });

    if (storageErr) {
      await updateEntry(entry.id, {
        status: "error",
        errorMsg: storageErr.message,
      });
      return false;
    }

    const res = await fetch("/api/documents/queue-flush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: entry.tripId,
        docType: entry.docType,
        filePath,
        organizationId: entry.organizationId,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      await updateEntry(entry.id, {
        status: "error",
        errorMsg: body.error ?? "api_error",
      });
      return false;
    }

    await updateEntry(entry.id, { status: "done" });
    return true;
  }

  /** Tüm bekleyen girişleri flush et */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    flushingRef.current = true;
    setFlushing(true);

    try {
      await cleanDone();
      const pending = await getPending();
      for (const entry of pending) {
        await flushEntry(entry);
      }
    } finally {
      flushingRef.current = false;
      setFlushing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  // Sayfa yüklendiğinde + online olunca flush
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount();
    void flushQueue();

    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [flushQueue, refreshCount]);

  /**
   * Belge yükle: çevrimiçiyse anında, değilse kuyruğa ekle.
   * @returns "uploaded" | "queued"
   */
  async function upload(params: UploadParams): Promise<"uploaded" | "queued"> {
    if (navigator.onLine) {
      // Direkt yükle
      const supabase = createClient();
      const filePath = `${params.organizationId}/${params.tripId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(filePath, params.blob, { contentType: "image/jpeg" });
      if (error) throw error;

      const res = await fetch("/api/documents/queue-flush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: params.tripId,
          docType: params.docType,
          filePath,
          organizationId: params.organizationId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "upload_failed");
      }
      return "uploaded";
    } else {
      // Çevrimdışı — kuyruğa ekle
      await enqueue(params);
      await refreshCount();
      return "queued";
    }
  }

  return { upload, pendingCount, flushing, flushQueue };
}
