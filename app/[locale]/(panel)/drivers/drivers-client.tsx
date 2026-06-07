"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDriver, deleteDriver, type DriverFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;
type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];

export type DriverRow = UserRow & { profile: ProfileRow | null };

const initialState: DriverFormState = { ok: false };

export function DriversClient({ drivers }: { drivers: DriverRow[] }) {
  const t = useTranslations("Drivers");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          {t("addDriver")}
        </Button>
      </div>

      {open && <DriverForm onDone={() => setOpen(false)} />}

      <DriverTable drivers={drivers} />
    </div>
  );
}

function DriverForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Drivers");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createDriver,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.message === "created") {
      toast.success(t("createdToast"));
      formRef.current?.reset();
      onDone();
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: state.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold">{t("newDriver")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field name="full_name" label={t("fullName")} />
        <Field name="email" label={t("email")} type="email" required />
        <Field name="phone" label={t("phone")} />
        <Field name="license_no" label={t("licenseNo")} />
        <Field name="plate" label={t("plate")} />
        <Field name="trailer_no" label={t("trailerNo")} />
        <Field name="src_expiry" label={t("srcExpiry")} type="date" />
        <Field name="adr_expiry" label={t("adrExpiry")} type="date" />
        <Field
          name="psikoteknik_expiry"
          label={t("psikoteknikExpiry")}
          type="date"
        />
        <Field
          name="green_card_expiry"
          label={t("greenCardExpiry")}
          type="date"
        />
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" name="password" type="text" autoComplete="off" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("passwordHint")}</p>
      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={pending}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}

function DriverTable({ drivers }: { drivers: DriverRow[] }) {
  const t = useTranslations("Drivers");

  if (drivers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{t("colName")}</th>
            <th className="px-4 py-3 font-medium">{t("colContact")}</th>
            <th className="px-4 py-3 font-medium">{t("colVehicle")}</th>
            <th className="px-4 py-3 font-medium">{t("colExpiries")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {drivers.map((d) => (
            <tr key={d.id} className="align-top">
              <td className="px-4 py-3 font-medium">
                {d.full_name ?? t("noProfile")}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <div>{d.email}</div>
                {d.phone && <div className="text-xs">{d.phone}</div>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {d.profile?.plate ?? t("noProfile")}
                {d.profile?.trailer_no && (
                  <span className="text-xs"> / {d.profile.trailer_no}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <ExpiryBadge label="SRC" date={d.profile?.src_expiry} />
                  <ExpiryBadge label="ADR" date={d.profile?.adr_expiry} />
                  <ExpiryBadge
                    label="Psiko"
                    date={d.profile?.psikoteknik_expiry}
                  />
                  <ExpiryBadge
                    label="Yeşil"
                    date={d.profile?.green_card_expiry}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteDriverButton driverId={d.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpiryBadge({ label, date }: { label: string; date?: string | null }) {
  const t = useTranslations("Drivers");
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);

  let cls = "bg-muted text-muted-foreground";
  let title = "";
  if (days < 0) {
    cls = "bg-destructive/15 text-destructive";
    title = t("expired");
  } else if (days <= 30) {
    cls = "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    title = t("expiringSoon");
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}: {date}
    </span>
  );
}

const deleteInitial: DriverFormState = { ok: false };

function DeleteDriverButton({ driverId }: { driverId: string }) {
  const t = useTranslations("Drivers");
  const [state, formAction, pending] = useActionState(
    deleteDriver,
    deleteInitial,
  );

  useEffect(() => {
    if (state.ok && state.message === "deleted") {
      toast.success(t("deletedToast"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: state.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t("deleteConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="driver_id" value={driverId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={t("deleteConfirm")}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </form>
  );
}
