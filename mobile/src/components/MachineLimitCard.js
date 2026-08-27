import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Check, Gauge, Lock, Wand2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { activeLimitLabel, presetsForOp, resolveLimits } from '../data/materials';
import { formatNumber } from '../lib/units';
import { ClampNotice, Eyebrow, NumericField, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

function Checkbox({ checked, onChange, testID }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      testID={testID}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
    >
      {checked ? <Check size={13} color={colors.primaryForeground} /> : null}
    </Pressable>
  );
}

/**
 * Tezgah limiti karti.
 * - Varsayilan: OTOMATIK (tezgah tipi preseti) - kullanici deger girmek zorunda degil
 * - "Manuel deger gir" isaretlenmedikce sayi alanlari DEVRE DISI
 */
export function MachineLimitCard({ op, clamped, notes }) {
  const { settings, updateSettings, updateManualLimit } = useApp();
  const limits = resolveLimits(op, settings);
  const presets = presetsForOp(op);
  const activePreset = (settings.presetByOp && settings.presetByOp[op]) || presets[0]?.id;

  return (
    <View testID="machine-limit-card">
      <View style={styles.head}>
        <View>
          <Eyebrow>TEZGÂH</Eyebrow>
          <Text style={styles.titleMd}>Devir limiti</Text>
        </View>
        <View style={{ paddingBottom: 2 }}>
          <StatusChip tone={settings.limitEnabled ? (clamped ? 'warn' : 'ok') : 'neutral'} testID="limit-state-chip">
            {settings.limitEnabled ? activeLimitLabel(op, settings) : 'Kapalı'}
          </StatusChip>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.icon}><Gauge size={18} color={colors.accent} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Tezgâh limitini uygula</Text>
            <Text style={styles.rowSub}>Devir ve ilerleme tezgâh kapasitesini aşmayacak şekilde otomatik sınırlanır</Text>
          </View>
          <Switch
            value={settings.limitEnabled}
            onValueChange={(v) => updateSettings({ limitEnabled: !!v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.card}
            testID="limit-enabled-switch"
          />
        </View>

        {settings.limitEnabled ? (
          <>
            <View style={styles.divider} />
            <View style={[styles.presetWrap, settings.manualLimits && { opacity: 0.5 }]}>
              <View style={styles.presetTop}>
                <Text style={styles.rowMeta}>Tezgâh tipi (otomatik)</Text>
                <Wand2 size={14} color={colors.primary} />
              </View>
              <View style={styles.presetRow}>
                {presets.map((p) => {
                  const active = activePreset === p.id && !settings.manualLimits;
                  return (
                    <Pressable
                      key={p.id}
                      disabled={settings.manualLimits}
                      onPress={() => updateSettings({ presetByOp: { ...settings.presetByOp, [op]: p.id } })}
                      testID={`preset-${p.id}`}
                      style={[styles.presetChip, active ? styles.presetChipActive : styles.presetChipInactive]}
                    >
                      <Text style={[styles.presetLabel, active && { color: colors.primary }]}>{p.label}</Text>
                      <Text style={styles.presetNote}>{p.note}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />
            <Pressable onPress={() => updateSettings({ manualLimits: !settings.manualLimits })} style={styles.manualRow}>
              <Checkbox checked={settings.manualLimits} onChange={(v) => updateSettings({ manualLimits: v })} testID="manual-limits-checkbox" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>Manuel değer gir</Text>
                <Text style={styles.rowSub}>
                  {settings.manualLimits ? 'Kendi tezgâh değerlerinizi girin' : 'Kapalı — tezgâh değerleri otomatik alınır, giriş devre dışı'}
                </Text>
              </View>
              {!settings.manualLimits ? <Lock size={14} color={colors.mutedForeground} /> : null}
            </Pressable>

            <View style={styles.divider} />
            <NumericField
              id="limit-max-rpm"
              label="Maksimum iş mili devri"
              hint={settings.manualLimits ? 'Manuel' : `Otomatik: ${formatNumber(limits?.maxRpm || 0, 0)} dev/dk`}
              kind="rpm"
              value={settings.manualLimits ? settings.manual.maxRpm : limits?.maxRpm || 0}
              onChange={(v) => updateManualLimit({ maxRpm: v })}
              disabled={!settings.manualLimits}
              testID="limit-max-rpm"
            />
            <View style={styles.divider} />
            <NumericField
              id="limit-max-feed"
              label="Maksimum ilerleme"
              hint={settings.manualLimits ? 'Manuel' : `Otomatik: ${formatNumber(limits?.maxFeed || 0, 0)} mm/dk`}
              kind="vf"
              value={settings.manualLimits ? settings.manual.maxFeed : limits?.maxFeed || 0}
              onChange={(v) => updateManualLimit({ maxFeed: v })}
              disabled={!settings.manualLimits}
              testID="limit-max-feed"
            />
          </>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.md }}>
        {clamped ? (
          <ClampNotice tone="warn" title="Tezgâh limiti uygulandi" body="Hesap, tezgâh kapasitesine göre düşürüldü. Efektif kesme hızı yeniden hesaplandi." notes={notes} />
        ) : (
          <ClampNotice
            tone="ok"
            title={settings.limitEnabled ? 'Tezgâh limiti içinde' : 'Tezgâh limiti uygulanmadi'}
            body={settings.limitEnabled ? 'Hesaplanan devir ve ilerleme tezgâh kapasitesinin altında.' : 'Limit kapalı; teorik değerler gösteriliyor.'}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  rowSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  rowMeta: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mutedForeground },
  presetWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  presetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  presetChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  presetChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  presetChipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  presetLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  presetNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
});
