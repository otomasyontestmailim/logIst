# Proje Durumu — Lojistik CRM

> Son güncelleme: 2026-06-24 · Session başında oku, sonda güncelle.

---

## Tamamlanan Fazlar

| Faz | Açıklama                                                             | Durum |
| --- | -------------------------------------------------------------------- | ----- |
| 0   | Next.js + Tailwind + shadcn + Supabase kurulum                       | ✓     |
| 1   | Şoför yönetimi (CRUD + belge süre rozetleri)                         | ✓     |
| 2   | Müşteri + Sefer yönetimi                                             | ✓     |
| 2.5 | TIRPORT pipeline (7 aşama, harita, canlı konum)                      | ✓     |
| 3   | Şoför mobil (PWA) belge yükleme — basit upload ✓, jscanify/offline ✗ | Kısmi |
| 4   | Belge gelen kutusu + onay/red + Claude Vision OCR (`lib/ocr.ts`)     | ✓     |
| 5   | Belge süresi uyarıları, CSV/ZIP dışa aktarma, audit log              | Kısmi |

---

## Aktif Teknik Borçlar

- [ ] jscanify / kamera kenar-tespit (Faz 3 tam)
- [ ] Offline kuyruğu (IndexedDB + background sync)
- [x] OCR: Claude Vision → `documents.ocr_data` — `lib/ocr.ts` + `extractDocument` action ✓
- [ ] PDF rapor (Faz 5)
- [ ] Şoför davet/onboarding akışı
- [ ] E-posta SMTP yapılandırması
- [ ] Zod şema + inline alan hataları; liste pagination
- [ ] Süper admin firma açma / abonelik yönetimi UI

---

## Superadmin

- `superadmin@qratix.com` — `platform_admins` tablosunda, public.users satırı YOK
- Yetki: `is_superadmin()` security-definer fonksiyon → tüm RLS policy'lerde OR
- Migration'lar: 0004 (tablo), 0005 (policy genişletme), 0006 (storage)
- **DB'de uygulandı:** 0004–0006 elle SQL Editor'dan uygulandı (2026-06-23)

## Demo Firma / Kullanıcılar

- Org: "Demo Lojistik" — `organizations` tablosunda
- Admin: `admin@demolojistik.com` / Demo1234!
- Şoför: `sofor@demolojistik.com` / Demo1234!

---

## Auth & RLS Test Sonuçları (2026-06-24)

`node scripts/test-auth.mjs` — **10/10 geçti, 3 atlandı**

