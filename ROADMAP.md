# ROADMAP — Lojistik CRM

> Canlı yol haritası. Bir dilim bitince işaretle. Anlık durum ve "sıradaki görev"
> için `memory/project_state.md`; kod kuralları için `CONVENTIONS.md`.

Durum: **Faz 0 ✓ · Faz 1 ✓ · sıradaki → Faz 2**

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

## Faz 2 — Müşteri + Sefer yönetimi ← SIRADAKİ

1. **Müşteri (customers) CRUD** — sefer müşteriye bağlandığı için önce bu.
   RLS hazır, admin/dispatcher INSERT'e izinli → **service-role gerekmez**
   (normal authenticated client yeter).
   - [ ] Liste sayfası + ekle/düzenle/sil + form
   - [ ] `messages` çevirileri (Customers)
2. **Sefer (trips) CRUD**
   - [ ] Oluştur: şoför + müşteri ata, origin/destination/load_date/delivery_date
   - [ ] Liste + detay sayfası
3. **Sefer durum akışı** — `created → loaded → in_transit → delivered`
   - [ ] Admin/dispatcher tam kontrol; şoför yalnız kendi seferi (RLS var)
4. **Dashboard gerçek istatistikler** — 0 placeholder yerine canlı sorgular
   (aktif sefer / bekleyen belge / geciken teslimat / şoför sayısı)

## Faz 3 — Şoför mobil (PWA) tarama & upload

1. [ ] Şoför sefer listesi (`/driver` stub'ı → gerçek veri)
2. [ ] Storage kurulumu: özel bucket + politika (yeni migration) + imzalı URL helper
3. [ ] Kamera ile tarama: `getUserMedia` + `jscanify` (kenar tespit/kırpma, çok sayfa)
4. [ ] Belge yükleme: tip seç (cmr/invoice/...) → sefere bağla → `documents` + Storage
5. [ ] Şoför sefer durumu güncelleme (mobil)
6. [ ] Offline kuyruğu: IndexedDB + background sync (sınır geçişi; en karmaşık, sona)

## Faz 4 — Belge gelen kutusu + OCR

1. [ ] Gelen kutusu: belgeleri görüntüle (imzalı URL), filtrele
2. [ ] Onay/red akışı (`documents.status`)
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
