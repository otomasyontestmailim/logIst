# Proje Durumu — Lojistik CRM

> Son güncelleme: 2026-06-26 (ikinci session) · Session başında oku, sonda güncelle.

---

## Tamamlanan Fazlar

| Faz | Açıklama                                                                 | Durum |
| --- | ------------------------------------------------------------------------ | ----- |
| 0   | Next.js + Tailwind + shadcn + Supabase kurulum                           | ✓     |
| 1   | Şoför yönetimi (CRUD + belge süre rozetleri)                             | ✓     |
| 2   | Müşteri + Sefer yönetimi                                                 | ✓     |
| 2.5 | TIRPORT pipeline (7 aşama, harita, canlı konum)                          | ✓     |
| 3   | Şoför mobil (PWA) belge yükleme — upload ✓, jscanify ✓, offline kuyruk ✓ | ✓     |
| 4   | Belge gelen kutusu + onay/red + Claude Vision OCR (`lib/ocr.ts`)         | ✓     |
| 5   | Belge süresi uyarıları, CSV/ZIP dışa aktarma, audit log                  | Kısmi |

---

## Aktif Teknik Borçlar

- [x] jscanify / kamera kenar-tespit ✓ (`components/document-scanner.tsx`, CDN lazy load)
- [x] Offline kuyruğu ✓ (`lib/upload-queue.ts`, `lib/use-upload-queue.ts`, `/api/documents/queue-flush`)
- [x] OCR: Claude Vision → `documents.ocr_data` — `lib/ocr.ts` + `extractDocument` action ✓
- [x] OCR durum takibi: `ocr_status` (pending/processing/done/failed) — `lib/ocr.ts` status güncellemeleri + `/documents/[id]` rozet + spinner ✓
- [x] OCR alan düzenleme: `OcrEditForm` + `saveOcrData` action — belge detay sayfasında inline düzenleme + kaydetme ✓
- [x] PDF rapor — `jspdf` + `jspdf-autotable` client-side, "PDF Dışa Aktar" butonu `reports-client.tsx` ✓ (npm install gerekli)
- [x] E-posta SMTP — Resend entegrasyonu `lib/email.ts` ✓ (RESEND_API_KEY + npm install gerekli)
- [x] Zod şema + inline alan hataları — `lib/validate.ts` + `fieldErrors` pattern, 3 form ✓
- [x] Liste pagination — drivers/trips/customers/documents, server-side, URL param ✓
- [ ] Süper admin firma açma / abonelik yönetimi UI
- [x] npm install çalıştırılmalı (resend + jspdf + jspdf-autotable paketi eklendi)
- [x] `sendExpiryReminders()` server action — `drivers/actions.ts`; `expiryReminderEmail()` template — `lib/email.ts`; 3 dil i18n ✓
- [ ] **Migration 0007** — Supabase SQL Editor'dan uygulanmalı (postgres MCP read-only; DB_URL yok)

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
- [x] "Yeni firma + admin oluştur" formu — `admin/actions.ts` (createOrganization) + `admin/new-org-form.tsx` (useActionState, geçici şifre gösterimi) ✓ 2026-06-25
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

## Session (2026-06-25) — Detay sayfaları + Ayarlar

Tüm eksik panel sayfaları oluşturuldu:

- `(panel)/drivers/[id]` — şoför detay: profil, belge rozetleri, son 10 sefer, inline düzenle/sil
- `(panel)/trips/[id]` — sefer detay: pipeline progress, yük bilgisi, duraklar, belgeler, durum ilerletme
- `(panel)/customers/[id]` — müşteri detay: info, sefer geçmişi, inline düzenle/sil
- `(panel)/documents/[id]` — belge detay: görüntü, OCR tablo, onayla/reddet, OCR yenile
- `(panel)/settings` — profil, parola, org ayarları (admin)
- `admin/[id]` — superadmin org detay: üye listesi, plan askıya al/aktifleştir
- Sidebar'a "Ayarlar" linki eklendi
- Liste sayfalarından detay sayfalarına link: şoför adı, müşteri adı, sefer adı, belge tipi
- 3 dil (tr/en/nl) — 6 yeni namespace, her biri tam çevrilmiş
- `npm run check` ✓ + `npm run build` ✓

## Session (2026-06-25, ikinci) — Panel geliştirmeleri

Tüm panel ekranları tamamlandıktan sonra aşağıdaki özellikler eklendi:

### Dashboard iyileştirmesi

- 4 belirgin metrik kartı: Aktif Sefer, Bekleyen Belge, Yaklaşan Belge Sonları, Bugün Teslimat
- Hızlı eylem linkleri: Yeni Sefer, Şoför Davet, Belge Gelen Kutusu
- Son 5 sefer + Son 5 belge (2 sütun grid, linke tıklanabilir)
- Sefer hattı (pipeline) ve harita korundu
- `npm run check` ✓ + `npm run build` ✓

