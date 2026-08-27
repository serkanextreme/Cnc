import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Droplets, Drill, RotateCcw, Save, Share2, Timer } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/MaterialPicker';
import { MachineLimitCard } from '../components/MachineLimitCard';
import { HardnessCard } from '../components/HardnessCard';
import { ToolLifeCard } from '../components/ToolLifeCard';
import { RecommendPanel } from '../components/Recommend';
import { FormulaPanel, ResultCard } from '../components/ResultCard';
import { FeedCard } from '../components/FeedCard';
import { MachineCheckCard } from '../components/MachineCheckCard';
import {
  BottomActionBar, Eyebrow, GhostButton, IconButton, ListCard, NumericField, PrimaryButton,
  ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, Stepper,
} from '../components/Primitives';
import { adjustForHardness, calcDrilling, evaluateRange, worstStatus } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, resolveFeedMode } from '../lib/feed';
import { COOLANT_OPTIONS, coolantLabel, midOf, recommended, resolveLimits, TOOL_MATERIALS } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, formatSeconds, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

export default function DrillingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history, setFeedModeForOp,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.matkap;
  const material = useMemo(
    () => (d.hardnessOverride > 0 ? adjustForHardness(activeMaterial, d.hardnessOverride) : activeMaterial),
    [activeMaterial, d.hardnessOverride],
  );
  const recordId = route.params?.recordId;

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'matkap') return;
    updateDraft('matkap', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const rec = recommended(material, 'matkap', d.tool);
  const limits = resolveLimits('matkap', settings);
  const z = d.z > 0 ? d.z : 2;
  const fzValue = d.f > 0 ? d.f / z : 0;
  const fzRange = rec ? [rec.f[0] / z, rec.f[1] / z] : null;
  const feedInput = d.feedInput === 'fz' ? 'fz' : 'f';

  const errors = useMemo(() => {
    const e = {};
    if (!(d.d > 0)) e.d = 'Matkap çapı sıfırdan büyük olmalı';
    if (!(d.vc > 0)) e.vc = 'Kesme hızı sıfırdan büyük olmalı';
    if (!(d.f > 0)) e.f = 'İlerleme sıfırdan büyük olmalı';
    if (!(d.depth > 0)) e.depth = 'Delik derinliği sıfırdan büyük olmalı';
    return e;
  }, [d]);
  const hasErrors = Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    return calcDrilling({ vc: d.vc, d: d.d, f: d.f, depth: d.depth, kc: material.kc, eta: settings.efficiency, limits, peck: d.peck || 0 });
  }, [d, material, settings.efficiency, limits, hasErrors]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fEval = rec ? evaluateRange(d.f, rec.f) : { status: 'neutral', label: '—' };
  const deepHole = d.depth > d.d * 3;
  const powerOver = !!(result && limits && limits.powerKw && result.power > limits.powerKw);
  const feedMode = resolveFeedMode(settings, 'matkap');
  const feed = feedFromResult(result);
  const fnRange = rec ? rec.f : null;
  const feedCheck = feedSafety({
    vf: feed.vf, fn: feed.fn, fnRange, maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: settings.maxFeedPerRev, clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const feedStatus = feedCheck.level === 'critical' ? 'error' : feedCheck.level === 'warn' ? 'warn' : 'ok';
  const status = hasErrors ? 'error' : worstStatus([vcEval.status, fEval.status, feedStatus, powerOver ? 'warn' : 'ok']);
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Uygun' : 'Kontrol edin';

  const handleSave = () => {
    if (!result) { toast.error('Geçersiz giriş — önce alanları düzeltin'); return; }
    const entry = saveCalculation({
      op: 'matkap', materialId: activeMaterial.id, materialCode: activeMaterial.code, materialName: activeMaterial.name,
      unitSystem, inputs: { ...d },
      outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque, cycleSeconds: result.cycleSeconds },
    });
    toast.success('Hesaplama kaydedildi', { description: `${activeMaterial.code} · ${formatNumber(entry.outputs.n, 0)} dev/dk` });
  };

  const handleShare = async () => {
    if (!result) { toast.error('Paylaşılacak geçerli sonuç yok'); return; }
    const text = buildShareText(
      { op: 'matkap', materialCode: activeMaterial.code, inputs: d, outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque, cycleSeconds: result.cycleSeconds } },
      unitSystem, activeMaterial.name,
    );
    const res = await shareText(text);
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell
      testID="drilling-screen"
      footer={(
        <BottomActionBar>
          <GhostButton icon={Share2} onPress={handleShare} testID="share-button" style={{ width: 48, paddingHorizontal: 0 }} />
          <PrimaryButton icon={Save} onPress={handleSave} testID="save-button">Hesaplamayı Kaydet</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader eyebrow="CNC PARAMETRELERİ" title="Matkap Hesabı" onBack={() => navigation.goBack()} right={<IconButton icon={Drill} label="Matkap" tone="primary" />} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <HardnessCard op="matkap" material={activeMaterial} adjusted={material} value={d.hardnessOverride || 0} onChange={(v) => updateDraft('matkap', { hardnessOverride: v })} />

        <View>
          <SectionHeading eyebrow="TAKIM" title="Matkap bilgisi" />
          <ListCard>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Matkap tipi</Eyebrow>
              <SegmentedToggle options={TOOL_MATERIALS} value={d.tool} onChange={(v) => updateDraft('matkap', { tool: v })} testID="tool-toggle" />
            </View>
            <NumericField id="matkap-d" label="Matkap çapı" hint={`Aralık: ${formatRange('length', [1, 50], unitSystem)} ${unitLabel('length', unitSystem)}`} kind="length" value={d.d} onChange={(v) => updateDraft('matkap', { d: v })} status={errors.d ? 'error' : 'neutral'} error={errors.d} testID="input-d" />
            <Stepper label="Ağız (dudak) sayısı" hint={z === 2 ? 'Standart helis matkap = 2 ağız' : `${z} ağız · f = fz × ${z}`} value={z} min={1} max={4} onChange={(v) => updateDraft('matkap', { z: v })} testID="stepper-z" />
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Eyebrow>Soğutma</Eyebrow>
                  <Text style={styles.coolantValue} testID="coolant-value">{coolantLabel(d.coolant)}</Text>
                </View>
                <Droplets size={20} color={colors.primary} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {COOLANT_OPTIONS.map((c) => (
                    <Pressable key={c.id} onPress={() => updateDraft('matkap', { coolant: c.id })} testID={`coolant-${c.id}`} style={[styles.coolantChip, d.coolant === c.id ? styles.coolantChipActive : styles.coolantChipInactive]}>
                      <Text style={[styles.coolantChipText, d.coolant === c.id && { color: colors.primaryForeground }]}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ListCard>
        </View>

        <View>
          <SectionHeading eyebrow="KESME PARAMETRELERİ" title="Değerleri girin" />
          <ListCard>
            <NumericField id="matkap-vc" label="Kesme hızı" hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''} hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'} kind="vc" value={d.vc} onChange={(v) => updateDraft('matkap', { vc: v })} status={errors.vc ? 'error' : vcEval.status} error={errors.vc} testID="input-vc" />
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>İlerleme nasıl girilecek?</Eyebrow>
              <SegmentedToggle options={[{ id: 'f', label: 'mm/dev (f)' }, { id: 'fz', label: 'mm/diş (fz)' }]} value={feedInput} onChange={(v) => updateDraft('matkap', { feedInput: v })} testID="feed-input-toggle" />
              <Text style={styles.hintSmall}>
                Katalog/tablo diş başına (mm/diş) veriyorsa onu seçin — uygulama {z} ağızla çarpıp devir başına ilerlemeyi bulur: f = fz × {z}.
              </Text>
            </View>
            {feedInput === 'fz' ? (
              <NumericField id="matkap-fz" label="Diş başına ilerleme (fz)" hint={fzRange ? `Önerilen: ${formatRange('fz', fzRange, unitSystem)} ${unitLabel('fz', unitSystem)} → f = ${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)}` : ''} hintTone={fEval.status === 'ok' ? 'muted' : 'warn'} kind="fz" value={fzValue} onChange={(v) => updateDraft('matkap', { f: v * z })} status={errors.f ? 'error' : fEval.status} error={errors.f} testID="input-fz" />
            ) : (
              <NumericField id="matkap-f" label="İlerleme (devir başına)" hint={rec ? `Önerilen: ${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)}` : ''} hintTone={fEval.status === 'ok' ? 'muted' : 'warn'} kind="f" value={d.f} onChange={(v) => updateDraft('matkap', { f: v })} status={errors.f ? 'error' : fEval.status} error={errors.f} testID="input-f" />
            )}
            <NumericField id="matkap-depth" label="Delik derinliği" hint={deepHole ? `Derin delik (${formatNumber(d.depth / d.d, 1)} × D) — gagalama önerilir` : 'Çevrim süresi hesabı için'} hintTone={deepHole ? 'warn' : 'muted'} kind="length" value={d.depth} onChange={(v) => updateDraft('matkap', { depth: v })} status={errors.depth ? 'error' : 'neutral'} error={errors.depth} testID="input-depth" />
            <Stepper label="Gagalama (peck) sayısı" hint={d.peck ? `${d.peck} kademe` : 'Kademesiz'} value={d.peck || 0} min={0} max={20} onChange={(v) => updateDraft('matkap', { peck: v })} testID="stepper-peck" />
          </ListCard>
        </View>

        <ResultCard
          title="Matkap değerleri"
          status={status}
          statusLabel={statusLabel}
          metrics={[
            { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
            { ...feedMetric({ feed, mode: feedMode, unitSystem, level: feedCheck.level, hasResult: !!result }) },
          ]}
          extras={[
            { label: 'Kesme hızı', note: result && result.limits.rpmClamped ? 'Limit sonrası efektif değer' : 'Giriş değeri doğrulandı', value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—', unit: unitLabel('vc', unitSystem), tone: 'accent', testID: 'result-vc' },
            { label: 'Talaş hacmi (Q)', note: '(π × D² / 4) × Vf', value: result ? formatQty('q', result.q, unitSystem) : '—', unit: unitLabel('q', unitSystem), tone: 'foreground', testID: 'result-q' },
            { label: 'İş mili gücü', note: powerOver ? 'Tezgâh gücünün üzerinde!' : `Verim %${Math.round(settings.efficiency * 100)}`, value: result ? formatQty('power', result.power, unitSystem) : '—', unit: unitLabel('power', unitSystem), tone: powerOver ? 'destructive' : 'foreground', testID: 'result-power' },
            { label: 'Tork', note: 'M = 30000 × Pc / (π × n)', value: result ? formatQty('torque', result.torque, unitSystem) : '—', unit: unitLabel('torque', unitSystem), tone: 'foreground', testID: 'result-torque' },
            { label: 'Diş başına ilerleme (fz)', note: `fz = f / ${z} ağız`, value: result ? formatQty('fz', fzValue, unitSystem) : '—', unit: unitLabel('fz', unitSystem), tone: 'accent', testID: 'result-fz' },
          ]}
        />

        <FeedCard
          n={result ? result.n : NaN} vf={feed.vf} fn={feed.fn} mode={feedMode} scopeLabel="Matkap ekranı"
          onModeChange={(v) => { setFeedModeForOp('matkap', v); toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)'); }}
          unitSystem={unitSystem} safety={feedCheck} fnRange={fnRange}
          extraNote={`Matkapta f = fz × ${z} ağız. Katalog mm/diş veriyorsa yukarıdaki "mm/diş (fz)" girişini kullanın.`}
        />

        <MachineCheckCard
          diameter={d.d} z={z} feedMode={feedMode} unitSystem={unitSystem}
          vcRange={rec ? rec.vc : null} fRange={rec ? rec.f : null} fzRange={fzRange}
          suggestS={result ? result.n : NaN} suggestF={result ? result.vf : NaN}
          onApply={({ vc, fn }) => updateDraft('matkap', { vc: Number(vc.toFixed(1)), f: Number(fn.toFixed(3)) })}
          note="Örnek: Ø10 matkap, S 2500 dev/dk → Vc = π × 10 × 2500 / 1000 = 78,5 m/dk. F 360 mm/dk → f = 0,144 mm/dev → fz = 0,072 mm/diş (2 ağız)."
        />

        <View style={styles.cycleCard} testID="cycle-card">
          <View style={styles.cycleIcon}><Timer size={18} color={colors.success} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Tahmini ilerleme süresi</Eyebrow>
            <Text style={styles.cycleText}>
              {formatQty('length', d.depth, unitSystem)} {unitLabel('length', unitSystem)} derinlik ·{' '}
              <Text style={{ color: colors.mutedForeground, fontFamily: fonts.body }}>
                yaklaşık <Text testID="result-cycle">{result ? formatSeconds(result.cycleSeconds) : '—'}</Text>
              </Text>
            </Text>
          </View>
        </View>

        {rec ? (
          <RecommendPanel
            onApplyAll={() => { updateDraft('matkap', { vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) }); toast.success('Önerilen değerler uygulandı'); }}
            items={[
              { key: 'vc', label: 'Kesme hızı (Vc)', kind: 'vc', range: rec.vc, status: vcEval.status, statusLabel: vcEval.label, onApply: () => updateDraft('matkap', { vc: Math.round(midOf(rec.vc)) }) },
              { key: 'f', label: 'İlerleme (f)', kind: 'f', range: rec.f, status: fEval.status, statusLabel: fEval.label, onApply: () => updateDraft('matkap', { f: Number(midOf(rec.f).toFixed(2)) }) },
            ]}
          />
        ) : null}

        <ToolLifeCard op="matkap" vc={d.vc} vcRange={rec ? rec.vc : null} tool={d.tool} coolant={d.coolant || material.coolant} cycleSeconds={result && result.cycleSeconds ? result.cycleSeconds : 0} onApplyVc={(v) => updateDraft('matkap', { vc: v })} />

        <MachineLimitCard op="matkap" clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))} notes={result ? result.limits.notes : []} />

        <FormulaPanel
          rows={[
            { expr: 'n = (1.000 × Vc) / (π × D)', tag: 'Devir', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'Vf = f × n', tag: 'İlerleme', note: `f = ${formatQty('f', d.f, unitSystem)}` },
            { expr: 't = derinlik / Vf', tag: 'Süre', note: `derinlik = ${formatQty('length', d.depth, unitSystem)}` },
          ]}
        />

        <Pressable onPress={() => { resetDraft('matkap'); toast.success('Varsayılan değerlere dönüldü'); }} testID="reset-draft" style={styles.resetBtn}>
          <RotateCcw size={15} color={colors.mutedForeground} />
          <Text style={styles.resetText}>Varsayılanlara dön</Text>
        </Pressable>
      </View>

      <MaterialPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        op="matkap"
        tool={d.tool}
        onSelect={(m) => {
          setActiveMaterialId(m.id);
          const r = recommended(m, 'matkap', d.tool);
          if (r) updateDraft('matkap', { vc: Math.round(midOf(r.vc)), f: Number(midOf(r.f).toFixed(2)), coolant: m.coolant || d.coolant });
          toast.success(`${m.code} seçildi`, { description: 'Önerilen değerler uygulandı' });
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  coolantValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground, marginTop: 2 },
  coolantChip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  coolantChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  coolantChipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  coolantChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  hintSmall: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.mutedForeground, marginTop: spacing.sm },
  cycleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  cycleIcon: { height: 36, width: 36, borderRadius: radius.md, backgroundColor: 'rgba(93,187,135,0.15)', alignItems: 'center', justifyContent: 'center' },
  cycleText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.cardForeground, marginTop: 2 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md },
  resetText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.mutedForeground },
});
