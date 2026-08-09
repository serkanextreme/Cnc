# Talaş — Mobil (Expo / React Native) Taşıma Paketi

Bu klasör, çalışan web sürümünden **hazır ve doğrulanmış** parçaları içerir.
Mobile Agent sohbetinde bu klasörü ekleyip aşağıdaki prompt'u kullanın.

## İçerik
| Dosya | Ne işe yarar |
|---|---|
| `data/materials.json` | **247 malzeme kalitesi** (ISO P/M/K/N/S/H, AISI/DIN/EN/TS/UNS karşılıkları, karbür+HSS Vc/fz/f aralıkları, kc, sertlik) + 13 aile, 51 alt grup, 7 tezgâh preseti |
| `data/threads.json` | **103 diş ölçüsü** (Metrik kaba/ince, UNC, UNF, BSP, NPT) + paso tablosu |
| `lib/calc.js` | **Saf hesap motoru** — React bağımlılığı YOK, doğrudan React Native'de çalışır: freze/torna/matkap, kılavuz/diş frezesi/torna dişi, chatter-free (RCTF), trokoidal kanal, Taylor takım ömrü + maliyet, tezgâh limiti clamp, sertlik düzeltmesi |
| `lib/units.js` | Metrik ⇄ İnç (SFM/IPM/IPR) dönüşümleri + Türkçe sayı biçimlendirme |
| `lib/materials.js` / `lib/threads.js` | Katalog yardımcıları (arama, öneri aralıkları, presetler) |
| `design-tokens.json` | Renk/tipografi/yerleşim tokenları (web ile birebir aynı görünüm için) |
| `test_core*.py` | **279 doğrulama testi** — motorun referans değerleri (Freze 3.714/1.188, Torna 1.146/252, Matkap 2.546/407/4,4 sn, M10 kılavuz matkabı 8,54 mm, RCTF 1,667) |

## Mobile Agent'a verilecek prompt (kopyala–yapıştır)
> Ekli `mobile-transfer` klasöründeki hazır hesap motorunu (`lib/calc.js`), birim
> dönüşümlerini (`lib/units.js`), 247 malzemelik `data/materials.json` ve 103 diş
> ölçülü `data/threads.json` dosyalarını **olduğu gibi** kullanarak Expo (React Native)
> uygulaması yap. Tasarım `design-tokens.json`'daki koyu tema + Barlow Condensed/IBM
> Plex Sans ile birebir aynı olsun. Ekranlar: Hesapla (ana), Freze, Torna, Matkap,
> Kılavuz/Diş (3 mod), Chatter-Free (+trokoidal kanal), Malzemeler + detay + özel
> malzeme, Takımlarım, Geçmiş, Ayarlar. Alt sekmeler: Hesapla · Malzeme · Takım ·
> Geçmiş · Ayarlar. Veriler cihazda kalsın (AsyncStorage), internet gerekmesin.
> Arayüz tamamen Türkçe, sayılar tr-TR biçiminde. Hesap sonuçları `test_core*.py`
> içindeki referans değerlerle birebir aynı çıkmalı.

## Web sürümü
Bu paket web sürümünü **etkilemez**; web/PWA sürümü çalışmaya devam eder.
