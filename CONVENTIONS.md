# CONVENTIONS — Kod Yazım Standardı

> Bu dosya, bu projede kod yazarken uyulacak **bağlayıcı** kuralları içerir.
> Amaç: hangi geliştirici veya AI modeli (Sonnet/Opus farketmez) yazarsa yazsın
> **aynı kalite ve aynı desenler**. Kısa özet CLAUDE.md "Altın Kurallar"
> bölümünde; tam detay burada. Biçim/temel kalite ayrıca Prettier + ESLint +
> `npm run check` + pre-commit hook ile **mekanik** olarak da zorlanır.

---

## 1. Stack & sürüm gerçekleri

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript strict**.
- **Tailwind CSS v4**, **shadcn/ui (base-nova preset)**.
- **next-intl v4** (TR/EN i18n, `app/[locale]` yönlendirmeli).
- **Supabase**: `@supabase/ssr` (auth + DB), `@supabase/supabase-js` (admin).
- Tek Next.js uygulaması (CRM + şoför PWA). Monorepo YOK.

## 2. UI / shadcn (base-nova) tuzakları

- Bileşenler **base-ui** tabanlı (`@base-ui/react`), **Radix DEĞİL**.
- `Button`'da **`asChild` YOK**. Bir Link'i buton gibi göstermek için:
  ```tsx
  import { buttonVariants } from "@/components/ui/button";
  <Link className={buttonVariants({ variant: "outline" })}>...</Link>;
  ```
