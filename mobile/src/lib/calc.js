/**
 * Talas - CNC kesme parametreleri hesap motoru (mobil / offline).
 * Web sürümüyle birebir aynı (frontend/src/lib/calc.js). Degistirirsen
 * /app/mobile-transfer/lib/calc.js dosyasini da senkron tut.
 */

export const PI = Math.PI;

/* ------------------------------------------------------------------ temel */
export function rpmFromVc(vc, d) {
  if (!(d > 0)) return NaN;
  return (1000 * vc) / (PI * d);
}
export function vcFromRpm(n, d) {
  return (PI * d * n) / 1000;
}
export function vfMilling(fz, z, n) {
  return fz * z * n;
}
export function vfSingle(f, n) {
  return f * n;
}
export function mrrMilling(ap, ae, vf) {
  return (ap * ae * vf) / 1000;
}
export function mrrTurning(ap, f, vc) {
  return ap * f * vc;
}
export function mrrDrilling(d, vf) {
  return ((PI * d * d) / 4) * vf / 1000;
}
export function powerKw(mrr, kc, eta = 0.8) {
  const e = eta > 0 ? eta : 0.8;
  return (mrr * kc) / 60000 / e;
}
export function torqueNm(pKw, n) {
  if (!(n > 0)) return 0;
  return (30000 * pKw) / (PI * n);
}
export function raFromFeed(f, noseR) {
  if (!(noseR > 0)) return NaN;
  return ((f * f) / (32 * noseR)) * 1000;
}
export function feedFromRa(raUm, noseR) {
  if (!(noseR > 0) || !(raUm > 0)) return NaN;
  return Math.sqrt(32 * (raUm / 1000) * noseR);
}
export function drillCycleSeconds(depth, vf, approach = 0, peckCount = 0, peckRetractS = 0.3) {
  if (!(vf > 0)) return 0;
  return ((depth + approach) / vf) * 60 + peckCount * peckRetractS;
}
export function chipThinningHm(fz, ae, d) {
  if (!(d > 0)) return 0;
  const ratio = Math.min(Math.max(ae / d, 0), 1);
  const x = 1 - 2 * ratio;
  const val = 1 - x * x;
  if (val <= 0) return fz;
  return fz * Math.min(Math.sqrt(val), 1);
}
export function engagementAngleDeg(ae, d) {
  if (!(d > 0)) return 0;
  const ratio = Math.min(Math.max(ae / d, 0), 1);
  return (Math.acos(1 - 2 * ratio) * 180) / PI;
}

/* ---------------------------------------------------------- tezgah limiti */
export function applyMachineLimits(n, vf, d, limits) {
  const out = {
    n,
    vf,
    rpmClamped: false,
    feedClamped: false,
    vcEffective: vcFromRpm(n, d),
    notes: [],
  };
  if (!limits) return out;
  const maxRpm = Number(limits.maxRpm) || 0;
  const maxFeed = Number(limits.maxFeed) || 0;
  if (maxRpm > 0 && n > maxRpm) {
    const scale = maxRpm / n;
    out.n = maxRpm;
    out.vf = vf * scale;
    out.rpmClamped = true;
    out.vcEffective = vcFromRpm(maxRpm, d);
    out.notes.push(`Devir ${formatInt(maxRpm)} dev/dk ile sinirlandi`);
  }
  if (maxFeed > 0 && out.vf > maxFeed) {
    out.vf = maxFeed;
    out.feedClamped = true;
    out.notes.push(`Ilerleme ${formatInt(maxFeed)} mm/dk ile sinirlandi`);
  }
  return out;
}

function formatInt(v) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v);
}

/** Devir basina ilerleme (mm/dev) - G95 modunda tezgaha yazilan deger. */
export function feedPerRevFrom(vf, n) {
  if (!(n > 0) || !Number.isFinite(vf)) return NaN;
  return vf / n;
}

