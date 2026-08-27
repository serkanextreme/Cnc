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

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-3): Tezgâh S/F geri kontrol + matkapta mm/diş desteği (katalog uyumu)**
  - **Tezgâhtan geri kontrol**: Tezgâhta görülen **S (devir)** ve **F** girilerek bunların gerçek karşılığı olan **Vc (SMM), f (mm/dev), fz (mm/diş), Vf** hesaplanır.
  - **Matkapta diş başına ilerleme**: Matkapta kataloglar/tablolar sıkça **mm/diş (feed per tooth)** verdiği için **fz girişi** desteklenir.
  - **Ağız (dudak) sayısı**: Matkapta varsayılan **z=2**; böylece **f(mm/dev) = fz × z** netleşir.
  - **Vc farkı açıklaması**: Ø10 @ 2500 dev/dk için Vc = 78,5 m/dk; kullanıcıda görülen 55,2 m/dk ≈ Ø7 efektif çap karşılığı olabilir. Bu, formül hatası değil **çap/efektif çap farkı**dır.

- ✅ **P0 KRİTİK (TAMAMLANDI, Rev-4): “Tezgâhtan Geri Kontrol” kartı 5 ekranın tamamında**
  - “Tezgâhta yazan S / F ne demek?” kartı artık **Freze / Torna / Matkap / Kılavuz-Diş / Chatter-Free** ekranlarının hepsinde var.
  - Kılavuz/Diş’te kılavuz ve diş tornalama modunda **f = adım** kuralı için önerilen aralık **[adım×0,98, adım×1,02]** olarak kontrol edilir.
  - Chatter-Free’de tezgâhta koşan fz’nin **RCTF telafili** olduğu netleştirilir; apply akışı **fz_catalog = fz_machine / RCTF** dönüşümü yaparak “çift telafi”yi önler.

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
   - `FEED_MODE_OPS`, `resolveFeedMode(settings, op)`, `machineFeedText(...)`
   - `feedFromResult`, `gcodeLine` (ondalık nokta), `feedSafety`, `feedMetric`, `fzRangeToFnRange`
2. ✅ `src/context/AppContext.js`
   - `feedModeByOp`
   - `setFeedModeForOp(op, mode)`
3. ✅ `src/data/materials.js` (`DEFAULT_SETTINGS`)
   - `feedModeByOp` varsayılanları (Freze/Matkap/Chatter=G94, Torna/Diş=G95)
   - `feedMode` legacy alanı korunur
4. ✅ `src/components/talas/FeedCard.js`
   - Ham değer gösterimi (`1188`, `407`, `0.320`)
   - “TEZGÂHA BUNU GİR” vurgusu
   - Ekran-bazlı ayar notu
5. ✅ Sayfa entegrasyonları
   - `pages/Milling.js`, `Turning.js`, `Drilling.js`, `Threading.js`, `ChatterFree.js`
6. ✅ `pages/Settings.js`
   - 5 ayrı satır: Freze/Matkap/Torna/Kılavuz-Diş/Chatter-free
7. ✅ Senkron
   - `mobile-transfer/lib` içine `calc.js`, `feed.js`, `materials.js` senkronize edildi

#### Doğrulama / test sonucu
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_7.json`
- ✅ 20/20 PASS, regresyon yok

---

### P0 KRİTİK — “Tezgâhtan Geri Kontrol + Matkap mm/diş” ✅ TAMAMLANDI (Rev-3)
**Hedef:** Sahadaki gerçek tezgâh değerleri (S/F) ile uygulama girişleri arasında **birim/yorum farkını** anında yakalamak; özellikle matkapta katalogların **mm/diş** verdiği durumda hatalı yarım ilerlemeyi engellemek.

#### Uygulanan işler (kod karşılığı)
1. ✅ `src/components/talas/MachineCheckCard.js`
   - S/F → Vc, f, fz, Vf
   - Önerilen aralık rozetleri
   - “Aynı devirde çapa göre Vc” karşılaştırması (0.7D / D / 1.3D)
   - “Bu değerleri hesaba uygula” butonu
2. ✅ `pages/Drilling.js`
   - Matkap `z` stepper (varsayılan 2)
   - `feedInput` (mm/dev ↔ mm/diş)
   - Sonuç kartında `fz` satırı
3. ✅ `src/data/materials.js`
   - `DEFAULT_DRAFTS.matkap`: `z: 2`, `feedInput: 'f'`
4. ✅ `src/components/talas/Primitives.js`
   - `GhostButton` için `primary` tonu
5. ✅ Freze/Torna entegrasyonu
   - `pages/Milling.js`, `pages/Turning.js` içerisine `MachineCheckCard`
6. ✅ Not
   - `src/lib/calc.js` formülleri **değişmedi**

#### Doğrulama / test sonucu
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_8.json`
- ✅ Senaryolar + regresyonlar PASS

