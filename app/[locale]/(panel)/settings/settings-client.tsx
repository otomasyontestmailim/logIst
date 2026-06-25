"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorText } from "@/lib/use-error-text";
import {
  updateProfile,
  updateOrg,
  updatePassword,
  type SettingsFormState,
} from "./actions";

const initial: SettingsFormState = { ok: false };

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string | null;
}) {
  const t = useTranslations("Settings");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(updateProfile, initial);

  useEffect(() => {
    if (state.ok && state.message === "updated") {
      toast.success(t("updatedToast"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">{t("fullName")}</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={fullName ?? undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email_display">{t("email")}</Label>
          <Input
            id="email_display"
            type="email"
            value={email ?? ""}
            disabled
            readOnly
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

export function OrgForm({
  orgName,
  taxNo,
}: {
  orgName: string;
  taxNo: string | null;
}) {
  const t = useTranslations("Settings");
  const errText = useErrorText();
  const [state, action, pending] = useActionState(updateOrg, initial);

  useEffect(() => {
    if (state.ok && state.message === "updated") {
      toast.success(t("updatedToast"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org_name">{t("orgName")}</Label>
          <Input
            id="org_name"
            name="org_name"
            required
            defaultValue={orgName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_no">{t("taxNo")}</Label>
          <Input id="tax_no" name="tax_no" defaultValue={taxNo ?? undefined} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("Settings");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(updatePassword, initial);

  useEffect(() => {
    if (state.ok && state.message === "password_updated") {
      toast.success(t("passwordUpdatedToast"));
      formRef.current?.reset();
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new_password">{t("newPassword")}</Label>
          <Input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
