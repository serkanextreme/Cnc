"""
PHASE 3 CORE POC — Kilavuz/dis acma, takim omru + maliyet ve genisletilmis
malzeme katalogu (247 kalite) icin izole dogrulama.

Calistir:  python3 /app/test_core2.py
"""
import json
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


CATALOG = json.load(open("/app/backend/materials.json", encoding="utf-8"))
THREADS = json.load(open("/app/backend/threads.json", encoding="utf-8"))
MATS = {m["id"]: m for m in CATALOG["materials"]}


# --------------------------------------------------------------------- TEST 1
def test_tap_drill():
    print("\n=== TEST 1: Kilavuz matkap capi (standart tablo ile karsilastirma) ===")
    standard = [
        ("M3", 3, 0.5, 2.5), ("M4", 4, 0.7, 3.3), ("M5", 5, 0.8, 4.2),
        ("M6", 6, 1.0, 5.0), ("M8", 8, 1.25, 6.8), ("M10", 10, 1.5, 8.5),
        ("M12", 12, 1.75, 10.2), ("M14", 14, 2.0, 12.0), ("M16", 16, 2.0, 14.0),
        ("M20", 20, 2.5, 17.5), ("M24", 24, 3.0, 21.0), ("M30", 30, 3.5, 26.5),
        ("M8x1", 8, 1.0, 7.0), ("M10x1.25", 10, 1.25, 8.8), ("M12x1.5", 12, 1.5, 10.5),
    ]
    worst = 0
    for label, d, p, expected in standard:
        got = ce.tap_drill_diameter(d, p, 75)
        worst = max(worst, abs(got - expected))
        check(f"{label} matkap ~{expected} mm", near(got, expected, 0.13), f"hesap={got:.3f}")
    check("Tum sapmalar < 0.13 mm", worst < 0.13, f"max sapma={worst:.3f}")

    # dis dip ve orta cap
    check("M10x1.5 dip capi 8.38", near(ce.thread_minor_diameter(10, 1.5), 8.3763, 0.001), "")
    check("M10x1.5 orta cap 9.026", near(ce.thread_pitch_diameter(10, 1.5), 9.0258, 0.001), "")
    # engagement etkisi
    d65 = ce.tap_drill_diameter(10, 1.5, 65)
    d100 = ce.tap_drill_diameter(10, 1.5, 100)
    check("Dus. dis yuzdesi -> buyuk matkap", d65 > ce.tap_drill_diameter(10, 1.5, 75) > d100,
          f"65%={d65:.2f} 100%={d100:.2f}")


# --------------------------------------------------------------------- TEST 2
def test_tapping():
    print("\n=== TEST 2: Kilavuz (tap) hesabi ===")
    m = MATS["4140"]
    r = ce.calc_tapping(vc=25, d=10, pitch=1.5, depth=20, kc=m["kc"],
                        tensile=900, tap_type="kesici", engagement=75)
    check("M10x1.5 Vc=25 -> devir 796", near(round(r["n"]), 796, 2), f"n={r['n']:.1f}")
    check("Ilerleme = adim x devir (1194)", near(round(r["vf"]), 1194, 3), f"vf={r['vf']:.1f}")
    check("Tork ~3.94 Nm", near(r["torque"], 3.9375, 0.05), f"M={r['torque']:.2f}")
    check("Guc > 0", r["power"] > 0, f"P={r['power']:.3f} kW")
    check("Matkap capi 8.54", near(r["tapDrill"], 8.5386, 0.01), f"{r['tapDrill']:.3f}")
    check("Tur sayisi 13.3", near(r["turns"], 13.333, 0.01), f"{r['turns']:.2f}")
    # cevrim: 2*20/1194 dk = 0.0335 dk = 2.01 sn
    check("Cevrim suresi ~2.0 sn", near(r["cycleSeconds"], 2.01, 0.1), f"{r['cycleSeconds']:.2f} sn")

    form = ce.calc_tapping(vc=25, d=10, pitch=1.5, depth=20, kc=m["kc"],
                           tensile=900, tap_type="yuvarlak")
    check("Ovalama kilavuz torku daha yuksek", form["torque"] > r["torque"] * 1.5,
          f"form={form['torque']:.2f} vs kesici={r['torque']:.2f}")

    # tezgah limiti
    lim = ce.calc_tapping(vc=25, d=3, pitch=0.5, depth=10, kc=m["kc"],
                          limits={"maxRpm": 2000})
    check("Kucuk capta devir limiti uygulandi", lim["limits"]["rpmClamped"] and near(lim["n"], 2000, 1),
          f"n={lim['n']:.0f}")


