import React, { useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Bolt, Check, CircleDotDashed, Coins, Download, Drill, Gauge, Lock, RotateCw, Ruler,
  Timer, Trash2, TriangleAlert, Upload, WifiOff,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { exportAll, importAll } from '../lib/storage';
import { MACHINE_PRESETS, presetsForOp, SEED_MATERIALS } from '../data/materials';
import {
  Eyebrow, GhostButton, IconButton, ListCard, NumericField, ScreenHeader, ScreenShell,
  SectionHeading, SegmentedToggle, StatusChip,
} from '../components/Primitives';
import { FEED_MODE_OPS, FEED_MODES, resolveFeedMode } from '../lib/feed';
import { formatNumber, UNIT_SYSTEMS } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OPS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed },
  { id: 'torna', label: 'Torna', icon: RotateCw },
  { id: 'matkap', label: 'Matkap', icon: Drill },
  { id: 'dis', label: 'Kılavuz / Diş', icon: Bolt },
];

const CURRENCIES = [
  { id: 'TL', label: 'TL' },
  { id: 'USD', label: 'USD' },
  { id: 'EUR', label: 'EUR' },
];

function Checkbox({ checked, onChange, testID }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      testID={testID}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked ? <Check size={13} color={colors.primaryForeground} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const {
    settings, updateSettings, updateManualLimit, setPresetForOp, setFeedModeForOp,
    history, customMaterials, clearHistory, replaceAll, tools,
  } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      const payload = await exportAll();
      const json = JSON.stringify(payload, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}talas-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Talaş yedeğini paylaş' });
      }
      toast.success('Yedek hazırlandı', { description: canShare ? 'Paylaşım penceresinden kaydedin' : fileUri });
    } catch (err) {
      toast.error('Yedek alınamadı');
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || !result.assets[0]) { setBusy(false); return; }
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const payload = JSON.parse(text);
      await importAll(payload);
      replaceAll(payload);
      toast.success('Yedek geri yüklendi');
    } catch (err) {
      toast.error('Geçersiz yedek dosyası');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell testId="settings-screen">
      <ScreenHeader eyebrow="SİSTEM" title="Ayarlar" right={<IconButton icon={Gauge} label="Ayarlar" tone="primary" />} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        {/* Birim sistemi */}
        <View>
          <SectionHeading eyebrow="BİRİMLER" title="Birim sistemi" />
          <ListCard>
            <View style={styles.fieldBlock}>
              <View style={styles.rowIconLabel}>
                <Ruler size={16} color={colors.primary} />
                <Text style={styles.fieldLabel}>Ölçü birimi seçin</Text>
              </View>
              <SegmentedToggle
                options={UNIT_SYSTEMS.map((u) => ({ id: u.id, label: u.label }))}
                value={settings.unitSystem}
                onChange={(v) => {
                  updateSettings({ unitSystem: v });
                  toast.success(v === 'metric' ? 'Metrik sisteme geçildi' : 'İnç sistemine geçildi');
                }}
                testID="unit-system-toggle"
                style={{ marginTop: spacing.sm }}
              />
              <View style={styles.unitGrid}>
                {UNIT_SYSTEMS.map((u) => (
                  <View key={u.id} style={[styles.unitCell, settings.unitSystem === u.id ? styles.unitCellActive : styles.unitCellInactive]}>
                    <Text style={[styles.unitCellTitle, settings.unitSystem === u.id && { color: colors.primary }]}>{u.label}</Text>
                    <Text style={styles.unitCellNote}>{u.note}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ListCard>
        </View>

        {/* Tezgâh F modu */}
        <View>
          <SectionHeading
            eyebrow="TEZGÂH F MODU"
            title="İlerleme birimi (G94 / G95)"
            right={<StatusChip tone="accent" testID="settings-feed-mode-chip">Ekran bazlı</StatusChip>}
          />
          <View style={[styles.card, { borderColor: colors.primary }]}>
            <View style={styles.warnBanner}>
              <TriangleAlert size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.warnBannerText}>
                <Text style={styles.warnBannerStrong}>G94 = mm/dk</Text> (tam sayı, ör. F1188) ·{' '}
                <Text style={styles.warnBannerStrong}>G95 = mm/dev</Text> (ör. F0.16). Freze ve işleme merkezleri
                genelde <Text style={styles.warnBannerStrong}>G94</Text>, torna kumandaları genelde{' '}
                <Text style={styles.warnBannerStrong}>G95</Text> okur. Her ekran için ayrı ayarlayın — seçtiğiniz
                mod o ekranın sonuç kartında ana değer olur, diğeri her zaman alt satırda görünür.
              </Text>
            </View>
            {FEED_MODE_OPS.map((op, idx) => {
              const active = resolveFeedMode(settings, op.id);
              return (
                <View key={op.id} style={[styles.fieldBlock, idx === FEED_MODE_OPS.length - 1 ? null : styles.divider]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.fieldLabel}>{op.label}</Text>
                    <StatusChip tone={active === 'G94' ? 'accent' : 'ok'} testID={`settings-feed-mode-chip-${op.id}`}>
                      {active === 'G94' ? 'mm/dk · G94' : 'mm/dev · G95'}
                    </StatusChip>
                  </View>
                  <SegmentedToggle
                    options={FEED_MODES.map((m) => ({ id: m.id, label: m.label }))}
                    value={active}
                    onChange={(v) => {
                      setFeedModeForOp(op.id, v);
                      toast.success(`${op.label}: ${v === 'G95' ? 'mm/dev (G95)' : 'mm/dk (G94)'}`);
                    }}
                    testID={`settings-feed-mode-${op.id}`}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              );
            })}
            <View style={styles.divider} />
            <NumericField
              id="settings-max-feed-per-rev"
              label="Maksimum ilerleme (mm/dev)"
              hint="Bu değer aşılırsa kırmızı kritik uyarı çıkar"
              kind="f"
              value={settings.maxFeedPerRev || 0}
              onChange={(v) => updateSettings({ maxFeedPerRev: Math.max(0, v) })}
              testID="settings-max-feed-per-rev"
            />
          </View>
        </View>

        {/* Tezgâh limitleri */}
        <View>
          <SectionHeading
            eyebrow="TEZGÂH"
            title="Devir limitleri"
            right={(
              <StatusChip tone={settings.limitEnabled ? 'ok' : 'neutral'}>
                {settings.limitEnabled ? (settings.manualLimits ? 'Manuel' : 'Otomatik') : 'Kapalı'}
              </StatusChip>
            )}
          />
          <ListCard>
            <View style={styles.switchRow}>
              <View style={styles.iconBox}><Gauge size={18} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.fieldLabel}>Tezgâh limitini uygula</Text>
                <Text style={styles.rowSub}>Sonuçlar tezgâh kapasitesine göre otomatik sınırlanır</Text>
              </View>
              <Switch
                value={settings.limitEnabled}
                onValueChange={(v) => updateSettings({ limitEnabled: !!v })}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.card}
                testID="settings-limit-switch"
              />
            </View>
            <Pressable onPress={() => updateSettings({ manualLimits: !settings.manualLimits })} style={styles.manualRow} testID="settings-manual-row">
              <Checkbox checked={settings.manualLimits} onChange={(v) => updateSettings({ manualLimits: v })} testID="settings-manual-checkbox" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.fieldLabel}>Manuel değer gir</Text>
                <Text style={styles.rowSub}>
                  {settings.manualLimits ? 'Aşağıdaki alanlar aktif' : 'Kapalı — tezgâh tipine göre otomatik, giriş devre dışı'}
                </Text>
              </View>
              {!settings.manualLimits ? <Lock size={14} color={colors.mutedForeground} /> : null}
            </Pressable>
            <NumericField
              id="settings-max-rpm"
              label="Maksimum iş mili devri"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="rpm"
              value={settings.manual.maxRpm}
              onChange={(v) => updateManualLimit({ maxRpm: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testID="settings-max-rpm"
            />
            <NumericField
              id="settings-max-feed"
              label="Maksimum ilerleme"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="vf"
              value={settings.manual.maxFeed}
              onChange={(v) => updateManualLimit({ maxFeed: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testID="settings-max-feed"
            />
            <NumericField
              id="settings-power"
              label="İş mili gücü"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="power"
              value={settings.manual.powerKw}
              onChange={(v) => updateManualLimit({ powerKw: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testID="settings-power"
            />
          </ListCard>

          <View style={[styles.presetsWrap, (settings.manualLimits || !settings.limitEnabled) && { opacity: 0.5 }]}>
            {OPS.map((op) => {
              const presets = presetsForOp(op.id);
              const activeId = settings.presetByOp[op.id];
              const active = MACHINE_PRESETS[activeId];
              return (
                <View key={op.id} style={styles.presetCard}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowIconLabel}>
                      <op.icon size={16} color={colors.accent} />
                      <Text style={styles.fieldLabel}>{op.label} tezgâhı</Text>
                    </View>
                    <Text style={styles.presetActiveValue}>{active ? `${formatNumber(active.maxRpm, 0)} dev/dk` : '—'}</Text>
                  </View>
                  <View style={styles.presetChipsRow}>
                    {presets.map((p) => (
                      <Pressable
                        key={p.id}
                        disabled={settings.manualLimits || !settings.limitEnabled}
                        onPress={() => setPresetForOp(op.id, p.id)}
                        testID={`settings-preset-${op.id}-${p.id}`}
                        style={[styles.presetChip, activeId === p.id ? styles.presetChipActive : styles.presetChipInactive]}
                      >
                        <Text style={[styles.presetChipLabel, activeId === p.id && { color: colors.primary }]}>{p.label}</Text>
                        <Text style={styles.presetChipNote}>{p.note}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Hesaplama */}
        <View>
          <SectionHeading eyebrow="HESAPLAMA" title="İş mili verimi" />
          <ListCard>
            <NumericField
              id="settings-efficiency"
              label="Verim (η)"
              hint="Güç hesabında kullanılır · 0,60–1,00"
              kind="deg"
              unitOverride="η"
              value={settings.efficiency}
              onChange={(v) => updateSettings({ efficiency: Math.min(Math.max(v, 0.3), 1) })}
              testID="settings-efficiency"
            />
          </ListCard>
        </View>

        {/* Takım ömrü ve maliyet */}
        <View>
          <SectionHeading
            eyebrow="TAKIM ÖMRÜ"
            title="Ömür ve maliyet"
            right={<StatusChip tone="accent" icon={Timer}>T{settings.refLife || 15} dk</StatusChip>}
          />
          <ListCard>
            <View style={styles.switchRow}>
              <View style={styles.iconBox}><Coins size={18} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.fieldLabel}>Para birimi</Text>
                <Text style={styles.rowSub}>Maliyet hesaplarında kullanılır</Text>
              </View>
            </View>
            <View style={styles.fieldBlock}>
              <SegmentedToggle options={CURRENCIES} value={settings.currency || 'TL'} onChange={(v) => updateSettings({ currency: v })} testID="currency-toggle" />
            </View>
            <View style={styles.rowSplit}>
              <View style={styles.colHalfBorder}>
                <NumericField id="settings-ref-life" label="Referans ömür" hint="Taylor T_ref" kind="deg" unitOverride="dk" value={settings.refLife || 15} onChange={(v) => updateSettings({ refLife: Math.max(1, v) })} testID="settings-ref-life" />
              </View>
              <View style={{ flex: 1 }}>
                <NumericField id="settings-target-life" label="Hedef ömür" hint="Vc önerisi için" kind="deg" unitOverride="dk" value={settings.targetLife || 30} onChange={(v) => updateSettings({ targetLife: Math.max(1, v) })} testID="settings-target-life" />
              </View>
            </View>
            <View style={styles.rowSplit}>
              <View style={styles.colHalfBorder}>
                <NumericField id="settings-tool-price" label="Takım fiyatı" kind="deg" unitOverride={settings.currency || 'TL'} value={settings.toolPrice} onChange={(v) => updateSettings({ toolPrice: v })} testID="settings-tool-price" />
              </View>
              <View style={{ flex: 1 }}>
                <NumericField id="settings-tool-edges" label="Kesici ağız" kind="deg" unitOverride="adet" value={settings.toolEdges} onChange={(v) => updateSettings({ toolEdges: Math.max(1, Math.round(v)) })} testID="settings-tool-edges" />
              </View>
            </View>
            <View style={styles.rowSplit}>
              <View style={styles.colHalfBorder}>
                <NumericField id="settings-hourly" label="Tezgâh saat ücreti" kind="deg" unitOverride={`${settings.currency || 'TL'}/s`} value={settings.hourlyRate} onChange={(v) => updateSettings({ hourlyRate: v })} testID="settings-hourly-rate" />
              </View>
              <View style={{ flex: 1 }}>
                <NumericField id="settings-part-min" label="Parça süresi" kind="deg" unitOverride="dk" value={settings.partMinutes} onChange={(v) => updateSettings({ partMinutes: v })} testID="settings-part-minutes" />
              </View>
            </View>
          </ListCard>
          <Text style={styles.footnote}>Takım ömrü Taylor denklemi (Vc × T^n = C) ile hesaplanır; karbür n = 0,25, HSS n = 0,125.</Text>
        </View>

        {/* Veri yönetimi */}
        <View>
          <SectionHeading eyebrow="VERİ" title="Yedekleme" />
          <ListCard>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Cihazdaki veriler</Text>
              <Text style={styles.rowSub}>
                {history.length} hesap kaydı · {customMaterials.length} özel malzeme · {tools.length} takım ·{' '}
                {SEED_MATERIALS.length} hazır malzeme kalitesi
              </Text>
            </View>
            <View style={styles.actionsRow}>
              <GhostButton icon={Download} onPress={handleExport} testID="export-data" style={{ flex: 1 }}>Dışa aktar</GhostButton>
              <GhostButton icon={Upload} onPress={busy ? undefined : handleImport} testID="import-data" style={{ flex: 1 }}>
                {busy ? 'Yükleniyor…' : 'İçe aktar'}
              </GhostButton>
            </View>
            <View style={{ padding: spacing.lg }}>
              <GhostButton
                icon={Trash2}
                tone="destructive"
                onPress={() => { clearHistory(); toast.success('Geçmiş temizlendi'); }}
                testID="settings-clear-history"
                style={{ width: '100%' }}
              >
                Geçmişi temizle
              </GhostButton>
            </View>
          </ListCard>
        </View>

        {/* Uygulama */}
        <View>
          <SectionHeading eyebrow="UYGULAMA" title="Talaş" />
          <ListCard>
            <View style={styles.switchRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(93,187,135,0.15)' }]}>
                <WifiOff size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.fieldLabel}>Çevrimdışı çalışır</Text>
                <Text style={styles.rowSub}>Tüm hesaplamalar ve veriler cihazda; internet gerekmez.</Text>
              </View>
              <StatusChip tone="ok" testID="settings-offline-chip">Her zaman</StatusChip>
            </View>
            <View style={styles.fieldRowBetween}>
              <Text style={styles.fieldLabel}>Sürüm</Text>
              <Text style={styles.rowSub}>1.0.0</Text>
            </View>
          </ListCard>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  fieldBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  rowSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  rowIconLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBox: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  warnBanner: { flexDirection: 'row', gap: spacing.sm, backgroundColor: 'rgba(244,185,66,0.1)', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  warnBannerText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.cardForeground },
  warnBannerStrong: { fontFamily: fonts.bodyBold },
  unitGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  unitCell: { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  unitCellActive: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  unitCellInactive: { borderColor: colors.border, backgroundColor: colors.input },
  unitCellTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  unitCellNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  presetsWrap: { marginTop: spacing.md, gap: spacing.md },
  presetCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  presetActiveValue: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primary },
  presetChipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  presetChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  presetChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  presetChipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  presetChipLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  presetChipNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  rowSplit: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border },
  colHalfBorder: { flex: 1, borderRightWidth: 1, borderColor: colors.border },
  footnote: { marginTop: spacing.sm, fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground },
  actionsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
