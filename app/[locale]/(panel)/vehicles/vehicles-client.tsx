"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createVehicle,
  deleteVehicle,
  updateVehicle,
  type VehicleFormState,
} from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ExpiryBadge } from "@/components/expiry-badge";
import { Field as FormField } from "@/components/field";
import { useErrorText } from "@/lib/use-error-text";
import type { Database } from "@/lib/supabase/database.types";

export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

const initialState: VehicleFormState = { ok: false };

export function VehiclesClient({ vehicles }: { vehicles: VehicleRow[] }) {
  const t = useTranslations("Vehicles");
  const tc = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.plate, v.trailer_plate, v.brand, v.model].some((val) =>
        val?.toLowerCase().includes(q),
      ),
    );
  }, [vehicles, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tc("searchPlaceholder")}
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            setEditing(null);
            setOpen((v) => !v);
          }}
        >
          <Plus className="size-4" />
          {t("addVehicle")}
        </Button>
      </div>

      {(open || editing) && (
        <VehicleForm
          key={editing?.id ?? "new"}
          vehicle={editing}
          onDone={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}

      <VehicleTable
        vehicles={filtered}
        emptyText={vehicles.length > 0 ? tc("noResults") : t("noVehicles")}
        onEdit={(v) => setEditing(v)}
      />
    </div>
  );
}

function VehicleForm({
  vehicle,
  onDone,
}: {
  vehicle: VehicleRow | null;
  onDone: () => void;
}) {
  const t = useTranslations("Vehicles");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    vehicle ? updateVehicle : createVehicle,
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
      className="rounded-xl border bg-card p-6 shadow-resting"
    >
      <h2 className="mb-4 text-lg font-semibold">
        {vehicle ? t("editVehicle") : t("addVehicle")}
      </h2>
      {vehicle && <input type="hidden" name="vehicle_id" value={vehicle.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          name="plate"
          label={t("plate")}
          required
          defaultValue={vehicle?.plate}
          error={fe.plate ? errText(fe.plate) : undefined}
        />
        <Field
          name="trailer_plate"
          label={t("trailerPlate")}
          defaultValue={vehicle?.trailer_plate}
        />
        <Field name="brand" label={t("brand")} defaultValue={vehicle?.brand} />
        <Field name="model" label={t("model")} defaultValue={vehicle?.model} />
        <Field
          name="year"
          label={t("year")}
          type="number"
          defaultValue={vehicle?.year?.toString()}
          error={fe.year ? errText(fe.year) : undefined}
        />
        <Field
          name="capacity_ton"
          label={t("capacityTon")}
          type="number"
          defaultValue={vehicle?.capacity_ton?.toString()}
          error={fe.capacity_ton ? errText(fe.capacity_ton) : undefined}
        />
        <Field
          name="inspection_expiry"
          label={t("inspectionExpiry")}
          type="date"
          defaultValue={vehicle?.inspection_expiry}
        />
        <Field
          name="insurance_expiry"
          label={t("insuranceExpiry")}
          type="date"
          defaultValue={vehicle?.insurance_expiry}
        />
        <Field
          name="last_service_km"
          label={t("lastServiceKm")}
          type="number"
          defaultValue={vehicle?.last_service_km?.toString()}
        />
        <Field
          name="current_km"
          label={t("currentKm")}
          type="number"
          defaultValue={vehicle?.current_km?.toString()}
        />
      </div>
      <FormField label={t("notes")} htmlFor="notes" className="mt-4">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={vehicle?.notes ?? undefined}
        />
      </FormField>
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
    <FormField label={label} htmlFor={name} required={required} error={error}>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={!!error}
      />
    </FormField>
  );
}

function VehicleTable({
  vehicles,
  emptyText,
  onEdit,
}: {
  vehicles: VehicleRow[];
  emptyText: string;
  onEdit: (vehicle: VehicleRow) => void;
}) {
  const t = useTranslations("Vehicles");
  const errText = useErrorText();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteVehicle,
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

  if (vehicles.length === 0) {
    return <EmptyState title={emptyText} />;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("plate")}</TableHead>
            <TableHead>{t("brand")}</TableHead>
            <TableHead>{t("capacityTon")}</TableHead>
            <TableHead>{t("inspectionExpiry")}</TableHead>
            <TableHead>{t("insuranceExpiry")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v.id} className="align-top">
              <TableCell className="font-mono text-[0.8125rem] font-medium">
                <Link
                  href={`/vehicles/${v.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {v.plate}
                </Link>
                {v.trailer_plate && (
                  <div className="text-xs text-muted-foreground">
                    {v.trailer_plate}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {[v.brand, v.model].filter(Boolean).join(" ") || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {v.capacity_ton != null ? `${v.capacity_ton} TON` : "—"}
              </TableCell>
              <TableCell>
                <ExpiryBadge date={v.inspection_expiry} showOk />
              </TableCell>
              <TableCell>
                <ExpiryBadge date={v.insurance_expiry} showOk />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(v)}
                    aria-label={t("editVehicle")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletePending}
                    onClick={() => setConfirmId(v.id)}
                    aria-label={t("deleteConfirm")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          fd.set("vehicle_id", confirmId);
          startTransition(() => deleteAction(fd));
          setConfirmId(null);
        }}
      />
    </div>
  );
}