# --------------------------------------------------------------------- TEST 3
def test_thread_milling():
    print("\n=== TEST 3: Dis frezesi (helis interpolasyon) ===")
    m = MATS["4140"]
    r = ce.calc_thread_milling(vc=120, tool_d=10, thread_d=20, pitch=2.5, z=3,
                               fz=0.05, thread_length=20, kc=m["kc"], internal=True)
    n_exp = 1000 * 120 / (math.pi * 10)
    check("Devir 3820", near(r["n"], n_exp, 1), f"n={r['n']:.1f}")
    check("Cevresel ilerleme 573", near(r["vfPeriphery"], 0.05 * 3 * n_exp, 1),
          f"{r['vfPeriphery']:.1f}")
    check("Telafi orani 0.50 (ic dis)", near(r["compensation"], 0.5, 1e-9), f"{r['compensation']}")
    check("Merkez ilerlemesi = cevresel x 0.5", near(r["vf"], r["vfPeriphery"] * 0.5, 0.5),
          f"vf={r['vf']:.1f}")
    check("Helis tur sayisi 8", near(r["revolutions"], 8, 1e-9), f"{r['revolutions']}")
    check("Dis derinligi 1.53", near(r["threadDepth"], 0.6134 * 2.5, 1e-6), f"{r['threadDepth']:.4f}")
    check("Cevrim suresi > 0", r["cycleSeconds"] > 0, f"{r['cycleSeconds']:.2f} sn")
    check("Guc ve tork hesaplandi", r["power"] > 0 and r["torque"] > 0,
          f"P={r['power']:.3f} kW M={r['torque']:.2f} Nm")

    ext = ce.calc_thread_milling(vc=120, tool_d=10, thread_d=20, pitch=2.5, z=3,
                                 fz=0.05, thread_length=20, kc=m["kc"], internal=False)
    check("Dis dis telafisi > 1", ext["compensation"] > 1, f"{ext['compensation']:.2f}")

    try:
        ce.calc_thread_milling(vc=120, tool_d=25, thread_d=20, pitch=2.5, z=3,
                               fz=0.05, thread_length=20, kc=2100, internal=True)
        check("Takim capi > dis capi hata verir", False, "istisna atilmadi")
    except ValueError:
        check("Takim capi > dis capi hata verir", True, "")


# --------------------------------------------------------------------- TEST 4
def test_thread_turning():
    print("\n=== TEST 4: Tornada dis cekme (paso plani) ===")
    check("1.5 mm adim / kolay -> 6 paso", ce.threading_pass_count(1.5, "kolay") == 6,
          str(ce.threading_pass_count(1.5, "kolay")))
    check("2.5 mm adim / orta -> 10 paso", ce.threading_pass_count(2.5, "orta") == 10,
          str(ce.threading_pass_count(2.5, "orta")))
    check("Zor malzemede paso artar",
          ce.threading_pass_count(2.0, "cok-zor") > ce.threading_pass_count(2.0, "kolay"),
          f"{ce.threading_pass_count(2.0,'cok-zor')} > {ce.threading_pass_count(2.0,'kolay')}")

    plan = ce.threading_infeed_schedule(2.5, 10)
    total = sum(p["depth"] for p in plan["passes"])
    check("Toplam derinlik 1.5335 mm", near(plan["totalDepth"], 0.6134 * 2.5, 1e-9),
          f"{plan['totalDepth']:.4f}")
    check("Paso derinlikleri toplami = toplam derinlik", near(total, plan["totalDepth"], 1e-9),
          f"{total:.4f}")
    check("Ilk paso en derin", plan["passes"][0]["depth"] > plan["passes"][-1]["depth"],
          f"ilk={plan['passes'][0]['depth']:.3f} son={plan['passes'][-1]['depth']:.3f}")
    check("Degresif: her paso oncekinden kucuk",
          all(plan["passes"][i]["depth"] > plan["passes"][i + 1]["depth"] - 1e-12
              for i in range(len(plan["passes"]) - 1)), "")
    check("Kumulatif son = toplam", near(plan["passes"][-1]["cumulative"], plan["totalDepth"], 1e-9), "")

    m = MATS["4140"]
    r = ce.calc_thread_turning(vc=100, d=20, pitch=2.5, length=30, kc=m["kc"],
                               machinability=m["machinability"])
    n_exp = 1000 * 100 / (math.pi * 20)
    check("Devir 1592", near(r["n"], n_exp, 1), f"n={r['n']:.0f}")
    check("Ilerleme = adim x devir", near(r["vf"], 2.5 * n_exp, 1), f"vf={r['vf']:.0f}")
    check("Paso sayisi 10 (orta)", r["passCount"] == 10, str(r["passCount"]))
    check("Ic dis derinligi daha az",
          ce.threading_infeed_schedule(2.5, 10, 60, True)["totalDepth"] < plan["totalDepth"], "")
    check("Cevrim suresi > 0", r["cycleSeconds"] > 0, f"{r['cycleSeconds']:.1f} sn")


