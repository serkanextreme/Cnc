"""
PHASE 1 CORE POC — Talas (CNC Kesme Parametreleri) hesap motoru izole dogrulama
==============================================================================
Bu script uygulamanin CEKIRDEGINI kanitlar:
  1. Devir (n), kesme hizi (Vc), ilerleme (Vf) formulleri  -> mockup sayilariyla birebir
  2. Talas hacmi (Q/MRR), guc (kW), tork (Nm)
  3. Yuzey purustlugu Ra (torna) ve ters cozum (hedef Ra -> onerilen f)
  4. Matkap cevrim suresi
  5. Freze talas incelmesi (chip thinning / hm)
  6. Tezgah limiti clamp + clamp sonrasi efektif Vc
  7. Metrik <-> Imperial (inch / SFM / IPR / IPM) donusumleri
  8. 24 malzemelik veri tabani butunlugu (karbur + HSS x freze/torna/matkap)
  9. Uctan uca senaryo: malzeme sec -> onerilen degerler -> hesapla -> dogrula
 10. materials_seed.json uretimi (frontend'e tasinmak uzere)

Calistir:  python3 /app/test_core.py
"""

import json
import math
import sys

# =============================================================================
# 1) HESAP MOTORU (pure functions)
# =============================================================================

PI = math.pi


def rpm_from_vc(vc_m_min: float, d_mm: float) -> float:
    """n = (1000 * Vc) / (pi * D)   [dev/dk]"""
    if d_mm <= 0:
        raise ValueError("Cap (D) sifirdan buyuk olmali")
    return (1000.0 * vc_m_min) / (PI * d_mm)


def vc_from_rpm(n_rpm: float, d_mm: float) -> float:
    """Vc = (pi * D * n) / 1000   [m/dk]"""
    return (PI * d_mm * n_rpm) / 1000.0


def vf_milling(fz_mm: float, z: int, n_rpm: float) -> float:
    """Vf = fz * z * n   [mm/dk]"""
    return fz_mm * z * n_rpm


def vf_single(f_mm_rev: float, n_rpm: float) -> float:
    """Torna/Matkap: Vf = f * n   [mm/dk]"""
    return f_mm_rev * n_rpm


def mrr_milling(ap_mm: float, ae_mm: float, vf_mm_min: float) -> float:
    """Q = ap * ae * Vf  [mm3/dk] -> cm3/dk"""
    return (ap_mm * ae_mm * vf_mm_min) / 1000.0


def mrr_turning(ap_mm: float, f_mm_rev: float, vc_m_min: float) -> float:
    """Q = ap * f * Vc  [cm3/dk]  (ap mm, f mm/dev, Vc m/dk)"""
    return ap_mm * f_mm_rev * vc_m_min


def mrr_drilling(d_mm: float, vf_mm_min: float) -> float:
    """Q = (pi*D^2/4) * Vf  [mm3/dk] -> cm3/dk"""
    return (PI * d_mm * d_mm / 4.0) * vf_mm_min / 1000.0


def power_kw(mrr_cm3_min: float, kc_n_mm2: float, eta: float = 0.8) -> float:
    """Pc = Q[cm3/dk] * kc[N/mm2] / 60000  [kW] ; makine gucu = Pc / eta"""
    if eta <= 0:
        eta = 0.8
    return (mrr_cm3_min * kc_n_mm2) / 60000.0 / eta


def torque_nm(p_kw: float, n_rpm: float) -> float:
    """M = 30000 * P[kW] / (pi * n)  = 9549 * P / n   [Nm]"""
    if n_rpm <= 0:
        return 0.0
    return (30000.0 * p_kw) / (PI * n_rpm)


def ra_from_feed(f_mm_rev: float, nose_r_mm: float) -> float:
    """Torna teorik yuzey purustlugu: Ra = f^2 / (32 * r_eps)  [mm] -> um"""
    if nose_r_mm <= 0:
        raise ValueError("Uc radyusu sifirdan buyuk olmali")
    return (f_mm_rev ** 2) / (32.0 * nose_r_mm) * 1000.0


def feed_from_ra(ra_um: float, nose_r_mm: float) -> float:
    """Ters cozum: f = sqrt(32 * Ra[mm] * r_eps)  [mm/dev]"""
    ra_mm = ra_um / 1000.0
    return math.sqrt(32.0 * ra_mm * nose_r_mm)


def drill_cycle_time_s(depth_mm: float, vf_mm_min: float, approach_mm: float = 2.0,
                       peck_count: int = 0, peck_retract_s: float = 0.3) -> float:
    """Matkap ilerleme (cevrim) suresi [saniye]"""
    if vf_mm_min <= 0:
        return 0.0
    t_min = (depth_mm + approach_mm) / vf_mm_min
    return t_min * 60.0 + peck_count * peck_retract_s


def chip_thinning_hm(fz_mm: float, ae_mm: float, d_mm: float) -> float:
    """Ortalama talas kalinligi hm (radyal kavrama ae < D/2 icin incelme)."""
    if d_mm <= 0:
        return 0.0
    ratio = min(max(ae_mm / d_mm, 0.0), 1.0)
    x = 1.0 - 2.0 * ratio
    val = 1.0 - x * x
    if val <= 0:
        return fz_mm
    factor = math.sqrt(val)
    return fz_mm * min(factor, 1.0)


def engagement_angle_deg(ae_mm: float, d_mm: float) -> float:
    """Radyal kavrama acisi (freze)."""
    if d_mm <= 0:
        return 0.0
    ratio = min(max(ae_mm / d_mm, 0.0), 1.0)
    return math.degrees(math.acos(1.0 - 2.0 * ratio))


# ---- Tezgah limiti ----------------------------------------------------------

MACHINE_PRESETS = {
    "vmc_std": {"label": "CNC Dik Isleme Merkezi (Standart)", "max_rpm": 8000, "max_feed": 10000, "power_kw": 7.5},
    "vmc_fast": {"label": "CNC Dik Isleme Merkezi (Hizli)", "max_rpm": 12000, "max_feed": 15000, "power_kw": 11.0},
    "vmc_hsm": {"label": "HSM / Yuksek Devir Merkezi", "max_rpm": 24000, "max_feed": 20000, "power_kw": 15.0},
    "lathe_cnc": {"label": "CNC Torna", "max_rpm": 4000, "max_feed": 8000, "power_kw": 11.0},
    "lathe_conv": {"label": "Universal (Konvansiyonel) Torna", "max_rpm": 2000, "max_feed": 2000, "power_kw": 5.5},
    "mill_conv": {"label": "Konvansiyonel Freze", "max_rpm": 2000, "max_feed": 1500, "power_kw": 4.0},
    "drill_press": {"label": "Matkap Tezgahi", "max_rpm": 3000, "max_feed": 1200, "power_kw": 2.2},
}


