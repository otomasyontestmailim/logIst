# Proje Durumu — Lojistik CRM

> Son güncelleme: 2026-07-03 · Session başında oku, sonda güncelle.

---

## Session (2026-07-02/03) — Premium UI uplift (5 aşama, 5 commit) + OCR fix

**Plan onaylı "Sevk Kulesi" görsel yenileme — check ✓ + build ✓ + Chrome
smoke test her aşamada. Commitler: 4f0e2d8 → (S2..S5). PUSH EDİLMEDİ —
kullanıcı onayı bekliyor.**

- **S1 token temeli:** 3 katmanlı tonal istif (light: sidebar 0.96 < kanvas
  0.975 < kart 0.995; dark: 0.14 < 0.155 < 0.205 < popover 0.245),
  `--elevation-resting/floating` gölge token'ları (`shadow-resting` utility),
  dark border 10%→14%. **BUG FIX: `--font-sans` kendine referanstı — Geist
  hiç render olmuyordu** (uygulama Segoe UI'daydı); `--font-geist-sans`'a
  bağlandı. themeColor → viewport export (Next 16), marka hex'leri.
  Yeni `status-danger`/`status-info` tonları.
- **S2 primitif kit:** `components/ui/{table,native-select,status-chip,
skeleton}.tsx` + `components/{page-header,empty-state,stat-tile,field,
page-skeleton,expiry-badge}.tsx`; `lib/trip-status.ts`'e `STATUS_TONE_NAME`.
  Dashboard adaptasyonu + `Dashboard.viewAll` i18n (hardcoded "Tümü →" idi).
- **S3–S4 ekran adaptasyonu:** trips/drivers/documents/customers/vehicles/
  reports/settings/audit — 18 ham select → NativeSelect, 12 elle tablo →
  Table, 6 rakip rozet paleti → StatusChip, 5 kopya Field → paylaşılan,
  tüm bölümlere `loading.tsx`, `p-8` → `p-4 md:p-8`.
  **2 tablo BUG FIX:** `drivers/[id]` (2 başlık / 4 hücre) ve
  `customers/[id]` (müşteri başlıkları sefer satırlarında) — yeni
  `DriverDetail.col*` / `CustomerDetail.col*` anahtarları ×3 dil.
- **S5 kenarlar:** **BUG FIX: `/track` halka açık takip sayfası HİÇ
  ÇALIŞMIYORDU** — proxy.ts matcher'ı locale'e yönlendirip 404 veriyordu +
  kök layout yoktu ("Missing <html>"); matcher'a `track|offline` eklendi,
  `app/track/layout.tsx` + `app/offline/layout.tsx` oluşturuldu. Track tam
  re-theme + Tracking i18n. Driver PWA/admin StatusChip+Table; app-shell
  sticky header + nav odak halkaları. DESIGN.md yeni istifle senkronlandı.
- **OCR (önceki gün):** model ID `claude-haiku-4-5-20251001`'e sabitlendi
  (537f9e9, pushlandı). Kalan iş: Coolify'a `ANTHROPIC_API_KEY` eklenmesi
  (kullanıcı yapacak) + canlıda gerçek belge OCR testi.

---

## Session (2026-06-30, üçüncü) — Bug düzeltmeleri: i18n karışıklığı + araç seçici

**4 madde tamamlandı, `npm run check` ✓ + `npm run build` ✓ temiz.**

- **tr.json TripDetail/DocumentDetail karışıklığı düzeltildi** (önceki session'da
  flag'lenen background task): `trackingLinkTitle`, `trackingLinkDesc`,
  `copyTrackingLink`, `trackingLinkCopied`, `trackingLinkCopiedShort`,
  `signatureTitle`, `signatureAlt`, `signatureViewFull` — yanlışlıkla
  `DocumentDetail` altındaydı, `TripDetail`'e taşındı (en/nl zaten doğruydu).
  3 dil anahtar sayısı eşitlendi (593/593/593).
- **Sefer formuna araç seçici eklendi:** `trips/page.tsx` artık `vehicles`
  tablosunu (id, plate, brand, model) org filtreli çekiyor; `trips-client.tsx`
  TripForm'a `<select name="vehicle_id">` eklendi (plaka — marka/model
  formatında, boş seçenek dahil); `trips/actions.ts` createTrip/updateTrip
  artık `vehicle_id`'yi insert/update ediyor. `Trips` namespace'e `vehicle` +
  `vehiclePlaceholder` 3 dilde eklendi.
- **trip_no kontrolü:** zaten önceki session'da (commit `c90d6c2`) hem sefer
  listesinde (badge/link sütunu) hem detay sayfası başlığında gösteriliyormuş
  — ek değişiklik gerekmedi, doğrulandı.
- **Kod kalite taraması:** `driver-client.tsx`'te bulunan gerçek i18n hatası
  düzeltildi — `statusState.error`, `rejectState.error`,
  `saveDeliverySignature` sonucu ham hata kodunu (`forbidden`,
  `invalid_transition` vb.) `useErrorText()` ile çevirmeden gösteriyordu;
  artık diğer tüm client component'lerle aynı desene (`errText()`) uyuyor.
  `trips/[id]`, `vehicles/*`, `trip-messages-client.tsx` taraması temiz çıktı.

## Session (2026-06-30, ikinci) — Araç yönetimi + Şoför-dispatcher mesajlaşma

**2 yeni özellik eklendi, `npm run check` ✓ + `npm run build` ✓ temiz.**

### Özellik 1 — Araç (Kamyon/Dorse) Yönetimi

- `supabase/migrations/0012_vehicles.sql` (UYGULANMADI — elle SQL Editor'dan
  uygulanmalı): `vehicles` tablosu (plate, trailer_plate, brand, model, year,
  capacity_ton, inspection_expiry, insurance_expiry, last_service_km,
  current_km, notes) + RLS (`org member` tek politika, `current_org_id()`) +
  `trips.vehicle_id` FK kolonu.
- `database.types.ts`: `vehicles` tablo tipi + `trips.vehicle_id` eklendi.
- `(panel)/vehicles/{page.tsx,vehicles-client.tsx,actions.ts,[id]/page.tsx}`:
  drivers sayfası deseni — liste (arama, pagination 25/sayfa), ekle/düzenle
  formu, silme onayı, detay sayfası (bilgiler + muayene/sigorta rozetleri +
  bağlı seferler tablosu, `trips.vehicle_id` ile).
- Rozet sistemi `lib/expiry.ts`'deki `expiryStatus()` (drivers ile aynı
  helper) — kırmızı (süresi doldu) / sarı (30 gün içinde) / yeşil (güncel).
