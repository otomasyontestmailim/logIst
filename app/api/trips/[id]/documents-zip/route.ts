import JSZip from "jszip";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";

/** Bir seferin tüm belgelerini tek ZIP olarak indirir (admin/dispatcher). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me?.organization_id) {
    return new Response("unauthorized", { status: 401 });
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return new Response("forbidden", { status: 403 });
  }

  const { id: tripId } = await params;
  const admin = createAdminClient();

  // Sefer çağıranın firmasında mı?
  const { data: trip } = await admin
    .from("trips")
    .select("organization_id")
    .eq("id", tripId)
    .single();
  if (!trip || trip.organization_id !== me.organization_id) {
    return new Response("not_found", { status: 404 });
  }

  const { data: docs } = await admin
    .from("documents")
    .select("id, type, file_url, created_at")
    .eq("trip_id", tripId)
    .order("created_at");

  if (!docs || docs.length === 0) {
    return new Response("empty", { status: 404 });
  }

  const zip = new JSZip();
  let added = 0;
  for (const [i, doc] of docs.entries()) {
    const { data: file } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .download(doc.file_url);
    if (!file) continue;
    const ext = doc.file_url.split(".").pop() ?? "jpg";
    const seq = String(i + 1).padStart(2, "0");
    zip.file(`${seq}-${doc.type}.${ext}`, await file.arrayBuffer());
    added++;
  }

  if (added === 0) {
    return new Response("empty", { status: 404 });
  }

  const blob = await zip.generateAsync({ type: "arraybuffer" });
  return new Response(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="trip-${tripId.slice(0, 8)}-documents.zip"`,
    },
  });
}
