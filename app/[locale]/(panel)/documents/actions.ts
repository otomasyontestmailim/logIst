"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { runOcrForDocument } from "@/lib/ocr";
import { sendEmail, documentStatusEmail } from "@/lib/email";

export type DocumentInboxFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/** Belgeyi onaylar/reddeder. Yalnızca admin/dispatcher, kendi firmasında. */
export async function setDocumentStatus(
  _prev: DocumentInboxFormState,
  formData: FormData,
): Promise<DocumentInboxFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const documentId = nn(formData.get("document_id"));
  const status = nn(formData.get("status"));
  if (!documentId) return { ok: false, error: "id_required" };
  if (status !== "approved" && status !== "rejected") {
    return { ok: false, error: "status_required" };
  }

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  // Çapraz-tenant güncellemeyi engelle
  const { data: target } = await admin
    .from("documents")
    .select("organization_id")
    .eq("id", documentId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin
    .from("documents")
    .update({ status })
    .eq("id", documentId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: `document.${status}`,
    entity: "documents",
    entityId: documentId,
  });

  // Şoföre e-posta bildirimi (arka planda, hata olursa işlemi bloklamaz)
  void (async () => {
    const { data: doc } = await admin
      .from("documents")
      .select("type, uploaded_by, trip_id")
      .eq("id", documentId)
      .single();
    if (!doc?.uploaded_by) return;

    const [userRes, tripRes] = await Promise.all([
      admin
        .from("users")
        .select("email, full_name")
        .eq("id", doc.uploaded_by)
        .single(),
      doc.trip_id
        ? admin
            .from("trips")
            .select("origin, destination")
            .eq("id", doc.trip_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    if (!userRes.data?.email) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const payload = documentStatusEmail({
      driverName: userRes.data.full_name ?? userRes.data.email,
      docType: doc.type,
      status: status as "approved" | "rejected",
      tripLabel: tripRes.data
        ? `${tripRes.data.origin} → ${tripRes.data.destination}`
        : "—",
      appUrl,
    });
    await sendEmail({ to: userRes.data.email, ...payload });
  })();

  revalidatePath("/[locale]/documents", "page");
  revalidatePath("/[locale]/driver", "page");
  return { ok: true, message: status };
}

/** Belge için OCR'yi (yeniden) çalıştırır. Yalnızca admin/dispatcher, kendi firması. */
export async function extractDocument(
  _prev: DocumentInboxFormState,
  formData: FormData,
): Promise<DocumentInboxFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ocr_not_configured" };
  }

  const documentId = nn(formData.get("document_id"));
  if (!documentId) return { ok: false, error: "id_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };
  const { data: target } = await admin
    .from("documents")
    .select("organization_id")
    .eq("id", documentId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const ok = await runOcrForDocument(documentId);
  if (!ok) return { ok: false, error: "ocr_failed" };

  await logAudit(me, {
    action: "document.ocr",
    entity: "documents",
    entityId: documentId,
  });
  revalidatePath("/[locale]/documents", "page");
  return { ok: true, message: "ocr_done" };
}

/**
 * OCR alanlarını manuel olarak kaydeder.
 * Yalnızca admin/dispatcher, kendi firmasında. Tüm alanlar string.
 */
export async function saveOcrData(
  _prev: DocumentInboxFormState,
  formData: FormData,
): Promise<DocumentInboxFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const documentId = nn(formData.get("document_id"));
  if (!documentId) return { ok: false, error: "id_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("documents")
    .select("organization_id")
    .eq("id", documentId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  // FormData'dan ocr_ önekli alanları topla
  const ocrData: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("ocr_field_")) {
      const field = key.slice("ocr_field_".length);
      ocrData[field] = value.toString().trim();
    }
  }

  const { error } = await admin
    .from("documents")
    .update({ ocr_data: ocrData, ocr_status: "done" })
    .eq("id", documentId);
  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "document.ocr_edit",
    entity: "documents",
    entityId: documentId,
  });
  revalidatePath(`/[locale]/documents/${documentId}`, "page");
  return { ok: true, message: "ocr_saved" };
}
