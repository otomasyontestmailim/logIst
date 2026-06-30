"use client";

import {
  Fragment,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, ScanText, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { useErrorText } from "@/lib/use-error-text";
import {
  extractDocument,
  setDocumentStatus,
  type DocumentInboxFormState,
} from "./actions";
import type {
  DocumentStatus,
  DocumentType,
} from "@/lib/supabase/database.types";

export type DocumentItem = {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: string;
  signedUrl: string | null;
  ocrData: Record<string, string> | null;
};

export type GroupedTrip = {
  tripId: string;
  origin: string;
  destination: string;
  driverName: string;
  loadDate: string | null;
  documents: DocumentItem[];
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-destructive/15 text-destructive",
};

const DOC_TYPES = [
  "cmr",
  "invoice",
  "waybill",
  "weighbridge",
  "adr",
  "customs",
  "delivery_note",
] as const;

const initialState: DocumentInboxFormState = { ok: false };

export function DocumentsClient({
  groups,
  initialStatus,
  initialType,
}: {
  groups: GroupedTrip[];
  initialStatus: string;
  initialType: string;
}) {
  const t = useTranslations("Documents");
  const tds = useTranslations("DocumentStatus");
  const tdt = useTranslations("DocumentTypes");
  const tof = useTranslations("OcrFields");
  const format = useFormatter();
  const errText = useErrorText();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    setDocumentStatus,
    initialState,
  );
  const [ocrState, ocrAction, ocrPending] = useActionState(
    extractDocument,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.message === "approved") {
      toast.success(t("approvedToast"));
    } else if (state.ok && state.message === "rejected") {
      toast.success(t("rejectedToast"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (ocrState.ok && ocrState.message === "ocr_done") {
      toast.success(t("ocrDoneToast"));
    } else if (!ocrState.ok && ocrState.error) {
      toast.error(t("errorToast", { error: errText(ocrState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrState]);

  function runOcr(documentId: string) {
    const fd = new FormData();
    fd.set("document_id", documentId);
    startTransition(() => ocrAction(fd));
  }

  function setFilter(key: "status" | "type", value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "all") sp.delete(key);
    else sp.set(key, value);
    router.push(`?${sp.toString()}`);
  }

  function setStatus(documentId: string, status: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("document_id", documentId);
    fd.set("status", status);
    startTransition(() => formAction(fd));
  }

  const hasFilter = initialStatus !== "all" || initialType !== "all";

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select
          value={initialStatus}
          onChange={(e) => setFilter("status", e.target.value)}
          aria-label={t("filterStatus")}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="all">{t("statusAll")}</option>
          <option value="pending">{tds("pending")}</option>
          <option value="approved">{tds("approved")}</option>
          <option value="rejected">{tds("rejected")}</option>
        </select>

        <select
          value={initialType}
          onChange={(e) => setFilter("type", e.target.value)}
          aria-label={t("filterType")}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="all">{t("typeAll")}</option>
          {DOC_TYPES.map((type) => (
            <option key={type} value={type}>
              {tdt(type)}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {hasFilter ? t("noResults") : t("empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const pendingCount = group.documents.filter(
              (d) => d.status === "pending",
            ).length;
            return (
              <div key={group.tripId} className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <h2 className="text-sm font-semibold">
                    {t("groupTitle", {
                      tripId: group.tripId.slice(0, 8),
                      origin: group.origin,
                      destination: group.destination,
                      driver: group.driverName,
                      date: formatDate(format, group.loadDate),
                    })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {t("documentsCount", { count: group.documents.length })}
                    </span>
                    {pendingCount > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {pendingCount} {tds("pending")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        {t("noPending")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {group.documents.map((doc) => {
                    const hasOcr =
                      doc.ocrData &&
                      Object.values(doc.ocrData).some(
                        (v) => v && v.trim() !== "",
                      );
                    const expanded = expandedId === doc.id;
                    return (
                      <Fragment key={doc.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-muted px-2 py-1 text-xs font-medium">
                              {tdt(doc.type)}
                            </span>
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASSES[doc.status] ?? STATUS_CLASSES.pending}`}
                            >
                              {tds(doc.status)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(format, doc.createdAt)}
                            </span>
                            <Link
                              href={`/documents/${doc.id}`}
                              className="text-xs text-primary hover:underline underline-offset-2"
                            >
                              {t("review")}
                            </Link>
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={hasOcr ? t("ocrView") : t("ocrRun")}
                              title={hasOcr ? t("ocrView") : t("ocrRun")}
                              disabled={ocrPending}
                              onClick={() => {
                                if (hasOcr) {
                                  setExpandedId(expanded ? null : doc.id);
                                } else {
                                  runOcr(doc.id);
                                }
                              }}
                            >
                              <ScanText
                                className={`size-4 ${hasOcr ? "text-primary" : "text-muted-foreground"}`}
                              />
                            </Button>
                            {doc.signedUrl && (
                              <a
                                href={doc.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t("view")}
                                className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            )}
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={pending}
                                  onClick={() => setStatus(doc.id, "approved")}
                                  aria-label={t("approve")}
                                >
                                  <Check className="size-4 text-green-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={pending}
                                  onClick={() => setStatus(doc.id, "rejected")}
                                  aria-label={t("reject")}
                                >
                                  <X className="size-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {expanded && hasOcr && (
                          <div className="bg-muted/30 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-xs font-semibold text-muted-foreground">
                                {t("ocrTitle")}
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={ocrPending}
                                onClick={() => runOcr(doc.id)}
                              >
                                {t("ocrRerun")}
                              </Button>
                            </div>
                            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                              {Object.entries(doc.ocrData!)
                                .filter(([, v]) => v && v.trim() !== "")
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex justify-between gap-2 border-b border-border/50 py-1 text-sm"
                                  >
                                    <dt className="text-muted-foreground">
                                      {(() => {
                                        try {
                                          return tof(
                                            key as Parameters<typeof tof>[0],
                                          );
                                        } catch {
                                          return key;
                                        }
                                      })()}
                                    </dt>
                                    <dd className="text-right font-medium">
                                      {value}
                                    </dd>
                                  </div>
                                ))}
                            </dl>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
