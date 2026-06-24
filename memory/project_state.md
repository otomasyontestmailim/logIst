# Proje Durumu — Lojistik CRM

> Son güncelleme: 2026-06-24 · Session başında oku, sonda güncelle.

---

## Tamamlanan Fazlar

| Faz | Açıklama                                                             | Durum           |
| --- | -------------------------------------------------------------------- | --------------- |
| 0   | Next.js + Tailwind + shadcn + Supabase kurulum                       | ✓               |
| 1   | Şoför yönetimi (CRUD + belge süre rozetleri)                         | ✓               |
| 2   | Müşteri + Sefer yönetimi                                             | ✓               |
| 2.5 | TIRPORT pipeline (7 aşama, harita, canlı konum)                      | ✓               |
| 3   | Şoför mobil (PWA) belge yükleme — basit upload ✓, jscanify/offline ✗ | Kısmi           |
| 4   | Belge gelen kutusu + onay/red                                        | Kısmi (OCR yok) |
| 5   | Belge süresi uyarıları, CSV/ZIP dışa aktarma, audit log              | Kısmi           |

---

## Aktif Teknik Borçlar

- [ ] jscanify / kamera kenar-tespit (Faz 3 tam)
- [ ] Offline kuyruğu (IndexedDB + background sync)
- [ ] OCR: Claude Vision → `documents.ocr_data` (Faz 4 tam)
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

## Son Session (2026-06-24) Değişiklikleri

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

1. **Süper admin UI** (`/admin` sayfası → firma listesi + yeni firma oluşturma)
2. **OCR** (Faz 4 tamamlama: Claude Vision → `ocr_data`)
3. **Offline kuyruğu** (Faz 3 tamamlama — karmaşık, son sıraya)

---

## Önemli Teknik Notlar

- `platform_admins` tablosu: RLS enabled, policy yok → yalnızca service-role erişir
- `is_superadmin()` fonksiyon: security definer → platform_admins'i public'ten okur
- Superadmin'in `current_org_id()` → null döner; org-bazlı sorguları el ile filtrele
- OCR için `ANTHROPIC_API_KEY` gerekli (`.env.local`); model: `claude-haiku-4-5-20251001` (ucuz)
- Storage bucket "documents" private; imzalı URL: `lib/supabase/storage.ts`
- Migration 0002 ve 0003 elle uygulanmalı (ROADMAP uyarısı geçerli)