/* ------------------------------------------------------------ validasyon */
export function evaluateRange(value, range) {
  if (!range || !Number.isFinite(value)) {
    return { status: 'neutral', label: '—', range: range || [0, 0] };
  }
  const [lo, hi] = range;
  if (value < lo * 0.6 || value > hi * 1.6) {
    return { status: 'error', label: 'Aralik disi', range };
  }
  if (value < lo) return { status: 'warn', label: 'Onerilenin altinda', range };
  if (value > hi) return { status: 'warn', label: 'Onerilenin ustunde', range };
  return { status: 'ok', label: 'Uygun', range };
}

export function worstStatus(list) {
  if (list.includes('error')) return 'error';
  if (list.includes('warn')) return 'warn';
  return 'ok';
}

/* -------------------------------------------------------- operasyon hesap */
export function calcMilling({ vc, d, z, fz, ap, ae, kc = 2100, eta = 0.8, limits = null }) {
  const n0 = rpmFromVc(vc, d);
  const vf0 = vfMilling(fz, z, n0);
  const lim = applyMachineLimits(n0, vf0, d, limits);
  const q = mrrMilling(ap, ae, lim.vf);
  const p = powerKw(q, kc, eta);
  return {
    nRaw: n0,
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vcEffective: lim.vcEffective,
    q,
    power: p,
    torque: torqueNm(p, lim.n),
    hm: chipThinningHm(fz, ae, d),
    engagement: engagementAngleDeg(ae, d),
    feedPerRev: fz * z,
    limits: lim,
  };
}

export function calcTurning({ vc, d, f, ap, noseR = 0.8, kc = 2100, eta = 0.8, limits = null, targetRa = null }) {
  const n0 = rpmFromVc(vc, d);
  const vf0 = vfSingle(f, n0);
  const lim = applyMachineLimits(n0, vf0, d, limits);
  const q = mrrTurning(ap, f, lim.vcEffective);
  const p = powerKw(q, kc, eta);
  return {
    nRaw: n0,
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vcEffective: lim.vcEffective,
    q,
    power: p,
    torque: torqueNm(p, lim.n),
    ra: raFromFeed(f, noseR),
    feedForTargetRa: targetRa ? feedFromRa(targetRa, noseR) : null,
    limits: lim,
  };
}

export function calcDrilling({ vc, d, f, depth, kc = 2100, eta = 0.8, limits = null, peck = 0 }) {
  const n0 = rpmFromVc(vc, d);
  const vf0 = vfSingle(f, n0);
  const lim = applyMachineLimits(n0, vf0, d, limits);
  const q = mrrDrilling(d, lim.vf);
  const p = powerKw(q, kc, eta);
  return {
    nRaw: n0,
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vcEffective: lim.vcEffective,
    q,
    power: p,
    torque: torqueNm(p, lim.n),
    cycleSeconds: drillCycleSeconds(depth, lim.vf, 0, peck),
    limits: lim,
  };
}

export function calcByOp(op, inputs) {
  if (op === 'freze') return calcMilling(inputs);
  if (op === 'torna') return calcTurning(inputs);
  return calcDrilling(inputs);
}

/* =========================================================================
   KILAVUZ / DIS ACMA
   ========================================================================= */
export const MM_PER_INCH = 25.4;
export const THREAD_HEIGHT_60 = 0.6134;
export const THREAD_HEIGHT_55 = 0.6403;
export const INTERNAL_HEIGHT = 0.5413;

export function pitchFromTpi(tpi) {
  return MM_PER_INCH / tpi;
}

export function tapDrillDiameter(d, pitch, engagement = 75) {
  return d - (engagement * pitch) / 76.98;
}

export function threadMinorDiameter(d, pitch) {
  return d - 1.0825 * pitch;
}

export function threadPitchDiameter(d, pitch) {
  return d - 0.6495 * pitch;
}

export function tappingTorqueNm(kc, pitch, d) {
  return (kc * pitch * d) / 8000;
}

export function formingTapTorqueNm(tensile, pitch, d) {
  return (0.6 * tensile * d * pitch * pitch) / 1000;
}

