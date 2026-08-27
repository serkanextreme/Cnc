import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Eyebrow, GhostButton, NumericField, SectionHeading, StatusChip,
} from './Primitives';
import { evaluateRange } from '../../lib/calc';
import { normalizeFeedMode } from '../../lib/feed';
import { formatNumber, formatQty, formatRange, unitLabel } from '../../lib/units';

function OutCell({ label, value, unit, note, tone = 'foreground', chip = null, testId }) {
  const toneClass = tone === 'primary' ? 'text-primary' : tone === 'accent' ? 'text-accent' : 'text-foreground';
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        {chip}
      </div>
      <p className={`num-lg mt-1 ${toneClass}`} data-testid={testId}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-card-foreground">{unit}</p>
      {note ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/**
 * TEZGÂHTAN GERİ KONTROL
 * Tezgâhta yazan devir (S) ve ilerleme (F) değerlerini girip
 * bunların gerçekte hangi Vc / mm/dev / mm/diş değerine karşılık geldiğini gösterir.
 * "Hesaba uygula" ile bu değerler giriş alanlarına aktarılır.
 */
export function MachineCheckCard({
  diameter,
  z = null,
  feedMode = 'G94',
  unitSystem = 'metric',
  vcRange = null,
  fRange = null,
  fzRange = null,
  suggestS = NaN,
  suggestF = NaN,
  onApply = null,
  applyLabel = 'Bu değerleri hesaba uygula',
  note = null,
  testId = 'machine-check-card',
}) {
  const mode = normalizeFeedMode(feedMode);
  const [s, setS] = useState(() => (Number.isFinite(suggestS) && suggestS > 0 ? Math.round(suggestS) : 0));
  const [fVal, setFVal] = useState(0);
  const [touched, setTouched] = useState(false);

  // Sonuçtan gelen değerlerle ilk doldurma (kullanıcı dokunmadıysa güncel kalsın)
  useEffect(() => {
    if (touched) return;
    if (Number.isFinite(suggestS) && suggestS > 0) setS(Math.round(suggestS));
    if (Number.isFinite(suggestF) && suggestF > 0) {
      setFVal(mode === 'G94' ? Math.round(suggestF) : suggestF / (suggestS > 0 ? suggestS : 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestS, suggestF, mode, touched]);

  const D = Number(diameter);
  const S = Number(s);
  const vf = mode === 'G94' ? Number(fVal) : Number(fVal) * S;
  const fn = mode === 'G94' ? (S > 0 ? Number(fVal) / S : NaN) : Number(fVal);
  const vc = D > 0 && S > 0 ? (Math.PI * D * S) / 1000 : NaN;
  const fz = z > 0 && Number.isFinite(fn) ? fn / z : NaN;

  const vcEval = vcRange && Number.isFinite(vc) ? evaluateRange(vc, vcRange) : null;
  const fEval = fRange && Number.isFinite(fn) ? evaluateRange(fn, fRange) : null;
  const fzEval = fzRange && Number.isFinite(fz) ? evaluateRange(fz, fzRange) : null;

  // Önerilen Vc için gereken devir aralığı
  const rpmForVc = vcRange && D > 0
    ? [(vcRange[0] * 1000) / (Math.PI * D), (vcRange[1] * 1000) / (Math.PI * D)]
    : null;
  // Önerilen ilerleme için gereken F (mm/dk)
  const vfForF = fRange && S > 0 ? [fRange[0] * S, fRange[1] * S] : null;

  const chipFor = (ev, testIdChip) => (ev ? (
    <StatusChip tone={ev.status === 'ok' ? 'ok' : ev.status === 'error' ? 'error' : 'warn'} testId={testIdChip}>
      {ev.label}
    </StatusChip>
  ) : null);

  return (
    <section aria-label="Tezgâhtan geri kontrol" data-testid={testId}>
      <SectionHeading
        eyebrow="TEZGÂHTAN GERİ KONTROL"
        title="Tezgâhta yazan S / F ne demek?"
        right={<StatusChip tone="accent" icon={ArrowLeftRight}>{mode === 'G94' ? 'F = mm/dk' : 'F = mm/dev'}</StatusChip>}
      />
      <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
        <p className="px-4 py-3 text-[11px] leading-4 text-muted-foreground">
          Tezgâh ekranında yazan <strong className="text-card-foreground">S</strong> (devir) ve{' '}
          <strong className="text-card-foreground">F</strong> ({mode === 'G94' ? 'mm/dk' : 'mm/dev'}) değerlerini girin;
          bunların hangi kesme hızına ve diş başına ilerlemeye karşılık geldiğini gösterir.
        </p>

        <NumericField
          id={`${testId}-s`}
          label="Tezgâhtaki devir (S)"
          hint={rpmForVc ? `Önerilen Vc için: ${formatRange('rpm', rpmForVc, unitSystem)} ${unitLabel('rpm', unitSystem)}` : ''}
          kind="rpm"
          value={S}
          onChange={(v) => { setTouched(true); setS(v); }}
          testId={`${testId}-input-s`}
        />
        <NumericField
          id={`${testId}-f`}
          label={mode === 'G94' ? 'Tezgâhtaki ilerleme (F, mm/dk)' : 'Tezgâhtaki ilerleme (F, mm/dev)'}
          hint={vfForF && mode === 'G94' ? `Önerilen f için: ${formatRange('vf', vfForF, unitSystem)} ${unitLabel('vf', unitSystem)}` : (fRange ? `Önerilen: ${formatRange('f', fRange, unitSystem)} ${unitLabel('f', unitSystem)}` : '')}
          kind={mode === 'G94' ? 'vf' : 'f'}
          value={Number(fVal)}
          onChange={(v) => { setTouched(true); setFVal(v); }}
          testId={`${testId}-input-f`}
        />

        <div className="grid grid-cols-2 divide-x divide-border">
          <OutCell
            label="Kesme hızı (Vc / SMM)"
            value={Number.isFinite(vc) ? formatQty('vc', vc, unitSystem, { decimals: 1 }) : '—'}
            unit={unitLabel('vc', unitSystem)}
            note={`Vc = π × ${formatQty('length', D, unitSystem)} × ${formatNumber(S, 0)} / 1000`}
            tone="accent"
            chip={chipFor(vcEval, `${testId}-vc-chip`)}
            testId={`${testId}-vc`}
          />
          <OutCell
            label="Devir başına (f)"
            value={Number.isFinite(fn) ? formatQty('f', fn, unitSystem, { decimals: 3 }) : '—'}
            unit={unitLabel('f', unitSystem)}
            note="f = F / S"
            tone="primary"
            chip={chipFor(fEval, `${testId}-f-chip`)}
            testId={`${testId}-fn`}
          />
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <OutCell
            label={z > 0 ? `Diş başına (fz) · ${z} ağız` : 'Diş başına (fz)'}
            value={Number.isFinite(fz) ? formatQty('fz', fz, unitSystem, { decimals: 3 }) : '—'}
            unit={unitLabel('fz', unitSystem)}
            note={z > 0 ? `fz = f / ${z}` : 'Ağız sayısı girilmedi'}
            tone="primary"
            chip={chipFor(fzEval, `${testId}-fz-chip`)}
            testId={`${testId}-fz`}
          />
          <OutCell
            label="Dakikada ilerleme (Vf)"
            value={Number.isFinite(vf) ? formatQty('vf', vf, unitSystem) : '—'}
            unit={unitLabel('vf', unitSystem)}
            note="Vf = f × S"
            tone="foreground"
            testId={`${testId}-vf`}
          />
        </div>

        {D > 0 && S > 0 ? (
          <div className="px-4 py-3" data-testid={`${testId}-vc-scale`}>
            <Eyebrow className="mb-2">Aynı {formatNumber(S, 0)} dev/dk'da çapa göre Vc</Eyebrow>
            <div className="grid grid-cols-3 gap-2">
              {[0.7, 1, 1.3].map((k) => {
                const dd = D * k;
                const vv = (Math.PI * dd * S) / 1000;
                const isSelf = k === 1;
                return (
                  <div
                    key={k}
                    className={`rounded-theme border px-2 py-2 ${isSelf ? 'border-accent/60 bg-accent/10' : 'border-border bg-input'}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Ø{formatQty('length', dd, unitSystem, { decimals: 1 })}
                    </p>
                    <p className={`num-md mt-0.5 ${isSelf ? 'text-accent' : 'text-card-foreground'}`}>
                      {formatQty('vc', vv, unitSystem, { decimals: 1 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{unitLabel('vc', unitSystem)}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              Vc çapla <strong className="text-card-foreground">doğru orantılıdır</strong>. Kataloğunuz aynı devirde daha
              düşük bir Vc veriyorsa, o değer daha küçük bir (efektif) çapa aittir.
            </p>
          </div>
        ) : null}

        {note ? <p className="px-4 py-3 text-[11px] leading-4 text-muted-foreground">{note}</p> : null}

        {onApply ? (
          <div className="px-4 py-3">
            <GhostButton
              testId={`${testId}-apply`}
              tone="primary"
              className="w-full"
              onClick={() => {
                if (!(Number.isFinite(vc) && vc > 0 && Number.isFinite(fn) && fn > 0)) {
                  toast.error('Önce geçerli S ve F değeri girin');
                  return;
                }
                onApply({ vc, fn, fz, s: S, vf });
                toast.success('Tezgâh değerleri hesaba uygulandı', {
                  description: `Vc ${formatQty('vc', vc, unitSystem)} ${unitLabel('vc', unitSystem)} · f ${formatQty('f', fn, unitSystem, { decimals: 3 })} ${unitLabel('f', unitSystem)}`,
                });
              }}
            >
              <Check className="h-4 w-4" />
              {applyLabel}
            </GhostButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
