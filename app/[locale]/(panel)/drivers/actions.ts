"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { adminClientOrNull } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import {
  vRequired,
  vEmail,
  vNumber,
  hasErrors,
  type FieldErrors,
} from "@/lib/validate";
import { sendEmail, driverInviteEmail, expiryReminderEmail } from "@/lib/email";

export type DriverFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type InviteDriverState = DriverFormState & { password?: string };

/** Boş string'i null'a çevirir (date/text opsiyonel alanlar için). */
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

  const fieldErrors: FieldErrors = {};
  const emailReq = vRequired(email, "email_required");
  if (emailReq) fieldErrors.email = emailReq;
  else {
    const emailFmt = vEmail(email);
    if (emailFmt) fieldErrors.email = emailFmt;
  }
  const yearErr = vNumber(formData.get("vehicle_year")?.toString());
  if (yearErr) fieldErrors.vehicle_year = yearErr;
  const capErr = vNumber(formData.get("capacity_ton")?.toString());
  if (capErr) fieldErrors.capacity_ton = capErr;
  if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

  // Parola verilmezse rastgele üret — şoför magic link ile de girebilir.
  const password =
    nn(formData.get("password")) ?? crypto.randomUUID().slice(0, 16) + "Aa1!";

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  // TypeScript narrowing: validation above ensures email is non-null at this point
  const safeEmail = email as string;

  // 1) auth.users
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: safeEmail,
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
    email: safeEmail,
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
    vehicle_model: nn(formData.get("vehicle_model")),
    vehicle_year: num(formData.get("vehicle_year")),
    capacity_ton: num(formData.get("capacity_ton")),
  });
  if (profErr) {
    return { ok: false, error: profErr.message };
  }

  await logAudit(me, {
    action: "driver.create",
    entity: "users",
    entityId: uid,
  });
  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "created" };
}

/**
 * Yalnızca e-posta + ad ile şoför davet eder; geçici şifreyi döndürür.
 * createDriver'dan farkı: şifre response'da döner, driver_profiles satırı oluşturulmaz.
 */
export async function inviteDriver(
  _prev: DriverFormState,
  formData: FormData,
): Promise<DriverFormState & { password?: string }> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) {
    return { ok: false, error: "unauthorized" };
  }
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const email = nn(formData.get("email"));
  const fullName = nn(formData.get("full_name"));

  const inviteFieldErrors: FieldErrors = {};
  const invEmailReq = vRequired(email, "email_required");
  if (invEmailReq) inviteFieldErrors.email = invEmailReq;
  else {
    const invEmailFmt = vEmail(email);
    if (invEmailFmt) inviteFieldErrors.email = invEmailFmt;
  }
  const invNameReq = vRequired(fullName, "name_required");
  if (invNameReq) inviteFieldErrors.full_name = invNameReq;
  if (hasErrors(inviteFieldErrors))
    return { ok: false, fieldErrors: inviteFieldErrors };

  // TypeScript narrowing: validation above ensures email/fullName are non-null at this point
  const safeInvEmail = email as string;
  const safeFullName = fullName as string;

  const password = crypto.randomUUID().slice(0, 8) + "Aa1!";

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: safeInvEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: safeFullName },
  });
  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "auth_create_failed" };
  }
  const uid = created.user.id;

  const { error: userErr } = await admin.from("users").insert({
    id: uid,
    organization_id: me.organization_id,
    role: "driver",
    full_name: safeFullName,
    email: safeInvEmail,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(uid);
    return { ok: false, error: userErr.message };
  }

  // Boş profil satırı oluştur (sayfa açıldığında profil yoksa hata almamak için)
  await admin.from("driver_profiles").insert({ user_id: uid });

  await logAudit(me, {
    action: "driver.invite",
    entity: "users",
    entityId: uid,
  });

  // E-posta gönder (RESEND_API_KEY tanımlıysa — yoksa sessizce atla)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/[^/]*$/, "") ??
    "";
  const { data: orgData } = await admin
    .from("organizations")
    .select("name")
    .eq("id", me.organization_id)
    .single();
  const emailPayload = driverInviteEmail({
    orgName: orgData?.name ?? "Lojistik CRM",
    driverName: safeFullName,
    email: safeInvEmail,
    password,
    appUrl,
  });
  await sendEmail({ to: safeInvEmail, ...emailPayload });

  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "invited", password };
}

/**
 * Şoför bilgilerini günceller: public.users (ad/telefon) + driver_profiles (upsert).
 * E-posta değişikliği MVP'de yok. Yalnızca admin/dispatcher, kendi firmasındaki şoför için.
 */
