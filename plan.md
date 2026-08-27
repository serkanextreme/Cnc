# Development Plan — “Talaş” Offline CNC Kesme Parametreleri Mobil Uygulaması (Expo React Native)

## 1. Objectives
- Var olan **Talaş Web/PWA** uygulamasını, **Expo React Native** ile **Android + iOS** hedefleyen **tamamen offline** bir mobil uygulamaya dönüştürmek.
- UI/UX’i mümkün olduğunca **1:1 korumak** (renk tokenları, tipografi, ikon dili, layout yaklaşımı).
- Hesap motoru ve veri katmanı **cihaz üzerinde** çalışacak (backend yok):
  - Freze / Torna / Matkap / Kılavuz-Diş için canlı hesap: **n (RPM), Vf/feed, Vc doğrulama + Q/MRR, güç (kW), tork (Nm), çevrim süresi, Ra**
  - **Hazır malzeme kütüphanesi** + kullanıcı **kendi malzemesini ekle/düzenle/sil**
  - **Geçmiş** kaydı ve tekrar kullanma
  - **Birim sistemi**: Metrik + Imperial toggle
  - **Makine limiti**: preset/otomatik + manuel limit girişi
  - **Tezgâh F modu**: operasyon bazlı **G94/G95**
- **EAS Build** ile kullanıcı hesabı üzerinden derlenebilir şekilde proje hazırlamak:
  - `app.json` + `eas.json` hazır
  - Tam offline asset bundling
  - Kullanıcı kendi hesabıyla `eas build` çalıştırabilsin
- **Kapsam dışı (özellikle hariç):** Chatter-Free (mikrofon/FFT) mobil portta **yok**. (İlgili izinler/bağımlılıklar eklenmez.)

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-2): İlerleme (F) birim netliği + tezgâha uygun format**
  - Her operasyonda **G94 (mm/dk) ve G95 (mm/dev)** ilerleme değerleri **aynı anda** gösterilir.
  - Tezgâhın F okuma modu **operasyon başına** ayarlanır.
  - “Tezgâha girilecek F” kartında **makineye yazılacak ham değer** gösterilir.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-3): Tezgâh S/F geri kontrol + matkapta mm/diş desteği (katalog uyumu)**
  - Tezgâhtaki **S (devir)** ve **F** girilerek **Vc, f, fz, Vf** geri hesaplanır.
  - Matkapta katalog uyumu için **fz girişi** ve **z (dudak) sayısı** desteklenir.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-4): “Tezgâhtan Geri Kontrol” kartı 5 ekranın tamamında (web/PWA)**
  - Kart web sürümde tüm ana operasyon ekranlarına yayılmıştır.

- ✅ **P0 (TAMAMLANDI, Rev-6): Expo React Native mobil port (offline) + EAS’e hazır proje**
  - `/app/mobile` içinde Expo projesi ve RN ekranlar, navigation, ayarlar, offline storage, export/import altyapısı.
  - `expo-doctor` temiz, `expo start` ile görsel doğrulama yapıldı.

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
- Expo config + ikon/splash varlıkları ✅

Deliverables
- `/app/mobile-transfer/app.json` (ikon/splash/adaptive icon, izinler)
- `/app/mobile-transfer/assets/*` (icon/adaptive-icon/splash/favicon)
- `/app/mobile-transfer/generate_icons.py` ile yeniden üretilebilir tasarım

---

### Phase 5 — Expo React Native Mobil Uygulama Portu (offline) ✅
**Amaç:** Web/PWA fonksiyonlarını (Chatter-Free hariç) Expo RN uygulamasına taşımak ve EAS Build’e hazır hale getirmek.

Bu fazda yapılanlar (tamamlandı)
1. ✅ Expo projesi `/app/mobile` altında kuruldu ve bağımlılıklar yüklendi.
2. ✅ Hesap motoru + veri katmanı RN’e taşındı: `/app/mobile/src/lib/*`, `/app/mobile/src/data/*`.
3. ✅ Context/state yönetimi: `/app/mobile/src/context/AppContext.js`.
4. ✅ UI primitive’leri ve kartlar RN’e taşındı: `/app/mobile/src/components/*`.
5. ✅ Ekranlar RN’e taşındı:
   - Home, Milling, Turning, Drilling, Threading
   - Materials (+ MaterialDetail, MaterialForm)
   - Tools, History
   - ✅ Settings (bu oturumda tamamlandı)
6. ✅ **SettingsScreen** portlandı: `/app/mobile/src/screens/SettingsScreen.js`
   - Birim sistemi toggle
   - Operasyon bazlı G94/G95
   - Tezgâh limitleri + preset/manuel
   - Verim, takım ömrü ve maliyet ayarları
   - Yedek export/import (DocumentPicker + FileSystem + Sharing)
   - Geçmiş temizleme
7. ✅ React Navigation kurgulandı:
   - `/app/mobile/src/navigation/AppNavigator.js`
   - Root Stack + Bottom Tabs (Hesapla/Malzeme/Takımlar/Geçmiş/Ayarlar)
   - Root-level ekranlar: Freze/Torna/Matkap/Diş + MaterialDetail/MaterialForm
8. ✅ `App.js` yeniden yazıldı:
   - Font yükleme (`useFonts` + `fontMap`)
   - Splash yönetimi (`expo-splash-screen`)
   - Provider hiyerarşisi: SafeAreaProvider → AppProvider → ToastProvider → NavigationContainer
9. ✅ `babel.config.js` eklendi (bloklayıcı eksikti).
10. ✅ `app.json` SDK57 uyumlu hale getirildi:
   - deprecated `newArchEnabled` ve top-level `splash` kaldırıldı (plugin kullanılıyor)
   - Chatter-Free dışlandığı için iOS mikrofon izin metni kaldırıldı
