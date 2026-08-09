"""PHASE 5 POC — Trokoidal kanal hesabi. Calistir: python3 /app/test_core4.py"""
import sys
sys.path.insert(0, "/app/backend")
import calc_engine as ce

P = F = 0
def chk(n, ok, d=""):
    global P, F
    if ok: P += 1; print(f"  [OK]   {n}  {d}")
    else: F += 1; print(f"  [FAIL] {n}  {d}")
def near(a,b,t): return abs(a-b) <= t

print("=== TROKOIDAL KANAL ===")
# Kanal 20 mm, takim 12 mm, ae 1.2 -> (20-12)/1.2 = 6.67 -> 7 + 1 = 8 paso
r = ce.calc_trochoidal_slot(width=20, length=100, depth=20, d=12, ae=1.2, ap=20, vf=1980.6, q=47.53)
chk("Radyal paso 8", r["radialPasses"] == 8, str(r["radialPasses"]))
chk("Eksenel kat 1 (ap = derinlik)", r["axialLayers"] == 1, str(r["axialLayers"]))
chk("Toplam paso 8", r["totalPasses"] == 8, str(r["totalPasses"]))
chk("Yol 800 mm", near(r["pathLength"], 800, 1e-9), str(r["pathLength"]))
chk("Kesme suresi 0,404 dk", near(r["cuttingMinutes"], 800/1980.6, 1e-9), f"{r['cuttingMinutes']:.3f}")
chk("Toplam sure = kesme x 1,15", near(r["totalMinutes"], r["cuttingMinutes"]*1.15, 1e-9), f"{r['totalMinutes']:.3f}")
chk("Hacim 40 cm3", near(r["volumeCm3"], 40.0, 1e-9), str(r["volumeCm3"]))
chk("Hacim/Q suresi 0,842 dk", near(r["volumeMinutes"], 40/47.53, 1e-6), f"{r['volumeMinutes']:.3f}")
chk("Efektif MRR > 0", r["effectiveMrr"] > 0, f"{r['effectiveMrr']:.1f} cm3/dk")

# Derin kanal -> eksenel kat
r2 = ce.calc_trochoidal_slot(30, 200, 45, 12, 1.2, 20, 1980.6)
chk("Derinlik 45 / ap 20 -> 3 kat", r2["axialLayers"] == 3, str(r2["axialLayers"]))
chk("Radyal paso 16", r2["radialPasses"] == 16, str(r2["radialPasses"]))
chk("Toplam paso 48", r2["totalPasses"] == 48, str(r2["totalPasses"]))

# Kanal = takim capi -> tek paso
r3 = ce.calc_trochoidal_slot(12, 100, 10, 12, 1.2, 10, 1000)
chk("Kanal = cap -> 1 radyal paso", r3["radialPasses"] == 1, str(r3["radialPasses"]))

# ae buyudukce paso azalir
a = ce.calc_trochoidal_slot(20, 100, 20, 12, 0.6, 20, 1000)["radialPasses"]
b = ce.calc_trochoidal_slot(20, 100, 20, 12, 2.4, 20, 1000)["radialPasses"]
chk("ae buyudukce paso azalir", a > b, f"{a} > {b}")

for bad, msg in (((10,100,20,12,1.2,20,1000), "genislik < cap"), ((20,100,20,0,1.2,20,1000), "cap 0")):
    try:
        ce.calc_trochoidal_slot(*bad); chk(f"{msg} hata veriyor", False, "istisna atilmadi")
    except ValueError:
        chk(f"{msg} hata veriyor", True, "")

print(f"\n SONUC: {P} basarili, {F} basarisiz")
sys.exit(0 if F == 0 else 1)
