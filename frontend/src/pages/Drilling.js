import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Droplets, Drill, RotateCcw, Save, Share2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/talas/MaterialPicker';
import { MachineLimitCard } from '../components/talas/MachineLimitCard';
import { HardnessCard } from '../components/talas/HardnessCard';
import { ToolLifeCard } from '../components/talas/ToolLifeCard';
import { RecommendPanel } from '../components/talas/Recommend';
import { FormulaPanel, ResultCard } from '../components/talas/ResultCard';
import { FeedCard } from '../components/talas/FeedCard';
import { MachineCheckCard } from '../components/talas/MachineCheckCard';
import {
  BottomActionBar,
  Eyebrow,
  GhostButton,
  IconButton,
  NumericField,
  PrimaryButton,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  SegmentedToggle,
  Stepper,
} from '../components/talas/Primitives';
import { adjustForHardness, calcDrilling, evaluateRange, worstStatus } from '../lib/calc';
import { feedFromResult, feedMetric, feedSafety, resolveFeedMode } from '../lib/feed';
import { COOLANT_OPTIONS, coolantLabel, midOf, recommended, resolveLimits, TOOL_MATERIALS } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, formatSeconds, unitLabel } from '../lib/units';

export default function Drilling() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
  const recordId = params.get('record');

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
  const z = d.z > 0 ? d.z : 2;                        // matkap ağız (dudak) sayısı — standart 2
  const fzValue = d.f > 0 ? d.f / z : 0;              // diş başına ilerleme (mm/diş)
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
    return calcDrilling({
      vc: d.vc, d: d.d, f: d.f, depth: d.depth,
      kc: material.kc, eta: settings.efficiency, limits, peck: d.peck || 0,
    });
  }, [d, material, settings.efficiency, limits, hasErrors]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fEval = rec ? evaluateRange(d.f, rec.f) : { status: 'neutral', label: '—' };
  const deepHole = d.depth > d.d * 3;
  const powerOver = !!(result && limits && limits.powerKw && result.power > limits.powerKw);
  const feedMode = resolveFeedMode(settings, 'matkap');
  const feed = feedFromResult(result);
  const fnRange = rec ? rec.f : null;
  const feedCheck = feedSafety({
    vf: feed.vf,
    fn: feed.fn,
    fnRange,
    maxFeed: limits ? limits.maxFeed : 0,
    maxFeedPerRev: settings.maxFeedPerRev,
    clamped: !!(result && result.limits && result.limits.feedClamped),
  });
  const feedStatus = feedCheck.level === 'critical' ? 'error' : feedCheck.level === 'warn' ? 'warn' : 'ok';
  const status = hasErrors ? 'error' : worstStatus([vcEval.status, fEval.status, feedStatus, powerOver ? 'warn' : 'ok']);
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Uygun' : 'Kontrol edin';

  const handleSave = () => {
    if (!result) {
      toast.error('Geçersiz giriş — önce alanları düzeltin');
      return;
    }
    const entry = saveCalculation({
      op: 'matkap',
      materialId: activeMaterial.id,
      materialCode: activeMaterial.code,
      materialName: activeMaterial.name,
      unitSystem,
      inputs: { ...d },
      outputs: {
        n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q,
        power: result.power, torque: result.torque, cycleSeconds: result.cycleSeconds,
      },
    });
    toast.success('Hesaplama kaydedildi', { description: `${activeMaterial.code} · ${formatNumber(entry.outputs.n, 0)} dev/dk` });
  };

  const handleShare = async () => {
    if (!result) {
      toast.error('Paylaşılacak geçerli sonuç yok');
      return;
    }
    const text = buildShareText(
      {
        op: 'matkap', materialCode: activeMaterial.code, inputs: d,
        outputs: {
          n: result.n, vf: result.vf, fn: result.fn, vcEffective: result.vcEffective, q: result.q,
          power: result.power, torque: result.torque, cycleSeconds: result.cycleSeconds,
        },
      },
      unitSystem,
      activeMaterial.name,
    );
    const res = await shareText(text);
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="CNC PARAMETRELERİ"
        title="Matkap Hesabı"
        onBack={() => navigate('/')}
        right={<IconButton icon={Drill} label="Matkap" tone="primary" />}
      />

      <main className="space-y-6 px-5 pt-4">
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <HardnessCard
          op="matkap"
          material={activeMaterial}
          adjusted={material}
          value={d.hardnessOverride || 0}
          onChange={(v) => updateDraft('matkap', { hardnessOverride: v })}
        />

        <section aria-labelledby="takim-baslik">
          <SectionHeading eyebrow="TAKIM" title="Matkap bilgisi" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Matkap tipi</Eyebrow>
              <SegmentedToggle
                options={TOOL_MATERIALS}
                value={d.tool}
                onChange={(v) => updateDraft('matkap', { tool: v })}
                ariaLabel="Matkap tipi"
                testId="tool-toggle"
              />
            </div>
            <NumericField
              id="matkap-d"
              label="Matkap çapı"
              hint={`Aralık: ${formatRange('length', [1, 50], unitSystem)} ${unitLabel('length', unitSystem)}`}
              kind="length"
              value={d.d}
              onChange={(v) => updateDraft('matkap', { d: v })}
              status={errors.d ? 'error' : 'neutral'}
              error={errors.d}
              testId="input-d"
            />
            <Stepper
              label="Ağız (dudak) sayısı"
              hint={z === 2 ? 'Standart helis matkap = 2 ağız' : `${z} ağız · f = fz × ${z}`}
              value={z}
              min={1}
              max={4}
              onChange={(v) => updateDraft('matkap', { z: v })}
              testId="stepper-z"
            />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Eyebrow>Soğutma</Eyebrow>
                  <p className="mt-0.5 text-sm font-semibold text-card-foreground" data-testid="coolant-value">
                    {coolantLabel(d.coolant)}
                  </p>
                </div>
                <Droplets className="h-5 w-5 shrink-0 text-primary" />
              </div>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {COOLANT_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateDraft('matkap', { coolant: c.id })}
                    data-testid={`coolant-${c.id}`}
                    className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                      d.coolant === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-input text-card-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="kesme-baslik">
          <SectionHeading eyebrow="KESME PARAMETRELERİ" title="Değerleri girin" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <NumericField
              id="matkap-vc"
              label="Kesme hızı"
              hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''}
              hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'}
              kind="vc"
              value={d.vc}
              onChange={(v) => updateDraft('matkap', { vc: v })}
              status={errors.vc ? 'error' : vcEval.status}
              error={errors.vc}
              testId="input-vc"
            />
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">İlerleme nasıl girilecek?</Eyebrow>
              <SegmentedToggle
                options={[
                  { id: 'f', label: 'mm/dev (f)' },
                  { id: 'fz', label: 'mm/diş (fz)' },
                ]}
                value={feedInput}
                onChange={(v) => updateDraft('matkap', { feedInput: v })}
                ariaLabel="İlerleme giriş birimi"
                testId="feed-input-toggle"
              />
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                Katalog/tablo <strong className="text-card-foreground">diş başına (mm/diş)</strong> veriyorsa onu seçin —
                uygulama {z} ağızla çarpıp devir başına ilerlemeyi bulur: f = fz × {z}.
              </p>
            </div>
            {feedInput === 'fz' ? (
              <NumericField
                id="matkap-fz"
                label="Diş başına ilerleme (fz)"
                hint={fzRange ? `Önerilen: ${formatRange('fz', fzRange, unitSystem)} ${unitLabel('fz', unitSystem)} → f = ${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)}` : ''}
                hintTone={fEval.status === 'ok' ? 'muted' : 'warn'}
                kind="fz"
                value={fzValue}
                onChange={(v) => updateDraft('matkap', { f: v * z })}
                status={errors.f ? 'error' : fEval.status}
                error={errors.f}
                testId="input-fz"
              />
            ) : (
              <NumericField
                id="matkap-f"
                label="İlerleme (devir başına)"
                hint={rec ? `Önerilen: ${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)} (= ${formatRange('fz', fzRange, unitSystem)} ${unitLabel('fz', unitSystem)})` : ''}
                hintTone={fEval.status === 'ok' ? 'muted' : 'warn'}
                kind="f"
                value={d.f}
                onChange={(v) => updateDraft('matkap', { f: v })}
                status={errors.f ? 'error' : fEval.status}
                error={errors.f}
                testId="input-f"
              />
            )}
            <NumericField
              id="matkap-depth"
              label="Delik derinliği"
              hint={deepHole ? `Derin delik (${formatNumber(d.depth / d.d, 1)} × D) — gagalama önerilir` : 'Çevrim süresi hesabı için'}
              hintTone={deepHole ? 'warn' : 'muted'}
              kind="length"
              value={d.depth}
              onChange={(v) => updateDraft('matkap', { depth: v })}
              status={errors.depth ? 'error' : 'neutral'}
              error={errors.depth}
              testId="input-depth"
            />
            <Stepper
              label="Gagalama (peck) sayısı"
              hint={d.peck ? `${d.peck} kademe` : 'Kademesiz'}
              value={d.peck || 0}
              min={0}
              max={20}
              onChange={(v) => updateDraft('matkap', { peck: v })}
              testId="stepper-peck"
            />
          </div>
        </section>

        <ResultCard
          title="Matkap değerleri"
          status={status}
          statusLabel={statusLabel}
          metrics={[
            {
              label: 'Devir',
              value: result ? formatNumber(result.n, 0) : '—',
              unit: unitLabel('rpm', unitSystem),
              tone: 'primary',
              testId: 'result-n',
            },
            {
              ...feedMetric({
                feed,
                mode: feedMode,
                unitSystem,
                level: feedCheck.level,
                hasResult: !!result,
              }),
            },
          ]}
          extras={[
            {
              label: 'Kesme hızı',
              note: result && result.limits.rpmClamped ? 'Limit sonrası efektif değer' : 'Giriş değeri doğrulandı',
              value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—',
              unit: unitLabel('vc', unitSystem),
              tone: 'accent',
              testId: 'result-vc',
            },
            {
              label: 'Talaş hacmi (Q)',
              note: '(π × D² / 4) × Vf',
              value: result ? formatQty('q', result.q, unitSystem) : '—',
              unit: unitLabel('q', unitSystem),
              tone: 'foreground',
              testId: 'result-q',
            },
            {
              label: 'İş mili gücü',
              note: powerOver ? 'Tezgâh gücünün üzerinde!' : `Verim %${Math.round(settings.efficiency * 100)}`,
              value: result ? formatQty('power', result.power, unitSystem) : '—',
              unit: unitLabel('power', unitSystem),
              tone: powerOver ? 'destructive' : 'foreground',
              testId: 'result-power',
            },
            {
              label: 'Tork',
              note: 'M = 30000 × Pc / (π × n)',
              value: result ? formatQty('torque', result.torque, unitSystem) : '—',
              unit: unitLabel('torque', unitSystem),
              tone: 'foreground',
              testId: 'result-torque',
            },
            {
              label: 'Diş başına ilerleme (fz)',
              note: `fz = f / ${z} ağız`,
              value: result ? formatQty('fz', fzValue, unitSystem) : '—',
              unit: unitLabel('fz', unitSystem),
              tone: 'accent',
              testId: 'result-fz',
            },
          ]}
        />

        <FeedCard
          n={result ? result.n : NaN}
          vf={feed.vf}
          fn={feed.fn}
          mode={feedMode}
          scopeLabel="Matkap ekranı"
          onModeChange={(v) => {
            setFeedModeForOp('matkap', v);
            toast.success(v === 'G95' ? 'Tezgâh F modu: mm/dev (G95)' : 'Tezgâh F modu: mm/dk (G94)');
          }}
          unitSystem={unitSystem}
          safety={feedCheck}
          fnRange={fnRange}
          extraNote={`Matkapta f = fz × ${z} ağız. Katalog mm/diş veriyorsa yukarıdaki "mm/diş (fz)" girişini kullanın.`}
        />

        <MachineCheckCard
          diameter={d.d}
          z={z}
          feedMode={feedMode}
          unitSystem={unitSystem}
          vcRange={rec ? rec.vc : null}
          fRange={rec ? rec.f : null}
          fzRange={fzRange}
          suggestS={result ? result.n : NaN}
          suggestF={result ? result.vf : NaN}
          onApply={({ vc, fn }) => updateDraft('matkap', { vc: Number(vc.toFixed(1)), f: Number(fn.toFixed(3)) })}
          note={`Örnek: Ø10 matkap, S 2500 dev/dk → Vc = π × 10 × 2500 / 1000 = 78,5 m/dk. F 360 mm/dk → f = 0,144 mm/dev → fz = 0,072 mm/diş (2 ağız).`}
        />

        <section
          className="overflow-hidden rounded-theme border border-border bg-card"
          aria-label="Delik çevrimi"
          data-testid="cycle-card"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-success/15 text-success">
              <Timer className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <Eyebrow>Tahmini ilerleme süresi</Eyebrow>
              <p className="mt-1 text-sm font-semibold text-card-foreground">
                {formatQty('length', d.depth, unitSystem)} {unitLabel('length', unitSystem)} derinlik{' '}
                <span className="font-normal text-muted-foreground">
                  · yaklaşık{' '}
                  <span data-testid="result-cycle">{result ? formatSeconds(result.cycleSeconds) : '—'}</span>
                </span>
              </p>
            </div>
          </div>
        </section>

        {rec ? (
          <RecommendPanel
            onApplyAll={() => {
              updateDraft('matkap', { vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) });
              toast.success('Önerilen değerler uygulandı');
            }}
            items={[
              {
                key: 'vc',
                label: 'Kesme hızı (Vc)',
                kind: 'vc',
                range: rec.vc,
                status: vcEval.status,
                statusLabel: vcEval.label,
                onApply: () => updateDraft('matkap', { vc: Math.round(midOf(rec.vc)) }),
              },
              {
                key: 'f',
                label: 'İlerleme (f)',
                kind: 'f',
                range: rec.f,
                status: fEval.status,
                statusLabel: fEval.label,
                onApply: () => updateDraft('matkap', { f: Number(midOf(rec.f).toFixed(2)) }),
              },
            ]}
          />
        ) : null}

        <ToolLifeCard
          op="matkap"
          vc={d.vc}
          vcRange={rec ? rec.vc : null}
          tool={d.tool}
          coolant={d.coolant || material.coolant}
          cycleSeconds={result && result.cycleSeconds ? result.cycleSeconds : 0}
          onApplyVc={(v) => updateDraft('matkap', { vc: v })}
        />

        <MachineLimitCard
          op="matkap"
          clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))}
          notes={result ? result.limits.notes : []}
        />

        <FormulaPanel
          rows={[
            { expr: 'n = (1.000 × Vc) / (π × D)', tag: 'Devir', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'Vf = f × n', tag: 'İlerleme', note: `f = ${formatQty('f', d.f, unitSystem)}` },
            { expr: 't = derinlik / Vf', tag: 'Süre', note: `derinlik = ${formatQty('length', d.depth, unitSystem)}` },
          ]}
        />

        <button
          type="button"
          onClick={() => {
            resetDraft('matkap');
            toast.success('Varsayılan değerlere dönüldü');
          }}
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
