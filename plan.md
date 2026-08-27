# Development Plan — “Talaş” Offline CNC Kesme Parametreleri Mobil Uygulaması

## 1. Objectives
- ZIP içindeki **7 ekranlık UI tasarımını 1:1 koruyarak** (renk tokenları, tipografi, ikon dili, mobil layout) çalışan bir mobil web uygulaması (PWA) yapmak.
- **Offline-first**: İnternet olmadan çalışacak; materyal kütüphanesi, geçmiş, favoriler, ayarlar, makine profilleri cihazda saklanacak.
- Freze/Torna/Matkap/Diş/Chatter-Free için canlı hesap: **n (RPM), Vf (feed), Vc doğrulama + Q/MRR, güç (kW), tork (Nm), çevrim süresi, Ra**.
- **Hazır malzeme kütüphanesi** + kullanıcı **kendi malzemesini ekle/düzenle/sil**.
- **Birim sistemi seçimi**: Metrik (varsayılan) + Imperial (SFM/IPM/IPR) toggle.
- **Makine limiti**: Varsayılan otomatik preset; checkbox açılırsa manuel limit girişi aktif.
- ✅ **P0 KRİTİK (TAMAMLANDI): İlerleme (F) birim netliği**
  - Her operasyonda **G94 (mm/dk) ve G95 (mm/dev)** ilerleme değerleri **aynı anda** gösterilir.
  - Varsayılan tezgâh F modu **G95 (mm/dev)**; Ayarlar’dan değiştirilebilir.
  - Yanlış F girişi riskini azaltmak için **mm/dev tabanlı güvenlik uyarıları** + **kopyalanabilir G-kod satırı** eklenmiştir.

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

## 3. Next Actions

### P0 KRİTİK — “İlerleme (F) Birim Netliği” ✅ TAMAMLANDI
**Hedef:** Kullanıcının tezgâhta G94/G95 karışıklığı nedeniyle yanlış F girmesi kaynaklı kırık takım/matkap riskini azaltmak.

**Kararlar (kullanıcı onaylı) – uygulandı:**
- Varsayılan tezgâh F modu = **G95 (mm/dev)**.
- Her sonuçta **G94 (mm/dk) ve G95 (mm/dev)** birlikte gösterilir.
- Uyarı eşikleri:
  - Malzeme kütüphanesindeki önerilen aralıktan türetilir
  - Ayrıca Ayarlar’a **maksimum mm/dev (maxFeedPerRev)** limiti eklenmiştir
- Hiçbir mevcut formül/değer değiştirilmedi; sadece **ek alan (fn)** + **ek UI**.

**Uygulanan işler (kod karşılığı):**
1. ✅ `src/lib/feed.js` (yeni)
   - `FEED_MODES`, `feedFromResult`, `gcodeLine` (**ondalık nokta**), `feedSafety`, `feedMetric`, `fzRangeToFnRange`
2. ✅ `src/lib/calc.js`
   - Tüm operasyon sonuçlarına **`fn = vf / n`** eklendi (formüller aynı; regresyon yok)
3. ✅ `src/data/materials.js` / `DEFAULT_SETTINGS`
   - `feedMode: 'G95'`
   - `maxFeedPerRev: 2`
4. ✅ `src/components/talas/ResultCard.js`
   - `MetricCell` içine opsiyonel `sub` satırı eklendi (testId + `-sub`)
5. ✅ `src/components/talas/FeedCard.js` (yeni)
   - G94/G95 çift gösterim
   - Kopyalanabilir G-kod satırı (G94/G95 + S + F)
   - Ekran içi mod toggle
   - Kritik durumda kırmızı banner: **“TEZGÂHA GİRMEDEN KONTROL ET”**
   - Önerilen mm/dev aralığı görünümü
6. ✅ Sayfa entegrasyonları
   - `pages/Milling.js`, `Turning.js`, `Drilling.js`, `Threading.js` (3 alt mod), `ChatterFree.js`
   - Sonuç kartında ana ilerleme değeri seçili tezgâh moduna göre; alt satırda diğer birim
   - Sonuçların altına `FeedCard` eklendi
7. ✅ `pages/Settings.js`
   - Yeni bölüm: **TEZGÂH F MODU** (G94/G95)
   - Yeni alan: **Maksimum ilerleme (mm/dev)**