# --------------------------------------------------------------------- TEST 5
def test_tool_life():
    print("\n=== TEST 5: Takim omru (Taylor) ===")
    check("Vc = Vc_ref -> T = 15 dk", near(ce.tool_life_minutes(140, 140), 15, 1e-9),
          f"{ce.tool_life_minutes(140,140):.2f}")
    check("Vc x2 (karbur n=0.25) -> T/16", near(ce.tool_life_minutes(280, 140), 15 / 16, 1e-9),
          f"{ce.tool_life_minutes(280,140):.4f}")
    check("Vc x2 (HSS n=0.125) -> T/256",
          near(ce.tool_life_minutes(280, 140, "hss"), 15 / 256, 1e-9),
          f"{ce.tool_life_minutes(280,140,'hss'):.4f}")
    check("Vc yarisi -> T x16", near(ce.tool_life_minutes(70, 140), 15 * 16, 1e-6),
          f"{ce.tool_life_minutes(70,140):.1f}")
    check("Kuru isleme omru kisaltir",
          near(ce.tool_life_minutes(140, 140, coolant="kuru"), 10.5, 1e-9),
          f"{ce.tool_life_minutes(140,140,coolant='kuru'):.2f}")
    check("Yuksek basinc omru uzatir",
          ce.tool_life_minutes(140, 140, coolant="yuksek-basinc") > 15, "")

    vc30 = ce.vc_for_target_life(30, 140)
    check("30 dk omur icin Vc = 117.7", near(vc30, 140 * (0.5 ** 0.25), 0.01), f"{vc30:.2f}")
    check("Tur-donus: T(Vc_target) = 30", near(ce.tool_life_minutes(vc30, 140), 30, 1e-6),
          f"{ce.tool_life_minutes(vc30,140):.3f}")
    check("Asinma durumu: 15 dk -> iyi", ce.wear_status(15) == "iyi", "")
    check("Asinma durumu: 7 dk -> dikkat", ce.wear_status(7) == "dikkat", "")
    check("Asinma durumu: 3 dk -> kritik", ce.wear_status(3) == "kritik", "")


# --------------------------------------------------------------------- TEST 6
def test_cost():
    print("\n=== TEST 6: Parca basi takim + tezgah maliyeti ===")
    c = ce.tool_cost(tool_price=1200, edges=4, life_minutes=15, part_minutes=2, hourly_rate=600)
    check("Uc basina maliyet 300", near(c["costPerEdge"], 300, 1e-9), f"{c['costPerEdge']}")
    check("Uc ile 7.5 parca", near(c["partsPerEdge"], 7.5, 1e-9), f"{c['partsPerEdge']}")
    check("Parca basi takim maliyeti 40", near(c["toolCostPerPart"], 40, 1e-9),
          f"{c['toolCostPerPart']:.2f}")
    check("Parca basi tezgah maliyeti 20", near(c["machineCostPerPart"], 20, 1e-9),
          f"{c['machineCostPerPart']:.2f}")
    check("Toplam 60", near(c["totalPerPart"], 60, 1e-9), f"{c['totalPerPart']:.2f}")
    check("Dakika basi takim maliyeti 20", near(c["costPerMinute"], 20, 1e-9), "")

    zero = ce.tool_cost(0, 0, 0, 0, 0)
    check("Sifir girdide cokme yok", zero["totalPerPart"] == 0, "")

    # Vc artinca omur duser -> takim maliyeti artar
    t_fast = ce.tool_life_minutes(200, 140)
    c_fast = ce.tool_cost(1200, 4, t_fast, 2, 600)
    check("Yuksek Vc -> daha pahali takim maliyeti",
          c_fast["toolCostPerPart"] > c["toolCostPerPart"],
          f"{c_fast['toolCostPerPart']:.2f} > {c['toolCostPerPart']:.2f}")


