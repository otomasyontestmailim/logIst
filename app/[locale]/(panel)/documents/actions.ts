"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { runOcrForDocument } from "@/lib/ocr";

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
