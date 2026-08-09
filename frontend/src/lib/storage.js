/**
 * Cihaz içi (offline) kalıcı depolama — localStorage.
 * İnternet gerekmez; hiçbir veri sunucuya gönderilmez.
 */

const PREFIX = 'talas.v1.';

export const KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  favorites: `${PREFIX}favorites`,
  customMaterials: `${PREFIX}customMaterials`,
  activeMaterial: `${PREFIX}activeMaterial`,
  drafts: `${PREFIX}drafts`,
};

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn('storage read failed', key, err);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('storage write failed', key, err);
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('storage remove failed', key, err);
  }
}

export function exportAll() {
  return {
    app: 'talas',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: readJSON(KEYS.settings, null),
    history: readJSON(KEYS.history, []),
    favorites: readJSON(KEYS.favorites, []),
    customMaterials: readJSON(KEYS.customMaterials, []),
    activeMaterial: readJSON(KEYS.activeMaterial, null),
    drafts: readJSON(KEYS.drafts, null),
  };
}

export function importAll(payload) {
  if (!payload || payload.app !== 'talas') {
    throw new Error('Geçersiz yedek dosyası');
  }
  if (payload.settings) writeJSON(KEYS.settings, payload.settings);
  if (Array.isArray(payload.history)) writeJSON(KEYS.history, payload.history);
  if (Array.isArray(payload.favorites)) writeJSON(KEYS.favorites, payload.favorites);
  if (Array.isArray(payload.customMaterials)) writeJSON(KEYS.customMaterials, payload.customMaterials);
  if (payload.activeMaterial) writeJSON(KEYS.activeMaterial, payload.activeMaterial);
  if (payload.drafts) writeJSON(KEYS.drafts, payload.drafts);
  return true;
}

export function uid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