---

### P0 KRİTİK — “MachineCheckCard tüm operasyonlarda” ✅ TAMAMLANDI (Rev-4)
**Hedef:** Kullanıcının isteğiyle “Tezgâhtan geri kontrol” kartını kalan iki ekrana da eklemek: **Kılavuz/Diş** ve **Chatter-Free**.

#### Kullanıcı isteği
- “A yap — hiçbir şeyi bozmadan” → kartın iki ekrana da eklenmesi.

#### Uygulanan işler (kod karşılığı)
1. ✅ `pages/Threading.js`
   - `MachineCheckCard` eklendi.
   - Kılavuz/Diş tornalama modlarında:
     - `diameter = d.d`, `z = null` (fz kullanılmaz)
     - `fRange = [pitch×0.98, pitch×1.02]` → tezgâhtaki F adım değilse uyarı.
     - Apply: yalnızca `vc` (fz’ye dokunmaz)
   - Diş frezeleme modunda:
     - `diameter = toolD`, `z = d.z`
     - Apply: `vc + fz` güncellenir
2. ✅ `pages/ChatterFree.js`
   - `MachineCheckCard` eklendi.
   - `fzRange` tezgâh değerine göre: katalog `fz × RCTF`.
   - Apply: tezgâh fz’si → katalog fz’sine çevirim: `fz_catalog = fz_machine / RCTF` (çift telafi önlenir).
3. ✅ `src/components/talas/MachineCheckCard.js`
   - Opsiyonel `fzHint` prop’u eklendi (fz’nin anlamlı olmadığı modlarda açıklama göstermek için).
4. ✅ Not
   - `src/lib/calc.js` formülleri **değişmedi**.

#### Doğrulama / test sonucu
- ✅ `testing_agent_v3`: `/app/test_reports/iteration_9.json`
- ✅ 8/8 PASS, regresyon yok, inç modu sağlam

---

### P1 — Takım Kütüphanesi ile Otomatik Doldurma (Sıradaki, kullanıcı onayı bekleniyor)
**Hedef:** Operasyon ekranlarında takım seçildiğinde çap/ağız sayısı/helis boyu vb. alanların otomatik gelmesi; giriş hatalarını azaltmak.

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
1. Makine profili modeli: `label`, `maxRpm`, `maxFeed`, `powerKw`, `efficiency`, `feedModeByOp`, `maxFeedPerRev`, **matkap default z**, **varsayılan feedInput (f/fz)**.
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
  - G-code satırı doğru formatta üretilir (ondalık **nokta**).
  - Limit aşımlarında kullanıcıya **kritik uyarı** gösterilir.

- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-3):**
  - Tezgâhtaki S/F değerleri uygulamada geri hesaplanabilir: Vc, f, fz, Vf net görünür.
  - Matkapta **mm/diş (fz)** girişi ve **z (ağız sayısı)** ile f dönüşümü doğru çalışır.
  - “Aynı devirde çapa göre Vc” görseli çap/efektif çap farkını açıklar.
  - “Bu değerleri hesaba uygula” akışı hatasız çalışır.

- ✅ **P0 KRİTİK başarı kriterleri (tamamlandı, Rev-4):**
  - “Tezgâhtan geri kontrol” kartı **5 ana operasyon ekranının tamamında** mevcuttur.
  - Kılavuz/Diş modlarında diş adımı (pitch) ile **f = pitch** kuralı kullanıcıya görünür ve S/F üzerinden denetlenir.
  - Chatter-Free’de RCTF telafisi apply akışında ters çevrilir (çift telafi yok).
  - Regresyon yok: önceki tüm operasyon ekranları ve kayıt/ayar akışları bozulmaz.

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
- G94’te tezgâha uygun **tam sayı ham F** + G-kod satırı `G94 S... F...`
- Test: `testing_agent_v3` iteration_7 → PASS

### P0 KRİTİK: Tezgâhtan geri kontrol + matkap mm/diş ✅ TAMAMLANDI (Rev-3)
- Yeni: `MachineCheckCard` (S/F → Vc, f, fz, Vf + çap karşılaştırması + apply)
- Matkap: `z` (varsayılan 2) + `mm/dev ↔ mm/diş` giriş seçimi + `fz` sonuç satırı
- Test: `testing_agent_v3` iteration_8 → PASS

### P0 KRİTİK: MachineCheckCard tüm operasyonlarda ✅ TAMAMLANDI (Rev-4)
- Kılavuz/Diş (`pages/Threading.js`) ve Chatter-Free (`pages/ChatterFree.js`) entegrasyonu tamamlandı
- `fzHint` desteği eklendi
- Chatter-Free apply’da RCTF ters çevrimi (÷ RCTF) ile “çift telafi” önlendi
- Test: `testing_agent_v3` iteration_9 → 8/8 PASS, regresyon yok
