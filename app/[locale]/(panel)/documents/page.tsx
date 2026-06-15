import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedDocumentUrls } from "@/lib/supabase/storage";
import { DocumentsClient, type DocumentItem } from "./documents-client";
import type { Database } from "@/lib/supabase/database.types";

type DocumentRow = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  | "id"
  | "trip_id"
  | "uploaded_by"
  | "type"
  | "file_url"
  | "status"
  | "ocr_data"
  | "created_at"
>;
type TripInfo = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  "id" | "origin" | "destination" | "driver_id"
>;
type UserInfo = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

export default async function DocumentsPage() {
  const t = await getTranslations("Documents");
  const me = await getCurrentUser();

  let items: DocumentItem[] = [];

  if (me?.organization_id) {
    const supabase = await createClient();

    const [docsRes, tripsRes, usersRes] = await Promise.all([
      supabase
        .from("documents")
        .select(
          "id, trip_id, uploaded_by, type, file_url, status, ocr_data, created_at",
        )
        .eq("organization_id", me.organization_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("trips")
        .select("id, origin, destination, driver_id")
        .eq("organization_id", me.organization_id),
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", me.organization_id),
    ]);

    const docs = (docsRes.data as DocumentRow[]) ?? [];
    const tripMap = new Map(
      ((tripsRes.data as TripInfo[]) ?? []).map((trip) => [trip.id, trip]),
    );
    const userMap = new Map(
      ((usersRes.data as UserInfo[]) ?? []).map((u) => [
        u.id,
        u.full_name ?? u.email ?? "—",
      ]),
    );

    // Tek seferde toplu imzalı URL (1 saat geçerli)
    const signedUrls = await getSignedDocumentUrls(
      docs.map((d) => d.file_url),
      3600,
    );

    items = docs.map((doc) => {
      const trip = tripMap.get(doc.trip_id);
      return {
        id: doc.id,
        type: doc.type,
        status: doc.status,
        createdAt: doc.created_at,
        tripLabel: trip ? `${trip.origin} → ${trip.destination}` : "—",
        driverName: doc.uploaded_by
          ? (userMap.get(doc.uploaded_by) ?? "—")
          : "—",
        signedUrl: signedUrls.get(doc.file_url) ?? null,
        ocrData:
          doc.ocr_data && typeof doc.ocr_data === "object"
            ? (doc.ocr_data as Record<string, string>)
            : null,
      };
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-4">
        <DocumentsClient items={items} />
      </div>
    </main>
  );
}
