// Tek seferlik seed: Demo org + admin + şoför kullanıcısı oluşturur.
// Çalıştır: node scripts/seed-demo-org.mjs
// Bitti mi? Sil: del scripts\seed-demo-org.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim(),
    ]),
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

// ---------- 1. Organizasyon ----------
const { data: org, error: orgErr } = await admin
  .from("organizations")
  .insert({ name: "Demo Lojistik A.Ş.", plan: "free" })
  .select()
  .single();

if (orgErr) {
  console.error("ORG HATA:", orgErr.message);
  process.exit(1);
}
console.log("✓ Org oluşturuldu:", org.id, org.name);

// ---------- 2. Firma admini ----------
const { data: adminAuth, error: adminAuthErr } =
  await admin.auth.admin.createUser({
    email: "admin@demolojistik.com",
    password: "Demo1234!",
    email_confirm: true,
  });

if (adminAuthErr) {
  console.error("ADMİN AUTH HATA:", adminAuthErr.message);
  process.exit(1);
}
console.log("✓ Admin auth kullanıcısı:", adminAuth.user.id);

const { error: adminProfileErr } = await admin.from("users").insert({
  id: adminAuth.user.id,
  organization_id: org.id,
  role: "admin",
  full_name: "Demo Admin",
  email: "admin@demolojistik.com",
});

if (adminProfileErr) {
  console.error("ADMİN PROFİL HATA:", adminProfileErr.message);
  process.exit(1);
}
console.log("✓ Admin profili eklendi → rol: admin");

// ---------- 3. Şoför ----------
const { data: driverAuth, error: driverAuthErr } =
  await admin.auth.admin.createUser({
    email: "sofor@demolojistik.com",
    password: "Demo1234!",
    email_confirm: true,
  });

if (driverAuthErr) {
  console.error("ŞOFÖR AUTH HATA:", driverAuthErr.message);
  process.exit(1);
}
console.log("✓ Şoför auth kullanıcısı:", driverAuth.user.id);

const { error: driverProfileErr } = await admin.from("users").insert({
  id: driverAuth.user.id,
  organization_id: org.id,
  role: "driver",
  full_name: "Demo Şoför",
  email: "sofor@demolojistik.com",
});

if (driverProfileErr) {
  console.error("ŞOFÖR PROFİL HATA:", driverProfileErr.message);
  process.exit(1);
}
console.log("✓ Şoför profili eklendi → rol: driver");

console.log("\n--- ÖZET ---");
console.log("Org ID    :", org.id);
console.log("Admin     : admin@demolojistik.com / Demo1234!");
console.log("Şoför     : sofor@demolojistik.com / Demo1234!");
console.log(
  "\nBu scripti şimdi silebilirsiniz: del scripts\\seed-demo-org.mjs",
);