8. ✅ Geçmiş / Paylaşım
   - Geçmiş satırında hem **G94 hem G95** rozetleri
   - Paylaşım metninde hem G94 hem G95 + “F modunu kontrol et” uyarısı
9. ✅ Senkron
   - `mobile-transfer/lib` içine `calc.js` + `feed.js` senkronize edildi

**Doğrulama / test sonucu:**
- ✅ `testing_agent_v3` raporu: `/app/test_reports/iteration_6.json`
- ✅ 34/34 test PASS (konsol hatası yok)
- ✅ Regresyon doğrulandı: Freze 3.714 / 1.188, Matkap 2.546 / 407, Torna 1.146 / 252 aynı

---

### P1 — Takım Kütüphanesi ile Otomatik Doldurma (Sıradaki)
**Hedef:** Operasyon ekranlarında takım seçildiğinde çap/ağız sayısı/helis boyu vb. alanların otomatik gelmesi; giriş hatalarını azaltmak.

Önerilen adımlar:
1. Takım veri modelini netleştir: `diameter`, `flutes(z)`, `fluteLength`, `toolType`, `notes`.
2. Operasyonlara “Takım seç” akışı:
   - Freze/Chatter-Free: Ø, z, helis boyu otomatik
   - Matkap: Ø otomatik
   - Diş frezesi: takım Ø, z otomatik
3. Seçilen takımın değerlerini draft’lara patch’le.
4. Geçmiş kaydı ve paylaşım metninde takım bilgisini göster.

---

### P2 — Parça Programı / Toplam Çevrim Süresi
**Hedef:** Bir parça için operasyon zinciri (freze+matkap+torna+diş...) kurup toplam süre/maliyet çıkarmak.

Önerilen adımlar:
1. Operasyonları “satır” olarak ekleyip sıralama.
2. Her satırda çevrim süresi + maliyet.
3. Toplam süre, toplam maliyet, takım ömrü tüketimi.
4. Dışa aktarım (PDF/JSON) opsiyonu.

## 4. Success Criteria
- Mockup sample calculations match within rounding: Freze 3714 RPM / 1188 mm/dk, Torna 1146 / 252, Matkap 2546 / 407 and ~4.4s.
- Hazır malzeme kütüphanesi offline erişilebilir; custom material CRUD çalışır.
- Live calculators compute: n, Vf, Vc validation, Q/MRR, kW, torque, cycle time, Ra.
- Machine limit works with default preset + checkbox enabling manual entry; clamp is clearly indicated.
- Unit system toggle updates inputs/ranges/results/history correctly.
- App is installable PWA and fully usable with **no internet** (no CDN).
- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı):**
  - Tüm operasyonlarda F hem **G94 (mm/dk)** hem **G95 (mm/dev)** olarak görünür.
  - Varsayılan F modu **G95** ve Ayarlar’dan değiştirilebilir.
  - G-code satırı doğru formatta üretilir (ondalık **nokta**).
  - `fn = vf/n` hesaplaması tüm operasyonlarda doğru ve güvenli (n=0 guard).
  - mm/dev limit aşımlarında kullanıcıya **kritik uyarı** gösterilir.

---

## DURUM GÜNCELLEMESİ

### Phase 1 — Core POC ✅ TAMAMLANDI
- `/app/test_core.py` — testler geçti
- Mockup sayıları doğrulandı

### Phase 2 — Uygulama ✅ TAMAMLANDI
- Offline-first PWA, localStorage kalıcılık, tasarım 1:1, share/export, geçmiş ve malzeme akışları

### Phase 3–6 (genişletmeler) ✅
- Diş/kılavuz, takım ömrü & maliyet, chatter-free/HEM, trokoidal, mobil hazırlık

### P0 KRİTİK: İlerleme (F) birim netliği ✅ TAMAMLANDI
- Yeni `FeedCard` + `feed.js` motoru
- calc.js sonuçlarına `fn` eklendi (formül değişmedi)
- Ayarlar’a G94/G95 + max mm/dev eklendi
- Geçmiş/paylaşım çift birim
- Test: `testing_agent_v3` 34/34 PASS
