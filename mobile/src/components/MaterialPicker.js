import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers3, Search, Star, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { GROUPS, groupShort, machinabilityLabel, machinabilityTone, recommended } from '../data/materials';
import { formatRange } from '../lib/units';
import { Eyebrow, Row, StatusChip } from './Primitives';
import { colors, radius, spacing, fonts } from '../theme';

/** Aktif malzeme ozet karti */
export function MaterialSummaryCard({ material, onChange, testID = 'active-material-card' }) {
  if (!material) return null;
  return (
    <View style={styles.summaryCard} testID={testID}>
      <View style={styles.summaryIcon}>
        <Layers3 size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow>Malzeme</Eyebrow>
        <Text style={styles.summaryName} numberOfLines={1} testID="active-material-name">
          {material.code} {material.name}
          <Text style={styles.summaryHardness}>
            {' '}· {material.hardness[0] === material.hardness[1]
              ? `${material.hardness[0]} ${material.hardnessScale}`
              : `${material.hardness[0]}–${material.hardness[1]} ${material.hardnessScale}`}
          </Text>
        </Text>
      </View>
      <Pressable onPress={onChange} testID="change-material-button" style={styles.summaryBtn}>
        <Text style={styles.summaryBtnText}>Değiştir</Text>
      </Pressable>
    </View>
  );
}

/** Alttan acilan malzeme secici (arama + favoriler + tum liste) */
export function MaterialPickerDrawer({ open, onOpenChange, op = 'freze', tool = 'karbur', onSelect }) {
  const { materials, favorites, activeMaterialId, unitSystem } = useApp();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    return materials.filter((m) => {
      if (group !== 'all' && m.group !== group) return false;
      if (!needle) return true;
      return (
        m.code.toLocaleLowerCase('tr').includes(needle)
        || m.name.toLocaleLowerCase('tr').includes(needle)
        || (m.subtitle || '').toLocaleLowerCase('tr').includes(needle)
      );
    });
  }, [materials, query, group]);

  const favList = filtered.filter((m) => favorites.includes(m.id));
  const restList = filtered.filter((m) => !favorites.includes(m.id));
  const sections = [];
  if (favList.length) sections.push({ title: `SIK KULLANILANLAR`, data: favList });
  if (restList.length) sections.push({ title: `TÜM MALZEMELER · ${restList.length}`, data: restList });

  const renderRow = (m) => {
    const rec = recommended(m, op, tool);
    return (
      <Row
        key={m.id}
        icon={Layers3}
        iconTone={m.id === activeMaterialId ? 'primary' : 'muted'}
        title={`${m.code} · ${m.name}`}
        subtitle={rec ? `Vc ${formatRange('vc', rec.vc, unitSystem)} ${unitSystem === 'imperial' ? 'SFM' : 'm/dk'}` : m.subtitle}
        onPress={() => { onSelect(m); onOpenChange(false); }}
        testID={`picker-material-${m.id}`}
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {m.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
            {favorites.includes(m.id) ? <Star size={15} color={colors.primary} fill={colors.primary} /> : null}
            <StatusChip tone={machinabilityTone(m.machinability)}>{machinabilityLabel(m.machinability)}</StatusChip>
          </View>
        )}
      />
    );
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <View style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={() => onOpenChange(false)} />
        <View style={[styles.sheet, { maxHeight: '85%', paddingBottom: insets.bottom + spacing.lg }]} testID="material-picker-drawer">
          <View style={styles.sheetHeaderTop}>
            <View>
              <Eyebrow>MALZEME SEÇ</Eyebrow>
              <Text style={styles.sheetTitle}>Kütüphane</Text>
            </View>
            <Pressable onPress={() => onOpenChange(false)} testID="picker-close" style={styles.closeBtn}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Kod veya ad ara"
              placeholderTextColor={colors.mutedForeground}
              testID="picker-search"
              style={styles.searchInput}
            />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', short: 'Tümü' }, ...GROUPS]}
            keyExtractor={(g) => g.id}
            style={{ marginTop: spacing.md, flexGrow: 0 }}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item: g }) => (
              <Pressable
                onPress={() => setGroup(g.id)}
                testID={`picker-group-${g.id}`}
                style={[styles.groupChip, group === g.id ? styles.groupChipActive : styles.groupChipInactive]}
              >
                <Text style={[styles.groupChipText, group === g.id && { color: colors.primaryForeground }]}>
                  {g.short || groupShort(g.id)}
                </Text>
              </Pressable>
            )}
          />
          {filtered.length === 0 ? (
            <Text style={styles.emptyText} testID="picker-empty">Sonuç bulunamadı</Text>
          ) : (
            <FlatList
              data={sections}
              keyExtractor={(s) => s.title}
              style={{ marginTop: spacing.md }}
              renderItem={({ item: section }) => (
                <View style={{ marginBottom: spacing.lg }}>
                  <Eyebrow style={{ marginBottom: spacing.sm }}>{section.title}</Eyebrow>
                  <View style={styles.listCard}>
                    {section.data.map((m, idx) => (
                      <View key={m.id} style={idx < section.data.length - 1 && styles.divider}>
                        {renderRow(m)}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  summaryIcon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  summaryName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  summaryHardness: { fontFamily: fonts.body, color: colors.mutedForeground },
  summaryBtn: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summaryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sheetHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  closeBtn: { height: 36, width: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md, marginTop: spacing.md },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.foreground },
  groupChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  groupChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  groupChipInactive: { borderColor: colors.border, backgroundColor: colors.background },
  groupChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  emptyText: { textAlign: 'center', paddingVertical: spacing.xxl, fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground },
  listCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(17,23,25,0.4)', overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderColor: colors.border },
});
