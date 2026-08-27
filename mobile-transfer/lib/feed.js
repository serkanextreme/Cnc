/**
 * İLERLEME (F) BİRİM GÜVENLİĞİ
 * ---------------------------------------------------------------
 * CNC tezgâhlarında F değeri iki farklı modda okunur:
 *   G94 -> F = mm/dk   (tabla/dakika ilerlemesi, Vf)
 *   G95 -> F = mm/dev  (devir başına ilerleme, fn)
 * Aynı kesme koşulu için bu iki sayı 1000 kat farklı olabilir
 * (ör. 1300 mm/dk = 0,26 mm/dev). Yanlış moda yanlış sayı girmek
 * takım kırılmasına / tezgâh çakmasına yol açar.
 *
 * Bu modül hesap sonucundan iki değeri birlikte üretir, G-kod satırını
 * (ondalık NOKTA ile) hazırlar ve güvenlik kontrolü yapar.
 */

import { formatQty, toDisplay, unitLabel } from './units';

export const FEED_MODES = [
  { id: 'G95', label: 'mm/dev (G95)', short: 'G95', kind: 'f', note: 'Devir başına ilerleme' },
  { id: 'G94', label: 'mm/dk (G94)', short: 'G94', kind: 'vf', note: 'Dakikadaki ilerleme' },
];

export const DEFAULT_FEED_MODE = 'G95';

export function normalizeFeedMode(mode) {
  return mode === 'G94' ? 'G94' : 'G95';
}

export function feedModeInfo(mode) {
  const id = normalizeFeedMode(mode);
  return FEED_MODES.find((m) => m.id === id) || FEED_MODES[0];
}

/** Hesap sonucundan { vf (mm/dk), fn (mm/dev), n } üretir. */
export function feedFromResult(result, overrideVf = null) {
  if (!result) return { vf: NaN, fn: NaN, n: NaN };
  const vf = Number(overrideVf !== null && overrideVf !== undefined ? overrideVf : result.vf);
  const n = Number(result.n);
  let fn = Number(result.fn);
  if (!Number.isFinite(fn) || overrideVf !== null) {
    fn = n > 0 && Number.isFinite(vf) ? vf / n : NaN;
  }
  return { vf, fn, n };
}

/** Tezgâha yazılacak G-kod satırı — ondalık ayırıcı DAİMA nokta. */
export function gcodeLine({ mode, n, vf, fn, unitSystem = 'metric' }) {
  const rpm = Number.isFinite(n) ? Math.round(n) : 0;
  const imperial = unitSystem === 'imperial';
  if (normalizeFeedMode(mode) === 'G94') {
    const v = toDisplay('vf', vf, unitSystem);
    if (!Number.isFinite(v)) return '—';
    return `G94 S${rpm} F${v.toFixed(imperial ? 2 : 0)}`;
  }
  const v = toDisplay('f', fn, unitSystem);
  if (!Number.isFinite(v)) return '—';
  return `G95 S${rpm} F${v.toFixed(imperial ? 4 : 3)}`;
}

function trNum(value, decimals) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * İlerleme güvenlik kontrolü.
 * @param {number} vf            mm/dk (metrik)
 * @param {number} fn            mm/dev (metrik)
 * @param {Array}  fnRange       önerilen mm/dev aralığı [lo, hi] (malzeme kütüphanesinden)
 * @param {number} maxFeed       tezgâh maks. mm/dk
 * @param {number} maxFeedPerRev tezgâh maks. mm/dev (Ayarlar)
 * @param {boolean} clamped      tezgâh limitine takıldı mı
 * @returns {{level:'neutral'|'ok'|'warn'|'critical', messages:string[]}}
 */
export function feedSafety({
  vf, fn, fnRange = null, maxFeed = 0, maxFeedPerRev = 0, clamped = false,
}) {
  if (!Number.isFinite(vf) || !Number.isFinite(fn)) {
    return { level: 'neutral', messages: [] };
  }
  const messages = [];
  let level = 'ok';
  const bump = (lvl) => {
    if (lvl === 'critical') level = 'critical';
    else if (lvl === 'warn' && level !== 'critical') level = 'warn';
  };

  if (maxFeedPerRev > 0 && fn > maxFeedPerRev) {
    bump('critical');
    messages.push(
      `Devir başına ilerleme ${trNum(fn, 3)} mm/dev — tezgâh sınırınız ${trNum(maxFeedPerRev, 2)} mm/dev`,
    );
  }

  if (fnRange && Number.isFinite(fnRange[0]) && Number.isFinite(fnRange[1]) && fnRange[1] > 0) {
    const [lo, hi] = fnRange;
    if (fn > hi * 1.6) {
      bump('critical');
      messages.push(
        `${trNum(fn, 3)} mm/dev, önerilen ${trNum(lo, 3)}–${trNum(hi, 3)} mm/dev aralığının çok üzerinde — takım kırılma riski`,
      );
    } else if (fn > hi) {
      bump('warn');
      messages.push(`${trNum(fn, 3)} mm/dev, önerilen üst sınır ${trNum(hi, 3)} mm/dev üzerinde`);
    } else if (fn < lo * 0.6) {
      bump('warn');
      messages.push(`${trNum(fn, 3)} mm/dev çok düşük — talaş inceliyor, takım ovalar/sürtünür`);
    }
  }

  if (maxFeed > 0 && vf > maxFeed * 1.0001) {
    bump('critical');
    messages.push(`${trNum(vf, 0)} mm/dk, tezgâh maks. ilerlemesi ${trNum(maxFeed, 0)} mm/dk üzerinde`);
  }

  if (clamped) {
    bump('warn');
    messages.push('Değerler tezgâh limitine göre sınırlandı — G-kod satırı sınırlı değeri gösterir');
  }

  return { level, messages };
}

/** Freze için mm/diş aralığını mm/dev aralığına çevirir (fn = fz × z). */
export function fzRangeToFnRange(fzRange, z) {
  if (!fzRange || !(z > 0)) return null;
  return [fzRange[0] * z, fzRange[1] * z];
}

/**
 * ResultCard içindeki "İlerleme" metriğini üretir:
 * ana değer seçili tezgâh moduna göre, alt satırda diğer birim.
 */
export function feedMetric({
  feed, mode, unitSystem = 'metric', level = 'ok',
  label = 'İlerleme', testId = 'result-vf', hasResult = true,
}) {
  const m = normalizeFeedMode(mode);
  const dec = unitSystem === 'imperial' ? 4 : 3;
  const fnText = Number.isFinite(feed.fn) ? formatQty('f', feed.fn, unitSystem, { decimals: dec }) : '—';
  const vfText = Number.isFinite(feed.vf) ? formatQty('vf', feed.vf, unitSystem) : '—';
  const fnFull = `${fnText} ${unitLabel('f', unitSystem)}`;
  const vfFull = `${vfText} ${unitLabel('vf', unitSystem)}`;
  const isG95 = m === 'G95';
  return {
    label: `${label} (${m})`,
    value: hasResult ? (isG95 ? fnText : vfText) : '—',
    unit: isG95 ? unitLabel('f', unitSystem) : unitLabel('vf', unitSystem),
    sub: hasResult ? (isG95 ? `G94: ${vfFull}` : `G95: ${fnFull}`) : '',
    subTone: level === 'critical' ? 'destructive' : 'muted',
    tone: level === 'critical' ? 'destructive' : 'primary',
    testId,
  };
}
