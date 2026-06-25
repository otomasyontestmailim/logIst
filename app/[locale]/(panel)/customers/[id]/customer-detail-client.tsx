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
          className="rounded-lg border bg-card p-6 shadow-sm"
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
            <div className="space-y-1.5">
              <Label htmlFor="type">{tc("type")}</Label>
              <select
                id="type"
                name="type"
                defaultValue={customer.type ?? "both"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="shipper">{tc("typeShipper")}</option>
                <option value="consignee">{tc("typeConsignee")}</option>
                <option value="both">{tc("typeBoth")}</option>
              </select>
            </div>
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
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
      />
    </div>
  );
}
