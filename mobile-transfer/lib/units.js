/**
 * Birim sistemi (Metrik / İnç) + Türkçe sayı biçimlendirme.
 * Uygulamanın içinde TÜM değerler METRİK tutulur; sadece görüntü/giriş çevrilir.
 */

export const MM_PER_INCH = 25.4;
export const FT_PER_M = 3.280839895;

export const UNIT_SYSTEMS = [
  { id: 'metric', label: 'Metrik', note: 'mm · m/dk · mm/dk' },
  { id: 'imperial', label: 'İnç', note: 'inç · SFM · IPM' },
];

/** kind -> { metric, imperial } etiketleri */
export const UNIT_LABELS = {
  length: { metric: 'mm', imperial: 'inç' },
  vc: { metric: 'm/dk', imperial: 'SFM' },
  fz: { metric: 'mm/diş', imperial: 'inç/diş' },
  f: { metric: 'mm/dev', imperial: 'inç/dev' },
  vf: { metric: 'mm/dk', imperial: 'IPM' },
  rpm: { metric: 'dev/dk', imperial: 'RPM' },
  q: { metric: 'cm³/dk', imperial: 'inç³/dk' },
  power: { metric: 'kW', imperial: 'HP' },
  torque: { metric: 'Nm', imperial: 'lb-ft' },
  ra: { metric: 'µm Ra', imperial: 'µinç Ra' },
  time: { metric: 'sn', imperial: 'sn' },
  deg: { metric: '°', imperial: '°' },
};

const FACTORS = {
  length: 1 / MM_PER_INCH,
  vc: FT_PER_M,
  fz: 1 / MM_PER_INCH,
  f: 1 / MM_PER_INCH,
  vf: 1 / MM_PER_INCH,
  rpm: 1,
  q: 1 / 16.387064,
  power: 1.34102209,
  torque: 0.7375621,
  ra: 39.3700787,
  time: 1,
  deg: 1,
};

const DECIMALS = {
  length: { metric: 2, imperial: 4 },
  vc: { metric: 0, imperial: 0 },
  fz: { metric: 3, imperial: 4 },
  f: { metric: 3, imperial: 4 },
  vf: { metric: 0, imperial: 1 },
  rpm: { metric: 0, imperial: 0 },
  q: { metric: 2, imperial: 3 },
  power: { metric: 2, imperial: 2 },
  torque: { metric: 2, imperial: 2 },
  ra: { metric: 2, imperial: 0 },
  time: { metric: 1, imperial: 1 },
  deg: { metric: 0, imperial: 0 },
};

export function unitLabel(kind, system) {
  const entry = UNIT_LABELS[kind];
  if (!entry) return '';
  return entry[system] || entry.metric;
}

export function decimalsFor(kind, system) {
  const d = DECIMALS[kind];
  if (!d) return 2;
  return d[system] ?? d.metric;
}

/** metrik -> görüntü birimi */
export function toDisplay(kind, metricValue, system) {
  if (!Number.isFinite(metricValue)) return NaN;
  if (system !== 'imperial') return metricValue;
  return metricValue * (FACTORS[kind] ?? 1);
}

/** görüntü birimi -> metrik */
export function toMetric(kind, displayValue, system) {
  if (!Number.isFinite(displayValue)) return NaN;
  if (system !== 'imperial') return displayValue;
  return displayValue / (FACTORS[kind] ?? 1);
}

/* --------------------------------------------------- Türkçe biçimlendirme */
export function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Metrik değeri, seçili birim sisteminde biçimlenmiş metne çevirir. */
export function formatQty(kind, metricValue, system, opts = {}) {
  const v = toDisplay(kind, metricValue, system);
  const dec = opts.decimals ?? decimalsFor(kind, system);
  return formatNumber(v, dec);
}

/** Aralık (örn. [120,160]) -> "120–160" (birim sistemine çevrili) */
export function formatRange(kind, range, system, opts = {}) {
  if (!range) return '—';
  const dec = opts.decimals ?? decimalsFor(kind, system);
  const lo = formatNumber(toDisplay(kind, range[0], system), dec);
  const hi = formatNumber(toDisplay(kind, range[1], system), dec);
  return lo === hi ? lo : `${lo}–${hi}`;
}

/** Kullanıcı girdisini sayıya çevir (hem "0,08" hem "0.08" kabul eder). */
export function parseNumber(text) {
  if (typeof text === 'number') return text;
  if (!text) return NaN;
  const cleaned = String(text).trim().replace(/\s/g, '').replace(/\./g, '.').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Girdi alanında gösterilecek düzenlenebilir metin (grup ayırıcı YOK). */
export function toInputText(kind, metricValue, system) {
  if (!Number.isFinite(metricValue)) return '';
  const v = toDisplay(kind, metricValue, system);
  const dec = decimalsFor(kind, system);
  return v.toFixed(dec).replace('.', ',');
}

export function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${formatNumber(seconds, 1)} sn`;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m} dk ${formatNumber(s, 0)} sn`;
}
