"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerFormState,
} from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

const initialState: CustomerFormState = { ok: false };

export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const t = useTranslations("Customers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen((v) => !v);
          }}
        >
          <Plus className="size-4" />
          {t("addCustomer")}
        </Button>
      </div>

      {(open || editing) && (
        <CustomerForm
          key={editing?.id ?? "new"}
          customer={editing}
          onDone={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}

      <CustomerTable customers={customers} onEdit={(c) => setEditing(c)} />
    </div>
  );
}

function CustomerForm({
  customer,
  onDone,
}: {
  customer: CustomerRow | null;
  onDone: () => void;
}) {
  const t = useTranslations("Customers");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    customer ? updateCustomer : createCustomer,
    initialState,
  );

  useEffect(() => {
    if (
      state.ok &&
      (state.message === "created" || state.message === "updated")
    ) {
      toast.success(
        state.message === "created" ? t("createdToast") : t("updatedToast"),
      );
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
      <h2 className="mb-4 text-lg font-semibold">
        {customer ? t("editCustomer") : t("newCustomer")}
      </h2>
      {customer && (
        <input type="hidden" name="customer_id" value={customer.id} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          name="name"
          label={t("name")}
          required
          defaultValue={customer?.name}
        />
        <Field
          name="contact"
          label={t("contact")}
          defaultValue={customer?.contact}
        />
        <div className="space-y-1.5">
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            defaultValue={customer?.type ?? "both"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="shipper">{t("typeShipper")}</option>
            <option value="consignee">{t("typeConsignee")}</option>
            <option value="both">{t("typeBoth")}</option>
          </select>
        </div>
        <Field
          name="country"
          label={t("country")}
          defaultValue={customer?.country}
        />
        <Field name="city" label={t("city")} defaultValue={customer?.city} />
        <Field
          name="address"
          label={t("address")}
          defaultValue={customer?.address}
        />
      </div>
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
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
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
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
      />
    </div>
  );
}

function CustomerTable({
  customers,
  onEdit,
}: {
  customers: CustomerRow[];
  onEdit: (customer: CustomerRow) => void;
}) {
  const t = useTranslations("Customers");

  if (customers.length === 0) {
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
            <th className="px-4 py-3 font-medium">{t("colType")}</th>
            <th className="px-4 py-3 font-medium">{t("colLocation")}</th>
            <th className="px-4 py-3 font-medium">{t("colContact")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t(
                  `type${c.type.charAt(0).toUpperCase()}${c.type.slice(1)}` as
                    | "typeShipper"
                    | "typeConsignee"
                    | "typeBoth",
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                <div>
                  {c.city && `${c.city}`}
                  {c.country && ` (${c.country})`}
                </div>
                {c.address && <div className="text-xs">{c.address}</div>}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {c.contact}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(c)}
                    aria-label={t("editCustomer")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteCustomerButton customerId={c.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const deleteInitial: CustomerFormState = { ok: false };

function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const t = useTranslations("Customers");
  const [state, formAction, pending] = useActionState(
    deleteCustomer,
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
      <input type="hidden" name="customer_id" value={customerId} />
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
