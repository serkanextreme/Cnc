import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_DRAFTS,
  DEFAULT_FAVORITES,
  DEFAULT_MATERIAL_ID,
  DEFAULT_SETTINGS,
  SEED_MATERIALS,
} from '../data/materials';
import { KEYS, loadAll, uid, writeJSON } from '../lib/storage';

const AppContext = createContext(null);

function mergeSettings(saved) {
  const s = saved || {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    manual: { ...DEFAULT_SETTINGS.manual, ...(s.manual || {}) },
    presetByOp: { ...DEFAULT_SETTINGS.presetByOp, ...(s.presetByOp || {}) },
    feedModeByOp: { ...DEFAULT_SETTINGS.feedModeByOp, ...(s.feedModeByOp || {}) },
  };
}

function mergeDrafts(saved) {
  const s = saved || {};
  return {
    freze: { ...DEFAULT_DRAFTS.freze, ...(s.freze || {}) },
    torna: { ...DEFAULT_DRAFTS.torna, ...(s.torna || {}) },
    matkap: { ...DEFAULT_DRAFTS.matkap, ...(s.matkap || {}) },
    dis: { ...DEFAULT_DRAFTS.dis, ...(s.dis || {}) },
    chatter: { ...DEFAULT_DRAFTS.chatter, ...(s.chatter || {}) },
  };
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(() => mergeSettings({}));
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [customMaterials, setCustomMaterials] = useState([]);
  const [activeMaterialId, setActiveMaterialId] = useState(DEFAULT_MATERIAL_ID);
  const [drafts, setDrafts] = useState(() => mergeDrafts({}));
  const [tools, setTools] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadAll();
      if (!mounted) return;
      setSettings(mergeSettings(saved.settings));
      setHistory(Array.isArray(saved.history) ? saved.history : []);
      setFavorites(Array.isArray(saved.favorites) ? saved.favorites : DEFAULT_FAVORITES);
      setCustomMaterials(Array.isArray(saved.customMaterials) ? saved.customMaterials : []);
      setActiveMaterialId(saved.activeMaterial || DEFAULT_MATERIAL_ID);
      setDrafts(mergeDrafts(saved.drafts));
      setTools(Array.isArray(saved.tools) ? saved.tools : []);
      loadedRef.current = true;
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.settings, settings); }, [settings]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.history, history); }, [history]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.favorites, favorites); }, [favorites]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.customMaterials, customMaterials); }, [customMaterials]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.activeMaterial, activeMaterialId); }, [activeMaterialId]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.drafts, drafts); }, [drafts]);
  useEffect(() => { if (loadedRef.current) writeJSON(KEYS.tools, tools); }, [tools]);

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

  /** Operasyon bazli tezgah F modu (G94 mm/dk | G95 mm/dev) */
  const setFeedModeForOp = useCallback((op, mode) => {
    setSettings((prev) => ({
      ...prev,
      feedMode: mode,
      feedModeByOp: { ...(prev.feedModeByOp || {}), [op]: mode === 'G94' ? 'G94' : 'G95' },
    }));
  }, []);

  /* ------------------------------------------------------------ favoriler */
  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  /* ------------------------------------------------------ ozel malzemeler */
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

  /* --------------------------------------------------------------- gecmis */
  const saveCalculation = useCallback((record) => {
    const entry = { id: uid(), createdAt: new Date().toISOString(), ...record };
    setHistory((prev) => [entry, ...prev].slice(0, 300));
    return entry;
  }, []);

  const deleteHistory = useCallback((id) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  /* ------------------------------------------------------------- takimlar */
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
    if (payload.settings) setSettings(mergeSettings(payload.settings));
    if (Array.isArray(payload.history)) setHistory(payload.history);
    if (Array.isArray(payload.favorites)) setFavorites(payload.favorites);
    if (Array.isArray(payload.customMaterials)) setCustomMaterials(payload.customMaterials);
    if (payload.activeMaterial) setActiveMaterialId(payload.activeMaterial);
    if (Array.isArray(payload.tools)) setTools(payload.tools);
    if (payload.drafts) setDrafts(mergeDrafts(payload.drafts));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      settings,
      updateSettings,
      updateManualLimit,
      setPresetForOp,
      setFeedModeForOp,
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
      ready, settings, updateSettings, updateManualLimit, setPresetForOp, setFeedModeForOp, history, saveCalculation,
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
