"""
Talas — CNC kesme parametreleri hesap motoru.
Phase 1 POC (/app/test_core.py) ile birebir dogrulanmis formuller.
"""
import math

PI = math.pi
MM_PER_INCH = 25.4
FT_PER_M = 3.280839895


def rpm_from_vc(vc: float, d: float) -> float:
    if d <= 0:
        raise ValueError("Cap (D) sifirdan buyuk olmali")
    return (1000.0 * vc) / (PI * d)


def vc_from_rpm(n: float, d: float) -> float:
    return (PI * d * n) / 1000.0


def vf_milling(fz: float, z: int, n: float) -> float:
    return fz * z * n


def vf_single(f: float, n: float) -> float:
    return f * n


def mrr_milling(ap: float, ae: float, vf: float) -> float:
    return (ap * ae * vf) / 1000.0


def mrr_turning(ap: float, f: float, vc: float) -> float:
    return ap * f * vc


def mrr_drilling(d: float, vf: float) -> float:
    return (PI * d * d / 4.0) * vf / 1000.0


def power_kw(mrr: float, kc: float, eta: float = 0.8) -> float:
    if eta <= 0:
        eta = 0.8
    return (mrr * kc) / 60000.0 / eta


def torque_nm(p_kw: float, n: float) -> float:
    if n <= 0:
        return 0.0
    return (30000.0 * p_kw) / (PI * n)


def ra_from_feed(f: float, nose_r: float) -> float:
    if nose_r <= 0:
        raise ValueError("Uc radyusu sifirdan buyuk olmali")
    return (f ** 2) / (32.0 * nose_r) * 1000.0


def feed_from_ra(ra_um: float, nose_r: float) -> float:
    return math.sqrt(32.0 * (ra_um / 1000.0) * nose_r)


def drill_cycle_time_s(depth: float, vf: float, approach: float = 0.0,
                       peck_count: int = 0, peck_retract_s: float = 0.3) -> float:
    if vf <= 0:
        return 0.0
    return ((depth + approach) / vf) * 60.0 + peck_count * peck_retract_s


def chip_thinning_hm(fz: float, ae: float, d: float) -> float:
    if d <= 0:
        return 0.0
    ratio = min(max(ae / d, 0.0), 1.0)
    x = 1.0 - 2.0 * ratio
    val = 1.0 - x * x
    if val <= 0:
        return fz
    return fz * min(math.sqrt(val), 1.0)


def engagement_angle_deg(ae: float, d: float) -> float:
    if d <= 0:
        return 0.0
    ratio = min(max(ae / d, 0.0), 1.0)
    return math.degrees(math.acos(1.0 - 2.0 * ratio))


def apply_machine_limits(n: float, vf: float, d: float, limits: dict):
    out = {
        "n": n, "vf": vf, "rpmClamped": False, "feedClamped": False,
        "vcEffective": vc_from_rpm(n, d), "notes": [],
    }
    if not limits:
        return out
    max_rpm = limits.get("maxRpm")
    max_feed = limits.get("maxFeed")
    if max_rpm and n > max_rpm:
        scale = max_rpm / n
        out["n"] = float(max_rpm)
        out["vf"] = vf * scale
        out["rpmClamped"] = True
        out["vcEffective"] = vc_from_rpm(float(max_rpm), d)
        out["notes"].append("Devir %d dev/dk ile sinirlandi" % int(max_rpm))
    if max_feed and out["vf"] > max_feed:
        out["vf"] = float(max_feed)
        out["feedClamped"] = True
        out["notes"].append("Ilerleme %d mm/dk ile sinirlandi" % int(max_feed))
    return out


def evaluate_range(value: float, rng):
    lo, hi = rng[0], rng[1]
    if value < lo * 0.6 or value > hi * 1.6:
        return {"status": "error", "label": "Aralik disi", "range": [lo, hi]}
    if value < lo:
        return {"status": "warn", "label": "Onerilenin altinda", "range": [lo, hi]}
    if value > hi:
        return {"status": "warn", "label": "Onerilenin ustunde", "range": [lo, hi]}
    return {"status": "ok", "label": "Uygun", "range": [lo, hi]}


