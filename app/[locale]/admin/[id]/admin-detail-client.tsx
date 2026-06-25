"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorText } from "@/lib/use-error-text";
import { updateOrgPlan, type OrgPlanState } from "./actions";

const initial: OrgPlanState = { ok: false };

export function OrgPlanToggle({
  orgId,
  currentPlan,
}: {
  orgId: string;
  currentPlan: string;
}) {
  const t = useTranslations("AdminDetail");
  const errText = useErrorText();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const isSuspended = currentPlan === "suspended";

  const [state, action, pending] = useActionState(updateOrgPlan, initial);

  useEffect(() => {
    if (state.ok && state.message === "updated") {
      toast.success(t("planUpdatedToast"));
      router.refresh();
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirm(true)}
        className={
          isSuspended
            ? "text-primary"
            : "text-destructive hover:bg-destructive/10"
        }
      >
        {isSuspended ? (
          <>
            <PlayCircle className="size-4" /> {t("activate")}
          </>
        ) : (
          <>
            <PauseCircle className="size-4" /> {t("suspend")}
          </>
        )}
      </Button>

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => {
          if (!o) setConfirm(false);
        }}
        title={isSuspended ? t("confirmActivate") : t("confirmSuspend")}
        pending={pending}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("org_id", orgId);
          fd.set("plan", isSuspended ? "free" : "suspended");
          startTransition(() => action(fd));
          setConfirm(false);
        }}
      />
    </>
  );
}