### Bildirim Zili (header)

- `components/notifications-dropdown.tsx` (client) — Bell ikonu, dropdown panel
- `components/notifications-server.tsx` (server) — Supabase'den: süresi dolan belgeler, bekleyen onaylar, 24s içinde teslimat
- `components/app-shell.tsx`: `headerSlot?: ReactNode` prop eklendi
- `app/[locale]/(panel)/layout.tsx`: `NotificationsServer` headerSlot olarak geçildi

### Raporlama sayfası `/reports`

- `app/[locale]/(panel)/reports/page.tsx` — server, searchParams ile tarih filtresi
- `app/[locale]/(panel)/reports/reports-client.tsx` — client, sefer özeti + şoför tablosu
- CSV dışa aktar (lib/export/csv.ts kullanır), ZIP placeholder (disabled)
- Sidebar'a "Raporlar" linki + BarChart2 ikonu eklendi

### Şoför Davet `/drivers/invite`

- `inviteDriver` server action eklendi (`drivers/actions.ts`) — e-posta+ad, geçici şifre döndürür
- `InviteDriverState` tipi ihraç edildi
- `app/[locale]/(panel)/drivers/invite/page.tsx` — client form, başarıda şifre + kopyala butonu
- `/drivers` sayfasına "Şoför Davet Et" butonu eklendi

### Belge Gelen Kutusu filtreleri

- `documents/page.tsx`: server-side `status` + `type` filtreleme (searchParams)
- `documents/documents-client.tsx`: `initialStatus` + `initialType` prop; `setFilter` → `useRouter` URL günceller
- Belge tipi filtresi: CMR, Fatura, İrsaliye, Kantar, ADR, Gümrük, Teslim Tutanağı

### i18n

- 3 dil (tr/en/nl) — `Dashboard`, `Nav`, `Drivers`, `Documents`, `Reports`, `Notifications` namespace'leri genişletildi

## Session (2026-06-26, üçüncü) — ePOD + Tracking + Fatura PDF

**3 yeni özellik eklendi, npm run check ✓ temiz:**

### Özellik 1 — ePOD (Dijital Teslimat İmzası)

- `supabase/migrations/0008_epod.sql` — trips'e delivery_signature_url + delivered_at
- `components/signature-pad.tsx` — canvas tabanlı dokunmatik imza pedi (touch/mouse, Temizle/Onayla)
- `app/[locale]/driver/actions.ts` — `saveDeliverySignature()` ekle (delivering→delivery_approval + URL kaydet + audit)
- `app/[locale]/driver/driver-client.tsx` — "Teslim Ettim" butonu artık SignaturePad açıyor; imzayı Storage'a (`{org}/{trip}/signature.png`) yükleyip action çağırıyor
- `trips/[id]/page.tsx` — delivery_signature_url için imzalı URL + org verisi fetch
- `trips/[id]/trip-detail-client.tsx` — imza önizlemesi + tam boy link (sağ kenar çubuğu)
- `Signature` namespace: 3 dil (tr/en/nl)

### Özellik 2 — Müşteri Takip Linki

- `supabase/migrations/0009_tracking.sql` — trips'e tracking_token UUID + unique index
- `app/track/[token]/page.tsx` — auth gerektirmeyen public sayfa (service-role bypass); durum, güzergah, tarih, şoför adı (soyad gizli); Türkçe/İngilizce karışık tasarım
- `trips/[id]/trip-detail-client.tsx` — "Takip Linkini Kopyala" butonu (navigator.clipboard + toast), sağ kenar çubuğunda
- `TripDetail` namespace'e tracking anahtarları: 3 dil

### Özellik 3 — Navlun Ücreti & Fatura PDF

- `supabase/migrations/0010_freight.sql` — freight_amount, freight_currency (default EUR), invoice_status (draft/sent/paid)
- `trips/actions.ts` — cargoFields() freight alanlarını topluyor
- `trips/trips-client.tsx` — TripForm'a freight_amount, freight_currency, invoice_status alanları eklendi
- `lib/invoice-pdf.ts` — jsPDF + jspdf-autotable ile client-side fatura PDF üretimi (firma, müşteri, güzergah, navlun + KDV %0 satırları, INV-{tripId} no)
- `trips/[id]/page.tsx` — freight alanları + org bilgisi client'a iletiliyor
- `trips/[id]/trip-detail-client.tsx` — cargo bölümünde freight/durum + "Fatura PDF İndir" butonu (dynamic import)
- `Invoice` namespace: 3 dil

---

## Session (2026-06-26) — OCR + PWA

**Grup B — OCR entegrasyon tamamlandı:**

- `lib/ocr.ts`: `runOcrForDocument` artık `ocr_status` (pending→processing→done/failed) güncelliyor
- `/documents/[id]`: OCR durum rozeti + spinner + `OcrEditForm` inline düzenleme
- `saveOcrData` server action eklendi (`documents/actions.ts`)
- 3 dil güncellendi

