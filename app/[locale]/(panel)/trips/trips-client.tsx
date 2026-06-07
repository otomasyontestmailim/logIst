"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTrip,
  deleteTrip,
  updateTripStatus,
  type TripFormState,
} from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

const initialState: TripFormState = { ok: false };

export function TripsClient({
  trips,
  customers,
  drivers,
}: {
  trips: TripRow[];
  customers: CustomerRow[];
  drivers: UserRow[];
}) {
  const t = useTranslations("Trips");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          {t("addTrip")}
        </Button>
      </div>

      {open && (
        <TripForm
          onDone={() => setOpen(false)}
          customers={customers}
          drivers={drivers}
        />
      )}

      <TripTable trips={trips} customers={customers} drivers={drivers} />
    </div>
  );
}

function TripForm({
  onDone,
  customers,
  drivers,
}: {
  onDone: () => void;
  customers: CustomerRow[];
  drivers: UserRow[];
}) {
  const t = useTranslations("Trips");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createTrip, initialState);

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
      <h2 className="mb-4 text-lg font-semibold">{t("newTrip")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field name="origin" label={t("origin")} required />
        <Field name="destination" label={t("destination")} required />

        <div className="space-y-1.5">
          <Label htmlFor="customer_id">{t("customer")}</Label>
          <select
            id="customer_id"
            name="customer_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{t("selectCustomer")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="driver_id">{t("driver")}</Label>
          <select
            id="driver_id"
            name="driver_id"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{t("selectDriver")}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name ?? d.email}
              </option>
            ))}
          </select>
        </div>

        <Field name="load_date" label={t("loadDate")} type="date" />
        <Field name="delivery_date" label={t("deliveryDate")} type="date" />
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

function TripTable({
  trips,
  customers,
  drivers,
}: {
  trips: TripRow[];
  customers: CustomerRow[];
  drivers: UserRow[];
}) {
  const t = useTranslations("Trips");

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const driverMap = new Map(drivers.map((d) => [d.id, d.full_name ?? d.email]));

  if (trips.length === 0) {
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
            <th className="px-4 py-3 font-medium">{t("colOrigin")}</th>
            <th className="px-4 py-3 font-medium">{t("colDestination")}</th>
            <th className="px-4 py-3 font-medium">{t("colCustomer")}</th>
            <th className="px-4 py-3 font-medium">{t("colDriver")}</th>
            <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
            <th className="px-4 py-3 font-medium">{t("colDates")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {trips.map((trip) => (
            <tr key={trip.id} className="align-top">
              <td className="px-4 py-3 font-medium">{trip.origin}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {trip.destination}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {trip.customer_id ? customerMap.get(trip.customer_id) : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {trip.driver_id ? driverMap.get(trip.driver_id) : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={trip.status} tripId={trip.id} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                <div>{trip.load_date}</div>
                <div>{trip.delivery_date}</div>
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteTripButton tripId={trip.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, tripId }: { status: string; tripId: string }) {
  const t = useTranslations("Trips");
  const [state, formAction, pending] = useActionState(
    updateTripStatus,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.message === "updated") {
      toast.success(t("statusUpdated"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: state.error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const statusClasses: Record<string, string> = {
    created:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    loaded: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    in_transit:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    delivered:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  };

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="trip_id" value={tripId} />
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (form) {
            const formData = new FormData(form);
            formAction(formData);
          }
        }}
        className={`rounded px-2 py-1 text-xs font-medium ${statusClasses[status] ?? statusClasses.created}`}
      >
        <option value="created">{t("statusCreated")}</option>
        <option value="loaded">{t("statusLoaded")}</option>
        <option value="in_transit">{t("statusInTransit")}</option>
        <option value="delivered">{t("statusDelivered")}</option>
      </select>
    </form>
  );
}

const deleteInitial: TripFormState = { ok: false };

function DeleteTripButton({ tripId }: { tripId: string }) {
  const t = useTranslations("Trips");
  const [state, formAction, pending] = useActionState(
    deleteTrip,
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
      <input type="hidden" name="trip_id" value={tripId} />
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
