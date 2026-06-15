"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { useErrorText } from "@/lib/use-error-text";
import { setDocumentStatus, type DocumentInboxFormState } from "./actions";
import type {
  DocumentStatus,
  DocumentType,
} from "@/lib/supabase/database.types";

export type DocumentItem = {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: string;
  tripLabel: string;
  driverName: string;
  signedUrl: string | null;
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-destructive/15 text-destructive",
};

const initialState: DocumentInboxFormState = { ok: false };

export function DocumentsClient({ items }: { items: DocumentItem[] }) {
  const t = useTranslations("Documents");
  const tds = useTranslations("DocumentStatus");
  const tdt = useTranslations("DocumentTypes");
  const format = useFormatter();
  const errText = useErrorText();

  const [statusFilter, setStatusFilter] = useState("all");
  const [state, formAction, pending] = useActionState(
    setDocumentStatus,
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

  const filtered =
    statusFilter === "all"
      ? items
      : items.filter((d) => d.status === statusFilter);

  function setStatus(documentId: string, status: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("document_id", documentId);
    fd.set("status", status);
    startTransition(() => formAction(fd));
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        aria-label={t("filterStatus")}
        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <option value="all">{t("statusAll")}</option>
        <option value="pending">{tds("pending")}</option>
        <option value="approved">{tds("approved")}</option>
        <option value="rejected">{tds("rejected")}</option>
      </select>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("colType")}</th>
              <th className="px-4 py-3 font-medium">{t("colTrip")}</th>
              <th className="px-4 py-3 font-medium">{t("colDriver")}</th>
              <th className="px-4 py-3 font-medium">{t("colDate")}</th>
              <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((doc) => (
              <tr key={doc.id} className="align-top">
                <td className="px-4 py-3 font-medium">{tdt(doc.type)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.tripLabel}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.driverName}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(format, doc.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASSES[doc.status] ?? STATUS_CLASSES.pending}`}
                  >
                    {tds(doc.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
