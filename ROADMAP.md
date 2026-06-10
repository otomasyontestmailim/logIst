# ROADMAP — Lojistik CRM

> Canlı yol haritası. Bir dilim bitince işaretle. Anlık durum ve "sıradaki görev"
> için `memory/project_state.md`; kod kuralları için `CONVENTIONS.md`.

Durum: **Faz 0 ✓ · Faz 1 ✓ · Faz 2 ✓ · Faz 3 büyük ölçüde ✓ (basit yükleme; jscanify/offline yok) · Faz 4 minimal inbox ✓ · sıradaki → Faz 3 offline kuyruğu / Faz 4 OCR**

> ⚠️ `supabase/migrations/0002_storage_documents.sql` SQL Editor'da **elle
> uygulanmalı** — uygulanmadan şoför belge yükleme ve gelen kutusu çalışmaz.

---

## Faz 0 — Kurulum ✓

- [x] Next.js 16 + React 19 + TS + Tailwind v4 + shadcn (base-nova) iskeleti
- [x] next-intl TR/EN i18n (`app/[locale]`, `messages/{tr,en}.json`)
- [x] Supabase `@supabase/ssr` client/server/middleware + `getCurrentUser`
- [x] DB migration `0001_init.sql` (7 tablo + 5 enum + RLS) — **uygulandı**
- [x] Auth: sign-in (parola + magic link), callback, rol yönlendirme
- [x] Panel kabuğu (sidebar + header), dil değiştirici, `proxy.ts`
- [x] Kalite altyapısı: Prettier + ESLint + `npm run check` + husky pre-commit

## Faz 1 — Şoför yönetimi ✓

- [x] DB tipleri (`database.types.ts`) + service-role admin client
- [x] `createDriver` / `deleteDriver` Server Action'ları (rollback + tenant kontrolü)
- [x] Şoför listesi + ekle-formu + belge geçerlilik rozetleri (expired/expiring)
- [x] Bootstrap seed (`0001_bootstrap_admin.sql`)
- [ ] (Test) İlk admin ile giriş + şoför ekleme akışının uçtan uca doğrulanması

---

## Faz 2 — Müşteri + Sefer yönetimi ✓

1. **Müşteri (customers) CRUD** ✓
   - [x] Liste sayfası + ekle/düzenle/sil + form
   - [x] `messages` çevirileri (Customers)
2. **Sefer (trips) CRUD** ✓
   - [x] Oluştur + düzenle: şoför + müşteri ata, origin/destination/tarihler
   - [x] Liste (detay sayfası yerine satır içi düzenleme formu)
3. **Sefer durum akışı** ✓ — `created → loaded → in_transit → delivered`
   - [x] Admin/dispatcher tam kontrol; şoför yalnız kendi seferi (RLS var)
4. **Dashboard gerçek istatistikler** ✓ — canlı count sorguları
   (aktif sefer / bekleyen belge / geciken teslimat / şoför sayısı)
5. **Kalite iyileştirmeleri (2026-06-11)** ✓
   - [x] Silme onayı: i18n'li erişilebilir `ConfirmDialog` (browser confirm yerine)
   - [x] Locale-bilinçli tarih formatı (`lib/format-date.ts`)
   - [x] Tablolarda arama + sefer durum filtresi
   - [x] Lokalize `error.tsx` + `not-found` + catch-all route

## Faz 3 — Şoför mobil (PWA) tarama & upload — büyük ölçüde ✓

1. [x] Şoför sefer listesi (`/driver` gerçek veri, mobil kart arayüzü)
2. [x] Storage kurulumu: özel bucket + politika (`0002_storage_documents.sql`,
       **elle uygulanmalı**) + imzalı URL helper (`lib/supabase/storage.ts`)
3. [ ] Kamera ile tarama: `getUserMedia` + `jscanify` (kenar tespit/kırpma, çok
       sayfa) — MVP'de basit `<input capture>` + canvas sıkıştırma ile çözüldü
4. [x] Belge yükleme: tip seç (cmr/invoice/...) → sefere bağla → tarayıcıdan
       doğrudan Storage + `createDocument` action (`documents` satırı)
5. [x] Şoför sefer durumu güncelleme (mobil, tek tuş ilerletme)
6. [ ] Offline kuyruğu: IndexedDB + background sync (sınır geçişi; en karmaşık, sona)

## Faz 4 — Belge gelen kutusu + OCR

1. [x] Gelen kutusu: belgeleri görüntüle (imzalı URL), durum filtresi (minimal)
2. [x] Onay/red akışı (`documents.status`)
3. [ ] OCR: Claude Vision → yapılandırılmış JSON → `documents.ocr_data` → insan onayı

## Faz 5 — CRM derinleştirme + raporlama + uyarılar

1. [ ] Belge süresi uyarıları (dashboard/uyarı listesi + ops. e-posta hatırlatma)
2. [ ] Raporlar (sefer/şoför/müşteri bazlı) + PDF/ZIP dışa aktarma
3. [ ] Audit log görünümü (`audit_logs` paneli)
4. [ ] Süper admin: firma (tenant) açma + abonelik yönetimi (platform sahibi rolü)

---

## Kesişen / sürekli işler

- [ ] Şoför davet/onboarding akışı (şu an geçici parola/magic link)
- [ ] E-posta SMTP yapılandırması (magic link + bildirimler)
- [ ] Erişilebilirlik + responsive geçişler
- [ ] Şema her değişiminde `database.types.ts` senkron güncelleme
