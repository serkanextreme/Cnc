/**
 * Diş tabloları — Metrik kaba/ince, UNC, UNF, BSP (G), NPT.
 * Veri paket içinde; internet gerekmez.
 */
import table from '../data/threads.json';
import { pitchFromTpi } from './calc';

export const THREAD_SERIES = table.series;
export const TAP_TYPES = table.tapTypes;
export const ENGAGEMENT_OPTIONS = table.engagementOptions;
export const THREADING_PASS_TABLE = table.threadingPasses;

/** [label, series, majorD(mm), pitch(mm)|null, tpi|null, tapDrill|null] */
export const THREADS = table.threads.map(([label, series, d, pitch, tpi, drill], index) => {
  const p = pitch !== null && pitch !== undefined ? pitch : pitchFromTpi(tpi);
  return {
    id: `${series}-${index}`,
    label,
    series,
    d,
    pitch: p,
    tpi: tpi || null,
    tapDrill: drill || null,
    isPipe: series === 'bsp' || series === 'npt',
    angle: series === 'bsp' ? 55 : 60,
  };
});

export function threadsBySeries(series) {
  return THREADS.filter((t) => t.series === series);
}

export function findThread(id) {
  return THREADS.find((t) => t.id === id) || null;
}

export function seriesLabel(id) {
  const s = THREAD_SERIES.find((x) => x.id === id);
  return s ? s.label : id;
}

export function tapTypeLabel(id) {
  const t = TAP_TYPES.find((x) => x.id === id);
  return t ? t.label : id;
}

export const DIS_MODES = [
  { id: 'kilavuz', label: 'Kılavuz', icon: 'Bolt', note: 'Makine kılavuzu ile diş açma' },
  { id: 'frezeleme', label: 'Diş frezesi', icon: 'CircleDotDashed', note: 'Helis interpolasyon' },
  { id: 'torna', label: 'Torna dişi', icon: 'RotateCw', note: 'Tek ağızlı diş çekme' },
];

/** Kılavuz/diş için önerilen Vc — matkap (kılavuz) ya da freze/torna verisinden türetilir */
export function threadVcRange(material, mode, tool) {
  if (!material) return null;
  if (mode === 'kilavuz') {
    const base = material.ops.matkap[tool] || material.ops.matkap.karbur;
    // Kılavuzda kesme hızı delmeye göre belirgin şekilde düşüktür (~%35)
    return [Math.max(2, Math.round(base.vc[0] * 0.35)), Math.max(3, Math.round(base.vc[1] * 0.35))];
  }
  if (mode === 'frezeleme') {
    const base = material.ops.freze[tool] || material.ops.freze.karbur;
    return [Math.round(base.vc[0] * 0.8), Math.round(base.vc[1] * 0.8)];
  }
  const base = material.ops.torna[tool] || material.ops.torna.karbur;
  return [Math.round(base.vc[0] * 0.6), Math.round(base.vc[1] * 0.6)];
}
