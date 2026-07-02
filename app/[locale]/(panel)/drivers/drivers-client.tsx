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
import { IdCard, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createDriver,
  deleteDriver,
  updateDriver,
  type DriverFormState,
} from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ExpiryBadge } from "@/components/expiry-badge";
import { Field as FormField } from "@/components/field";
import { useErrorText } from "@/lib/use-error-text";
import type { Database } from "@/lib/supabase/database.types";

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "full_name" | "email" | "phone" | "created_at"
>;
type ProfileRow = Database["public"]["Tables"]["driver_profiles"]["Row"];

export type DriverRow = UserRow & {
  profile: ProfileRow | null;
  stats: { tripCount: number; totalKm: number };
};

const initialState: DriverFormState = { ok: false };

export function DriversClient({ drivers }: { drivers: DriverRow[] }) {
  const t = useTranslations("Drivers");
  const tc = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);
  const [viewing, setViewing] = useState<DriverRow | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [d.full_name, d.email, d.phone, d.profile?.plate].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [drivers, query]);

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
          {t("addDriver")}
        </Button>
      </div>

      {(open || editing) && (
        <DriverForm
          key={editing?.id ?? "new"}
          driver={editing}
          onDone={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}

      {viewing && (
        <DriverScorecard driver={viewing} onClose={() => setViewing(null)} />
      )}

      <DriverTable
        drivers={filtered}
        emptyText={drivers.length > 0 ? tc("noResults") : t("empty")}
        onEdit={(d) => setEditing(d)}
        onView={(d) => setViewing((v) => (v?.id === d.id ? null : d))}
      />
    </div>
  );
}

function DriverForm({
  driver,
  onDone,
}: {
  driver: DriverRow | null;
  onDone: () => void;
}) {
  const t = useTranslations("Drivers");
  const errText = useErrorText();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    driver ? updateDriver : createDriver,
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

  const p = driver?.profile;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border bg-card p-6 shadow-resting"
    >
      <h2 className="mb-4 text-lg font-semibold">
        {driver ? t("editDriver") : t("newDriver")}
      </h2>
      {driver && <input type="hidden" name="driver_id" value={driver.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          name="full_name"
          label={t("fullName")}
          defaultValue={driver?.full_name}
          error={fe.full_name ? errText(fe.full_name) : undefined}
        />
        {driver ? (
          <FormField label={t("email")} htmlFor="email">
            <Input
              id="email"
              type="email"
              defaultValue={driver.email ?? undefined}
              disabled
            />
          </FormField>
        ) : (
          <Field
            name="email"
            label={t("email")}
            type="email"
            required
            error={fe.email ? errText(fe.email) : undefined}
          />
        )}
        <Field name="phone" label={t("phone")} defaultValue={driver?.phone} />
        <Field
          name="license_no"
          label={t("licenseNo")}
          defaultValue={p?.license_no}
        />
        <Field name="plate" label={t("plate")} defaultValue={p?.plate} />
        <Field
          name="trailer_no"
          label={t("trailerNo")}
          defaultValue={p?.trailer_no}
        />
        <Field
          name="src_expiry"
          label={t("srcExpiry")}
          type="date"
          defaultValue={p?.src_expiry}
        />
        <Field
          name="adr_expiry"
          label={t("adrExpiry")}
          type="date"
          defaultValue={p?.adr_expiry}
        />
        <Field
          name="psikoteknik_expiry"
          label={t("psikoteknikExpiry")}
          type="date"
          defaultValue={p?.psikoteknik_expiry}
        />
        <Field
          name="green_card_expiry"
          label={t("greenCardExpiry")}
          type="date"
          defaultValue={p?.green_card_expiry}
        />
        <Field
          name="vehicle_model"
          label={t("vehicleModel")}
          defaultValue={p?.vehicle_model}
        />
        <Field
          name="vehicle_year"
          label={t("vehicleYear")}
          type="number"
          defaultValue={p?.vehicle_year?.toString()}
          error={fe.vehicle_year ? errText(fe.vehicle_year) : undefined}
        />
        <Field
          name="capacity_ton"
          label={t("capacityTon")}
          type="number"
          defaultValue={p?.capacity_ton?.toString()}
          error={fe.capacity_ton ? errText(fe.capacity_ton) : undefined}
        />
        {!driver && (
          <FormField label={t("password")} htmlFor="password">
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="off"
            />
          </FormField>
        )}
      </div>
      {!driver && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("passwordHint")}
        </p>
      )}
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

/** soforBilgileri.png tarzı şoför karnesi: sayaçlar + araç kartı. */
function DriverScorecard({
  driver,
  onClose,
}: {
  driver: DriverRow;
  onClose: () => void;
}) {
  const t = useTranslations("Drivers");
  const format = useFormatter();
  const p = driver.profile;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-resting">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{driver.full_name}</h2>
          {driver.phone && (
            <p className="text-sm text-muted-foreground">GSM: {driver.phone}</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <ScoreRow
            label={t("tripCount")}
            value={format.number(driver.stats.tripCount)}
          />
          <ScoreRow
            label={t("totalKm")}
            value={format.number(Math.round(driver.stats.totalKm))}
          />
        </div>
        <div className="rounded-md border p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Truck className="size-4" />
            {t("vehicleInfo")}
          </div>
          <div className="space-y-1.5">
            <ScoreRow label={t("plate")} value={p?.plate ?? "—"} />
            <ScoreRow
              label={t("vehicleModel")}
              value={p?.vehicle_model ?? "—"}
            />
            <ScoreRow
              label={t("vehicleYear")}
              value={p?.vehicle_year?.toString() ?? "—"}
            />
            <ScoreRow
              label={t("capacityTon")}
              value={p?.capacity_ton != null ? `${p.capacity_ton} TON` : "—"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function DriverTable({
  drivers,
  emptyText,
  onEdit,
  onView,
}: {
  drivers: DriverRow[];
  emptyText: string;
  onEdit: (driver: DriverRow) => void;
  onView: (driver: DriverRow) => void;
}) {
  const t = useTranslations("Drivers");
  const errText = useErrorText();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDriver,
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

  if (drivers.length === 0) {
    return <EmptyState icon={Truck} title={emptyText} />;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colContact")}</TableHead>
            <TableHead>{t("colVehicle")}</TableHead>
            <TableHead>{t("colExpiries")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((d) => (
            <TableRow key={d.id} className="align-top">
              <TableCell className="font-medium">
                <Link
                  href={`/drivers/${d.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {d.full_name ?? t("noProfile")}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div>{d.email}</div>
                {d.phone && <div className="text-xs">{d.phone}</div>}
              </TableCell>
              <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">
                {d.profile?.plate ?? t("noProfile")}
                {d.profile?.trailer_no && (
                  <span className="text-xs"> / {d.profile.trailer_no}</span>
                )}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(d)}
                    aria-label={t("scorecard")}
                  >
                    <IdCard className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(d)}
                    aria-label={t("editDriver")}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletePending}
                    onClick={() => setConfirmId(d.id)}
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
          fd.set("driver_id", confirmId);
          startTransition(() => deleteAction(fd));
          setConfirmId(null);
        }}
      />
    </div>
  );
}
