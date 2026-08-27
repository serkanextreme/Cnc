"""
Backend API test for Chatter-Free / HEM endpoint
Tests all scenarios from BACKEND-CF requirements
"""
import requests
import sys

BASE_URL = "https://feed-rate-fix.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def test_result(name, passed, detail=""):
    if passed:
        print(f"{Colors.GREEN}✓{Colors.END} {name} {detail}")
        return True
    else:
        print(f"{Colors.RED}✗{Colors.END} {name} {detail}")
        return False

def near(a, b, tol):
    return abs(a - b) <= tol

# Test counters
passed = 0
failed = 0

print("=" * 80)
print(f"{Colors.BLUE}BACKEND API TESTING — CHATTER-FREE ENDPOINT{Colors.END}")
print("=" * 80)

# Test 1: Root endpoint lists chatter-free
print(f"\n{Colors.YELLOW}TEST 1: Root endpoint lists /api/calc/chatter-free{Colors.END}")
try:
    r = requests.get(f"{BASE_URL}/", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "/api/calc/chatter-free" in data.get("endpoints", []):
            passed += test_result("Root endpoint includes chatter-free", True)
        else:
            failed += test_result("Root endpoint includes chatter-free", False, f"endpoints: {data.get('endpoints')}")
    else:
        failed += test_result("Root endpoint accessible", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("Root endpoint accessible", False, str(e))

# Test 2: Health check shows 247 materials
print(f"\n{Colors.YELLOW}TEST 2: Health check shows materials count{Colors.END}")
try:
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if data.get("materials") == 247:
            passed += test_result("Materials count = 247", True)
        else:
            failed += test_result("Materials count = 247", False, f"got {data.get('materials')}")
    else:
        failed += test_result("Health endpoint accessible", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("Health endpoint accessible", False, str(e))

# Test 3: Basic chatter-free calculation (default POC values)
print(f"\n{Colors.YELLOW}TEST 3: Basic chatter-free calculation (POC defaults){Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 1.2,
        "kc": 2100, "fluteLength": 20
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        passed += test_result("Status 200", True)
        passed += test_result("n ≈ 3713.6", near(data.get("n", 0), 3713.6, 2), f"n={data.get('n'):.1f}")
        passed += test_result("rctf ≈ 1.6667", near(data.get("rctf", 0), 1.6667, 0.001), f"rctf={data.get('rctf'):.4f}")
        passed += test_result("fzProgrammed ≈ 0.1333", near(data.get("fzProgrammed", 0), 0.1333, 0.001), f"fzProg={data.get('fzProgrammed'):.4f}")
        passed += test_result("vf ≈ 1980.6", near(data.get("vf", 0), 1980.6, 5), f"vf={data.get('vf'):.1f}")
        passed += test_result("q ≈ 47.53", near(data.get("q", 0), 47.53, 0.5), f"q={data.get('q'):.2f}")
        passed += test_result("hm ≈ 0.08", near(data.get("hm", 0), 0.08, 0.001), f"hm={data.get('hm'):.4f}")
        passed += test_result("aePercent = 10", near(data.get("aePercent", 0), 10, 0.1), f"ae%={data.get('aePercent'):.1f}")
        passed += test_result("engagement ≈ 36.87", near(data.get("engagement", 0), 36.87, 0.1), f"eng={data.get('engagement'):.2f}")
        passed += test_result("toothPassHz ≈ 247.6", near(data.get("toothPassHz", 0), 247.6, 1), f"hz={data.get('toothPassHz'):.1f}")
        passed += test_result("edgeUseRatio ≈ 3.333", near(data.get("edgeUseRatio", 0), 3.333, 0.01), f"edge={data.get('edgeUseRatio'):.3f}")
        passed += test_result("mrrGain > 1", data.get("comparison", {}).get("mrrGain", 0) > 1, f"gain={data.get('comparison', {}).get('mrrGain'):.2f}")
        passed += test_result("warnings empty", len(data.get("warnings", [])) == 0, f"warnings={data.get('warnings')}")
    else:
        failed += test_result("Basic calculation", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("Basic calculation", False, str(e))

# Test 4: vcFactor increases RPM
print(f"\n{Colors.YELLOW}TEST 4: vcFactor increases RPM{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 1.2,
        "kc": 2100, "fluteLength": 20, "vcFactor": 1.3
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        passed += test_result("vcFactor 1.3 → n ≈ 4827", near(data.get("n", 0), 4827, 5), f"n={data.get('n'):.0f}")
    else:
        failed += test_result("vcFactor test", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("vcFactor test", False, str(e))

# Test 5: ae > 20% generates warning
print(f"\n{Colors.YELLOW}TEST 5: ae > 20% generates chatter-free warning{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 4.0,
        "kc": 2100, "fluteLength": 20
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        warnings = data.get("warnings", [])
        has_chatter_warn = any("chatter-free" in w.lower() for w in warnings)
        passed += test_result("ae > 20% → chatter-free warning", has_chatter_warn, f"warnings={warnings}")
    else:
        failed += test_result("ae warning test", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("ae warning test", False, str(e))

# Test 6: ap > fluteLength generates helis warning
print(f"\n{Colors.YELLOW}TEST 6: ap > fluteLength generates helis warning{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 25, "ae": 1.2,
        "kc": 2100, "fluteLength": 20
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        warnings = data.get("warnings", [])
        has_helis_warn = any("helis" in w.lower() for w in warnings)
        passed += test_result("ap > fluteLength → helis warning", has_helis_warn, f"warnings={warnings}")
    else:
        failed += test_result("helis warning test", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("helis warning test", False, str(e))

# Test 7: ae > D returns 400 error
print(f"\n{Colors.YELLOW}TEST 7: ae > D returns 400 error{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 15,
        "kc": 2100, "fluteLength": 20
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 400:
        passed += test_result("ae > D → 400 error", True, f"status={r.status_code}")
    else:
        failed += test_result("ae > D → 400 error", False, f"got status {r.status_code}")
except Exception as e:
    failed += test_result("ae > D error test", False, str(e))

# Test 8: d = 0 returns 400/422 error
print(f"\n{Colors.YELLOW}TEST 8: d = 0 returns error{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 0, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 1.2,
        "kc": 2100, "fluteLength": 20
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code in [400, 422]:
        passed += test_result("d = 0 → error", True, f"status={r.status_code}")
    else:
        failed += test_result("d = 0 → error", False, f"got status {r.status_code}")
except Exception as e:
    failed += test_result("d = 0 error test", False, str(e))

# Test 9: Machine limits clamp RPM
print(f"\n{Colors.YELLOW}TEST 9: Machine limits clamp RPM{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 1.2,
        "kc": 2100, "fluteLength": 20,
        "limits": {"maxRpm": 3000}
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        passed += test_result("n clamped to 3000", near(data.get("n", 0), 3000, 1), f"n={data.get('n'):.0f}")
        passed += test_result("rpmClamped = true", data.get("limits", {}).get("rpmClamped") == True, f"clamped={data.get('limits', {}).get('rpmClamped')}")
    else:
        failed += test_result("Limits test", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("Limits test", False, str(e))

# Test 10: Chatter speeds calculation
print(f"\n{Colors.YELLOW}TEST 10: Chatter speeds calculation{Colors.END}")
try:
    payload = {
        "vc": 140, "d": 12, "z": 4, "fzTarget": 0.08, "ap": 20, "ae": 1.2,
        "kc": 2100, "fluteLength": 20, "chatterHz": 900
    }
    r = requests.post(f"{BASE_URL}/calc/chatter-free", json=payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        speeds = data.get("chatterSpeeds", [])
        passed += test_result("4 lobe suggestions", len(speeds) == 4, f"count={len(speeds)}")
        if len(speeds) >= 2:
            passed += test_result("k=0 → 13500 rpm", near(speeds[0].get("rpm", 0), 13500, 10), f"rpm={speeds[0].get('rpm'):.0f}")
            passed += test_result("k=1 → 6750 rpm", near(speeds[1].get("rpm", 0), 6750, 10), f"rpm={speeds[1].get('rpm'):.0f}")
    else:
        failed += test_result("Chatter speeds test", False, f"status {r.status_code}")
except Exception as e:
    failed += test_result("Chatter speeds test", False, str(e))

# Summary
print("\n" + "=" * 80)
print(f"{Colors.BLUE}BACKEND TEST SUMMARY{Colors.END}")
print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
print(f"{Colors.RED}Failed: {failed}{Colors.END}")
print("=" * 80)

sys.exit(0 if failed == 0 else 1)
