import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, RotateCw, Save, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/talas/MaterialPicker';
import { MachineLimitCard } from '../components/talas/MachineLimitCard';
import { RecommendPanel } from '../components/talas/Recommend';
import { FormulaPanel, ResultCard } from '../components/talas/ResultCard';
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
} from '../components/talas/Primitives';
import { calcTurning, evaluateRange, worstStatus } from '../lib/calc';
import { midOf, recommended, resolveLimits } from '../data/materials';
import { buildShareText, shareText } from '../lib/records';
import { formatNumber, formatQty, formatRange, unitLabel } from '../lib/units';

const INSERTS = [
  { id: 'karbur', label: 'Karbür uç' },
  { id: 'hss', label: 'HSS kalem' },
];
const DIRECTIONS = [
  { id: 'od', label: 'Dış Çap' },
  { id: 'id', label: 'İç Çap' },
];

export default function Turning() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    activeMaterial, setActiveMaterialId, drafts, updateDraft, resetDraft,
    settings, unitSystem, saveCalculation, history,
  } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const d = drafts.torna;
  const recordId = params.get('record');

  useEffect(() => {
    if (!recordId) return;
    const rec = history.find((r) => r.id === recordId);
    if (!rec || rec.op !== 'torna') return;
    updateDraft('torna', rec.inputs);
    if (rec.materialId) setActiveMaterialId(rec.materialId);
    toast.success('Hesaplama yeniden açıldı');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const rec = recommended(activeMaterial, 'torna', d.tool);
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
    return calcTurning({
      vc: d.vc, d: d.d, f: d.f, ap: d.ap, noseR: d.noseR,
      kc: activeMaterial.kc, eta: settings.efficiency, limits, targetRa: d.targetRa,
    });
  }, [d, activeMaterial, settings.efficiency, limits, hasErrors]);

  const vcEval = rec ? evaluateRange(d.vc, rec.vc) : { status: 'neutral', label: '—' };
  const fEval = rec ? evaluateRange(d.f, rec.f) : { status: 'neutral', label: '—' };
  const raOver = !!(result && d.targetRa > 0 && result.ra > d.targetRa);
  const powerOver = !!(result && limits && limits.powerKw && result.power > limits.powerKw);
  const status = hasErrors
    ? 'error'
    : worstStatus([vcEval.status, fEval.status, raOver ? 'warn' : 'ok', powerOver ? 'warn' : 'ok']);
  const statusLabel = hasErrors ? 'Geçersiz giriş' : status === 'ok' ? 'Uygun' : 'Kontrol edin';

  const handleSave = () => {
    if (!result) {
      toast.error('Geçersiz giriş — önce alanları düzeltin');
      return;
    }
    const entry = saveCalculation({
      op: 'torna',
      materialId: activeMaterial.id,
      materialCode: activeMaterial.code,
      materialName: activeMaterial.name,
      unitSystem,
      inputs: { ...d },
      outputs: {
        n: result.n, vf: result.vf, vcEffective: result.vcEffective, q: result.q,
        power: result.power, torque: result.torque, ra: result.ra,
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
        op: 'torna', materialCode: activeMaterial.code, inputs: d,
        outputs: {
          n: result.n, vf: result.vf, vcEffective: result.vcEffective, q: result.q,
          power: result.power, torque: result.torque, ra: result.ra,
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
        title="Torna Hesabı"
        onBack={() => navigate('/')}
        right={<IconButton icon={RotateCw} label="Torna" tone="accent" />}
      />

      <main className="space-y-6 px-5 pt-4">
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <section aria-labelledby="takim-baslik">
          <SectionHeading eyebrow="KURULUM" title="Takım ve parça" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Uç tipi</Eyebrow>
              <SegmentedToggle
                options={INSERTS}
                value={d.tool}
                onChange={(v) => updateDraft('torna', { tool: v })}
                ariaLabel="Uç tipi"
                testId="tool-toggle"
              />
            </div>
            <NumericField
              id="torna-nose"
              label="Uç radyusu (rε)"
              hint={`${formatRange('length', [0.2, 2.4], unitSystem)} ${unitLabel('length', unitSystem)}`}
              kind="length"
              value={d.noseR}
              onChange={(v) => updateDraft('torna', { noseR: v })}
              status={errors.noseR ? 'error' : 'neutral'}
              error={errors.noseR}
              testId="input-nose"
            />
            <NumericField
              id="torna-d"
              label="İş parçası çapı"
              hint={`Ø ${formatRange('length', [1, 500], unitSystem)} ${unitLabel('length', unitSystem)}`}
              kind="length"
              value={d.d}
              onChange={(v) => updateDraft('torna', { d: v })}
              status={errors.d ? 'error' : 'neutral'}
              error={errors.d}
              testId="input-d"
            />
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">İşleme yönü</Eyebrow>
              <SegmentedToggle
                options={DIRECTIONS}
                value={d.direction}
                onChange={(v) => updateDraft('torna', { direction: v })}
                tone="secondary"
                ariaLabel="İşleme yönü"
                testId="direction-toggle"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="parametre-baslik">
          <SectionHeading eyebrow="GİRİŞLER" title="Kesme parametreleri" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <NumericField
              id="torna-vc"
              label="Kesme hızı"
              hint={rec ? `Önerilen: ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''}
              hintTone={vcEval.status === 'ok' ? 'muted' : 'warn'}
              kind="vc"
              value={d.vc}
              onChange={(v) => updateDraft('torna', { vc: v })}
              status={errors.vc ? 'error' : vcEval.status}
              error={errors.vc}
              testId="input-vc"
            />
            <NumericField
              id="torna-f"
              label="İlerleme"
              hint={rec ? `${formatRange('f', rec.f, unitSystem)} ${unitLabel('f', unitSystem)}` : ''}
              hintTone={fEval.status === 'ok' ? 'muted' : 'warn'}
              kind="f"
              value={d.f}
              onChange={(v) => updateDraft('torna', { f: v })}
              status={errors.f ? 'error' : fEval.status}
              error={errors.f}
              testId="input-f"
            />
            <NumericField
              id="torna-ap"
              label="Talaş derinliği"
              hint={`${formatRange('length', [0.5, 3], unitSystem)} ${unitLabel('length', unitSystem)}`}
              kind="length"
              value={d.ap}
              onChange={(v) => updateDraft('torna', { ap: v })}
              status={errors.ap ? 'error' : 'neutral'}
              error={errors.ap}
              testId="input-ap"
            />
            <NumericField
              id="torna-ra"
              label="Hedef yüzey pürüzlülüğü"
              hint={`Ra ${formatRange('ra', [0.8, 6.3], unitSystem)} ${unitLabel('ra', unitSystem)}`}
              kind="ra"
              value={d.targetRa}
              onChange={(v) => updateDraft('torna', { targetRa: v })}
              status={raOver ? 'warn' : 'neutral'}
              testId="input-ra"
            />
          </div>
        </section>

        <ResultCard
          title="Torna değerleri"
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
              label: 'İlerleme',
              value: result ? formatQty('vf', result.vf, unitSystem) : '—',
              unit: unitLabel('vf', unitSystem),
              tone: 'foreground',
              testId: 'result-vf',
            },
          ]}
          extras={[
            {
              label: 'Kesme hızı',
              note: result && result.limits.rpmClamped ? 'Limit sonrası efektif değer' : 'Hedef değer korunuyor',
              value: result ? formatQty('vc', result.vcEffective, unitSystem) : '—',
              unit: unitLabel('vc', unitSystem),
              tone: 'accent',
              testId: 'result-vc',
            },
            {
              label: 'Yüzey pürüzlülüğü (Ra)',
              note: raOver ? 'Hedefin üzerinde — ilerlemeyi düşürün' : 'Hedef değer sağlanıyor',
              value: result ? formatQty('ra', result.ra, unitSystem) : '—',
              unit: unitLabel('ra', unitSystem),
              tone: raOver ? 'destructive' : 'success',
              testId: 'result-ra',
            },
            {
              label: 'Hedef Ra için ilerleme',
              note: 'f = √(32 × Ra × rε)',
              value: result && result.feedForTargetRa ? formatQty('f', result.feedForTargetRa, unitSystem) : '—',
              unit: unitLabel('f', unitSystem),
              tone: 'accent',
              testId: 'result-f-target',
            },
            {
              label: 'Talaş hacmi (Q)',
              note: 'ap × f × Vc',
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
          ]}
        />

        {result && result.feedForTargetRa ? (
          <button
            type="button"
            onClick={() => {
              updateDraft('torna', { f: Number(result.feedForTargetRa.toFixed(3)) });
              toast.success('Hedef Ra için ilerleme uygulandı');
            }}
            data-testid="apply-ra-feed"
            className="flex w-full items-center justify-center gap-2 rounded-theme border border-primary/50 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary"
          >
            <Sparkles className="h-4 w-4" />
            Hedef Ra {formatQty('ra', d.targetRa, unitSystem)} için ilerlemeyi {formatQty('f', result.feedForTargetRa, unitSystem)}{' '}
            {unitLabel('f', unitSystem)} yap
          </button>
        ) : null}

        {rec ? (
          <RecommendPanel
            onApplyAll={() => {
              updateDraft('torna', { vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) });
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
                onApply: () => updateDraft('torna', { vc: Math.round(midOf(rec.vc)) }),
              },
              {
                key: 'f',
                label: 'İlerleme (f)',
                kind: 'f',
                range: rec.f,
                status: fEval.status,
                statusLabel: fEval.label,
                onApply: () => updateDraft('torna', { f: Number(midOf(rec.f).toFixed(2)) }),
              },
            ]}
          />
        ) : null}

        <MachineLimitCard
          op="torna"
          clamped={!!(result && (result.limits.rpmClamped || result.limits.feedClamped))}
          notes={result ? result.limits.notes : []}
        />

        <FormulaPanel
          rows={[
            { expr: 'n = (1.000 × Vc) / (π × D)', tag: 'Devir', note: `Vc = ${formatQty('vc', d.vc, unitSystem)} · D = ${formatQty('length', d.d, unitSystem)}` },
            { expr: 'Vf = f × n', tag: 'İlerleme', note: `f = ${formatQty('f', d.f, unitSystem)}` },
            { expr: 'Ra = f² / (32 × rε)', tag: 'Yüzey', note: `rε = ${formatQty('length', d.noseR, unitSystem)}` },
            { expr: 'f = √(32 × Ra × rε)', tag: 'Kontrol', note: `Hedef Ra = ${formatQty('ra', d.targetRa, unitSystem)}` },
          ]}
        />

        <button
          type="button"
          onClick={() => {
            resetDraft('torna');
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