**Grup C — PWA güçlendirme:**

- `app/manifest.ts` + `app/icon.tsx` + `app/apple-icon.tsx` — Next.js ImageResponse ile otomatik ikonlar
- `app/pwa-icon-192/route.tsx` + `app/pwa-icon-512/route.tsx` — 192/512px PNG ikonlar
- `public/sw.js` — Service worker (cache-first statik, network-first dinamik, offline fallback)
- `app/offline/page.tsx` — offline fallback sayfası
- `components/pwa-register.tsx` — SW kayıt bileşeni
- `components/pwa-install-banner.tsx` — "Ana ekrana ekle" banner (Android native + iOS manual)
- `layout.tsx` güncellemeleri: PwaRegister + PwaInstallBanner + meta tags

**jscanify kamera tarama (Grup C devam):**

- `package.json`: `jscanify ^1.2.0` eklendi (npm install gerekli)
- `components/document-scanner.tsx`: getUserMedia + gerçek zamanlı edge highlight + extract
  - OpenCV.js + jscanify CDN'den lazy yüklenir; yoksa ham kare kullanılır (progressive)
  - State: idle → opening → scanning → captured → (confirm/retry)
- `driver-client.tsx`: DocumentScanner dynamic import, "Belge Tara" + "Galeriden Seç" iki buton grid
- 3 dil `Scanner` namespace eklendi

**Offline IndexedDB upload kuyruğu (Grup C devam):**

- `lib/upload-queue.ts` — IndexedDB CRUD (enqueue, getPending, updateEntry, cleanDone)
- `lib/use-upload-queue.ts` — React hook: online→direkt yükle, offline→kuyruğa ekle, flush on online
- `lib/use-queue-count.ts` — sadece sayı okuyan, flush tetiklemeyen hook (badge için)
- `app/api/documents/queue-flush/route.ts` — POST endpoint: Storage'a yükleme sonrası DB kaydı
- `components/offline-queue-badge.tsx` — bekleyen yükleme rozeti (şoför başlığı)
- `app/offline/offline-client.tsx` + `app/offline/page.tsx` — offline fallback sayfası
- driver-client.tsx: `useUploadQueue()` entegrasyonu, `uploadQueued` toast
- 3 dil `OfflineQueue` namespace eklendi

## Sıradaki Öncelikler

1. **Migration 0007–0010** Supabase SQL Editor'dan uygula
2. **Git push** kullanıcı onayıyla
3. **dev/prod ayrı Supabase** — gerçek müşteri verisinden ÖNCE çözülecek borç

### Build düzeltmeleri (2026-06-26)

- `jspdf-autotable` → `^3.8.4` (3.8.5 npm'de yok)
- `customers/actions.ts`: `name!` (insert) + `name ?? undefined` (update) TS hatası giderildi
- `lib/ocr-types.ts` (YENİ): `OCR_FIELDS`/`OcrField`/`OcrData` client-safe dosyaya taşındı
- `ocr-edit-form.tsx` + `documents/[id]/page.tsx`: `@/lib/ocr` → `@/lib/ocr-types`

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
- **ÇÖZÜLDÜ (2026-06-24):** kullanıcı `SUPABASE_SERVICE_ROLE_KEY`'i Coolify'a ekleyip
  redeploy etti. Anon key de düzeldi. Production'da TÜM hesaplar giriş yapıyor
  (superadmin → /admin liste, admin → /dashboard, şoför → /driver). Commit 8fba83b push'landı.

## Auth modeli (provizyon için kritik)

- `current_org_id()` ve `current_user_role()` org/rolü **`public.users` tablosundan**
  okur (JWT app_metadata DEĞİL). getCurrentUser de tablodan okur.
- Yeni firma+admin provizyonu = **org INSERT → auth.users createUser → public.users
  (role=admin)**. app_metadata şart değil. Pattern: `createDriver` ile birebir
  (tek fark: org'u da oluşturur, role=admin, driver_profiles yok).
- Superadmin'in org'u yok → provizyon **service-role** ile yapılmalı (RLS-scoped
  insert işe yaramaz, yeni tenant çapraz-tenant işlemdir).

## Önemli Teknik Notlar

- `platform_admins` tablosu: RLS enabled, policy yok → yalnızca service-role erişir
- `is_superadmin()` fonksiyon: security definer → platform_admins'i public'ten okur
- Superadmin'in `current_org_id()` → null döner; org-bazlı sorguları el ile filtrele
- OCR için `ANTHROPIC_API_KEY` gerekli (`.env.local`); model: `claude-haiku-4-5-20251001` (ucuz)
- Storage bucket "documents" private; imzalı URL: `lib/supabase/storage.ts`
- Migration 0002 ve 0003 elle uygulanmalı (ROADMAP uyarısı geçerli)
