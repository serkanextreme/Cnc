import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RotateCcw, RotateCw, Save, Share2, Sparkles } from 'lucide-react-native';
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
  ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle,
} from '../components/Primitives';
import { adjustForHardness, calcTurning, evaluateRange, worstStatus } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, resolveFeedMode } from '../lib/feed';
import { midOf, recommended, resolveLimits } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, unitLabel } from '../lib/units';
import { colors, spacing } from '../theme';

const INSERTS = [{ id: 'karbur', label: 'Karbür uç' }, { id: 'hss', label: 'HSS kalem' }];
const DIRECTIONS = [{ id: 'od', label: 'Dış Çap' }, { id: 'id', label: 'İç Çap' }];

export default function TurningScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history, setFeedModeForOp,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.torna;
  const material = useMemo(
    () => (d.hardnessOverride > 0 ? adjustForHardness(activeMaterial, d.hardnessOverride) : activeMaterial),
    [activeMaterial, d.hardnessOverride],
  );
  const recordId = route.params?.recordId;

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'torna') return;
    updateDraft('torna', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const rec = recommended(material, 'torna', d.tool);
  const limits = resolveLimits('torna', settings);

  const errors = useMemo(() => {
    const e = {};
    if (!(d.d > 0)) e.d = 'İş parçası çapı sıfırdan büyük olmalı';
    if (!(d.vc > 0)) e.vc = 'Kesme hızı sıfırdan büyük olmalı';
    if (!(d.f > 0)) e.f = 'İlerleme sıfırdan büyük olmalı';
    if (!(d.ap > 0)) e.ap = 'Talaş derinliği sıfırdan büyük olmalı';
    if (!(d.noseR > 0)) e.noseR = 'Uç radyusu sıfırdan büyük olmalı';
    return e;
  }, [d]);
  const hasErrors = Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    return calcTurning({ vc: d.vc, d: d.d, f: d.f, ap: d.ap, noseR: d.noseR, kc: material.kc, eta: settings.efficiency, limits, targetRa: d.targetRa });
  }, [d, material, settings.efficiency, limits, hasErrors]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fEval = rec ? evaluateRange(d.f, rec.f) : { status: 'neutral', label: '—' };
  const raOver = !!(result && d.targetRa > 0 && result.ra - d.targetRa > 0.005);
  const powerOver = !!(result && limits && limits.powerKw && result.power > limits.powerKw);
  const feedMode = resolveFeedMode(settings, 'torna');
  const feed = feedFromResult(result);
  const fnRange = rec ? rec.f : null;
  const feedCheck = feedSafety({
    vf: feed.vf, fn: feed.fn, fnRange, maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: settings.maxFeedPerRev, clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const feedStatus = feedCheck.level === 'critical' ? 'error' : feedCheck.level === 'warn' ? 'warn' : 'ok';
  const status = hasErrors ? 'error' : worstStatus([vcEval.status, fEval.status, feedStatus, raOver ? 'warn' : 'ok', powerOver ? 'warn' : 'ok']);
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Uygun' : 'Kontrol edin';

  const handleSave = () => {
    if (!result) { toast.error('Geçersiz giriş — önce alanları düzeltin'); return; }
    const entry = saveCalculation({
      op: 'torna', materialId: activeMaterial.id, materialCode: activeMaterial.code, materialName: activeMaterial.name,
      unitSystem, inputs: { ...d },
      outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque, ra: result.ra },
    });
    toast.success('Hesaplama kaydedildi', { description: `${activeMaterial.code} · ${formatNumber(entry.outputs.n, 0)} dev/dk` });
  };

  const handleShare = async () => {
    if (!result) { toast.error('Paylaşılacak geçerli sonuç yok'); return; }
    const text = buildShareText(
      { op: 'torna', materialCode: activeMaterial.code, inputs: d, outputs: { n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q, power: result.power, torque: result.torque, ra: result.ra } },
      unitSystem, activeMaterial.name,
    );
    const res = await shareText(text);
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell
      testID="turning-screen"
      footer={(
        <BottomActionBar>
          <GhostButton icon={Share2} onPress={handleShare} testID="share-button" style={{ width: 48, paddingHorizontal: 0 }} />
          <PrimaryButton icon={Save} onPress={handleSave} testID="save-button">Hesaplamayı Kaydet</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader eyebrow="CNC PARAMETRELERİ" title="Torna Hesabı" onBack={() => navigation.goBack()} right={<IconButton icon={RotateCw} label="Torna" tone="accent" />} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <HardnessCard op="torna" material={activeMaterial} adjusted={material} value={d.hardnessOverride || 0} onChange={(v) => updateDraft('torna', { hardnessOverride: v })} />

        <View>
          <SectionHeading eyebrow="KURULUM" title="Takım ve parça" />
          <ListCard>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Uç tipi</Eyebrow>
              <SegmentedToggle options={INSERTS} value={d.tool} onChange={(v) => updateDraft('torna', { tool: v })} testID="tool-toggle" />
            </View>
            <NumericField id="torna-nose" label="Uç radyusu (rε)" hint={`${formatRange('length', [0.2, 2.4], unitSystem)} ${unitLabel('length', unitSystem)}`} kind="length" value={d.noseR} onChange={(v) => updateDraft('torna', { noseR: v })} status={errors.noseR ? 'error' : 'neutral'} error={errors.noseR} testID="input-nose" />
            <NumericField id="torna-d" label="İş parçası çapı" hint={`Ø ${formatRange('length', [1, 500], unitSystem)} ${unitLabel('length', unitSystem)}`} kind="length" value={d.d} onChange={(v) => updateDraft('torna', { d: v })} status={errors.d ? 'error' : 'neutral'} error={errors.d} testID="input-d" />
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>İşleme yönü</Eyebrow>
              <SegmentedToggle options={DIRECTIONS} value={d.direction} onChange={(v) => updateDraft('torna', { direction: v })} tone="secondary" testID="direction-toggle" />
            </View>
          </ListCard>
        </View>

        <View>
          <SectionHeading eyebrow="GİRİŞLER" title="Kesme parametreleri" />
          <ListCard>
            <NumericField id="torna-vc" label="Kesme hızı" hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''} hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'} kind="vc" value={d.vc} onChange={(v) => updateDraft('torna', { vc: v })} status={errors.vc ? 'error' : vcEval.status} error={errors.vc} testID="input-vc" />
            <NumericField id="torna-f" label="İlerleme" hint={rec ? `${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)}` : ''} hintTone={fEval.status === 'ok' ? 'muted' : 'warn'} kind="f" value={d.f} onChange={(v) => updateDraft('torna', { f: v })} status={errors.f ? 'error' : fEval.status} error={errors.f} testID="input-f" />
            <NumericField id="torna-ap" label="Talaş derinliği" hint={`${formatRange('length', [0.5, 3], unitSystem)} ${unitLabel('length', unitSystem)}`} kind="length" value={d.ap} onChange={(v) => updateDraft('torna', { ap: v })} status={errors.ap ? 'error' : 'neutral'} error={errors.ap} testID="input-ap" />
            <NumericField id="torna-ra" label="Hedef yüzey pürüzlülüğü" hint={`Ra ${formatRange('ra', [0.8, 6.3], unitSystem)} ${unitLabel('ra', unitSystem)}`} kind="ra" value={d.targetRa} onChange={(v) => updateDraft('torna', { targetRa: v })} status={raOver ? 'warn' : 'neutral'} testID="input-ra" />
          </ListCard>
        </View>

        <ResultCard
          title="Torna değerleri"
          status={status}
          statusLabel={statusLabel}
          metrics={[
            { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
            { ...feedMetric({ feed, mode: feedMode, unitSystem, level: feedCheck.level, hasResult: !!result }) },
          ]}
          extras={[
            { label: 'Kesme hızı', note: result && result.limits.rpmClamped ? 'Limit sonrası efektif değer' : 'Hedef değer korunuyor', value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—', unit: unitLabel('vc', unitSystem), tone: 'accent', testID: 'result-vc' },
            { label: 'Yüzey pürüzlülüğü (Ra)', note: raOver ? 'Hedefin üzerinde — ilerlemeyi düşürün' : 'Hedef değer sağlanıyor', value: result ? formatQty('ra', result.ra, unitSystem) : '—', unit: unitLabel('ra', unitSystem), tone: raOver ? 'destructive' : 'success', testID: 'result-ra' },
            { label: 'Hedef Ra için ilerleme', note: 'f = √(32 × Ra × rε)', value: result && result.feedForTargetRa ? formatQty('f', result.feedForTargetRa, unitSystem) : '—', unit: unitLabel('f', unitSystem), tone: 'accent', testID: 'result-f-target' },
            { label: 'Talaş hacmi (Q)', note: 'ap × f × Vc', value: result ? formatQty('q', result.q, unitSystem) : '—', unit: unitLabel('q', unitSystem), tone: 'foreground', testID: 'result-q' },
            { label: 'İş mili gücü', note: powerOver ? 'Tezgâh gücünün üzerinde!' : `Verim %${Math.round(settings.efficiency * 100)}`, value: result ? formatQty('power', result.power, unitSystem) : '—', unit: unitLabel('power', unitSystem), tone: powerOver ? 'destructive' : 'foreground', testID: 'result-power' },
          ]}
        />

        <FeedCard
          n={result ? result.n : NaN} vf={feed.vf} fn={feed.fn} mode={feedMode} scopeLabel="Torna ekranı"
          onModeChange={(v) => { setFeedModeForOp('torna', v); toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)'); }}
          unitSystem={unitSystem} safety={feedCheck} fnRange={fnRange}
          extraNote="Tornada kumanda genelde G95 (mm/dev) modundadır. Katalog ilerlemesi f zaten mm/dev cinsindendir."
        />

        <MachineCheckCard
          diameter={d.d} z={null} feedMode={feedMode} unitSystem={unitSystem}
          vcRange={rec ? rec.vc : null} fRange={rec ? rec.f : null}
          suggestS={result ? result.n : NaN} suggestF={result ? result.vf : NaN}
          onApply={({ vc, fn }) => updateDraft('torna', { vc: Number(vc.toFixed(1)), f: Number(fn.toFixed(3)) })}
          note="Tornada tek kesici uç olduğu için diş başına ilerleme yoktur; f = mm/dev doğrudan kullanılır."
        />

        {result && result.feedForTargetRa ? (
          <Pressable
            onPress={() => { updateDraft('torna', { f: Math.floor(result.feedForTargetRa * 10000) / 10000 }); toast.success('Hedef Ra için ilerleme uygulandı'); }}
            testID="apply-ra-feed"
            style={styles.raBanner}
          >
            <Sparkles size={15} color={colors.primary} />
            <Text style={styles.raBannerText}>
              Hedef Ra {formatQty('ra', d.targetRa, unitSystem)} için ilerlemeyi {formatQty('f', result.feedForTargetRa, unitSystem)} {unitLabel('f', unitSystem)} yap
            </Text>
          </Pressable>
        ) : null}

        {rec ? (
          <RecommendPanel
            onApplyAll={() => { updateDraft('torna', { vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) }); toast.success('Önerilen değerler uygulandı'); }}
            items={[
              { key: 'vc', label: 'Kesme hızı (Vc)', kind: 'vc', range: rec.vc, status: vcEval.status, statusLabel: vcEval.label, onApply: () => updateDraft('torna', { vc: Math.round(midOf(rec.vc)) }) },
              { key: 'f', label: 'İlerleme (f)', kind: 'f', range: rec.f, status: fEval.status, statusLabel: fEval.label, onApply: () => updateDraft('torna', { f: Number(midOf(rec.f).toFixed(2)) }) },
            ]}
          />
        ) : null}

        <ToolLifeCard op="torna" vc={d.vc} vcRange={rec ? rec.vc : null} tool={d.tool} coolant={d.coolant || material.coolant} cycleSeconds={result && result.cycleSeconds ? result.cycleSeconds : 0} onApplyVc={(v) => updateDraft('torna', { vc: v })} />

        <MachineLimitCard op="torna" clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))} notes={result ? result.limits.notes : []} />

        <FormulaPanel
          rows={[
            { expr: 'n = (1.000 × Vc) / (π × D)', tag: 'Devir', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'Vf = f × n', tag: 'İlerleme', note: `f = ${formatQty('f', d.f, unitSystem)}` },
            { expr: 'Ra = f² / (32 × rε)', tag: 'Yüzey', note: `rε = ${formatQty('length', d.noseR, unitSystem)}` },
            { expr: 'f = √(32 × Ra × rε)', tag: 'Kontrol', note: `Hedef Ra = ${formatQty('ra', d.targetRa, unitSystem)}` },
          ]}
        />

        <Pressable onPress={() => { resetDraft('torna'); toast.success('Varsayılan değerlere dönüldü'); }} testID="reset-draft" style={styles.resetBtn}>
          <RotateCcw size={15} color={colors.mutedForeground} />
          <Text style={styles.resetText}>Varsayılanlara dön</Text>
        </Pressable>
      </View>

      <MaterialPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        op="torna"
        tool={d.tool}
        onSelect={(m) => {
          setActiveMaterialId(m.id);
          const r = recommended(m, 'torna', d.tool);
          if (r) updateDraft('torna', { vc: Math.round(midOf(r.vc)), f: Number(midOf(r.f).toFixed(2)) });
          toast.success(`${m.code} seçildi`, { description: 'Önerilen değerler uygulandı' });
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  raBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244,185,66,0.5)', backgroundColor: 'rgba(244,185,66,0.1)', paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  raBannerText: { flex: 1, fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 12, color: colors.primary },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md },
  resetText: { fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 12, color: colors.mutedForeground },
});
