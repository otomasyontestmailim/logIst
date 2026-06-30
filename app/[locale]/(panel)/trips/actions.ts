"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { canTransition, isTripStatus } from "@/lib/trip-status";
import { vRequired, hasErrors, type FieldErrors } from "@/lib/validate";

export type TripFormState = {
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

/** 0-100 arası tam sayıya sıkıştırır (akaryakıt yüzdesi). */
function pct(v: FormDataEntryValue | null): number | null {
  const n = num(v);
  if (n === null) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Formdan yük bilgisi alanlarını toplar (create + update ortak). */
function cargoFields(formData: FormData) {
  return {
    cargo_type: nn(formData.get("cargo_type")),
    loading_type: nn(formData.get("loading_type")),
    tonnage_kg: num(formData.get("tonnage_kg")),
    body_type: nn(formData.get("body_type")),
    tracking_no: nn(formData.get("tracking_no")),
    distance_km: num(formData.get("distance_km")),
    notes: nn(formData.get("notes")),
    freight_amount: num(formData.get("freight_amount")),
    freight_currency: nn(formData.get("freight_currency")) ?? "EUR",
    invoice_status: nn(formData.get("invoice_status")) ?? "draft",
    invoice_direction: nn(formData.get("invoice_direction")) ?? "outgoing",
    fuel_level: pct(formData.get("fuel_level")),
    trip_no: nn(formData.get("trip_no")),
  };
}

export async function createTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const origin = nn(formData.get("origin"));
  const destination = nn(formData.get("destination"));

  const createFieldErrors: FieldErrors = {};
  const origErr = vRequired(origin, "origin_required");
  if (origErr) createFieldErrors.origin = origErr;
  const destErr = vRequired(destination, "destination_required");
  if (destErr) createFieldErrors.destination = destErr;
  if (hasErrors(createFieldErrors))
    return { ok: false, fieldErrors: createFieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const customerId = nn(formData.get("customer_id"));
  const driverId = nn(formData.get("driver_id"));
  const vehicleId = nn(formData.get("vehicle_id"));

  const { data: inserted, error } = await admin
    .from("trips")
    .insert({
      organization_id: me.organization_id,
      origin,
      destination,
      customer_id: customerId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      load_date: nn(formData.get("load_date")),
      delivery_date: nn(formData.get("delivery_date")),
      status: driverId ? "driver_approval" : "requested",
      ...cargoFields(formData),
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: "trip.create",
    entity: "trips",
    entityId: inserted?.id,
  });
  revalidatePath("/[locale]/trips", "page");
  return { ok: true, message: "created" };
}

export async function updateTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const tripId = nn(formData.get("trip_id"));
  const origin = nn(formData.get("origin"));
  const destination = nn(formData.get("destination"));

  if (!tripId) return { ok: false, error: "id_required" };

  const updateFieldErrors: FieldErrors = {};
  const updOrigErr = vRequired(origin, "origin_required");
  if (updOrigErr) updateFieldErrors.origin = updOrigErr;
  const updDestErr = vRequired(destination, "destination_required");
  if (updDestErr) updateFieldErrors.destination = updDestErr;
  if (hasErrors(updateFieldErrors))
    return { ok: false, fieldErrors: updateFieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("trips")
    .select("organization_id")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const customerId = nn(formData.get("customer_id"));
  const driverId = nn(formData.get("driver_id"));
  const vehicleId = nn(formData.get("vehicle_id"));

  const { error } = await admin
    .from("trips")
    .update({
      origin,
      destination,
      customer_id: customerId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      load_date: nn(formData.get("load_date")),
      delivery_date: nn(formData.get("delivery_date")),
      ...cargoFields(formData),
      status: (() => {
        const s = nn(formData.get("status")) ?? "requested";
        return isTripStatus(s) ? s : "requested";
      })(),
    })
    .eq("id", tripId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: "trip.update",
    entity: "trips",
    entityId: tripId,
  });
  revalidatePath("/[locale]/trips", "page");
  return { ok: true, message: "updated" };
}

export async function deleteTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin") return { ok: false, error: "forbidden" };

  const tripId = nn(formData.get("trip_id"));
  if (!tripId) return { ok: false, error: "id_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("trips")
    .select("organization_id")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin.from("trips").delete().eq("id", tripId);
  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "trip.delete",
    entity: "trips",
    entityId: tripId,
  });
  revalidatePath("/[locale]/trips", "page");
  return { ok: true, message: "deleted" };
}

