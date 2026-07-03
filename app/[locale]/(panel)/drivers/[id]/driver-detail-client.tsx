"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorText } from "@/lib/use-error-text";
import { updateDriver, deleteDriver, type DriverFormState } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;

export type DriverDetailData = UserRow & { profile: ProfileRow | null };

const initial: DriverFormState = { ok: false };

export function DriverDetailActions({ driver }: { driver: DriverDetailData }) {
  const t = useTranslations("DriverDetail");
  const td = useTranslations("Drivers");
  const errText = useErrorText();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [updateState, updateAction, updatePending] = useActionState(
    updateDriver,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDriver,
    initial,
  );

  useEffect(() => {
    if (updateState.ok && updateState.message === "updated") {
      toast.success(td("updatedToast"));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(false);
    } else if (!updateState.ok && updateState.error) {
      toast.error(t("errorToast", { error: errText(updateState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);

  useEffect(() => {
    if (deleteState.ok && deleteState.message === "deleted") {
      toast.success(t("deletedToast"));
      router.push("/drivers");
    } else if (!deleteState.ok && deleteState.error) {
      toast.error(t("errorToast", { error: errText(deleteState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  const p = driver.profile;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
          {editing ? td("cancel") : t("editSection")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          {t("deleteDriver")}
        </Button>
      </div>

      {editing && (
        <form
          ref={formRef}
          action={updateAction}
          className="rounded-xl border bg-card p-6 shadow-resting"
        >
          <h2 className="mb-4 text-lg font-semibold">{td("editDriver")}</h2>
          <input type="hidden" name="driver_id" value={driver.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              name="full_name"
              label={td("fullName")}
              defaultValue={driver.full_name}
            />
            <div className="space-y-1.5">
              <Label htmlFor="email">{td("email")}</Label>
              <Input
                id="email"
                type="email"
                defaultValue={driver.email ?? undefined}
                disabled
              />
            </div>
            <Field
              name="phone"
              label={td("phone")}
              defaultValue={driver.phone}
            />
            <Field
              name="license_no"
              label={td("licenseNo")}
              defaultValue={p?.license_no}
            />
            <Field name="plate" label={td("plate")} defaultValue={p?.plate} />
            <Field
              name="trailer_no"
              label={td("trailerNo")}
              defaultValue={p?.trailer_no}
            />
            <Field
              name="src_expiry"
              label={td("srcExpiry")}
              type="date"
              defaultValue={p?.src_expiry}
            />
            <Field
              name="adr_expiry"
              label={td("adrExpiry")}
              type="date"
              defaultValue={p?.adr_expiry}
            />
            <Field
              name="psikoteknik_expiry"
              label={td("psikoteknikExpiry")}
              type="date"
              defaultValue={p?.psikoteknik_expiry}
            />
            <Field
              name="green_card_expiry"
              label={td("greenCardExpiry")}
              type="date"
              defaultValue={p?.green_card_expiry}
            />
            <Field
              name="vehicle_model"
              label={td("vehicleModel")}
              defaultValue={p?.vehicle_model}
            />
            <Field
              name="vehicle_year"
              label={td("vehicleYear")}
              type="number"
              defaultValue={p?.vehicle_year?.toString()}
            />
            <Field
              name="capacity_ton"
              label={td("capacityTon")}
              type="number"
              defaultValue={p?.capacity_ton?.toString()}
            />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={updatePending}>
              {updatePending ? td("saving") : td("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={updatePending}
            >
              {td("cancel")}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(false);
        }}
        title={t("deleteConfirm")}
        pending={deletePending}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("driver_id", driver.id);
          startTransition(() => deleteAction(fd));
          setConfirmDelete(false);
        }}
      />
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
      />
    </div>
  );
}
