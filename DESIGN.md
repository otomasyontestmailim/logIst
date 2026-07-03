---
name: Lojistik CRM
description: Sevk kulesi sükûneti — şoför-belge & sefer yönetimi için sakin, güvenilir operasyon arayüzü
colors:
  primary: "oklch(0.52 0.07 195)"
  primary-deep: "oklch(0.45 0.075 195)"
  primary-foreground: "oklch(0.995 0.002 195)"
  bg: "oklch(0.975 0.005 195)"
  card: "oklch(0.995 0.002 195)"
  surface: "oklch(0.96 0.01 195)"
  ink: "oklch(0.20 0.01 195)"
  muted-ink: "oklch(0.53 0.014 195)"
  border: "oklch(0.91 0.008 195)"
  success: "oklch(0.60 0.11 155)"
  warning: "oklch(0.75 0.13 80)"
  danger: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  button-ghost:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Lojistik CRM

## 1. Overview

**Creative North Star: "Sevk Kulesi" (The Dispatch Tower)**

Bu bir kontrol kulesi paneli gibi davranır: dispatcher bir bakışta neyin nerede,
neyin geciktiğini görür; şoför yolda tek elle, zayıf internette güvenle ilerler.
Arayüz sessizce yetkindir — petrol-teal birincil renk yalnızca eylem ve durumu
taşır, dekorasyon yapmaz. Zemin neredeyse beyaz, nötrler birincil rengin hafif
soğuk tonuna (hue 195) doğru kıpırdar; böylece her ekran aynı "sevk kulesi"
atmosferini paylaşır, gri bir ofis yazılımı gibi soğumaz.

Sistem iki şeyi açıkça reddeder. **Tüketici/oyunlaştırılmış** havayı: aşırı renk,
gereksiz animasyon, emoji, rozet yok. **Eski ağır kurumsal ERP**'yi: kalabalık gri
tablolar, sıkışık 2010-tarzı yoğunluk yok. Yoğunluğa saygı duyulur ama ritimli
boşluk ve net tipografiyle taşınır; gürültüyle değil.

Web panel (dispatcher) ile şoför PWA tek tasarım dilini paylaşır: aynı renk, aynı
yarıçap, aynı bileşen sözlüğü. Saha gerçeği — zayıf/yok internet — birinci sınıf
tasarım konusudur: yükleniyor/boş/hata/offline durumları baştan tasarlanır.

**Key Characteristics:**

- Sakin, sessizce yetkin; araç gözden kaybolur, iş öne çıkar.
- Tek vurgu rengi (petrol-teal), yalnızca eylem + durum.
- Soğuk-nötr, neredeyse beyaz zemin; tinted ama gürültüsüz.
- Durum-zengin ve offline-dayanıklı; boş durumlar arayüzü öğretir.
- Tek dil, iki yüzey (panel + şoför PWA).

## 2. Colors

Soğuk, sakin bir petrol-teal ailesi etrafında kurulu neredeyse-tek-vurgu palet;
nötrler aynı hue'ya (195) hafifçe çekilir.

### Primary

- **Petrol Teal** (`#2d6e75` / `oklch(0.52 0.07 195)`): Birincil eylem butonları,
  aktif/seçili nav öğesi, focus ring, durum göstergeleri ve haritada vurgu. Yalnız
  burada; dekoratif zemin olarak asla.
- **Petrol Deep** (`#25575d` / `oklch(0.45 0.075 195)`): Birincil butonun hover/active
  hali ve metin üstü vurgular.

### Neutral — 3 katmanlı tonal istif

> Kural: chrome (sidebar/header) kanvasın bir ton ALTINDA, kartlar bir ton
> ÜSTÜNDE. Derinlik gölgeyle değil bu ton farkıyla kurulur. Dark istif aynı
> mantığın aynası: sidebar 0.14 < kanvas 0.155 < kart 0.205 < popover 0.245
> (koyu temada yüzey yükseldikçe AÇILIR).

- **Bg / kanvas** (`oklch(0.975 0.005 195)`): Ana içerik zemini — soğuk tonlu.
- **Card** (`oklch(0.995 0.002 195)`): Kart/tablo/form yüzeyi — kanvastan
  ayrışan near-white; `--elevation-resting` gölgeyle birlikte.