# --------------------------------------------------------------------- TEST 7
def test_catalog():
    print("\n=== TEST 7: Genisletilmis malzeme katalogu (ISO P/M/K/N/S/H) ===")
    mats = CATALOG["materials"]
    check("En az 240 malzeme", len(mats) >= 240, f"{len(mats)} malzeme")
    ids = [m["id"] for m in mats]
    check("ID'ler tekil", len(ids) == len(set(ids)), "")
    check("6 ISO grubu tanimli", len(CATALOG["isoGroups"]) == 6, "")
    check("13 malzeme ailesi", len(CATALOG["groups"]) == 13, f"{len(CATALOG['groups'])}")
    check("Alt gruplar tanimli", len(CATALOG["subgroups"]) >= 40, f"{len(CATALOG['subgroups'])}")

    iso_ids = {g["id"] for g in CATALOG["isoGroups"]}
    fam_ids = {g["id"] for g in CATALOG["groups"]}
    problems = []
    for m in mats:
        if m["isoGroup"] not in iso_ids:
            problems.append(f"{m['code']}: gecersiz ISO grubu")
        if m["group"] not in fam_ids:
            problems.append(f"{m['code']}: gecersiz aile")
        if not m.get("standards"):
            problems.append(f"{m['code']}: standart karsiligi yok")
        if not m.get("baseHB"):
            problems.append(f"{m['code']}: baseHB yok")
        if m["kc"] <= 0:
            problems.append(f"{m['code']}: kc yok")
        if m["hardness"][0] > m["hardness"][1]:
            problems.append(f"{m['code']}: sertlik araligi ters")
        if m["hardnessScale"] == "HRC" and not (20 <= m["hardness"][1] <= 68):
            problems.append(f"{m['code']}: HRC 20-68 disinda")
        for op in ("freze", "torna", "matkap"):
            fk = "fz" if op == "freze" else "f"
            for tool in ("karbur", "hss"):
                d = m["ops"].get(op, {}).get(tool)
                if not d:
                    problems.append(f"{m['code']}: {op}/{tool} yok")
                    continue
                if not (0 < d["vc"][0] <= d["vc"][1]):
                    problems.append(f"{m['code']}: {op}/{tool} Vc araligi hatali {d['vc']}")
                if not (0 < d[fk][0] <= d[fk][1]):
                    problems.append(f"{m['code']}: {op}/{tool} ilerleme hatali")
            if m["ops"][op]["hss"]["vc"][1] >= m["ops"][op]["karbur"]["vc"][1]:
                problems.append(f"{m['code']}: {op} HSS Vc >= Karbur")
    check("Tum kayitlar tutarli", not problems, "; ".join(problems[:5]))

    counts = {}
    for m in mats:
        counts[m["isoGroup"]] = counts.get(m["isoGroup"], 0) + 1
    check("Her ISO grubunda en az 15 malzeme", all(v >= 15 for v in counts.values()), str(counts))

    # v1'deki 24 malzemenin degerleri KORUNDU mu?
    legacy = json.load(open("/app/backend/legacy_materials.json", encoding="utf-8"))
    diffs = []
    for old in legacy["materials"]:
        new = MATS.get(old["id"])
        if not new:
            diffs.append(f"{old['id']} kayip")
            continue
        if new["ops"] != old["ops"]:
            diffs.append(f"{old['id']} ops degisti")
        if new["kc"] != old["kc"]:
            diffs.append(f"{old['id']} kc degisti")
        if new["hardness"] != old["hardness"]:
            diffs.append(f"{old['id']} sertlik degisti")
    check("v1'deki 24 malzeme birebir korundu", not diffs, "; ".join(diffs[:5]))
    check("4140 freze karbur Vc 120-160", MATS["4140"]["ops"]["freze"]["karbur"]["vc"] == [120, 160], "")

    # standart karsiligi ile arama
    def find(term):
        t = term.lower()
        return [m["code"] for m in mats
                if t in m["code"].lower() or t in m["name"].lower()
                or any(t in s.lower() for s in m["standards"])]

    for term, expect in [("1.7225", "4140"), ("42crmo4", "4140"), ("x5crni18-10", "304"),
                         ("1.4404", "316L"), ("aa 7075", "7075-T6"), ("1.2379", "D2"),
                         ("uns n07718", "Inconel 718"), ("scm440", "42CrMo4")]:
        res = find(term)
        check(f"'{term}' aramasi {expect} buluyor", any(expect in r for r in res), f"sonuc={res[:3]}")


