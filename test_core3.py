"""
PHASE 4 CORE POC — Chatter-Free / HEM (Yuksek Verimli Frezeleme) dogrulama.
Calistir: python3 /app/test_core3.py
"""
import math
import sys

sys.path.insert(0, "/app/backend")
import calc_engine as ce  # noqa: E402

PASS, FAIL, FAILURES = 0, 0, []


def check(name, ok, detail=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  [OK]   {name}  {detail}")
    else:
        FAIL += 1
        FAILURES.append(f"{name} -> {detail}")
        print(f"  [FAIL] {name}  {detail}")


def near(a, b, tol):
    return abs(a - b) <= tol


def test_rctf():
    print("\n=== TEST 1: Radyal talas incelme faktoru (RCTF) ===")
    check("ae = D/2 -> RCTF = 1", near(ce.rctf(6, 12), 1.0, 1e-9), f"{ce.rctf(6,12):.4f}")
    check("ae = %10 D -> RCTF = 1,6667", near(ce.rctf(1.2, 12), 1.0 / 0.6, 1e-9), f"{ce.rctf(1.2,12):.4f}")
    check("ae = %5 D -> RCTF = 2,2942", near(ce.rctf(0.6, 12), 2.29416, 1e-4), f"{ce.rctf(0.6,12):.4f}")
    check("ae = %8 D -> RCTF = 1,8430", near(ce.rctf(0.96, 12), 1.84300, 1e-4), f"{ce.rctf(0.96,12):.4f}")
    check("ae kucuk -> RCTF buyur (monoton)",
          ce.rctf(0.3, 12) > ce.rctf(0.6, 12) > ce.rctf(1.2, 12) > ce.rctf(3, 12) > ce.rctf(6, 12), "")
    check("ae > D/2 icin RCTF = 1 (tam kavrama)", near(ce.rctf(10, 12), 1.0, 1e-9), "")
    check("Gecersiz girdide cokme yok", ce.rctf(0, 12) == 1.0 and ce.rctf(1, 0) == 1.0, "")


def test_chip_thickness_identity():
    print("\n=== TEST 2: Telafi dogrulamasi (gercek talas = hedef talas) ===")
    for ae_pct in (3, 5, 8, 10, 15, 25, 50):
        d, fz = 12.0, 0.08
        ae = d * ae_pct / 100.0
        fz_prog = fz * ce.rctf(ae, d)
        hm = ce.chip_thinning_hm(fz_prog, ae, d)
        check(f"ae %{ae_pct} -> hm = hedef 0,080", near(hm, fz, 1e-9),
              f"fz_prog={fz_prog:.4f} hm={hm:.4f}")


def test_hem_calc():
    print("\n=== TEST 3: HEM hesabi (D12 · z4 · ap 20 mm · ae %10) ===")
    r = ce.calc_chatter_free(vc=140, d=12, z=4, fz_target=0.08, ap=20, ae=1.2,
                             kc=2100, flute_length=20)
    n_exp = 1000 * 140 / (math.pi * 12)
    check("Devir 3.714", near(r["n"], n_exp, 1), f"n={r['n']:.0f}")
    check("Programlanan fz = 0,1333", near(r["fzProgrammed"], 0.13333, 1e-4), f"{r['fzProgrammed']:.4f}")
    check("Ilerleme 1.981 mm/dk", near(r["vf"], 0.13333 * 4 * n_exp, 1.5), f"vf={r['vf']:.0f}")
    check("Talas hacmi 47,53 cm3/dk", near(r["q"], 47.53, 0.05), f"Q={r['q']:.2f}")
    check("Gercek talas kalinligi hedefte (0,080)", near(r["hm"], 0.08, 1e-6), f"hm={r['hm']:.4f}")
    check("Radyal kavrama %10", near(r["aePercent"], 10.0, 1e-9), f"{r['aePercent']:.1f}%")
    check("Kavrama acisi 36,87 derece", near(r["engagement"], 36.8699, 1e-3), f"{r['engagement']:.2f}")
    check("Dis gecis frekansi 247,6 Hz", near(r["toothPassHz"], 247.57, 0.1), f"{r['toothPassHz']:.1f} Hz")
    check("Guc ve tork hesaplandi", r["power"] > 0 and r["torque"] > 0,
          f"P={r['power']:.2f} kW M={r['torque']:.2f} Nm")
    check("Kesici kenar kullanimi 3,33x", near(r["edgeUseRatio"], 20 / 6, 1e-9), f"{r['edgeUseRatio']:.2f}x")
    check("Uyari yok (ap = helis boyu)", r["warnings"] == [], str(r["warnings"]))


def test_comparison():
    print("\n=== TEST 4: Klasik frezeleme ile karsilastirma ===")
    r = ce.calc_chatter_free(vc=140, d=12, z=4, fz_target=0.08, ap=20, ae=1.2, kc=2100)
    c = r["comparison"]
    check("Klasik referans ap = 6 mm, ae = 6 mm",
          near(c["apConventional"], 6, 1e-9) and near(c["aeConventional"], 6, 1e-9), "")
    check("Klasik ilerleme 1.188 mm/dk", near(c["vfConventional"], 1188.36, 1), f"{c['vfConventional']:.0f}")
    check("Klasik Q 42,78 cm3/dk", near(c["qConventional"], 42.78, 0.05), f"{c['qConventional']:.2f}")
    check("MRR kazanci > 1", c["mrrGain"] > 1, f"{c['mrrGain']:.2f}x")
    check("Zaman tasarrufu pozitif", c["timeSavingPct"] > 0, f"%{c['timeSavingPct']:.1f}")

    # Vc artis faktoru ile kazanc buyur
    fast = ce.calc_chatter_free(vc=140, d=12, z=4, fz_target=0.08, ap=20, ae=1.2,
                                kc=2100, vc_factor=1.3)
    check("Vc faktoru 1,3 -> devir %30 artar", near(fast["n"], 3713.6 * 1.3, 2), f"n={fast['n']:.0f}")
    check("Vc faktoru -> MRR kazanci artar", fast["comparison"]["mrrGain"] > r["comparison"]["mrrGain"],
          f"{fast['comparison']['mrrGain']:.2f} > {r['comparison']['mrrGain']:.2f}")


def test_warnings_and_limits():
    print("\n=== TEST 5: Uyarilar ve tezgah limiti ===")
    r1 = ce.calc_chatter_free(140, 12, 4, 0.08, 25, 1.2, 2100, flute_length=20)
    check("ap > helis boyu -> uyari", any("helis" in w for w in r1["warnings"]), str(r1["warnings"]))
    r2 = ce.calc_chatter_free(140, 12, 4, 0.08, 20, 4.0, 2100, flute_length=20)
    check("ae %33 -> chatter-free avantaji uyarisi",
          any("chatter-free" in w for w in r2["warnings"]), str(r2["warnings"]))
    r3 = ce.calc_chatter_free(140, 12, 4, 0.08, 20, 0.24, 2100, flute_length=20)
    check("ae %2 -> cok ince talas uyarisi", any("ince" in w for w in r3["warnings"]), str(r3["warnings"]))
    r4 = ce.calc_chatter_free(140, 12, 4, 0.08, 40, 1.2, 2100, flute_length=60)
    check("ap > 3xD -> sapma uyarisi", any("3xD" in w for w in r4["warnings"]), str(r4["warnings"]))

    r5 = ce.calc_chatter_free(400, 6, 3, 0.05, 12, 0.6, 700, flute_length=12,
                              limits={"maxRpm": 12000})
    check("Devir 12.000'e sinirlandi", r5["limits"]["rpmClamped"] and near(r5["n"], 12000, 1),
          f"n={r5['n']:.0f}")
    check("Efektif Vc yeniden hesaplandi", r5["vcEffective"] < 400, f"{r5['vcEffective']:.1f} m/dk")

    try:
        ce.calc_chatter_free(140, 12, 4, 0.08, 20, 15, 2100)
        check("ae > D hata veriyor", False, "istisna atilmadi")
    except ValueError:
        check("ae > D hata veriyor", True, "")
    try:
        ce.calc_chatter_free(140, 0, 4, 0.08, 20, 1.2, 2100)
        check("D = 0 hata veriyor", False, "istisna atilmadi")
    except ValueError:
        check("D = 0 hata veriyor", True, "")


def test_chatter_speeds():
    print("\n=== TEST 6: Chatter frekansina gore kararli devir onerisi ===")
    check("Dis gecis frekansi n=3000 z=4 -> 200 Hz",
          near(ce.tooth_passing_frequency(3000, 4), 200, 1e-9), "")
    speeds = ce.chatter_free_spindle_speeds(900, 4, 4)
    check("4 lob onerisi uretildi", len(speeds) == 4, str([round(s["rpm"]) for s in speeds]))
    check("k=0 -> 13.500 dev/dk", near(speeds[0]["rpm"], 13500, 1), f"{speeds[0]['rpm']:.0f}")
    check("k=1 -> 6.750 dev/dk", near(speeds[1]["rpm"], 6750, 1), f"{speeds[1]['rpm']:.0f}")
    check("Loblar azalan devir", all(speeds[i]["rpm"] > speeds[i + 1]["rpm"] for i in range(3)), "")
    check("Frekans girilmezse oneri yok", ce.chatter_free_spindle_speeds(0, 4) == [], "")
    # onerilen devirde dis gecis frekansi chatter'in tam kesri olur
    f = ce.tooth_passing_frequency(speeds[1]["rpm"], 4)
    check("Onerilen devirde f_tp = fc/2", near(f, 450, 0.5), f"{f:.1f} Hz")


def test_end_to_end():
    print("\n=== TEST 7: Uctan uca senaryolar ===")
    # A) 4140 celik, D10 z5 karbur, helis boyu 25 mm
    a = ce.calc_chatter_free(vc=150, d=10, z=5, fz_target=0.07, ap=25, ae=0.8,
                             kc=2100, flute_length=25, limits={"maxRpm": 12000})
    check("A) 4140 HEM: devir ve ilerleme hesaplandi", a["n"] > 0 and a["vf"] > 0,
          f"n={a['n']:.0f} vf={a['vf']:.0f}")
    check("A) fz telafisi uygulandi", a["fzProgrammed"] > 0.07, f"{a['fzProgrammed']:.4f}")
    check("A) kenar kullanimi 5x", near(a["edgeUseRatio"], 5.0, 1e-9), f"{a['edgeUseRatio']:.1f}x")

    # B) Aluminyum yuksek devir + limit
    b = ce.calc_chatter_free(vc=600, d=8, z=3, fz_target=0.12, ap=16, ae=0.8,
                             kc=720, flute_length=16, limits={"maxRpm": 24000})
    check("B) Aluminyum HEM limit icinde", b["n"] <= 24000, f"n={b['n']:.0f}")
    check("B) yuksek MRR", b["q"] > 20, f"Q={b['q']:.1f} cm3/dk")

    # C) Inconel: kucuk ae, dusuk Vc
    cc = ce.calc_chatter_free(vc=35, d=10, z=6, fz_target=0.04, ap=20, ae=0.5,
                              kc=2900, flute_length=20)
    check("C) Inconel HEM guc makul", 0 < cc["power"] < 30, f"P={cc['power']:.2f} kW")
    check("C) telafi faktoru > 2", cc["rctf"] > 2, f"{cc['rctf']:.2f}")

    # D) takim omru: HEM'de kenar boyunca yayilma -> omur avantaji
    life_conv = ce.tool_life_minutes(140, 140)
    life_hem = life_conv * a["edgeUseRatio"]
    check("D) omur avantaji hesaplanabiliyor", life_hem > life_conv, f"{life_hem:.0f} dk > {life_conv:.0f} dk")


def main():
    print("=" * 78)
    print(" TALAS PHASE 4 — CHATTER-FREE / HEM FREZELEME POC")
    print("=" * 78)
    test_rctf()
    test_chip_thickness_identity()
    test_hem_calc()
    test_comparison()
    test_warnings_and_limits()
    test_chatter_speeds()
    test_end_to_end()
    print("\n" + "=" * 78)
    print(f" SONUC:  {PASS} basarili, {FAIL} basarisiz")
    for f in FAILURES:
        print("   - " + f)
    print("=" * 78)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
