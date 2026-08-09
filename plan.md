# Development Plan — “Talaş” Offline CNC Kesme Parametreleri Mobil Uygulaması

## 1. Objectives
- ZIP içindeki **7 ekranlık UI tasarımını 1:1 koruyarak** (renk tokenları, tipografi, ikon dili, mobil layout) çalışan bir mobil web uygulaması (PWA) yapmak.
- **Offline-first**: İnternet olmadan çalışacak; materyal kütüphanesi, geçmiş, favoriler, ayarlar, makine profilleri cihazda saklanacak.
- Freze/Torna/Matkap için canlı hesap: **n (RPM), Vf (feed), Vc doğrulama + Q/MRR, güç (kW), tork (Nm), çevrim süresi, Ra**.
- **24 hazır malzeme** + kullanıcı **kendi malzemesini ekle/düzenle/sil**.
- **Birim sistemi seçimi**: Metrik (varsayılan) + Imperial (SFM/IPM/IPR) toggle.
- **Makine limiti**: Varsayılan otomatik preset; checkbox açılırsa manuel limit girişi aktif.

## 2. Implementation Steps

### Phase 1 — Core POC (izole doğrulama, Python)
**Amaç:** Hesap motoru + birim dönüşümleri + limit clamp + malzeme DB bütünlüğü kırılmadan çalışıyor mu kanıtlamak.

User stories (POC odaklı)
1. As a user, I want the calculator to reproduce the mockup’s sample results exactly so I can trust the app.
2. As a user, I want the engine to validate Vc/feed ranges per material/tool so I don’t pick unsafe values.
3. As a user, I want machine limit clamping to cap RPM automatically so I don’t exceed my machine.
4. As a user, I want metric↔imperial conversion to keep results consistent so I can work in my preferred units.
5. As a user, I want the built-in material library to be complete (24) and structurally valid so I can rely on it offline.

Steps
1. **Websearch (best practice)**: CNC cutting formulas + unit conversions + Ra turning formula conventions + typical kc usage.
2. Create `/app/test_core.py`:
   - Implement pure functions: 
     - `rpm_from_vc_d(Vc, D)`; `vf_milling(fz,z,n)`; `vf_turn_drill(f,n)`
     - `mrr_milling(ap,ae,vf)`; `mrr_turning(ap,f,vc)`; `mrr_drilling(D,vf)`
     - `power_kw(mrr_cm3_min,kc,eta)`; `torque_nm(power_kw,n)`
     - `ra_from_f_re(f,re)`; `f_from_ra_re(ra,re)`
     - `cycle_time_drill(depth, vf, allowance)`
     - unit conversions metric↔imperial for all relevant quantities
     - `apply_machine_limits(n, limits)` + recompute effective Vc after clamp
   - Hard-coded tests matching mockup numbers:
     - Freze: Vc=140, D=12, z=4, fz=0.08 → n≈3714, Vf≈1188
     - Torna: Vc=180, D=50, f=0.22 → n≈1146, Vf≈252
     - Matkap: Vc=80, D=10, f=0.16, depth=30 → n≈2546, Vf≈407, time≈4.4s
   - Add tests for limit clamp (e.g., cap RPM to 12000) and verify effective Vc.
3. Build `materials_seed` object in test script (later moved to frontend) and assert:
   - Exactly 24 materials
   - Each has carbide + HSS ranges for freze/torna/matkap
   - Each has kc (specific cutting force) and metadata fields.
4. Run script; **do not proceed** until all assertions pass.

Deliverables
- `/app/test_core.py` passing locally
- Confirmed formula set + rounding/format rules

---

### Phase 2 — V1 App Development (React + Tailwind, offline PWA)
**Amaç:** Tasarımı koruyarak tüm ekranları çalışan uygulamaya dönüştürmek.

User stories (V1)
1. As a user, I want to pick a material and instantly see recommended ranges so I can start quickly.
2. As a user, I want live-updating RPM/feed/MRR/power/torque results while typing so I can iterate fast.
3. As a user, I want clear “Uygun/Geçersiz/Uyarı” badges when I’m outside recommended ranges so I can avoid mistakes.
4. As a user, I want to save a calculation and later reopen it from Geçmiş so I can reuse proven parameters.
5. As a user, I want the app to work without internet and be installable to my home screen.

Steps
1. **Project wiring**
   - React Router routes for: Hesapla, Malzemeler, Geçmiş, Freze, Torna, Matkap, Malzeme Detay, Ayarlar.
   - Shared layout: max-width 393px, sticky headers, fixed bottom bars.