def apply_machine_limits(n_rpm: float, vf_mm_min: float, d_mm: float, limits: dict):
    """Devir ve ilerlemeyi tezgah limitine sinirla; clamp sonrasi efektif Vc'yi yeniden hesapla."""
    out = {
        "n": n_rpm,
        "vf": vf_mm_min,
        "rpm_clamped": False,
        "feed_clamped": False,
        "vc_effective": vc_from_rpm(n_rpm, d_mm),
        "notes": [],
    }
    if not limits:
        return out
    max_rpm = limits.get("max_rpm")
    max_feed = limits.get("max_feed")
    if max_rpm and n_rpm > max_rpm:
        scale = max_rpm / n_rpm
        out["n"] = float(max_rpm)
        out["vf"] = vf_mm_min * scale  # ilerleme devirle olceklenir (mm/dev sabit)
        out["rpm_clamped"] = True
        out["vc_effective"] = vc_from_rpm(float(max_rpm), d_mm)
        out["notes"].append(f"Devir {max_rpm} dev/dk ile sinirlandi")
    if max_feed and out["vf"] > max_feed:
        out["vf"] = float(max_feed)
        out["feed_clamped"] = True
        out["notes"].append(f"Ilerleme {max_feed} mm/dk ile sinirlandi")
    return out


# ---- Birim donusumleri ------------------------------------------------------

MM_PER_INCH = 25.4
FT_PER_M = 3.280839895


def mm_to_in(v):    return v / MM_PER_INCH
def in_to_mm(v):    return v * MM_PER_INCH
def mmin_to_sfm(v): return v * FT_PER_M
def sfm_to_mmin(v): return v / FT_PER_M
def mmmin_to_ipm(v): return v / MM_PER_INCH
def ipm_to_mmmin(v): return v * MM_PER_INCH
def mmrev_to_ipr(v): return v / MM_PER_INCH
def ipr_to_mmrev(v): return v * MM_PER_INCH
def cm3_to_in3(v):  return v / 16.387064
def nm_to_lbft(v):  return v * 0.7375621
def kw_to_hp(v):    return v * 1.34102209


# =============================================================================
# 2) MALZEME VERI TABANI (24 malzeme) — frontend'e tasinacak
# =============================================================================
# Her malzeme: kod, ad, grup, sertlik, cekme dayanimi, kc (ozgul kesme kuvveti),
# islenebilirlik ve karbur/HSS icin freze(vc, fz) / torna(vc, f) / matkap(vc, f)
# baslangic araliklari.

def M(code, name, group, sub, hardness, hv_scale, tensile, kc, mach, color,
      f_carb_vc, f_carb_fz, f_hss_vc, f_hss_fz,
      t_carb_vc, t_carb_f, t_hss_vc, t_hss_f,
      d_carb_vc, d_carb_f, d_hss_vc, d_hss_f, desc, tags, coolant):
    return {
        "id": code.lower().replace(" ", "-").replace("/", "-"),
        "code": code,
        "name": name,
        "group": group,
        "subtitle": sub,
        "hardness": hardness,          # [min, max]
        "hardnessScale": hv_scale,     # HRC | HB
        "tensile": tensile,            # [min, max] MPa
        "kc": kc,                      # N/mm2 ozgul kesme kuvveti
        "machinability": mach,         # kolay | orta | zor | cok-zor
        "accent": color,
        "desc": desc,
        "tags": tags,
        "coolant": coolant,
        "ops": {
            "freze": {
                "karbur": {"vc": f_carb_vc, "fz": f_carb_fz},
                "hss": {"vc": f_hss_vc, "fz": f_hss_fz},
            },
            "torna": {
                "karbur": {"vc": t_carb_vc, "f": t_carb_f},
                "hss": {"vc": t_hss_vc, "f": t_hss_f},
            },
            "matkap": {
                "karbur": {"vc": d_carb_vc, "f": d_carb_f},
                "hss": {"vc": d_hss_vc, "f": d_hss_f},
            },
        },
    }


GROUPS = [
    {"id": "celik", "label": "Karbon ve alasimli celikler", "icon": "anvil"},
    {"id": "takim-celigi", "label": "Takim celikleri", "icon": "hammer"},
    {"id": "paslanmaz", "label": "Paslanmaz celikler", "icon": "shield-check"},
    {"id": "aluminyum", "label": "Aluminyum alasimlari", "icon": "triangle"},
    {"id": "dokme-demir", "label": "Dokme demirler", "icon": "circle"},
    {"id": "pirinc-bronz", "label": "Pirinc ve bronzlar", "icon": "coins"},
    {"id": "titanyum", "label": "Titanyum alasimlari", "icon": "atom"},
    {"id": "nikel", "label": "Nikel alasimlari", "icon": "flame"},
    {"id": "plastik", "label": "Plastik muhendislik malzemeleri", "icon": "component"},
]

