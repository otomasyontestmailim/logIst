import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedDocumentUrls } from "@/lib/supabase/storage";
import { Pagination } from "@/components/pagination";
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

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
const VALID_TYPES = [
  "cmr",
  "invoice",
  "waybill",
  "weighbridge",
  "adr",
  "customs",
  "delivery_note",
] as const;

type DocStatus = (typeof VALID_STATUSES)[number];
type DocType = (typeof VALID_TYPES)[number];

const PAGE_SIZE = 20;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const t = await getTranslations("Documents");
  const me = await getCurrentUser();
  const params = await searchParams;

  const statusFilter = VALID_STATUSES.includes(params.status as DocStatus)
    ? (params.status as DocStatus)
    : null;
  const typeFilter = VALID_TYPES.includes(params.type as DocType)
    ? (params.type as DocType)
    : null;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let items: DocumentItem[] = [];
  let total = 0;

  if (me?.organization_id) {
    const supabase = await createClient();

    let docsQuery = supabase
      .from("documents")
      .select(
        "id, trip_id, uploaded_by, type, file_url, status, ocr_data, created_at",
        { count: "exact" },
      )
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter) docsQuery = docsQuery.eq("status", statusFilter);
    if (typeFilter) docsQuery = docsQuery.eq("type", typeFilter);

    const [docsRes, tripsRes, usersRes] = await Promise.all([
      docsQuery,
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
    total = docsRes.count ?? 0;
    const tripMap = new Map(
      ((tripsRes.data as TripInfo[]) ?? []).map((trip) => [trip.id, trip]),
    );
    const userMap = new Map(
      ((usersRes.data as UserInfo[]) ?? []).map((u) => [
        u.id,
        u.full_name ?? u.email ?? "—",
      ]),
    );

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

  const paginationParams: Record<string, string> = {};
  if (statusFilter) paginationParams.status = statusFilter;
  if (typeFilter) paginationParams.type = typeFilter;

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-4">
        <DocumentsClient
          items={items}
          initialStatus={statusFilter ?? "all"}
          initialType={typeFilter ?? "all"}
        />
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          baseParams={paginationParams}
        />
      </div>
    </main>
  );
}
