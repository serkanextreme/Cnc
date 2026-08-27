import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, ChevronRight, LibraryBig, Layers3, Plus, Search, Star } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { GROUPS, MACHINABILITY, machinabilityLabel, machinabilityTone, matchesQuery, recommended } from '../data/materials';
import { EmptyState, Eyebrow, IconButton, ListCard, Row, ScreenHeader, ScreenShell, SectionHeading, StatusChip } from '../components/Primitives';
import { formatRange, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

export default function MaterialsScreen() {
  const navigation = useNavigation();
  const { materials, favorites, toggleFavorite, activeMaterialId, unitSystem } = useApp();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [mach, setMach] = useState('all');
  const [openGroup, setOpenGroup] = useState(null);
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    return materials.filter((m) => {
      if (group !== 'all' && m.group !== group) return false;
      if (mach !== 'all' && m.machinability !== mach) return false;
      if (!needle) return true;
      return matchesQuery(m, needle);
    });
  }, [materials, query, group, mach]);

  const filtersActive = query.trim() !== '' || group !== 'all' || mach !== 'all';
  const favMaterials = materials.filter((m) => favorites.includes(m.id));
  const customMats = materials.filter((m) => m.custom);

  const hardnessText = (m) => (m.hardness[0] === m.hardness[1] ? `${m.hardness[0]} ${m.hardnessScale}` : `${m.hardness[0]}–${m.hardness[1]} ${m.hardnessScale}`);

  const renderMaterialRow = (m) => {
    const rec = recommended(m, 'freze', 'karbur');
    const isFav = favorites.includes(m.id);
    return (
      <View key={m.id} style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => navigation.navigate('MaterialDetail', { materialId: m.id })} testID={`material-${m.id}`} style={styles.matRow}>
          {m.id === activeMaterialId ? <View style={styles.activeStripe} /> : null}
          <View style={[styles.matIcon, m.id === activeMaterialId && { backgroundColor: colors.primary }]}>
            <Layers3 size={20} color={m.id === activeMaterialId ? colors.primaryForeground : colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.matCode} numberOfLines={1}>{m.code}</Text>
              {m.id === activeMaterialId ? <Text style={styles.selectedTag}>SEÇİLİ</Text> : null}
              {m.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
            </View>
            <Text style={styles.matName} numberOfLines={1}>{m.name}{m.subtitle ? ` · ${m.subtitle}` : ''}</Text>
            <Text style={styles.matStandards} numberOfLines={1}>{(m.standards || []).slice(0, 4).join(' · ')}</Text>
            <Text style={styles.matMeta} numberOfLines={1}>{hardnessText(m)}{rec ? ` · Vc ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''}</Text>
            <View style={{ marginTop: spacing.sm }}>
              <StatusChip tone={machinabilityTone(m.machinability)}>{machinabilityLabel(m.machinability)}</StatusChip>
            </View>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={() => toggleFavorite(m.id)} testID={`fav-${m.id}`} style={styles.favBtn}>
          <Star size={20} color={isFav ? colors.primary : colors.mutedForeground} fill={isFav ? colors.primary : 'transparent'} />
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenShell testID="materials-screen">
      <ScreenHeader eyebrow="TEKNİK KÜTÜPHANE" title="Malzemeler" right={<IconButton icon={LibraryBig} label="Kütüphane" tone="accent" />}>
        <View style={styles.searchRow}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Malzeme ara" placeholderTextColor={colors.mutedForeground} testID="material-search" style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[{ id: 'all', short: 'Malzeme türü' }, ...GROUPS].map((g) => (
              <Pressable key={g.id} onPress={() => setGroup(g.id)} testID={`filter-group-${g.id}`} style={[styles.filterChip, group === g.id ? styles.filterChipActive : styles.filterChipInactive]}>
                <Text style={[styles.filterChipText, group === g.id && { color: colors.primaryForeground }]}>{g.short}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[{ id: 'all', label: 'İşlenebilirlik' }, ...MACHINABILITY].map((mc) => (
              <Pressable key={mc.id} onPress={() => setMach(mc.id)} testID={`filter-mach-${mc.id}`} style={[styles.filterChip, mach === mc.id ? styles.filterChipActive : styles.filterChipInactive]}>
                <Text style={[styles.filterChipText, mach === mc.id && { color: colors.primaryForeground }]}>{mc.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScreenHeader>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <Pressable onPress={() => navigation.navigate('MaterialForm')} testID="add-material-button" style={styles.addBtn}>
          <View style={styles.addBtnIcon}><Plus size={20} color={colors.primaryForeground} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.addBtnTitle}>Kendi malzememi ekle</Text>
            <Text style={styles.addBtnSub}>Kendi Vc / ilerleme aralıklarınızı kaydedin</Text>
          </View>
          <ChevronRight size={18} color={colors.primaryForeground} />
        </Pressable>

        {filtersActive ? (
          <View>
            <SectionHeading
              eyebrow={`SONUÇLAR · ${filtered.length} MALZEME`}
              title="Filtreli liste"
              right={<Pressable onPress={() => { setQuery(''); setGroup('all'); setMach('all'); }} testID="clear-filters"><Text style={styles.linkText}>Filtreleri temizle</Text></Pressable>}
            />
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="Sonuç bulunamadı" body="Arama veya filtreleri değiştirip yeniden deneyin." testID="materials-empty" />
            ) : (
              <>
                <ListCard testID="filtered-list">{filtered.slice(0, limit).map(renderMaterialRow)}</ListCard>
                {filtered.length > limit ? (
                  <Pressable onPress={() => setLimit((l) => l + 40)} testID="load-more" style={styles.loadMoreBtn}>
                    <Text style={styles.linkText}>{filtered.length - limit} malzeme daha göster</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <>
            <View>
              <SectionHeading eyebrow="HIZLI SEÇİM" title="Sık kullanılanlar" right={<Text style={styles.countText}>{favMaterials.length} malzeme</Text>} />
              {favMaterials.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Favori yok</Text>
                  <Text style={styles.emptyBody}>Yıldız ikonuna dokunarak favori ekleyin.</Text>
                </View>
              ) : (
                <ListCard testID="favorites-list">{favMaterials.map(renderMaterialRow)}</ListCard>
              )}
            </View>

            {customMats.length ? (
              <View>
                <SectionHeading eyebrow="BENİM MALZEMELERİM" title="Özel kayıtlar" />
                <ListCard testID="custom-list">{customMats.map(renderMaterialRow)}</ListCard>
              </View>
            ) : null}

            <View>
              <SectionHeading eyebrow="TÜM MALZEMELER" title="Kütüphane" right={<Text style={styles.countText}>{materials.length} kalite</Text>} />
              <ListCard testID="group-list">
                {GROUPS.map((g) => {
                  const items = materials.filter((m) => m.group === g.id);
                  const isOpen = openGroup === g.id;
                  return (
                    <View key={g.id}>
                      <Row
                        icon={Layers3}
                        iconTone={isOpen ? 'secondary' : 'muted'}
                        title={g.label}
                        subtitle={items.map((m) => m.code).join(', ')}
                        onPress={() => setOpenGroup(isOpen ? null : g.id)}
                        testID={`group-${g.id}`}
                        right={(
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.countText}>{items.length}</Text>
                            {isOpen ? <ChevronDown size={18} color={colors.primary} /> : <ChevronRight size={18} color={colors.mutedForeground} />}
                          </View>
                        )}
                      />
                      {isOpen ? <View testID={`group-items-${g.id}`}>{items.map(renderMaterialRow)}</View> : null}
                    </View>
                  );
                })}
              </ListCard>
            </View>
          </>
        )}

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Değerler başlangıç aralığıdır. Takım çıkıntısı, soğutma, bağlama ve tezgâh rijitliğine göre ayarlayın.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.foreground },
  filterChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterChipInactive: { borderColor: colors.border, backgroundColor: colors.card },
  filterChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  addBtnIcon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: 'rgba(23,32,31,0.12)', alignItems: 'center', justifyContent: 'center' },
  addBtnTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryForeground },
  addBtnSub: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(23,32,31,0.8)', marginTop: 2 },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  loadMoreBtn: { alignSelf: 'center', marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  countText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.mutedForeground },
  emptyBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  emptyBody: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  matRow: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, position: 'relative' },
  activeStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary },
  matIcon: { height: 40, width: 40, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  matCode: { fontFamily: fonts.headingSemiBold, fontSize: 15, color: colors.cardForeground },
  selectedTag: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary },
  matName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.cardForeground, marginTop: 2 },
  matStandards: { fontFamily: fonts.body, fontSize: 11, color: colors.accent, marginTop: 2 },
  matMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  favBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderColor: colors.border },
  noteBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noteText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.mutedForeground },
});