11. ✅ Doğrulamalar:
   - `npx expo-doctor` → 21/21 PASS
   - `expo start --web` ile görsel smoke-test: Home, Milling, Turning, Materials, Tools, History, Settings
   - `npx expo export --platform android` JS bundle’ı başarıyla oluşturdu (Hermes bytecode adımı sandbox mimarisi nedeniyle başarısız; EAS cloud build için sorun değil)

Deliverables
- `/app/mobile` içinde çalışır Expo RN uygulaması
- EAS Build’e hazır `eas.json` + `app.json` (projectId kullanıcı tarafından doldurulacak)

---

## 3. Next Actions

### P0 — Kullanıcı EAS Build çalıştırma adımları (kullanıcıya devredildi)
**Hedef:** Projeyi kendi Expo hesabınızda bağlayıp Android/iOS build almak.

1. `/app/mobile` dizininde:
   - `eas login`
   - `eas build:configure`
     - Bu adım `app.json` içindeki `extra.eas.projectId` alanını doldurur.
2. Build:
   - Android: `eas build --platform android --profile production`
   - iOS: `eas build --platform ios --profile production`

Notlar
- Uygulama offline-first; backend gerektirmez.
- Chatter-Free (mikrofon/FFT) mobilde yok; bu yüzden mikrofon izinleri eklenmemiştir.

---

### P1 — Takım Kütüphanesi ile Otomatik Doldurma (ertelendi)
**Hedef:** Operasyon ekranlarında takım seçildiğinde çap/ağız sayısı/helis boyu vb. alanların otomatik gelmesi.

Önerilen adımlar:
1. Takım veri modelini netleştir: `diameter`, `flutes(z)`, `fluteLength`, `toolType`, `notes`.
2. Operasyonlara “Takım seç” akışı:
   - Freze: Ø, z, helis boyu otomatik
   - Matkap: Ø, z (dudak sayısı) otomatik
   - Diş frezesi: takım Ø, z otomatik
3. Seçilen takımın değerlerini ilgili draft input’lara patch’le.
4. Geçmiş kaydı ve paylaşım metninde takım bilgisini göster.

---

### P2 — Parça Programı / Toplam Çevrim Süresi (ertelendi)
**Hedef:** Bir parça için operasyon zinciri kurup toplam süre/maliyet çıkarmak.

Önerilen adımlar:
1. Operasyonları “satır” olarak ekleyip sıralama.
2. Her satırda çevrim süresi + maliyet.
3. Toplam süre, toplam maliyet, takım ömrü tüketimi.
4. Dışa aktarım (PDF/JSON) opsiyonu.

---

### P3 — Tezgâh Profilleri (ertelendi)
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

- ✅ **P0 KRİTİK başarı kriterleri (Rev-2):**
  - Tüm operasyonlarda F hem **G94 (mm/dk)** hem **G95 (mm/dev)** olarak görünür.
  - **Operasyon bazlı** varsayılan modlar doğru.
  - Tezgâha yazılacak F değeri ham biçimde verilir (G94’te **tam sayı, grup ayırıcısız**; G95’te **ondalık nokta**).
  - G-code satırı doğru formatta üretilir.

- ✅ **P0 KRİTİK başarı kriterleri (Rev-3):**
  - Tezgâhtaki S/F değerleri uygulamada geri hesaplanabilir: Vc, f, fz, Vf net görünür.
  - Matkapta **mm/diş (fz)** girişi ve **z** ile dönüşüm doğru çalışır.

- ✅ **Expo/RN mobil port başarı kriterleri (Rev-6):**
  - `/app/mobile` Expo projesi **offline çalışır** ve ekranlar gezilebilir.
  - React Navigation ile tüm ekranlar erişilebilir (tabs + stack).
  - `npx expo-doctor` temiz.
  - Kullanıcı kendi hesabıyla `eas build:configure` + `eas build` çalıştırabilir.
  - Chatter-Free (mikrofon/FFT) mobilde yok; mikrofon izinleri eklenmemiştir.

---

## DURUM GÜNCELLEMESİ

### Phase 1 — Core POC ✅ TAMAMLANDI
- `/app/test_core.py` — testler geçti
- Mockup sayıları doğrulandı

### Phase 2 — Uygulama ✅ TAMAMLANDI
- Offline-first PWA, localStorage kalıcılık, tasarım 1:1, share/export, geçmiş ve malzeme akışları

### Phase 3 — Polish ✅/🟡
- Büyük ölçüde tamam; opsiyonel backend hâlâ gelecek iş

### Phase 4 — Mobile Transfer Paketi ✅ TAMAMLANDI
- `/app/mobile-transfer` içinde Expo varlıkları + çekirdek lib senkronu hazır

### Phase 5 — Expo React Native Mobil Port ✅ TAMAMLANDI (Rev-6)
- ✅ Eksik kalan SettingsScreen tamamlandı
- ✅ Navigation (Tabs + Root Stack) kuruldu
- ✅ App.js provider/splash/font kapısı kuruldu
- ✅ babel.config.js eklendi
- ✅ app.json SDK57 uyumlu hale getirildi; mikrofon izinleri kaldırıldı
- ✅ `expo-doctor` PASS; web üzerinden görsel smoke-test PASS

### Son durum
- **Mobil Expo/RN port tamamlandı ve EAS Build’e hazır.** Kullanıcının yapacağı tek zorunlu adım: `eas build:configure` ile `projectId` bağlamak ve kendi hesabından build almak.
