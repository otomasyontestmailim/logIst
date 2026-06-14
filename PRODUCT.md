# Product

## Register

product

## Users

Tek üründe iki rol:

- **Firma admini / dispatcher (web panel):** Ofiste, masaüstünde; aynı anda çok
  sefer/şoför/belge yönetir. İşi: sefer planlamak, şoföre atamak, gelen belgeleri
  inceleyip onaylamak/reddetmek, müşteri ilişkileri. Yoğun veri, hızlı karar.
- **Şoför (mobil PWA):** Yolda; çoğu zaman zayıf veya kesik internette (sınır
  geçişleri, ölü bölgeler). İşi: atanan seferi görmek, belge (CMR/fatura/irsaliye/
  kantar/ADR/gümrük/teslim tutanağı) taramak ve yüklemek, sefer durumunu güncellemek.
  Kısa, kesintiye dayanıklı etkileşim.
- **Süper admin (platform sahibi):** Firmaları (tenant) açar/yönetir.
  Bağlam: çok kiracılı SaaS — her firma yalnız kendi verisini görür (RLS).

## Product Purpose

Lojistik firmaları için şoför-belge & sefer CRM'i. Sefer evrakını sahada
dijitalleştirip doğru sefere bağlamak ve ofisin sefer/şoför/müşteri/belge akışını
tek yerden yönetmesi. Başarı: belgenin kaybolmadığı, geciken teslimatın gözden
kaçmadığı, dispatcher'ın "her şey nerede?" sorusuna bir bakışta cevap aldığı bir operasyon.

## Brand Personality

Sakin, güvenilir, sessizce yetkin. Ses tonu net ve profesyonel, gösterişsiz. Araç
gözden kaybolur, iş öne çıkar (Stripe/Linear sükûneti). Güven ve kontrol hissi
verir; heyecan, eğlence veya aciliyet pazarlaması değil.

## Anti-references

- Tüketici/oyunlaştırılmış uygulamalar: aşırı renk, gereksiz animasyon, emoji,
  rozet/oyun mekaniği.
- Eski ağır kurumsal ERP: kalabalık gri tablolar, sıkışık 2010-tarzı kurumsal yazılım.
- Paylaşılan yasaklar geçerli: mor→mavi gradient, kart içinde kart, her başlık
  üstünde ikon kutusu, her bölümde küçük tracked büyük-harf eyebrow.

## Design Principles

1. **Araç gözden kaybolur.** Her ekran tek bir işe hizmet eder; süs değil işlev.
2. **Bir bakışta durum.** Dispatcher neyin nerede/neyin geciktiğini taramadan
   görür; renk ve hiyerarşi durumu taşır, dekorasyonu değil.
3. **Tek dil, iki yüzey.** Web panel ve şoför PWA aynı bileşen/renk/ikon sözlüğünü
   paylaşır; ekranlar arası tutarlılık bir erdem.
4. **Durum-zengin ve dayanıklı.** Yükleniyor/boş/hata/**offline** birinci sınıf
   tasarım konusu; zayıf internet normaldir. Boş durumlar arayüzü öğretir.
5. **Yoğunluğa saygı, gürültüye hayır.** Dispatcher çok veri ister; bunu sıkışıklık
   veya gri ERP'ye düşmeden ritimli boşluk ve net tipografiyle ver.

## Accessibility & Inclusion

- WCAG 2.1 AA: gövde metni ≥4.5:1, büyük metin ≥3:1 (placeholder dahil).
- Üç dil (NL / EN / TR) — uzun çeviriler ve metin taşması her breakpoint'te test
  edilir; her kullanıcıya görünen metin üç dilde de anahtarlanır.
- Reduced-motion alternatifleri zorunlu; hareket durumu iletir, dekorasyon değil.
- Şoför tarafı: zayıf bağlantıda anlamlı offline/yeniden-deneme durumları, net
  dokunma hedefleri.
