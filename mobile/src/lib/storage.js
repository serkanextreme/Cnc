/**
 * Cihaz icinde (offline) kalici depolama - AsyncStorage.
 * Internet gerekmez; hicbir veri sunucuya gonderilmez.
 * Web surumunden fark: tum okuma/yazma islemleri ASYNC'tir.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'talas.v1.';

export const KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  favorites: `${PREFIX}favorites`,
  customMaterials: `${PREFIX}customMaterials`,
  activeMaterial: `${PREFIX}activeMaterial`,
  drafts: `${PREFIX}drafts`,
  tools: `${PREFIX}tools`,
};

export async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn('storage read failed', key, err);
    return fallback;
  }
}

export async function writeJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('storage write failed', key, err);
    return false;
  }
}

export async function removeKey(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('storage remove failed', key, err);
  }
}

export async function loadAll() {
  const [settings, history, favorites, customMaterials, activeMaterial, drafts, tools] = await Promise.all([
    readJSON(KEYS.settings, null),
    readJSON(KEYS.history, []),
    readJSON(KEYS.favorites, []),
    readJSON(KEYS.customMaterials, []),
    readJSON(KEYS.activeMaterial, null),
    readJSON(KEYS.drafts, {}),
    readJSON(KEYS.tools, []),
  ]);
  return { settings, history, favorites, customMaterials, activeMaterial, drafts, tools };
}

export async function exportAll() {
  const all = await loadAll();
  return {
    app: 'talas',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...all,
  };
}

export async function importAll(payload) {
  if (!payload || payload.app !== 'talas') {
    throw new Error('Gecersiz yedek dosyasi');
  }
  const jobs = [];
  if (payload.settings) jobs.push(writeJSON(KEYS.settings, payload.settings));
  if (Array.isArray(payload.history)) jobs.push(writeJSON(KEYS.history, payload.history));
  if (Array.isArray(payload.favorites)) jobs.push(writeJSON(KEYS.favorites, payload.favorites));
  if (Array.isArray(payload.customMaterials)) jobs.push(writeJSON(KEYS.customMaterials, payload.customMaterials));
  if (payload.activeMaterial) jobs.push(writeJSON(KEYS.activeMaterial, payload.activeMaterial));
  if (payload.drafts) jobs.push(writeJSON(KEYS.drafts, payload.drafts));
  if (Array.isArray(payload.tools)) jobs.push(writeJSON(KEYS.tools, payload.tools));
  await Promise.all(jobs);
  return true;
}

export function uid() {
  try {
    // eslint-disable-next-line no-undef
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) { /* noop */ }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
