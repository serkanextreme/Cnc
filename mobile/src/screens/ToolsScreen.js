import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Bolt, CircleDotDashed, Drill, Plus, RefreshCw, RotateCw, Save, Trash2, TriangleAlert, Wrench, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { OPERATIONS, TOOL_MATERIALS } from '../data/materials';
import { EmptyState, Eyebrow, GhostButton, IconButton, NumericField, PrimaryButton, ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, StatusChip } from '../components/Primitives';
import { formatNumber } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill, dis: Bolt };

const emptyTool = () => ({ id: '', name: '', op: 'freze', type: 'karbur', diameter: 12, edges: 4, price: 1200, lifeMinutes: 15, usedMinutes: 0, note: '' });

export default function ToolsScreen() {
  const { tools, saveTool, deleteTool, addToolUsage, resetToolUsage, settings } = useApp();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const cur = settings.currency || 'TL';

  const sorted = useMemo(() => [...tools].sort((a, b) => {
    const pa = a.lifeMinutes > 0 ? (a.usedMinutes || 0) / a.lifeMinutes : 0;
    const pb = b.lifeMinutes > 0 ? (b.usedMinutes || 0) / b.lifeMinutes : 0;
    return pb - pa;
  }), [tools]);

  const warnCount = tools.filter((t) => t.lifeMinutes > 0 && (t.usedMinutes || 0) / t.lifeMinutes >= 0.8).length;

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Takım adı gerekli'); return; }
    saveTool({ ...form, name: form.name.trim() });
    toast.success(form.id ? 'Takım güncellendi' : 'Takım eklendi');
    setForm(null);
  };

  return (
    <ScreenShell testID="tools-screen">
      <ScreenHeader eyebrow="TAKIM YÖNETİMİ" title="Takımlarım" right={<IconButton icon={Plus} label="Takım ekle" tone="primary" testID="add-tool" onPress={() => setForm(emptyTool())} />}>
        <View style={styles.chipsRow}>
          <StatusChip tone="neutral" icon={Wrench}>{tools.length} takım</StatusChip>
          {warnCount ? (
            <StatusChip tone="warn" icon={TriangleAlert} testID="tools-warning">{warnCount} takım ömür sonuna yakın</StatusChip>
          ) : (
            <StatusChip tone="ok">Ömürler güvenli aralıkta</StatusChip>
          )}
        </View>
      </ScreenHeader>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        {form ? (
          <View testID="tool-form">
            <SectionHeading
              eyebrow={form.id ? 'DÜZENLE' : 'YENİ TAKIM'}
              title={form.id ? 'Takımı güncelle' : 'Takım ekle'}
              right={<Pressable onPress={() => setForm(null)} testID="close-tool-form"><X size={16} color={colors.mutedForeground} /></Pressable>}
            />
            <View style={styles.card}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Takım adı</Text>
                <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="örn. Ø12 4 ağız karbür freze" placeholderTextColor={colors.mutedForeground} testID="tool-name" style={styles.textInput} />
              </View>
              <View style={[styles.fieldBlock, styles.divider]}>
                <Eyebrow style={{ marginBottom: spacing.sm }}>İşlem</Eyebrow>
                <SegmentedToggle options={OPERATIONS.map((o) => ({ id: o.id, label: o.label }))} value={form.op} onChange={(v) => setForm({ ...form, op: v })} testID="tool-op" />
              </View>
              <View style={[styles.fieldBlock, styles.divider]}>
                <Eyebrow style={{ marginBottom: spacing.sm }}>Takım malzemesi</Eyebrow>
                <SegmentedToggle options={TOOL_MATERIALS} value={form.type} onChange={(v) => setForm({ ...form, type: v })} testID="tool-type" />
              </View>
              <View style={[styles.rowSplit, styles.divider]}>
                <View style={styles.halfBorder}><NumericField id="tool-d" label="Çap" kind="length" value={form.diameter} onChange={(v) => setForm({ ...form, diameter: v })} testID="tool-diameter" /></View>
                <View style={{ flex: 1 }}><NumericField id="tool-edges" label="Kesici ağız" kind="deg" unitOverride="adet" value={form.edges} onChange={(v) => setForm({ ...form, edges: Math.max(1, Math.round(v)) })} testID="tool-edges" /></View>
              </View>
              <View style={[styles.rowSplit, styles.divider]}>
                <View style={styles.halfBorder}><NumericField id="tool-price" label="Fiyat" kind="deg" unitOverride={cur} value={form.price} onChange={(v) => setForm({ ...form, price: v })} testID="tool-price" /></View>
                <View style={{ flex: 1 }}><NumericField id="tool-life" label="Ömür bütçesi" kind="deg" unitOverride="dk" value={form.lifeMinutes} onChange={(v) => setForm({ ...form, lifeMinutes: v })} testID="tool-life" /></View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <GhostButton onPress={() => setForm(null)} testID="cancel-tool" style={{ flex: 1 }}>İptal</GhostButton>
              <PrimaryButton icon={Save} onPress={handleSave} testID="save-tool">Kaydet</PrimaryButton>
            </View>
          </View>
        ) : null}

        {sorted.length === 0 && !form ? (
          <EmptyState icon={Wrench} title="Takım yok" body="Takımlarınızı ekleyin; her hesapta kullanım süresini sayaca ekleyip ömür takibi yapabilirsiniz." action={<PrimaryButton icon={Plus} onPress={() => setForm(emptyTool())} testID="empty-add-tool">Takım Ekle</PrimaryButton>} testID="tools-empty" />
        ) : null}

        {sorted.length ? (
          <View>
            <SectionHeading eyebrow="KULLANIM SAYACI" title="Takım ömrü takibi" />
            <View style={{ gap: spacing.md }}>
              {sorted.map((t) => {
                const pct = t.lifeMinutes > 0 ? Math.min(100, ((t.usedMinutes || 0) / t.lifeMinutes) * 100) : 0;
                const tone = pct >= 100 ? 'error' : pct >= 80 ? 'warn' : 'ok';
                const barColor = pct >= 100 ? colors.destructive : pct >= 80 ? colors.primary : colors.success;
                const Icon = OP_ICONS[t.op] || Wrench;
                return (
                  <View key={t.id} style={styles.card} testID={`tool-${t.id}`}>
                    <View style={styles.toolTop}>
                      <View style={styles.toolIcon}><Icon size={20} color={colors.accent} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                          <Text style={styles.toolName} numberOfLines={1}>{t.name}</Text>
                          <StatusChip tone={tone}>%{formatNumber(pct, 0)}</StatusChip>
                        </View>
                        <Text style={styles.toolMeta}>Ø{formatNumber(t.diameter, 2)} mm · {t.edges} ağız · {t.type === 'hss' ? 'HSS' : 'Karbür'} · {formatNumber(t.price, 0)} {cur}</Text>
                        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} /></View>
                        <Text style={styles.toolUsage}>{formatNumber(t.usedMinutes || 0, 1)} / {formatNumber(t.lifeMinutes, 0)} dk kullanıldı{t.edgeIndex ? ` · ${t.edgeIndex}. uç` : ''}</Text>
                        {pct >= 80 ? (
                          <Text style={[styles.toolWarn, { color: pct >= 100 ? colors.destructive : colors.primary }]}>
                            {pct >= 100 ? 'Ömür doldu — ucu değiştirin' : "Ömrün %80'i doldu — takımı kontrol edin"}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.actionsRow}>
                      <Pressable onPress={() => { addToolUsage(t.id, 5); toast.success('5 dk eklendi'); }} testID={`usage5-${t.id}`} style={styles.actionBtn}><Text style={styles.actionText}>+5 dk</Text></Pressable>
                      <Pressable onPress={() => { addToolUsage(t.id, 30); toast.success('30 dk eklendi'); }} testID={`usage30-${t.id}`} style={styles.actionBtn}><Text style={styles.actionText}>+30 dk</Text></Pressable>
                      <Pressable onPress={() => { resetToolUsage(t.id); toast.success('Sayaç sıfırlandı — yeni uç'); }} testID={`reset-${t.id}`} style={styles.actionBtn}>
                        <RefreshCw size={13} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Yeni uç</Text>
                      </Pressable>
                      <Pressable onPress={() => { deleteTool(t.id); toast.success('Takım silindi'); }} testID={`delete-tool-${t.id}`} style={styles.actionBtn}>
                        <Trash2 size={13} color={colors.destructive} />
                        <Text style={[styles.actionText, { color: colors.destructive }]}>Sil</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => setForm({ ...t })} testID={`edit-tool-${t.id}`} style={styles.editBtn}>
                      <Text style={styles.editText}>Düzenle</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Ömür bütçesini hesap ekranındaki "Tahmini takım ömrü" değerine göre belirleyebilirsiniz. Hesap ekranından "Takım kullanımı kaydet" ile parça süresini doğrudan sayaca ekleyebilirsiniz.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  fieldBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  textInput: { marginTop: spacing.sm, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md, fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  rowSplit: { flexDirection: 'row' },
  halfBorder: { flex: 1, borderRightWidth: 1, borderColor: colors.border },
  toolTop: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  toolIcon: { height: 40, width: 40, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  toolName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  toolMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.muted, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  toolUsage: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: 6 },
  toolWarn: { fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 6 },
  actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.md, borderRightWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.cardForeground },
  editBtn: { borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  editText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.mutedForeground },
  noteBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noteText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.mutedForeground },
});