| #   | Test                                                     | Sonuç      |
| --- | -------------------------------------------------------- | ---------- |
| 1   | Admin girişi + role kontrolü + org SELECT                | ✅         |
| 2   | Şoför girişi + role kontrolü + trips SELECT              | ✅         |
| 3   | Çapraz tenant RLS (şoför yalnızca kendi org'unu görüyor) | ✅         |
| 4   | Superadmin (SUPERADMIN_PASSWORD env'de yok)              | ⏭️ atlandı |
| 5   | Anon erişim: users/trips/documents SELECT → 0 kayıt      | ✅         |

**Bug yok.** RLS doğru çalışıyor. Script: `scripts/test-auth.mjs` (silinmeyecek).

---

## Son Session (2026-06-24, ikinci) — Superadmin paneli

> Sorun: superadmin ile girince "firmaya bağlı değil" uyarısı (public.users satırı
> olmadığı için). Çözüm: superadmin'i panel yerine /admin'e yönlendir.
> **DURUM: doğrulandı + commit `3b80927` + origin/main'e push edildi (2026-06-24).**

- `lib/auth.ts`: `getCurrentUser()` → `is_superadmin` RPC paralel çağrılıyor;
  `CurrentUser.is_superadmin: boolean` eklendi
- `app/[locale]/(panel)/layout.tsx`: superadmin ise org/rol uyarısından ÖNCE
  `/admin`'e redirect
- `app/[locale]/admin/layout.tsx` (YENİ): yalnız superadmin geçer, değilse
  /dashboard'a döner; Shield başlık + locale switcher + çıkış
- `app/[locale]/admin/page.tsx` (YENİ): service-role client (RLS bypass — superadmin
  current_org_id() NULL) ile TÜM org'ları listeler (ad, vergi no, plan, kullanıcı
  sayısı, kayıt tarihi). Henüz salt-okunur; yeni firma OLUŞTURMA formu YOK.
- `messages/{tr,en,nl}.json`: `Admin` namespace (9 anahtar, 3 dil eşit = 314 anahtar)
- `scripts/test-auth.mjs`: lint düzeltmesi (kullanılmayan `_SERVICE_KEY`, `_adminOrgId`)
- `npm run check` ✓ + `npm run test` 26/26 ✓

### Superadmin paneli — kalan iş (sıradaki)

- [x] Tarayıcı testi: superadmin@qratix.com → /admin'e düşüyor (kullanıcı doğruladı)
- [ ] "Yeni firma + admin oluştur" formu (service-role action: org INSERT + admin
      auth.users + public.users role=admin + app_metadata org_id/role) ← SIRADAKİ
- [ ] /admin'den org detay / üye listesi

## Önceki Session (2026-06-24, ilk) Değişiklikleri

- Faz 1 testi doğrulandı: admin@demolojistik.com → dashboard ✓, sofor@demolojistik.com → /driver ✓
- `globals.css`: bg/card/popover token `oklch(1 0 0)` → `oklch(0.99 0 0)` (DESIGN.md uyumu)
- `driver-client.tsx`: TripCard rota başlığı `text-base` → `text-lg` (DESIGN.md title token uyumu)
- `memory/project_state.md` güncellendi (bu dosya)
- `npm run check` + `npm run build` temiz

## Session (2026-06-23) Değişiklikleri

- `database.types.ts`: `platform_admins` tablosu + `is_superadmin` RPC eklendi
- `components/app-shell.tsx`: aktif nav düzeltildi (solid → tint), sidebar bg `bg-sidebar`, marka ikonu eklendi
- `app/[locale]/sign-in/page.tsx`: marka wordmark (ikon + isim + tagline) eklendi
- `app/[locale]/driver/page.tsx`: sticky mobil başlık (marka + çıkış butonu)
- `app/[locale]/driver/driver-client.tsx`: `DOC_STATUS_CLASSES` → `status-chip` sistemine taşındı

---

## Sıradaki Öncelikler (Faz seçimi)

1. **Süper admin UI** — liste ✓ (salt-okunur). KALAN: yeni firma+admin oluşturma formu
2. **jscanify kamera tarama** (Faz 3 tamamlama)
3. **Offline kuyruğu** (Faz 3 tamamlama — karmaşık, son sıraya)
4. **dev/prod ayrı Supabase** — gerçek müşteri verisinden ÖNCE çözülecek borç (radarda)

---

## Production Deploy / Env (2026-06-24 teşhis)

- **Mimari:** self-hosted Supabase `https://supabase.qratix.com`, Cloudflare tunnel
  ile yayınlanıyor. Tünel origin'i `localhost:80`; oradaki reverse proxy
  (Coolify/Traefik) **Host header**'a göre dağıtıyor. `logisticapp.qratix.com` da
  `localhost:80` → aynı proxy. (Cloudflare panel: Networks → Connectors → Yerel-Sunucu)
- **logisticapp Coolify ile deploy ediliyor.** Env değişkenleri Coolify panelinden.
- **Kritik:** `NEXT_PUBLIC_*` (URL + ANON_KEY) **build-time** gömülür → değiştirince
  **rebuild şart**. `SUPABASE_SERVICE_ROLE_KEY` server-side/runtime.
  Üçü de local `.env.local` ile **birebir** aynı olmalı. Doğru anon key payload:
  `iss="supabase", iat=1781308800`.
- **Yaşanan 2 olay (çözüldü):**
  1. Prod anon key eski/yanlış → `/auth/v1/token` **401** → sign-in "parola hatalı"
     maskesi. (curl testi: doğru anon→200, yanlış→401 ile kanıtlandı.)
  2. `SUPABASE_SERVICE_ROLE_KEY` prod'da YOKTU → `/admin` sayfası `createAdminClient`
     throw → "Something went wrong". Kullanıcı key'i ekledi + redeploy.
- **Hardening eklendi:** `/admin` çökme yerine net config mesajı (`adminClientOrNull`);
  sign-in 400 vs 401/5xx ayrımı; `client.ts` env eksikse net throw.

## Önemli Teknik Notlar

- `platform_admins` tablosu: RLS enabled, policy yok → yalnızca service-role erişir
- `is_superadmin()` fonksiyon: security definer → platform_admins'i public'ten okur
- Superadmin'in `current_org_id()` → null döner; org-bazlı sorguları el ile filtrele
- OCR için `ANTHROPIC_API_KEY` gerekli (`.env.local`); model: `claude-haiku-4-5-20251001` (ucuz)
- Storage bucket "documents" private; imzalı URL: `lib/supabase/storage.ts`
- Migration 0002 ve 0003 elle uygulanmalı (ROADMAP uyarısı geçerli)
