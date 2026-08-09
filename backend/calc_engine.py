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
