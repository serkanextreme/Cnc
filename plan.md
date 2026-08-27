# Development Plan — “Talaş” Offline CNC Kesme Parametreleri Mobil Uygulaması

## 1. Objectives
- ZIP içindeki **7 ekranlık UI tasarımını 1:1 koruyarak** (renk tokenları, tipografi, ikon dili, mobil layout) çalışan bir mobil web uygulaması (PWA) yapmak.
- **Offline-first**: İnternet olmadan çalışacak; materyal kütüphanesi, geçmiş, favoriler, ayarlar, makine profilleri cihazda saklanacak.
- Freze/Torna/Matkap/Diş/Chatter-Free/Trokoidal için canlı hesap: **n (RPM), Vf/feed, Vc doğrulama + Q/MRR, güç (kW), tork (Nm), çevrim süresi, Ra**.
- **Hazır malzeme kütüphanesi** + kullanıcı **kendi malzemesini ekle/düzenle/sil**.
- **Birim sistemi seçimi**: Metrik (varsayılan) + Imperial (SFM/IPM/IPR) toggle.
- **Makine limiti**: Varsayılan otomatik preset; checkbox açılırsa manuel limit girişi aktif.
- **Mobil taşınabilirlik**: Hesap motoru/DB, gelecekte React Native/Expo uygulamasına taşınacak şekilde paketlenmiş olacak.
- **Mobil uygulama varlıkları**: React Native/Expo için offline paket içinde **ikon + splash** hazır olacak.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-2): İlerleme (F) birim netliği + tezgâha uygun format**
  - Her operasyonda **G94 (mm/dk) ve G95 (mm/dev)** ilerleme değerleri **aynı anda** gösterilir.
  - Tezgâhın F okuma modu artık **operasyon başına** ayarlanır.
  - “Tezgâha girilecek F” kartında **makineye yazılacak ham değer** gösterilir.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-3): Tezgâh S/F geri kontrol + matkapta mm/diş desteği (katalog uyumu)**
  - Tezgâhtaki **S (devir)** ve **F** girilerek **Vc, f, fz, Vf** geri hesaplanır.
  - Matkapta katalog uyumu için **fz girişi** ve **z (dudak) sayısı** desteklenir.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-4): “Tezgâhtan Geri Kontrol” kartı 5 ekranın tamamında**
  - Kart artık **Freze / Torna / Matkap / Kılavuz-Diş / Chatter-Free** ekranlarının hepsinde vardır.

- ✅ **P0 (TAMAMLANDI, Rev-5): Mobile/Expo app.json + ikon/splash paketinin hazırlanması**
  - `/app/mobile-transfer` içine **Expo uyumlu `app.json`** eklendi.
  - Aynı klasöre **icon / adaptive-icon / splash / favicon** üretildi.
  - Üretim için dış bağımlılık olmadan çalışan `generate_icons.py` (PIL/Pillow) eklendi.
  - iOS/Android için **mikrofon izinleri** (chatter-free modülü) `app.json` içinde tanımlandı.

---

## 2. Implementation Steps

### Phase 1 — Core POC (izole doğrulama, Python) ✅
**Amaç:** Hesap motoru + birim dönüşümleri + limit clamp + malzeme DB bütünlüğü kırılmadan çalışıyor mu kanıtlamak.

User stories (POC odaklı)
1. As a user, I want the calculator to reproduce the mockup’s sample results exactly so I can trust the app.
2. As a user, I want the engine to validate Vc/feed ranges per material/tool so I don’t pick unsafe values.
3. As a user, I want machine limit clamping to cap RPM automatically so I don’t exceed my machine.
4. As a user, I want metric↔imperial conversion to keep results consistent so I can work in my preferred units.
5. As a user, I want the built-in material library to be complete and structurally valid so I can rely on it offline.

Deliverables
- `/app/test_core.py` passing locally
- Confirmed formula set + rounding/format rules

---

### Phase 2 — V1 App Development (React + Tailwind, offline PWA) ✅
**Amaç:** Tasarımı koruyarak tüm ekranları çalışan uygulamaya dönüştürmek.

User stories (V1)
1. As a user, I want to pick a material and instantly see recommended ranges so I can start quickly.
2. As a user, I want live-updating RPM/feed/MRR/power/torque results while typing so I can iterate fast.
3. As a user, I want clear “Uygun/Geçersiz/Uyarı” badges when I’m outside recommended ranges so I can avoid mistakes.
4. As a user, I want to save a calculation and later reopen it from Geçmiş so I can reuse proven parameters.
5. As a user, I want the app to work without internet and be installable to my home screen.

Deliverables
- Working PWA in `frontend/` with all screens functional
- All data persists locally; app works with no internet

---

### Phase 3 — Polish + Robustness + Optional Backend API ✅/🟡
**Amaç:** Üretim kalitesi UX, veri yönetimi, tutarlılık ve opsiyonel referans API.

