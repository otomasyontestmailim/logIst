"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteDriver, type InviteDriverState } from "../actions";
import { useErrorText } from "@/lib/use-error-text";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const initialState: InviteDriverState = { ok: false };

export default function InviteDriverPage() {
  const t = useTranslations("Drivers");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    InviteDriverState,
    FormData
  >(inviteDriver, initialState);

  useEffect(() => {
    if (state.ok && state.message === "invited") {
      formRef.current?.reset();
    }
  }, [state]);

  function copyPassword() {
    if (!state.password) return;
    navigator.clipboard
      .writeText(state.password)
      .then(() => toast.success("Kopyalandı"));
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div>
        <Link
          href="/drivers"
          className="text-sm text-muted-foreground hover:underline underline-offset-2"
        >
          {t("backToList")}
        </Link>
      </div>

      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("inviteTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inviteSubtitle")}
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="flex max-w-md flex-col gap-5 rounded-xl border bg-card p-6 shadow-resting"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">{t("fullName")}</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Ahmet Yılmaz"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="sofor@firma.com"
            required
          />
        </div>

        {!state.ok && state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errText(state.error)}
          </p>
        )}

        {state.ok && state.password && (
          <div className="status-done rounded-lg border border-[var(--tone-fg)]/25 bg-[var(--tone-bg)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--tone-fg)]">
              {t("inviteSuccess", { password: "" })}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-md bg-card px-3 py-1.5 font-mono text-base font-semibold tracking-wider text-foreground">
                {state.password}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors outline-none hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={t("copyPassword")}
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? t("inviteSending") : t("inviteButton")}
        </Button>
      </form>
    </main>
  );
}