2. **Design system 1:1**
   - Move tokens into CSS variables in `index.css` matching provided hex values.
   - Replace CDN fonts with `@fontsource/barlow-condensed` + `@fontsource/ibm-plex-sans`.
   - Replace Iconify with `lucide-react` icons.
3. **Offline-first / No CDN**
   - Add `public/manifest.json` and app icons placeholders.
   - Add `public/sw.js` service worker (cache app shell + static assets).
   - Register SW in `src/index.js`.
4. **Core calculation engine in frontend**
   - Create `src/lib/calc/*` (or single `calc.js`) using the same formulas as POC.
   - Central state model: active material, unit system, machine profile, active calculator inputs.
   - Validation layer: recommended range checks per operation & tool material.
5. **Local persistence**
   - Implement `src/lib/storage.js` using localStorage (keyed JSON) for:
     - settings (units, machine preset, checkbox state)
     - favourites
     - custom materials
     - history records
   - History schema stores full input + output snapshot + timestamp.
6. **Materials library + custom materials**
   - `src/data/materials.js`: 24 seeded materials (grouped categories).
   - UI: search, filters (MVP: type + hardness range), favourite toggle.
   - Add/Edit custom material screen/drawer (MVP fields + per-operation ranges).
7. **Calculators**
   - Freze: D, z, fz, ap, ae, Vc, tool type; outputs n, Vf, Q, kW, torque.
   - Torna: D, Vc, f, ap, rε, target Ra; outputs n, Vf, Ra actual + suggested f.
   - Matkap: D, Vc, f, depth; outputs n, Vf, cycle time, Q, kW.
   - Machine limit card: default preset active, checkbox enables manual inputs.
8. **Home + tabs + navigation**
   - Bottom tab bar: Hesapla / Malzemeler / Geçmiş / Ayarlar.
   - “Son kullanılan” list from history (latest 3).
9. **Share/export**
   - Torna screen share button: Web Share API else copy-to-clipboard.
10. **Testing round (end-to-end)**
   - Run app, verify each flow: material select → calc → save → history reopen → delete.
   - Verify offline: disable network and reload (SW + cached assets).

Deliverables
- Working PWA in `frontend/` with all screens functional
- All data persists locally; app works with no internet

---

### Phase 3 — Polish + Robustness + Optional Backend API
**Amaç:** Üretim kalitesi UX, veri yönetimi, tutarlılık ve opsiyonel referans API.

User stories (polish)
1. As a user, I want export/import of my data so I can migrate phones.
2. As a user, I want a clearer machine preset chooser so I don’t need to know limits.
3. As a user, I want imperial mode to also convert and display recommended ranges correctly.
4. As a user, I want better input ergonomics (comma/decimal TR formatting) so I enter values easily.
5. As a user, I want warnings to explain “why” (range, limit clamp, units) so I can learn.

Steps
1. Add JSON export/import in Settings.
2. Improve number formatting (TR locale) and parsing (comma/point tolerant).
3. Add more validations (min/max ranges, empty input states, NaN handling) with consistent UI.
4. Enhance filters (machinability tag, category expand/collapse).
5. Optional: FastAPI endpoints mirroring materials + calculation (for future sync), but keep frontend independent.
6. Full regression test + PWA offline audit.

## 3. Next Actions
1. Implement and run **Phase 1** `/app/test_core.py` until it passes.
2. Convert the design tokens to Tailwind/CSS variables and add self-hosted fonts.
3. Implement the shared calculation engine in frontend and wire one calculator screen (Freze) end-to-end.
4. Add local persistence + history save/reopen.
5. Enable PWA offline install and verify with network disabled.

## 4. Success Criteria
- Mockup sample calculations match within rounding: Freze 3714 RPM / 1188 mm/dk, Torna 1146 / 252, Matkap 2546 / 407 and ~4.4s.
- 24 seeded materials available offline; custom material CRUD works.
- Live calculators compute: n, Vf, Vc validation, Q/MRR, kW, torque, cycle time, Ra.
- Machine limit works with default preset + checkbox enabling manual entry; clamp is clearly indicated.
- Unit system toggle updates inputs/ranges/results/history correctly.
- App is installable PWA and fully usable with **no internet** (no CDN).
---

## DURUM GÜNCELLEMESİ (Phase 1 & 2 tamamlandı)