Not: Export/import, TR sayı formatı, uyarı/validasyon tutarlılığı vb. iyileştirmeler büyük ölçüde uygulanmış durumda; opsiyonel backend senkronizasyon hâlâ “gelecek iş” alanında.

---

### Phase 4 — Mobile Transfer Paketinin Stabilizasyonu ✅
**Amaç:** Web/PWA’daki çekirdek hesap mantığının React Native’e taşınabilir şekilde senkron kalması ve mobil varlıkların hazır olması.

Kapsam
- `lib/calc.js`, `lib/feed.js`, `lib/units.js` ve `data/*.json` dosyalarının `/app/mobile-transfer` içine senkronlanması ✅
- Mobil tasarım tokenları `design-tokens.json` ✅
- **Expo config + ikon/splash varlıkları** ✅

Deliverables
- `/app/mobile-transfer/app.json` (ikon/splash/adaptive icon, izinler)
- `/app/mobile-transfer/assets/*` (icon/adaptive-icon/splash/favicon)
- `/app/mobile-transfer/generate_icons.py` ile yeniden üretilebilir tasarım

---

## 3. Next Actions

### P0 KRİTİK — “İlerleme (F) Birim Netliği” ✅ TAMAMLANDI (Rev-2)
**Hedef:** Tezgâhta G94/G95 karışıklığı riskini azaltmak.

Kararlar (uygulandı)
- İlerleme iki değer birlikte gösterilir: **G94 (mm/dk)** + **G95 (mm/dev)**
- Operasyon bazlı varsayılanlar doğru atanır
- Tezgâha girilecek F değeri ham formatta (G94 tam sayı; G95 noktalı)

Doğrulama
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_7.json` → PASS

---

### P0 KRİTİK — “Tezgâhtan Geri Kontrol + Matkap mm/diş” ✅ TAMAMLANDI (Rev-3)
**Hedef:** Sahadaki gerçek tezgâh değerleriyle uygulama hesaplarının anlam eşlemesini yapmak.

Doğrulama
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_8.json` → PASS

---

### P0 KRİTİK — “MachineCheckCard tüm operasyonlarda” ✅ TAMAMLANDI (Rev-4)
**Hedef:** Geri kontrol kartını tüm ana operasyon ekranlarına yaymak.

Doğrulama
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_9.json` → PASS

---

### P0 — Mobile/Expo ikon + splash + app.json ✅ TAMAMLANDI (Rev-5)
**Hedef:** Gelecekte Expo/React Native uygulaması oluşturulduğunda, ikon/splash/izinler hazır gelsin.

Uygulanan işler (dosyalar)
1. ✅ `/app/mobile-transfer/app.json`
   - `expo.icon`, `expo.splash`, `android.adaptiveIcon`, `web.favicon`
   - iOS/Android mikrofon izni (Chatter-Free için):
     - iOS: `NSMicrophoneUsageDescription`, `UIBackgroundModes: ["audio"]`
     - Android: `permissions: ["RECORD_AUDIO"]`
2. ✅ `/app/mobile-transfer/generate_icons.py`
   - PIL tabanlı üretim (harici araç/vektör bağımlılığı yok)
   - Talaş renk tokenları: arkaplan `#111719`, amber `#F4B942`, teal `#55C6C3`
   - Motif: CNC spindle-head + iş parçası (marka ikon diliyle uyumlu)
3. ✅ Üretilen varlıklar: `/app/mobile-transfer/assets/`
   - `icon.png` (1024×1024)
   - `adaptive-icon.png` (1024×1024, şeffaf, Android safe-zone ölçekli)
   - `splash.png` (1284×2778, “TALAŞ” wordmark + alt başlık)
   - `favicon.png` (196×196)
4. ✅ Dokümantasyon
   - `/app/mobile-transfer/README.md` içine dosyalar eklendi

Notlar
- Web/PWA tarafındaki ikonlar **değiştirilmedi** (stabil sürüm korunuyor).

---

### P1 — Takım Kütüphanesi ile Otomatik Doldurma (sıradaki, kullanıcı onayı bekleniyor)
**Hedef:** Operasyon ekranlarında takım seçildiğinde çap/ağız sayısı/helis boyu vb. alanların otomatik gelmesi.

Önerilen adımlar:
1. Takım veri modelini netleştir: `diameter`, `flutes(z)`, `fluteLength`, `toolType`, `notes`.
2. Operasyonlara “Takım seç” akışı:
   - Freze/Chatter-Free: Ø, z, helis boyu otomatik
   - Matkap: Ø, **z (dudak sayısı)** otomatik
   - Diş frezesi: takım Ø, z otomatik
3. Seçilen takımın değerlerini draft’lara patch’le.
4. Geçmiş kaydı ve paylaşım metninde takım bilgisini göster.

---

### P2 — Parça Programı / Toplam Çevrim Süresi (kullanıcı onayı bekleniyor)
**Hedef:** Bir parça için operasyon zinciri kurup toplam süre/maliyet çıkarmak.

