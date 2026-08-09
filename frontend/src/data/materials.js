/**
 * Malzeme kütüphanesi — ISO 513 (P/M/K/N/S/H) tabanlı 247 kalite + gruplar +
 * tezgâh presetleri. Veri paket içinde (offline).
 */
import catalog from './materials.json';

export const CATALOG_VERSION = catalog.version;
export const GROUPS = catalog.groups;
export const ISO_GROUPS = catalog.isoGroups;
export const SUBGROUPS = catalog.subgroups;
export const MACHINABILITY = catalog.machinability;
export const MACHINE_PRESETS = catalog.machinePresets;
export const AUTO_PRESET = { ...catalog.autoPreset, chatter: catalog.autoPreset.freze };
export const INSERT_TYPES = catalog.insertTypes;
export const COOLANT_OPTIONS = catalog.coolantOptions;
export const SEED_MATERIALS = catalog.materials;

export const DEFAULT_FAVORITES = ['4140', 'c45', '6082-t6', '304'];
export const DEFAULT_MATERIAL_ID = '4140';

export const OPERATIONS = [
  { id: 'freze', label: 'Freze', route: '/freze', icon: 'CircleDotDashed', desc: 'Kanal, cep ve yüzey frezeleme', feedKey: 'fz' },
  { id: 'torna', label: 'Torna', route: '/torna', icon: 'RotateCw', desc: 'Dış/iç çap tornalama', feedKey: 'f' },
  { id: 'matkap', label: 'Matkap', route: '/matkap', icon: 'Drill', desc: 'Delik delme çevrimi', feedKey: 'f' },
  { id: 'dis', label: 'Kılavuz / Diş', route: '/dis', icon: 'Bolt', desc: 'Kılavuz, diş frezesi, torna dişi', feedKey: 'f' },
  { id: 'chatter', label: 'Chatter-Free', route: '/chatter-free', icon: 'AudioWaveform', desc: 'Helis boyu kadar dalma, HEM', feedKey: 'fz' },
];

export const TOOL_MATERIALS = [
  { id: 'karbur', label: 'Karbür' },
  { id: 'hss', label: 'HSS' },
];

export function groupLabel(id) {
  const g = GROUPS.find((x) => x.id === id);
  return g ? g.label : id;
}
export function groupShort(id) {
  const g = GROUPS.find((x) => x.id === id);
  return g ? g.short : id;
}
export function isoLabel(id) {
  const g = ISO_GROUPS.find((x) => x.id === id);
  return g ? g.label : id;
}
export function machinabilityLabel(id) {
  const m = MACHINABILITY.find((x) => x.id === id);
  return m ? m.label : id;
}
export function machinabilityTone(id) {
  const m = MACHINABILITY.find((x) => x.id === id);
  return m ? m.tone : 'primary';
}
export function coolantLabel(id) {
  const c = COOLANT_OPTIONS.find((x) => x.id === id);
  return c ? c.label : id;
}
export function coolantLifeFactor(id) {
  const c = COOLANT_OPTIONS.find((x) => x.id === id);
  return c && c.lifeFactor ? c.lifeFactor : 1;
}
export function opLabel(id) {
  const o = OPERATIONS.find((x) => x.id === id);
  return o ? o.label : id;
}
export function opRoute(id) {
  const o = OPERATIONS.find((x) => x.id === id);
  return o ? o.route : '/';
}

export function recommended(material, op, tool) {
  if (!material || !material.ops || !material.ops[op]) return null;
  return material.ops[op][tool] || material.ops[op].karbur || null;
}

export function midOf(range) {
  if (!range) return NaN;
  return (range[0] + range[1]) / 2;
}

export function hardnessText(m) {
  if (!m) return '';
  return m.hardness[0] === m.hardness[1]
    ? `${m.hardness[0]} ${m.hardnessScale}`
    : `${m.hardness[0]}–${m.hardness[1]} ${m.hardnessScale}`;
}

/** Kod, ad, alt bilgi ve TÜM standart karşılıkları (AISI/DIN/EN/TS/UNS) içinde arar */
export function matchesQuery(m, needle) {
  if (!needle) return true;
  const t = needle.toLocaleLowerCase('tr');
  if (m.code.toLocaleLowerCase('tr').includes(t)) return true;
  if (m.name.toLocaleLowerCase('tr').includes(t)) return true;
  if ((m.subtitle || '').toLocaleLowerCase('tr').includes(t)) return true;
  if ((m.subgroupLabel || '').toLocaleLowerCase('tr').includes(t)) return true;
  return (m.standards || []).some((s) => s.toLocaleLowerCase('tr').includes(t));
}

