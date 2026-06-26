/**
 * Offline Upload Queue — IndexedDB tabanlı
 *
 * Şoför çevrimdışıyken belge yüklerse bu kuyruk devreye girer:
 *  1. Blob + metadata IndexedDB'ye kaydedilir ("pending" durum).
 *  2. Tarayıcı online olduğunda flush() çağrılır.
 *  3. flush() her "pending" girişi Supabase Storage'a yükler, ardından
 *     /api/documents/queue-flush route'u üzerinden DB'ye kaydeder.
 *  4. Başarılıysa giriş "done" → 24 saat sonra temizlenir.
 *  5. Başarısızsa giriş "error" → kullanıcıya bildirim.
 */

export interface QueueEntry {
  id: string; // uuid
  tripId: string;
  organizationId: string;
  docType: string;
  blob: Blob;
  status: "pending" | "uploading" | "done" | "error";
  errorMsg?: string;
  createdAt: number; // Date.now()
}

const DB_NAME = "lojistik-upload-queue";
const STORE = "entries";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(
  entry: Omit<QueueEntry, "id" | "status" | "createdAt">,
): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: QueueEntry = {
    ...entry,
    id,
    status: "pending",
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPending(): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as QueueEntry[]).filter((e) => e.status === "pending"),
      );
    req.onerror = () => reject(req.error);
  });
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<QueueEntry, "status" | "errorMsg">>,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const entry = req.result as QueueEntry | undefined;
      if (!entry) {
        resolve();
        return;
      }
      store.put({ ...entry, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 24 saatten eski "done" girişleri temizle */
export async function cleanDone(): Promise<void> {
  const db = await openDb();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const entries = req.result as QueueEntry[];
      for (const e of entries) {
        if (e.status === "done" && e.createdAt < cutoff) {
          store.delete(e.id);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll(): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror = () => reject(req.error);
  });
}
