"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type TripFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
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
  if (!origin) return { ok: false, error: "origin_required" };
  if (!destination) return { ok: false, error: "destination_required" };

  const admin = createAdminClient();

  const customerId = nn(formData.get("customer_id"));
  const driverId = nn(formData.get("driver_id"));

  const { error } = await admin.from("trips").insert({
    organization_id: me.organization_id,
    origin,
    destination,
    customer_id: customerId,
    driver_id: driverId,
    load_date: nn(formData.get("load_date")),
    delivery_date: nn(formData.get("delivery_date")),
    status: "created",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/[locale]/(panel)/trips", "page");
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
  if (!origin) return { ok: false, error: "origin_required" };
  if (!destination) return { ok: false, error: "destination_required" };

  const admin = createAdminClient();

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

  const { error } = await admin
    .from("trips")
    .update({
      origin,
      destination,
      customer_id: customerId,
      driver_id: driverId,
      load_date: nn(formData.get("load_date")),
      delivery_date: nn(formData.get("delivery_date")),
      status: (nn(formData.get("status")) ?? "created") as
        | "created"
        | "loaded"
        | "in_transit"
        | "delivered",
    })
    .eq("id", tripId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/[locale]/(panel)/trips", "page");
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

  const admin = createAdminClient();

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

  revalidatePath("/[locale]/(panel)/trips", "page");
  return { ok: true, message: "deleted" };
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
  if (!status) return { ok: false, error: "status_required" };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("trips")
    .select("organization_id, driver_id")
    .eq("id", tripId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  // Driver can only update their own trip status
  if (me.role === "driver" && target.driver_id !== me.id) {
    return { ok: false, error: "forbidden" };
  }

  const { error } = await admin
    .from("trips")
    .update({
      status: status as "created" | "loaded" | "in_transit" | "delivered",
    })
    .eq("id", tripId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/[locale]/(panel)/trips", "page");
  return { ok: true, message: "updated" };
}