- **Surface / chrome** (`oklch(0.96 0.01 195)`): Sidebar, header — kanvasın
  bir adım altındaki ray.
- **Ink** (`oklch(0.20 0.01 195)`): Gövde ve başlık metni.
- **Muted Ink** (`oklch(0.53 0.014 195)`): İkincil metin, etiketler,
  placeholder — tonlu yüzeylerde ≥4.5:1 sağlar.
- **Border** (`oklch(0.91 0.008 195)`): Ayraç, kenarlık; input stroke
  `oklch(0.90 0.008 195)`.

### Semantic

- **Success** (`#2e9d66` / `oklch(0.60 0.11 155)`): Tamamlandı/onaylandı durumu.
- **Warning** (`#d89a2a` / `oklch(0.75 0.13 80)`): Yaklaşan belge süresi, geciken teslimat uyarısı.
- **Danger** (`#d23b2a` / `oklch(0.577 0.245 27.325)`): Silme, reddetme, hata.

### Named Rules

**The One Voice Rule.** Petrol-teal herhangi bir ekranın ≤%10'unda görünür. Nadirliği
onun gücüdür; ikinci bir dekoratif renk yok.

**The Tinted Neutral Rule.** Tüm nötrler hue 195'e doğru ≤0.012 chroma çeker. Sıcağa
"varsayılan olarak" kayma yasak (cream/sand AI default'u); soğuk-nötr markanın kendi sesidir.

## 3. Typography

**Body/Display Font:** Geist (fallback: system-ui, sans-serif)
**Mono Font:** Geist Mono (kod yok; takip no, plaka, kg, km, koordinat gibi tabular veri)

**Character:** Tek aile, çok ağırlık. Product UI display/body eşleştirmesi istemez;
iyi ayarlı bir sans başlığı, butonu, etiketi, veriyi taşır. Geist nötr ve teknik —
sevk kulesi sükûnetine uyar.

### Hierarchy

- **Display** (700, 1.5rem/24px, lh 1.2, ls -0.01em): Sayfa başlığı (h1). Sabit rem
  ölçek — fluid clamp yok; product UI'da tutarlı DPI'da daha iyi okunur.
- **Title** (600, 1.125rem/18px, lh 1.3): Kart başlığı, bölüm başlığı, modal başlığı.
- **Body** (400, 0.875rem/14px, lh 1.5): Gövde metni; prose 65–75ch ile sınırlı,
  tablolar daha yoğun olabilir.
- **Label** (500, 0.75rem/12px): Form etiketi, tablo başlığı, durum çipi metni,
  muted ikincil bilgi.
- **Mono** (400, 0.8125rem/13px): Plaka, takip no, ağırlık (kg), mesafe (km),
  koordinat — hizalı, taranabilir tabular veri.

### Named Rules

**The Fixed Scale Rule.** Başlıklar sabit rem ölçek (1.125–1.2 oran). Sidebar'da
küçülen fluid clamp h1 yasak; yoğunluk artar, okunurluk düşer.

## 4. Elevation

Sistem büyük ölçüde düzdür; derinlik gölgeyle değil **tonal katmanla** kurulur
(surface, bg'den bir tık soğuk/koyu). Gölge yalnızca yüzen ve durum bildiren
öğelerde: dropdown, popover, toast, dialog. Kartlar varsayılan olarak düz + 1px border.

### Shadow Vocabulary

- **Resting card** (`box-shadow: 0 1px 2px oklch(0.20 0.01 195 / 0.05)`): Çok hafif;
  kartı zeminden ayırır, yüzdürmez. (Mevcut `shadow-sm` karşılığı.)
- **Floating** (`box-shadow: 0 8px 24px oklch(0.20 0.01 195 / 0.12)`): Dropdown,
  popover, dialog — gerçekten katman üstü öğeler.

### Named Rules

**The Flat-By-Default Rule.** Yüzeyler dinlenirken düzdür. Gölge yalnızca duruma
yanıt olarak (hover, focus, yükselme) belirir. Dekoratif glassmorphism/blur yasak.

## 5. Components

### Buttons

- **Shape:** Yumuşak köşe (8px / `rounded-md`).
- **Primary:** Petrol-teal zemin (`#2d6e75`), beyaz metin, 8px×16px padding. Birincil
  eylem (Kaydet, Ekle, sefer kabul).
- **Hover / Focus:** Hover → Petrol Deep (`#25575d`), 150ms transition. Focus-visible →
  2px petrol-teal ring (offset 2px). `prefers-reduced-motion` → anlık.
- **Secondary / Ghost / Destructive:** Ghost → şeffaf zemin, ink metin, hover'da surface.
  Destructive → danger zemin, beyaz metin (silme/reddetme).
- **States:** default, hover, focus, active, disabled (opaklık 0.5 + cursor not-allowed),
  loading (metin "...kaydediliyor", spinner yerine). Hepsi şart.

### Status Chips (sefer & belge durumu)

- **Style:** Düşük-yoğunluk; renkli zemin yerine renkli metin + ince renkli border veya
  ilgili durumun %10 tint zemini. Tam-doygunluk renkli rozet yasak (özellikle pasif durumda).
- **Mapping:** in_transit/loading → petrol-teal tint; completed/approved → success tint;
  late/rejected → danger tint; pending/warning → warning tint; requested/draft → muted nötr.

### Cards / Containers

- **Corner:** 10px (`rounded-lg`).
- **Background:** bg; sidebar/panel surface.
- **Shadow:** Resting card (yalnız hafif ayrım). Kart içinde kart **yasak**.
- **Border:** 1px border (`#e5e9e9`).
- **Padding:** 16px.

### Inputs / Fields

- **Style:** bg zemin, 1px border, 8px köşe, 8px×12px padding. Placeholder = muted-ink
  (≥4.5:1).
- **Focus:** Border petrol-teal'e döner + 2px petrol-teal ring. 150ms.
- **Error:** Danger border + altında danger yardımcı metin. **Disabled:** surface zemin, muted-ink.

### Navigation (app-shell)

- **Style:** Sol sidebar (surface zemin), Geist label tipografisi, lucide ikonlar.
- **States:** default → muted-ink metin; hover → surface accent + ink; active → petrol-teal
  metin + hafif petrol-teal tint zemin (dolu blok değil). Mobil → şoför PWA tek sütun,
  büyük dokunma hedefleri (≥44px).

## 6. Do's and Don'ts

### Do:

- **Do** petrol-teal'i yalnız eylem, aktif/seçili durum ve durum göstergesinde kullan —
  ekranın ≤%10'u (The One Voice Rule).
- **Do** tüm nötrleri hue 195'e hafif çek; soğuk-nötr markanın sesidir.
- **Do** her interaktif bileşeni yedi durumla gönder: default, hover, focus, active,
  disabled, loading, error.
- **Do** yükleniyor için skeleton kullan, içerik ortasında spinner değil.
- **Do** boş durumları arayüzü öğretecek şekilde yaz ("Henüz sefer yok. İlk seferini ekle").
- **Do** şoför PWA'da anlamlı offline/yeniden-deneme durumları tasarla; zayıf internet normaldir.
- **Do** plaka/takip no/kg/km/koordinatı Geist Mono ile hizala.

### Don't:

- **Don't** tüketici/oyunlaştırılmış havaya kay: aşırı renk, gereksiz animasyon, emoji, rozet.
- **Don't** eski ağır ERP'ye düş: kalabalık gri tablolar, sıkışık 2010-tarzı yoğunluk.
- **Don't** mor→mavi gradient, gradient metin, kart içinde kart, her başlık üstünde ikon
  kutusu veya her bölümde küçük tracked büyük-harf eyebrow kullan.
- **Don't** tam-doygunluk renkli rozet kullan, özellikle pasif durumlarda.
- **Don't** fluid clamp başlık kullan; sabit rem ölçek (sidebar'da küçülme olmaz).
- **Don't** dekoratif gölge/glassmorphism ekle; gölge yalnız durum bildirir.
- **Don't** nötrleri sıcağa (cream/sand) "varsayılan olarak" çek.
