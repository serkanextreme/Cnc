# -*- coding: utf-8 -*-
"""
Talas — malzeme katalogu ureticisi.

grades_source.py icindeki ISO tabanli kaynak veriden, her malzeme kalitesi icin
SERTLIGINE GORE DUZELTILMIS kesme verilerini hesaplayip
  /app/backend/materials.json
  /app/frontend/src/data/materials.json
dosyalarini uretir.

Kullanim:  python3 /app/backend/build_catalog.py
"""
import json
import re
import unicodedata
from pathlib import Path

from grades_source import FAMILIES, GRADES, ISO_GROUPS, SUBGROUPS

ROOT = Path(__file__).parent
LEGACY_PATH = ROOT / 'legacy_materials.json'
OUT_BACKEND = ROOT / 'materials.json'
OUT_FRONTEND = ROOT.parent / 'frontend' / 'src' / 'data' / 'materials.json'

# Eski (v1) 24 malzemenin id'leri korunur -> mevcut testler ve tasarim bozulmaz
ID_OVERRIDES = {
    "C45 / Ck45": "c45",
    "17-4 PH": "17-4ph",
    "GG25 / GJL-250": "gg25",
    "GGG40 / GJS-400": "ggg40",
}

MACHINABILITY = [
    {"id": "kolay", "label": "Kolay", "tone": "success"},
    {"id": "orta", "label": "Orta", "tone": "primary"},
    {"id": "zor", "label": "Zor", "tone": "accent"},
    {"id": "cok-zor", "label": "Çok zor", "tone": "destructive"},
]

MACHINE_PRESETS = {
    "vmc_std": {"label": "CNC Dik İşleme Merkezi", "note": "Standart · 8.000 dev/dk", "maxRpm": 8000, "maxFeed": 10000, "powerKw": 7.5, "ops": ["freze", "matkap", "dis"]},
    "vmc_fast": {"label": "CNC Dik İşleme Merkezi (Hızlı)", "note": "12.000 dev/dk", "maxRpm": 12000, "maxFeed": 15000, "powerKw": 11.0, "ops": ["freze", "matkap", "dis"]},
    "vmc_hsm": {"label": "HSM / Yüksek Devir Merkezi", "note": "24.000 dev/dk", "maxRpm": 24000, "maxFeed": 20000, "powerKw": 15.0, "ops": ["freze", "matkap", "dis"]},
    "mill_conv": {"label": "Konvansiyonel Freze", "note": "Üniversal · 2.000 dev/dk", "maxRpm": 2000, "maxFeed": 1500, "powerKw": 4.0, "ops": ["freze", "matkap", "dis"]},
    "lathe_cnc": {"label": "CNC Torna", "note": "4.000 dev/dk", "maxRpm": 4000, "maxFeed": 8000, "powerKw": 11.0, "ops": ["torna", "dis"]},
    "lathe_conv": {"label": "Üniversal Torna", "note": "Konvansiyonel · 2.000 dev/dk", "maxRpm": 2000, "maxFeed": 2000, "powerKw": 5.5, "ops": ["torna", "dis"]},
    "drill_press": {"label": "Matkap Tezgâhı", "note": "3.000 dev/dk", "maxRpm": 3000, "maxFeed": 1200, "powerKw": 2.2, "ops": ["matkap", "dis"]},
}

AUTO_PRESET = {"freze": "vmc_fast", "torna": "lathe_cnc", "matkap": "vmc_std", "dis": "vmc_std"}

INSERT_TYPES = [
    {"id": "karbur", "label": "Karbür uç", "note": "Kaplamalı karbür · genel amaçlı"},
    {"id": "hss", "label": "HSS kalem", "note": "Hız çeliği · düşük Vc"},
]

COOLANT_OPTIONS = [
    {"id": "sivi", "label": "Soğutma Sıvısı", "lifeFactor": 1.0},
    {"id": "yuksek-basinc", "label": "Yüksek Basınçlı Soğutma", "lifeFactor": 1.15},
    {"id": "mist", "label": "Hava / Mist", "lifeFactor": 0.9},
    {"id": "kuru", "label": "Kuru İşleme", "lifeFactor": 0.7},
]

