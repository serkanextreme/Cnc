"""
Talaş CNC App — Backend API Testing
Tests all backend endpoints for the CNC machining calculator app.
"""
import requests
import sys
import json

BASE_URL = "https://metal-cutting-app-1.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []

    def test(self, name, condition, detail=""):
        self.tests_run += 1
        if condition:
            self.tests_passed += 1
            print(f"  ✅ {name}")
            if detail:
                print(f"     {detail}")
        else:
            self.failures.append(f"{name}: {detail}")
            print(f"  ❌ {name}")
            if detail:
                print(f"     {detail}")
        return condition

    def near(self, a, b, tol=1):
        return abs(a - b) <= tol

    def run_all(self):
        print("\n" + "="*70)
        print("TALAŞ CNC APP — BACKEND API TESTS")
        print("="*70)
        
        self.test_health()
        self.test_catalog()
        self.test_materials_list()
        self.test_materials_filters()
        self.test_material_detail()
        self.test_machine_presets()
        self.test_calc_freze()
        self.test_calc_torna()
        self.test_calc_matkap()
        self.test_calc_limits()
        self.test_calc_validation()
        
        print("\n" + "="*70)
        print(f"RESULTS: {self.tests_passed}/{self.tests_run} passed")
        if self.failures:
            print("\nFAILURES:")
            for f in self.failures:
                print(f"  - {f}")
        print("="*70)
        return 0 if len(self.failures) == 0 else 1

    def test_health(self):
        print("\n[TEST] Health Check")
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=5)
            self.test("Health endpoint returns 200", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Health status is 'ok'", data.get('status') == 'ok')
                self.test("24 materials available", data.get('materials') == 24)
                self.test("MongoDB connected", data.get('mongo') == True)
        except Exception as e:
            self.test("Health endpoint accessible", False, str(e))

    def test_catalog(self):
        print("\n[TEST] Catalog")
        try:
            r = requests.get(f"{BASE_URL}/catalog", timeout=5)
            self.test("Catalog endpoint returns 200", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Catalog has materials", 'materials' in data and len(data['materials']) == 24)
                self.test("Catalog has groups", 'groups' in data and len(data['groups']) == 9)
                self.test("Catalog has machine presets", 'machinePresets' in data and len(data['machinePresets']) == 7)
        except Exception as e:
            self.test("Catalog endpoint accessible", False, str(e))

    def test_materials_list(self):
        print("\n[TEST] Materials List")
        try:
            r = requests.get(f"{BASE_URL}/materials", timeout=5)
            self.test("Materials list returns 200", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Returns 24 materials", data.get('count') == 24)
                items = data.get('items', [])
                if items:
                    m = items[0]
                    self.test("Material has required fields", 
                             all(k in m for k in ['id', 'code', 'name', 'group', 'ops', 'kc']))
        except Exception as e:
            self.test("Materials list accessible", False, str(e))

    def test_materials_filters(self):
        print("\n[TEST] Materials Filters")
        try:
            # Search filter
            r = requests.get(f"{BASE_URL}/materials?q=316", timeout=5)
            self.test("Search filter works", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Search '316' finds 316L", 
                         any('316' in m['code'] for m in data.get('items', [])))
            
            # Group filter
            r = requests.get(f"{BASE_URL}/materials?group=aluminyum", timeout=5)
            self.test("Group filter works", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Group filter returns 3 aluminum materials", data.get('count') == 3)
            
            # Machinability filter
            r = requests.get(f"{BASE_URL}/materials?machinability=cok-zor", timeout=5)
            self.test("Machinability filter works", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Machinability filter returns materials", data.get('count') > 0)
        except Exception as e:
            self.test("Materials filters accessible", False, str(e))

    def test_material_detail(self):
        print("\n[TEST] Material Detail")
        try:
            # Valid material
            r = requests.get(f"{BASE_URL}/materials/4140", timeout=5)
            self.test("Material detail returns 200", r.status_code == 200)
            if r.status_code == 200:
                m = r.json()
                self.test("4140 has correct code", m.get('code') == '4140')
                self.test("4140 has operations", 'ops' in m and 'freze' in m['ops'])
                self.test("4140 freze has carbide ranges", 
                         m.get('ops', {}).get('freze', {}).get('karbur', {}).get('vc') == [120, 160])
            
            # Invalid material
            r = requests.get(f"{BASE_URL}/materials/nonexistent", timeout=5)
            self.test("Invalid material returns 404", r.status_code == 404)
        except Exception as e:
            self.test("Material detail accessible", False, str(e))

    def test_machine_presets(self):
        print("\n[TEST] Machine Presets")
        try:
            r = requests.get(f"{BASE_URL}/machine-presets", timeout=5)
            self.test("Machine presets returns 200", r.status_code == 200)
            if r.status_code == 200:
                data = r.json()
                self.test("Has presets", 'presets' in data)
                self.test("Has auto preset mapping", 'auto' in data)
                presets = data.get('presets', {})
                self.test("Has 7 presets", len(presets) == 7)
                if 'vmc_std' in presets:
                    p = presets['vmc_std']
                    self.test("VMC standard has correct limits", 
                             p.get('maxRpm') == 8000 and p.get('maxFeed') == 10000)
        except Exception as e:
            self.test("Machine presets accessible", False, str(e))

    def test_calc_freze(self):
        print("\n[TEST] Freze Calculation")
        try:
            # Mockup values: Vc=140, D=12, z=4, fz=0.08, ap=2, ae=6
            payload = {
                "vc": 140, "d": 12, "z": 4, "fz": 0.08,
                "ap": 2, "ae": 6, "kc": 2100, "eta": 0.8
            }
            r = requests.post(f"{BASE_URL}/calc/freze", json=payload, timeout=5)
            self.test("Freze calc returns 200", r.status_code == 200)
            if r.status_code == 200:
                res = r.json()
                self.test("Freze n ≈ 3714", self.near(res.get('n', 0), 3714, 2), 
                         f"n={res.get('n'):.1f}")
                self.test("Freze vf ≈ 1188", self.near(res.get('vf', 0), 1188, 2),
                         f"vf={res.get('vf'):.1f}")
                self.test("Freze vcEffective ≈ 140", self.near(res.get('vcEffective', 0), 140, 1),
                         f"vcEffective={res.get('vcEffective'):.1f}")
                self.test("Freze q ≈ 14.26", self.near(res.get('q', 0), 14.26, 0.1),
                         f"q={res.get('q'):.2f}")
                self.test("Freze power ≈ 0.62", self.near(res.get('power', 0), 0.62, 0.02),
                         f"power={res.get('power'):.2f}")
                self.test("Freze torque ≈ 1.60", self.near(res.get('torque', 0), 1.60, 0.05),
                         f"torque={res.get('torque'):.2f}")
                self.test("Freze hm ≈ 0.08", self.near(res.get('hm', 0), 0.08, 0.01),
                         f"hm={res.get('hm'):.3f}")
        except Exception as e:
            self.test("Freze calc accessible", False, str(e))

    def test_calc_torna(self):
        print("\n[TEST] Torna Calculation")
        try:
            # Mockup values: Vc=180, D=50, f=0.22, ap=1.5, noseR=0.8, targetRa=1.6
            payload = {
                "vc": 180, "d": 50, "f": 0.22, "ap": 1.5,
                "noseR": 0.8, "kc": 2100, "eta": 0.8, "targetRa": 1.6
            }
            r = requests.post(f"{BASE_URL}/calc/torna", json=payload, timeout=5)
            self.test("Torna calc returns 200", r.status_code == 200)
            if r.status_code == 200:
                res = r.json()
                self.test("Torna n ≈ 1146", self.near(res.get('n', 0), 1146, 2),
                         f"n={res.get('n'):.1f}")
                self.test("Torna vf ≈ 252", self.near(res.get('vf', 0), 252, 2),
                         f"vf={res.get('vf'):.1f}")
                self.test("Torna ra ≈ 1.89", self.near(res.get('ra', 0), 1.89, 0.05),
                         f"ra={res.get('ra'):.2f}")
                self.test("Torna feedForTargetRa ≈ 0.202", 
                         self.near(res.get('feedForTargetRa', 0), 0.202, 0.005),
                         f"feedForTargetRa={res.get('feedForTargetRa'):.3f}")
                self.test("Torna q ≈ 59.4", self.near(res.get('q', 0), 59.4, 0.5),
                         f"q={res.get('q'):.2f}")
                self.test("Torna power ≈ 2.60", self.near(res.get('power', 0), 2.60, 0.05),
                         f"power={res.get('power'):.2f}")
        except Exception as e:
            self.test("Torna calc accessible", False, str(e))

    def test_calc_matkap(self):
        print("\n[TEST] Matkap Calculation")
        try:
            # Mockup values: Vc=80, D=10, f=0.16, depth=30
            payload = {
                "vc": 80, "d": 10, "f": 0.16, "depth": 30,
                "kc": 2100, "eta": 0.8, "peck": 0
            }
            r = requests.post(f"{BASE_URL}/calc/matkap", json=payload, timeout=5)
            self.test("Matkap calc returns 200", r.status_code == 200)
            if r.status_code == 200:
                res = r.json()
                self.test("Matkap n ≈ 2546", self.near(res.get('n', 0), 2546, 2),
                         f"n={res.get('n'):.1f}")
                self.test("Matkap vf ≈ 407", self.near(res.get('vf', 0), 407, 2),
                         f"vf={res.get('vf'):.1f}")
                self.test("Matkap cycleSeconds ≈ 4.4", 
                         self.near(res.get('cycleSeconds', 0), 4.4, 0.2),
                         f"cycleSeconds={res.get('cycleSeconds'):.1f}")
                self.test("Matkap q ≈ 32.0", self.near(res.get('q', 0), 32.0, 0.5),
                         f"q={res.get('q'):.2f}")
        except Exception as e:
            self.test("Matkap calc accessible", False, str(e))

    def test_calc_limits(self):
        print("\n[TEST] Machine Limits (Clamp)")
        try:
            # Same freze calc but with 2000 RPM limit
            payload = {
                "vc": 140, "d": 12, "z": 4, "fz": 0.08,
                "ap": 2, "ae": 6, "kc": 2100, "eta": 0.8,
                "limits": {"maxRpm": 2000}
            }
            r = requests.post(f"{BASE_URL}/calc/freze", json=payload, timeout=5)
            self.test("Freze with limits returns 200", r.status_code == 200)
            if r.status_code == 200:
                res = r.json()
                self.test("RPM clamped to 2000", res.get('n') == 2000,
                         f"n={res.get('n')}")
                self.test("rpmClamped flag is true", 
                         res.get('limits', {}).get('rpmClamped') == True)
                self.test("vcEffective reduced", res.get('vcEffective', 0) < 80,
                         f"vcEffective={res.get('vcEffective'):.1f}")
                self.test("Feed scaled proportionally", 
                         self.near(res.get('vf', 0), 640, 5),
                         f"vf={res.get('vf'):.1f}")
        except Exception as e:
            self.test("Calc with limits accessible", False, str(e))

    def test_calc_validation(self):
        print("\n[TEST] Calculation Validation")
        try:
            # Invalid input: d=0
            payload = {"vc": 140, "d": 0, "z": 4, "fz": 0.08, "ap": 2, "ae": 6}
            r = requests.post(f"{BASE_URL}/calc/freze", json=payload, timeout=5)
            self.test("Invalid d=0 returns 400 or 422", r.status_code in [400, 422],
                     f"status={r.status_code}")
            
            # Invalid input: negative vc
            payload = {"vc": -5, "d": 12, "z": 4, "fz": 0.08, "ap": 2, "ae": 6}
            r = requests.post(f"{BASE_URL}/calc/freze", json=payload, timeout=5)
            self.test("Invalid vc<0 returns 400 or 422", r.status_code in [400, 422],
                     f"status={r.status_code}")
        except Exception as e:
            self.test("Validation tests accessible", False, str(e))


if __name__ == "__main__":
    tester = BackendTester()
    sys.exit(tester.run_all())