export function calcTapping({ vc, d, pitch, depth, kc = 2100, tensile = 900,
  tapType = 'kesici', engagement = 75, eta = 0.8, limits = null }) {
  const n0 = rpmFromVc(vc, d);
  const vf0 = pitch * n0;
  const lim = applyMachineLimits(n0, vf0, d, limits);
  const torque = tapType === 'yuvarlak'
    ? formingTapTorqueNm(tensile, pitch, d)
    : tappingTorqueNm(kc, pitch, d);
  const power = (torque * lim.n) / 9550 / (eta || 0.8);
  return {
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vcEffective: lim.vcEffective,
    torque,
    power,
    tapDrill: tapDrillDiameter(d, pitch, engagement),
    minorDiameter: threadMinorDiameter(d, pitch),
    pitchDiameter: threadPitchDiameter(d, pitch),
    turns: pitch > 0 ? depth / pitch : 0,
    cycleSeconds: lim.vf > 0 ? ((2 * depth) / lim.vf) * 60 : 0,
    limits: lim,
  };
}

export function calcThreadMilling({ vc, toolD, threadD, pitch, z = 3, fz, threadLength,
  kc = 2100, internal = true, eta = 0.8, limits = null }) {
  const n0 = rpmFromVc(vc, toolD);
  const vfPeriphery = fz * z * n0;
  if (internal && threadD <= toolD) return null;
  const ratio = internal ? (threadD - toolD) / threadD : (threadD + toolD) / threadD;
  const vfCenter = vfPeriphery * ratio;
  const lim = applyMachineLimits(n0, vfCenter, toolD, limits);
  const revolutions = pitch > 0 ? threadLength / pitch : 0;
  const pathD = internal ? threadD - toolD : threadD + toolD;
  const pathLen = PI * pathD * Math.max(revolutions, 1e-9);
  const depth = THREAD_HEIGHT_60 * pitch;
  const q = mrrMilling(pitch, depth, lim.vf);
  const power = powerKw(q, kc, eta);
  return {
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vfPeriphery,
    compensation: ratio,
    vcEffective: lim.vcEffective,
    revolutions,
    cycleSeconds: lim.vf > 0 ? (pathLen / lim.vf) * 60 : 0,
    threadDepth: depth,
    q,
    power,
    torque: torqueNm(power, lim.n),
    limits: lim,
  };
}

const THREADING_PASS_TABLE = [
  [0.5, 4], [0.7, 4], [0.75, 5], [0.8, 5], [1.0, 5], [1.25, 6], [1.5, 6],
  [1.75, 7], [2.0, 8], [2.5, 9], [3.0, 10], [3.5, 11], [4.0, 12], [4.5, 13],
  [5.0, 14], [5.5, 15], [6.0, 16],
];
const MACH_PASS_FACTOR = { kolay: 1.0, orta: 1.1, zor: 1.25, 'cok-zor': 1.4 };

export function threadingPassCount(pitch, machinability = 'orta') {
  let base = THREADING_PASS_TABLE[THREADING_PASS_TABLE.length - 1][1];
  for (const [p, count] of THREADING_PASS_TABLE) {
    if (pitch <= p + 1e-9) { base = count; break; }
  }
  return Math.ceil(base * (MACH_PASS_FACTOR[machinability] || 1.1));
}

export function threadingInfeedSchedule(pitch, passes, angle = 60, internal = false) {
  const factor = internal ? INTERNAL_HEIGHT : (angle === 55 ? THREAD_HEIGHT_55 : THREAD_HEIGHT_60);
  const h = factor * pitch;
  const list = [];
  let prev = 0;
  for (let i = 1; i <= passes; i += 1) {
    const cum = h * Math.sqrt(i / passes);
    list.push({ pass: i, depth: cum - prev, cumulative: cum });
    prev = cum;
  }
  return { totalDepth: h, passes: list };
}