MATERIALS = [
    # --- Karbon ve alasimli celikler (6) ---
    M("4140", "Islah Celigi", "celik", "42CrMo4", [28, 32], "HRC", [850, 950], 2100, "orta", "primary",
      [120, 160], [0.05, 0.12], [25, 40], [0.03, 0.07],
      [160, 210], [0.15, 0.30], [30, 45], [0.10, 0.20],
      [70, 100], [0.12, 0.20], [18, 28], [0.08, 0.15],
      "Krom-molibdenli, islah islemli yapi celigi",
      ["Islah celigi", "Krom-molibden", "Orta islenebilirlik"], "Sogutma Sivisi"),
    M("C45 / Ck45", "Karbon Celigi", "celik", "1.0503", [170, 210], "HB", [600, 750], 1800, "kolay", "accent",
      [140, 200], [0.06, 0.15], [28, 45], [0.04, 0.09],
      [180, 260], [0.15, 0.40], [35, 55], [0.12, 0.25],
      [80, 120], [0.15, 0.25], [22, 32], [0.10, 0.18],
      "Orta karbonlu, genel amacli imalat celigi",
      ["Karbon celigi", "Genel amacli", "Iyi islenebilirlik"], "Sogutma Sivisi"),
    M("1045", "Karbon Celigi", "celik", "AISI 1045", [180, 220], "HB", [620, 780], 1850, "kolay", "accent",
      [130, 190], [0.06, 0.14], [26, 42], [0.04, 0.08],
      [170, 250], [0.15, 0.38], [32, 50], [0.12, 0.24],
      [75, 115], [0.14, 0.24], [20, 30], [0.10, 0.17],
      "Orta karbonlu celik, mil ve dinamik parcalar",
      ["Karbon celigi", "Mil malzemesi"], "Sogutma Sivisi"),
    M("1020", "Dusuk Karbonlu Celik", "celik", "AISI 1020", [110, 150], "HB", [400, 550], 1600, "kolay", "accent",
      [150, 220], [0.08, 0.18], [30, 50], [0.05, 0.10],
      [200, 300], [0.20, 0.45], [40, 60], [0.15, 0.30],
      [90, 130], [0.18, 0.28], [25, 35], [0.12, 0.20],
      "Sunek, kaynaga uygun dusuk karbonlu celik",
      ["Dusuk karbon", "Kolay islenir", "Kaynaklanabilir"], "Sogutma Sivisi"),
    M("4340", "Yuksek Mukavemetli Alasim", "celik", "34CrNiMo6", [32, 38], "HRC", [1000, 1200], 2350, "zor", "chart5",
      [90, 130], [0.04, 0.10], [18, 30], [0.02, 0.05],
      [120, 170], [0.12, 0.25], [22, 35], [0.08, 0.16],
      [50, 80], [0.10, 0.16], [12, 20], [0.06, 0.12],
      "Nikel-krom-molibdenli yuksek mukavemetli celik",
      ["Yuksek mukavemet", "Ni-Cr-Mo", "Zor islenir"], "Yuksek Basincli Sogutma"),
    M("8620", "Sementasyon Celigi", "celik", "21NiCrMo2", [150, 200], "HB", [550, 750], 1900, "orta", "primary",
      [120, 170], [0.06, 0.13], [25, 40], [0.04, 0.08],
      [160, 230], [0.15, 0.32], [30, 48], [0.12, 0.22],
      [70, 105], [0.13, 0.22], [20, 30], [0.09, 0.16],
      "Yuzey sertlestirmeye uygun dusuk alasimli celik",
      ["Sementasyon", "Disli malzemesi"], "Sogutma Sivisi"),

    # --- Takim celikleri (3) ---
    M("D2", "Soguk Is Takim Celigi", "takim-celigi", "1.2379", [55, 62], "HRC", [1600, 2000], 2900, "cok-zor", "destructive",
      [50, 80], [0.03, 0.07], [10, 18], [0.015, 0.035],
      [60, 100], [0.08, 0.18], [12, 20], [0.05, 0.10],
      [25, 45], [0.06, 0.12], [8, 14], [0.04, 0.08],
      "Yuksek kromlu, asinmaya dayanikli soguk is celigi",
      ["Sert malzeme", "Asinma direnci", "Cok zor islenir"], "Yuksek Basincli Sogutma"),
    M("H13", "Sicak Is Takim Celigi", "takim-celigi", "1.2344", [44, 52], "HRC", [1400, 1700], 2700, "zor", "destructive",
      [60, 100], [0.035, 0.08], [12, 20], [0.02, 0.04],
      [80, 130], [0.10, 0.22], [15, 25], [0.06, 0.12],
      [35, 55], [0.08, 0.14], [10, 16], [0.05, 0.09],
      "Kalip ve sicak is uygulamalari icin krom esasli celik",
      ["Kalip celigi", "Sicak is", "Zor islenir"], "Yuksek Basincli Sogutma"),
    M("M2 HSS", "Hiz Celigi", "takim-celigi", "1.3343", [62, 65], "HRC", [1900, 2200], 3100, "cok-zor", "destructive",
      [40, 70], [0.025, 0.06], [8, 14], [0.01, 0.03],
      [50, 85], [0.06, 0.15], [10, 16], [0.04, 0.09],
      [20, 35], [0.05, 0.10], [6, 12], [0.03, 0.07],
      "Yuksek hiz celigi, tungsten-molibden alasimli",
      ["HSS", "Cok sert", "Taslama tercih edilir"], "Yuksek Basincli Sogutma"),

    # --- Paslanmaz celikler (3) ---
    M("304", "Paslanmaz Celik", "paslanmaz", "Ostenitik / X5CrNi18-10", [170, 200], "HB", [500, 700], 2400, "zor", "chart3",
      [80, 130], [0.05, 0.12], [15, 25], [0.03, 0.06],
      [120, 180], [0.15, 0.30], [20, 35], [0.10, 0.20],
      [40, 70], [0.10, 0.18], [10, 18], [0.06, 0.12],
      "Ostenitik paslanmaz celik, is sertlesmesi egilimli",
      ["Paslanmaz", "Ostenitik", "Is sertlesmesi"], "Bol Sogutma Sivisi"),
    M("316L", "Paslanmaz Celik", "paslanmaz", "Ostenitik / X2CrNiMo17-12-2", [170, 210], "HB", [490, 690], 2500, "zor", "chart3",
      [70, 120], [0.05, 0.11], [14, 24], [0.03, 0.055],
      [110, 170], [0.14, 0.28], [18, 32], [0.10, 0.18],
      [35, 65], [0.09, 0.16], [9, 16], [0.05, 0.11],
      "Molibdenli, korozyona dayanikli paslanmaz celik",
      ["Paslanmaz", "Molibdenli", "Yapiskan talas"], "Bol Sogutma Sivisi"),
    M("17-4 PH", "Cokelme Sertlesmeli Paslanmaz", "paslanmaz", "1.4542 / H900", [35, 44], "HRC", [1000, 1300], 2650, "zor", "chart3",
      [60, 100], [0.04, 0.09], [12, 20], [0.02, 0.045],
      [90, 140], [0.12, 0.25], [15, 26], [0.08, 0.16],
      [30, 55], [0.08, 0.14], [8, 14], [0.05, 0.10],
      "Cokelme ile sertlesen yuksek mukavemetli paslanmaz",
      ["Paslanmaz", "Cokelme sertlesmesi", "Havacilik"], "Yuksek Basincli Sogutma"),

    # --- Aluminyum alasimlari (3) ---
    M("6061-T6", "Aluminyum Alasimi", "aluminyum", "AlMg1SiCu", [95, 95], "HB", [290, 330], 700, "kolay", "success",
      [300, 600], [0.08, 0.25], [90, 180], [0.05, 0.15],
      [350, 700], [0.10, 0.40], [100, 200], [0.08, 0.25],
      [120, 250], [0.15, 0.35], [50, 90], [0.10, 0.25],
      "Genel amacli, iyi islenebilir aluminyum alasimi",
      ["Aluminyum", "Kolay islenir", "Yapisma riski"], "Hava / Mist"),
    M("6082-T6", "Aluminyum Alasimi", "aluminyum", "AlSi1MgMn", [95, 95], "HB", [310, 340], 720, "kolay", "success",
      [350, 600], [0.08, 0.25], [100, 180], [0.05, 0.15],
      [400, 700], [0.10, 0.40], [110, 200], [0.08, 0.25],
      [130, 250], [0.15, 0.35], [55, 95], [0.10, 0.25],
      "Yapisal aluminyum alasimi, yuksek kesme hizlarina uygun",
      ["Aluminyum", "Yapisal", "Yuksek Vc"], "Hava / Mist"),
    M("7075-T6", "Yuksek Mukavemetli Aluminyum", "aluminyum", "AlZn5.5MgCu", [150, 150], "HB", [540, 580], 850, "kolay", "success",
      [300, 550], [0.07, 0.22], [90, 160], [0.04, 0.13],
      [350, 650], [0.10, 0.35], [100, 180], [0.08, 0.22],
      [110, 220], [0.14, 0.32], [45, 85], [0.09, 0.22],
      "Cinko alasimli, havacilikta kullanilan aluminyum",
      ["Aluminyum", "Havacilik", "Yuksek mukavemet"], "Hava / Mist"),

    # --- Dokme demirler (2) ---
    M("GG25", "Gri Dokme Demir", "dokme-demir", "EN-GJL-250", [180, 220], "HB", [250, 300], 1100, "kolay", "chart4",
      [150, 250], [0.08, 0.20], [25, 45], [0.05, 0.12],
      [180, 300], [0.20, 0.50], [30, 50], [0.15, 0.30],
      [60, 100], [0.15, 0.30], [18, 28], [0.10, 0.20],
      "Lamel grafitli gri dokme demir, kirilgan talas",
      ["Dokme demir", "Toz talas", "Kuru islenebilir"], "Kuru / Hava"),
    M("GGG40", "Kuresel Grafitli Dokme Demir", "dokme-demir", "EN-GJS-400-15", [140, 200], "HB", [400, 450], 1300, "orta", "chart4",
      [130, 220], [0.08, 0.18], [22, 40], [0.05, 0.10],
      [160, 260], [0.18, 0.45], [28, 45], [0.14, 0.28],
      [55, 95], [0.14, 0.28], [16, 26], [0.09, 0.18],
      "Sunek dokme demir, mekanik parcalar icin",
      ["Dokme demir", "Sunek", "Sferoidal"], "Kuru / Sogutma Sivisi"),

    # --- Pirinc ve bronzlar (2) ---
    M("CuZn39Pb3", "Pirinc", "pirinc-bronz", "MS58 / Otomat pirinci", [110, 150], "HB", [370, 450], 600, "kolay", "primary",
      [200, 400], [0.08, 0.22], [70, 140], [0.05, 0.14],
      [250, 500], [0.10, 0.40], [80, 160], [0.08, 0.25],
      [100, 180], [0.15, 0.30], [40, 80], [0.10, 0.22],
      "Kursunlu otomat pirinci, cok kolay islenir",
      ["Pirinc", "Otomat", "Cok kolay islenir"], "Kuru / Sogutma Sivisi"),
    M("CuSn12", "Bronz", "pirinc-bronz", "Kalay bronzu", [90, 130], "HB", [280, 350], 750, "kolay", "primary",
      [150, 300], [0.07, 0.18], [50, 100], [0.04, 0.12],
      [180, 350], [0.10, 0.35], [60, 120], [0.08, 0.22],
      [70, 130], [0.12, 0.25], [30, 60], [0.09, 0.18],
      "Kalay bronzu, yatak ve burc malzemesi",
      ["Bronz", "Yatak malzemesi"], "Sogutma Sivisi"),

    # --- Titanyum (1) ---
    M("Ti-6Al-4V", "Titanyum Alasimi", "titanyum", "Grade 5 / 3.7165", [30, 36], "HRC", [900, 1100], 1900, "cok-zor", "chart5",
      [40, 80], [0.04, 0.10], [10, 18], [0.02, 0.05],
      [50, 100], [0.10, 0.25], [12, 22], [0.06, 0.14],
      [15, 35], [0.06, 0.14], [6, 12], [0.04, 0.09],
      "Alfa-beta titanyum alasimi, dusuk isi iletimi",
      ["Titanyum", "Dusuk Vc", "Yangin riski"], "Yuksek Basincli Sogutma"),

    # --- Nikel (1) ---
    M("Inconel 718", "Nikel Esasli Superalasim", "nikel", "2.4668", [36, 44], "HRC", [1200, 1400], 2900, "cok-zor", "destructive",
      [25, 50], [0.03, 0.08], [6, 12], [0.015, 0.035],
      [30, 60], [0.08, 0.20], [8, 14], [0.05, 0.10],
      [10, 25], [0.05, 0.12], [4, 9], [0.03, 0.07],
      "Yuksek sicaklik dayanimli nikel superalasimi",
      ["Superalasim", "Cok zor islenir", "Takim asinmasi"], "Yuksek Basincli Sogutma"),

    # --- Plastik muhendislik malzemeleri (3) ---
    M("POM", "Poliasetal", "plastik", "Delrin / C", [80, 120], "HB", [65, 75], 180, "kolay", "chart2",
      [400, 900], [0.10, 0.30], [200, 500], [0.08, 0.25],
      [400, 900], [0.10, 0.50], [200, 500], [0.10, 0.35],
      [150, 300], [0.15, 0.40], [80, 180], [0.12, 0.30],
      "Boyutsal kararliligi yuksek muhendislik plastigi",
      ["Plastik", "Kolay islenir", "Keskin takim"], "Hava / Kuru"),
    M("PA6", "Poliamid (Naylon)", "plastik", "Naylon 6", [70, 110], "HB", [70, 85], 200, "kolay", "chart2",
      [300, 800], [0.10, 0.28], [150, 400], [0.08, 0.22],
      [300, 800], [0.10, 0.45], [150, 400], [0.10, 0.30],
      [120, 250], [0.15, 0.35], [70, 150], [0.12, 0.28],
      "Tokluk ve asinma direnci yuksek muhendislik plastigi",
      ["Plastik", "Nem alir", "Elastik"], "Hava / Kuru"),
    M("PEEK", "Poliaterreketon", "plastik", "Yuksek performans plastik", [100, 130], "HB", [95, 110], 260, "orta", "chart2",
      [250, 600], [0.08, 0.22], [120, 300], [0.06, 0.18],
      [250, 600], [0.10, 0.40], [120, 300], [0.10, 0.28],
      [100, 200], [0.12, 0.30], [60, 120], [0.10, 0.24],
      "Yuksek sicaklik ve kimyasal dayanimli plastik",
      ["Plastik", "Yuksek performans", "Abrasif dolgu"], "Hava / Sogutma Sivisi"),
]


