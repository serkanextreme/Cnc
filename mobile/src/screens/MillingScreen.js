import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CircleDotDashed, RotateCcw, Save, Share2 } from 'lucide-react-native';
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
import { adjustForHardness, calcMilling, evaluateRange, worstStatus } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, fzRangeToFnRange, resolveFeedMode } from '../lib/feed';
import { midOf, recommended, resolveLimits, TOOL_MATERIALS } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, unitLabel } from '../lib/units';
import { colors, spacing } from '../theme';

export default function MillingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history, setFeedModeForOp,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.freze;
  const material = useMemo(
    () => (d.hardnessOverride > 0 ? adjustForHardness(activeMaterial, d.hardnessOverride) : activeMaterial),
    [activeMaterial, d.hardnessOverride],
  );
  const recordId = route.params?.recordId;

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'freze') return;
    updateDraft('freze', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const rec = recommended(material, 'freze', d.tool);
  const limits = resolveLimits('freze', settings);

  const errors = useMemo(() => {
    const e = {};
    if (!(d.d > 0)) e.d = 'Takım çapı sıfırdan büyük olmalı';
    if (!(d.fz > 0)) e.fz = 'Diş başına ilerleme sıfırdan büyük olmalı';
    if (!(d.vc > 0)) e.vc = 'Kesme hızı sıfırdan büyük olmalı';
    if (!(d.ap > 0)) e.ap = 'Derinlik girin';
    if (!(d.ae > 0)) e.ae = 'Genişlik girin';
    else if (d.ae > d.d) e.ae = 'Radyal genişlik takım çapından büyük olamaz';
    return e;
  }, [d]);

  const hasErrors = Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    return calcMilling({ vc: d.vc, d: d.d, z: d.z, fz: d.fz, ap: d.ap, ae: d.ae, kc: material.kc, eta: settings.efficiency, limits });
  }, [d, material, settings.efficiency, limits, hasErrors]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fzEval = rec ? evaluateRange(d.fz, rec.fz) : { status: 'neutral', label: '—' };
  const powerOver = !!(result && limits && limits.powerKw && result.power > limits.powerKw);
  const feedMode = resolveFeedMode(settings, 'freze');
  const feed = feedFromResult(result);
  const fnRange = rec ? fzRangeToFnRange(rec.fz, d.z) : null;
  const feedCheck = feedSafety({
    vf: feed.vf, fn: feed.fn, fnRange, maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: settings.maxFeedPerRev, clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const feedStatus = feedCheck.level === 'critical' ? 'error' : feedCheck.level === 'warn' ? 'warn' : 'ok';
  const status = hasErrors ? 'error' : worstStatus([vcEval.status, fzEval.status, feedStatus, powerOver ? 'warn' : 'ok']);
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Geçerli' : 'Kontrol edin';

  const handleSave = () => {
    if (!result) { toast.error('Geçersiz giriş — önce alanları düzeltin'); return; }
    const entry = saveCalculation({
      op: 'freze', materialId: activeMaterial.id, materialCode: activeMaterial.code, materialName: activeMaterial.name,
      unitSystem, inputs: { ...d },
      outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque, hm: result.hm },
    });
    toast.success('Hesaplama kaydedildi', { description: `${activeMaterial.code} · ${formatNumber(entry.outputs.n, 0)} dev/dk` });
  };

  const handleShare = async () => {
    if (!result) { toast.error('Paylaşılacak geçerli sonuç yok'); return; }
    const text = buildShareText(
      { op: 'freze', materialCode: activeMaterial.code, inputs: d, outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque } },
      unitSystem, activeMaterial.name,
    );
    const res = await shareText(text);
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  const applyRecommended = () => {
    if (!rec) return;
    updateDraft('freze', { vc: Math.round(midOf(rec.vc)), fz: Number(midOf(rec.fz).toFixed(3)) });
    toast.success('Önerilen değerler uygulandı');
  };

  return (
    <ScreenShell
      testID="milling-screen"
      footer={(
        <BottomActionBar>
          <GhostButton icon={Share2} onPress={handleShare} testID="share-button" style={{ width: 48, paddingHorizontal: 0 }} />
          <PrimaryButton icon={Save} onPress={handleSave} testID="save-button">Hesaplamayı Kaydet</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader eyebrow="CNC PARAMETRELERİ" title="Freze Hesabı" onBack={() => navigation.goBack()} right={<IconButton icon={CircleDotDashed} label="Freze" tone="primary" />} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <HardnessCard op="freze" material={activeMaterial} adjusted={material} value={d.hardnessOverride || 0} onChange={(v) => updateDraft('freze', { hardnessOverride: v })} />

        <View>
          <SectionHeading eyebrow="TAKIM" title="Kesici bilgisi" />
          <ListCard>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Takım tipi</Eyebrow>
              <SegmentedToggle options={TOOL_MATERIALS} value={d.tool} onChange={(v) => updateDraft('freze', { tool: v })} testID="tool-toggle" />
            </View>
            <NumericField id="freze-d" label="Takım çapı" hint={`Aralık: ${formatRange('length', [1, 80], unitSystem)} ${unitLabel('length', unitSystem)}`} kind="length" value={d.d} onChange={(v) => updateDraft('freze', { d: v })} status={errors.d ? 'error' : 'neutral'} error={errors.d} testID="input-d" />
            <Stepper label="Ağız sayısı" hint={`${d.z} ağız`} value={d.z} min={1} max={12} onChange={(v) => updateDraft('freze', { z: v })} testID="stepper-z" />
            <NumericField id="freze-corner" label="Uç radyusu" hint="Köşe radyusu ve yüzey kalitesi" kind="length" value={d.cornerR} onChange={(v) => updateDraft('freze', { cornerR: v })} testID="input-corner" />
          </ListCard>
        </View>

        <View>
          <SectionHeading eyebrow="KESME PARAMETRELERİ" title="Giriş değerleri" />
          <ListCard>
            <NumericField id="freze-vc" label="Kesme hızı (Vc)" hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''} hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'} kind="vc" value={d.vc} onChange={(v) => updateDraft('freze', { vc: v })} status={errors.vc ? 'error' : vcEval.status} error={errors.vc} testID="input-vc" />
            <NumericField id="freze-fz" label="Diş başına ilerleme (fz)" hint={rec ? `Önerilen: ${formatRange('fz', rec.fz, unitSystem)} ${unitLabel('fz', unitSystem)}` : ''} hintTone={fzEval.status === 'ok' ? 'muted' : 'warn'} kind="fz" value={d.fz} onChange={(v) => updateDraft('freze', { fz: v })} status={errors.fz ? 'error' : fzEval.status} error={errors.fz} testID="input-fz" />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, borderRightWidth: 1, borderColor: colors.border }}>
                <NumericField id="freze-ap" label="Eksenel (Ap)" kind="length" value={d.ap} onChange={(v) => updateDraft('freze', { ap: v })} status={errors.ap ? 'error' : 'neutral'} error={errors.ap} testID="input-ap" />
              </View>
              <View style={{ flex: 1 }}>
                <NumericField id="freze-ae" label="Radyal (Ae)" kind="length" value={d.ae} onChange={(v) => updateDraft('freze', { ae: v })} status={errors.ae ? 'error' : 'neutral'} error={errors.ae} testID="input-ae" />
              </View>
            </View>
          </ListCard>
        </View>

        <ResultCard
          title="İşleme değerleri"
          status={status}
          statusLabel={statusLabel}
          metrics={[
            { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
            { ...feedMetric({ feed, mode: feedMode, unitSystem, level: feedCheck.level, hasResult: !!result }) },
          ]}
          extras={[
            { label: 'Kesme hızı', note: result && result.limits.rpmClamped ? 'Limit sonrası efektif değer' : 'Hedef değer korunuyor', value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—', unit: unitLabel('vc', unitSystem), tone: 'accent', testID: 'result-vc' },
            { label: 'Talaş hacmi (Q)', note: 'Ap × Ae × Vf', value: result ? formatQty('q', result.q, unitSystem) : '—', unit: unitLabel('q', unitSystem), tone: 'foreground', testID: 'result-q' },
            { label: 'İş mili gücü', note: powerOver ? 'Tezgâh gücünün üzerinde!' : `Verim %${Math.round(settings.efficiency * 100)}`, value: result ? formatQty('power', result.power, unitSystem) : '—', unit: unitLabel('power', unitSystem), tone: powerOver ? 'destructive' : 'foreground', testID: 'result-power' },
            { label: 'Tork', note: 'M = 30000 × Pc / (π × n)', value: result ? formatQty('torque', result.torque, unitSystem) : '—', unit: unitLabel('torque', unitSystem), tone: 'foreground', testID: 'result-torque' },
            { label: 'Ort. talaş kalınlığı (hm)', note: result ? `Kavrama açısı ${formatNumber(result.engagement, 0)}°` : '', value: result ? formatQty('fz', result.hm, unitSystem) : '—', unit: unitLabel('fz', unitSystem), tone: 'accent', testID: 'result-hm' },
          ]}
        />

        <FeedCard
          n={result ? result.n : NaN} vf={feed.vf} fn={feed.fn} mode={feedMode} scopeLabel="Freze ekranı"
          onModeChange={(v) => { setFeedModeForOp('freze', v); toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)'); }}
          unitSystem={unitSystem} safety={feedCheck} fnRange={fnRange}
          extraNote={`Frezede fn = fz × z = ${formatQty('fz', d.fz, unitSystem)} × ${d.z} ağız. Tezgâh G94 modundaysa mm/dk, G95 modundaysa mm/dev değerini gir.`}
        />

        <MachineCheckCard
          diameter={d.d} z={d.z} feedMode={feedMode} unitSystem={unitSystem}
          vcRange={rec ? rec.vc : null} fRange={fnRange} fzRange={rec ? rec.fz : null}
          suggestS={result ? result.n : NaN} suggestF={result ? result.vf : NaN}
          onApply={({ vc, fz }) => updateDraft('freze', { vc: Number(vc.toFixed(1)), ...(Number.isFinite(fz) && fz > 0 ? { fz: Number(fz.toFixed(3)) } : {}) })}
          note={`Örnek: Ø${formatQty('length', d.d, unitSystem)} takım, S 2500 dev/dk → Vc = π × Ø × S / 1000. F 360 mm/dk → f = 360 / 2500 = 0,144 mm/dev → fz = f / ${d.z} ağız.`}
        />

        {rec ? (
          <RecommendPanel
            onApplyAll={applyRecommended}
            items={[
              { key: 'vc', label: 'Kesme hızı (Vc)', kind: 'vc', range: rec.vc, status: vcEval.status, statusLabel: vcEval.label, onApply: () => updateDraft('freze', { vc: Math.round(midOf(rec.vc)) }) },
              { key: 'fz', label: 'Diş başına ilerleme (fz)', kind: 'fz', range: rec.fz, status: fzEval.status, statusLabel: fzEval.label, onApply: () => updateDraft('freze', { fz: Number(midOf(rec.fz).toFixed(3)) }) },
            ]}
          />
        ) : null}

        <ToolLifeCard op="freze" vc={d.vc} vcRange={rec ? rec.vc : null} tool={d.tool} coolant={d.coolant || material.coolant} cycleSeconds={result && result.cycleSeconds ? result.cycleSeconds : 0} onApplyVc={(v) => updateDraft('freze', { vc: v })} />

        <MachineLimitCard op="freze" clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))} notes={result ? result.limits.notes : []} />

        <FormulaPanel
          rows={[
            { expr: 'n = (1.000 × Vc) / (π × D)', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'Vf = fz × z × n', note: `fz = ${formatQty('fz', d.fz, unitSystem)} · z = ${d.z}` },
            { expr: 'Q = Ap × Ae × Vf', note: `Ap = ${formatQty('length', d.ap, unitSystem)} · Ae = ${formatQty('length', d.ae, unitSystem)}` },
            { expr: 'Pc = Q × kc / 60.000 / η', note: `kc = ${material.kc} N/mm²` },
          ]}
        />

        <Pressable onPress={() => { resetDraft('freze'); toast.success('Varsayılan değerlere dönüldü'); }} testID="reset-draft" style={styles.resetBtn}>
          <RotateCcw size={15} color={colors.mutedForeground} />
          <Text style={styles.resetText}>Varsayılanlara dön</Text>
        </Pressable>
      </View>

      <MaterialPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        op="freze"
        tool={d.tool}
        onSelect={(m) => {
          setActiveMaterialId(m.id);
          const r = recommended(m, 'freze', d.tool);
          if (r) updateDraft('freze', { vc: Math.round(midOf(r.vc)), fz: Number(midOf(r.fz).toFixed(3)) });
          toast.success(`${m.code} seçildi`, { description: 'Önerilen değerler uygulandı' });
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md },
  resetText: { fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 12, color: colors.mutedForeground },
});
