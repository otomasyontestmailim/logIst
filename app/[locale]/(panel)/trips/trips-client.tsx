"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTrip,
  deleteTrip,
  updateTrip,
  updateTripStatus,
  type TripFormState,
} from "./actions";
import { formatDate } from "@/lib/format-date";
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
  const [editing, setEditing] = useState<TripRow | null>(null);

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
          {t("addTrip")}
        </Button>
      </div>

      {(open || editing) && (
        <TripForm
          key={editing?.id ?? "new"}
          trip={editing}
          onDone={() => {
            setOpen(false);
            setEditing(null);
          }}
          customers={customers}
          drivers={drivers}
        />
      )}

      <TripTable
        trips={trips}
        customers={customers}
        drivers={drivers}
        onEdit={(trip) => setEditing(trip)}
      />
    </div>
  );
}

function TripForm({
  trip,
  onDone,
  customers,
  drivers,
}: {
  trip: TripRow | null;
  onDone: () => void;
  customers: CustomerRow[];
  drivers: UserRow[];
}) {
  const t = useTranslations("Trips");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    trip ? updateTrip : createTrip,
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
        {trip ? t("editTrip") : t("newTrip")}
      </h2>
      {trip && <input type="hidden" name="trip_id" value={trip.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          name="origin"
          label={t("origin")}
          required
          defaultValue={trip?.origin}
        />
        <Field
          name="destination"
          label={t("destination")}
          required
          defaultValue={trip?.destination}
        />

        <div className="space-y-1.5">
          <Label htmlFor="customer_id">{t("customer")}</Label>
          <select
            id="customer_id"
            name="customer_id"
            defaultValue={trip?.customer_id ?? ""}
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
            defaultValue={trip?.driver_id ?? ""}
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

        <Field
          name="load_date"
          label={t("loadDate")}
          type="date"
          defaultValue={trip?.load_date}
        />
        <Field
          name="delivery_date"
          label={t("deliveryDate")}
          type="date"
          defaultValue={trip?.delivery_date}
        />

        {trip && (
          <div className="space-y-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <select
              id="status"
              name="status"
              defaultValue={trip.status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="created">{t("statusCreated")}</option>
              <option value="loaded">{t("statusLoaded")}</option>
              <option value="in_transit">{t("statusInTransit")}</option>
              <option value="delivered">{t("statusDelivered")}</option>
            </select>
          </div>
        )}
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

function TripTable({
  trips,
  customers,
  drivers,
  onEdit,
}: {
  trips: TripRow[];
  customers: CustomerRow[];
  drivers: UserRow[];
  onEdit: (trip: TripRow) => void;
}) {
  const t = useTranslations("Trips");
  const format = useFormatter();

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
                <div>{formatDate(format, trip.load_date)}</div>
                <div>{formatDate(format, trip.delivery_date)}</div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(trip)}
                    aria-label={t("editTrip")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteTripButton tripId={trip.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_CLASSES: Record<string, string> = {
  created: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  loaded: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  in_transit:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  delivered:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

function StatusBadge({ status, tripId }: { status: string; tripId: string }) {
  const t = useTranslations("Trips");
  // Optimistic value — güncelleme beklenirken hemen renklendirir
  const [current, setCurrent] = useState(status);
  // Sunucu revalidation'dan gelen yeni prop'u render sırasında (useEffect olmadan) senkronize et
  const [prevProp, setPrevProp] = useState(status);
  if (prevProp !== status) {
    setPrevProp(status);
    setCurrent(status);
  }

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

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="trip_id" value={tripId} />
      <select
        name="status"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setCurrent(next);
          const form = e.currentTarget.form;
          if (form) formAction(new FormData(form));
        }}
        className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASSES[current] ?? STATUS_CLASSES.created}`}
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
