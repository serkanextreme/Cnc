import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_DRAFTS,
  DEFAULT_FAVORITES,
  DEFAULT_MATERIAL_ID,
  DEFAULT_SETTINGS,
  SEED_MATERIALS,
} from '../data/materials';
import { KEYS, readJSON, uid, writeJSON } from '../lib/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...readJSON(KEYS.settings, {}),
    manual: { ...DEFAULT_SETTINGS.manual, ...(readJSON(KEYS.settings, {}).manual || {}) },
    presetByOp: { ...DEFAULT_SETTINGS.presetByOp, ...(readJSON(KEYS.settings, {}).presetByOp || {}) },
  }));
  const [history, setHistory] = useState(() => readJSON(KEYS.history, []));
  const [favorites, setFavorites] = useState(() => readJSON(KEYS.favorites, DEFAULT_FAVORITES));
  const [customMaterials, setCustomMaterials] = useState(() => readJSON(KEYS.customMaterials, []));
  const [activeMaterialId, setActiveMaterialId] = useState(() => readJSON(KEYS.activeMaterial, DEFAULT_MATERIAL_ID));
  const [drafts, setDrafts] = useState(() => {
    const saved = readJSON(KEYS.drafts, {});
    return {
      freze: { ...DEFAULT_DRAFTS.freze, ...(saved.freze || {}) },
      torna: { ...DEFAULT_DRAFTS.torna, ...(saved.torna || {}) },
      matkap: { ...DEFAULT_DRAFTS.matkap, ...(saved.matkap || {}) },
      dis: { ...DEFAULT_DRAFTS.dis, ...(saved.dis || {}) },
    };
  });
  const [tools, setTools] = useState(() => readJSON(KEYS.tools, []));

  useEffect(() => {
    writeJSON(KEYS.settings, settings);
  }, [settings]);
  useEffect(() => {
    writeJSON(KEYS.history, history);
  }, [history]);
  useEffect(() => {
    writeJSON(KEYS.favorites, favorites);
  }, [favorites]);
  useEffect(() => {
    writeJSON(KEYS.customMaterials, customMaterials);
  }, [customMaterials]);
  useEffect(() => {
    writeJSON(KEYS.activeMaterial, activeMaterialId);
  }, [activeMaterialId]);
  useEffect(() => {
    writeJSON(KEYS.drafts, drafts);
  }, [drafts]);
  useEffect(() => {
    writeJSON(KEYS.tools, tools);
  }, [tools]);

  const materials = useMemo(() => [...SEED_MATERIALS, ...customMaterials], [customMaterials]);

  const materialById = useCallback(
    (id) => materials.find((m) => m.id === id) || null,
    [materials],
  );

  const activeMaterial = useMemo(
    () => materialById(activeMaterialId) || materials[0],
    [materialById, activeMaterialId, materials],
  );

  /* ------------------------------------------------------------- ayarlar */
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateManualLimit = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, manual: { ...prev.manual, ...patch } }));
  }, []);

  const setPresetForOp = useCallback((op, presetId) => {
    setSettings((prev) => ({ ...prev, presetByOp: { ...prev.presetByOp, [op]: presetId } }));
  }, []);

  /* ------------------------------------------------------------ favoriler */
  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  /* ------------------------------------------------------ özel malzemeler */
  const saveCustomMaterial = useCallback((material) => {
    const record = { ...material, custom: true };
    if (!record.id) record.id = `ozel-${uid()}`;
    setCustomMaterials((prev) => {
      const idx = prev.findIndex((m) => m.id === record.id);
      if (idx === -1) return [...prev, record];
      const next = [...prev];
      next[idx] = record;
      return next;
    });
    return record;
  }, []);

  const deleteCustomMaterial = useCallback((id) => {
    setCustomMaterials((prev) => prev.filter((m) => m.id !== id));
    setFavorites((prev) => prev.filter((x) => x !== id));
    setActiveMaterialId((prev) => (prev === id ? DEFAULT_MATERIAL_ID : prev));
  }, []);

  /* ---------------------------------------------------------------- taslak */
  const updateDraft = useCallback((op, patch) => {
    setDrafts((prev) => ({ ...prev, [op]: { ...prev[op], ...patch } }));
  }, []);

  const resetDraft = useCallback((op) => {
    setDrafts((prev) => ({ ...prev, [op]: { ...DEFAULT_DRAFTS[op] } }));
  }, []);

  /* --------------------------------------------------------------- geçmiş */
  const saveCalculation = useCallback((record) => {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...record };
    setHistory((prev) => [entry, ...prev].slice(0, 300));
    return entry;
  }, []);

  const deleteHistory = useCallback((id) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  /* ------------------------------------------------------------- takımlar */
  const saveTool = useCallback((tool) => {
    const record = { ...tool };
    if (!record.id) {
      record.id = `takim-${uid()}`;
      record.createdAt = new Date().toISOString();
      record.usedMinutes = record.usedMinutes || 0;
    }
    setTools((prev) => {
      const idx = prev.findIndex((t) => t.id === record.id);
      if (idx === -1) return [...prev, record];
      const next = [...prev];
      next[idx] = { ...next[idx], ...record };
      return next;
    });
    return record;
  }, []);

  const deleteTool = useCallback((id) => {
    setTools((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToolUsage = useCallback((id, minutes) => {
    setTools((prev) => prev.map((t) => (
      t.id === id ? { ...t, usedMinutes: Math.max(0, (t.usedMinutes || 0) + Number(minutes || 0)) } : t
    )));
  }, []);

  const resetToolUsage = useCallback((id) => {
    setTools((prev) => prev.map((t) => (
      t.id === id ? { ...t, usedMinutes: 0, edgeIndex: (t.edgeIndex || 1) + 1 } : t
    )));
  }, []);

  const replaceAll = useCallback((payload) => {
    if (payload.settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...payload.settings,
        manual: { ...DEFAULT_SETTINGS.manual, ...(payload.settings.manual || {}) },
        presetByOp: { ...DEFAULT_SETTINGS.presetByOp, ...(payload.settings.presetByOp || {}) },
      });
    }
    if (Array.isArray(payload.history)) setHistory(payload.history);
    if (Array.isArray(payload.favorites)) setFavorites(payload.favorites);
    if (Array.isArray(payload.customMaterials)) setCustomMaterials(payload.customMaterials);
    if (payload.activeMaterial) setActiveMaterialId(payload.activeMaterial);
    if (Array.isArray(payload.tools)) setTools(payload.tools);
    if (payload.drafts) {
      setDrafts({
        freze: { ...DEFAULT_DRAFTS.freze, ...(payload.drafts.freze || {}) },
        torna: { ...DEFAULT_DRAFTS.torna, ...(payload.drafts.torna || {}) },
        matkap: { ...DEFAULT_DRAFTS.matkap, ...(payload.drafts.matkap || {}) },
        dis: { ...DEFAULT_DRAFTS.dis, ...(payload.drafts.dis || {}) },
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      updateManualLimit,
      setPresetForOp,
      unitSystem: settings.unitSystem,
      history,
      saveCalculation,
      deleteHistory,
      clearHistory,
      favorites,
      toggleFavorite,
      materials,
      materialById,
      customMaterials,
      saveCustomMaterial,
      deleteCustomMaterial,
      activeMaterial,
      activeMaterialId,
      setActiveMaterialId,
      drafts,
      updateDraft,
      resetDraft,
      tools,
      saveTool,
      deleteTool,
      addToolUsage,
      resetToolUsage,
      replaceAll,
    }),
    [
      settings, updateSettings, updateManualLimit, setPresetForOp, history, saveCalculation,
      deleteHistory, clearHistory, favorites, toggleFavorite, materials, materialById,
      customMaterials, saveCustomMaterial, deleteCustomMaterial, activeMaterial,
      activeMaterialId, drafts, updateDraft, resetDraft, replaceAll,
      tools, saveTool, deleteTool, addToolUsage, resetToolUsage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