# =============================================================================
# 3) DEGERLENDIRME / VALIDASYON KATMANI
# =============================================================================

def evaluate_range(value: float, rng) -> dict:
    """Girilen degeri onerilen aralikla karsilastir -> durum + mesaj."""
    lo, hi = rng
    if value < lo * 0.6 or value > hi * 1.6:
        return {"status": "error", "label": "Aralik disi", "range": rng}
    if value < lo:
        return {"status": "warn", "label": "Onerilenin altinda", "range": rng}
    if value > hi:
        return {"status": "warn", "label": "Onerilenin ustunde", "range": rng}
    return {"status": "ok", "label": "Uygun", "range": rng}


def calc_milling(vc, d, z, fz, ap, ae, kc, eta=0.8, limits=None):
    n = rpm_from_vc(vc, d)
    vf = vf_milling(fz, z, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    n_f, vf_f = lim["n"], lim["vf"]
    q = mrr_milling(ap, ae, vf_f)
    p = power_kw(q, kc, eta)
    return {
        "n": n_f, "vf": vf_f, "vc_effective": lim["vc_effective"], "q": q,
        "power": p, "torque": torque_nm(p, n_f),
        "hm": chip_thinning_hm(fz, ae, d),
        "engagement": engagement_angle_deg(ae, d),
        "limits": lim,
    }


def calc_turning(vc, d, f, ap, nose_r, kc, eta=0.8, limits=None, target_ra=None):
    n = rpm_from_vc(vc, d)
    vf = vf_single(f, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    n_f, vf_f = lim["n"], lim["vf"]
    q = mrr_turning(ap, f, lim["vc_effective"])
    p = power_kw(q, kc, eta)
    res = {
        "n": n_f, "vf": vf_f, "vc_effective": lim["vc_effective"], "q": q,
        "power": p, "torque": torque_nm(p, n_f),
        "ra": ra_from_feed(f, nose_r), "limits": lim,
    }
    if target_ra:
        res["f_for_target_ra"] = feed_from_ra(target_ra, nose_r)
    return res


def calc_drilling(vc, d, f, depth, kc, eta=0.8, limits=None, peck=0):
    n = rpm_from_vc(vc, d)
    vf = vf_single(f, n)
    lim = apply_machine_limits(n, vf, d, limits or {})
    n_f, vf_f = lim["n"], lim["vf"]
    q = mrr_drilling(d, vf_f)
    p = power_kw(q, kc, eta)
    return {
        "n": n_f, "vf": vf_f, "vc_effective": lim["vc_effective"], "q": q,
        "power": p, "torque": torque_nm(p, n_f),
        "cycle_s": drill_cycle_time_s(depth, vf_f, approach_mm=0.0, peck_count=peck),
        "limits": lim,
    }


# =============================================================================
# 4) TEST HARNESS
# =============================================================================

PASS, FAIL = 0, 0
FAILURES = []


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


# ---------------------------------------------------------------- TEST 1
def test_mockup_numbers():
    print("\n=== TEST 1: Mockup sayilari birebir dogrulama ===")
    # FREZE: Vc=140, D=12, z=4, fz=0.08 -> n~3714, Vf~1188
    n = rpm_from_vc(140, 12)
    vf = vf_milling(0.08, 4, n)
    check("Freze devir n=3714", near(round(n), 3714, 1), f"n={n:.1f}")
    check("Freze ilerleme Vf=1188", near(round(vf), 1188, 2), f"Vf={vf:.1f}")

    # TORNA: Vc=180, D=50 -> n~1146 ; f=0.22 -> Vf~252
    n2 = rpm_from_vc(180, 50)
    vf2 = vf_single(0.22, n2)
    check("Torna devir n=1146", near(round(n2), 1146, 1), f"n={n2:.1f}")
    check("Torna ilerleme Vf=252", near(round(vf2), 252, 1), f"Vf={vf2:.1f}")

    # MATKAP: Vc=80, D=10 -> n~2546 ; f=0.16 -> Vf~407 ; 30mm -> ~4.4 s
    n3 = rpm_from_vc(80, 10)
    vf3 = vf_single(0.16, n3)
    t3 = drill_cycle_time_s(30, vf3, approach_mm=0.0)
    check("Matkap devir n=2546", near(round(n3), 2546, 1), f"n={n3:.1f}")
    check("Matkap ilerleme Vf=407", near(round(vf3), 407, 1), f"Vf={vf3:.1f}")
    check("Matkap cevrim ~4.4 sn", near(t3, 4.4, 0.15), f"t={t3:.2f} s")

    # Gecmis ekranindaki diger kayitlar
    n4 = rpm_from_vc(250, 8)     # Aluminyum 6082 Ø8 -> 9.947 dev/dk
    check("Gecmis: Al 6082 Ø8 -> 9947", near(round(n4), 9947, 3), f"n={n4:.0f}")
    n5 = rpm_from_vc(160, 32)    # C45 Ø32 -> 1.592 dev/dk
    check("Gecmis: C45 Ø32 -> 1592", near(round(n5), 1592, 3), f"n={n5:.0f}")


# ---------------------------------------------------------------- TEST 2
def test_reverse_and_ra():
    print("\n=== TEST 2: Ters cozumler, Ra ve talas incelmesi ===")
    vc = vc_from_rpm(3714.0, 12)
    check("Vc geri hesabi (3714 dev/dk, Ø12) = 140", near(vc, 140, 0.5), f"Vc={vc:.2f}")

    ra = ra_from_feed(0.22, 0.80)
    check("Ra = f^2/(32*re) -> 1.89 um", near(ra, 1.891, 0.02), f"Ra={ra:.3f} um")

    f = feed_from_ra(1.60, 0.80)
    check("Hedef Ra 1.6 -> f = 0.202 mm/dev", near(f, 0.2024, 0.002), f"f={f:.4f}")
    # tur-donus tutarliligi
    check("Ra <-> f tur-donus tutarli", near(ra_from_feed(f, 0.8), 1.60, 0.01),
          f"Ra(f)={ra_from_feed(f,0.8):.3f}")

    # Talas incelmesi: ae = D/2 -> hm = fz ; ae = 0.1*D -> hm = 0.6*fz
    check("hm (ae=D/2) = fz", near(chip_thinning_hm(0.08, 6, 12), 0.08, 1e-6),
          f"hm={chip_thinning_hm(0.08,6,12):.4f}")
    check("hm (ae=0.1D) = 0.6*fz", near(chip_thinning_hm(0.08, 1.2, 12), 0.048, 1e-4),
          f"hm={chip_thinning_hm(0.08,1.2,12):.4f}")
    check("Kavrama acisi (ae=D/2) = 90 derece", near(engagement_angle_deg(6, 12), 90, 0.01),
          f"{engagement_angle_deg(6,12):.2f} deg")


# ---------------------------------------------------------------- TEST 3
def test_mrr_power_torque():
    print("\n=== TEST 3: Talas hacmi, guc ve tork ===")
    # Freze 4140: ap=2, ae=6, Vf=1188 -> Q = 2*6*1188/1000 = 14.256 cm3/dk
    q = mrr_milling(2, 6, 1188.0)
    check("Freze Q = 14.26 cm3/dk", near(q, 14.256, 0.01), f"Q={q:.3f}")
    p = power_kw(q, 2100, 0.8)
    check("Freze Pc = 0.62 kW", near(p, 0.6237, 0.01), f"P={p:.3f} kW")
    m = torque_nm(p, 3714.0)
    check("Freze tork = 1.60 Nm", near(m, 1.604, 0.02), f"M={m:.3f} Nm")

    # Torna: ap=1.5, f=0.22, Vc=180 -> Q = 1.5*0.22*180 = 59.4 cm3/dk
    q2 = mrr_turning(1.5, 0.22, 180)
    check("Torna Q = 59.4 cm3/dk", near(q2, 59.4, 0.01), f"Q={q2:.2f}")
    p2 = power_kw(q2, 2100, 0.8)
    check("Torna Pc = 2.60 kW", near(p2, 2.5988, 0.02), f"P={p2:.3f} kW")

    # Matkap Ø10, Vf=407 -> Q = 78.54*407/1000 = 31.96 cm3/dk
    q3 = mrr_drilling(10, 407.4)
    check("Matkap Q = 32.0 cm3/dk", near(q3, 31.997, 0.1), f"Q={q3:.2f}")

    # Tork dogrulamasi: P=1kW, n=1000 -> M=9.549 Nm
    check("Tork referansi 9.549 Nm", near(torque_nm(1.0, 1000), 9.5493, 0.001),
          f"M={torque_nm(1.0,1000):.4f}")


# ---------------------------------------------------------------- TEST 4
def test_machine_limits():
    print("\n=== TEST 4: Tezgah limiti (otomatik preset + clamp) ===")
    # Aluminyum Ø6, Vc=500 -> n = 26526 dev/dk ; VMC standart 8000 ile sinirli
    n = rpm_from_vc(500, 6)
    vf = vf_milling(0.10, 3, n)
    lim = apply_machine_limits(n, vf, 6, MACHINE_PRESETS["vmc_std"])
    check("Ham devir > limit", n > 8000, f"n_ham={n:.0f}")
    check("Devir 8000'e clamp edildi", near(lim["n"], 8000, 0.1), f"n={lim['n']:.0f}")
    check("Clamp bayragi aktif", lim["rpm_clamped"] is True, str(lim["notes"]))
    vc_eff = lim["vc_effective"]
    check("Efektif Vc yeniden hesaplandi (~150.8)", near(vc_eff, 150.8, 0.5), f"Vc={vc_eff:.2f}")
    # mm/dev sabit kaldi mi? (fz*z = 0.30 mm/dev)
    per_rev = lim["vf"] / lim["n"]
    check("Devir basina ilerleme korundu (0.30)", near(per_rev, 0.30, 1e-6), f"{per_rev:.4f} mm/dev")

    # Limit yoksa clamp olmamali
    lim2 = apply_machine_limits(3714.0, 1188.0, 12, {})
    check("Limit yok -> clamp yok", lim2["rpm_clamped"] is False and near(lim2["n"], 3714, 0.1), "")

    # Ilerleme limiti
    lim3 = apply_machine_limits(2000.0, 5000.0, 20, {"max_rpm": 4000, "max_feed": 3000})
    check("Ilerleme 3000'e clamp edildi", lim3["feed_clamped"] and near(lim3["vf"], 3000, 0.1),
          f"vf={lim3['vf']:.0f}")

    # Tum presetler gecerli mi
    ok = all(p["max_rpm"] > 0 and p["max_feed"] > 0 and p["power_kw"] > 0 for p in MACHINE_PRESETS.values())
    check(f"{len(MACHINE_PRESETS)} tezgah preseti gecerli", ok, "")


# ---------------------------------------------------------------- TEST 5
def test_units():
    print("\n=== TEST 5: Metrik <-> Imperial donusumleri ===")
    check("12 mm = 0.4724 inch", near(mm_to_in(12), 0.472441, 1e-5), f"{mm_to_in(12):.6f}")
    check("0.5 inch = 12.7 mm", near(in_to_mm(0.5), 12.7, 1e-9), f"{in_to_mm(0.5)}")
    check("140 m/dk = 459.3 SFM", near(mmin_to_sfm(140), 459.32, 0.02), f"{mmin_to_sfm(140):.2f}")
    check("500 SFM = 152.4 m/dk", near(sfm_to_mmin(500), 152.4, 0.01), f"{sfm_to_mmin(500):.2f}")
    check("1188 mm/dk = 46.77 IPM", near(mmmin_to_ipm(1188), 46.772, 0.01), f"{mmmin_to_ipm(1188):.3f}")
    check("0.22 mm/dev = 0.00866 IPR", near(mmrev_to_ipr(0.22), 0.008661, 1e-5), f"{mmrev_to_ipr(0.22):.6f}")
    check("Tur-donus: mm->in->mm", near(in_to_mm(mm_to_in(37.5)), 37.5, 1e-9), "")
    check("Tur-donus: m/dk->SFM->m/dk", near(sfm_to_mmin(mmin_to_sfm(180)), 180, 1e-9), "")
    check("14.256 cm3 = 0.8699 in3", near(cm3_to_in3(14.256), 0.86995, 1e-4), f"{cm3_to_in3(14.256):.5f}")
    check("1 kW = 1.341 HP", near(kw_to_hp(1), 1.34102, 1e-5), "")
    check("1.604 Nm = 1.183 lb-ft", near(nm_to_lbft(1.604), 1.18305, 1e-4), "")

    # Imperial girdi ile ayni fiziksel sonuc: D=0.4724", Vc=459.32 SFM -> n=3714
    d_mm = in_to_mm(0.472441)
    vc_mm = sfm_to_mmin(459.32)
    n = rpm_from_vc(vc_mm, d_mm)
    check("Imperial girdi ayni devri veriyor (3714)", near(round(n), 3714, 2), f"n={n:.1f}")


# ---------------------------------------------------------------- TEST 6
def test_material_db():
    print("\n=== TEST 6: Malzeme veri tabani butunlugu ===")
    check("Toplam 24 malzeme", len(MATERIALS) == 24, f"{len(MATERIALS)} malzeme")
    ids = [m["id"] for m in MATERIALS]
    check("ID'ler tekil", len(ids) == len(set(ids)), "")
    check("9 malzeme grubu", len(GROUPS) == 9, f"{len(GROUPS)}")

    group_ids = {g["id"] for g in GROUPS}
    problems = []
    for m in MATERIALS:
        if m["group"] not in group_ids:
            problems.append(f"{m['code']}: gecersiz grup {m['group']}")
        if m["kc"] <= 0:
            problems.append(f"{m['code']}: kc yok")
        if not m["desc"] or not m["tags"]:
            problems.append(f"{m['code']}: aciklama/etiket eksik")
        if not (m["hardness"][0] <= m["hardness"][1]):
            problems.append(f"{m['code']}: sertlik araligi hatali")
        if m["hardnessScale"] not in ("HRC", "HB"):
            problems.append(f"{m['code']}: gecersiz sertlik skalasi")
        if m["hardnessScale"] == "HRC" and not (20 <= m["hardness"][1] <= 68):
            problems.append(f"{m['code']}: HRC 20-68 disinda ({m['hardness']})")
        for op in ("freze", "torna", "matkap"):
            if op not in m["ops"]:
                problems.append(f"{m['code']}: {op} yok")
                continue
            for tool in ("karbur", "hss"):
                if tool not in m["ops"][op]:
                    problems.append(f"{m['code']}: {op}/{tool} yok")
                    continue
                d = m["ops"][op][tool]
                feed_key = "fz" if op == "freze" else "f"
                if "vc" not in d or feed_key not in d:
                    problems.append(f"{m['code']}: {op}/{tool} eksik alan")
                    continue
                if not (0 < d["vc"][0] <= d["vc"][1]):
                    problems.append(f"{m['code']}: {op}/{tool} vc araligi hatali {d['vc']}")
                if not (0 < d[feed_key][0] <= d[feed_key][1]):
                    problems.append(f"{m['code']}: {op}/{tool} ilerleme araligi hatali")
                # HSS her zaman karburden yavas olmali
        for op in ("freze", "torna", "matkap"):
            k = m["ops"][op]["karbur"]["vc"]
            h = m["ops"][op]["hss"]["vc"]
            if h[1] >= k[1]:
                problems.append(f"{m['code']}: {op} HSS Vc >= Karbur Vc")
    check("Tum malzeme kayitlari tutarli", not problems, "; ".join(problems[:6]))

    # Mockup'taki 4140 degerleri korunmus mu?
    m4140 = next(m for m in MATERIALS if m["code"] == "4140")
    check("4140 freze karbur Vc 120-160", m4140["ops"]["freze"]["karbur"]["vc"] == [120, 160], "")
    check("4140 freze karbur fz 0.05-0.12", m4140["ops"]["freze"]["karbur"]["fz"] == [0.05, 0.12], "")
    check("4140 torna karbur Vc 160-210", m4140["ops"]["torna"]["karbur"]["vc"] == [160, 210], "")
    check("4140 torna karbur f 0.15-0.30", m4140["ops"]["torna"]["karbur"]["f"] == [0.15, 0.30], "")
    check("4140 matkap karbur Vc 70-100", m4140["ops"]["matkap"]["karbur"]["vc"] == [70, 100], "")
    check("4140 sertlik 28-32 HRC", m4140["hardness"] == [28, 32] and m4140["hardnessScale"] == "HRC", "")
    check("4140 cekme 850-950 MPa", m4140["tensile"] == [850, 950], "")

    # Mockup malzeme listesindeki kodlar mevcut mu?
    expected = ["4140", "C45 / Ck45", "1045", "1020", "4340", "8620", "D2", "H13", "M2 HSS",
                "304", "316L", "17-4 PH", "6061-T6", "6082-T6", "7075-T6", "GG25", "GGG40",
                "CuZn39Pb3", "CuSn12", "Ti-6Al-4V", "Inconel 718", "POM", "PA6", "PEEK"]
    codes = [m["code"] for m in MATERIALS]
    missing = [c for c in expected if c not in codes]
    check("Mockup'taki tum malzeme kodlari mevcut", not missing, f"eksik={missing}")

    # Grup sayilari (mockup: 6,3,3,3,2,2,1,1,3)
    counts = {g["id"]: sum(1 for m in MATERIALS if m["group"] == g["id"]) for g in GROUPS}
    expected_counts = {"celik": 6, "takim-celigi": 3, "paslanmaz": 3, "aluminyum": 3,
                       "dokme-demir": 2, "pirinc-bronz": 2, "titanyum": 1, "nikel": 1, "plastik": 3}
    check("Grup sayilari mockup ile ayni", counts == expected_counts, f"{counts}")


# ---------------------------------------------------------------- TEST 7
def test_validation():
    print("\n=== TEST 7: Aralik validasyonu (Uygun / Uyari / Hata) ===")
    rng = [120, 160]
    check("140 -> uygun", evaluate_range(140, rng)["status"] == "ok", "")
    check("110 -> uyari (altinda)", evaluate_range(110, rng)["status"] == "warn", "")
    check("175 -> uyari (ustunde)", evaluate_range(175, rng)["status"] == "warn", "")
    check("60 -> hata (aralik disi)", evaluate_range(60, rng)["status"] == "error", "")
    check("300 -> hata (aralik disi)", evaluate_range(300, rng)["status"] == "error", "")

    # Ra hedef kontrolu: girilen f, hedef Ra'yi asiyorsa uyari verilmeli
    ra_actual = ra_from_feed(0.22, 0.8)   # 1.89
    check("f=0.22 hedef Ra 1.6'yi asiyor", ra_actual > 1.60, f"Ra={ra_actual:.2f}")
    f_ok = feed_from_ra(1.60, 0.8)
    check("Onerilen f ile Ra hedefte", ra_from_feed(f_ok, 0.8) <= 1.601, "")

    # Gecersiz girdiler
    try:
        rpm_from_vc(140, 0)
        check("D=0 hata veriyor", False, "istisna atilmadi")
    except ValueError:
        check("D=0 hata veriyor", True, "")
    try:
        ra_from_feed(0.2, 0)
        check("re=0 hata veriyor", False, "istisna atilmadi")
    except ValueError:
        check("re=0 hata veriyor", True, "")


# ---------------------------------------------------------------- TEST 8
def test_end_to_end_scenarios():
    print("\n=== TEST 8: Uctan uca kullanici senaryolari ===")
    # SENARYO A: Kullanici 4140 secer, onerilen orta degerleri kullanir, freze hesaplar
    m = next(x for x in MATERIALS if x["code"] == "4140")
    rec = m["ops"]["freze"]["karbur"]
    vc_mid = (rec["vc"][0] + rec["vc"][1]) / 2      # 140
    fz_mid = (rec["fz"][0] + rec["fz"][1]) / 2      # 0.085
    r = calc_milling(vc_mid, 12, 4, fz_mid, 2, 6, m["kc"], 0.8, MACHINE_PRESETS["vmc_fast"])
    check("A) 4140 freze onerilen orta Vc = 140", near(vc_mid, 140, 0.01), f"Vc={vc_mid}")
    check("A) devir 3714 civari", near(r["n"], 3714, 2), f"n={r['n']:.0f}")
    check("A) ilerleme > 0 ve makul", 1000 < r["vf"] < 1400, f"Vf={r['vf']:.0f}")
    check("A) guc ve tork hesaplandi", r["power"] > 0 and r["torque"] > 0,
          f"P={r['power']:.2f} kW, M={r['torque']:.2f} Nm")
    check("A) Q hesaplandi", r["q"] > 0, f"Q={r['q']:.2f} cm3/dk")
    check("A) limit uygulanmadi (12000 > 3714)", not r["limits"]["rpm_clamped"], "")

    # SENARYO B: Inconel 718 torna, hedef Ra ile onerilen ilerleme
    inc = next(x for x in MATERIALS if x["code"] == "Inconel 718")
    rt = inc["ops"]["torna"]["karbur"]
    vc = (rt["vc"][0] + rt["vc"][1]) / 2
    r2 = calc_turning(vc, 60, 0.15, 1.0, 0.8, inc["kc"], 0.8, MACHINE_PRESETS["lathe_cnc"], target_ra=1.6)
    check("B) Inconel Vc dusuk (25-60)", 25 <= vc <= 60, f"Vc={vc}")
    check("B) devir hesaplandi", r2["n"] > 0, f"n={r2['n']:.0f}")
    check("B) Ra hesaplandi", r2["ra"] > 0, f"Ra={r2['ra']:.2f} um")
    check("B) hedef Ra icin f onerildi", r2["f_for_target_ra"] > 0, f"f={r2['f_for_target_ra']:.3f}")

    # SENARYO C: Aluminyum matkap + konvansiyonel matkap tezgahi limiti
    al = next(x for x in MATERIALS if x["code"] == "6082-T6")
    rd = al["ops"]["matkap"]["karbur"]
    vc = rd["vc"][1]  # 250
    r3 = calc_drilling(vc, 6, 0.2, 25, al["kc"], 0.8, MACHINE_PRESETS["drill_press"])
    check("C) matkap tezgahi limiti uygulandi", r3["limits"]["rpm_clamped"], f"n={r3['n']:.0f}")
    check("C) efektif Vc dustu", r3["vc_effective"] < vc, f"Vc_eff={r3['vc_effective']:.1f}")
    check("C) cevrim suresi hesaplandi", r3["cycle_s"] > 0, f"t={r3['cycle_s']:.2f} s")

    # SENARYO D: Kullanici kendi malzemesini ekler -> hesap calisir
    custom = {
        "id": "custom-1", "code": "MyAlloy", "name": "Ozel Alasim", "group": "celik",
        "subtitle": "Kullanici tanimli", "hardness": [30, 35], "hardnessScale": "HRC",
        "tensile": [900, 1000], "kc": 2200, "machinability": "orta", "accent": "primary",
        "desc": "Kullanici tanimli malzeme", "tags": ["Ozel"], "coolant": "Sogutma Sivisi",
        "custom": True,
        "ops": {
            "freze": {"karbur": {"vc": [100, 140], "fz": [0.05, 0.10]},
                      "hss": {"vc": [20, 35], "fz": [0.03, 0.06]}},
            "torna": {"karbur": {"vc": [140, 190], "f": [0.12, 0.28]},
                      "hss": {"vc": [25, 40], "f": [0.08, 0.18]}},
            "matkap": {"karbur": {"vc": [60, 90], "f": [0.10, 0.18]},
                       "hss": {"vc": [15, 25], "f": [0.07, 0.13]}},
        },
    }
    r4 = calc_milling(120, 10, 3, 0.07, 1.5, 5, custom["kc"], 0.8, None)
    check("D) ozel malzeme ile hesap calisiyor", r4["n"] > 0 and r4["vf"] > 0,
          f"n={r4['n']:.0f}, Vf={r4['vf']:.0f}")
    check("D) ozel malzeme sema uyumlu",
          set(custom["ops"].keys()) == {"freze", "torna", "matkap"}, "")

    # SENARYO E: Gecmis kaydi (snapshot) yeniden acilabiliyor mu
    record = {
        "id": "h1", "op": "freze", "materialId": m["id"], "materialCode": m["code"],
        "unit": "metric", "createdAt": "2026-01-01T14:32:00",
        "inputs": {"vc": 140, "d": 12, "z": 4, "fz": 0.08, "ap": 2, "ae": 6, "tool": "karbur"},
        "outputs": {"n": 3714, "vf": 1188},
    }
    replay = calc_milling(record["inputs"]["vc"], record["inputs"]["d"], record["inputs"]["z"],
                          record["inputs"]["fz"], record["inputs"]["ap"], record["inputs"]["ae"],
                          m["kc"])
    check("E) gecmis kaydi ayni sonucu veriyor",
          near(round(replay["n"]), record["outputs"]["n"], 1) and
          near(round(replay["vf"]), record["outputs"]["vf"], 2),
          f"n={replay['n']:.0f}, Vf={replay['vf']:.0f}")
    check("E) JSON serialize edilebilir", isinstance(json.dumps(record), str), "")


# ---------------------------------------------------------------- TEST 9
def test_formatting():
    print("\n=== TEST 9: Turkce sayi bicimlendirme (mockup formati) ===")
    def tr_int(v):
        return f"{int(round(v)):,}".replace(",", ".")

    def tr_dec(v, d=2):
        s = f"{v:.{d}f}"
        return s.replace(".", ",")

    check("3714 -> '3.714'", tr_int(3714) == "3.714", tr_int(3714))
    check("1188 -> '1.188'", tr_int(1188) == "1.188", tr_int(1188))
    check("9947 -> '9.947'", tr_int(9947) == "9.947", tr_int(9947))
    check("252 -> '252'", tr_int(252) == "252", tr_int(252))
    check("0.08 -> '0,08'", tr_dec(0.08) == "0,08", tr_dec(0.08))
    check("1.60 -> '1,60'", tr_dec(1.6) == "1,60", tr_dec(1.6))
    check("24000 -> '24.000'", tr_int(24000) == "24.000", tr_int(24000))


# ---------------------------------------------------------------- TEST 10
def test_export_seed():
    print("\n=== TEST 10: materials_seed.json uretimi (frontend icin) ===")
    payload = {
        "version": 1,
        "groups": GROUPS,
        "machinePresets": MACHINE_PRESETS,
        "materials": MATERIALS,
    }
    path = "/app/materials_seed.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    with open(path, encoding="utf-8") as fh:
        back = json.load(fh)
    check("seed dosyasi yazildi + geri okundu", len(back["materials"]) == 24, path)
    check("seed grup + preset icerir",
          len(back["groups"]) == 9 and len(back["machinePresets"]) == 7, "")
    size = len(json.dumps(payload, ensure_ascii=False))
    check("seed boyutu makul (<200KB)", size < 200_000, f"{size} bayt")


def main():
    print("=" * 78)
    print(" TALAS — CNC KESME PARAMETRELERI :: CEKIRDEK HESAP MOTORU POC")
    print("=" * 78)
    test_mockup_numbers()
    test_reverse_and_ra()
    test_mrr_power_torque()
    test_machine_limits()
    test_units()
    test_material_db()
    test_validation()
    test_end_to_end_scenarios()
    test_formatting()
    test_export_seed()

    print("\n" + "=" * 78)
    print(f" SONUC:  {PASS} basarili, {FAIL} basarisiz")
    if FAILURES:
        print(" BASARISIZ TESTLER:")
        for f in FAILURES:
            print("   - " + f)
    print("=" * 78)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
