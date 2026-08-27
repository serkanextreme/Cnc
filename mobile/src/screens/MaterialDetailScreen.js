import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Calculator, CircleDotDashed, Drill, Info, Layers3, Pencil, RotateCw, Star, TriangleAlert } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { groupLabel, isoLabel, machinabilityLabel, machinabilityTone, midOf, recommended, TOOL_MATERIALS } from '../data/materials';
import {
  BottomActionBar, Eyebrow, EmptyState, GhostButton, IconButton, PrimaryButton,
  ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, StatusChip,
} from '../components/Primitives';
import { formatRange, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OP_TABS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed, feedKey: 'fz', feedLabel: 'Diş başına ilerleme', feedSym: 'fz' },
  { id: 'torna', label: 'Torna', icon: RotateCw, feedKey: 'f', feedLabel: 'İlerleme', feedSym: 'f' },
  { id: 'matkap', label: 'Matkap', icon: Drill, feedKey: 'f', feedLabel: 'İlerleme', feedSym: 'f' },
];

export default function MaterialDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { materialById, favorites, toggleFavorite, setActiveMaterialId, updateDraft, unitSystem } = useApp();
  const [op, setOp] = useState('freze');
  const [tool, setTool] = useState('karbur');

  const material = materialById(route.params?.materialId);
  const rec = useMemo(() => (material ? recommended(material, op, tool) : null), [material, op, tool]);
  const tab = OP_TABS.find((t) => t.id === op);

  if (!material) {
    return (
      <ScreenShell testID="material-detail-screen">
        <ScreenHeader eyebrow="MALZEME DETAYI" title="Bulunamadı" onBack={() => navigation.goBack()} />
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
          <EmptyState icon={Layers3} title="Malzeme bulunamadı" body="Bu malzeme silinmiş olabilir." action={<PrimaryButton onPress={() => navigation.goBack()}>Kütüphaneye dön</PrimaryButton>} />
        </View>
      </ScreenShell>
    );
  }

  const isFav = favorites.includes(material.id);
  const hardnessText = material.hardness[0] === material.hardness[1] ? `${material.hardness[0]}` : `${material.hardness[0]}–${material.hardness[1]}`;

  const useInCalculation = () => {
    setActiveMaterialId(material.id);
    if (rec) {
      if (op === 'freze') updateDraft('freze', { tool, vc: Math.round(midOf(rec.vc)), fz: Number(midOf(rec.fz).toFixed(3)) });
      else if (op === 'torna') updateDraft('torna', { tool, vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) });
      else updateDraft('matkap', { tool, vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)), coolant: material.coolant });
    }
    toast.success(`${material.code} hesaplamada kullanılıyor`, { description: 'Önerilen değerler yüklendi' });
    const screenMap = { freze: 'Freze', torna: 'Torna', matkap: 'Matkap' };
    navigation.navigate(screenMap[op] || 'Freze');
  };

  const otherOps = OP_TABS.filter((t) => t.id !== op);

  return (
    <ScreenShell
      testID="material-detail-screen"
      footer={(
        <BottomActionBar>
          <GhostButton icon={Star} onPress={() => { toggleFavorite(material.id); toast.success(isFav ? 'Favoriden çıkarıldı' : 'Favorilere eklendi'); }} testID="detail-favorite" style={{ width: 48, paddingHorizontal: 0 }} />
          <PrimaryButton icon={Calculator} onPress={useInCalculation} testID="use-in-calculation">Hesaplamada Kullan</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader
        eyebrow="MALZEME DETAYI"
        title={`${material.code} ${material.name}`}
        onBack={() => navigation.goBack()}
        right={material.custom ? (
          <IconButton icon={Pencil} label="Düzenle" tone="primary" testID="edit-material" onPress={() => navigation.navigate('MaterialForm', { materialId: material.id })} />
        ) : (
          <IconButton icon={Layers3} label="Malzeme" tone="accent" />
        )}
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <View style={styles.card}>
          <View style={styles.introBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.codeText}>{material.code}</Text>
              {material.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
            </View>
            <Text style={styles.nameText}>{material.name}</Text>
            <Text style={styles.descText}>{material.desc || material.subtitle}</Text>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridBorderRight]}>
              <Eyebrow>Sertlik</Eyebrow>
              <Text style={styles.gridValue} testID="detail-hardness">{hardnessText} <Text style={styles.gridUnit}>{material.hardnessScale}</Text></Text>
            </View>
            <View style={styles.gridCell}>
              <Eyebrow>Çekme dayanımı</Eyebrow>
              <Text style={styles.gridValue}>{material.tensile[0]}–{material.tensile[1]} <Text style={styles.gridUnit}>MPa</Text></Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridBorderRight]}>
              <Eyebrow>Grup</Eyebrow>
              <Text style={styles.gridSmallValue}>{groupLabel(material.group)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Eyebrow>Özgül kesme kuvveti</Eyebrow>
              <Text style={styles.gridSmallValue}>{material.kc} N/mm²</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridBorderRight]}>
              <Eyebrow>ISO grubu</Eyebrow>
              <Text style={styles.gridSmallValue} testID="detail-iso">{isoLabel(material.isoGroup)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Eyebrow>Sertlik (HB eşdeğeri)</Eyebrow>
              <Text style={styles.gridSmallValue}>{material.baseHB || '—'} HB</Text>
            </View>
          </View>
          {material.standards && material.standards.length ? (
            <View style={styles.standardsBlock}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Standart karşılıkları</Eyebrow>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} testID="detail-standards">
                {material.standards.map((st) => (
                  <View key={st} style={styles.standardChip}><Text style={styles.standardChipText}>{st}</Text></View>
                ))}
              </View>
              {material.subgroupLabel ? <Text style={styles.subgroupText}>{material.subgroupLabel}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <StatusChip tone={machinabilityTone(material.machinability)}>{machinabilityLabel(material.machinability)} işlenebilirlik</StatusChip>
          {(material.tags || []).map((t) => (
            <View key={t} style={styles.tagChip}><Text style={styles.tagChipText}>{t}</Text></View>
          ))}
        </View>

        <View>
          <SectionHeading eyebrow="KESİCİ VERİLERİ" title="Önerilen parametreler" right={<Text style={styles.mutedSmall}>{tool === 'hss' ? 'HSS takım' : 'Karbür takım'}</Text>} />

          <View style={styles.tabsRow}>
            {OP_TABS.map((t) => {
              const active = t.id === op;
              return (
                <Pressable key={t.id} onPress={() => setOp(t.id)} testID={`detail-tab-${t.id}`} style={styles.tabBtn}>
                  <t.icon size={16} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
                  {active ? <View style={styles.tabIndicator} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <SegmentedToggle options={TOOL_MATERIALS} value={tool} onChange={setTool} testID="detail-tool-toggle" />
          </View>

          <View style={[styles.card, { marginTop: spacing.md }]}>
            <View style={styles.tabHeadRow}>
              <View style={styles.tabHeadIcon}><tab.icon size={20} color={colors.accent} /></View>
              <View>
                <Text style={styles.tabHeadTitle}>{tab.label}</Text>
                <Text style={styles.mutedSmall}>{tool === 'hss' ? 'HSS' : 'Karbür'} takımlar için başlangıç aralığı</Text>
              </View>
            </View>
            <View style={styles.paramRow}>
              <View>
                <Eyebrow>Kesme hızı</Eyebrow>
                <Text style={styles.paramSub}>Vc</Text>
              </View>
              <Text style={styles.paramValuePrimary} testID="detail-vc">{rec ? formatRange('vc', rec.vc, unitSystem) : '—'} <Text style={styles.paramUnit}>{unitLabel('vc', unitSystem)}</Text></Text>
            </View>
            <View style={[styles.paramRow, styles.divider]}>
              <View>
                <Eyebrow>{tab.feedLabel}</Eyebrow>
                <Text style={styles.paramSub}>{tab.feedSym}</Text>
              </View>
              <Text style={styles.paramValue} testID="detail-feed">{rec ? formatRange(tab.feedKey, rec[tab.feedKey], unitSystem) : '—'} <Text style={styles.paramUnit}>{unitLabel(tab.feedKey, unitSystem)}</Text></Text>
            </View>
          </View>

          <View style={[styles.card, { marginTop: spacing.md }]}>
            <View style={styles.otherHeadRow}>
              <View style={styles.otherHeadIcon}><Info size={16} color={colors.accent} /></View>
              <Text style={styles.otherHeadTitle}>Diğer işlem başlangıç aralıkları</Text>
            </View>
            {otherOps.map((t) => {
              const r = recommended(material, t.id, tool);
              return (
                <Pressable key={t.id} onPress={() => setOp(t.id)} testID={`other-op-${t.id}`} style={[styles.otherRow, styles.divider]}>
                  <View style={styles.otherIcon}><t.icon size={18} color={colors.accent} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.otherTitle}>{t.label} <Text style={{ color: colors.mutedForeground, fontFamily: fonts.body }}>· {tool === 'hss' ? 'HSS' : 'Karbür'}</Text></Text>
                    <Text style={styles.otherSub}>
                      Kesme hızı <Text style={styles.otherSubStrong}>{r ? formatRange('vc', r.vc, unitSystem) : '—'} {unitLabel('vc', unitSystem)}</Text> · İlerleme{' '}
                      <Text style={styles.otherSubStrong}>{r ? formatRange(t.feedKey, r[t.feedKey], unitSystem) : '—'} {unitLabel(t.feedKey, unitSystem)}</Text>
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.noteBox}>
          <TriangleAlert size={18} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.noteText}>Değerler başlangıç aralığıdır. Takım çıkıntısı, soğutma, bağlama ve tezgâh rijitliğine göre ayarlayın.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  introBlock: { borderLeftWidth: 4, borderColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  codeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.primary },
  nameText: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.cardForeground, marginTop: 4 },
  descText: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground, marginTop: 8 },
  gridRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border },
  gridCell: { flex: 1, minWidth: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  gridBorderRight: { borderRightWidth: 1, borderColor: colors.border },
  gridValue: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.cardForeground, marginTop: 4 },
  gridUnit: { fontFamily: fonts.headingSemiBold, fontSize: 14 },
  gridSmallValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground, marginTop: 4 },
  standardsBlock: { borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  standardChip: { borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(85,198,195,0.4)', backgroundColor: 'rgba(85,198,195,0.1)', paddingHorizontal: 10, paddingVertical: 6 },
  standardChipText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  subgroupText: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: spacing.sm },
  tagChip: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tagChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.secondaryForeground },
  mutedSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, position: 'relative' },
  tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.primary },
  tabHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tabHeadIcon: { height: 40, width: 40, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  tabHeadTitle: { fontFamily: fonts.headingBold, fontSize: 18, textTransform: 'uppercase', color: colors.cardForeground },
  paramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  paramSub: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  paramValuePrimary: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.primary },
  paramValue: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.cardForeground },
  paramUnit: { fontFamily: fonts.headingSemiBold, fontSize: 16 },
  otherHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  otherHeadIcon: { height: 32, width: 32, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  otherHeadTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  otherIcon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  otherTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  otherSub: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  otherSubStrong: { fontFamily: fonts.bodySemiBold, color: colors.secondaryForeground },
  noteBox: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.mutedForeground },
});
