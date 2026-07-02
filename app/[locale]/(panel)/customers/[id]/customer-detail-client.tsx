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
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field as FormField } from "@/components/field";
import { useErrorText } from "@/lib/use-error-text";
import {
  updateCustomer,
  deleteCustomer,
  type CustomerFormState,
} from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

const initial: CustomerFormState = { ok: false };

export function CustomerDetailActions({ customer }: { customer: CustomerRow }) {
  const t = useTranslations("CustomerDetail");
  const tc = useTranslations("Customers");
  const errText = useErrorText();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [updateState, updateAction, updatePending] = useActionState(
    updateCustomer,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCustomer,
    initial,
  );

  useEffect(() => {
    if (updateState.ok && updateState.message === "updated") {
      toast.success(tc("updatedToast"));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(false);
      router.refresh();
    } else if (!updateState.ok && updateState.error) {
      toast.error(t("errorToast", { error: errText(updateState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);

  useEffect(() => {
    if (deleteState.ok && deleteState.message === "deleted") {
      toast.success(t("deletedToast"));
      router.push("/customers");
    } else if (!deleteState.ok && deleteState.error) {
      toast.error(t("errorToast", { error: errText(deleteState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

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
          {editing ? tc("cancel") : t("editSection")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          {t("deleteCustomer")}
        </Button>
      </div>

      {editing && (
        <form
          ref={formRef}
          action={updateAction}
          className="rounded-xl border bg-card p-6 shadow-resting"
        >
          <h2 className="mb-4 text-lg font-semibold">{tc("editCustomer")}</h2>
          <input type="hidden" name="customer_id" value={customer.id} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              name="name"
              label={tc("name")}
              required
              defaultValue={customer.name}
            />
            <Field
              name="contact"
              label={tc("contact")}
              defaultValue={customer.contact}
            />
            <FormField label={tc("type")} htmlFor="type">
              <NativeSelect
                id="type"
                name="type"
                defaultValue={customer.type ?? "both"}
              >
                <option value="shipper">{tc("typeShipper")}</option>
                <option value="consignee">{tc("typeConsignee")}</option>
                <option value="both">{tc("typeBoth")}</option>
              </NativeSelect>
            </FormField>
            <Field
              name="country"
              label={tc("country")}
              defaultValue={customer.country}
            />
            <Field
              name="city"
              label={tc("city")}
              defaultValue={customer.city}
            />
            <Field
              name="address"
              label={tc("address")}
              defaultValue={customer.address}
            />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={updatePending}>
              {updatePending ? tc("saving") : tc("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={updatePending}
            >
              {tc("cancel")}
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
          fd.set("customer_id", customer.id);
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
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
}) {
  return (
    <FormField label={label} htmlFor={name} required={required}>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
      />
    </FormField>
  );
}
