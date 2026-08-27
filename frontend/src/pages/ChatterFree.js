import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, AudioWaveform, Gauge, RotateCcw, Save, Share2, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/talas/MaterialPicker';
import { MachineLimitCard } from '../components/talas/MachineLimitCard';
import { HardnessCard } from '../components/talas/HardnessCard';
import { ToolLifeCard } from '../components/talas/ToolLifeCard';
import { FormulaPanel, ResultCard } from '../components/talas/ResultCard';
import { FeedCard } from '../components/talas/FeedCard';
import {
  BottomActionBar, ClampNotice, Eyebrow, GhostButton, IconButton, NumericField,
  PrimaryButton, ScreenHeader, ScreenShell, SectionHeading, SegmentedToggle, StatusChip, Stepper,
} from '../components/talas/Primitives';
import { adjustForHardness, calcChatterFree, calcTrochoidalSlot, evaluateRange, HEM_AE_PRESETS } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, fzRangeToFnRange, normalizeFeedMode } from '../lib/feed';
import { ChatterListener } from '../components/talas/ChatterListener';
import { midOf, recommended, resolveLimits, TOOL_MATERIALS } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, formatSeconds, unitLabel } from '../lib/units';

export default function ChatterFree() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history, updateSettings,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.chatter;
  const recordId = params.get('record');

  const material = useMemo(
    () => (d.hardnessOverride > 0 ? adjustForHardness(activeMaterial, d.hardnessOverride) : activeMaterial),
    [activeMaterial, d.hardnessOverride],
  );

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'chatter') return;
    updateDraft('chatter', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const rec = recommended(material, 'freze', d.tool);
  const limits = resolveLimits('freze', settings);

  const errors = useMemo(() => {
    const e = {};
    if (!(d.d > 0)) e.d = 'Takım çapı sıfırdan büyük olmalı';
    if (!(d.fluteLength > 0)) e.fluteLength = 'Kesici (helis) boyu girin';
    if (!(d.ap > 0)) e.ap = 'Eksenel derinlik girin';
    if (!(d.ae > 0)) e.ae = 'Radyal kavrama girin';
    else if (d.ae > d.d / 2) e.ae = 'Chatter-free için radyal kavrama D/2’den küçük olmalı';
    if (!(d.vc > 0)) e.vc = 'Kesme hızı sıfırdan büyük olmalı';
    if (!(d.fz > 0)) e.fz = 'Hedef diş başına ilerleme girin';
    return e;
  }, [d]);
  const hasErrors = Object.keys(errors).length > 0;

  const result = useMemo(() => {
    if (hasErrors) return null;
    return calcChatterFree({
      vc: d.vc, d: d.d, z: d.z, fzTarget: d.fz, ap: d.ap, ae: d.ae,
      kc: material.kc, fluteLength: d.fluteLength, eta: settings.efficiency,
      limits, vcFactor: d.vcFactor || 1, chatterHz: d.chatterHz || 0,
    });
  }, [d, material, settings.efficiency, limits, hasErrors]);

  const slot = useMemo(() => {
    if (!result) return null;
    return calcTrochoidalSlot({
      width: d.slotWidth, length: d.slotLength, depth: d.slotDepth,
      d: d.d, ae: d.ae, ap: d.ap, vf: result.vf, q: result.q,
    });
  }, [result, d.slotWidth, d.slotLength, d.slotDepth, d.d, d.ae, d.ap]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fzEval = rec ? evaluateRange(d.fz, rec.fz) : { status: 'neutral', label: '—' };
  const hasWarn = !!(result && result.warnings.length);
  const feedMode = normalizeFeedMode(settings.feedMode);
  const feed = feedFromResult(result);
  const fnRange = rec && result
    ? fzRangeToFnRange([rec.fz[0] * result.rctf, rec.fz[1] * result.rctf], d.z)
    : null;
  const feedCheck = feedSafety({
    vf: feed.vf,
    fn: feed.fn,
    fnRange,
    maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: settings.maxFeedPerRev,
    clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const status = hasErrors ? 'error' : (vcEval.status === 'error' || fzEval.status === 'error' || feedCheck.level === 'critical')
    ? 'error' : (hasWarn || vcEval.status === 'warn' || fzEval.status === 'warn' || feedCheck.level === 'warn') ? 'warn' : 'ok';
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Chatter-free' : 'Kontrol edin';

  const outputs = result ? {
    n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q,
    power: result.power, torque: result.torque, rctf: result.rctf,
    fzProgrammed: result.fzProgrammed, toothPassHz: result.toothPassHz,
    edgeUseRatio: result.edgeUseRatio, mrrGain: result.comparison.mrrGain,
  } : null;

  const handleSave = () => {
    if (!result) { toast.error('Geçersiz giriş — önce alanları düzeltin'); return; }
    saveCalculation({
      op: 'chatter',
      materialId: activeMaterial.id,
      materialCode: activeMaterial.code,
      materialName: activeMaterial.name,
      unitSystem,
      inputs: { ...d },
      outputs,
    });
    toast.success('Chatter-free hesabı kaydedildi', {
      description: `${formatNumber(result.n, 0)} dev/dk · ${formatQty('vf', result.vf, unitSystem)} ${unitLabel('vf', unitSystem)}`,
    });
  };

  const handleShare = async () => {
    if (!result) { toast.error('Paylaşılacak geçerli sonuç yok'); return; }
    const res = await shareText(buildShareText(
      { op: 'chatter', materialCode: activeMaterial.code, inputs: d, outputs },
      unitSystem, activeMaterial.name,
    ));
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="CHATTER-FREE FREZELEME"
        title="Yüksek Verimli Kesme"
        onBack={() => navigate('/')}
        right={<IconButton icon={AudioWaveform} label="Chatter-free" tone="primary" />}
      />

      <main className="space-y-6 px-5 pt-4">
        <div className="rounded-theme border border-accent/40 bg-accent/10 px-4 py-3">
          <div className="flex gap-3">
            <Zap className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" />
            <p className="text-xs leading-5 text-muted-foreground">
              <span className="font-semibold text-accent">Chatter-free (HEM) mantığı:</span> kesicinin helis
              boyunun tamamı kadar dalınır (ap = kesici boyu), radyal kavrama küçük tutulur (ae ≈ %5–15 × D).
              Talaş, takımın yan duvarı/helisiyle kesilir; ısı ve aşınma tüm kenara yayılır, titreşim düşer.
              İnce talaş nedeniyle <span className="font-semibold text-accent">ilerleme telafisi (RCTF)</span>{' '}
              zorunludur — burada otomatik uygulanır.
            </p>
          </div>
        </div>

        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <HardnessCard
          op="freze"
          material={activeMaterial}
          adjusted={material}
          value={d.hardnessOverride || 0}
          onChange={(v) => updateDraft('chatter', { hardnessOverride: v })}
        />

        <section aria-label="Takım">
          <SectionHeading eyebrow="TAKIM" title="Kesici bilgisi" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Takım tipi (değişken helis önerilir)</Eyebrow>
              <SegmentedToggle
                options={TOOL_MATERIALS}
                value={d.tool}
                onChange={(v) => updateDraft('chatter', { tool: v })}
                ariaLabel="Takım tipi"
                testId="tool-toggle"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="cf-d" label="Takım çapı" kind="length" value={d.d}
                onChange={(v) => updateDraft('chatter', { d: v })}
                status={errors.d ? 'error' : 'neutral'} error={errors.d} testId="input-d"
              />
              <NumericField
                id="cf-flute" label="Kesici (helis) boyu" kind="length" value={d.fluteLength}
                onChange={(v) => updateDraft('chatter', { fluteLength: v, ap: v })}
                status={errors.fluteLength ? 'error' : 'neutral'} error={errors.fluteLength}
                testId="input-flute"
              />
            </div>
            <Stepper
              label="Ağız sayısı" hint={`${d.z} ağız`} value={d.z} min={2} max={12}
              onChange={(v) => updateDraft('chatter', { z: v })} testId="stepper-z"
            />
          </div>
        </section>

        <section aria-label="Kavrama">
          <SectionHeading
            eyebrow="KAVRAMA"
            title="Dalma ve yan adım"
            right={result ? <StatusChip tone="accent">%{formatNumber(result.aePercent, 1)} ae</StatusChip> : null}
          />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <NumericField
              id="cf-ap"
              label="Eksenel dalma (ap)"
              hint={`Kesici boyu ${formatQty('length', d.fluteLength, unitSystem)} ${unitLabel('length', unitSystem)}`}
              kind="length" value={d.ap}
              onChange={(v) => updateDraft('chatter', { ap: v })}
              status={errors.ap ? 'error' : 'neutral'} error={errors.ap} testId="input-ap"
            />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>Radyal kavrama (ae) — çapın yüzdesi</Eyebrow>
                <span className="text-[11px] font-semibold text-primary">
                  {formatQty('length', d.ae, unitSystem)} {unitLabel('length', unitSystem)}
                </span>
              </div>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {HEM_AE_PRESETS.map((pct) => {
                  const val = Number(((d.d * pct) / 100).toFixed(3));
                  const active = Math.abs(d.ae - val) < 0.005;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => updateDraft('chatter', { ae: val })}
                      data-testid={`ae-${pct}`}
                      className={`shrink-0 rounded-theme border px-3 py-2 text-left transition-colors ${
                        active ? 'border-primary bg-primary/10' : 'border-border bg-input'
                      }`}
                    >
                      <span className={`block text-xs font-semibold ${active ? 'text-primary' : 'text-card-foreground'}`}>
                        %{pct}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatNumber(val, 2)} mm
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <NumericField
              id="cf-ae" label="Radyal kavrama (ae)" kind="length" value={d.ae}
              onChange={(v) => updateDraft('chatter', { ae: v })}
              status={errors.ae ? 'error' : 'neutral'} error={errors.ae} testId="input-ae"
            />
          </div>
        </section>

        <section aria-label="Kesme parametreleri">
          <SectionHeading eyebrow="GİRİŞLER" title="Kesme parametreleri" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <NumericField
              id="cf-vc" label="Kesme hızı (Vc)"
              hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''}
              hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'}
              kind="vc" value={d.vc}
              onChange={(v) => updateDraft('chatter', { vc: v })}
              status={errors.vc ? 'error' : vcEval.status} error={errors.vc} testId="input-vc"
            />
            <NumericField
              id="cf-fz" label="Hedef diş başına ilerleme (fz)"
              hint={rec ? `Önerilen: ${formatRange('fz', rec.fz, unitSystem)} ${unitLabel('fz', unitSystem)}` : ''}
              hintTone={fzEval.status === 'ok' ? 'muted' : 'warn'}
              kind="fz" value={d.fz}
              onChange={(v) => updateDraft('chatter', { fz: v })}
              status={errors.fz ? 'error' : fzEval.status} error={errors.fz} testId="input-fz"
            />
            <NumericField
              id="cf-vcf" label="Vc artış faktörü"
              hint="HEM'de ısı kenara yayıldığı için Vc artırılabilir (1,0–1,5)"
              kind="deg" unitOverride="×" value={d.vcFactor || 1}
              onChange={(v) => updateDraft('chatter', { vcFactor: Math.min(Math.max(v, 0.5), 2) })}
              testId="input-vcfactor"
            />
          </div>
        </section>

        <ResultCard
          title="Chatter-free değerleri"
          status={status}
          statusLabel={statusLabel}
          metrics={[
            { label: 'Devir', value: result ? formatNumber(result.n, 0) : '—', unit: unitLabel('rpm', unitSystem), tone: 'primary', testId: 'result-n' },
            { ...feedMetric({ feed, mode: feedMode, unitSystem, level: feedCheck.level, hasResult: !!result }) },
          ]}
          extras={[
            { label: 'Telafi faktörü (RCTF)', note: '1 / √(1 − (1 − 2·ae/D)²)', value: result ? formatNumber(result.rctf, 3) : '—', unit: '×', tone: 'accent', testId: 'result-rctf' },
            { label: 'Programlanan fz', note: `Hedef ${formatQty('fz', d.fz, unitSystem)} → telafili`, value: result ? formatQty('fz', result.fzProgrammed, unitSystem) : '—', unit: unitLabel('fz', unitSystem), tone: 'accent', testId: 'result-fzprog' },
            { label: 'Gerçek talaş kalınlığı (hm)', note: 'Hedefe eşit olmalı', value: result ? formatQty('fz', result.hm, unitSystem) : '—', unit: unitLabel('fz', unitSystem), tone: 'success', testId: 'result-hm' },
            { label: 'Efektif kesme hızı', note: result && result.limits.rpmClamped ? 'Limit sonrası' : `Vc × ${formatNumber(d.vcFactor || 1, 2)}`, value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—', unit: unitLabel('vc', unitSystem), tone: 'foreground', testId: 'result-vc' },
            { label: 'Talaş hacmi (Q)', note: 'ap × ae × Vf', value: result ? formatQty('q', result.q, unitSystem) : '—', unit: unitLabel('q', unitSystem), tone: 'foreground', testId: 'result-q' },
            { label: 'İş mili gücü', note: `Verim %${Math.round(settings.efficiency * 100)}`, value: result ? formatQty('power', result.power, unitSystem) : '—', unit: unitLabel('power', unitSystem), tone: 'foreground', testId: 'result-power' },
            { label: 'Kavrama açısı', note: 'Küçük açı = düşük radyal kuvvet', value: result ? formatNumber(result.engagement, 1) : '—', unit: '°', tone: 'accent', testId: 'result-engagement' },
          ]}
        />

        <FeedCard
          n={result ? result.n : NaN}
          vf={feed.vf}
          fn={feed.fn}
          mode={feedMode}
          onModeChange={(v) => {
            updateSettings({ feedMode: v });
            toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)');
          }}
          unitSystem={unitSystem}
          safety={feedCheck}
          fnRange={fnRange}
          extraNote="HEM/chatter-free'de fn, RCTF telafili fz × z değerinden gelir. Yüksek mm/dk değeri normaldir; tezgâh G95 modundaysa mm/dev karşılığını gir."
        />

        {result ? (
          <section aria-label="Kazanç" data-testid="gain-card">
            <SectionHeading eyebrow="KAZANÇ" title="Klasik frezelemeye göre" />
            <div className="overflow-hidden rounded-theme border border-success/40 bg-card">
              <div className="h-1 bg-success" />
              <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                <div className="px-4 py-4">
                  <Eyebrow>Talaş hacmi kazancı</Eyebrow>
                  <p className={`num-xl mt-1 ${result.comparison.mrrGain >= 1 ? 'text-success' : 'text-primary'}`} data-testid="result-gain">
                    {formatNumber(result.comparison.mrrGain, 2)}×
                  </p>
                  <p className="mt-1 text-xs font-semibold text-card-foreground">
                    {result.comparison.timeSavingPct >= 0
                      ? `süre −%${formatNumber(result.comparison.timeSavingPct, 0)}`
                      : `süre +%${formatNumber(-result.comparison.timeSavingPct, 0)}`}
                  </p>
                </div>
                <div className="px-4 py-4">
                  <Eyebrow>Kesici kenar kullanımı</Eyebrow>
                  <p className="num-xl mt-1 text-primary" data-testid="result-edge">
                    {formatNumber(result.edgeUseRatio, 1)}×
                  </p>
                  <p className="mt-1 text-xs font-semibold text-card-foreground">daha uzun kenar</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <TrendingUp className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Klasik referans: ap {formatQty('length', result.comparison.apConventional, unitSystem)} ·
                  ae {formatQty('length', result.comparison.aeConventional, unitSystem)} {unitLabel('length', unitSystem)} ·
                  Vf {formatQty('vf', result.comparison.vfConventional, unitSystem)} {unitLabel('vf', unitSystem)} ·
                  Q {formatQty('q', result.comparison.qConventional, unitSystem)} {unitLabel('q', unitSystem)}.
                  Aşınma {formatNumber(result.edgeUseRatio, 1)}× daha uzun kenara yayıldığı için takım ömrü de uzar.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-label="Trokoidal kanal" data-testid="slot-card">
          <SectionHeading
            eyebrow="TROKOİDAL KANAL"
            title="Kanal planı ve süre"
            right={slot ? <StatusChip tone="accent">{slot.totalPasses} paso</StatusChip> : null}
          />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="cf-sw" label="Kanal genişliği" kind="length" value={d.slotWidth}
                onChange={(v) => updateDraft('chatter', { slotWidth: v })}
                status={d.slotWidth < d.d ? 'error' : 'neutral'}
                error={d.slotWidth < d.d ? 'Kanal genişliği takım çapından küçük olamaz' : undefined}
                testId="input-slot-width"
              />
              <NumericField
                id="cf-sl" label="Kanal boyu" kind="length" value={d.slotLength}
                onChange={(v) => updateDraft('chatter', { slotLength: v })}
                testId="input-slot-length"
              />
            </div>
            <NumericField
              id="cf-sd" label="Kanal derinliği" kind="length" value={d.slotDepth}
              onChange={(v) => updateDraft('chatter', { slotDepth: v })}
              hint={`Dalma ${formatQty('length', d.ap, unitSystem)} ${unitLabel('length', unitSystem)} → kat sayısı otomatik`}
              testId="input-slot-depth"
            />
            {slot ? (
              <>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-4 py-4">
                    <Eyebrow>Radyal paso</Eyebrow>
                    <p className="num-xl mt-1 text-primary" data-testid="slot-radial">{slot.radialPasses}</p>
                    <p className="mt-1 text-xs font-semibold text-card-foreground">yan adım × {formatQty('length', d.ae, unitSystem)}</p>
                  </div>
                  <div className="px-4 py-4">
                    <Eyebrow>Eksenel kat</Eyebrow>
                    <p className="num-xl mt-1 text-foreground" data-testid="slot-layers">{slot.axialLayers}</p>
                    <p className="mt-1 text-xs font-semibold text-card-foreground">toplam {slot.totalPasses} paso</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Eyebrow>Toplam takım yolu</Eyebrow>
                    <p className="mt-0.5 text-xs text-muted-foreground">{slot.totalPasses} × {formatQty('length', d.slotLength, unitSystem)} {unitLabel('length', unitSystem)}</p>
                  </div>
                  <p className="num-md shrink-0 text-accent" data-testid="slot-path">
                    {formatNumber(slot.pathLength, 0)} mm
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Eyebrow>Tahmini süre</Eyebrow>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Kesme {formatSeconds(slot.cuttingMinutes * 60)} + %15 boşta hareket
                    </p>
                  </div>
                  <p className="num-lg shrink-0 text-primary" data-testid="slot-time">
                    {formatSeconds(slot.totalMinutes * 60)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Eyebrow>Kaldırılan hacim</Eyebrow>
                    <p className="mt-0.5 text-xs text-muted-foreground">Efektif MRR {formatNumber(slot.effectiveMrr, 1)} cm³/dk</p>
                  </div>
                  <p className="num-md shrink-0 text-foreground" data-testid="slot-volume">
                    {formatNumber(slot.volumeCm3, 1)} cm³
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section aria-label="Titreşim" data-testid="chatter-card">
          <SectionHeading
            eyebrow="TİTREŞİM"
            title="Chatter kontrolü"
            right={result ? <StatusChip tone="neutral" icon={Activity}>{formatNumber(result.toothPassHz, 0)} Hz</StatusChip> : null}
          />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Eyebrow>Diş geçiş frekansı</Eyebrow>
                <p className="mt-0.5 text-xs text-muted-foreground">f = n × z / 60</p>
              </div>
              <p className="num-md shrink-0 text-accent" data-testid="result-hz">
                {result ? formatNumber(result.toothPassHz, 0) : '—'} Hz
              </p>
            </div>
            <NumericField
              id="cf-chatter"
              label="Ölçülen chatter frekansı"
              hint="Titreşim sesi/ölçümü varsa girin · 0 = bilinmiyor"
              kind="deg" unitOverride="Hz" value={d.chatterHz || 0}
              onChange={(v) => updateDraft('chatter', { chatterHz: Math.max(0, v) })}
              testId="input-chatter-hz"
            />
            <div className="px-4 py-3">
              <ChatterListener onDetect={(hz) => updateDraft('chatter', { chatterHz: hz })} />
            </div>
            {result && result.chatterSpeeds.length ? (
              <div className="px-4 py-3">
                <Eyebrow className="mb-2">Kararlı devir önerileri · n = 60·fc / (z·(k+1))</Eyebrow>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {result.chatterSpeeds.map((s) => (
                    <button
                      key={s.lobe}
                      type="button"
                      onClick={() => {
                        const newVc = (Math.PI * d.d * s.rpm) / 1000 / (d.vcFactor || 1);
                        updateDraft('chatter', { vc: Math.round(newVc) });
                        toast.success(`${formatNumber(s.rpm, 0)} dev/dk için Vc ayarlandı`);
                      }}
                      data-testid={`chatter-lobe-${s.lobe}`}
                      className="shrink-0 rounded-theme border border-border bg-input px-3 py-2 text-left transition-colors active:bg-muted/60"
                    >
                      <span className="block text-xs font-semibold text-primary">
                        {formatNumber(s.rpm, 0)} dev/dk
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">lob k={s.lobe}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3">
                <Sparkles className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Titreşim varsa: <span className="font-semibold text-foreground">değişken helisli (variable helix)</span>{' '}
                  kesici kullanın, radyal kavramayı azaltın, takım çıkıntısını kısaltın. Chatter frekansını
                  ölçebiliyorsanız yukarıya girin; uygulama kararlı devir önerileri üretir.
                </p>
              </div>
            )}
          </div>
        </section>

        {result && result.warnings.length ? (
          <ClampNotice
            tone="warn"
            title="Dikkat edilmesi gerekenler"
            notes={result.warnings}
            testId="hem-warnings"
          />
        ) : null}

        <ToolLifeCard
          op="freze"
          vc={(d.vc || 0) * (d.vcFactor || 1)}
          vcRange={rec ? rec.vc : null}
          tool={d.tool}
          coolant={material.coolant}
          onApplyVc={(v) => updateDraft('chatter', { vc: Math.round(v / (d.vcFactor || 1)) })}
        />

        <MachineLimitCard
          op="freze"
          clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))}
          notes={result ? result.limits.notes : []}
        />

        <FormulaPanel
          rows={[
            { expr: 'RCTF = 1 / √(1 − (1 − 2·ae/D)²)', tag: 'Telafi', note: `ae = ${formatQty('length', d.ae, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'fz(prog) = fz(hedef) × RCTF', tag: 'İlerleme', note: `hedef fz = ${formatQty('fz', d.fz, unitSystem)}` },
            { expr: 'Vf = fz(prog) × z × n', tag: 'Tabla', note: `z = ${d.z}` },
            { expr: 'Q = ap × ae × Vf', tag: 'Hacim', note: `ap = ${formatQty('length', d.ap, unitSystem)}` },
            { expr: 'f = n × z / 60', tag: 'Titreşim', note: 'Diş geçiş frekansı' },
          ]}
        />

        <button
          type="button"
          onClick={() => { resetDraft('chatter'); toast.success('Varsayılan değerlere dönüldü'); }}
          data-testid="reset-draft"
          className="mx-auto flex items-center gap-2 pb-2 text-xs font-semibold text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Varsayılanlara dön
        </button>
      </main>

      <BottomActionBar>
        <GhostButton icon={Share2} onClick={handleShare} testId="share-button" className="w-12 shrink-0 px-0">
          <span className="sr-only">Paylaş</span>
        </GhostButton>
        <PrimaryButton icon={Save} onClick={handleSave} testId="save-button">
          Hesaplamayı Kaydet
        </PrimaryButton>
      </BottomActionBar>

      <MaterialPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        op="freze"
        tool={d.tool}
        onSelect={(m) => {
          setActiveMaterialId(m.id);
          const r = recommended(m, 'freze', d.tool);
          if (r) updateDraft('chatter', { vc: Math.round(midOf(r.vc)), fz: Number(midOf(r.fz).toFixed(3)) });
          toast.success(`${m.code} seçildi`, { description: 'Önerilen değerler uygulandı' });
        }}
      />
    </ScreenShell>
  );
}
