import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheck, Sigma, TriangleAlert } from 'lucide-react-native';
import { Eyebrow, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

const VALUE_TONES = {
  primary: colors.primary,
  accent: colors.accent,
  foreground: colors.foreground,
  destructive: colors.destructive,
  success: colors.success,
};

function MetricCell({ label, value, unit, sub, subTone = 'muted', tone = 'foreground', testID, style }) {
  return (
    <View style={[styles.metricCell, style]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: VALUE_TONES[tone] }]} testID={testID}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      {sub ? (
        <Text style={[styles.metricSub, subTone === 'destructive' && { color: colors.destructive }]} testID={testID ? `${testID}-sub` : undefined}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Canli sonuc karti - metrics: [{label,value,unit,tone,testID}] extras: [{...}] */
export function ResultCard({
  eyebrow = 'CANLI SONUÇ', title, status = 'ok', statusLabel, metrics = [], extras = [], footer, testID = 'result-card',
}) {
  const invalid = status === 'error';
  const [first, second, ...restMetrics] = metrics;
  const chipTone = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'error';
  const StatusIcon = status === 'ok' ? CircleCheck : TriangleAlert;

  return (
    <View testID={testID}>
      <View style={styles.headRow}>
        <View>
          <Text style={styles.primaryEyebrow}>{eyebrow}</Text>
          <Text style={styles.titleMd}>{title}</Text>
        </View>
        <View style={{ paddingBottom: 2 }}>
          <StatusChip tone={chipTone} icon={StatusIcon} testID="result-status">{statusLabel}</StatusChip>
        </View>
      </View>

      <View style={[styles.card, { borderColor: invalid ? colors.destructive : colors.primary }]}>
        <View style={[styles.stripe, { backgroundColor: invalid ? colors.destructive : colors.primary }]} />
        <View style={styles.grid}>
          {first ? <MetricCell {...first} style={[styles.cellBorder, styles.cellBorderRight]} /> : null}
          {second ? <MetricCell {...second} style={styles.cellBorder} /> : null}
          {restMetrics.map((m) => (
            <MetricCell key={m.label} {...m} style={[styles.cellBorder, { width: '100%' }]} />
          ))}
          {extras.map((x, idx) => (
            <View key={x.label} style={[styles.extraRow, idx < extras.length - 1 || footer ? styles.cellBorder : null]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.metricLabel}>{x.label}</Text>
                {x.note ? <Text style={styles.extraNote}>{x.note}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.extraValue, { color: VALUE_TONES[x.tone || 'accent'] }]} testID={x.testID}>{x.value}</Text>
                {x.unit ? <Text style={styles.metricUnit}>{x.unit}</Text> : null}
              </View>
            </View>
          ))}
        </View>
        {footer}
      </View>
    </View>
  );
}

export function FormulaPanel({ rows, title = 'Formüller', eyebrow = 'DOĞRULAMA', testID = 'formula-panel' }) {
  return (
    <View testID={testID}>
      <View style={{ marginBottom: spacing.md }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={styles.titleMd}>{title}</Text>
      </View>
      <View style={styles.formulaCard}>
        <View style={styles.formulaHead}>
          <Sigma size={18} color={colors.accent} />
          <Text style={styles.formulaHeadText}>Girilen değerlerle doğrulandı</Text>
        </View>
        {rows.map((row, idx) => (
          <View key={row.expr} style={[styles.formulaRow, idx < rows.length - 1 && styles.cellBorder]} testID="formula-row">
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.formulaExpr}>{row.expr}</Text>
              {row.note ? <Text style={styles.formulaNote}>{row.note}</Text> : null}
            </View>
            <View style={styles.formulaTag}>
              <Text style={styles.formulaTagText}>{row.tag || 'Doğrulandı'}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  primaryEyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.primary },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  card: { borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.card, overflow: 'hidden' },
  stripe: { height: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellBorder: { borderBottomWidth: 1, borderColor: colors.border },
  cellBorderRight: { borderRightWidth: 1 },
  metricCell: { width: '50%', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  metricLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mutedForeground },
  metricValue: { fontFamily: fonts.headingBold, fontSize: 30, marginTop: 4 },
  metricUnit: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground, marginTop: 4 },
  metricSub: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  extraRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  extraNote: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.cardForeground, marginTop: 2 },
  extraValue: { fontFamily: fonts.headingBold, fontSize: 18 },
  formulaCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  formulaHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  formulaHeadText: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mutedForeground },
  formulaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  formulaExpr: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.cardForeground },
  formulaNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  formulaTag: { backgroundColor: colors.muted, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4 },
  formulaTagText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.mutedForeground },
});