export function calcThreadTurning({ vc, d, pitch, length, kc = 2100, machinability = 'orta',
  angle = 60, internal = false, eta = 0.8, limits = null, approach = 2, passes = null }) {
  const n0 = rpmFromVc(vc, d);
  const vf0 = pitch * n0;
  const lim = applyMachineLimits(n0, vf0, d, limits);
  const count = passes || threadingPassCount(pitch, machinability);
  const plan = threadingInfeedSchedule(pitch, count, angle, internal);
  const perPass = lim.vf > 0 ? ((length + approach) / lim.vf) * 60 : 0;
  const q = mrrTurning(plan.totalDepth / count, pitch, lim.vcEffective);
  const power = powerKw(q, kc, eta);
  return {
    n: lim.n,
    vf: lim.vf,
    fn: feedPerRevFrom(lim.vf, lim.n),
    vcEffective: lim.vcEffective,
    passCount: count,
    totalDepth: plan.totalDepth,
    schedule: plan.passes,
    firstPass: plan.passes[0].depth,
    lastPass: plan.passes[plan.passes.length - 1].depth,
    perPassSeconds: perPass,
    cycleSeconds: perPass * count * 1.6,
    q,
    power,
    torque: torqueNm(power, lim.n),
    limits: lim,
  };
}

/* =========================================================================
   TAKIM OMRU (Taylor) + MALIYET
   ========================================================================= */
export const TAYLOR_N = { karbur: 0.25, hss: 0.125 };
export const COOLANT_LIFE_FACTOR = { sivi: 1.0, 'yuksek-basinc': 1.15, mist: 0.9, kuru: 0.7 };

export function toolLifeMinutes({ vc, vcRef, tool = 'karbur', refLife = 15, coolant = 'sivi', nExp = null }) {
  if (!(vc > 0) || !(vcRef > 0)) return 0;
  const n = nExp || TAYLOR_N[tool] || 0.25;
  const f = COOLANT_LIFE_FACTOR[coolant] ?? 1;
  return refLife * Math.pow(vcRef / vc, 1 / n) * f;
}

export function vcForTargetLife({ targetLife, vcRef, tool = 'karbur', refLife = 15, coolant = 'sivi', nExp = null }) {
  if (!(targetLife > 0)) return vcRef;
  const n = nExp || TAYLOR_N[tool] || 0.25;
  const f = COOLANT_LIFE_FACTOR[coolant] ?? 1;
  return vcRef * Math.pow((refLife * f) / targetLife, n);
}

export function toolCost({ toolPrice = 0, edges = 1, lifeMinutes = 0, partMinutes = 0, hourlyRate = 0 }) {
  const e = Math.max(1, Math.round(edges || 1));
  const costPerEdge = (toolPrice || 0) / e;
  if (!(lifeMinutes > 0) || !(partMinutes > 0)) {
    return { costPerEdge, partsPerEdge: 0, toolCostPerPart: 0, machineCostPerPart: 0, totalPerPart: 0, costPerMinute: 0 };
  }
  const partsPerEdge = lifeMinutes / partMinutes;
  const toolCostPerPart = costPerEdge * (partMinutes / lifeMinutes);
  const machineCostPerPart = (hourlyRate || 0) * (partMinutes / 60);
  return {
    costPerEdge,
    partsPerEdge,
    toolCostPerPart,
    machineCostPerPart,
    totalPerPart: toolCostPerPart + machineCostPerPart,
    costPerMinute: costPerEdge / lifeMinutes,
  };
}

export function wearStatus(lifeMinutes, warn = 10, critical = 5) {
  if (!(lifeMinutes > 0)) return 'bilinmiyor';
  if (lifeMinutes < critical) return 'kritik';
  if (lifeMinutes < warn) return 'dikkat';
  return 'iyi';
}

/* =========================================================================
   SERTLIGE GORE KESME VERISI DUZELTMESI
   ========================================================================= */
const HRC_HB_TABLE = [
  [20, 226], [22, 237], [24, 248], [26, 260], [28, 271], [30, 286], [32, 301],
  [34, 317], [36, 333], [38, 352], [40, 371], [42, 390], [44, 409], [46, 432],
  [48, 455], [50, 481], [52, 509], [54, 535], [56, 565], [58, 595], [60, 627],
  [62, 659], [64, 695], [66, 731], [68, 770],
];