def calc_milling(vc, d, z, fz, ap, ae, kc, eta=0.8, limits=None):
    n = rpm_from_vc(vc, d)
    vf = vf_milling(fz, z, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    q = mrr_milling(ap, ae, lim["vf"])
    p = power_kw(q, kc, eta)
    return {
        "n": lim["n"], "vf": lim["vf"], "vcEffective": lim["vcEffective"], "q": q,
        "power": p, "torque": torque_nm(p, lim["n"]),
        "hm": chip_thinning_hm(fz, ae, d),
        "engagement": engagement_angle_deg(ae, d),
        "feedPerRev": fz * z,
        "limits": lim,
    }


def calc_turning(vc, d, f, ap, nose_r, kc, eta=0.8, limits=None, target_ra=None):
    n = rpm_from_vc(vc, d)
    vf = vf_single(f, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    q = mrr_turning(ap, f, lim["vcEffective"])
    p = power_kw(q, kc, eta)
    res = {
        "n": lim["n"], "vf": lim["vf"], "vcEffective": lim["vcEffective"], "q": q,
        "power": p, "torque": torque_nm(p, lim["n"]),
        "ra": ra_from_feed(f, nose_r), "limits": lim,
    }
    if target_ra:
        res["feedForTargetRa"] = feed_from_ra(target_ra, nose_r)
    return res


def calc_drilling(vc, d, f, depth, kc, eta=0.8, limits=None, peck=0):
    n = rpm_from_vc(vc, d)
    vf = vf_single(f, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    q = mrr_drilling(d, lim["vf"])
    p = power_kw(q, kc, eta)
    return {
        "n": lim["n"], "vf": lim["vf"], "vcEffective": lim["vcEffective"], "q": q,
        "power": p, "torque": torque_nm(p, lim["n"]),
        "cycleSeconds": drill_cycle_time_s(depth, lim["vf"], 0.0, peck),
        "limits": lim,
    }


# --- birim donusumleri -------------------------------------------------------
def mm_to_in(v): return v / MM_PER_INCH
def in_to_mm(v): return v * MM_PER_INCH
def mmin_to_sfm(v): return v * FT_PER_M
def sfm_to_mmin(v): return v / FT_PER_M
def mmmin_to_ipm(v): return v / MM_PER_INCH
def ipm_to_mmmin(v): return v * MM_PER_INCH
def mmrev_to_ipr(v): return v / MM_PER_INCH
def ipr_to_mmrev(v): return v * MM_PER_INCH
def cm3_to_in3(v): return v / 16.387064
def kw_to_hp(v): return v * 1.34102209
def nm_to_lbft(v): return v * 0.7375621


# =============================================================================
# KILAVUZ / DIS ACMA
# =============================================================================
THREAD_HEIGHT_FACTOR = {60: 0.6134, 55: 0.6403}   # dis yuksekligi h3 = k * P (dis)
INTERNAL_HEIGHT_FACTOR = 0.5413                    # H1 = 0.5413 * P (ic dis)


def pitch_from_tpi(tpi: float) -> float:
    return MM_PER_INCH / tpi


def tap_drill_diameter(d: float, pitch: float, engagement: float = 75.0) -> float:
    """Kilavuz matkap capi — klasik 'yuzde dis' formulu: D = d - (E * P) / 76.98"""
    return d - (engagement * pitch) / 76.98


def thread_minor_diameter(d: float, pitch: float) -> float:
    """Ic dis dip capi (100% dis): D1 = d - 1.0825 * P"""
    return d - 1.0825 * pitch


def thread_pitch_diameter(d: float, pitch: float) -> float:
    """Dis ortalama capi: d2 = d - 0.6495 * P"""
    return d - 0.6495 * pitch


def tapping_torque_nm(kc: float, pitch: float, d: float) -> float:
    """Kesici kilavuz tork tahmini: M = kc * P * d / 8000 [Nm]"""
    return (kc * pitch * d) / 8000.0


def forming_tap_torque_nm(tensile: float, pitch: float, d: float) -> float:
    """Ovalama (form) kilavuz tork tahmini: M = Kf * d * P^2 / 1000, Kf ~ 0.6 * Rm"""
    kf = 0.6 * tensile
    return (kf * d * pitch * pitch) / 1000.0


def calc_tapping(vc, d, pitch, depth, kc, tensile=900.0, tap_type="kesici",
                 engagement=75.0, eta=0.8, limits=None):
    n = rpm_from_vc(vc, d)
    vf = pitch * n
    lim = apply_machine_limits(n, vf, d, limits or {})
    n_f, vf_f = lim["n"], lim["vf"]
    if tap_type == "yuvarlak":
        m = forming_tap_torque_nm(tensile, pitch, d)
    else:
        m = tapping_torque_nm(kc, pitch, d)
    power = (m * n_f) / 9550.0
    turns = depth / pitch if pitch > 0 else 0
    cycle = (2.0 * depth / vf_f) * 60.0 if vf_f > 0 else 0.0
    return {
        "n": n_f, "vf": vf_f, "vcEffective": lim["vcEffective"],
        "torque": m, "power": power / eta if eta else power,
        "tapDrill": tap_drill_diameter(d, pitch, engagement),
        "minorDiameter": thread_minor_diameter(d, pitch),
        "pitchDiameter": thread_pitch_diameter(d, pitch),
        "turns": turns, "cycleSeconds": cycle,
        "limits": lim,
    }


def calc_thread_milling(vc, tool_d, thread_d, pitch, z, fz, thread_length,
                        kc, internal=True, eta=0.8, limits=None):
    n = rpm_from_vc(vc, tool_d)
    vf_periphery = fz * z * n
    if internal:
        if thread_d <= tool_d:
            raise ValueError("Dis capi takim capindan buyuk olmali")
        ratio = (thread_d - tool_d) / thread_d
    else:
        ratio = (thread_d + tool_d) / thread_d
    vf_center = vf_periphery * ratio
    lim = apply_machine_limits(n, vf_center, tool_d, limits or {})
    revs = thread_length / pitch if pitch > 0 else 0
    path_d = (thread_d - tool_d) if internal else (thread_d + tool_d)
    path_len = PI * path_d * max(revs, 1e-9)
    cycle = (path_len / lim["vf"]) * 60.0 if lim["vf"] > 0 else 0.0
    depth = THREAD_HEIGHT_FACTOR[60] * pitch
    q = mrr_milling(pitch, depth, lim["vf"])
    power = power_kw(q, kc, eta)
    return {
        "n": lim["n"], "vf": lim["vf"], "vfPeriphery": vf_periphery,
        "compensation": ratio, "vcEffective": lim["vcEffective"],
        "revolutions": revs, "cycleSeconds": cycle,
        "threadDepth": depth, "q": q, "power": power,
        "torque": torque_nm(power, lim["n"]), "limits": lim,
    }


THREADING_PASS_TABLE = [
    (0.5, 4), (0.7, 4), (0.75, 5), (0.8, 5), (1.0, 5), (1.25, 6), (1.5, 6),
    (1.75, 7), (2.0, 8), (2.5, 9), (3.0, 10), (3.5, 11), (4.0, 12), (4.5, 13),
    (5.0, 14), (5.5, 15), (6.0, 16),
]
MACH_PASS_FACTOR = {"kolay": 1.0, "orta": 1.1, "zor": 1.25, "cok-zor": 1.4}


def threading_pass_count(pitch: float, machinability: str = "orta") -> int:
    base = THREADING_PASS_TABLE[-1][1]
    for p, count in THREADING_PASS_TABLE:
        if pitch <= p + 1e-9:
            base = count
            break
    return int(math.ceil(base * MACH_PASS_FACTOR.get(machinability, 1.1)))


def threading_infeed_schedule(pitch: float, passes: int, angle: int = 60,
                              internal: bool = False):
    """Degresif (sabit talas alanli) paso plani: kumulatif derinlik = h * sqrt(i/N)"""
    h = (INTERNAL_HEIGHT_FACTOR if internal else THREAD_HEIGHT_FACTOR.get(angle, 0.6134)) * pitch
    schedule = []
    prev = 0.0
    for i in range(1, passes + 1):
        cum = h * math.sqrt(i / passes)
        schedule.append({"pass": i, "depth": cum - prev, "cumulative": cum})
        prev = cum
    return {"totalDepth": h, "passes": schedule}


def calc_thread_turning(vc, d, pitch, length, kc, machinability="orta",
                        angle=60, internal=False, eta=0.8, limits=None,
                        approach=2.0, passes=None):
    n = rpm_from_vc(vc, d)
    vf = pitch * n
    lim = apply_machine_limits(n, vf, d, limits or {})
    count = passes or threading_pass_count(pitch, machinability)
    plan = threading_infeed_schedule(pitch, count, angle, internal)
    per_pass_s = ((length + approach) / lim["vf"]) * 60.0 if lim["vf"] > 0 else 0.0
    total_s = per_pass_s * count * 1.6  # geri donus + bosta hareket payi
    q = mrr_turning(plan["totalDepth"] / count, pitch, lim["vcEffective"])
    power = power_kw(q, kc, eta)
    return {
        "n": lim["n"], "vf": lim["vf"], "vcEffective": lim["vcEffective"],
        "passCount": count, "totalDepth": plan["totalDepth"],
        "schedule": plan["passes"], "firstPass": plan["passes"][0]["depth"],
        "lastPass": plan["passes"][-1]["depth"],
        "cycleSeconds": total_s, "perPassSeconds": per_pass_s,
        "q": q, "power": power, "torque": torque_nm(power, lim["n"]),
        "limits": lim,
    }


# =============================================================================
# TAKIM OMRU (Taylor) + MALIYET
# =============================================================================
TAYLOR_N = {"karbur": 0.25, "hss": 0.125, "seramik": 0.4, "cbn": 0.35}
COOLANT_LIFE_FACTOR = {"sivi": 1.0, "yuksek-basinc": 1.15, "mist": 0.9, "kuru": 0.7}


def tool_life_minutes(vc, vc_ref, tool="karbur", t_ref=15.0, coolant="sivi", n_exp=None):
    """Taylor: Vc * T^n = C  ->  T = T_ref * (Vc_ref / Vc)^(1/n)"""
    if vc <= 0 or vc_ref <= 0:
        return 0.0
    n = n_exp if n_exp else TAYLOR_N.get(tool, 0.25)
    factor = COOLANT_LIFE_FACTOR.get(coolant, 1.0)
    return t_ref * ((vc_ref / vc) ** (1.0 / n)) * factor


def vc_for_target_life(target_life, vc_ref, tool="karbur", t_ref=15.0,
                       coolant="sivi", n_exp=None):
    if target_life <= 0:
        return vc_ref
    n = n_exp if n_exp else TAYLOR_N.get(tool, 0.25)
    factor = COOLANT_LIFE_FACTOR.get(coolant, 1.0)
    return vc_ref * ((t_ref * factor / target_life) ** n)


def tool_cost(tool_price, edges, life_minutes, part_minutes, hourly_rate):
    """Parca basi takim + tezgah maliyeti"""
    edges = max(1, int(edges or 1))
    cost_per_edge = (tool_price or 0) / edges
    if life_minutes <= 0 or part_minutes <= 0:
        return {
            "costPerEdge": cost_per_edge, "partsPerEdge": 0,
            "toolCostPerPart": 0.0, "machineCostPerPart": 0.0, "totalPerPart": 0.0,
            "costPerMinute": 0.0,
        }
    parts_per_edge = life_minutes / part_minutes
    tool_cost_part = cost_per_edge * (part_minutes / life_minutes)
    machine_cost_part = (hourly_rate or 0) * part_minutes / 60.0
    return {
        "costPerEdge": cost_per_edge,
        "partsPerEdge": parts_per_edge,
        "toolCostPerPart": tool_cost_part,
        "machineCostPerPart": machine_cost_part,
        "totalPerPart": tool_cost_part + machine_cost_part,
        "costPerMinute": cost_per_edge / life_minutes,
    }


def wear_status(life_minutes, warn=10.0, critical=5.0):
    if life_minutes <= 0:
        return "bilinmiyor"
    if life_minutes < critical:
        return "kritik"
    if life_minutes < warn:
        return "dikkat"
    return "iyi"


# =============================================================================
# SERTLIGE GORE KESME VERISI DUZELTMESI
# =============================================================================
HRC_HB_TABLE = [
    (20, 226), (22, 237), (24, 248), (26, 260), (28, 271), (30, 286), (32, 301),
    (34, 317), (36, 333), (38, 352), (40, 371), (42, 390), (44, 409), (46, 432),
    (48, 455), (50, 481), (52, 509), (54, 535), (56, 565), (58, 595), (60, 627),
    (62, 659), (64, 695), (66, 731), (68, 770),
]


def hrc_to_hb(hrc: float) -> float:
    if hrc <= HRC_HB_TABLE[0][0]:
        return HRC_HB_TABLE[0][1]
    if hrc >= HRC_HB_TABLE[-1][0]:
        return HRC_HB_TABLE[-1][1]
    for i in range(len(HRC_HB_TABLE) - 1):
        a, b = HRC_HB_TABLE[i], HRC_HB_TABLE[i + 1]
        if a[0] <= hrc <= b[0]:
            t = (hrc - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    return HRC_HB_TABLE[-1][1]


def to_hb(value: float, scale: str) -> float:
    return hrc_to_hb(value) if scale == "HRC" else value


def adjust_for_hardness(material: dict, new_hb: float) -> dict:
    """Malzemenin Vc/ilerleme araliklarini ve kc'sini olculen sertlige gore olcekler."""
    base = float(material.get("baseHB") or to_hb(sum(material["hardness"]) / 2.0, material["hardnessScale"]))
    if not new_hb or new_hb <= 0 or abs(new_hb - base) < 1e-6:
        return material
    vc_f = min(max((base / new_hb) ** 0.6, 0.35), 1.9)
    feed_f = min(max((base / new_hb) ** 0.25, 0.55), 1.45)
    out = dict(material)
    out["kc"] = int(round(material["kc"] * (new_hb / base) ** 0.35))
    out["adjustedHB"] = new_hb
    ops = {}
    for op, tools in material["ops"].items():
        feed_key = "fz" if op == "freze" else "f"
        ops[op] = {}
        for tool, data in tools.items():
            ops[op][tool] = {
                "vc": [max(3, round(data["vc"][0] * vc_f)), max(4, round(data["vc"][1] * vc_f))],
                feed_key: [round(data[feed_key][0] * feed_f, 3), round(data[feed_key][1] * feed_f, 3)],
            }
    out["ops"] = ops
    return out


# =============================================================================
# CHATTER-FREE / HEM (Yuksek Verimli Frezeleme)
# Kesici helis boyunun tamami eksenel derinlik (ap) olarak kullanilir,
# radyal kavrama (ae) cok kucuk tutulur -> talas incelmesi telafisi sarttir.
# =============================================================================
HEM_AE_MIN_PCT = 3.0
HEM_AE_MAX_PCT = 20.0


def rctf(ae: float, d: float) -> float:
    """Radyal talas incelme faktoru: RCTF = 1 / sqrt(1 - (1 - 2*ae/D)^2)"""
    if d <= 0 or ae <= 0:
        return 1.0
    ratio = min(ae / d, 0.5)
    x = 1.0 - 2.0 * ratio
    val = 1.0 - x * x
    if val <= 0:
        return 1.0
    return 1.0 / math.sqrt(val)


def tooth_passing_frequency(n: float, z: int) -> float:
    """Dis gecis frekansi [Hz] = n * z / 60"""
    return (n * z) / 60.0


def chatter_free_spindle_speeds(chatter_hz: float, z: int, lobes: int = 4):
    """Olculen chatter frekansina gore kararli devir onerileri: N = 60*fc/(z*(k+1))"""
    if not chatter_hz or chatter_hz <= 0 or z <= 0:
        return []
    return [
        {"lobe": k, "rpm": (60.0 * chatter_hz) / (z * (k + 1))}
        for k in range(0, max(1, lobes))
    ]


def calc_chatter_free(vc, d, z, fz_target, ap, ae, kc, flute_length=None,
                      eta=0.8, limits=None, vc_factor=1.0, chatter_hz=0.0):
    """HEM / chatter-free frezeleme hesabi."""
    if d <= 0:
        raise ValueError("Takim capi sifirdan buyuk olmali")
    if ae <= 0 or ae > d:
        raise ValueError("Radyal kavrama 0 ile takim capi arasinda olmali")
    vc_eff_input = vc * (vc_factor or 1.0)
    n0 = rpm_from_vc(vc_eff_input, d)
    factor = rctf(ae, d)
    fz_prog = fz_target * factor
    vf0 = vf_milling(fz_prog, z, n0)
    lim = apply_machine_limits(n0, vf0, d, limits or {})
    q = mrr_milling(ap, ae, lim["vf"])
    p = power_kw(q, kc, eta)

    # gercek (ortalama) talas kalinligi -> hedefe esit olmali
    hm = chip_thinning_hm(fz_prog, ae, d)

    # klasik frezeleme ile karsilastirma (ap = 0.5D, ae = 0.5D, telafi yok)
    ap_conv = d * 0.5
    ae_conv = d * 0.5
    n_conv = rpm_from_vc(vc, d)
    vf_conv = vf_milling(fz_target, z, n_conv)
    q_conv = mrr_milling(ap_conv, ae_conv, vf_conv)

    warnings = []
    ae_pct = (ae / d) * 100.0
    if ae_pct > HEM_AE_MAX_PCT:
        warnings.append("Radyal kavrama %20'nin uzerinde — chatter-free avantaji azalir")
    if ae_pct < HEM_AE_MIN_PCT:
        warnings.append("Radyal kavrama cok kucuk — talas cok ince, takim ovalar")
    if flute_length and ap > flute_length + 1e-9:
        warnings.append("Eksenel derinlik kesici (helis) boyunu asiyor")
    if ap > 3.0 * d:
        warnings.append("Eksenel derinlik 3xD'yi asiyor — takim sapmasi/kirilma riski")

    return {
        "n": lim["n"], "vf": lim["vf"], "vcEffective": lim["vcEffective"],
        "rctf": factor, "fzProgrammed": fz_prog, "fzTarget": fz_target, "hm": hm,
        "aePercent": ae_pct, "engagement": engagement_angle_deg(ae, d),
        "q": q, "power": p, "torque": torque_nm(p, lim["n"]),
        "toothPassHz": tooth_passing_frequency(lim["n"], z),
        "chatterSpeeds": chatter_free_spindle_speeds(chatter_hz, z),
        "edgeUseRatio": (ap / ap_conv) if ap_conv > 0 else 0.0,
        "comparison": {
            "apConventional": ap_conv, "aeConventional": ae_conv,
            "vfConventional": vf_conv, "qConventional": q_conv,
            "mrrGain": (q / q_conv) if q_conv > 0 else 0.0,
            "timeSavingPct": (1.0 - (q_conv / q)) * 100.0 if q > 0 else 0.0,
        },
        "warnings": warnings,
        "limits": lim,
    }
