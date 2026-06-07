"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type DriverFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/** Boş string'i null'a çevirir (date/text opsiyonel alanlar için). */
function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/**
 * Yeni şoför oluşturur: auth.users + public.users (role=driver) + driver_profiles.
 * Yalnızca admin/dispatcher çağırabilir; şoför çağıranın firmasına bağlanır.
 */
export async function createDriver(
  _prev: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const email = nn(formData.get("email"));
  const fullName = nn(formData.get("full_name"));
  if (!email) return { ok: false, error: "email_required" };

  // Parola verilmezse rastgele üret — şoför magic link ile de girebilir.
  const password =
    nn(formData.get("password")) ?? crypto.randomUUID().slice(0, 16) + "Aa1!";

  const admin = createAdminClient();

  // 1) auth.users
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "auth_create_failed" };
  }
  const uid = created.user.id;

  // 2) public.users (rol = driver, firma = çağıranın firması)
  const { error: userErr } = await admin.from("users").insert({
    id: uid,
    organization_id: me.organization_id,
    role: "driver",
    full_name: fullName,
    email,
    phone: nn(formData.get("phone")),
  });
  if (userErr) {
    // auth user'ı temizle (orphan kalmasın)
    await admin.auth.admin.deleteUser(uid);
    return { ok: false, error: userErr.message };
  }

  // 3) driver_profiles
  const { error: profErr } = await admin.from("driver_profiles").insert({
    user_id: uid,
    license_no: nn(formData.get("license_no")),
    plate: nn(formData.get("plate")),
    trailer_no: nn(formData.get("trailer_no")),
    src_expiry: nn(formData.get("src_expiry")),
    adr_expiry: nn(formData.get("adr_expiry")),
    psikoteknik_expiry: nn(formData.get("psikoteknik_expiry")),
    green_card_expiry: nn(formData.get("green_card_expiry")),
  });
  if (profErr) {
    return { ok: false, error: profErr.message };
  }

  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "created" };
}

/** Şoförü siler (auth.users silinince public.users + driver_profiles cascade). */
export async function deleteDriver(
  _prev: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin") return { ok: false, error: "forbidden" };

  const driverId = nn(formData.get("driver_id"));
  if (!driverId) return { ok: false, error: "id_required" };

  const admin = createAdminClient();

  // Çapraz-tenant silmeyi engelle: şoför çağıranın firmasında mı?
  const { data: target } = await admin
    .from("users")
    .select("organization_id, role")
    .eq("id", driverId)
    .single();
  if (!target || target.organization_id !== me.organization_id) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await admin.auth.admin.deleteUser(driverId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "deleted" };
}