export async function updateDriver(
  _prev: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const driverId = nn(formData.get("driver_id"));
  if (!driverId) return { ok: false, error: "id_required" };

  const updFieldErrors: FieldErrors = {};
  const updYearErr = vNumber(formData.get("vehicle_year")?.toString());
  if (updYearErr) updFieldErrors.vehicle_year = updYearErr;
  const updCapErr = vNumber(formData.get("capacity_ton")?.toString());
  if (updCapErr) updFieldErrors.capacity_ton = updCapErr;
  if (hasErrors(updFieldErrors))
    return { ok: false, fieldErrors: updFieldErrors };

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  // Çapraz-tenant güncellemeyi engelle + hedef gerçekten şoför mü?
  const { data: target } = await admin
    .from("users")
    .select("organization_id, role")
    .eq("id", driverId)
    .single();
  if (
    !target ||
    target.organization_id !== me.organization_id ||
    target.role !== "driver"
  ) {
    return { ok: false, error: "not_found" };
  }

  const { error: userErr } = await admin
    .from("users")
    .update({
      full_name: nn(formData.get("full_name")),
      phone: nn(formData.get("phone")),
    })
    .eq("id", driverId);
  if (userErr) return { ok: false, error: userErr.message };

  // Profili olmayan eski kayıtlar için upsert
  const { error: profErr } = await admin.from("driver_profiles").upsert({
    user_id: driverId,
    license_no: nn(formData.get("license_no")),
    plate: nn(formData.get("plate")),
    trailer_no: nn(formData.get("trailer_no")),
    src_expiry: nn(formData.get("src_expiry")),
    adr_expiry: nn(formData.get("adr_expiry")),
    psikoteknik_expiry: nn(formData.get("psikoteknik_expiry")),
    green_card_expiry: nn(formData.get("green_card_expiry")),
    vehicle_model: nn(formData.get("vehicle_model")),
    vehicle_year: num(formData.get("vehicle_year")),
    capacity_ton: num(formData.get("capacity_ton")),
  });
  if (profErr) return { ok: false, error: profErr.message };

  await logAudit(me, {
    action: "driver.update",
    entity: "users",
    entityId: driverId,
  });
  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "updated" };
}

// ─── Expiry reminders ────────────────────────────────────────────────────────

export type ExpiryReminderState = {
  ok: boolean;
  error?: string;
  message?: string;
  count?: number;
};

const EXPIRY_DOC_LABELS = [
  { key: "src_expiry" as const, label: "SRC" },
  { key: "adr_expiry" as const, label: "ADR" },
  { key: "psikoteknik_expiry" as const, label: "Psikoteknik" },
  { key: "green_card_expiry" as const, label: "Yeşil Kart" },
] satisfies {
  key: keyof {
    src_expiry: unknown;
    adr_expiry: unknown;
    psikoteknik_expiry: unknown;
    green_card_expiry: unknown;
  };
  label: string;
}[];

/**
 * Org içindeki şoförlerin süresi 30 gün içinde dolacak belgelerini bulur
 * ve admin'e (çağıran kullanıcı) Resend ile özet e-posta gönderir.
 */
export async function sendExpiryReminders(
  _prev: ExpiryReminderState,
  _formData: FormData,
): Promise<ExpiryReminderState> {
  const me = await getCurrentUser();
  if (!me || !me.organization_id) return { ok: false, error: "unauthorized" };
  if (me.role !== "admin" && me.role !== "dispatcher") {
    return { ok: false, error: "forbidden" };
  }

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

  // 1. Org'daki tüm şoförleri getir
  const { data: drivers, error: driversErr } = await admin
    .from("users")
    .select("id, full_name, email")
    .eq("organization_id", me.organization_id)
    .eq("role", "driver");

  if (driversErr) return { ok: false, error: driversErr.message };
  if (!drivers?.length) return { ok: true, message: "no_expiring", count: 0 };

  // 2. Profillerini getir
  const { data: profiles, error: profErr } = await admin
    .from("driver_profiles")
    .select(
      "user_id, src_expiry, adr_expiry, psikoteknik_expiry, green_card_expiry",
    )
    .in(
      "user_id",
      drivers.map((d) => d.id),
    );

  if (profErr) return { ok: false, error: profErr.message };

  // 3. 30 gün içinde dolanları bul
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 30);
  const todayStr = today.toISOString().split("T")[0]!;
  const cutoffStr = cutoff.toISOString().split("T")[0]!;

  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const expiring: Array<{
    driverName: string;
    docType: string;
    expiry: string;
    daysLeft: number;
  }> = [];

  for (const profile of profiles ?? []) {
    const driver = driverMap.get(profile.user_id);
    if (!driver) continue;
    const driverName = driver.full_name ?? driver.email ?? "—";

    for (const { key, label } of EXPIRY_DOC_LABELS) {
      const exp = profile[key];
      if (!exp || exp < todayStr || exp > cutoffStr) continue;
      const daysLeft = Math.ceil(
        (new Date(exp + "T00:00:00").getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      expiring.push({ driverName, docType: label, expiry: exp, daysLeft });
    }
  }

  if (expiring.length === 0)
    return { ok: true, message: "no_expiring", count: 0 };

  // 4. Org adını getir + e-posta gönder
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", me.organization_id)
    .single();

  const adminEmail = me.authEmail;
  if (!adminEmail) return { ok: false, error: "admin_no_email" };

  const emailPayload = expiryReminderEmail({
    orgName: org?.name ?? "Lojistik CRM",
    adminName: me.full_name ?? adminEmail,
    items: expiring,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  });

  const result = await sendEmail({ to: adminEmail, ...emailPayload });
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, message: "sent", count: expiring.length };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

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

  const admin = adminClientOrNull();
  if (!admin) return { ok: false, error: "server_misconfigured" };

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

  await logAudit(me, {
    action: "driver.delete",
    entity: "users",
    entityId: driverId,
  });
  revalidatePath("/[locale]/drivers", "page");
  return { ok: true, message: "deleted" };
}