- Sidebar: `components/app-shell.tsx`'e "Araçlar" linki (`Container` ikonu —
  `Truck` zaten Şoförler'de kullanılıyordu, çakışmayı önlemek için farklı ikon
  seçildi).
- `components/ui/textarea.tsx` (YENİ): shadcn/Input ile aynı stil, proje daha
  önce Textarea component'i içermiyordu (araç notları + mesaj kutusu için).
- i18n: `Vehicles`, `VehicleDetail` namespace + `Nav.vehicles` + 3 dil
  (tr/en/nl) eşit.

### Özellik 2 — Şoför-Dispatcher Mesajlaşma

- `supabase/migrations/0013_trip_messages.sql` (UYGULANMADI): `trip_messages`
  tablosu (trip_id, sender_id, content) + tek org-bazlı RLS politikası
  (kullanıcının istediği SQL aynen kullanıldı — driver-özel kısıtlama yok,
  sadece org içi erişim).
- `database.types.ts`: `trip_messages` tablo tipi eklendi.
- `sendTripMessage` server action → `(panel)/trips/actions.ts`'e eklendi (yeni
  dosya açmak yerine mevcut dosyaya — driver tarafı zaten
  `../(panel)/trips/actions` import ediyor, tek action iki tarafta da
  kullanılıyor). Şoför yalnızca kendi seferine (`driver_id` eşleşmesi) mesaj
  gönderebilir; admin/dispatcher org içindeki tüm seferlere.
