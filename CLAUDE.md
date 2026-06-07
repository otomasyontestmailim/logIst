# Lojistik Firmaları İçin Şoför Belge & CRM Uygulaması — Proje Planı

> Çok kiracılı (multi-tenant) SaaS CRM. Her lojistik firma kendi şoförlerini, seferlerini ve müşterilerini yönetir. Şoför mobilde yükü aldıktan sonra CMR, fatura ve diğer evrakları tarayıp ilgili sefere yükler; firma ofisi web panelinden inceler.

---

## 1. Genel Bakış / Konsept

İki ana arayüz, tek backend:

- **Şoför (mobil):** Atanan seferleri görür, belge tarar/yükler, sefer durumunu günceller. Offline çalışabilmeli.
- **Firma / dispatcher (web panel):** Şoför yönetimi, sefer yönetimi, gelen belgeleri inceleme/onaylama, müşteri yönetimi (CRM'in asıl kısmı), raporlama.

Platform sahibi olarak sen de "süper admin" olarak firmaları (kiracıları) açar/yönetirsin.

---

## 2. Roller

| Rol                           | Nerede | Ne yapar                                                  |
| ----------------------------- | ------ | --------------------------------------------------------- |
| **Süper admin** (sen)         | Web    | Firmaları (tenant) açar, abonelik/lisans yönetir          |
| **Firma admini / dispatcher** | Web    | Şoför, sefer, müşteri ve belge yönetimi                   |
| **Şoför**                     | Mobil  | Sefer görüntüleme, belge tarama/yükleme, durum güncelleme |

Çok kiracılılık (multi-tenancy): her kayıtta `organization_id` tutulur, veri izolasyonu satır bazlı güvenlikle (RLS) sağlanır.

---

## 3. Temel Özellikler

### Şoför tarafı (mobil)

- Giriş (firma daveti / e-posta veya telefon ile)
- Atanan seferlerin listesi (yükleme yeri, boşaltma yeri, durum)
- **Kamera ile belge tarama:** kenar tespiti, otomatik kırpma, düzeltme (deskew), çok sayfalı belge
- Belge tipini seçerek sefere yükleme (CMR, fatura, irsaliye, kantar fişi, ADR, gümrük beyannamesi, teslim tutanağı vb.)
- **Offline kuyruğu:** internet yokken çek/kaydet, bağlantı gelince otomatik senkronize et (sınır geçişleri için kritik)
- Sefer durumu güncelleme (yüklendi → yolda → teslim edildi)
- Yüklenen belgeyi/durumunu görme

### Firma tarafı (web CRM)

- Dashboard (aktif sefer sayısı, bekleyen belge, geciken teslimat)
- **Şoför yönetimi:** ekle/düzenle, ehliyet/SRC/ADR/psikoteknik/yeşil kart gibi belge geçerlilik tarihlerini takip et ve süre dolmadan uyarı ver
- **Sefer yönetimi:** sefer oluştur, şoföre ata, gönderen/alıcı/rota/tarih bilgisi
- **Belge gelen kutusu:** şoförün yüklediği taramaları görüntüle, OCR ile çıkarılan alanları kontrol et, onayla/reddet
- **Müşteri yönetimi (CRM):** gönderen/alıcı firmalar, iletişim, geçmiş seferler
- Raporlama (sefer/şoför/müşteri bazlı), belge dışa aktarma (PDF/ZIP)

---

## 4. Önerilen Teknoloji Stack'i

Tek geliştirici + VSCode'da Claude ile kodlama için verimlilik ve Claude'un güçlü olduğu, dokümantasyonu bol bir stack seçtim.

| Katman                        | Öneri                                           | Neden                                                                                                          |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Web CRM                       | **Next.js + TypeScript + Tailwind + shadcn/ui** | Tek dilde full-stack, hızlı UI, Claude bu stack'te çok iyi                                                     |
| Şoför uygulaması (MVP)        | **PWA** (aynı Next.js içinde)                   | Tek kod tabanı, tarayıcı kamerası, hızlı çıkış                                                                 |
| Şoför uygulaması (v2)         | **Expo / React Native**                         | Daha iyi tarama UX'i, push bildirim, sağlam offline                                                            |
| Backend + DB + Auth + Storage | **Supabase** (PostgreSQL)                       | Tek seferde auth, dosya depolama, RLS ile tenant izolasyonu — solo geliştirici için backend yükünü çok azaltır |
| ORM (isteğe bağlı)            | Prisma veya Drizzle                             | Tip güvenli sorgular                                                                                           |
| OCR / alan çıkarımı           | **Claude Vision API** veya Google Document AI   | Taranan belgeden CMR/fatura alanlarını otomatik doldurma                                                       |

**Alternatifler:** Backend'i ayrı tutmak istersen NestJS/Fastify + PostgreSQL; Supabase yerine Firebase. Ama solo + hız için Supabase tavsiyem güçlü.

> **MVP tavsiyesi:** Önce her şeyi tek Next.js PWA içinde yap (CRM + şoför arayüzü). Şoför tarafının tarama/offline deneyimi yetmezse o kısmı Expo'ya taşı, backend aynı kalır. Tek tip paylaşımı için Turborepo monorepo düşünebilirsin.

---

## 5. Mimari (yüksek seviye)

```
[Şoför PWA/Mobil]  ─┐
                    ├─► [Next.js (API + Web)] ─► [Supabase: Postgres + Auth + Storage]
[Firma Web Panel]  ─┘                          │
                                               └─► [OCR servisi: Claude Vision / Document AI]
```

- Kimlik doğrulama: Supabase Auth (e-posta/telefon + magic link veya parola)
- Dosyalar: Supabase Storage (özel bucket, imzalı URL ile erişim)
- Veri izolasyonu: her tabloda `organization_id` + RLS politikaları
- OCR: belge yüklendiğinde tetiklenen arka plan işi → çıkan alanlar `documents.ocr_data` (JSONB) içine yazılır → web panelinde onaya düşer

---

## 6. Belge Tarama & OCR Yaklaşımı

**Cihazda (yakalama + kırpma):**

- PWA: `getUserMedia` ile kamera + bir doküman tarayıcı kütüphanesi (ör. OpenCV.js tabanlı `jscanify`)
- Expo/RN: `react-native-document-scanner-plugin` veya `vision-camera`
- Çıktı: kırpılmış/düzeltilmiş görüntü, gerekirse çok sayfa → tek PDF

**Sunucuda (alan çıkarımı):**

- Taranan görüntü Storage'a yüklenir
- OCR/çıkarım: **Claude Vision** ile belgeyi gönderip yapılandırılmış JSON iste (gönderen, alıcı, palet sayısı, brüt ağırlık, fatura no/tutar vb.). Avantajı: CMR ve fatura gibi farklı formatları aynı yaklaşımla çözer
- Alternatif: Google Document AI / AWS Textract (fatura için hazır modeller)
- Çıkan alanlar panelde **insan onayına** düşer (otomatik veriye körü körüne güvenme)

---

## 7. Veri Modeli (çekirdek tablolar)

```sql
-- Firmalar (kiracılar)
organizations(id, name, tax_no, created_at, plan)

-- Kullanıcılar (admin, dispatcher, şoför)
users(id, organization_id, role, full_name, email, phone, created_at)

-- Şoför profili (belge geçerlilikleri burada)
driver_profiles(
  user_id, license_no, src_expiry, adr_expiry,
  psikoteknik_expiry, green_card_expiry, plate, trailer_no
)

-- Müşteriler (gönderen / alıcı)
customers(id, organization_id, name, type, country, city, address, contact)

-- Seferler
trips(
  id, organization_id, driver_id, customer_id,
  origin, destination, status, load_date, delivery_date, created_at
)
-- status: created | loaded | in_transit | delivered

-- Belgeler
documents(
  id, organization_id, trip_id, uploaded_by,
  type,            -- cmr | invoice | waybill | weighbridge | adr | customs | delivery_note
  file_url, page_count,
  ocr_data jsonb,  -- çıkarılan alanlar
  status,          -- pending | approved | rejected
  captured_at, created_at
)

-- Denetim kaydı
audit_logs(id, organization_id, user_id, action, entity, entity_id, created_at)
```

İlişkiler: `organizations` 1—N `users`/`customers`/`trips`; `trips` 1—N `documents`; `users(driver)` 1—N `trips`.

Her tabloya **RLS politikası**: kullanıcı yalnızca kendi `organization_id`'sindeki satırları görür; şoför yalnızca kendine atanan seferleri ve kendi yüklediği belgeleri görür.

---

## 8. Karar Vermen Gereken Kritik Noktalar

1. **Şoför arayüzü:** PWA mı, native (Expo) mi? (Tarama kalitesi + offline ne kadar kritik?)
2. **OCR:** Otomatik alan çıkarımı şart mı, yoksa MVP'de sadece belgeyi saklamak yeter mi?
3. **Kimlik:** Şoför girişi e-posta mı telefon (SMS OTP) mu? (Şoförler için telefon genelde daha pratik)
4. **Çoklu dil:** Sadece Türkçe mi, yoksa yabancı plaka/sürücü için İngilizce de mi?
5. **Ölçek/bütçe:** Kaç firma, kaç şoför hedefliyorsun? (Storage ve OCR maliyetini etkiler)

---

## 9. MVP ve Faz Planı

**Faz 0 — Kurulum**
Repo, Next.js + Tailwind + shadcn, Supabase projesi, çok kiracılı şema + RLS, Auth.

**Faz 1 — Kullanıcı & şoför yönetimi**
Firma admini şoför ekler; şoför giriş yapar; roller çalışır.

**Faz 2 — Sefer yönetimi**
Sefer oluştur, şoföre ata, durum alanı.

**Faz 3 — Şoför tarama & yükleme**
Mobil kamera ile belge çek → kırp → sefere yükle. Offline kuyruğu.

**Faz 4 — Belge gelen kutusu + OCR**
Panelde belgeleri görüntüle, OCR alanlarını kontrol et, onayla/reddet.

**Faz 5 — CRM + raporlama + uyarılar**
Müşteri yönetimi, şoför belge süresi uyarıları, raporlar, dışa aktarma.

İlk satılabilir/test edilebilir ürün için **Faz 0–3** yeterli; OCR'yi (Faz 4) sonra ekleyebilirsin.

---

## 10. Güvenlik & KVKK

- Şoför ve müşteri verisi kişisel veri → **KVKK** kapsamında: açık rıza, amaçla sınırlılık, saklama süresi
- İletim (TLS) ve depoda (at-rest) şifreleme
- Belgelere yalnızca imzalı URL ile erişim, kamuya açık bucket yok
- Rol ve tenant bazlı erişim (RLS)
- Erişim/işlem logları (`audit_logs`)
- Yedekleme ve veri silme politikası

---

## 11. VSCode + Claude ile Çalışma Önerileri

- **Repo yapısı (monorepo opsiyonu):**
  ```
  /apps/web        (Next.js CRM + PWA)
  /apps/mobile     (Expo — v2'de)
  /packages/types  (paylaşılan TypeScript tipleri)
  /supabase        (migration + RLS politikaları)
  ```
- Repo köküne bir **`CLAUDE.md`** koy: stack, klasör yapısı, kod stili, yapma/yapılacaklar. Claude bunu otomatik okur ve tutarlı kalır.
- **Küçük ve dikey dilimlerle** ilerle: "şoför ekleme" özelliğini uçtan uca (DB → API → UI) bitir, sonra diğerine geç. Tek seferde devasa istek verme.
- Şema değişikliklerini migration dosyası olarak tut (Supabase CLI).
- Her özellikten sonra kısa testler iste (en azından kritik akışlar).

---

## 12. İlk Somut Adımlar

1. Yukarıdaki **kritik kararları** (Bölüm 8) netleştir.
2. Supabase projesi aç + `organizations`, `users` tablolarını ve RLS'i kur.
3. Next.js iskeleti + Supabase Auth ile giriş akışını çalıştır.
4. Firma admini → şoför ekleme ekranını (Faz 1) uçtan uca bitir.
5. Sefer oluşturma + şoföre atama (Faz 2).
6. Şoför tarafında kamera ile belge yükleme prototipini çıkar (Faz 3).

---

## 13. Altın Kurallar (kod yazarken ZORUNLU)

> Bu özet her session'da okunur ve **model fark etmeksizin** (Sonnet/Opus) aynı
> kaliteyi sağlamak içindir. Tam detay: **`CONVENTIONS.md`**. Güncel durum:
> **`memory/project_state.md`**. Yol haritası: **`ROADMAP.md`**.

1. **Kalite kapısı:** "bitti" demeden önce `npm run check` + `npm run build`
   temiz geçmeli. Biçim Prettier'a, kurallar ESLint'e bırakılır.
2. **i18n zorunlu:** kullanıcıya görünen her metin çeviri anahtarı; her anahtar
   **hem `messages/tr.json` hem `en.json`'a** eklenir.
3. **shadcn = base-ui (Radix değil):** `Button`'da `asChild` yok →
   `buttonVariants()`. İkon `lucide-react`, bildirim `sonner`.
4. **Supabase tipleri elle:** `lib/supabase/database.types.ts` migration ile
   senkron tutulur; her tabloda `Relationships: []`; gerekirse `.single<T>()` /
   `.returns<T[]>()`.
5. **Mutasyon = Server Action** (`{ ok, error?, message? }` deseni); varsayılan
   Server Component, `"use client"` sadece gerekince.
6. **Multi-tenant + RLS:** her satırda `organization_id`; normal sorgu RLS'e
   güvenir.
7. **Service-role yalnız sunucuda** (`lib/supabase/admin.ts`, `server-only`);
   RLS bypass olduğu için org/rol/çapraz-tenant **el ile** doğrulanır.
8. **Sırlar yalnız `.env.local`** (gitignored); `.env.example`/commit/sohbete
   ASLA gerçek anahtar yazma.
9. **PowerShell:** `app/[locale]` gibi `[...]` yollarında **`-LiteralPath`** şart.
10. **Git:** commit kimliği `otomasyontestmailim`; mesaj sonunda
    `Co-Authored-By: Claude`; `push` sadece kullanıcı onayıyla.
11. **Dikey dilimler:** DB → action → UI uçtan uca, küçük adımlarla.
12. **Session ritmi:** başta `project_state.md` oku, sonda güncelle (token
    tasarrufu — büyük CLAUDE.md'yi yeniden okuma).