/** Durakları toplu kaydeder: mevcutları siler, formdan gelen listeyi ekler. */
export async function saveTripStops(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const tripId = nn(formData.get("trip_id"));
  const raw = nn(formData.get("stops"));
  if (!tripId) return { ok: false, error: "id_required" };

  type StopInput = {
    stop_type: "pickup" | "delivery";
    address: string;
    planned_at: string;
  };
  let stops: StopInput[] = [];
  try {
    stops = raw ? (JSON.parse(raw) as StopInput[]) : [];
  } catch {
    return { ok: false, error: "invalid_stops" };
  }

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("trips")
    .select("organization_id")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error: delError } = await admin
    .from("trip_stops")
    .delete()
    .eq("trip_id", tripId);
  if (delError) return { ok: false, error: delError.message };

  if (stops.length > 0) {
    const rows = stops
      .filter((s) => s.stop_type === "pickup" || s.stop_type === "delivery")
      .map((s, i) => ({
        organization_id: me.organization_id!,
        trip_id: tripId,
        seq: i + 1,
        stop_type: s.stop_type,
        address: s.address?.trim() || null,
        planned_at: s.planned_at?.trim() || null,
      }));
    const { error } = await admin.from("trip_stops").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: "trip.stops_save",
    entity: "trips",
    entityId: tripId,
  });
  revalidatePath("/[locale]/trips", "page");
  revalidatePath("/[locale]/driver", "page");
  return { ok: true, message: "stops_saved" };
}

export async function updateTripStatus(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }

  const tripId = nn(formData.get("trip_id"));
  const status = nn(formData.get("status"));
  if (!tripId) return { ok: false, error: "id_required" };
  if (!status || !isTripStatus(status)) {
    return { ok: false, error: "status_required" };
  }

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("trips")
    .select("organization_id, driver_id, status")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  // Driver can only update their own trip status, and only along the
  // defined flow (accept → loading → in_transit → delivering → approval).
  // Admin/dispatcher panelden serbest düzeltme yapabilir.
  if (me.role === "driver") {
    if (target.driver_id !== me.id) {
      return { ok: false, error: "forbidden" };
    }
    if (!canTransition("driver", target.status, status)) {
      return { ok: false, error: "invalid_transition" };
    }
  }

  const { error } = await admin
    .from("trips")
    .update({ status })
    .eq("id", tripId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit(me, {
    action: `trip.status.${status}`,
    entity: "trips",
    entityId: tripId,
  });
  revalidatePath("/[locale]/trips", "page");
  revalidatePath("/[locale]/driver", "page");
  return { ok: true, message: "updated" };
}

/**
 * Sefer mesajı gönderir. Admin/dispatcher firmadaki tüm seferlere; şoför
 * yalnızca kendine atanan sefere mesaj gönderebilir. Panel ve şoför
 * tarafında aynı action kullanılır.
 */
export async function sendTripMessage(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }

  const tripId = nn(formData.get("trip_id"));
  const content = nn(formData.get("content"));
  if (!tripId) return { ok: false, error: "id_required" };

  const fieldErrors: FieldErrors = {};
  const contentErr = vRequired(content, "content_required");
  if (contentErr) fieldErrors.content = contentErr;
  if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: target } = await admin
    .from("trips")
    .select("organization_id, driver_id")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }
  if (me.role === "driver" && target.driver_id !== me.id) {
    return { ok: false, error: "forbidden" };
  }

  const { error } = await admin.from("trip_messages").insert({
    organization_id: me.organization_id,
    trip_id: tripId,
    sender_id: me.id,
    content: content as string,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/trips/[id]", "page");
  revalidatePath("/[locale]/driver", "page");
  return { ok: true, message: "sent" };
}