- `components/trip-messages-client.tsx` (YENİ, paylaşılan): mesaj baloncukları
  (kendi mesajı sağda/primary renk, karşı taraf solda/muted), gönderen adı +
  saat, `useActionState(sendTripMessage)` ile form, 10 saniyede bir
  `router.refresh()` polling (Supabase realtime yerine basit çözüm).
- Panel: `trips/[id]/page.tsx` son 50 mesajı sender adlarıyla çekiyor (uploader
  sorgusuyla birleştirildi — tek `users` sorgusu), `trip-detail-client.tsx`
  sağ kenar çubuğunda `TripMessagesClient` render ediyor.
- Şoför: `driver/page.tsx` tüm seferlerin mesajlarını tek sorguda çekiyor,
  `driver-client.tsx`'teki `TripCard`'a "Mesajlar" `<details>` bölümü eklendi
  (Belgeler bölümünün altında, `MessageCircle` ikonu).
- i18n: `TripMessages` namespace + `Driver.messagesTitle` + 3 dil eşit.

### Tespit edilen mevcut hata (bu session'da DÜZELTİLMEDİ — ayrı task olarak işaretlendi)

`messages/tr.json`'da `trackingLinkTitle`/`signatureTitle` gibi 8 anahtar
yanlışlıkla `TripDetail` yerine `DocumentDetail` içinde — en/nl'de doğru
yerde. Türkçe kullanıcılar sefer detayındaki takip linki/imza kartlarında ham
anahtar adı görüyor olabilir. Kapsam dışı olduğu için ayrı bir background task
olarak flag'lendi (spawn_task, task_1280d7a6), bu session'da dokunulmadı.

### Sıradaki

- [ ] **Migration 0012 + 0013** Supabase SQL Editor'dan elle uygulanmalı
- [x] tr.json TripDetail/DocumentDetail anahtar karışıklığı düzeltildi
      (2026-06-30, üçüncü session)
- [ ] Araç detay sayfasında inline düzenle/sil yok (liste sayfasından
      yapılıyor) — istenirse customers/[id] desenine taşınabilir
- [x] Sefer formuna (`trips-client.tsx`) `vehicle_id` seçici eklendi
      (2026-06-30, üçüncü session)

## Session (2026-06-30) — Belge gelen kutusu: trip bazlı gruplama

`documents/page.tsx` + `documents-client.tsx` düz belge listesinden sefer (trip)
bazlı gruplu görünüme çevrildi:

- `page.tsx`: documents/trips/users 3 paralel sorgu; belgeler `trip_id`'ye göre
  JS'te gruplanır (documents zaten `created_at` DESC geldiği için grup sırası da
  otomatik en güncel sefer önce olacak şekilde korunur). Sayfalama artık **belge
  sayısına değil trip grup sayısına** göre yapılıyor (`PAGE_SIZE=20` grup/sayfa);
  signed URL'ler yalnızca o sayfadaki belgeler için üretiliyor (performans).
- `documents-client.tsx`: `DocumentItem` tipinden `tripLabel`/`driverName` kaldırıldı
  (artık grup başlığında); yeni `GroupedTrip` tipi eklendi. Tablo yerine her sefer
  için kart: başlık (`groupTitle` — kısa trip ID + origin→destination + şoför +
  yükleme tarihi) + toplam belge rozeti + bekleyen onay rozeti (yoksa "Bekleyen yok").
  status/type filtreleri URL'de aynı şekilde korunuyor; filtre sonucu boşsa
  "Sonuç bulunamadı" (`noResults`), hiç belge yoksa eski "empty" mesajı.
- i18n: `Documents` namespace'e `groupTitle`, `documentsCount`, `noPending`,
  `noResults`, `review` eklendi (tr/en/nl, 3 dil eşit).
- `/documents/[id]` detay sayfası değişmedi.
- `npm run check` ✓ temiz (lint + typecheck + format).

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
- **UYARI (2026-06-30):** tarayıcı doğrulamasında bu parola ile giriş
  "E-posta veya parola hatalı" hatası verdi (form/Supabase auth çağrısı
  kendisi çalışıyor — sadece kimlik bilgisi reddedildi). Parola değişmiş
  olabilir; sonraki session'da doğrulanmalı/güncellenmeli.

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

