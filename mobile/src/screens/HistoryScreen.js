import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bolt, CircleDotDashed, Drill, History as HistoryIcon, RotateCcw, RotateCw, Share2, SlidersHorizontal, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { EmptyState, IconButton, PrimaryButton, ScreenHeader, ScreenShell } from '../components/Primitives';
import { buildShareText, describeRecord, groupByDay, shareText, todayStats } from '../lib/records';
import { formatNumber, formatQty, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill, dis: Bolt };
const OP_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'freze', label: 'Freze' },
  { id: 'torna', label: 'Torna' },
  { id: 'matkap', label: 'Matkap' },
  { id: 'dis', label: 'Kılavuz / Diş' },
];
const SCREEN_MAP = { freze: 'Freze', torna: 'Torna', matkap: 'Matkap', dis: 'Dis' };

export default function HistoryScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { history, deleteHistory, clearHistory, unitSystem } = useApp();
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => (filter === 'all' ? history : history.filter((r) => r.op === filter)), [history, filter]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const stats = useMemo(() => todayStats(history), [history]);

  const handleShare = async (rec) => {
    const res = await shareText(buildShareText(rec, unitSystem, rec.materialName));
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell testID="history-screen">
      <ScreenHeader eyebrow="HESAPLAMA KAYITLARI" title="Geçmiş" right={<IconButton icon={SlidersHorizontal} label="Geçmişi filtrele" tone={showFilters ? 'primary' : 'muted'} testID="toggle-filters" onPress={() => setShowFilters((s) => !s)} />}>
        <View style={styles.statsBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
            <View>
              <Text style={styles.statsTotal} testID="today-total">{stats.total} HESAPLAMA</Text>
              <Text style={styles.statsLabel}>Bugün tamamlandı</Text>
            </View>
            <Text style={styles.statsBreakdown}>{stats.counts.freze} Freze · {stats.counts.torna} Torna{'\n'}{stats.counts.matkap} Matkap · {stats.counts.dis} Diş</Text>
          </View>
        </View>

        {showFilters ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} testID="history-filters">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {OP_FILTERS.map((f) => (
                <Pressable key={f.id} onPress={() => setFilter(f.id)} testID={`history-filter-${f.id}`} style={[styles.filterChip, filter === f.id ? styles.filterChipActive : styles.filterChipInactive]}>
                  <Text style={[styles.filterChipText, filter === f.id && { color: colors.primaryForeground }]}>{f.label}</Text>
                </Pressable>
              ))}
              {history.length ? (
                <Pressable onPress={() => { clearHistory(); toast.success('Geçmiş temizlendi'); }} testID="clear-history" style={styles.clearChip}>
                  <Text style={styles.clearChipText}>Tümünü sil</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </ScreenHeader>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xxl }}>
        {groups.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="Kayıt yok" body="Bir hesaplama yapıp 'Hesaplamayı Kaydet' dediğinizde burada listelenir." action={<PrimaryButton onPress={() => navigation.navigate('HesaplaTab')}>Hesaplamaya Başla</PrimaryButton>} testID="history-empty" />
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{g.label}</Text>
                <View style={styles.groupLine} />
                <Text style={styles.groupDate}>{g.date}</Text>
              </View>
              <View style={styles.card}>
                {g.items.map((rec, idx) => {
                  const d = describeRecord(rec, unitSystem);
                  const Icon = OP_ICONS[rec.op] || CircleDotDashed;
                  const fnRec = Number.isFinite(rec.outputs.fn) ? rec.outputs.fn : (rec.outputs.n > 0 ? rec.outputs.vf / rec.outputs.n : NaN);
                  return (
                    <View key={rec.id} style={[{ flexDirection: 'row' }, idx < g.items.length - 1 && styles.divider]} testID={`history-row-${rec.id}`}>
                      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
                        <View style={{ flexDirection: 'row', gap: spacing.md }}>
                          <View style={styles.rowIcon}><Icon size={20} color={colors.accent} /></View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
                              <Text style={styles.rowTitle} numberOfLines={1}>{d.title} <Text style={{ fontFamily: fonts.body, color: colors.mutedForeground }}>· {d.material}</Text></Text>
                              <Text style={styles.rowTime}>{d.time}</Text>
                            </View>
                            {d.subtitle ? <Text style={styles.rowSubtitle}>{d.subtitle}</Text> : null}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                              <View style={styles.valuePill}><Text style={styles.valuePillNumberPrimary}>{formatNumber(rec.outputs.n, 0)} <Text style={styles.valuePillUnit}>{unitLabel('rpm', unitSystem)}</Text></Text></View>
                              <View style={styles.valuePill}><Text style={styles.valuePillNumberAccent}>{formatQty('vf', rec.outputs.vf, unitSystem)} <Text style={styles.valuePillUnit}>{unitLabel('vf', unitSystem)} · G94</Text></Text></View>
                              {Number.isFinite(fnRec) ? (
                                <View style={styles.valuePill} testID={`history-fn-${rec.id}`}><Text style={styles.valuePillNumberPrimary}>{formatQty('f', fnRec, unitSystem, { decimals: 3 })} <Text style={styles.valuePillUnit}>{unitLabel('f', unitSystem)} · G95</Text></Text></View>
                              ) : null}
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
                              <Pressable onPress={() => navigation.navigate(SCREEN_MAP[rec.op] || 'Freze', { recordId: rec.id })} testID={`reopen-${rec.id}`} style={styles.actionLink}>
                                <RotateCcw size={13} color={colors.primary} />
                                <Text style={styles.actionLinkText}>Yeniden aç</Text>
                              </Pressable>
                              <Pressable onPress={() => handleShare(rec)} testID={`share-${rec.id}`} style={styles.actionLink}>
                                <Share2 size={13} color={colors.mutedForeground} />
                                <Text style={[styles.actionLinkText, { color: colors.mutedForeground }]}>Paylaş</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                      <Pressable onPress={() => { deleteHistory(rec.id); toast.success('Kayıt silindi'); }} testID={`delete-${rec.id}`} style={styles.deleteBtn}>
                        <Trash2 size={16} color={colors.destructiveForeground} />
                        <Text style={styles.deleteText}>SİL</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {history.length ? (
          <Text style={styles.footerText}>Toplam {history.length} kayıt · yalnızca bu cihazda saklanır</Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statsBlock: { marginTop: spacing.lg, borderLeftWidth: 2, borderColor: colors.primary, paddingLeft: spacing.md },
  statsTotal: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.primary },
  statsLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.foreground, marginTop: 2 },
  statsBreakdown: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.mutedForeground, textAlign: 'right' },
  filterChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterChipInactive: { borderColor: colors.border, backgroundColor: colors.card },
  filterChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  clearChip: { borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(231,104,92,0.5)', backgroundColor: 'rgba(231,104,92,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  clearChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.destructive },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  groupLabel: { fontFamily: fonts.headingSemiBold, fontSize: 18, color: colors.foreground },
  groupLine: { flex: 1, height: 1, backgroundColor: colors.border },
  groupDate: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
  rowIcon: { height: 40, width: 40, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  rowTime: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground },
  rowSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  valuePill: { backgroundColor: colors.muted, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  valuePillNumberPrimary: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.primary },
  valuePillNumberAccent: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.accent },
  valuePillUnit: { fontFamily: fonts.bodySemiBold, fontSize: 9, color: colors.mutedForeground },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLinkText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  deleteBtn: { width: 56, borderLeftWidth: 1, borderColor: colors.border, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.6, color: colors.destructiveForeground },
  footerText: { textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.mutedForeground },
});
