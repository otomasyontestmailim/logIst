import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedDocumentUrls } from "@/lib/supabase/storage";
import { Pagination } from "@/components/pagination";
import {
  DocumentsClient,
  type DocumentItem,
  type GroupedTrip,
} from "./documents-client";
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
  "id" | "origin" | "destination" | "driver_id" | "load_date"
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

  let groups: GroupedTrip[] = [];
  let total = 0;

  if (me?.organization_id) {
    const supabase = await createClient();

    let docsQuery = supabase
      .from("documents")
      .select(
        "id, trip_id, uploaded_by, type, file_url, status, ocr_data, created_at",
      )
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false });

    if (statusFilter) docsQuery = docsQuery.eq("status", statusFilter);
    if (typeFilter) docsQuery = docsQuery.eq("type", typeFilter);

    const [docsRes, tripsRes, usersRes] = await Promise.all([
      docsQuery,
      supabase
        .from("trips")
        .select("id, origin, destination, driver_id, load_date")
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

    // documents zaten created_at DESC sıralı; trip_id'ye göre gruplarken bu
    // sıra korunur, yani en yeni belgeye sahip sefer grubu en üstte kalır.
    const docsByTrip = new Map<string, DocumentRow[]>();
    for (const doc of docs) {
      const arr = docsByTrip.get(doc.trip_id);
      if (arr) arr.push(doc);
      else docsByTrip.set(doc.trip_id, [doc]);
    }

    const allGroups = Array.from(docsByTrip.entries()).map(
      ([tripId, docsForTrip]) => {
        const trip = tripMap.get(tripId);
        const driverName = trip?.driver_id
          ? (userMap.get(trip.driver_id) ?? "—")
          : "—";
        return {
          tripId,
          origin: trip?.origin ?? "—",
          destination: trip?.destination ?? "—",
          driverName,
          loadDate: trip?.load_date ?? null,
          docs: docsForTrip,
        };
      },
    );

    total = allGroups.length;
    const pageGroups = allGroups.slice(from, to + 1);
    const pageDocs = pageGroups.flatMap((g) => g.docs);

    const signedUrls = await getSignedDocumentUrls(
      pageDocs.map((d) => d.file_url),
      3600,
    );

    groups = pageGroups.map((g) => ({
      tripId: g.tripId,
      origin: g.origin,
      destination: g.destination,
      driverName: g.driverName,
      loadDate: g.loadDate,
      documents: g.docs.map(
        (doc): DocumentItem => ({
          id: doc.id,
          type: doc.type,
          status: doc.status,
          createdAt: doc.created_at,
          signedUrl: signedUrls.get(doc.file_url) ?? null,
          ocrData:
            doc.ocr_data && typeof doc.ocr_data === "object"
              ? (doc.ocr_data as Record<string, string>)
              : null,
        }),
      ),
    }));
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
          groups={groups}
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