# ASTM E140 yaklasik HRC -> HB donusumu
HRC_TO_HB = [
    (20, 226), (22, 237), (24, 248), (26, 260), (28, 271), (30, 286), (32, 301),
    (34, 317), (36, 333), (38, 352), (40, 371), (42, 390), (44, 409), (46, 432),
    (48, 455), (50, 481), (52, 509), (54, 535), (56, 565), (58, 595), (60, 627),
    (62, 659), (64, 695), (66, 731), (68, 770),
]

FAMILY_COOLANT = {
    "aluminyum": "mist",
    "hafif-metal": "mist",
    "dokme-demir": "kuru",
    "plastik": "kuru",
    "kompozit": "kuru",
    "titanyum": "yuksek-basinc",
    "nikel": "yuksek-basinc",
    "kobalt-refrakter": "yuksek-basinc",
    "sert-celik": "yuksek-basinc",
    "takim-celigi": "yuksek-basinc",
    "paslanmaz": "sivi",
    "celik": "sivi",
    "pirinc-bronz": "sivi",
}

ISO_ACCENT = {"P": "chart3", "M": "chart2", "K": "chart4", "N": "success", "S": "chart5", "H": "destructive"}


def hrc_to_hb(hrc: float) -> float:
    if hrc <= HRC_TO_HB[0][0]:
        return HRC_TO_HB[0][1]
    if hrc >= HRC_TO_HB[-1][0]:
        return HRC_TO_HB[-1][1]
    for i in range(len(HRC_TO_HB) - 1):
        a, b = HRC_TO_HB[i], HRC_TO_HB[i + 1]
        if a[0] <= hrc <= b[0]:
            t = (hrc - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    return HRC_TO_HB[-1][1]


def to_hb(value: float, scale: str) -> float:
    return hrc_to_hb(value) if scale == "HRC" else value


def slug(text: str) -> str:
    t = text.lower()
    repl = {"ı": "i", "İ": "i", "ş": "s", "ğ": "g", "ü": "u", "ö": "o", "ç": "c", "â": "a"}
    for k, v in repl.items():
        t = t.replace(k, v)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return re.sub(r"-{2,}", "-", t)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def r3(v):
    return round(v, 3)


def scale_range(rng, factor, decimals=0, minimum=1):
    lo = rng[0] * factor
    hi = rng[1] * factor
    if decimals == 0:
        lo = max(minimum, round(lo))
        hi = max(lo + 1, round(hi))
        return [int(lo), int(hi)]
    lo = max(0.005, round(lo, decimals))
    hi = max(lo + 0.005, round(hi, decimals))
    return [lo, hi]


def build_material(row):
    code, name, sub_id, standards, h_min, h_max, scale, t_min, t_max = row[:9]
    extra = row[9] if len(row) > 9 else {}
    sub = SUBGROUPS[sub_id]

    mid_hardness = (h_min + h_max) / 2.0
    hb = to_hb(mid_hardness, scale)
    ref_hb = float(sub["refHB"])

    vc_factor = clamp((ref_hb / hb) ** 0.6, 0.35, 1.9)
    feed_factor = clamp((ref_hb / hb) ** 0.25, 0.55, 1.45)
    kc = int(round(sub["kc"] * (hb / ref_hb) ** 0.35))

    ops = {}
    hss_not_recommended = False
    for op in ("freze", "torna", "matkap"):
        k_vc, k_feed, h_vc, h_feed = sub[op]
        feed_key = "fz" if op == "freze" else "f"
        karbur = {
            "vc": scale_range(k_vc, vc_factor, 0, 5),
            feed_key: scale_range(k_feed, feed_factor, 3),
        }
        if h_vc[1] <= 0:
            hss_not_recommended = True
            hss = {
                "vc": scale_range((max(4, k_vc[0] * 0.18), max(6, k_vc[1] * 0.18)), vc_factor, 0, 3),
                feed_key: scale_range((k_feed[0] * 0.6, k_feed[1] * 0.6), feed_factor, 3),
            }
        else:
            hss = {
                "vc": scale_range(h_vc, vc_factor, 0, 3),
                feed_key: scale_range(h_feed, feed_factor, 3),
            }
        # HSS her zaman karburden yavas olmali
        if hss["vc"][1] >= karbur["vc"][1]:
            hss["vc"] = [max(3, int(karbur["vc"][0] * 0.35)), max(4, int(karbur["vc"][1] * 0.4))]
        ops[op] = {"karbur": karbur, "hss": hss}

    mach = extra.get("machinability", sub["mach"])
    family = sub["family"]
    mach_label = next(m["label"] for m in MACHINABILITY if m["id"] == mach)

    return {
        "id": ID_OVERRIDES.get(code, slug(code)),
        "code": code,
        "name": name,
        "group": family,
        "isoGroup": sub["iso"],
        "subgroup": sub_id,
        "subgroupLabel": sub["label"],
        "subtitle": " · ".join(standards[:3]),
        "standards": standards,
        "hardness": [h_min, h_max],
        "hardnessScale": scale,
        "baseHB": int(round(hb)),
        "refHB": int(ref_hb),
        "tensile": [t_min, t_max],
        "kc": kc,
        "machinability": mach,
        "accent": ISO_ACCENT.get(sub["iso"], "primary"),
        "coolant": extra.get("coolant", FAMILY_COOLANT.get(family, "sivi")),
        "desc": extra.get("desc", f"{sub['label']} — {name}"),
        "tags": extra.get("tags", [sub["label"], f"ISO {sub['iso']}", f"{mach_label} işlenebilirlik"]),
        "hssNotRecommended": hss_not_recommended,
        "ops": ops,
        "derived": True,
    }


def main():
    legacy = {}
    if LEGACY_PATH.exists():
        with open(LEGACY_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        legacy = {m["id"]: m for m in data.get("materials", [])}

    materials = []
    seen = set()
    for row in GRADES:
        mat = build_material(row)
        if mat["id"] in seen:
            raise SystemExit(f"Tekrarlanan id: {mat['id']} ({mat['code']})")
        seen.add(mat["id"])

        old = legacy.get(mat["id"])
        if old:
            # v1'de elle girilmis degerleri KORU (tasarim + POC testleri bunlara dayali)
            mat["ops"] = old["ops"]
            mat["kc"] = old["kc"]
            mat["hardness"] = old["hardness"]
            mat["hardnessScale"] = old["hardnessScale"]
            mat["tensile"] = old["tensile"]
            mat["desc"] = old.get("desc", mat["desc"])
            mat["tags"] = old.get("tags", mat["tags"])
            mat["coolant"] = old.get("coolant", mat["coolant"])
            mat["machinability"] = old.get("machinability", mat["machinability"])
            mat["baseHB"] = int(round(to_hb(sum(mat["hardness"]) / 2.0, mat["hardnessScale"])))
            mat["verified"] = True
            mat["derived"] = False
        materials.append(mat)

    payload = {
        "version": 2,
        "generated": "build_catalog.py",
        "groups": FAMILIES,
        "isoGroups": ISO_GROUPS,
        "subgroups": [
            {"id": k, "label": v["label"], "iso": v["iso"], "family": v["family"], "refHB": v["refHB"]}
            for k, v in SUBGROUPS.items()
        ],
        "machinability": MACHINABILITY,
        "machinePresets": MACHINE_PRESETS,
        "autoPreset": AUTO_PRESET,
        "insertTypes": INSERT_TYPES,
        "coolantOptions": COOLANT_OPTIONS,
        "materials": materials,
    }

    for path in (OUT_BACKEND, OUT_FRONTEND):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=1)

    families = {}
    for m in materials:
        families[m["group"]] = families.get(m["group"], 0) + 1
    isos = {}
    for m in materials:
        isos[m["isoGroup"]] = isos.get(m["isoGroup"], 0) + 1

    print(f"{len(materials)} malzeme uretildi")
    print("ISO gruplari:", isos)
    print("Aileler:", families)
    print("Korunan v1 malzeme:", sum(1 for m in materials if m.get("verified")))


if __name__ == "__main__":
    main()
