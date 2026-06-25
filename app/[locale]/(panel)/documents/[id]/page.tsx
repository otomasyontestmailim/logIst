import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { getSignedDocumentUrls } from "@/lib/supabase/storage";
import { DocumentActions } from "./document-detail-client";
import type {
  Database,
  DocumentType,
  DocumentStatus,
} from "@/lib/supabase/database.types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("DocumentDetail");
  const tdt = await getTranslations("DocumentTypes");
  const tds = await getTranslations("DocumentStatus");
  const tof = await getTranslations("OcrFields");
  const format = await getFormatter();
  const me = await getCurrentUser();

  if (!me?.organization_id) notFound();

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("organization_id", me.organization_id)
    .single<DocumentRow>();

  if (!doc) notFound();

  const [tripRes, uploaderRes, signedMap] = await Promise.all([
    doc.trip_id
      ? supabase
          .from("trips")
          .select("id, origin, destination")
          .eq("id", doc.trip_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    doc.uploaded_by
      ? supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", doc.uploaded_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getSignedDocumentUrls([doc.file_url], 3600),
  ]);

  const trip = tripRes.data;
  const uploader = uploaderRes.data;
  const signedUrl = signedMap.get(doc.file_url) ?? null;

  const ocrData =
    doc.ocr_data && typeof doc.ocr_data === "object"
      ? (doc.ocr_data as Record<string, string>)
      : null;

  const canApprove = me.role === "admin" || me.role === "dispatcher";

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <Link
        href="/documents"
        className="text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {tdt(doc.type as DocumentType)}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[doc.status as DocumentStatus]}`}
            >
              {tds(doc.status as DocumentStatus)}
            </span>
            <span className="text-muted-foreground">
              {formatDate(format, doc.created_at)}
            </span>
          </div>
        </div>
        <DocumentActions
          documentId={doc.id}
          status={doc.status as DocumentStatus}
          hasOcr={ocrData !== null}
          canApprove={canApprove}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Document image */}
        <div className="space-y-2">
          <h2 className="font-semibold">{t("imageTitle")}</h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            {signedUrl ? (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedUrl}
                  alt={tdt(doc.type as DocumentType)}
                  className="w-full object-contain max-h-[60vh]"
                />
              </a>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {t("noImage")}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: metadata + OCR */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="space-y-2 text-sm">
              {trip && (
                <MetaRow label={t("tripInfo")}>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="font-medium text-primary hover:underline underline-offset-2"
                  >
                    {trip.origin} → {trip.destination}
                  </Link>
                </MetaRow>
              )}
              {uploader && (
                <MetaRow label={t("driverInfo")}>
                  <Link
                    href={`/drivers/${uploader.id}`}
                    className="font-medium text-primary hover:underline underline-offset-2"
                  >
                    {uploader.full_name ?? uploader.email}
                  </Link>
                </MetaRow>
              )}
            </div>
          </div>

          {/* OCR fields */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h2 className="font-semibold">{t("ocrTitle")}</h2>
            {ocrData && Object.keys(ocrData).length > 0 ? (
              <dl className="space-y-2 text-sm">
                {Object.entries(ocrData).map(([key, value]) => (
                  <div key={key} className="flex gap-3">
                    <dt className="min-w-[10rem] shrink-0 text-muted-foreground">
                      {tof.has(key)
                        ? tof(key as Parameters<typeof tof>[0])
                        : key}
                    </dt>
                    <dd className="font-medium break-words">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noOcr")}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="min-w-[8rem] shrink-0 text-muted-foreground">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
