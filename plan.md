# Development Plan — “Talaş” Offline CNC Kesme Parametreleri Mobil Uygulaması

## 1. Objectives
- ZIP içindeki **7 ekranlık UI tasarımını 1:1 koruyarak** (renk tokenları, tipografi, ikon dili, mobil layout) çalışan bir mobil web uygulaması (PWA) yapmak.
- **Offline-first**: İnternet olmadan çalışacak; materyal kütüphanesi, geçmiş, favoriler, ayarlar, makine profilleri cihazda saklanacak.
- Freze/Torna/Matkap/Diş/Chatter-Free için canlı hesap: **n (RPM), Vf/feed, Vc doğrulama + Q/MRR, güç (kW), tork (Nm), çevrim süresi, Ra**.
- **Hazır malzeme kütüphanesi** + kullanıcı **kendi malzemesini ekle/düzenle/sil**.
- **Birim sistemi seçimi**: Metrik (varsayılan) + Imperial (SFM/IPM/IPR) toggle.
- **Makine limiti**: Varsayılan otomatik preset; checkbox açılırsa manuel limit girişi aktif.
- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-2): İlerleme (F) birim netliği + tezgâha uygun format**
  - Her operasyonda **G94 (mm/dk) ve G95 (mm/dev)** ilerleme değerleri **aynı anda** gösterilir.
  - Tezgâhın F okuma modu artık **operasyon başına** ayarlanır (Freze/Matkap/Chatter genelde G94, Torna/Diş genelde G95).
  - “Tezgâha girilecek F” kartında **makineye yazılacak ham değer** gösterilir (örn. **F1188 / F407** gibi tam sayı mm/dk; G95’te **F0.320** gibi noktalı ondalık).
  - Yanlış mod/yanlış değer riskini azaltmak için **mm/dev tabanlı güvenlik uyarıları** + **kopyalanabilir G-kod satırı**.

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

### P0 KRİTİK — “İlerleme (F) Birim Netliği” ✅ TAMAMLANDI (Rev-2)
**Hedef:** Tezgâhta G94/G95 karışıklığı ve frezede `0.160` gibi mm/dev değerinin **CNC tarafından okunmaması / yanlış anlaşılması** nedeniyle kırık takım riskini azaltmak; frezede **F1188 / F407** gibi **tam sayı mm/dk** kullanımını netleştirmek.

#### Tespit / Kök neden
- Hesaplar doğruydu; sorun **ana gösterim ve tezgâha uygun formatın** freze için yanlış modda (G95) öne çıkarılmasıydı.
- Freze ekranında operatör beklentisi: **mm/dk (G94) tam sayı**.

#### Kararlar (uygulandı)
- İlerleme **iki değer birlikte** gösterilir:
  - `G94` → **mm/dk (Vf)**
  - `G95` → **mm/dev (fn)**
- Tezgâh F modu artık **operasyon başına**:
  - **Freze = G94**, **Matkap = G94**, **Chatter-free = G94**
  - **Torna = G95**, **Kılavuz/Diş = G95**
- “Tezgâha girilecek F” kartındaki değerler **makineye yazılacak ham formatta**:
  - G94: **grup ayırıcısız**, metrikte **tam sayı** (örn. `1188`, `407`)
  - G95: ondalık **NOKTA** ile (örn. `0.320`)
- Ayarlar ekranındaki tek global toggle kaldırıldı; yerine **5 ayrı operasyon satırı** eklendi.

#### Uygulanan işler (kod karşılığı)
1. ✅ `src/lib/feed.js`
   - Yeni: `FEED_MODE_OPS`, `resolveFeedMode(settings, op)`, `machineFeedText(...)` (ham F metni)
   - Mevcut: `feedFromResult`, `gcodeLine` (ondalık nokta), `feedSafety`, `feedMetric`, `fzRangeToFnRange`
2. ✅ `src/context/AppContext.js`
   - Yeni settings anahtarı: `feedModeByOp`
   - Yeni yardımcı: `setFeedModeForOp(op, mode)`
