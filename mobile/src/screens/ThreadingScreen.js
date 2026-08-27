import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Bolt, CircleDotDashed, RotateCcw, RotateCw, Save, Share2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/MaterialPicker';
import { MachineLimitCard } from '../components/MachineLimitCard';
import { ToolLifeCard } from '../components/ToolLifeCard';
import { FormulaPanel, ResultCard } from '../components/ResultCard';
import { FeedCard } from '../components/FeedCard';
import { MachineCheckCard } from '../components/MachineCheckCard';
import {
  BottomActionBar, Eyebrow, GhostButton, IconButton, ListCard, NumericField, PrimaryButton,
  ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, StatusChip, Stepper,
} from '../components/Primitives';
import { calcTapping, calcThreadMilling, calcThreadTurning, evaluateRange, threadingPassCount } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, resolveFeedMode } from '../lib/feed';
import { midOf, recommended, resolveLimits, TOOL_MATERIALS } from '../data/materials';
import { DIS_MODES, ENGAGEMENT_OPTIONS, TAP_TYPES, THREAD_SERIES, threadVcRange, threadsBySeries } from '../data/threads';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, formatSeconds, unitLabel } from '../lib/units';
import { colors, radius, spacing, fonts } from '../theme';

const MODE_ICONS = { kilavuz: Bolt, frezeleme: CircleDotDashed, torna: RotateCw };

function ChipScroll({ children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>
    </ScrollView>
  );
}

