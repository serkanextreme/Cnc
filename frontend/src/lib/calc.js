/**
 * Talaş — CNC kesme parametreleri hesap motoru (frontend / offline).
 * Phase 1 POC (/app/test_core.py) ile birebir doğrulanmış formüller.
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

/* ---------------------------------------------------------- tezgâh limiti */
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
    out.notes.push(`Devir ${formatInt(maxRpm)} dev/dk ile sınırlandı`);
  }
  if (maxFeed > 0 && out.vf > maxFeed) {
    out.vf = maxFeed;
    out.feedClamped = true;
    out.notes.push(`İlerleme ${formatInt(maxFeed)} mm/dk ile sınırlandı`);
  }
  return out;
}

function formatInt(v) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v);
}

/* ------------------------------------------------------------ validasyon */
export function evaluateRange(value, range) {
  if (!range || !Number.isFinite(value)) {
    return { status: 'neutral', label: '—', range: range || [0, 0] };
  }
  const [lo, hi] = range;
  if (value < lo * 0.6 || value > hi * 1.6) {
    return { status: 'error', label: 'Aralık dışı', range };
  }
  if (value < lo) return { status: 'warn', label: 'Önerilenin altında', range };
  if (value > hi) return { status: 'warn', label: 'Önerilenin üstünde', range };
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
