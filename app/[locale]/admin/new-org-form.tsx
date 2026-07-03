"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Check, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization, type OrgFormState } from "./actions";
import { useErrorText } from "@/lib/use-error-text";

const initialState: OrgFormState = { ok: false };

export function NewOrgForm() {
  const t = useTranslations("Admin");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createOrganization,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok && state.tempPassword) {
      formRef.current?.reset();
    } else if (!state.ok && state.error) {
      toast.error(errText(state.error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function copyPassword() {
    if (!state.tempPassword) return;
    navigator.clipboard.writeText(state.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-resting">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Building2 className="size-5 text-primary" />
        {t("newOrgTitle")}
      </h2>

      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <OrgField name="org_name" label={t("fieldOrgName")} required />
          <OrgField name="tax_no" label={t("fieldTaxNo")} />
          <OrgField
            name="admin_email"
            label={t("fieldAdminEmail")}
            type="email"
            required
          />
          <OrgField name="admin_full_name" label={t("fieldAdminFullName")} />
        </div>

        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? t("creating") : t("createOrg")}
        </Button>
      </form>

      {state.ok && state.tempPassword && (
        <div className="status-done mt-4 rounded-lg border border-[var(--tone-fg)]/25 bg-[var(--tone-bg)] p-4">
          <p className="text-sm font-medium text-[var(--tone-fg)]">
            {t("orgCreatedSuccess", { email: state.adminEmail ?? "" })}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-card px-3 py-1.5 font-mono text-sm text-foreground">
              {state.tempPassword}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyPassword}
              aria-label={copied ? t("copied") : t("copyPassword")}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--tone-fg)]/85">
            {t("orgCreatedWarning")}
          </p>
        </div>
      )}
    </div>
  );
}

function OrgField({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
