import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSignedDocumentUrls } from "@/lib/supabase/storage";
import { TripDetailClient } from "./trip-detail-client";
import type {
  Database,
  DocumentType,
  DocumentStatus,
} from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type DocumentRow = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  "id" | "type" | "status" | "created_at" | "uploaded_by" | "file_url"
>;

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me?.organization_id) notFound();

  const supabase = await createClient();

  const [tripRes, stopsRes, docsRes] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .eq("organization_id", me.organization_id)
      .single<TripRow>(),
    supabase
      .from("trip_stops")
      .select("*")
      .eq("trip_id", id)
      .eq("organization_id", me.organization_id)
      .order("seq")
      .returns<StopRow[]>(),
    supabase
      .from("documents")
      .select("id, type, status, created_at, uploaded_by, file_url")
      .eq("trip_id", id)
      .eq("organization_id", me.organization_id)
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>(),
  ]);

  if (!tripRes.data) notFound();

  const trip = tripRes.data;
  const stops = stopsRes.data ?? [];
  const docs = docsRes.data ?? [];

  // Fetch driver, customer, and org in parallel
  const [driverRes, customerRes, orgRes] = await Promise.all([
    trip.driver_id
      ? supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", trip.driver_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    trip.customer_id
      ? supabase
          .from("customers")
          .select("id, name")
          .eq("id", trip.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("organizations")
      .select("id, name, tax_no")
      .eq("id", me.organization_id)
      .maybeSingle(),
  ]);

  // Uploader names for documents
  const uploaderIds = [
    ...new Set(docs.map((d) => d.uploaded_by).filter(Boolean) as string[]),
  ];
  let uploaderMap = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: uploaders } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", uploaderIds);
    uploaderMap = new Map(
      (uploaders ?? []).map((u) => [u.id, u.full_name ?? u.email ?? "—"]),
    );
  }

  // Signed URLs for documents + delivery signature
  const signaturePaths = trip.delivery_signature_url
    ? [trip.delivery_signature_url]
    : [];
  const [signedUrls, signedSigUrls] = await Promise.all([
    getSignedDocumentUrls(
      docs.map((d) => d.file_url),
      3600,
    ),
    getSignedDocumentUrls(signaturePaths, 3600),
  ]);

  const documents = docs.map((doc) => ({
    id: doc.id,
    type: doc.type as DocumentType,
    status: doc.status as DocumentStatus,
    created_at: doc.created_at,
    uploaded_by: doc.uploaded_by,
    uploaderName: doc.uploaded_by
      ? (uploaderMap.get(doc.uploaded_by) ?? "—")
      : "—",
    signedUrl: signedUrls.get(doc.file_url) ?? null,
  }));

  const deliverySignatureSignedUrl = trip.delivery_signature_url
    ? (signedSigUrls.get(trip.delivery_signature_url) ?? null)
    : null;

  return (
    <TripDetailClient
      trip={{
        id: trip.id,
        origin: trip.origin ?? "",
        destination: trip.destination ?? "",
        status: trip.status,
        load_date: trip.load_date,
        delivery_date: trip.delivery_date,
        cargo_type: trip.cargo_type,
        loading_type: trip.loading_type,
        tonnage_kg: trip.tonnage_kg ? Number(trip.tonnage_kg) : null,
        body_type: trip.body_type,
        tracking_no: trip.tracking_no,
        distance_km: trip.distance_km ? Number(trip.distance_km) : null,
        notes: trip.notes,
        delivery_signature_url: deliverySignatureSignedUrl,
        delivered_at: trip.delivered_at,
        tracking_token: trip.tracking_token,
        freight_amount: trip.freight_amount
          ? Number(trip.freight_amount)
          : null,
        freight_currency: trip.freight_currency,
        invoice_status: trip.invoice_status,
        fuel_level: trip.fuel_level != null ? Number(trip.fuel_level) : null,
        trip_no: trip.trip_no,
        invoice_direction: trip.invoice_direction,
      }}
      driver={driverRes.data ?? null}
      customer={customerRes.data ?? null}
      org={orgRes.data ?? null}
      stops={stops.map((s) => ({
        id: s.id,
        stop_type: s.stop_type,
        address: s.address,
        planned_at: s.planned_at,
        seq: s.seq,
      }))}
      documents={documents}
      userRole={me.role}
    />
  );
}