export default function ThreadingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history, setFeedModeForOp,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.dis;
  const recordId = route.params?.recordId;

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'dis') return;
    updateDraft('dis', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const seriesThreads = useMemo(() => threadsBySeries(d.series), [d.series]);
  const selectedThread = useMemo(() => seriesThreads.find((t) => t.id === d.threadId) || seriesThreads[0], [seriesThreads, d.threadId]);

  const vcRange = threadVcRange(activeMaterial, d.mode, d.tool);
  const limits = resolveLimits('dis', settings);

  const errors = useMemo(() => {
    const e = {};
    if (!(d.vc > 0)) e.vc = 'Kesme hızı sıfırdan büyük olmalı';
    if (!(d.pitch > 0)) e.pitch = 'Adım sıfırdan büyük olmalı';
    if (!(d.d > 0)) e.d = 'Diş çapı sıfırdan büyük olmalı';
    if (d.mode === 'kilavuz' && !(d.depth > 0)) e.depth = 'Diş derinliği girin';
    if (d.mode === 'frezeleme') {
      if (!(d.toolD > 0)) e.toolD = 'Takım çapı girin';
      else if (d.internal && d.toolD >= d.d) e.toolD = 'Takım çapı diş çapından küçük olmalı';
      if (!(d.fz > 0)) e.fz = 'Diş başına ilerleme girin';
      if (!(d.threadLength > 0)) e.threadLength = 'Diş boyu girin';
    }
    if (d.mode === 'torna' && !(d.length > 0)) e.length = 'Diş boyu girin';
    return e;
  }, [d]);
  const hasErrors = Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    if (d.mode === 'kilavuz') {
      return calcTapping({
        vc: d.vc, d: d.d, pitch: d.pitch, depth: d.depth, kc: activeMaterial.kc,
        tensile: (activeMaterial.tensile[0] + activeMaterial.tensile[1]) / 2,
        tapType: d.tapType, engagement: d.engagement, eta: settings.efficiency, limits,
      });
    }
    if (d.mode === 'frezeleme') {
      return calcThreadMilling({
        vc: d.vc, toolD: d.toolD, threadD: d.d, pitch: d.pitch, z: d.z, fz: d.fz,
        threadLength: d.threadLength, kc: activeMaterial.kc, internal: d.internal, eta: settings.efficiency, limits,
      });
    }
    return calcThreadTurning({
      vc: d.vc, d: d.d, pitch: d.pitch, length: d.length, kc: activeMaterial.kc,
      machinability: activeMaterial.machinability, angle: selectedThread ? selectedThread.angle : 60,
      internal: d.internal, eta: settings.efficiency, limits, passes: d.passes > 0 ? d.passes : null,
    });
  }, [d, activeMaterial, settings.efficiency, limits, hasErrors, selectedThread]);

  const vcEval = vcRange ? evaluateRange(d.vc, vcRange) : { status: 'neutral', label: '—' };
  const feedMode = resolveFeedMode(settings, 'dis');
  const feed = feedFromResult(result);
  const fnRange = d.mode === 'frezeleme' || !(d.pitch > 0) ? null : [d.pitch * 0.98, d.pitch * 1.02];
  const feedCheck = feedSafety({
    vf: feed.vf, fn: feed.fn, fnRange, maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: d.mode === 'frezeleme' ? settings.maxFeedPerRev : 0,
    clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const status = hasErrors ? 'error'
    : feedCheck.level === 'critical' ? 'error'
      : vcEval.status === 'error' ? 'error'
        : feedCheck.level === 'warn' ? 'warn' : vcEval.status;
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Uygun' : 'Kontrol edin';

  const applyThread = (t) => {
    updateDraft('dis', {
      threadId: t.id, d: t.d, pitch: t.pitch,
      toolD: Math.max(2, Number((t.d * 0.65).toFixed(1))),
      threadLength: Math.max(5, Math.round(t.d * 1.5)),
      depth: Math.max(5, Math.round(t.d * 1.5)),
    });
  };

  const outputs = result ? {
    n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, torque: result.torque,
    power: result.power, tapDrill: result.tapDrill, passCount: result.passCount, cycleSeconds: result.cycleSeconds,
  } : null;

  const handleSave = () => {
    if (!result) { toast.error('Geçersiz giriş — önce alanları düzeltin'); return; }
    saveCalculation({
      op: 'dis', mode: d.mode, materialId: activeMaterial.id, materialCode: activeMaterial.code, materialName: activeMaterial.name,
      threadLabel: selectedThread ? selectedThread.label : '', unitSystem, inputs: { ...d }, outputs,
    });
    toast.success('Hesaplama kaydedildi', { description: `${selectedThread ? selectedThread.label : ''} · ${formatNumber(result.n, 0)} dev/dk` });
  };

  const handleShare = async () => {
    if (!result) { toast.error('Paylaşılacak geçerli sonuç yok'); return; }
    const text = buildShareText(
      { op: 'dis', mode: d.mode, materialCode: activeMaterial.code, threadLabel: selectedThread ? selectedThread.label : '', inputs: d, outputs },
      unitSystem, activeMaterial.name,
    );
    const res = await shareText(text);
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  const feedM = feedMetric({ feed, mode: feedMode, unitSystem, level: feedCheck.level, hasResult: !!result });
  const metrics = [];
  const extras = [];
  if (d.mode === 'kilavuz') {
    metrics.push(
      { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
      { ...feedM },
    );
    extras.push(
      { label: 'Kılavuz matkap çapı', note: `%${d.engagement} diş dolgunluğu`, value: result ? formatQty('length', result.tapDrill, unitSystem) : '—', unit: unitLabel('length', unitSystem), tone: 'accent', testID: 'result-tapdrill' },
      { label: 'Tork', note: d.tapType === 'yuvarlak' ? 'Ovalama kılavuzu' : 'M = kc × P × d / 8000', value: result ? formatQty('torque', result.torque, unitSystem) : '—', unit: unitLabel('torque', unitSystem), tone: 'foreground', testID: 'result-torque' },
      { label: 'Güç', note: `Verim %${Math.round(settings.efficiency * 100)}`, value: result ? formatQty('power', result.power, unitSystem) : '—', unit: unitLabel('power', unitSystem), tone: 'foreground', testID: 'result-power' },
      { label: 'Diş dip çapı', note: 'D1 = d − 1,0825 × P', value: result ? formatQty('length', result.minorDiameter, unitSystem) : '—', unit: unitLabel('length', unitSystem), tone: 'foreground', testID: 'result-minor' },
      { label: 'Çevrim süresi', note: `${result ? formatNumber(result.turns, 1) : '—'} tur (giriş + çıkış)`, value: result ? formatSeconds(result.cycleSeconds) : '—', unit: '', tone: 'accent', testID: 'result-cycle' },
    );
  } else if (d.mode === 'frezeleme') {
    metrics.push(
      { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
      { ...feedM, label: `Merkez ilerlemesi (${feedMode})` },
    );
    extras.push(
      { label: 'Çevresel ilerleme', note: 'Vf = fz × z × n', value: result ? formatQty('vf', result.vfPeriphery, unitSystem) : '—', unit: unitLabel('vf', unitSystem), tone: 'accent', testID: 'result-vf-periphery' },
      { label: 'Helis telafisi', note: d.internal ? '(Ddiş − Dt) / Ddiş' : '(Ddiş + Dt) / Ddiş', value: result ? formatNumber(result.compensation, 3) : '—', unit: '×', tone: 'foreground', testID: 'result-compensation' },
      { label: 'Helis tur sayısı', note: 'Diş boyu / adım', value: result ? formatNumber(result.revolutions, 1) : '—', unit: 'tur', tone: 'foreground', testID: 'result-revolutions' },
      { label: 'Diş derinliği', note: 'h = 0,6134 × P', value: result ? formatQty('length', result.threadDepth, unitSystem) : '—', unit: unitLabel('length', unitSystem), tone: 'foreground', testID: 'result-depth' },
      { label: 'Çevrim süresi', note: 'Helis yol / ilerleme', value: result ? formatSeconds(result.cycleSeconds) : '—', unit: '', tone: 'accent', testID: 'result-cycle' },
    );
  } else {
    metrics.push(
      { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testID: 'result-n' },
      { label: 'Paso sayısı', value: result ? formatNumber(result.passCount, 0) : '—', unit: 'paso', tone: 'primary', testID: 'result-passes' },
    );
    extras.push(
      { label: feedM.label, note: feedM.sub || 'Vf = adım × devir', value: feedM.value, unit: feedM.unit, tone: feedM.tone === 'destructive' ? 'destructive' : 'accent', testID: 'result-vf' },
      { label: 'Toplam diş derinliği', note: d.internal ? 'H1 = 0,5413 × P' : 'h = 0,6134 × P', value: result ? formatQty('length', result.totalDepth, unitSystem) : '—', unit: unitLabel('length', unitSystem), tone: 'foreground', testID: 'result-total-depth' },
      { label: 'İlk / son paso', note: 'Degresif (sabit talaş alanı)', value: result ? `${formatQty('length', result.firstPass, unitSystem)} / ${formatQty('length', result.lastPass, unitSystem)}` : '—', unit: unitLabel('length', unitSystem), tone: 'foreground', testID: 'result-pass-depths' },
      { label: 'Çevrim süresi', note: 'Tüm pasolar + dönüş', value: result ? formatSeconds(result.cycleSeconds) : '—', unit: '', tone: 'accent', testID: 'result-cycle' },
    );
  }

  const formulaRows = d.mode === 'kilavuz'
    ? [
      { expr: 'n = (1.000 × Vc) / (π × d)', tag: 'Devir', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · d = ${formatQty('length', d.d, unitSystem)}` },
      { expr: 'Vf = adım × n', tag: 'İlerleme', note: `adım = ${formatQty('length', d.pitch, unitSystem)}` },
      { expr: 'M = kc × P × d / 8.000', tag: 'Tork', note: `kc = ${activeMaterial.kc} N/mm²` },
      { expr: 'Matkap = d − (%diş × P) / 76,98', tag: 'Matkap', note: `%${d.engagement} diş` },
    ]
    : d.mode === 'frezeleme'
      ? [
        { expr: 'n = (1.000 × Vc) / (π × Dt)', tag: 'Devir', note: `Dt = ${formatQty('length', d.toolD, unitSystem)}` },
        { expr: 'Vf = fz × z × n', tag: 'Çevre', note: `fz = ${formatQty('fz', d.fz, unitSystem)} · z = ${d.z}` },
        { expr: 'Vf(merkez) = Vf × (Ddiş − Dt) / Ddiş', tag: 'Telafi', note: 'Helis interpolasyon' },
      ]
      : [
        { expr: 'n = (1.000 × Vc) / (π × D)', tag: 'Devir', note: `D = ${formatQty('length', d.d, unitSystem)}` },
        { expr: 'Vf = adım × n', tag: 'İlerleme', note: `adım = ${formatQty('length', d.pitch, unitSystem)}` },
        { expr: 'h = 0,6134 × P', tag: 'Derinlik', note: 'ISO 60° diş' },
        { expr: 'ap(i) = h × (√(i/N) − √((i−1)/N))', tag: 'Paso', note: 'Degresif dalma' },
      ];

  return (
    <ScreenShell
      testID="threading-screen"
      footer={(
        <BottomActionBar>
          <GhostButton icon={Share2} onPress={handleShare} testID="share-button" style={{ width: 48, paddingHorizontal: 0 }} />
          <PrimaryButton icon={Save} onPress={handleSave} testID="save-button">Hesaplamayı Kaydet</PrimaryButton>
        </BottomActionBar>
      )}
    >
      <ScreenHeader eyebrow="CNC PARAMETRELERİ" title="Kılavuz / Diş" onBack={() => navigation.goBack()} right={<IconButton icon={MODE_ICONS[d.mode] || Bolt} label="Diş" tone="primary" />} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl }}>
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <View>
          <SectionHeading eyebrow="YÖNTEM" title="Diş açma şekli" />
          <SegmentedToggle
            options={DIS_MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={d.mode}
            onChange={(v) => {
              const rng = threadVcRange(activeMaterial, v, d.tool);
              const patch = { mode: v, vc: rng ? Math.round(midOf(rng)) : d.vc };
              if (v === 'frezeleme' && d.internal && d.toolD >= d.d) patch.toolD = Math.max(1, Number((d.d * 0.65).toFixed(1)));
              updateDraft('dis', patch);
            }}
            testID="mode-toggle"
          />
          <Text style={styles.modeNote}>{(DIS_MODES.find((m) => m.id === d.mode) || {}).note}</Text>
        </View>

        <View>
          <SectionHeading eyebrow="DİŞ" title="Diş standardı" right={<StatusChip tone="accent">{seriesThreads.length} ölçü</StatusChip>} />
          <ListCard>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Seri</Eyebrow>
              <ChipScroll>
                {THREAD_SERIES.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => { const list = threadsBySeries(s.id); updateDraft('dis', { series: s.id }); if (list.length) applyThread(list[0]); }}
                    testID={`series-${s.id}`}
                    style={[styles.chip, d.series === s.id ? styles.chipActive : styles.chipInactive]}
                  >
                    <Text style={[styles.chipText, d.series === s.id && { color: colors.primaryForeground }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </ChipScroll>
            </View>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow>Ölçü</Eyebrow>
                <Text style={styles.selectedThread} testID="selected-thread">
                  {selectedThread ? `${selectedThread.label} · adım ${formatNumber(selectedThread.pitch, 2)} mm` : '—'}
                </Text>
              </View>
              <ChipScroll>
                {seriesThreads.map((t) => (
                  <Pressable key={t.id} onPress={() => applyThread(t)} testID={`thread-${t.label.replace(/[^A-Za-z0-9./#-]/g, '')}`} style={[styles.chip, d.threadId === t.id ? styles.chipActivePrimary10 : styles.chipInactive]}>
                    <Text style={[styles.chipText, d.threadId === t.id && { color: colors.primary }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </ChipScroll>
              {selectedThread && selectedThread.isPipe ? (
                <Text style={styles.modeNote}>Boru dişi · tablo matkap çapı {formatNumber(selectedThread.tapDrill, 2)} mm</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, borderRightWidth: 1, borderColor: colors.border }}>
                <NumericField id="dis-d" label="Diş çapı" kind="length" value={d.d} onChange={(v) => updateDraft('dis', { d: v })} status={errors.d ? 'error' : 'neutral'} error={errors.d} testID="input-d" />
              </View>
              <View style={{ flex: 1 }}>
                <NumericField id="dis-pitch" label="Adım (P)" kind="length" value={d.pitch} onChange={(v) => updateDraft('dis', { pitch: v })} status={errors.pitch ? 'error' : 'neutral'} error={errors.pitch} testID="input-pitch" />
              </View>
            </View>
          </ListCard>
        </View>

        <View>
          <SectionHeading eyebrow="GİRİŞLER" title="Kesme parametreleri" />
          <ListCard>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              <Eyebrow style={{ marginBottom: spacing.sm }}>Takım malzemesi</Eyebrow>
              <SegmentedToggle options={TOOL_MATERIALS} value={d.tool} onChange={(v) => { const rng = threadVcRange(activeMaterial, d.mode, v); updateDraft('dis', { tool: v, vc: rng ? Math.round(midOf(rng)) : d.vc }); }} testID="tool-toggle" />
            </View>
            <NumericField id="dis-vc" label="Kesme hızı" hint={vcRange ? `Önerilen: ${formatRange('vc', vcRange, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''} hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'} kind="vc" value={d.vc} onChange={(v) => updateDraft('dis', { vc: v })} status={errors.vc ? 'error' : vcEval.status} error={errors.vc} testID="input-vc" />

            {d.mode === 'kilavuz' ? (
              <>
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Eyebrow style={{ marginBottom: spacing.sm }}>Kılavuz tipi</Eyebrow>
                  <SegmentedToggle options={TAP_TYPES.map((t) => ({ id: t.id, label: t.label }))} value={d.tapType} onChange={(v) => updateDraft('dis', { tapType: v })} testID="tap-type-toggle" />
                </View>
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Eyebrow>Diş dolgunluğu</Eyebrow>
                    <Text style={styles.selectedThread}>%{d.engagement}</Text>
                  </View>
                  <ChipScroll>
                    {ENGAGEMENT_OPTIONS.map((e) => (
                      <Pressable key={e} onPress={() => updateDraft('dis', { engagement: e })} testID={`engagement-${e}`} style={[styles.chip, d.engagement === e ? styles.chipActiveAccent : styles.chipInactive]}>
                        <Text style={[styles.chipText, d.engagement === e && { color: colors.accent }]}>%{e}</Text>
                      </Pressable>
                    ))}
                  </ChipScroll>
                </View>
                <NumericField id="dis-depth" label="Diş derinliği" hint="Çevrim süresi için" kind="length" value={d.depth} onChange={(v) => updateDraft('dis', { depth: v })} status={errors.depth ? 'error' : 'neutral'} error={errors.depth} testID="input-depth" />
              </>
            ) : null}

            {d.mode === 'frezeleme' ? (
              <>
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Eyebrow style={{ marginBottom: spacing.sm }}>Diş konumu</Eyebrow>
                  <SegmentedToggle options={[{ id: 'ic', label: 'İç diş' }, { id: 'dis', label: 'Dış diş' }]} value={d.internal ? 'ic' : 'dis'} onChange={(v) => updateDraft('dis', { internal: v === 'ic' })} tone="secondary" testID="internal-toggle" />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, borderRightWidth: 1, borderColor: colors.border }}>
                    <NumericField id="dis-toold" label="Takım çapı" kind="length" value={d.toolD} onChange={(v) => updateDraft('dis', { toolD: v })} status={errors.toolD ? 'error' : 'neutral'} error={errors.toolD} testID="input-toold" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NumericField id="dis-fz" label="fz" kind="fz" value={d.fz} onChange={(v) => updateDraft('dis', { fz: v })} status={errors.fz ? 'error' : 'neutral'} error={errors.fz} testID="input-fz" />
                  </View>
                </View>
                <Stepper label="Ağız sayısı" hint={`${d.z} ağız`} value={d.z} min={1} max={8} onChange={(v) => updateDraft('dis', { z: v })} testID="stepper-z" />
                <NumericField id="dis-length" label="Diş boyu" kind="length" value={d.threadLength} onChange={(v) => updateDraft('dis', { threadLength: v })} status={errors.threadLength ? 'error' : 'neutral'} error={errors.threadLength} testID="input-thread-length" />
              </>
            ) : null}

            {d.mode === 'torna' ? (
              <>
                <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  <Eyebrow style={{ marginBottom: spacing.sm }}>Diş konumu</Eyebrow>
                  <SegmentedToggle options={[{ id: 'dis', label: 'Dış diş' }, { id: 'ic', label: 'İç diş' }]} value={d.internal ? 'ic' : 'dis'} onChange={(v) => updateDraft('dis', { internal: v === 'ic' })} tone="secondary" testID="internal-toggle" />
                </View>
                <NumericField id="dis-length2" label="Diş boyu" kind="length" value={d.length} onChange={(v) => updateDraft('dis', { length: v })} status={errors.length ? 'error' : 'neutral'} error={errors.length} testID="input-length" />
                <Stepper label="Paso sayısı (0 = otomatik)" hint={d.passes > 0 ? `${d.passes} paso` : `Otomatik: ${threadingPassCount(d.pitch, activeMaterial.machinability)} paso`} value={d.passes || 0} min={0} max={30} onChange={(v) => updateDraft('dis', { passes: v })} testID="stepper-passes" />
              </>
            ) : null}
          </ListCard>
        </View>

        <ResultCard
          title={d.mode === 'kilavuz' ? 'Kılavuz değerleri' : d.mode === 'frezeleme' ? 'Diş frezesi değerleri' : 'Diş çekme değerleri'}
          status={status}
          statusLabel={statusLabel}
          metrics={metrics}
          extras={extras}
        />

        <FeedCard
          n={result ? result.n : NaN} vf={feed.vf} fn={feed.fn} mode={feedMode} scopeLabel="Kılavuz / Diş ekranı"
          onModeChange={(v) => { setFeedModeForOp('dis', v); toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)'); }}
          unitSystem={unitSystem} safety={feedCheck} fnRange={fnRange}
          extraNote={d.mode === 'frezeleme' ? 'Diş frezesinde merkez ilerlemesi helis telafisiyle hesaplanır.' : 'Diş açmada devir başına ilerleme DAİMA diş adımına eşittir (G95 F = adım). G94 modunda F = adım × devir.'}
        />

        <MachineCheckCard
          diameter={d.mode === 'frezeleme' ? d.toolD : d.d}
          z={d.mode === 'frezeleme' ? d.z : null}
          feedMode={feedMode} unitSystem={unitSystem} vcRange={vcRange} fRange={fnRange}
          fzHint={d.mode === 'frezeleme' ? 'Ağız sayısı girilmedi' : 'Kılavuz/diş tornalamada diş başına ilerleme kullanılmaz'}
          suggestS={result ? result.n : NaN} suggestF={result ? result.vf : NaN}
          onApply={({ vc, fz }) => updateDraft('dis', { vc: Number(vc.toFixed(1)), ...(d.mode === 'frezeleme' && Number.isFinite(fz) && fz > 0 ? { fz: Number(fz.toFixed(3)) } : {}) })}
          note={d.mode === 'frezeleme' ? 'Diş frezesinde çap olarak TAKIM çapı kullanılır; devir bu çaptan hesaplanır.' : `Kılavuz ve diş tornalamada devir başına ilerleme DAİMA diş adımına eşit olmalıdır: f = ${formatQty('length', d.pitch, unitSystem)} ${unitLabel('f', unitSystem)}.`}
        />

        {d.mode === 'torna' && result ? (
          <View testID="pass-plan">
            <SectionHeading eyebrow="PASO PLANI" title="Dalma derinlikleri" />
            <ListCard>
              {result.schedule.map((p) => (
                <View key={p.pass} style={styles.passRow}>
                  <Text style={styles.passLabel}>{p.pass}. paso</Text>
                  <Text style={styles.passValue}>{formatQty('length', p.depth, unitSystem)}</Text>
                  <Text style={styles.passCumulative}>kümülatif {formatQty('length', p.cumulative, unitSystem)} {unitLabel('length', unitSystem)}</Text>
                </View>
              ))}
            </ListCard>
          </View>
        ) : null}

        <ToolLifeCard op="dis" vc={d.vc} vcRange={vcRange} tool={d.tool} coolant={activeMaterial.coolant} cycleSeconds={result ? result.cycleSeconds : 0} onApplyVc={(v) => updateDraft('dis', { vc: v })} />

        <MachineLimitCard op="dis" clamped={!!(result && result.limits && (result.limits.rpmClamped || result.limits.feedClamped))} notes={result && result.limits ? result.limits.notes : []} />

        <FormulaPanel rows={formulaRows} />

        <Pressable onPress={() => { resetDraft('dis'); toast.success('Varsayılan değerlere dönüldü'); }} testID="reset-draft" style={styles.resetBtn}>
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
          const rng = threadVcRange(m, d.mode, d.tool);
          if (rng) updateDraft('dis', { vc: Math.round(midOf(rng)) });
          toast.success(`${m.code} seçildi`, { description: 'Önerilen kesme hızı uygulandı' });
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  modeNote: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground, marginTop: spacing.sm },
  chip: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipActivePrimary10: { borderColor: colors.primary, backgroundColor: 'rgba(244,185,66,0.1)' },
  chipActiveAccent: { borderColor: colors.accent, backgroundColor: 'rgba(85,198,195,0.15)' },
  chipInactive: { borderColor: colors.border, backgroundColor: colors.input },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.cardForeground },
  selectedThread: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primary },
  passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  passLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.mutedForeground },
  passValue: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.primary },
  passCumulative: { fontFamily: fonts.body, fontSize: 11, color: colors.mutedForeground },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md },
  resetText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.mutedForeground },
});