### Phase 1 — Core POC ✅ TAMAMLANDI
- `/app/test_core.py` — **92/92 test geçti** (ilk çalıştırmada)
- Mockup sayıları birebir doğrulandı: Freze 3.714 dev/dk · 1.188 mm/dk | Torna 1.146 · 252 | Matkap 2.546 · 407 · 4,4 sn | Geçmiş 9.947 ve 1.592
- Q/MRR, güç (kW), tork (Nm), Ra + ters çözüm (hedef Ra → f), talaş incelmesi (hm), kavrama açısı doğrulandı
- Tezgâh limiti clamp + clamp sonrası efektif Vc doğrulandı; mm/dev korunuyor
- Metrik ↔ İmperial (inç/SFM/IPR/IPM/in³/HP/lb-ft) tur-dönüş testleri geçti
- 24 malzeme DB bütünlüğü: 9 grup, her malzemede karbür+HSS × freze/torna/matkap, kc değerleri, HRC 20–68 kontrolü
- `/app/materials_seed.json` üretildi

### Phase 2 — Uygulama ✅ TAMAMLANDI
Backend (referans API, uygulama için zorunlu değil):
- `/app/backend/calc_engine.py` (POC motorunun birebir kopyası), `/app/backend/materials.json`
- `/api/health`, `/api/catalog`, `/api/materials`, `/api/materials/{id}`, `/api/machine-presets`, `/api/calc/freze|torna|matkap`

Frontend (offline-first PWA, React + Tailwind):
- Tasarım tokenları kullanıcının ZIP'inden birebir alındı (index.css + tailwind.config.js, `rounded-theme`, Barlow Condensed + IBM Plex Sans **paket içi** fontlar)
- CDN bağımlılığı YOK: Iconify → lucide-react, Google Fonts → @fontsource, Tailwind CDN → yerel build
- `public/manifest.json` + `public/sw.js` (network-first + cache fallback) → ana ekrana kurulabilir, internetsiz açılır (SW aktif doğrulandı)
- `src/lib/calc.js` (motor), `src/lib/units.js` (birim + TR biçim), `src/lib/storage.js` (localStorage), `src/lib/records.js` (geçmiş/paylaşım)
- `src/data/materials.json|js` — 24 malzeme + 9 grup + 7 tezgâh preseti + soğutma seçenekleri
- `src/context/AppContext.js` — ayarlar, geçmiş, favoriler, özel malzemeler, aktif malzeme, taslaklar (hepsi cihazda)
- Ekranlar: Hesapla, Freze, Torna, Matkap, Malzemeler, Malzeme Detayı, Malzeme Ekle/Düzenle, Geçmiş, Ayarlar
- Tezgâh limiti: switch + otomatik preset (varsayılan) + "Manuel değer gir" **kutusu** (kapalıyken alanlar devre dışı)
- Birim sistemi: Metrik (varsayılan) ⇄ İnç/SFM/IPM — tüm giriş, aralık ve sonuçlar dönüşüyor

### Sıradaki
- Phase 2 kapanışı: testing_agent_v3 ile uçtan uca test + bulunan tüm hataların düzeltilmesi

### Phase 2 Test Sonuçları ✅
- **Tur 1 (backend + frontend):** Backend 54/54 geçti · Frontend 40+ test geçti. Tüm mockup değerleri birebir doğrulandı.
- **Tur 2 (eksik akışlar):** Özel malzeme CRUD, Ayarlar (preset/verim/export), Geçmiş (yeniden aç/filtre/sil), malzeme seçici drawer ve regresyon testleri geçti.
- **Düzeltilen hatalar:**
  1. `AppProvider` içindeki useEffect'ler değer döndürüyordu → "destroy is not a function" (uygulama açılmıyordu) — düzeltildi.
  2. Hedef Ra ilerlemesi uygulanınca Ra 1,59 / "Kontrol edin" görünüyordu → artık tam 1,60 ve "Uygun".
  3. **Toast bildirimleri üstte açılıp başlık butonlarını (ör. "Düzenle") kapatıyordu** → bildirimler alt tarafa (bottom-center, +96px) taşındı; malzeme düzenleme akışı artık sorunsuz.
  4. Aktif malzeme kartına `data-testid="active-material-card"` eklendi.
