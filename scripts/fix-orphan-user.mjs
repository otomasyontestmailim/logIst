// Tek seferlik onarım: public.users satırı olmayan auth kullanıcısını
// (tst@tst.com) demo firmaya admin olarak bağlar.
// Çalıştır: node scripts/fix-orphan-user.mjs
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

const ORG_ID = "5192e158-8e88-4253-9353-3f1abf31d53a"; // Demo Lojistik A.Ş.
const USER_ID = "b02949a6-bdb3-4bc2-ba76-e42e2712b8a4"; // tst@tst.com

const { error } = await admin.from("users").insert({
  id: USER_ID,
  organization_id: ORG_ID,
  role: "admin",
  full_name: "Test Admin",
  email: "tst@tst.com",
});

if (error) console.log("ERROR:", error.message);
else console.log("OK: tst@tst.com artık Demo Lojistik A.Ş. admini.");
