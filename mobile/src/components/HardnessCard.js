import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gauge, RotateCcw } from 'lucide-react-native';
import { hardnessText } from '../data/materials';
import { formatNumber } from '../lib/units';
import { Eyebrow, NumericField, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

/** Olculen sertlik karti - ayni malzemenin farkli sertlik durumu icin oneri duzeltir. */
export function HardnessCard({ material, adjusted, value, onChange, op }) {
  if (!material) return null;
  const baseHB = Number(material.baseHB) || 0;
  const active = value > 0 && Math.abs(value - baseHB) > 0.5;
  const presets = [
    { label: 'Yumuşak', hb: Math.max(60, Math.round(baseHB * 0.7)) },
    { label: 'Katalog', hb: baseHB },
    { label: 'Sert', hb: Math.round(baseHB * 1.3) },
    { label: 'Çok sert', hb: Math.round(baseHB * 1.6) },
  ];
  const feedKey = op === 'freze' ? 'fz' : 'f';
  const before = material.ops[op] ? material.ops[op].karbur : null;
  const after = adjusted && adjusted.ops[op] ? adjusted.ops[op].karbur : null;

  return (
    <View testID="hardness-card">
      <View style={styles.head}>
        <View>
          <Eyebrow>SERTLIK DURUMU</Eyebrow>
          <Text style={styles.titleMd}>Ölçülen sertlik</Text>
        </View>
        <View style={{ paddingBottom: 2 }}>
          <StatusChip tone={active ? 'warn' : 'neutral'} icon={Gauge} testID="hardness-state">
            {active ? `${formatNumber(value, 0)} HB` : `Katalog · ${hardnessText(material)}`}
          </StatusChip>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.introWrap}>
          <Text style={styles.introText}>
            Aynı malzeme farklı sertlikte gelebilir. Ölçtüğünüz sertliği girin; önerilen kesme hızı, ilerleme ve
            kesme kuvveti otomatik düzeltilir.
          </Text>
          <View style={styles.presetRow}>
            {presets.map((p) => {
              const selected = (p.hb === baseHB && !active) || (active && Math.abs(value - p.hb) < 0.5);
              return (
                <Pressable
                  key={p.label}
                  onPress={() => onChange(p.hb === baseHB ? 0 : p.hb)}
                  testID={`hardness-preset-${p.label}`}
                  style={[styles.presetChip, selected ? styles.presetChipActive : styles.presetChipInactive]}
                >
                  <Text style={styles.presetLabel}>{p.label}</Text>
                  <Text style={styles.presetValue}>{p.hb} HB</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />
        <NumericField
          id={`hardness-${op}`}
          label="Ölçülen sertlik (HB)"
          hint={`Katalog: ${baseHB} HB · 0 = katalog değeri`}
          kind="deg"
          unitOverride="HB"
          value={value || 0}
          onChange={onChange}
          testID="input-hardness"
        />

        {active && before && after ? (
          <>
            <View style={styles.divider} />
            <View style={{ padding: spacing.lg }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Düzeltilmiş öneri (karbür)</Eyebrow>
              <View style={styles.compareGrid}>
                <View style={styles.compareCellMuted}>
                  <Text style={styles.compareLabelMuted}>Vc katalog</Text>
                  <Text style={styles.compareValueMuted}>{before.vc[0]}–{before.vc[1]}</Text>
                </View>
                <View style={styles.compareCellPrimary}>
                  <Text style={styles.compareLabelPrimary}>Vc düzeltilmiş</Text>
                  <Text style={styles.compareValuePrimary} testID="hardness-adjusted-vc">{after.vc[0]}–{after.vc[1]}</Text>
                </View>
                <View style={styles.compareCellMuted}>
                  <Text style={styles.compareLabelMuted}>kc katalog</Text>
                  <Text style={styles.compareValueMuted}>{material.kc}</Text>
                </View>
                <View style={styles.compareCellAccent}>
                  <Text style={styles.compareLabelAccent}>kc düzeltilmiş</Text>
                  <Text style={styles.compareValueAccent} testID="hardness-adjusted-kc">{adjusted.kc}</Text>
                </View>
              </View>
              <Text style={styles.feedNote}>
                {feedKey === 'fz' ? 'Diş başına ilerleme' : 'İlerleme'}: {after[feedKey][0]}–{after[feedKey][1]}
              </Text>
              <Pressable onPress={() => onChange(0)} testID="reset-hardness" style={styles.resetBtn}>
                <RotateCcw size={13} color={colors.mutedForeground} />
                <Text style={styles.resetText}>Katalog değerine dön</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  introWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  introText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.mutedForeground },
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  presetChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  presetChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  presetChipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  presetLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  presetValue: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  compareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compareCellMuted: { width: '47%', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  compareCellPrimary: { width: '47%', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  compareCellAccent: { width: '47%', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.accent, backgroundColor: 'rgba(85,198,195,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  compareLabelMuted: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground },
  compareLabelPrimary: { fontFamily: fonts.body, fontSize: 11, color: colors.primary },
  compareLabelAccent: { fontFamily: fonts.body, fontSize: 11, color: colors.accent },
  compareValueMuted: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.mutedForeground, marginTop: 2 },
  compareValuePrimary: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.primary, marginTop: 2 },
  compareValueAccent: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.accent, marginTop: 2 },
  feedNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: spacing.sm },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  resetText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.mutedForeground },
});