## Session (2026-06-27) — Expo Mobil Uygulama (`apps/mobile`)

Şoför için Android-önce native uygulama iskelet tamamlandı.

**Yeni dosyalar (`apps/mobile/`):**

- `package.json` — Expo SDK 52, react-native 0.76.7, Supabase JS v2
- `app.json` — bundle ID: `com.qratix.logisticdriver`, scheme: `logisticcrm`
- `eas.json` — development / preview (APK) / production (AAB) profilleri
- `tsconfig.json`, `babel.config.js`, `metro.config.js`
- `lib/supabase.ts` — AsyncStorage session persist
- `lib/auth-context.tsx` — AuthProvider: session + appUser (rol+org bilgisi)
- `lib/types.ts` — Database generic tipi (Supabase JS v2 uyumlu)
- `lib/trip-status.ts` — STATUS_LABELS, ACTION_LABELS, renk haritaları
- `lib/offline-queue.ts` — AsyncStorage tabanlı yükleme kuyruğu
- `app/_layout.tsx` — GestureHandlerRootView + AuthProvider + Stack
- `app/index.tsx` — auth durumuna göre `/(auth)` veya `/(driver)` yönlendir
- `app/(auth)/_layout.tsx` + `sign-in.tsx` — e-posta/şifre giriş formu; şoför-dışı rol reddeder
- `app/(driver)/_layout.tsx` — mavi başlıklı Stack navigator
- `app/(driver)/index.tsx` — aktif sefer listesi (FlatList, pull-to-refresh, çıkış)
- `app/(driver)/trip/[id].tsx` — sefer detay + durum ilerletme + belge yükleme (kamera/galeri) + offline kuyruk flush + ePOD imza
- `components/StatusBadge.tsx` — renkli durum rozeti
- `components/SignaturePad.tsx` — react-native-signature-canvas tabanlı imza pedi

**Kurulum:** `cd apps/mobile && npm install --legacy-peer-deps` ✓ (911 paket)

### Mobil build düzeltmeleri (2026-06-29) — APK Android'de ÇALIŞIYOR ✓

EAS preview APK üretildi, gerçek Android cihazda **giriş + akış sorunsuz test edildi**.
Yol boyunca çözülen sorunlar:

- `react`/`react-native`/`async-storage`/`netinfo` versiyonları Expo SDK 52'ye sabitlendi
- `react-native-web` + `react-dom@18.3.1` eklendi (web bundler + react 18 uyumu)
- `.npmrc` `legacy-peer-deps=true` (EAS strict npm install için)
- `eas.json`: `buildType: app-bundle`, iOS submit boş alanlar kaldırıldı
- **KRİTİK:** `.env` gitignore'da → EAS build'i alamıyor → APK'da boş Supabase env →
  createClient çöküp splash'te takılıyordu. Çözüm: public URL+anon key `eas.json`'ın
  her build profiline `env` olarak gömüldü (commit f3cb0eb)
- `app.json`: web platform bölümü kaldırıldı (Android-only)

**iOS notu:** Fiziksel iPhone'a kurulum için Apple Developer ($99/yıl) ŞART. Ücretsiz
tek yol Expo Go (geliştirme PC'si + telefon ağ erişimi gerekir). VM'de tunnel patlıyor.

### Mobil — kalan iş / iyileştirme fikirleri

- [ ] Gerçek app icon + splash (şu an 1x1 placeholder PNG)
- [ ] Push bildirim (yeni sefer atandığında) — expo-notifications
- [ ] Belge tarama kenar-tespiti (şu an düz kamera/galeri)
- [ ] Realtime güncelleme (supabase realtime) — şu an sadece pull-to-refresh
- [ ] i18n (şu an sadece TR hardcoded)

## Sıradaki Öncelikler

1. **Migration 0007–0010** Supabase SQL Editor'dan uygula
2. **dev/prod ayrı Supabase** — gerçek müşteri verisinden ÖNCE çözülecek borç

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
