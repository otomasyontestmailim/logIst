// Geçici teşhis: service-role ile tablo içeriklerini listeler.
// Çalıştır: node scripts/debug-db.mjs
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

const tables = [
  "organizations",
  "users",
  "driver_profiles",
  "customers",
  "trips",
  "documents",
];
for (const t of tables) {
  const { data, error, count } = await admin
    .from(t)
    .select("*", { count: "exact" })
    .limit(5);
  console.log(`\n=== ${t} (count: ${count}) ===`);
  if (error) console.log("ERROR:", error.message);
  else console.log(JSON.stringify(data, null, 1));
}

// auth kullanıcıları
const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers();
console.log("\n=== auth.users ===");
if (authErr) console.log("ERROR:", authErr.message);
else console.log(authUsers.users.map((u) => ({ id: u.id, email: u.email })));
