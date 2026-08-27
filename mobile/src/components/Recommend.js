import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Lightbulb, Wand2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { formatRange, unitLabel } from '../lib/units';
import { Eyebrow, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

/** Onerilen aralik karti - items: [{ key, label, kind, range, current, status, statusLabel, onApply }] */
export function RecommendPanel({ items, onApplyAll, testID = 'recommend-panel' }) {
  const { unitSystem } = useApp();
  return (
    <View testID={testID}>
      <View style={styles.head}>
        <View>
          <Eyebrow>MALZEME ÖNERISI</Eyebrow>
          <Text style={styles.titleMd}>Önerilen aralık</Text>
        </View>
        {onApplyAll ? (
          <Pressable onPress={onApplyAll} testID="apply-all-recommended" style={styles.applyAll}>
            <Wand2 size={15} color={colors.primary} />
            <Text style={styles.applyAllText}>Tümünü uygula</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.card}>
        {items.map((item, idx) => (
          <View key={item.key} style={[styles.row, idx < items.length - 1 && styles.divider]}>
            <View style={styles.icon}>
              <Lightbulb size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowSub}>{formatRange(item.kind, item.range, unitSystem)} {unitLabel(item.kind, unitSystem)}</Text>
            </View>
            <StatusChip tone={item.status === 'ok' ? 'ok' : item.status === 'warn' ? 'warn' : 'error'}>{item.statusLabel}</StatusChip>
            <Pressable onPress={item.onApply} testID={`apply-${item.key}`} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Uygula</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  applyAll: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 2 },
  applyAllText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  applyBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  applyBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primary },
});
