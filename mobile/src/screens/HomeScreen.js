import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bolt, ChevronRight, CircleDotDashed, Drill, Ruler, RotateCw, Settings2, WifiOff,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/MaterialPicker';
import { Eyebrow, IconButton, ListCard, Row, ScreenHeader, ScreenShell, SectionHeading, StatusChip } from '../components/Primitives';
import { describeRecord } from '../lib/records';
import { formatNumber, formatQty, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill, dis: Bolt };

export default function HomeScreen() {
  const navigation = useNavigation();
  const { activeMaterial, setActiveMaterialId, history, unitSystem, settings } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const recent = useMemo(() => history.slice(0, 3), [history]);

  return (
    <ScreenShell testID="home-screen">
      <ScreenHeader
        eyebrow="CNC PARAMETRELERİ"
        title="İşlem ve malzeme"
        right={(
          <IconButton icon={Settings2} label="Ayarlar" tone="primary" testID="header-settings" onPress={() => navigation.navigate('AyarlarTab')} />
        )}
      >
        <View style={styles.chipsRow}>
          <StatusChip tone="accent" icon={WifiOff} testID="offline-chip">İnternetsiz çalışır</StatusChip>
          <StatusChip tone="neutral" icon={Ruler}>{settings.unitSystem === 'imperial' ? 'İnç · SFM' : 'Metrik · mm'}</StatusChip>
        </View>
      </ScreenHeader>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <View>
          <View style={styles.opsHead}>
            <View>
              <Eyebrow>HESAPLAMA</Eyebrow>
              <Text style={styles.titleMd}>İşlem türü</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <Pressable onPress={() => navigation.navigate('Freze')} testID="op-freze" style={styles.opFeatured}>
              <View style={styles.opFeaturedTop}>
                <View style={styles.opFeaturedIcon}><CircleDotDashed size={24} color={colors.primaryForeground} /></View>
                <ChevronRight size={20} color={colors.primaryForeground} />
              </View>
              <View style={styles.opFeaturedBottom}>
                <View>
                  <Text style={styles.opFeaturedTitle}>Freze</Text>
                  <Text style={styles.opFeaturedDesc}>Kanal, cep ve yüzey frezeleme</Text>
                </View>
                <Text style={styles.opFeaturedMeta}>Kesme hızı{'\n'}Devir · İlerleme</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Torna')} testID="op-torna" style={styles.opCard}>
              <View style={styles.opCardTop}>
                <View style={styles.opCardIcon}><RotateCw size={20} color={colors.accent} /></View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
              <Text style={styles.opCardTitle}>Torna</Text>
              <Text style={styles.opCardDesc}>Kesme hızı{'\n'}Devir · İlerleme</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Matkap')} testID="op-matkap" style={styles.opCard}>
              <View style={styles.opCardTop}>
                <View style={styles.opCardIcon}><Drill size={20} color={colors.accent} /></View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
              <Text style={styles.opCardTitle}>Matkap</Text>
              <Text style={styles.opCardDesc}>Kesme hızı{'\n'}Devir · İlerleme</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Dis')} testID="op-dis" style={styles.opWide}>
              <View style={styles.opWideIcon}><Bolt size={20} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.opCardTitle}>Kılavuz / Diş</Text>
                <Text style={styles.opCardDesc}>Kılavuz · Diş frezesi · Tornada diş çekme</Text>
              </View>
              <ChevronRight size={18} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        <View>
          <SectionHeading
            eyebrow="HIZLI ERİŞİM"
            title="Son kullanılan"
            right={(
              <Pressable onPress={() => navigation.navigate('GecmisTab')} testID="see-all-history">
                <Text style={styles.linkText}>Tümünü gör</Text>
              </Pressable>
            )}
          />
          {recent.length === 0 ? (
            <View style={styles.emptyRecent} testID="recent-empty">
              <Text style={styles.emptyTitle}>Henüz hesap kaydı yok</Text>
              <Text style={styles.emptyBody}>Bir işlem seçip hesaplayın, sonucu kaydettiğinizde burada görünecek.</Text>
            </View>
          ) : (
            <ListCard>
              {recent.map((rec) => {
                const d = describeRecord(rec, unitSystem);
                const Icon = OP_ICONS[rec.op] || CircleDotDashed;
                const screenMap = { freze: 'Freze', torna: 'Torna', matkap: 'Matkap', dis: 'Dis' };
                return (
                  <Row
                    key={rec.id}
                    icon={Icon}
                    iconTone="muted"
                    title={`${d.title} · ${d.material}`}
                    subtitle={`${formatNumber(rec.outputs.n, 0)} ${unitLabel('rpm', unitSystem)} · ${formatQty('vf', rec.outputs.vf, unitSystem)} ${unitLabel('vf', unitSystem)}`}
                    onPress={() => navigation.navigate(screenMap[rec.op] || 'Freze', { recordId: rec.id })}
                    chevron
                    testID={`recent-${rec.id}`}
                  />
                );
              })}
            </ListCard>
          )}
        </View>
      </View>

      <MaterialPickerDrawer open={pickerOpen} onOpenChange={setPickerOpen} op="freze" tool="karbur" onSelect={(m) => setActiveMaterialId(m.id)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  opsHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md },
  titleMd: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  opFeatured: { width: '100%', borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary, padding: spacing.lg },
  opFeaturedTop: { flexDirection: 'row', justifyContent: 'space-between' },
  opFeaturedIcon: { height: 44, width: 44, borderRadius: radius.md, backgroundColor: 'rgba(23,32,31,0.12)', alignItems: 'center', justifyContent: 'center' },
  opFeaturedBottom: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  opFeaturedTitle: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.primaryForeground },
  opFeaturedDesc: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(23,32,31,0.8)', marginTop: 4 },
  opFeaturedMeta: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.primaryForeground, textAlign: 'right', lineHeight: 16 },
  opCard: { width: '47.5%', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.lg },
  opCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  opCardIcon: { height: 40, width: 40, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  opCardTitle: { fontFamily: fonts.headingSemiBold, fontSize: 20, color: colors.foreground, marginTop: spacing.lg },
  opCardDesc: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.mutedForeground, marginTop: 4 },
  opWide: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(85,198,195,0.5)', backgroundColor: colors.card, padding: spacing.lg },
  opWideIcon: { height: 44, width: 44, borderRadius: radius.md, backgroundColor: 'rgba(85,198,195,0.15)', alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  emptyRecent: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  emptyBody: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
});
