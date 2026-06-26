"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTrip,
  deleteTrip,
  saveTripStops,
  updateTrip,
  updateTripStatus,
  type TripFormState,
} from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format-date";
import { useErrorText } from "@/lib/use-error-text";
import { ALL_STATUSES, STATUS_CLASSES } from "@/lib/trip-status";
import type { Database } from "@/lib/supabase/database.types";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type StopRow = Database["public"]["Tables"]["trip_stops"]["Row"];
type StopType = Database["public"]["Tables"]["trip_stops"]["Row"]["stop_type"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email"
>;

const initialState: TripFormState = { ok: false };

const LOADING_TYPES = ["palletized", "bulk", "parcel", "other"] as const;
const CURRENCIES = ["EUR", "USD", "TRY"] as const;
const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;

export function TripsClient({
  trips,
  customers,
  drivers,
  stops,
  initialStatus,
}: {
  trips: TripRow[];
  customers: CustomerRow[];
  drivers: UserRow[];
  stops: StopRow[];
  initialStatus?: string;
}) {
  const t = useTranslations("Trips");
  const ts = useTranslations("TripStatus");
  const tc = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));
    const driverMap = new Map(
      drivers.map((d) => [d.id, d.full_name ?? d.email]),
    );
    return trips.filter((trip) => {
      if (statusFilter !== "all" && trip.status !== statusFilter) return false;
      if (!q) return true;
      const customerName = trip.customer_id
        ? customerMap.get(trip.customer_id)
        : null;
      const driverName = trip.driver_id ? driverMap.get(trip.driver_id) : null;
      return [trip.origin, trip.destination, customerName, driverName].some(
        (v) => v?.toLowerCase().includes(q),
      );
    });
  }, [trips, customers, drivers, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tc("searchPlaceholder")}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t("filterStatus")}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="all">{t("statusAll")}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </select>
        </div>
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
        <>
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
          {editing && (
            <StopsEditor
              key={`stops-${editing.id}`}
              tripId={editing.id}
              stops={stops.filter((s) => s.trip_id === editing.id)}
            />
          )}
        </>
      )}

      <TripTable
        trips={filtered}
        customers={customers}
        drivers={drivers}
        emptyText={trips.length > 0 ? tc("noResults") : t("empty")}
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
  const ts = useTranslations("TripStatus");
  const tlt = useTranslations("LoadingTypes");
  const ti = useTranslations("Invoice");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    trip ? updateTrip : createTrip,
    initialState,
  );

  const fe = state.fieldErrors ?? {};

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
      toast.error(t("errorToast", { error: errText(state.error) }));
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
          error={fe.origin ? errText(fe.origin) : undefined}
        />
        <Field
          name="destination"
          label={t("destination")}
          required
          defaultValue={trip?.destination}
          error={fe.destination ? errText(fe.destination) : undefined}
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

        <Field
          name="cargo_type"
          label={t("cargoType")}
          defaultValue={trip?.cargo_type}
        />

        <div className="space-y-1.5">
          <Label htmlFor="loading_type">{t("loadingType")}</Label>
          <select
            id="loading_type"
            name="loading_type"
            defaultValue={trip?.loading_type ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{t("selectLoadingType")}</option>
            {LOADING_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {tlt(lt)}
              </option>
            ))}
          </select>
        </div>

        <Field
          name="tonnage_kg"
          label={t("tonnageKg")}
          type="number"
          defaultValue={trip?.tonnage_kg?.toString()}
        />
        <Field
          name="body_type"
          label={t("bodyType")}
          defaultValue={trip?.body_type}
        />
        <Field
          name="tracking_no"
          label={t("trackingNo")}
          defaultValue={trip?.tracking_no}
        />
        <Field
          name="distance_km"
          label={t("distanceKm")}
          type="number"
          defaultValue={trip?.distance_km?.toString()}
        />

        <Field
          name="freight_amount"
          label={ti("freightAmount")}
          type="number"
          defaultValue={trip?.freight_amount?.toString()}
        />

        <div className="space-y-1.5">
          <Label htmlFor="freight_currency">{ti("currency")}</Label>
          <select
            id="freight_currency"
            name="freight_currency"
            defaultValue={trip?.freight_currency ?? "EUR"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoice_status">{ti("invoiceStatus")}</Label>
          <select
            id="invoice_status"
            name="invoice_status"
            defaultValue={trip?.invoice_status ?? "draft"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ti(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={trip?.notes ?? undefined}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {trip && (
          <div className="space-y-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <select
              id="status"
              name="status"
              defaultValue={trip.status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ts(s)}
                </option>
              ))}
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
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
  error?: string;
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
        aria-invalid={!!error}
        className={
          error
            ? "border-destructive focus-visible:ring-destructive"
            : undefined
        }
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type EditableStop = {
  stop_type: StopType;
  address: string;
  planned_at: string; // datetime-local biçimi
};

function StopsEditor({ tripId, stops }: { tripId: string; stops: StopRow[] }) {
  const t = useTranslations("Stops");
  const errText = useErrorText();
  const [rows, setRows] = useState<EditableStop[]>(() =>
    [...stops]
      .sort((a, b) => a.seq - b.seq)
      .map((s) => ({
        stop_type: s.stop_type,
        address: s.address ?? "",
        planned_at: s.planned_at ? s.planned_at.slice(0, 16) : "",
      })),
  );
  const [state, formAction, pending] = useActionState(
    saveTripStops,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.message === "stops_saved") {
      toast.success(t("savedToast"));
    } else if (!state.ok && state.error) {
      toast.error(t("errorToast", { error: errText(state.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function update(i: number, patch: Partial<EditableStop>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{t("title")}</h2>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid items-end gap-2 sm:grid-cols-[8rem_1fr_14rem_2.5rem]"
          >
            <select
              value={row.stop_type}
              onChange={(e) =>
                update(i, { stop_type: e.target.value as StopType })
              }
              aria-label={t("type")}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="pickup">{t("pickup")}</option>
              <option value="delivery">{t("delivery")}</option>
            </select>
            <Input
              value={row.address}
              onChange={(e) => update(i, { address: e.target.value })}
              placeholder={t("address")}
            />
            <Input
              type="datetime-local"
              value={row.planned_at}
              onChange={(e) => update(i, { planned_at: e.target.value })}
              aria-label={t("plannedAt")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              aria-label={t("remove")}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { stop_type: "pickup", address: "", planned_at: "" },
            ])
          }
        >
          <Plus className="size-4" />
          {t("addStop")}
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("trip_id", tripId);
            fd.set("stops", JSON.stringify(rows));
            startTransition(() => formAction(fd));
          }}
        >
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

function TripTable({
  trips,
  customers,
  drivers,
  emptyText,
  onEdit,
}: {
  trips: TripRow[];
  customers: CustomerRow[];
  drivers: UserRow[];
  emptyText: string;
  onEdit: (trip: TripRow) => void;
}) {
  const t = useTranslations("Trips");
  const format = useFormatter();
  const errText = useErrorText();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTrip,
    initialState,
  );

  useEffect(() => {
    if (deleteState.ok && deleteState.message === "deleted") {
      toast.success(t("deletedToast"));
    } else if (!deleteState.ok && deleteState.error) {
      toast.error(t("errorToast", { error: errText(deleteState.error) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const driverMap = new Map(drivers.map((d) => [d.id, d.full_name ?? d.email]));

  if (trips.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {emptyText}
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
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/trips/${trip.id}`}
                  className="text-primary hover:underline underline-offset-2"
                >
                  {trip.origin}
                </Link>
              </td>
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
                  <a
                    href={`/api/trips/${trip.id}/documents-zip`}
                    aria-label={t("downloadDocsZip")}
                    title={t("downloadDocsZip")}
                    className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
                  >
                    <Archive className="size-4" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(trip)}
                    aria-label={t("editTrip")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletePending}
                    onClick={() => setConfirmId(trip.id)}
                    aria-label={t("deleteConfirm")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmId(null);
        }}
        title={t("deleteConfirm")}
        pending={deletePending}
        onConfirm={() => {
          if (!confirmId) return;
          const fd = new FormData();
          fd.set("trip_id", confirmId);
          startTransition(() => deleteAction(fd));
          setConfirmId(null);
        }}
      />
    </div>
  );
}

function StatusBadge({ status, tripId }: { status: string; tripId: string }) {
  const t = useTranslations("Trips");
  const ts = useTranslations("TripStatus");
  const errText = useErrorText();
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
      toast.error(t("errorToast", { error: errText(state.error) }));
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
          if (form) {
            const data = new FormData(form);
            startTransition(() => formAction(data));
          }
        }}
        className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLASSES[current as keyof typeof STATUS_CLASSES] ?? STATUS_CLASSES.requested}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ts(s)}
          </option>
        ))}
      </select>
    </form>
  );
}