- **Yanlış alarm olarak doğrulananlar:** Torna preset clamp (lathe_conv → devir 2.000'e sınırlandı, efektif Vc 126 m/dk) ve input `data-testid`'leri — manuel olarak çalıştığı doğrulandı.
- **Çevrimdışı doğrulama:** Ağ kapatılıp sayfa yenilendi → uygulama açıldı, gezinme ve hesaplama çalıştı (Torna 1.146 dev/dk).

---

## PHASE 3 — Kılavuz/Diş, Takım Ömrü & Maliyet, 247 Malzemelik ISO Kütüphanesi

Kullanıcı istekleri (onaylı):
1. ~250 malzeme kalitesi, ISO P/M/K/N/S/H gruplu, AISI/DIN/EN/TS karşılıkları + sertliğe göre otomatik Vc düzeltmesi
2. Kılavuz (tap) + diş frezesi (helis interpolasyon) + tornada diş çekme (paso planı); Metrik kaba/ince + UNC/UNF + BSP + NPT tabloları
3. Takım ömrü (Taylor) + parça başı maliyet (takım fiyatı, ağız sayısı, tezgâh saat ücreti) — para birimi TL
4. Aşınma uyarısı: hem "Vc'yi düşür → şu ömür" önerisi hem takım kullanım sayacı (%80 uyarı)

### Phase 3 POC ✅ (116/116 test geçti — /app/test_core2.py)
- Kılavuz matkap çapı standart tabloyla ±0,13 mm içinde (M3→2,5 … M30→26,5)
- Kılavuz torku M = kc × P × d / 8000, ovalama kılavuzu Kf = 0,6 × Rm
- Diş frezesi merkez ilerleme telafisi Vf × (Ddiş − Dt)/Ddiş
- Torna diş çekme: paso sayısı tablosu (1,5 mm → 6 paso) + degresif dalma (Σap = h)
- Taylor: T = T_ref × (Vc_ref/Vc)^(1/n) (karbür 0,25 · HSS 0,125), soğutma faktörü
- Maliyet: uç maliyeti, parça/uç, parça başı takım + tezgâh maliyeti
- Katalog: 247 kalite, 6 ISO grubu, 13 aile, 51 alt grup; v1'deki 24 malzeme birebir korundu
- Standart araması: 1.7225 / 42CrMo4 / X5CrNi18-10 / UNS N07718 / SCM440 → doğru malzeme

### Phase 3 Uygulama ✅
Backend: `grades_source.py` + `build_catalog.py` (247 kalite üretimi), `threads.json` (103 diş ölçüsü),
`calc_engine.py` (kılavuz/diş frezesi/diş çekme + Taylor + maliyet + sertlik düzeltmesi),
API: `/api/threads`, `/api/calc/kilavuz`, `/api/calc/dis-frezesi`, `/api/calc/dis-torna`, `/api/tool-life`

Frontend:
- `/dis` **Kılavuz / Diş** ekranı — 3 mod (Kılavuz · Diş frezesi · Torna dişi), 6 diş serisi, 103 ölçü,
  diş dolgunluğu %65–100, ovalama/kesici kılavuz, paso planı listesi
- `ToolLifeCard` — tüm hesap ekranlarında: tahmini ömür (dk), parça başı takım+tezgâh maliyeti,
  ömür kısaysa "Vc'yi şu değere düşür" tek dokunuş önerisi, kayıtlı takıma kullanım ekleme
- `/takimlar` **Takımlarım** — takım CRUD, kullanım sayacı + ilerleme çubuğu, %80 ve %100 uyarıları,
  "+5 dk / +30 dk / Yeni uç / Sil"
- `HardnessCard` — ölçülen sertlik girişi; Vc/ilerleme/kc canlı düzeltilir (ör. 4140 @200 HB → Vc 149–198, kc 1853)
- Malzemeler: ISO grup filtresi, standart (AISI/DIN/EN/TS/UNS) araması, standart etiketleri, "daha fazla göster"
- Malzeme detayı: ISO grubu, HB eşdeğeri, standart karşılıkları listesi
- Ayarlar: para birimi, referans/hedef ömür, takım fiyatı, ağız sayısı, saat ücreti, parça süresi
- Alt sekmeler 5'e çıktı: Hesapla · Malzeme · Takım · Geçmiş · Ayarlar

### Phase 3 Test Sonuçları ✅
- POC: `/app/test_core.py` 92/92 · `/app/test_core2.py` 116/116 (toplam 208 test, hepsi geçti)
- testing_agent_v3 (3. tur): **Frontend %100** (14/14 Phase 3 user story + regresyon), **Backend 65/66**
- Düzeltilen hata: `/api/materials?q=` aramasının standart karşılıklarını (SCM440, Hardox, TS EN …) taramaması — düzeltildi, doğrulandı
- Regresyon: Freze 3.714/1.188 · Torna 1.146/252/Ra 1,89 · Matkap 2.546/407/4,4 sn değerleri korunuyor; 4140 hâlâ Vc 120–160

---

## PHASE 4 — CHATTER-FREE / HEM (Yüksek Verimli Frezeleme)

Kullanıcı isteği: "chatter free kesme teknolojisi… kesicinin helisi 20 mm ise 20 mm kadar dalıyorsun, takımın yan
duvar helisiyle kesiyorsun… Chatter Free diye bölüm aç, oradan hesaplama yapılsın."

### Araştırma (web) ile doğrulanan formüller
- Radyal talaş incelme faktörü **RCTF = 1 / √(1 − (1 − 2·ae/D)²)** → programlanan **fz = hedef fz × RCTF**
- HEM önerilen radyal kavrama **%5–15 × D**, eksenel derinlik **kesici (helis) boyu / 1–2×D**
- Diş geçiş frekansı **f = n × z / 60**; chatter kaçınma **n = 60·fc / (z·(k+1))** (lob k)
- Değişken helis (variable helix) kesiciler kararlı bölgeyi genişletir

### POC ✅ `/app/test_core3.py` — 55/55 test geçti
- RCTF: ae=D/2 → 1,000 · %10 → 1,6667 · %8 → 1,8430 · %5 → 2,2942 (monoton)
- **Telafi kimliği:** her ae değerinde gerçek talaş kalınlığı hm = hedef fz (0,080) — telafinin doğruluk kanıtı
- D12·z4·ap20·ae1,2: n 3.714 · fz_prog 0,1333 · Vf 1.981 · Q 47,53 cm³/dk · kavrama 36,87° · 247,6 Hz
- Kenar kullanımı 3,33× · klasik (ap=ae=D/2) karşılaştırması · uyarılar (ap>helis, ap>3D, ae>%20, ae<%3)
- Chatter lobları: fc 900 Hz, z4 → 13.500 / 6.750 / 4.500 / 3.375 dev/dk; önerilen devirde f_tp = fc/2

### Uygulama ✅
- Backend: `calc_chatter_free`, `rctf`, `tooth_passing_frequency`, `chatter_free_spindle_speeds` + `POST /api/calc/chatter-free`
- Frontend `/chatter-free` **Chatter-Free** ekranı: HEM açıklaması, kesici/helis boyu (girilince ap otomatik eşitlenir),
  ae yüzde presetleri (%3/5/8/10/15), Vc artış faktörü, canlı sonuçlar (RCTF, programlanan fz, gerçek hm, Q, kW, tork,
  kavrama açısı), **Kazanç kartı** (klasik frezelemeye göre MRR ve süre — negatif kazanç da dürüstçe gösterilir),
  **Titreşim kartı** (diş geçiş frekansı + ölçülen chatter frekansından kararlı devir önerileri, tek dokunuşla uygula),
  sertlik düzeltmesi + takım ömrü/maliyet + tezgâh limiti kartları, uyarı listesi, formül paneli
- Ana ekranda "Chatter-Free" kartı; geçmişte kayıt/filtre/yeniden açma desteği

### Test ✅
- testing_agent_v3 (4. tur): **Backend 25/25 (%100)**, frontend çekirdek hesaplar POC ile birebir
- Düzeltilen gerçek hata: geçmişten "yeniden aç" `/chatter` rotasına gidiyordu → `opRoute()` ile `/chatter-free` düzeltildi
- POC toplamı: **92 + 116 + 55 = 263 test, hepsi geçiyor**

---

## PHASE 5 — Trokoidal Kanal + Mikrofonla Titreşim Dinleme

### Trokoidal kanal (POC ✅ `/app/test_core4.py` — 16/16)
- Radyal paso = ceil((kanal genişliği − takım çapı) / ae) + 1 · Eksenel kat = ceil(derinlik / ap)
- Toplam takım yolu = toplam paso × kanal boyu · süre = yol / Vf + %15 boşta hareket payı
- Kaldırılan hacim (cm³), efektif MRR; kanal genişliği < takım çapı ise hata
- Örnek: kanal 20 mm · takım Ø12 · ae 1,2 → 8 radyal paso, 800 mm yol, 40 cm³; derinlik 45 mm → 3 kat, 48 paso
- Chatter-Free ekranına "TROKOİDAL KANAL" bölümü olarak eklendi (canlı, girişler drafta kaydedilir)

### Mikrofonla titreşim dinleme (deneysel)
- Web Audio API + AnalyserNode (FFT 8192) ile 150–5.000 Hz aralığındaki baskın tepe bulunur
- "Dinlemeye başla" → izin → canlı Hz + seviye çubuğu → "Bu frekansı kullan" ile chatter frekansı alanına yazılır
  ve kararlı devir önerileri (n = 60·fc/(z·(k+1))) otomatik güncellenir
- İzin verilmezse / tarayıcı desteklemezse kullanıcıya net hata mesajı gösterilir; hesaplama akışı etkilenmez
- NOT: Mikrofon donanım gerektirdiği için otomatik test kapsamı dışındadır; gerçek telefonda denenmelidir
