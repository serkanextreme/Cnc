"""
Backend API Testing for Talaş Phase 3
Tests all API endpoints including threading, tool life, and material catalog
"""
import requests
import sys

BASE_URL = "https://metal-cutting-app-1.preview.emergentagent.com/api"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.failures = []
    
    def test(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"  ✅ {name}")
            if detail:
                print(f"     {detail}")
        else:
            self.failed += 1
            self.failures.append(f"{name}: {detail}")
            print(f"  ❌ {name}")
            if detail:
                print(f"     {detail}")
    
    def summary(self):
        print(f"\n{'='*70}")
        print(f"RESULTS: {self.passed} passed, {self.failed} failed")
        if self.failures:
            print(f"\nFAILURES:")
            for f in self.failures:
                print(f"  - {f}")
        print(f"{'='*70}")
        return 0 if self.failed == 0 else 1

runner = TestRunner()

# ============================================================================
# TEST 1: Health & Catalog
# ============================================================================
print("\n=== TEST 1: Health & Catalog ===")
try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    runner.test("GET /api/health returns 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        data = r.json()
        runner.test("Health check has 247 materials", data.get("materials") == 247, f"materials={data.get('materials')}")
        runner.test("Mongo connection OK", data.get("mongo") == True, f"mongo={data.get('mongo')}")
except Exception as e:
    runner.test("GET /api/health", False, str(e))

try:
    r = requests.get(f"{BASE_URL}/catalog", timeout=10)
    runner.test("GET /api/catalog returns 200", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        runner.test("Catalog has materials array", "materials" in data and len(data["materials"]) >= 240, f"count={len(data.get('materials', []))}")
        runner.test("Catalog has 6 ISO groups", len(data.get("isoGroups", [])) == 6, f"count={len(data.get('isoGroups', []))}")
        runner.test("Catalog has 13 groups", len(data.get("groups", [])) == 13, f"count={len(data.get('groups', []))}")
except Exception as e:
    runner.test("GET /api/catalog", False, str(e))

# ============================================================================
# TEST 2: Material Search & Standards
# ============================================================================
print("\n=== TEST 2: Material Search & Standards ===")
search_tests = [
    ("1.7225", "4140"),
    ("42crmo4", "4140"),
    ("X5CrNi18-10", "304"),
    ("1.4404", "316L"),
    ("UNS N07718", "Inconel 718"),
    ("SCM440", "42CrMo4"),
    ("1.2379", "D2"),
]

for query, expected in search_tests:
    try:
        r = requests.get(f"{BASE_URL}/materials", params={"q": query}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            items = data.get("items", [])
            found = any(expected.lower() in item.get("code", "").lower() or 
                       expected.lower() in item.get("name", "").lower() for item in items)
            runner.test(f"Search '{query}' finds {expected}", found and len(items) >= 1, 
                       f"results={len(items)}, found={found}")
        else:
            runner.test(f"Search '{query}'", False, f"status={r.status_code}")
    except Exception as e:
        runner.test(f"Search '{query}'", False, str(e))

# ============================================================================
# TEST 3: Material Detail
# ============================================================================
print("\n=== TEST 3: Material Detail ===")
try:
    r = requests.get(f"{BASE_URL}/materials/42crmo4", timeout=10)
    runner.test("GET /api/materials/42crmo4 returns 200", r.status_code == 200)
    if r.status_code == 200:
        mat = r.json()
        runner.test("42CrMo4 has ISO group", "isoGroup" in mat and mat["isoGroup"] == "P", f"iso={mat.get('isoGroup')}")
        runner.test("42CrMo4 has standards", "standards" in mat and len(mat["standards"]) > 0, 
                   f"standards={mat.get('standards', [])[:3]}")
        runner.test("42CrMo4 has baseHB", "baseHB" in mat and mat["baseHB"] > 0, f"baseHB={mat.get('baseHB')}")
        runner.test("42CrMo4 has kc", mat.get("kc", 0) > 0, f"kc={mat.get('kc')}")
except Exception as e:
    runner.test("GET /api/materials/42crmo4", False, str(e))

# ============================================================================
# TEST 4: Thread Tables
# ============================================================================
print("\n=== TEST 4: Thread Tables ===")
try:
    r = requests.get(f"{BASE_URL}/threads", timeout=10)
    runner.test("GET /api/threads returns 200", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        runner.test("Thread tables have >=100 entries", len(data.get("threads", [])) >= 100, 
                   f"count={len(data.get('threads', []))}")
        runner.test("Thread tables have 6 series", len(data.get("series", [])) == 6, 
                   f"series={len(data.get('series', []))}")
        runner.test("Thread tables have tap types", len(data.get("tapTypes", [])) >= 2)
        runner.test("Thread tables have engagement options", len(data.get("engagementOptions", [])) >= 3)
except Exception as e:
    runner.test("GET /api/threads", False, str(e))

try:
    r = requests.get(f"{BASE_URL}/threads", params={"series": "unc"}, timeout=10)
    runner.test("GET /api/threads?series=unc returns 200", r.status_code == 200)
    if r.status_code == 200:
        data = r.json()
        runner.test("UNC series has 18 threads", len(data.get("threads", [])) == 18, 
                   f"count={len(data.get('threads', []))}")
except Exception as e:
    runner.test("GET /api/threads?series=unc", False, str(e))

# ============================================================================
# TEST 5: Tapping Calculation
# ============================================================================
print("\n=== TEST 5: Tapping (Kılavuz) Calculation ===")
payload = {
    "vc": 25,
    "d": 10,
    "pitch": 1.5,
    "depth": 20,
    "kc": 2100,
    "tensile": 900,
    "tapType": "kesici",
    "engagement": 75
}
try:
    r = requests.post(f"{BASE_URL}/calc/kilavuz", json=payload, timeout=10)
    runner.test("POST /api/calc/kilavuz returns 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        res = r.json()
        runner.test("Tapping n ≈ 796", 794 <= res.get("n", 0) <= 798, f"n={res.get('n'):.1f}")
        runner.test("Tapping vf ≈ 1194", 1190 <= res.get("vf", 0) <= 1198, f"vf={res.get('vf'):.1f}")
        runner.test("Tapping torque ≈ 3.94 Nm", 3.88 <= res.get("torque", 0) <= 4.0, f"torque={res.get('torque'):.2f}")
        runner.test("Tapping tapDrill ≈ 8.54 mm", 8.52 <= res.get("tapDrill", 0) <= 8.56, 
                   f"tapDrill={res.get('tapDrill'):.2f}")
        runner.test("Tapping minorDiameter present", "minorDiameter" in res, f"minor={res.get('minorDiameter'):.2f}")
        runner.test("Tapping cycleSeconds ≈ 2.0 s", 1.9 <= res.get("cycleSeconds", 0) <= 2.1, 
                   f"cycle={res.get('cycleSeconds'):.2f}")
except Exception as e:
    runner.test("POST /api/calc/kilavuz", False, str(e))

# Test forming tap (higher torque)
payload_form = payload.copy()
payload_form["tapType"] = "yuvarlak"
try:
    r = requests.post(f"{BASE_URL}/calc/kilavuz", json=payload_form, timeout=10)
    if r.status_code == 200:
        res_form = r.json()
        res_cut = requests.post(f"{BASE_URL}/calc/kilavuz", json=payload, timeout=10).json()
        runner.test("Forming tap torque > cutting tap", res_form.get("torque", 0) > res_cut.get("torque", 0) * 1.5,
                   f"form={res_form.get('torque'):.2f} vs cut={res_cut.get('torque'):.2f}")
except Exception as e:
    runner.test("Forming tap torque test", False, str(e))

# ============================================================================
# TEST 6: Thread Milling Calculation
# ============================================================================
print("\n=== TEST 6: Thread Milling (Diş Frezesi) Calculation ===")
payload = {
    "vc": 120,
    "toolD": 10,
    "threadD": 20,
    "pitch": 2.5,
    "z": 3,
    "fz": 0.05,
    "threadLength": 20,
    "kc": 2100,
    "internal": True
}
try:
    r = requests.post(f"{BASE_URL}/calc/dis-frezesi", json=payload, timeout=10)
    runner.test("POST /api/calc/dis-frezesi returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Thread milling n ≈ 3820", 3815 <= res.get("n", 0) <= 3825, f"n={res.get('n'):.1f}")
        runner.test("Thread milling compensation = 0.5", abs(res.get("compensation", 0) - 0.5) < 0.001, 
                   f"comp={res.get('compensation'):.3f}")
        runner.test("Thread milling vf < vfPeriphery", res.get("vf", 0) < res.get("vfPeriphery", 0),
                   f"vf={res.get('vf'):.1f} < vfPeriph={res.get('vfPeriphery'):.1f}")
        runner.test("Thread milling revolutions = 8", abs(res.get("revolutions", 0) - 8) < 0.1, 
                   f"revs={res.get('revolutions')}")
        runner.test("Thread milling threadDepth present", "threadDepth" in res, 
                   f"depth={res.get('threadDepth'):.3f}")
except Exception as e:
    runner.test("POST /api/calc/dis-frezesi", False, str(e))

# Test external thread (compensation > 1)
payload_ext = payload.copy()
payload_ext["internal"] = False
try:
    r = requests.post(f"{BASE_URL}/calc/dis-frezesi", json=payload_ext, timeout=10)
    if r.status_code == 200:
        res = r.json()
        runner.test("External thread compensation > 1", res.get("compensation", 0) > 1, 
                   f"comp={res.get('compensation'):.2f}")
except Exception as e:
    runner.test("External thread compensation", False, str(e))

# Test error: toolD > threadD for internal
payload_err = payload.copy()
payload_err["toolD"] = 25
try:
    r = requests.post(f"{BASE_URL}/calc/dis-frezesi", json=payload_err, timeout=10)
    runner.test("Thread milling error when toolD > threadD", r.status_code in [400, 422], 
               f"status={r.status_code}")
except Exception as e:
    runner.test("Thread milling error handling", False, str(e))

# ============================================================================
# TEST 7: Thread Turning Calculation
# ============================================================================
print("\n=== TEST 7: Thread Turning (Tornada Diş) Calculation ===")
payload = {
    "vc": 100,
    "d": 20,
    "pitch": 2.5,
    "length": 30,
    "kc": 2100,
    "machinability": "orta"
}
try:
    r = requests.post(f"{BASE_URL}/calc/dis-torna", json=payload, timeout=10)
    runner.test("POST /api/calc/dis-torna returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Thread turning n ≈ 1592", 1590 <= res.get("n", 0) <= 1595, f"n={res.get('n'):.1f}")
        runner.test("Thread turning passCount = 10", res.get("passCount") == 10, 
                   f"passes={res.get('passCount')}")
        runner.test("Thread turning totalDepth ≈ 1.53 mm", 1.52 <= res.get("totalDepth", 0) <= 1.54, 
                   f"depth={res.get('totalDepth'):.3f}")
        runner.test("Thread turning schedule has 10 passes", len(res.get("schedule", [])) == 10, 
                   f"schedule_len={len(res.get('schedule', []))}")
        if len(res.get("schedule", [])) > 0:
            first = res["schedule"][0]["depth"]
            last = res["schedule"][-1]["depth"]
            runner.test("Thread turning first pass > last pass (degressive)", first > last, 
                       f"first={first:.3f} > last={last:.3f}")
except Exception as e:
    runner.test("POST /api/calc/dis-torna", False, str(e))

# ============================================================================
# TEST 8: Tool Life Calculation
# ============================================================================
print("\n=== TEST 8: Tool Life (Taylor) Calculation ===")
payload = {
    "vc": 280,
    "vcRef": 140,
    "tool": "karbur",
    "refLife": 15,
    "coolant": "sivi",
    "toolPrice": 1200,
    "edges": 4,
    "partMinutes": 2,
    "hourlyRate": 600,
    "targetLife": 30
}
try:
    r = requests.post(f"{BASE_URL}/tool-life", json=payload, timeout=10)
    runner.test("POST /api/tool-life returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Tool life at 2×Vc ≈ 0.94 min", 0.9 <= res.get("lifeMinutes", 0) <= 1.0, 
                   f"life={res.get('lifeMinutes'):.2f}")
        runner.test("Tool life status = kritik", res.get("status") == "kritik", 
                   f"status={res.get('status')}")
        runner.test("Tool life cost present", "cost" in res and res["cost"].get("totalPerPart", 0) > 0,
                   f"total={res.get('cost', {}).get('totalPerPart'):.2f}")
        runner.test("Tool life vcForTargetLife ≈ 118", 115 <= res.get("vcForTargetLife", 0) <= 120, 
                   f"vcTarget={res.get('vcForTargetLife'):.1f}")
except Exception as e:
    runner.test("POST /api/tool-life", False, str(e))

# Test at reference Vc (should give refLife)
payload_ref = {
    "vc": 140,
    "vcRef": 140,
    "tool": "karbur",
    "refLife": 15,
    "coolant": "sivi",
    "toolPrice": 1200,
    "edges": 4,
    "partMinutes": 2,
    "hourlyRate": 600
}
try:
    r = requests.post(f"{BASE_URL}/tool-life", json=payload_ref, timeout=10)
    if r.status_code == 200:
        res = r.json()
        runner.test("Tool life at Vc=VcRef = 15 min", abs(res.get("lifeMinutes", 0) - 15) < 0.1, 
                   f"life={res.get('lifeMinutes'):.2f}")
        runner.test("Tool life status = iyi", res.get("status") == "iyi", f"status={res.get('status')}")
except Exception as e:
    runner.test("Tool life at reference Vc", False, str(e))

# ============================================================================
# TEST 9: Regression - Existing Calculations
# ============================================================================
print("\n=== TEST 9: Regression - Existing Calculations ===")

# Freze
payload_freze = {
    "vc": 140,
    "d": 12,
    "z": 4,
    "fz": 0.08,
    "ap": 2,
    "ae": 6,
    "kc": 2100,
    "eta": 0.8
}
try:
    r = requests.post(f"{BASE_URL}/calc/freze", json=payload_freze, timeout=10)
    runner.test("POST /api/calc/freze returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Freze n ≈ 3714", 3710 <= res.get("n", 0) <= 3720, f"n={res.get('n'):.1f}")
        runner.test("Freze vf ≈ 1188", 1185 <= res.get("vf", 0) <= 1192, f"vf={res.get('vf'):.1f}")
except Exception as e:
    runner.test("POST /api/calc/freze", False, str(e))

# Torna
payload_torna = {
    "vc": 180,
    "d": 50,
    "f": 0.22,
    "ap": 2,
    "noseR": 0.8,
    "kc": 2100,
    "eta": 0.8
}
try:
    r = requests.post(f"{BASE_URL}/calc/torna", json=payload_torna, timeout=10)
    runner.test("POST /api/calc/torna returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Torna n ≈ 1146", 1144 <= res.get("n", 0) <= 1148, f"n={res.get('n'):.1f}")
        runner.test("Torna vf ≈ 252", 250 <= res.get("vf", 0) <= 254, f"vf={res.get('vf'):.1f}")
        runner.test("Torna Ra ≈ 1.89 µm", 1.87 <= res.get("ra", 0) <= 1.91, f"Ra={res.get('ra'):.2f}")
except Exception as e:
    runner.test("POST /api/calc/torna", False, str(e))

# Matkap
payload_matkap = {
    "vc": 80,
    "d": 10,
    "f": 0.16,
    "depth": 30,
    "kc": 2100,
    "eta": 0.8
}
try:
    r = requests.post(f"{BASE_URL}/calc/matkap", json=payload_matkap, timeout=10)
    runner.test("POST /api/calc/matkap returns 200", r.status_code == 200)
    if r.status_code == 200:
        res = r.json()
        runner.test("Matkap n ≈ 2546", 2544 <= res.get("n", 0) <= 2548, f"n={res.get('n'):.1f}")
        runner.test("Matkap vf ≈ 407", 405 <= res.get("vf", 0) <= 409, f"vf={res.get('vf'):.1f}")
        runner.test("Matkap cycleSeconds ≈ 4.4 s", 4.3 <= res.get("cycleSeconds", 0) <= 4.5, 
                   f"cycle={res.get('cycleSeconds'):.2f}")
except Exception as e:
    runner.test("POST /api/calc/matkap", False, str(e))

# ============================================================================
# Summary
# ============================================================================
sys.exit(runner.summary())
