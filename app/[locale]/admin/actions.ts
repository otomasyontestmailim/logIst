"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";

export type OrgFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  orgId?: string;
  adminEmail?: string;
  tempPassword?: string;
};

function nn(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function generatePassword(): string {
  // Confusing chars excluded: 0 O o 1 l L I i
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let password = "";
  for (const byte of bytes) {
    password += chars[byte % chars.length];
  }
  return password;
}

/**
 * Yeni firma (org) + firma admini oluşturur.
 * Yalnızca superadmin çağırabilir.
 * Hata durumunda kısmi kayıtları geri alır (orphan bırakmaz).
 */
export async function createOrganization(
  _prev: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const me = await getCurrentUser();
  if (!me?.is_superadmin) {
    return { ok: false, error: "unauthorized" };
  }

  const orgName = nn(formData.get("org_name"));
  const taxNo = nn(formData.get("tax_no"));
  const adminEmail = nn(formData.get("admin_email"));
  const adminFullName = nn(formData.get("admin_full_name"));

  if (!orgName) return { ok: false, error: "name_required" };
  if (!adminEmail) return { ok: false, error: "email_required" };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  // 1) organizations INSERT
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, tax_no: taxNo })
    .select("id")
    .single();
  if (orgErr || !org) {
    return { ok: false, error: orgErr?.message ?? "org_create_failed" };
  }
  const orgId = org.id;

  // 2) auth.users createUser
  const tempPassword = generatePassword();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: adminFullName },
  });
  if (authErr || !created.user) {
    await admin.from("organizations").delete().eq("id", orgId);
    return { ok: false, error: authErr?.message ?? "auth_create_failed" };
  }
  const uid = created.user.id;

  // 3) public.users INSERT (role = admin)
  const { error: userErr } = await admin.from("users").insert({
    id: uid,
    organization_id: orgId,
    role: "admin",
    full_name: adminFullName,
    email: adminEmail,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(uid);
    await admin.from("organizations").delete().eq("id", orgId);
    return { ok: false, error: userErr.message };
  }

  revalidatePath("/[locale]/admin", "page");
  return { ok: true, message: "created", orgId, adminEmail, tempPassword };
}