export function hrcToHb(hrc) {
  if (hrc <= HRC_HB_TABLE[0][0]) return HRC_HB_TABLE[0][1];
  const last = HRC_HB_TABLE[HRC_HB_TABLE.length - 1];
  if (hrc >= last[0]) return last[1];
  for (let i = 0; i < HRC_HB_TABLE.length - 1; i += 1) {
    const a = HRC_HB_TABLE[i];
    const b = HRC_HB_TABLE[i + 1];
    if (hrc >= a[0] && hrc <= b[0]) {
      const t = (hrc - a[0]) / (b[0] - a[0]);
      return a[1] + t * (b[1] - a[1]);
    }
  }
  return last[1];
}

export function toHb(value, scale) {
  return scale === 'HRC' ? hrcToHb(value) : value;
}

export function adjustForHardness(material, newHb) {
  if (!material) return material;
  const base = Number(material.baseHB) || toHb((material.hardness[0] + material.hardness[1]) / 2, material.hardnessScale);
  if (!newHb || newHb <= 0 || Math.abs(newHb - base) < 1e-6) return material;
  const vcF = Math.min(Math.max(Math.pow(base / newHb, 0.6), 0.35), 1.9);
  const feedF = Math.min(Math.max(Math.pow(base / newHb, 0.25), 0.55), 1.45);
  const ops = {};
  Object.entries(material.ops).forEach(([op, tools]) => {
    const feedKey = op === 'freze' ? 'fz' : 'f';
    ops[op] = {};
    Object.entries(tools).forEach(([tool, data]) => {
      ops[op][tool] = {
        vc: [Math.max(3, Math.round(data.vc[0] * vcF)), Math.max(4, Math.round(data.vc[1] * vcF))],
        [feedKey]: [
          Number((data[feedKey][0] * feedF).toFixed(3)),
          Number((data[feedKey][1] * feedF).toFixed(3)),
        ],
      };
    });
  });
  return {
    ...material,
    kc: Math.round(material.kc * Math.pow(newHb / base, 0.35)),
    adjustedHB: newHb,
    ops,
  };
}

/* =========================================================================
   CHATTER-FREE / HEM helper formulas (kept for future use)
   ========================================================================= */
export const HEM_AE_PRESETS = [3, 5, 8, 10, 15];

export function rctf(ae, d) {
  if (!(d > 0) || !(ae > 0)) return 1;
  const ratio = Math.min(ae / d, 0.5);
  const x = 1 - 2 * ratio;
  const val = 1 - x * x;
  if (val <= 0) return 1;
  return 1 / Math.sqrt(val);
}

export function toothPassingFrequency(n, z) {
  return (n * z) / 60;
}

/* ============ TROKOIDAL / PEEL KANAL ACMA (kept for future use) ============ */
export function calcTrochoidalSlot({ width, length, depth, d, ae, ap, vf, q = 0, rapidFactor = 0.15 }) {
  if (!(d > 0) || !(ae > 0) || !(ap > 0) || !(width >= d) || !(length > 0)) return null;
  const radialPasses = Math.ceil((width - d) / ae) + 1;
  const axialLayers = depth > 0 ? Math.ceil(depth / ap) : 1;
  const totalPasses = radialPasses * axialLayers;
  const pathLength = totalPasses * length;
  const cuttingMinutes = vf > 0 ? pathLength / vf : 0;
  const volumeCm3 = (width * depth * length) / 1000;
  return {
    radialPasses,
    axialLayers,
    totalPasses,
    pathLength,
    cuttingMinutes,
    totalMinutes: cuttingMinutes * (1 + rapidFactor),
    volumeCm3,
    volumeMinutes: q > 0 ? volumeCm3 / q : 0,
    effectiveMrr: cuttingMinutes > 0 ? volumeCm3 / cuttingMinutes : 0,
  };
}
