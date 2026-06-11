"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import type { DocumentType } from "@/lib/supabase/database.types";

export type DocumentFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const DOCUMENT_TYPES: DocumentType[] = [
  "cmr",
  "invoice",
  "waybill",
  "weighbridge",
  "adr",
  "customs",
  "delivery_note",
];

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/**
 * Şoför kendisine atanan seferi reddeder: durum taşıma talebine döner,
 * şoför ataması kaldırılır. Yalnızca "Sürücü Onayında" aşamasında geçerli.
 */
export async function rejectTrip(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id || me.role !== "driver") {
    return { ok: false, error: "unauthorized" };
  }

  const tripId = nn(formData.get("trip_id"));
  if (!tripId) return { ok: false, error: "id_required" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("trips")
    .select("organization_id, driver_id, status")
    .eq("id", tripId)
    .single();
  if (
    !target ||
    target.organization_id !== me.organization_id ||
    target.driver_id !== me.id
  ) {
    return { ok: false, error: "not_found" };
  }
  if (target.status !== "driver_approval") {
    return { ok: false, error: "invalid_transition" };
  }

  const { error } = await admin
    .from("trips")
    .update({ status: "requested", driver_id: null })
    .eq("id", tripId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/driver", "page");
  revalidatePath("/[locale]/trips", "page");
  return { ok: true, message: "rejected" };
}

/**
 * Storage'a yüklenmiş dosya için documents satırı oluşturur.
 * Dosya tarayıcıdan DOĞRUDAN Storage'a yüklenir (Server Action body limiti
 * nedeniyle); bu action yalnızca DB kaydını ekler. RLS-scoped istemci
 * kullanılır: documents_insert politikası org + sefer sahipliğini doğrular,
 * şoför başka bir sefere kayıt ekleyemez.
 *
 * file_url alanına storage path yazılır ({org_id}/{trip_id}/{uuid}.jpg);
 * görüntüleme imzalı URL ile yapılır.
 */
export async function createDocument(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }

  const tripId = nn(formData.get("trip_id"));
  const type = nn(formData.get("type"));
  const filePath = nn(formData.get("file_path"));

  if (!tripId) return { ok: false, error: "id_required" };
  if (!type || !DOCUMENT_TYPES.includes(type as DocumentType)) {
    return { ok: false, error: "type_required" };
  }
  if (!filePath || !filePath.startsWith(`${me.organization_id}/${tripId}/`)) {
    return { ok: false, error: "file_required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    organization_id: me.organization_id,
    trip_id: tripId,
    uploaded_by: me.id,
    type: type as DocumentType,
    file_url: filePath,
    captured_at: new Date().toISOString(),
  });

  if (error) {
    // DB kaydı başarısızsa yüklenen dosyayı yetim bırakma (best-effort)
    const admin = createAdminClient();
    await admin.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/[locale]/driver", "page");
  revalidatePath("/[locale]/documents", "page");
  return { ok: true, message: "created" };
}
