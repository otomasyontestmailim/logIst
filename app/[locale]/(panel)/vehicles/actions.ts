"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import {
  vRequired,
  vNumber,
  hasErrors,
  type FieldErrors,
} from "@/lib/validate";

export type VehicleFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = nn(v);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Formdan araç alanlarını toplar (create + update ortak). */
function vehicleFields(formData: FormData) {
  return {
    trailer_plate: nn(formData.get("trailer_plate")),
    brand: nn(formData.get("brand")),
    model: nn(formData.get("model")),
    year: num(formData.get("year")),
    capacity_ton: num(formData.get("capacity_ton")),
    inspection_expiry: nn(formData.get("inspection_expiry")),
    insurance_expiry: nn(formData.get("insurance_expiry")),
    last_service_km: num(formData.get("last_service_km")),
    current_km: num(formData.get("current_km")),
    notes: nn(formData.get("notes")),
  };
}

export async function createVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const plate = nn(formData.get("plate"));
  const fieldErrors: FieldErrors = {};
  const plateErr = vRequired(plate, "plate_required");
  if (plateErr) fieldErrors.plate = plateErr;
  const yearErr = vNumber(formData.get("year")?.toString());
  if (yearErr) fieldErrors.year = yearErr;
  const capErr = vNumber(formData.get("capacity_ton")?.toString());
  if (capErr) fieldErrors.capacity_ton = capErr;
  if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: inserted, error } = await admin
    .from("vehicles")
    .insert({
      organization_id: me.organization_id,
      plate: plate as string,
      ...vehicleFields(formData),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "vehicle.create",
    entity: "vehicles",
    entityId: inserted?.id,
  });
  revalidatePath("/[locale]/vehicles", "page");
  return { ok: true, message: "created" };
}

export async function updateVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const vehicleId = nn(formData.get("vehicle_id"));
  const plate = nn(formData.get("plate"));
  if (!vehicleId) return { ok: false, error: "id_required" };

  const fieldErrors: FieldErrors = {};
  const plateErr = vRequired(plate, "plate_required");
  if (plateErr) fieldErrors.plate = plateErr;
  const yearErr = vNumber(formData.get("year")?.toString());
  if (yearErr) fieldErrors.year = yearErr;
  const capErr = vNumber(formData.get("capacity_ton")?.toString());
  if (capErr) fieldErrors.capacity_ton = capErr;
  if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("vehicles")
    .select("organization_id")
    .eq("id", vehicleId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin
    .from("vehicles")
    .update({
      plate: plate as string,
      ...vehicleFields(formData),
    })
    .eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "vehicle.update",
    entity: "vehicles",
    entityId: vehicleId,
  });
  revalidatePath("/[locale]/vehicles", "page");
  return { ok: true, message: "updated" };
}

export async function deleteVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin") return { ok: false, error: "forbidden" };

  const vehicleId = nn(formData.get("vehicle_id"));
  if (!vehicleId) return { ok: false, error: "id_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("vehicles")
    .select("organization_id")
    .eq("id", vehicleId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin.from("vehicles").delete().eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "vehicle.delete",
    entity: "vehicles",
    entityId: vehicleId,
  });
  revalidatePath("/[locale]/vehicles", "page");
  return { ok: true, message: "deleted" };
}