# --------------------------------------------------------------------- TEST 8
def test_hardness_adjust():
    print("\n=== TEST 8: Sertlige gore Vc duzeltmesi ===")
    m = MATS["4140"]
    soft = ce.adjust_for_hardness(m, 200)
    hard = ce.adjust_for_hardness(m, 450)
    base_vc = m["ops"]["freze"]["karbur"]["vc"]
    check("Yumusak (200 HB) -> Vc artar", soft["ops"]["freze"]["karbur"]["vc"][1] > base_vc[1],
          f"{soft['ops']['freze']['karbur']['vc']} > {base_vc}")
    check("Sert (450 HB) -> Vc duser", hard["ops"]["freze"]["karbur"]["vc"][1] < base_vc[1],
          f"{hard['ops']['freze']['karbur']['vc']} < {base_vc}")
    check("Sert -> kc artar", hard["kc"] > m["kc"], f"{hard['kc']} > {m['kc']}")
    check("Yumusak -> kc duser", soft["kc"] < m["kc"], f"{soft['kc']} < {m['kc']}")
    check("Ayni sertlik -> degisiklik yok",
          ce.adjust_for_hardness(m, m["baseHB"])["ops"] == m["ops"], "")
    check("HRC->HB donusumu: 30 HRC = 286 HB", near(ce.hrc_to_hb(30), 286, 1), f"{ce.hrc_to_hb(30):.0f}")
    check("HRC->HB donusumu: 60 HRC = 627 HB", near(ce.hrc_to_hb(60), 627, 1), "")
    check("Duzeltilmis degerlerle hesap calisiyor",
          ce.calc_milling(soft["ops"]["freze"]["karbur"]["vc"][0], 12, 4, 0.08, 2, 6, soft["kc"])["n"] > 0, "")
    # asiri sertlikte clamp
    extreme = ce.adjust_for_hardness(m, 1200)
    check("Asiri sertlikte alt sinir korunuyor", extreme["ops"]["freze"]["karbur"]["vc"][0] >= 3,
          f"{extreme['ops']['freze']['karbur']['vc']}")


# --------------------------------------------------------------------- TEST 9
def test_thread_tables():
    print("\n=== TEST 9: Dis tablolari ===")
    rows = THREADS["threads"]
    check("En az 100 dis kaydi", len(rows) >= 100, f"{len(rows)}")
    series = {s["id"] for s in THREADS["series"]}
    check("6 dis serisi", len(series) == 6, str(series))
    bad = []
    for r in rows:
        label, sid, d, pitch, tpi, drill = r
        if sid not in series:
            bad.append(f"{label}: gecersiz seri")
        if not (d > 0):
            bad.append(f"{label}: cap yok")
        if pitch is None and tpi is None:
            bad.append(f"{label}: adim/tpi yok")
        if sid in ("bsp", "npt") and not drill:
            bad.append(f"{label}: boru disinde matkap capi yok")
    check("Tum dis kayitlari tutarli", not bad, "; ".join(bad[:5]))

    check("1/4-20 UNC adimi 1.27 mm", near(ce.pitch_from_tpi(20), 1.27, 1e-9), "")
    check("#10-32 UNF adimi 0.794 mm", near(ce.pitch_from_tpi(32), 0.79375, 1e-9), "")
    unc = [r for r in rows if r[0] == "1/4-20 UNC"][0]
    drill = ce.tap_drill_diameter(unc[2], ce.pitch_from_tpi(unc[4]), 75)
    check("1/4-20 UNC matkap ~5.1 mm (#7)", near(drill, 5.11, 0.1), f"{drill:.2f}")
    m6 = [r for r in rows if r[0] == "M6"][0]
    check("M6 kaydi adim 1.0", m6[3] == 1.0, str(m6))
    counts = {}
    for r in rows:
        counts[r[1]] = counts.get(r[1], 0) + 1
    check("Her seride kayit var", all(counts.get(s, 0) > 0 for s in series), str(counts))
    check("Metrik kaba M64'e kadar", any(r[0] == "M64" for r in rows), "")
    check("Paso tablosu mevcut", len(THREADS["threadingPasses"]["byPitch"]) >= 15, "")


