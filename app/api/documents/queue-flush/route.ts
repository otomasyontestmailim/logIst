import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { DocumentType } from "@/lib/supabase/database.types";

/**
 * POST /api/documents/queue-flush
 * Body: { tripId, docType, filePath, organizationId }
 *
 * Belge DB kaydını oluşturur. Storage'a yükleme istemci tarafında
 * Supabase anon anahtarıyla zaten yapılmıştır.
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (me.role !== "driver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { tripId?: string; docType?: string; filePath?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { tripId, docType, filePath } = body;
  if (!tripId || !docType || !filePath) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = await createClient();

  // Seferin şoföre ait olduğunu doğrula
  const { data: trip } = await supabase
    .from("trips")
    .select("id, organization_id, driver_id")
    .eq("id", tripId)
    .eq("organization_id", me.organization_id)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "trip_not_found" }, { status: 404 });
  }
  if (trip.driver_id !== me.id) {
    return NextResponse.json({ error: "not_your_trip" }, { status: 403 });
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      organization_id: me.organization_id,
      trip_id: tripId,
      uploaded_by: me.id,
      type: docType as DocumentType,
      file_url: filePath,
      page_count: 1,
      status: "pending",
      captured_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  await logAudit(me, {
    action: "document.create_queued",
    entity: "documents",
    entityId: doc.id,
  });

  return NextResponse.json({ ok: true, documentId: doc.id });
}