Önerilen adımlar:
1. Operasyonları “satır” olarak ekleyip sıralama.
2. Her satırda çevrim süresi + maliyet.
3. Toplam süre, toplam maliyet, takım ömrü tüketimi.
4. Dışa aktarım (PDF/JSON) opsiyonu.

---

### P3 — Tezgâh Profilleri (Opsiyonel ama önerilir)
**Hedef:** Birden fazla tezgâhı olan kullanıcıların tek dokunuşla geçiş yapması.

Önerilen adımlar:
1. Makine profili modeli: `label`, `maxRpm`, `maxFeed`, `powerKw`, `efficiency`, `feedModeByOp`, `maxFeedPerRev`, matkap default `z`, varsayılan `feedInput (f/fz)`.
2. Ayarlar’da “Makine profili seç” + “yeni profil oluştur”.
3. Hesap ekranlarında aktif profile göre limit clamp ve uyarılar.

---

## 4. Success Criteria
- Mockup sample calculations match within rounding: Freze 3714 RPM / 1188 mm/dk, Torna 1146 / 252, Matkap 2546 / 407 and ~4.4s.
- Hazır malzeme kütüphanesi offline erişilebilir; custom material CRUD çalışır.
- Live calculators compute: n, Vf, Vc validation, Q/MRR, kW, torque, cycle time, Ra.
- Machine limit works with default preset + checkbox enabling manual entry; clamp is clearly indicated.
- Unit system toggle updates inputs/ranges/results/history correctly.
- App is installable PWA and fully usable with **no internet** (no CDN).

- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-2):**
  - Tüm operasyonlarda F hem **G94 (mm/dk)** hem **G95 (mm/dev)** olarak görünür.
  - **Operasyon bazlı** varsayılan modlar doğru.
  - Tezgâha yazılacak F değeri ham biçimde verilir (G94’te **tam sayı, grup ayırıcısız**; G95’te **ondalık nokta**).
  - G-code satırı doğru formatta üretilir.

- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-3):**
  - Tezgâhtaki S/F değerleri uygulamada geri hesaplanabilir: Vc, f, fz, Vf net görünür.
  - Matkapta **mm/diş (fz)** girişi ve **z** ile dönüşüm doğru çalışır.

- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-4):**
  - “Tezgâhtan geri kontrol” kartı **5 ana operasyon ekranının tamamında** mevcuttur.
  - Chatter-Free’de RCTF telafisi apply akışında ters çevrilir (çift telafi yok).

- ✅ **P0 başarı kriterleri (tamamlandı, Rev-5):**
  - `/app/mobile-transfer` içinde Expo için `app.json` ve gerekli varlıklar mevcut.
  - `icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` doğru referanslanır.
  - Varlıklar **yeniden üretilebilir** (script ile) ve web/PWA’yı etkilemez.

---

## DURUM GÜNCELLEMESİ

### Phase 1 — Core POC ✅ TAMAMLANDI
- `/app/test_core.py` — testler geçti
- Mockup sayıları doğrulandı

### Phase 2 — Uygulama ✅ TAMAMLANDI
- Offline-first PWA, localStorage kalıcılık, tasarım 1:1, share/export, geçmiş ve malzeme akışları

### Phase 3–6 (genişletmeler) ✅
- Diş/kılavuz, takım ömrü & maliyet, chatter-free/HEM, trokoidal, mobil hazırlık

### P0 KRİTİK: İlerleme (F) birim netliği ✅ TAMAMLANDI (Rev-2)
- Yeni `FeedCard` + `feed.js` motoru
- Ayarlar’da **operasyon bazlı** G94/G95 seçimi
- Test: `testing_agent_v3` iteration_7 → PASS

### P0 KRİTİK: Tezgâhtan geri kontrol + matkap mm/diş ✅ TAMAMLANDI (Rev-3)
- Yeni: `MachineCheckCard` (S/F → Vc, f, fz, Vf + çap karşılaştırması + apply)
- Matkap: `z` (varsayılan 2) + `mm/dev ↔ mm/diş` giriş seçimi
- Test: `testing_agent_v3` iteration_8 → PASS

### P0 KRİTİK: MachineCheckCard tüm operasyonlarda ✅ TAMAMLANDI (Rev-4)
- Kılavuz/Diş (`pages/Threading.js`) ve Chatter-Free (`pages/ChatterFree.js`) entegrasyonu tamamlandı
- Test: `testing_agent_v3` iteration_9 → PASS

### P0: Mobile/Expo ikon + splash + app.json ✅ TAMAMLANDI (Rev-5)
- `/app/mobile-transfer/app.json` eklendi (icon/splash/adaptive icon + mikrofon izinleri)
- `/app/mobile-transfer/assets/` üretildi (icon/adaptive-icon/splash/favicon)
- `generate_icons.py` ile bağımsız yeniden üretim akışı eklendi
- Web/PWA ikonları **değişmedi**; stabil sürüm korunuyor
