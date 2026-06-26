"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OCR_FIELDS, type OcrField, type OcrData } from "@/lib/ocr-types";
import { saveOcrData, type DocumentInboxFormState } from "../actions";

const initial: DocumentInboxFormState = { ok: false };

export function OcrEditForm({
  documentId,
  ocrData,
  canEdit,
}: {
  documentId: string;
  ocrData: OcrData | null;
  canEdit: boolean;
}) {
  const t = useTranslations("DocumentDetail");
  const tof = useTranslations("OcrFields");
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [state, action, pending] = useActionState(saveOcrData, initial);

  useEffect(() => {
    if (state.ok && state.message === "ocr_saved") {
      toast.success(t("ocrSavedToast"));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(false);
      router.refresh();
    } else if (!state.ok && state.error && state.error !== "") {
      // only show toast if there was an actual submission (not on mount)
      if (state.error) toast.error(t("errorToast", { error: state.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("ocrTitle")}</h2>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              {t("ocrEdit")}
            </Button>
          )}
        </div>
        {ocrData && Object.keys(ocrData).some((k) => ocrData[k as OcrField]) ? (
          <dl className="space-y-2 text-sm">
            {OCR_FIELDS.map((field) => {
              const value = ocrData?.[field];
              if (!value) return null;
              return (
                <div key={field} className="flex gap-3">
                  <dt className="min-w-[10rem] shrink-0 text-muted-foreground">
                    {tof(field as Parameters<typeof tof>[0])}
                  </dt>
                  <dd className="font-medium break-words">{value}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noOcr")}</p>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="document_id" value={documentId} />
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("ocrTitle")}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            <X className="size-4" />
            {t("cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            <Save className="size-4" />
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {OCR_FIELDS.map((field) => {
          const label = tof(field as Parameters<typeof tof>[0]);
          return (
            <div key={field} className="flex items-center gap-3 text-sm">
              <label
                htmlFor={`ocr_field_${field}`}
                className="min-w-[10rem] shrink-0 text-muted-foreground"
              >
                {label}
              </label>
              <input
                id={`ocr_field_${field}`}
                name={`ocr_field_${field}`}
                type="text"
                defaultValue={ocrData?.[field] ?? ""}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none ring-0 focus:ring-1 focus:ring-ring"
              />
            </div>
          );
        })}
      </div>
    </form>
  );
}
