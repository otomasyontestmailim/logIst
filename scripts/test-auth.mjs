/**
 * Auth & RLS doğrulama scripti — Playwright gerektirmez.
 * Çalıştır: node scripts/test-auth.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ---------- env yükle ----------
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim(),
    ]),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const _SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPERADMIN_PASSWORD = env.SUPERADMIN_PASSWORD; // opsiyonel

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL veya ANON_KEY bulunamadı!");
  process.exit(1);
}

// ---------- yardımcı ----------
let passed = 0;
let failed = 0;
let skipped = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}
function fail(label, detail) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
}
function skip(label, reason) {
  console.log(`  ⏭️  ${label} [atlandı: ${reason}]`);
  skipped++;
}

function newAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
}

// ---------- TEST 1: Admin girişi ----------
console.log("\n🔐 TEST 1 — Admin girişi (admin@demolojistik.com)");

const adminClient = newAnonClient();
const { data: adminSession, error: adminSignInErr } =
  await adminClient.auth.signInWithPassword({
    email: "admin@demolojistik.com",
    password: "Demo1234!",
  });

if (adminSignInErr || !adminSession?.session) {
  fail("signInWithPassword başarısız", adminSignInErr?.message);
} else {
  ok("signInWithPassword başarılı — session mevcut");
}

// role kontrolü
if (adminSession?.session) {
  const { data: adminUser, error: adminUserErr } = await adminClient
    .from("users")
    .select("role, organization_id")
    .eq("id", adminSession.session.user.id)
    .single();

  if (adminUserErr) {
    fail("public.users okunamadı", adminUserErr.message);
  } else if (adminUser?.role === "admin") {
    ok(`role = '${adminUser.role}' ✓`);
  } else {
    fail(`role beklenen 'admin', gelen '${adminUser?.role}'`);
  }

  // kendi org'unu görebiliyor mu?
  const { data: orgs, error: orgsErr } = await adminClient
    .from("organizations")
    .select("id, name");

  if (orgsErr) {
    fail("organizations SELECT hata", orgsErr.message);
  } else if (orgs && orgs.length > 0) {
    ok(`organizations SELECT → ${orgs.length} kayıt görüldü (kendi org'u)`);
  } else {
    fail("organizations SELECT → 0 kayıt (RLS sorunu olabilir)");
  }

  // admin org_id saklayalım
  var _adminOrgId = adminUser?.organization_id;
}

await adminClient.auth.signOut();

// ---------- TEST 2: Şoför girişi ----------
console.log("\n🚛 TEST 2 — Şoför girişi (sofor@demolojistik.com)");

const driverClient = newAnonClient();
const { data: driverSession, error: driverSignInErr } =
  await driverClient.auth.signInWithPassword({
    email: "sofor@demolojistik.com",
    password: "Demo1234!",
  });

if (driverSignInErr || !driverSession?.session) {
  fail("signInWithPassword başarısız", driverSignInErr?.message);
} else {
  ok("signInWithPassword başarılı — session mevcut");
}

if (driverSession?.session) {
  // role kontrolü
  const { data: driverUser, error: driverUserErr } = await driverClient
    .from("users")
    .select("role, organization_id")
    .eq("id", driverSession.session.user.id)
    .single();

  if (driverUserErr) {
    fail("public.users okunamadı", driverUserErr.message);
  } else if (driverUser?.role === "driver") {
    ok(`role = '${driverUser.role}' ✓`);
  } else {
    fail(`role beklenen 'driver', gelen '${driverUser?.role}'`);
  }

  // trips SELECT — hata vermemeli (boş dizi de kabul)
  const { data: trips, error: tripsErr } = await driverClient
    .from("trips")
    .select("id, status")
    .limit(10);

  if (tripsErr) {
    fail("trips SELECT hata attı", tripsErr.message);
  } else {
    ok(`trips SELECT → ${trips?.length ?? 0} sefer (hata yok — RLS çalışıyor)`);
  }

  // ---------- TEST 3: Çapraz tenant RLS ----------
  console.log("\n🔒 TEST 3 — Çapraz tenant RLS (şoför token'ıyla)");

  const { data: allOrgs, error: allOrgsErr } = await driverClient
    .from("organizations")
    .select("id, name");

  if (allOrgsErr) {
    // RLS erişimi tamamen engelledi → iyi
    ok(`organizations SELECT engellendi: ${allOrgsErr.message}`);
  } else if (!allOrgs || allOrgs.length === 0) {
    ok(
      "organizations SELECT → 0 kayıt (RLS kendi org'unu da gizliyor — kabul)",
    );
  } else if (allOrgs.length === 1) {
    ok(
      `organizations SELECT → yalnızca kendi org'u görüyor (${allOrgs[0].name})`,
    );
  } else {
    fail(
      `BUG: şoför ${allOrgs.length} org görüyor — çapraz tenant sızıntısı!`,
      allOrgs.map((o) => o.name).join(", "),
    );
  }
}

await driverClient.auth.signOut();

// ---------- TEST 4: Superadmin ----------
console.log("\n👑 TEST 4 — Superadmin (superadmin@qratix.com)");

if (!SUPERADMIN_PASSWORD) {
  skip("Superadmin girişi", "SUPERADMIN_PASSWORD .env.local'de tanımlı değil");
  skip("is_superadmin() RPC", "şifre yok");
  skip("Tüm organizations SELECT", "şifre yok");
} else {
  const superClient = newAnonClient();
  const { data: superSession, error: superSignInErr } =
    await superClient.auth.signInWithPassword({
      email: "superadmin@qratix.com",
      password: SUPERADMIN_PASSWORD,
    });

  if (superSignInErr || !superSession?.session) {
    fail("Superadmin girişi başarısız", superSignInErr?.message);
  } else {
    ok("Superadmin girişi başarılı");

    // is_superadmin() RPC
    const { data: isSuperAdmin, error: rpcErr } =
      await superClient.rpc("is_superadmin");

    if (rpcErr) {
      fail("is_superadmin() RPC hata", rpcErr.message);
    } else if (isSuperAdmin === true) {
      ok("is_superadmin() → true ✓");
    } else {
      fail(`is_superadmin() → ${isSuperAdmin} (true bekleniyordu)`);
    }

    // Tüm org'ları görebiliyor mu?
    const { data: allOrgs, error: allOrgsErr } = await superClient
      .from("organizations")
      .select("id, name");

    if (allOrgsErr) {
      fail("organizations SELECT hata", allOrgsErr.message);
    } else if (allOrgs && allOrgs.length >= 1) {
      ok(
        `organizations SELECT → ${allOrgs.length} org görüldü: ${allOrgs.map((o) => o.name).join(", ")}`,
      );
    } else {
      fail("organizations SELECT → 0 kayıt (superadmin hepsini görmeli)");
    }
  }

  await superClient.auth.signOut();
}

// ---------- TEST 5: Yetkisiz erişim (anon) ----------
console.log("\n🚫 TEST 5 — Yetkisiz erişim (giriş yapmadan, anon key)");

const anonClient = newAnonClient();
// session açmadan doğrudan sorgu

const { data: anonUsers, error: anonUsersErr } = await anonClient
  .from("users")
  .select("id, email, role")
  .limit(5);

if (anonUsersErr) {
  ok(`users SELECT anon'a engellendi: ${anonUsersErr.message}`);
} else if (!anonUsers || anonUsers.length === 0) {
  ok("users SELECT → 0 kayıt (RLS anon'u blokluyor)");
} else {
  fail(
    `BUG: anon ${anonUsers.length} users satırı görebiliyor!`,
    anonUsers.map((u) => u.email).join(", "),
  );
}

const { data: anonTrips, error: anonTripsErr } = await anonClient
  .from("trips")
  .select("id")
  .limit(5);

if (anonTripsErr) {
  ok(`trips SELECT anon'a engellendi: ${anonTripsErr.message}`);
} else if (!anonTrips || anonTrips.length === 0) {
  ok("trips SELECT → 0 kayıt (RLS anon'u blokluyor)");
} else {
  fail(`BUG: anon ${anonTrips.length} trips satırı görebiliyor!`);
}

const { data: anonDocs, error: anonDocsErr } = await anonClient
  .from("documents")
  .select("id")
  .limit(5);

if (anonDocsErr) {
  ok(`documents SELECT anon'a engellendi: ${anonDocsErr.message}`);
} else if (!anonDocs || anonDocs.length === 0) {
  ok("documents SELECT → 0 kayıt (RLS anon'u blokluyor)");
} else {
  fail(`BUG: anon ${anonDocs.length} documents satırı görebiliyor!`);
}

// ---------- ÖZET ----------
const total = passed + failed + skipped;
console.log("\n" + "═".repeat(50));
console.log(`📊 SONUÇ: ${passed}/${total - skipped} test geçti`);
if (skipped > 0) console.log(`   ⏭️  ${skipped} test atlandı`);
if (failed > 0) {
  console.log(`   ❌ ${failed} test BAŞARISIZ — yukarıdaki detaylara bak`);
  process.exit(1);
} else {
  console.log("   🎉 Tüm testler geçti!");
}
