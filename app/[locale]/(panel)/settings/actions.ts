"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export type SettingsFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/** Kullanıcının kendi adını günceller. */
export async function updateProfile(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "unauthorized" };

  const fullName = nn(formData.get("full_name"));

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { error } = await admin
    .from("users")
    .update({ full_name: fullName })
    .eq("id", me.id);

  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "profile.update",
    entity: "users",
    entityId: me.id,
  });
  revalidatePath("/[locale]/settings", "page");
  return { ok: true, message: "updated" };
}

/** Organizasyon adı ve vergi numarasını günceller. Yalnızca admin. */
export async function updateOrg(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin") return { ok: false, error: "forbidden" };

  const name = nn(formData.get("org_name"));
  const taxNo = nn(formData.get("tax_no"));
  if (!name) return { ok: false, error: "name_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { error } = await admin
    .from("organizations")
    .update({ name, tax_no: taxNo })
    .eq("id", me.organization_id);

  if (error) return { ok: false, error: error.message };

  await logAudit(me, {
    action: "org.update",
    entity: "organizations",
    entityId: me.organization_id,
  });
  revalidatePath("/[locale]/settings", "page");
  return { ok: true, message: "updated" };
}

/** Kullanıcının parolasını günceller (Supabase Auth üzerinden). */
export async function updatePassword(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "unauthorized" };

  const newPassword = nn(formData.get("new_password"));
  const confirm = nn(formData.get("confirm_password"));

  if (!newPassword) return { ok: false, error: "name_required" };
  if (newPassword !== confirm)
    return { ok: false, error: "passwords_mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "password_updated" };
}