export function emptyCustomMaterial() {
  return {
    id: '',
    code: '',
    name: '',
    group: 'celik',
    isoGroup: 'P',
    subgroupLabel: 'Kullanıcı tanımlı',
    subtitle: '',
    standards: [],
    hardness: [200, 250],
    hardnessScale: 'HB',
    baseHB: 225,
    tensile: [600, 800],
    kc: 1900,
    machinability: 'orta',
    accent: 'primary',
    coolant: 'sivi',
    desc: '',
    tags: [],
    custom: true,
    ops: {
      freze: { karbur: { vc: [120, 160], fz: [0.05, 0.12] }, hss: { vc: [25, 40], fz: [0.03, 0.07] } },
      torna: { karbur: { vc: [160, 210], f: [0.15, 0.3] }, hss: { vc: [30, 45], f: [0.1, 0.2] } },
      matkap: { karbur: { vc: [70, 100], f: [0.12, 0.2] }, hss: { vc: [18, 28], f: [0.08, 0.15] } },
    },
  };
}

export const DEFAULT_DRAFTS = {
  freze: { tool: 'karbur', d: 12, z: 4, cornerR: 0.8, vc: 140, fz: 0.08, ap: 2, ae: 6, hardnessOverride: 0 },
  torna: { tool: 'karbur', d: 50, direction: 'od', noseR: 0.8, vc: 180, f: 0.22, ap: 1.5, targetRa: 1.6, hardnessOverride: 0 },
  matkap: { tool: 'karbur', d: 10, coolant: 'sivi', vc: 80, f: 0.16, depth: 30, peck: 0, hardnessOverride: 0 },
  dis: {
    mode: 'kilavuz',
    tool: 'hss',
    series: 'metrik-kaba',
    threadId: 'metrik-kaba-6',
    d: 6,
    pitch: 1,
    depth: 18,
    vc: 8,
    tapType: 'kesici',
    engagement: 75,
    toolD: 4,
    z: 3,
    fz: 0.04,
    threadLength: 18,
    internal: true,
    length: 25,
    passes: 0,
    hardnessOverride: 0,
  },
  chatter: {
    tool: 'karbur', d: 12, z: 4, fluteLength: 20, ap: 20, ae: 1.2,
    vc: 140, fz: 0.08, vcFactor: 1.2, chatterHz: 0, hardnessOverride: 0,
    slotWidth: 20, slotLength: 100, slotDepth: 20,
  },
};

export const DEFAULT_SETTINGS = {
  unitSystem: 'metric',
  limitEnabled: true,
  manualLimits: false,
  presetByOp: { ...AUTO_PRESET },
  manual: { maxRpm: 12000, maxFeed: 15000, powerKw: 11 },
  efficiency: 0.8,
  // takım ömrü & maliyet
  refLife: 15,
  targetLife: 30,
  currency: 'TL',
  hourlyRate: 600,
  toolPrice: 1200,
  toolEdges: 4,
  partMinutes: 2,
};

export function resolveLimits(op, settings) {
  if (!settings || !settings.limitEnabled) return null;
  if (settings.manualLimits) {
    const m = settings.manual || {};
    const limits = {};
    if (Number(m.maxRpm) > 0) limits.maxRpm = Number(m.maxRpm);
    if (Number(m.maxFeed) > 0) limits.maxFeed = Number(m.maxFeed);
    if (Number(m.powerKw) > 0) limits.powerKw = Number(m.powerKw);
    return Object.keys(limits).length ? limits : null;
  }
  const presetId = (settings.presetByOp && settings.presetByOp[op]) || AUTO_PRESET[op];
  const preset = MACHINE_PRESETS[presetId];
  if (!preset) return null;
  return { maxRpm: preset.maxRpm, maxFeed: preset.maxFeed, powerKw: preset.powerKw, label: preset.label };
}

export function activeLimitLabel(op, settings) {
  if (!settings || !settings.limitEnabled) return 'Tezgâh limiti kapalı';
  if (settings.manualLimits) return 'Manuel limit';
  const presetId = (settings.presetByOp && settings.presetByOp[op]) || AUTO_PRESET[op];
  const preset = MACHINE_PRESETS[presetId];
  return preset ? preset.label : 'Otomatik';
}

export function presetsForOp(op) {
  return Object.entries(MACHINE_PRESETS)
    .filter(([, p]) => !p.ops || p.ops.includes(op))
    .map(([id, p]) => ({ id, ...p }));
}
