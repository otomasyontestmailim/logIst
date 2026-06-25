"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Check, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import {
  setDocumentStatus,
  extractDocument,
  type DocumentInboxFormState,
} from "../actions";
import type { DocumentStatus } from "@/lib/supabase/database.types";

const initial: DocumentInboxFormState = { ok: false };

export function DocumentActions({
  documentId,
  status,
  hasOcr,
  canApprove,
}: {
  documentId: string;
  status: DocumentStatus;
  hasOcr: boolean;
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
            disabled={ocrPending}
          >
            <ScanText className="size-4" />
            {hasOcr ? t("ocrRerun") : t("ocrRun")}
          </Button>
        </form>
      )}
    </div>
  );
}