- Mevcut variant'lar: `default | outline | secondary | ghost | destructive |
link`. Size'lar: `default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg`.
- İkonlar `lucide-react`. Bildirimler `sonner`'dan `toast`.
- Yeni shadcn bileşeni eklerken `npx shadcn@latest add <x>` ve base-nova
  uyumunu doğrula.

## 3. i18n (next-intl) — ZORUNLU

- Kullanıcıya görünen **hiçbir metni** sabit yazma. Daima çeviri anahtarı kullan.
- Her yeni anahtar **HEM `messages/tr.json` HEM `messages/en.json`'a** eklenir.
  Biri eksikse runtime hata. Namespace düzenini koru (App, Common, Auth, Nav,
  Dashboard, Drivers, Customers, Trips, Documents, Driver, Roles).
- Server'da `getTranslations("Ns")`, client'ta `useTranslations("Ns")`.
- Yönlendirme/Link bileşenleri `@/i18n/navigation`'dan (`Link`, `redirect`,
  `useRouter`, `usePathname`). Ham `next/link` kullanma.

## 4. Supabase tip disiplini

- `lib/supabase/database.types.ts` **ELLE** tutulur (MCP token bu projeye
  erişemiyor, `supabase gen types` çalışmıyor). **Şema değişince burayı da
  güncelle** — migration ve tip dosyası senkron kalmalı.
- `@supabase/supabase-js` v2.107 `Database` tipinde **her tabloda
  `Relationships: []`** ve şema seviyesinde **`Views` + `CompositeTypes`** ister.
  Eksikse `.insert()` parametresi `never`'a düşer ve build kırılır.
- Embedded select / `.single()` bazen tipi `never`'a düşürür. Satır tipini
  açıkça override et:
  ```ts
  .single<ProfileRow>()
  .returns<UserRow[]>()
  ```
- Tüm client'lar generic ile tiplenir: `createBrowserClient<Database>`,
  `createServerClient<Database>`.

## 5. Server / Client sınırı

- **Varsayılan Server Component.** `"use client"` yalnızca state/effect/event
  gerektiğinde.
- Veri **mutasyonları Server Action** ile (`"use server"`), formlar
  `useActionState` ile bağlanır.
- Server Action dönüş tipi tutarlı: `{ ok: boolean; error?: string;
message?: string }`. Başarıda `message`, hatada `error` (anahtar/kod) döner;
  UI bunu çeviriyle gösterir (`toast`).
- Dosya düzeni: sayfa `page.tsx`, eylemler `actions.ts`, etkileşimli parça
  `*-client.tsx`.

## 6. Çok kiracılılık (multi-tenant) & RLS

- Her tabloda `organization_id`. Veri izolasyonu **RLS** ile (migration'da
  tanımlı). Normal sorgular RLS'e güvenir; org filtresini elle yazmaya gerek yok.
- `current_org_id()` ve `current_user_role()` security-definer yardımcıları RLS
  politikalarında kullanılır.
- Şoför yalnızca kendine atanan seferleri/kendi belgelerini görür (RLS).
- **Dosya yükleme = tarayıcıdan doğrudan Storage'a** (Server Action'a dosya
  geçirme — ~1 MB body limiti). Path: `{org_id}/{trip_id}/{uuid}.jpg`; storage
  RLS politikaları (`0002_storage_documents.sql`) yetkiyi doğrular. Yükleme
  öncesi `lib/image.ts` ile canvas sıkıştırma.
- **`documents.file_url` = storage PATH** (URL değil; bucket private).
  Görüntüleme her zaman `lib/supabase/storage.ts` imzalı URL helper'ı ile.

## 7. Service-role (admin) client kuralı

- `lib/supabase/admin.ts` (`createAdminClient`) **RLS'i BYPASS eder**.
- **YALNIZCA** Server Action içinde kullan; dosya `import "server-only"` ile
  korunur (yanlışlıkla client'a sızarsa build kırılır).
- RLS devre dışı olduğu için **yetki/izolasyonu EL İLE doğrula**: çağıran
  admin/dispatcher mı? Hedef kayıt çağıranın `organization_id`'sinde mi?
  (Örnek desen: `app/[locale]/(panel)/drivers/actions.ts`.)
- Auth kullanıcısı oluşturma/silme (`auth.admin.*`) yalnızca buradan. Çok adımlı
  işlemde hata olursa önceki adımı geri al (orphan bırakma).

## 8. Güvenlik & KVKK

- Sırlar **yalnızca `.env.local`** (gitignored). **ASLA** `.env.example`'a,
  izlenen herhangi bir dosyaya, commit'e veya sohbete yazma. `.env.example` yalnız
  placeholder içerir.
- `anon key` herkese açık-güvenli (RLS korur); `service_role` key TAM yetki —
  sadece sunucu, sadece `.env.local`.
- Belgelere erişim imzalı URL ile (özel bucket, kamuya açık değil).
- Kişisel veri (şoför/müşteri) → KVKK: amaçla sınırlılık, TLS, at-rest şifreleme,
  `audit_logs`.

## 9. Platforma özel (Windows / PowerShell)

- `app/[locale]` gibi `[...]` köşeli parantezli yollar PowerShell'de **wildcard**
  sayılır. `Remove-Item`/`Test-Path`/`Get-ChildItem`'da **DAİMA `-LiteralPath`**
  kullan; aksi halde sessizce yanlış yolda çalışır.
- Write/Edit araçları literal yol alır, sorun çıkarmaz.

## 10. Git & commit

- Commit kimliği **`otomasyontestmailim`** / noreply e-posta (repo-local config).
  Furkan'ın kişisel hesabına commit ATILMAZ.
- Commit mesajı sonunda: `Co-Authored-By: Claude <noreply@anthropic.com>`.
- `push` yalnızca kullanıcı onayıyla. Satır sonu LF (`.gitattributes`).

## 11. Kalite kapısı (mekanik)

- "Bitti" demeden önce: **`npm run check`** (lint + typecheck + format:check) ve
  **`npm run build`** temiz geçmeli.
- Biçim Prettier ile (`.prettierrc.json`): çift tırnak, 2 boşluk, noktalı virgül,
  trailing comma, printWidth 80, LF.
- ESLint: next core-web-vitals + TS + `consistent-type-imports`,
  `no-unused-vars` (error, `_` muaf), `no-explicit-any` (warn).
- **Pre-commit hook** (husky + lint-staged) değişen dosyalara otomatik
  `eslint --fix` + `prettier --write` uygular → model farketmeksizin commit'e
  giren kod aynı biçimde.

## 12. Çalışma ritmi

- **Küçük dikey dilimler:** bir özelliği DB → Server Action → UI uçtan uca bitir,
  sonra diğerine geç. Tek seferde devasa değişiklik yapma.
- Şema değişiklikleri migration dosyası olarak (`supabase/migrations/`), tip
  dosyası eşzamanlı güncellenir.
- **Session başı:** `memory/project_state.md` oku (büyük CLAUDE.md'yi yeniden
  okuma — token tasarrufu). **Session sonu:** `project_state.md`'yi güncelle.
- Yol haritası `ROADMAP.md`'de; tamamlananları işaretle.

---

_İlgili: kısa özet için CLAUDE.md "Altın Kurallar"; yol haritası için
`ROADMAP.md`; canlı durum için `memory/project_state.md`._
