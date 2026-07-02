"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Check, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { useErrorText } from "@/lib/use-error-text";
import {
  setDocumentStatus,
  extractDocument,
  type DocumentInboxFormState,
} from "../actions";
import type { DocumentStatus, OcrStatus } from "@/lib/supabase/database.types";

const initial: DocumentInboxFormState = { ok: false };

const OCR_STATUS_TONES: Record<OcrStatus, StatusTone> = {
  pending: "idle",
  processing: "info",
  done: "done",
  failed: "danger",
};

export function DocumentActions({
  documentId,
  status,
  hasOcr,
  ocrStatus,
  ocrError,
  canApprove,
}: {
  documentId: string;
  status: DocumentStatus;
  hasOcr: boolean;
  ocrStatus: OcrStatus;
  ocrError: string | null;
  canApprove: boolean;
}) {
  const t = useTranslations("DocumentDetail");
  const errText = useErrorText();
  const router = useRouter();

  const [statusState, statusAction, statusPending] = useActionState(
    setDocumentStatus,
    initial,
  );
  const [ocrState, ocrAction, ocrPending] = useActionState(
    extractDocument,
    initial,
  );

  const isOcrBusy = ocrPending || ocrStatus === "processing";

  useEffect(() => {
    if (statusState.ok && statusState.message === "approved") {
      toast.success(t("approvedToast"));
      router.refresh();
    } else if (statusState.ok && statusState.message === "rejected") {
      toast.success(t("rejectedToast"));
      router.refresh();
    } else if (!statusState.ok && statusState.error) {
      toast.error(t("errorToast", { error: errText(statusState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState]);

  useEffect(() => {
    if (ocrState.ok && ocrState.message === "ocr_done") {
      toast.success(t("ocrDoneToast"));
      router.refresh();
    } else if (!ocrState.ok && ocrState.error) {
      toast.error(t("errorToast", { error: errText(ocrState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrState]);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canApprove && status !== "approved" && (
          <form action={statusAction}>
            <input type="hidden" name="document_id" value={documentId} />
            <input type="hidden" name="status" value="approved" />
            <Button type="submit" size="sm" disabled={statusPending}>
              <Check className="size-4" />
              {t("approve")}
            </Button>
          </form>
        )}
        {canApprove && status !== "rejected" && (
          <form action={statusAction}>
            <input type="hidden" name="document_id" value={documentId} />
            <input type="hidden" name="status" value="rejected" />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={statusPending}
              className="text-destructive hover:bg-destructive/10"
            >
              <X className="size-4" />
              {t("reject")}
            </Button>
          </form>
        )}
        {canApprove && (
          <form action={ocrAction}>
            <input type="hidden" name="document_id" value={documentId} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isOcrBusy}
            >
              {isOcrBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanText className="size-4" />
              )}
              {hasOcr ? t("ocrRerun") : t("ocrRun")}
            </Button>
          </form>
        )}
      </div>

      {/* OCR durum rozeti */}
      <StatusChip tone={OCR_STATUS_TONES[ocrStatus]}>
        {isOcrBusy && <Loader2 className="size-3 animate-spin" />}
        {t(`ocrStatus_${ocrStatus}` as Parameters<typeof t>[0])}
        {ocrStatus === "failed" && ocrError && (
          <span className="ml-1 opacity-75">— {ocrError}</span>
        )}
      </StatusChip>
    </div>
  );
}