# -------------------------------------------------------------------- TEST 10
def test_end_to_end():
    print("\n=== TEST 10: Uctan uca senaryolar ===")
    # A) Inconel 718 M12 kilavuz + omur + maliyet
    inc = MATS["inconel-718"]
    rec = inc["ops"]["matkap"]["karbur"]["vc"]
    vc = (rec[0] + rec[1]) / 2
    tap = ce.calc_tapping(vc=vc * 0.4, d=12, pitch=1.75, depth=25, kc=inc["kc"],
                          tensile=1300, limits={"maxRpm": 8000})
    life = ce.tool_life_minutes(vc * 0.4, vc * 0.4, "karbur", 15, inc["coolant"])
    cost = ce.tool_cost(2500, 1, life, tap["cycleSeconds"] / 60.0, 750)
    check("A) Inconel kilavuz devri hesaplandi", tap["n"] > 0, f"n={tap['n']:.0f}")
    check("A) tork ve matkap capi verildi", tap["torque"] > 0 and tap["tapDrill"] > 0,
          f"M={tap['torque']:.1f} Nm, matkap={tap['tapDrill']:.2f} mm")
    check("A) omur ve maliyet hesaplandi", life > 0 and cost["totalPerPart"] > 0,
          f"T={life:.1f} dk, maliyet={cost['totalPerPart']:.2f}")

    # B) 316L dis frezesi
    s = MATS["316l"]
    tm = ce.calc_thread_milling(vc=90, tool_d=8, thread_d=16, pitch=2.0, z=3, fz=0.04,
                                thread_length=16, kc=s["kc"], internal=True,
                                limits={"maxRpm": 12000})
    check("B) 316L dis frezesi devri", tm["n"] > 0, f"n={tm['n']:.0f}")
    check("B) merkez ilerlemesi cevreselden kucuk", tm["vf"] < tm["vfPeriphery"],
          f"{tm['vf']:.0f} < {tm['vfPeriphery']:.0f}")

    # C) Hardox 450 tornada dis cekme
    hx = MATS["hardox-450"]
    tt = ce.calc_thread_turning(vc=hx["ops"]["torna"]["karbur"]["vc"][0], d=30, pitch=2.0,
                                length=25, kc=hx["kc"], machinability=hx["machinability"])
    check("C) Hardox paso sayisi zor malzemede yuksek", tt["passCount"] >= 10, str(tt["passCount"]))
    check("C) paso plani toplam derinligi tutuyor",
          near(sum(p["depth"] for p in tt["schedule"]), tt["totalDepth"], 1e-9), "")

    # D) Ayni malzeme, olculen sertlik farkli -> omur ve maliyet degisir
    base = MATS["42crmo4"]
    soft = ce.adjust_for_hardness(base, 220)
    vc_soft = (soft["ops"]["freze"]["karbur"]["vc"][0] + soft["ops"]["freze"]["karbur"]["vc"][1]) / 2
    vc_base = (base["ops"]["freze"]["karbur"]["vc"][0] + base["ops"]["freze"]["karbur"]["vc"][1]) / 2
    check("D) Yumusak halde onerilen Vc daha yuksek", vc_soft > vc_base, f"{vc_soft} > {vc_base}")
    r_soft = ce.calc_milling(vc_soft, 16, 4, 0.1, 3, 8, soft["kc"], 0.8, {"maxRpm": 12000})
    check("D) duzeltilmis veriyle tam hesap", r_soft["n"] > 0 and r_soft["power"] > 0,
          f"n={r_soft['n']:.0f}, P={r_soft['power']:.2f} kW")

    # E) JSON serialize (gecmis kaydi)
    rec = {"op": "dis", "mode": "kilavuz", "inputs": {"d": 10, "pitch": 1.5, "vc": 25},
           "outputs": {"n": tap["n"], "vf": tap["vf"], "torque": tap["torque"]}}
    check("E) dis kaydi JSON'a cevrilebiliyor", isinstance(json.dumps(rec), str), "")


def main():
    print("=" * 78)
    print(" TALAS PHASE 3 — KILAVUZ/DIS, TAKIM OMRU, GENIS MALZEME KATALOGU POC")
    print("=" * 78)
    test_tap_drill()
    test_tapping()
    test_thread_milling()
    test_thread_turning()
    test_tool_life()
    test_cost()
    test_catalog()
    test_hardness_adjust()
    test_thread_tables()
    test_end_to_end()
    print("\n" + "=" * 78)
    print(f" SONUC:  {PASS} basarili, {FAIL} basarisiz")
    for f in FAILURES:
        print("   - " + f)
    print("=" * 78)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
