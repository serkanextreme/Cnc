import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CircleDotDashed, Drill, Info, RotateCw, Save, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { COOLANT_OPTIONS, emptyCustomMaterial, GROUPS, MACHINABILITY, TOOL_MATERIALS } from '../data/materials';
import {
  BottomActionBar, Eyebrow, GhostButton, NumericField, PrimaryButton,
  ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, StatusChip,
} from '../components/Primitives';
import { unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const OP_TABS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed, feedKey: 'fz', feedLabel: 'Diş başına ilerleme (fz)' },
  { id: 'torna', label: 'Torna', icon: RotateCw, feedKey: 'f', feedLabel: 'İlerleme (f)' },
  { id: 'matkap', label: 'Matkap', icon: Drill, feedKey: 'f', feedLabel: 'İlerleme (f)' },
];

export default function MaterialFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const { materialById, saveCustomMaterial, deleteCustomMaterial } = useApp();

  const existing = route.params?.materialId ? materialById(route.params.materialId) : null;
  const [form, setForm] = useState(() => (existing ? JSON.parse(JSON.stringify(existing)) : emptyCustomMaterial()));
  const [op, setOp] = useState('freze');
  const [tool, setTool] = useState('karbur');
  const [touched, setTouched] = useState(false);

  const tab = OP_TABS.find((t) => t.id === op);
  const feedKey = tab.feedKey;

  const errors = useMemo(() => {
    const e = {};
    if (!form.code.trim()) e.code = 'Malzeme kodu gerekli';
    if (!form.name.trim()) e.name = 'Malzeme adı gerekli';
    if (!(form.kc > 0)) e.kc = 'Özgül kesme kuvveti sıfırdan büyük olmalı';
    if (form.hardness[0] > form.hardness[1]) e.hardness = 'Sertlik alt sınırı üst sınırdan büyük olamaz';
    if (form.tensile[0] > form.tensile[1]) e.tensile = 'Çekme dayanımı aralığı hatalı';
    ['freze', 'torna', 'matkap'].forEach((o) => {
      ['karbur', 'hss'].forEach((t) => {
        const k = o === 'freze' ? 'fz' : 'f';
        const entry = form.ops[o][t];
        if (!(entry.vc[0] > 0) || entry.vc[0] > entry.vc[1]) e[`${o}-${t}-vc`] = 'Vc aralığı hatalı';
        if (!(entry[k][0] > 0) || entry[k][0] > entry[k][1]) e[`${o}-${t}-${k}`] = 'İlerleme aralığı hatalı';
      });
    });
    return e;
  }, [form]);

  const setFieldVal = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setOpsValue = (o, t, key, index, value) => {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.ops[o][t][key][index] = value;
      return next;
    });
  };
  const setPair = (field, index, value) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleSave = () => {
    setTouched(true);
    const errorList = Object.values(errors);
    if (errorList.length) { toast.error('Eksik veya hatalı alan var', { description: errorList[0] }); return; }
    const saved = saveCustomMaterial({
      ...form, code: form.code.trim(), name: form.name.trim(),
      tags: form.tags && form.tags.length ? form.tags : ['Özel malzeme'],
      desc: form.desc || 'Kullanıcı tanımlı malzeme',
    });
    toast.success(existing ? 'Malzeme güncellendi' : 'Malzeme eklendi', { description: saved.code });
    navigation.replace('MaterialDetail', { materialId: saved.id });
  };

  const handleDelete = () => {
    if (!existing) return;
    deleteCustomMaterial(existing.id);
    toast.success('Malzeme silindi');
    navigation.navigate('MalzemeTab');
  };

  const err = (key) => (touched ? errors[key] : undefined);

  return (
    <ScreenShell
      testID="material-form-screen"
      footer={(
        <BottomActionBar>
          <GhostButton onPress={() => navigation.goBack()} testID="cancel-button" style={{ flex: 1 }}>İptal</GhostButton>
          <PrimaryButton icon={Save} onPress={handleSave} testID="save-material">Kaydet</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader eyebrow={existing ? 'ÖZEL MALZEME' : 'YENİ KAYIT'} title={existing ? 'Malzemeyi Düzenle' : 'Malzeme Ekle'} onBack={() => navigation.goBack()} right={<StatusChip tone="accent">ÖZEL</StatusChip>} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <View>
          <SectionHeading eyebrow="KİMLİK" title="Malzeme bilgisi" />
          <View style={styles.card}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Malzeme kodu</Text>
              <TextInput value={form.code} onChangeText={(v) => setFieldVal({ code: v })} placeholder="örn. 42CrMo4" placeholderTextColor={colors.mutedForeground} testID="form-code" style={[styles.codeInput, err('code') && styles.inputError]} />
              {err('code') ? <Text style={styles.errorText}>{err('code')}</Text> : null}
            </View>
            <View style={[styles.fieldBlock, styles.divider]}>
              <Text style={styles.fieldLabel}>Malzeme adı</Text>
              <TextInput value={form.name} onChangeText={(v) => setFieldVal({ name: v })} placeholder="örn. Islah Çeliği" placeholderTextColor={colors.mutedForeground} testID="form-name" style={[styles.textInput, err('name') && styles.inputError]} />
              {err('name') ? <Text style={styles.errorText}>{err('name')}</Text> : null}
            </View>
            <View style={[styles.fieldBlock, styles.divider]}>
              <Text style={styles.fieldLabel}>Alt bilgi / standart</Text>
              <TextInput value={form.subtitle} onChangeText={(v) => setFieldVal({ subtitle: v })} placeholder="örn. 1.7225 · AISI 4140" placeholderTextColor={colors.mutedForeground} testID="form-subtitle" style={styles.textInput} />
            </View>
            <View style={[styles.fieldBlock, styles.divider]}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Malzeme grubu</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {GROUPS.map((g) => (
                    <Pressable key={g.id} onPress={() => setFieldVal({ group: g.id })} testID={`form-group-${g.id}`} style={[styles.chip, form.group === g.id ? styles.chipActive : styles.chipInactive]}>
                      <Text style={[styles.chipText, form.group === g.id && { color: colors.primaryForeground }]}>{g.short}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={[styles.fieldBlock, styles.divider]}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>İşlenebilirlik</Eyebrow>
              <SegmentedToggle options={MACHINABILITY} value={form.machinability} onChange={(v) => setFieldVal({ machinability: v })} testID="form-mach" />
            </View>
            <View style={[styles.fieldBlock, styles.divider]}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Soğutma</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {COOLANT_OPTIONS.map((c) => (
                    <Pressable key={c.id} onPress={() => setFieldVal({ coolant: c.id })} testID={`form-coolant-${c.id}`} style={[styles.chip, form.coolant === c.id ? styles.chipActiveAccent : styles.chipInactive]}>
                      <Text style={[styles.chipText, form.coolant === c.id && { color: colors.accent }]}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        <View>
          <SectionHeading eyebrow="MEKANİK" title="Özellikler" />
          <View style={styles.card}>
            <View style={styles.fieldBlock}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Sertlik skalası</Eyebrow>
              <SegmentedToggle options={[{ id: 'HB', label: 'HB' }, { id: 'HRC', label: 'HRC' }]} value={form.hardnessScale} onChange={(v) => setFieldVal({ hardnessScale: v })} testID="form-hardness-scale" />
            </View>
            <View style={[styles.rowSplit, styles.divider]}>
              <View style={styles.halfBorder}><NumericField id="form-hardness-min" label="Sertlik min" kind="deg" unitOverride={form.hardnessScale} value={form.hardness[0]} onChange={(v) => setPair('hardness', 0, v)} status={err('hardness') ? 'error' : 'neutral'} testID="form-hardness-min" /></View>
              <View style={{ flex: 1 }}><NumericField id="form-hardness-max" label="Sertlik max" kind="deg" unitOverride={form.hardnessScale} value={form.hardness[1]} onChange={(v) => setPair('hardness', 1, v)} status={err('hardness') ? 'error' : 'neutral'} testID="form-hardness-max" /></View>
            </View>
            <View style={[styles.rowSplit, styles.divider]}>
              <View style={styles.halfBorder}><NumericField id="form-tensile-min" label="Çekme min" kind="deg" unitOverride="MPa" value={form.tensile[0]} onChange={(v) => setPair('tensile', 0, v)} status={err('tensile') ? 'error' : 'neutral'} testID="form-tensile-min" /></View>
              <View style={{ flex: 1 }}><NumericField id="form-tensile-max" label="Çekme max" kind="deg" unitOverride="MPa" value={form.tensile[1]} onChange={(v) => setPair('tensile', 1, v)} status={err('tensile') ? 'error' : 'neutral'} testID="form-tensile-max" /></View>
            </View>
            <View style={styles.divider}>
              <NumericField id="form-kc" label="Özgül kesme kuvveti (kc)" hint="Güç ve tork hesabında kullanılır" kind="deg" unitOverride="N/mm²" value={form.kc} onChange={(v) => setFieldVal({ kc: v })} status={err('kc') ? 'error' : 'neutral'} error={err('kc')} testID="form-kc" />
            </View>
          </View>
        </View>

        <View>
          <SectionHeading eyebrow="ÖNERİLEN ARALIKLAR" title="Kesme verileri" />
          <View style={styles.tabsRow}>
            {OP_TABS.map((t) => {
              const active = t.id === op;
              return (
                <Pressable key={t.id} onPress={() => setOp(t.id)} testID={`form-tab-${t.id}`} style={styles.tabBtn}>
                  <t.icon size={16} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
                  {active ? <View style={styles.tabIndicator} /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <SegmentedToggle options={TOOL_MATERIALS} value={tool} onChange={setTool} testID="form-tool-toggle" />
          </View>
          <View style={[styles.card, { marginTop: spacing.md }]}>
            <View style={styles.rowSplit}>
              <View style={styles.halfBorder}><NumericField id={`form-${op}-${tool}-vc-min`} label="Vc min" kind="vc" value={form.ops[op][tool].vc[0]} onChange={(v) => setOpsValue(op, tool, 'vc', 0, v)} status={err(`${op}-${tool}-vc`) ? 'error' : 'neutral'} testID="form-vc-min" /></View>
              <View style={{ flex: 1 }}><NumericField id={`form-${op}-${tool}-vc-max`} label="Vc max" kind="vc" value={form.ops[op][tool].vc[1]} onChange={(v) => setOpsValue(op, tool, 'vc', 1, v)} status={err(`${op}-${tool}-vc`) ? 'error' : 'neutral'} testID="form-vc-max" /></View>
            </View>
            <View style={[styles.rowSplit, styles.divider]}>
              <View style={styles.halfBorder}><NumericField id={`form-${op}-${tool}-feed-min`} label={`${feedKey} min`} kind={feedKey} value={form.ops[op][tool][feedKey][0]} onChange={(v) => setOpsValue(op, tool, feedKey, 0, v)} status={err(`${op}-${tool}-${feedKey}`) ? 'error' : 'neutral'} testID="form-feed-min" /></View>
              <View style={{ flex: 1 }}><NumericField id={`form-${op}-${tool}-feed-max`} label={`${feedKey} max`} kind={feedKey} value={form.ops[op][tool][feedKey][1]} onChange={(v) => setOpsValue(op, tool, feedKey, 1, v)} status={err(`${op}-${tool}-${feedKey}`) ? 'error' : 'neutral'} testID="form-feed-max" /></View>
            </View>
          </View>
          <Text style={styles.helperText}>{tab.feedLabel} · {unitLabel(feedKey, 'metric')} — {tool === 'hss' ? 'HSS' : 'Karbür'} takımlar için</Text>
        </View>

        <View style={styles.noteBox}>
          <Info size={18} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.noteText}>Girdiğiniz değerler yalnızca bu cihazda saklanır ve hesaplamalarda öneri olarak kullanılır.</Text>
        </View>

        {existing ? (
          <GhostButton icon={Trash2} tone="destructive" onPress={handleDelete} testID="delete-material" style={{ width: '100%' }}>Malzemeyi Sil</GhostButton>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  fieldBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground },
  codeInput: { marginTop: spacing.sm, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md, fontFamily: fonts.headingBold, fontSize: 22, color: colors.foreground },
  textInput: { marginTop: spacing.sm, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: spacing.md, fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  inputError: { borderColor: colors.destructive },
  errorText: { marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.destructive },
  chip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipActiveAccent: { borderColor: colors.accent, backgroundColor: 'rgba(85,198,195,0.15)' },
  chipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  rowSplit: { flexDirection: 'row' },
  halfBorder: { flex: 1, borderRightWidth: 1, borderColor: colors.border },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, position: 'relative' },
  tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.primary },
  helperText: { marginTop: spacing.sm, fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground },
  noteBox: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.mutedForeground },
});