3. ✅ `src/data/materials.js` (`DEFAULT_SETTINGS`)
   - Güncellendi: `feedModeByOp` varsayılanları (Freze/Matkap/Chatter=G94, Torna/Diş=G95)
   - `feedMode` legacy alanı korunur (geri uyumluluk)
4. ✅ `src/components/talas/FeedCard.js`
   - Ham değer gösterimi (`1188`, `407`, `0.320`)
   - Aktif hücre metni: **“TEZGÂHA BUNU GİR”**
   - Not: “Bu seçim yalnızca <ekran> için geçerlidir”
5. ✅ Sayfa entegrasyonları
   - `pages/Milling.js`, `Turning.js`, `Drilling.js`, `Threading.js`, `ChatterFree.js`
   - `feedMode = resolveFeedMode(settings, '<op>')`
   - Toggle → `setFeedModeForOp('<op>', v)`
6. ✅ `pages/Settings.js`
   - 5 ayrı satır: Freze/Matkap/Torna/Kılavuz-Diş/Chatter-free
   - Eski tek toggle kaldırıldı
7. ✅ Senkron
   - `mobile-transfer/lib` içine `calc.js`, `feed.js`, `materials.js` senkronize edildi

#### Doğrulama / test sonucu
- ✅ `testing_agent_v3` raporu: `/app/test_reports/iteration_7.json`
- ✅ 20/20 test PASS
- ✅ Regresyon yok: n, Q, güç, tork, hm, Ra, geçmiş, yedekleme, inç modu sağlam
- ✅ Örnekler:
  - Freze varsayılan: `G94 S3714 F1188`
  - Matkap varsayılan: `G94 S2546 F407`
  - Torna varsayılan: `G95 S1146 F0.220`

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

---

### P3 — Tezgâh Profilleri (Opsiyonel ama önerilir)
**Hedef:** Birden fazla tezgâhı olan kullanıcıların (farklı G94/G95 varsayılanı, max feed, max rpm, güç) tek dokunuşla geçiş yapması.

Önerilen adımlar:
1. Makine profili modeli: `label`, `maxRpm`, `maxFeed`, `powerKw`, `efficiency`, `feedModeByOp`, `maxFeedPerRev`.
2. Ayarlar’da “Makine profili seç” + “yeni profil oluştur”.
3. Hesap ekranlarında aktif profile göre limit clamp ve uyarılar.

## 4. Success Criteria
- Mockup sample calculations match within rounding: Freze 3714 RPM / 1188 mm/dk, Torna 1146 / 252, Matkap 2546 / 407 and ~4.4s.
- Hazır malzeme kütüphanesi offline erişilebilir; custom material CRUD çalışır.
- Live calculators compute: n, Vf, Vc validation, Q/MRR, kW, torque, cycle time, Ra.
- Machine limit works with default preset + checkbox enabling manual entry; clamp is clearly indicated.
- Unit system toggle updates inputs/ranges/results/history correctly.
- App is installable PWA and fully usable with **no internet** (no CDN).
- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-2):**
  - Tüm operasyonlarda F hem **G94 (mm/dk)** hem **G95 (mm/dev)** olarak görünür.
  - **Operasyon bazlı** varsayılan modlar doğru:
    - Freze/Matkap/Chatter = **G94** (mm/dk)
    - Torna/Kılavuz-Diş = **G95** (mm/dev)
  - Tezgâha yazılacak F değeri ham biçimde verilir (G94’te **tam sayı, grup ayırıcısız**; G95’te **ondalık nokta**).
  - G-code satırı doğru formatta üretilir (ondalık **nokta**).
  - `fn = vf/n` tüm operasyonlarda doğru ve güvenli (n=0 guard).
  - Limit aşımlarında kullanıcıya **kritik uyarı** gösterilir.

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
- calc.js sonuçlarına `fn` eklendi (formül değişmedi)
- Ayarlar’da **operasyon bazlı** G94/G95 seçimi + `maxFeedPerRev`
- G94’te tezgâha uygun **tam sayı ham F** (örn. `1188`, `407`) + G-kod satırı `G94 S... F...`
- Geçmiş/paylaşım çift birim
- Test: `testing_agent_v3` iteration_7 → 20/20 PASS