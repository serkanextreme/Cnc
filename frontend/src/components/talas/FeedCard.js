import React, { useState } from 'react';
import { Check, ClipboardCopy, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Eyebrow, SectionHeading, SegmentedToggle, StatusChip } from './Primitives';
import { FEED_MODES, feedModeInfo, gcodeLine, machineFeedText, normalizeFeedMode } from '../../lib/feed';
import { formatQty, unitLabel } from '../../lib/units';

const FRAME = {
  critical: 'border-destructive',
  warn: 'border-primary',
  ok: 'border-primary',
  neutral: 'border-border',
};
const STRIPE = {
  critical: 'bg-destructive',
  warn: 'bg-primary',
  ok: 'bg-primary',
  neutral: 'bg-border',
};
const CHIP = { critical: 'error', warn: 'warn', ok: 'ok', neutral: 'neutral' };
const CHIP_TEXT = {
  critical: 'KONTROL ET!',
  warn: 'Kontrol edin',
  ok: 'Güvenli aralık',
  neutral: '—',
};

function FeedValueCell({ active, modeId, value, unit, hint, testId }) {
  const info = feedModeInfo(modeId);
  return (
    <div
      data-testid={`${testId}-cell`}
      data-active={active ? 'true' : 'false'}
      className={`px-4 py-4 ${active ? 'bg-primary/10' : 'bg-card'}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-theme border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] ${
            active ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border bg-muted text-muted-foreground'
          }`}
        >
          {info.short}
        </span>
        {active ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">TEZGÂHA BUNU GİR</span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Karşılığı</span>
        )}
      </div>
      <p
        key={value}
        className={`${active ? 'num-xl' : 'num-lg'} mt-1.5 animate-value-in ${active ? 'text-primary' : 'text-muted-foreground'}`}
        data-testid={testId}
      >
        {value}
      </p>
      <p className={`mt-1 text-xs font-bold ${active ? 'text-card-foreground' : 'text-muted-foreground'}`}>{unit}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * TEZGÂHA GİRİLECEK İLERLEME KARTI
 * F değerini hem G94 (mm/dk) hem G95 (mm/dev) olarak birlikte gösterir,
 * kopyalanabilir G-kod satırı üretir ve limit aşımlarında kritik uyarı verir.
 */
export function FeedCard({
  n,
  vf,
  fn,
  mode,
  onModeChange,
  unitSystem = 'metric',
  safety = { level: 'neutral', messages: [] },
  fnRange = null,
  scopeLabel = null,
  title = 'Tezgâha girilecek F',
  eyebrow = 'İLERLEME · BİRİM KONTROLÜ',
  extraNote = null,
  testId = 'feed-card',
}) {
  const [copied, setCopied] = useState(false);
  const activeMode = normalizeFeedMode(mode);
  const level = safety.level === 'neutral' ? 'neutral' : safety.level;
  const line = gcodeLine({ mode: activeMode, n, vf, fn, unitSystem });

  const handleCopy = async () => {
    if (line === '—') {
      toast.error('Kopyalanacak geçerli değer yok');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(line);
      } else {
        const ta = document.createElement('textarea');
        ta.value = line;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('G-kod satırı kopyalandı', { description: line });
    } catch (err) {
      toast.error('Kopyalama desteklenmiyor');
    }
  };

  const vfText = machineFeedText({ mode: 'G94', vf, fn, unitSystem });
  const fnText = machineFeedText({ mode: 'G95', vf, fn, unitSystem });

  return (
    <section aria-label={title} data-testid={testId}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        right={
          <StatusChip
            tone={CHIP[level]}
            icon={level === 'ok' ? ShieldCheck : TriangleAlert}
            testId="feed-safety-chip"
          >
            {CHIP_TEXT[level]}
          </StatusChip>
        }
      />

      <div className={`overflow-hidden rounded-theme border bg-card ${FRAME[level]}`}>
        <div className={`h-1 ${STRIPE[level]}`} />

        {level === 'critical' ? (
          <div
            className="flex items-start gap-2 border-b border-destructive/40 bg-destructive/15 px-4 py-3"
            data-testid="feed-critical-banner"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-destructive">
                TEZGÂHA GİRMEDEN KONTROL ET
              </p>
              <ul className="mt-1 space-y-1">
                {safety.messages.map((m) => (
                  <li key={m} className="text-[11px] leading-4 text-destructive" data-testid="feed-warning-message">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <FeedValueCell
            active={activeMode === 'G94'}
            modeId="G94"
            value={vfText}
            unit={unitLabel('vf', unitSystem)}
            hint="Dakikada ilerleme (Vf) · tam sayı"
            testId="feed-value-g94"
          />
          <FeedValueCell
            active={activeMode === 'G95'}
            modeId="G95"
            value={fnText}
            unit={unitLabel('f', unitSystem)}
            hint="Devir başına ilerleme (fn)"
            testId="feed-value-g95"
          />
        </div>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <Eyebrow>Tezgâha yazılacak satır</Eyebrow>
            <p className="num-md mt-1 truncate text-foreground" data-testid="feed-gcode">
              {line}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="G-kod satırını kopyala"
            data-testid="feed-gcode-copy"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme border border-border bg-input text-primary transition-transform duration-150 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95"
          >
            {copied ? <Check className="h-[18px] w-[18px] text-success" /> : <ClipboardCopy className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <Eyebrow className="mb-2">{scopeLabel ? `Tezgâh F modu · ${scopeLabel}` : 'Tezgâh F modu'}</Eyebrow>
          <SegmentedToggle
            options={FEED_MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={activeMode}
            onChange={(v) => onModeChange && onModeChange(v)}
            ariaLabel="Tezgâh F modu"
            testId="feed-mode-toggle"
          />
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            {scopeLabel ? (
              <>
                Bu seçim <strong className="text-card-foreground">yalnızca {scopeLabel}</strong> için geçerlidir.{' '}
              </>
            ) : null}
            Tezgâhın kumandası G94 modundaysa F alanına <strong className="text-card-foreground">mm/dk (tam sayı)</strong>,
            G95 modundaysa <strong className="text-card-foreground">mm/dev</strong> yazılır.
          </p>
        </div>

        {level === 'warn' && safety.messages.length ? (
          <div className="border-b border-border bg-primary/10 px-4 py-3" data-testid="feed-warn-banner">
            <ul className="space-y-1">
              {safety.messages.map((m) => (
                <li key={m} className="flex items-start gap-2 text-[11px] leading-4 text-primary" data-testid="feed-warning-message">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Eyebrow>Önerilen mm/dev aralığı</Eyebrow>
            <p className="mt-0.5 text-sm font-semibold text-card-foreground" data-testid="feed-fn-range">
              {fnRange
                ? `${formatQty('f', fnRange[0], unitSystem, { decimals: 3 })} – ${formatQty('f', fnRange[1], unitSystem, { decimals: 3 })} ${unitLabel('f', unitSystem)}`
                : 'Malzeme önerisi yok'}
            </p>
          </div>
          <StatusChip tone={level === 'ok' ? 'ok' : level === 'critical' ? 'error' : level === 'warn' ? 'warn' : 'neutral'}>
            {`fn = ${fnText}`}
          </StatusChip>
        </div>

        {extraNote ? (
          <p className="border-t border-border px-4 py-3 text-[11px] leading-4 text-muted-foreground">{extraNote}</p>
        ) : null}
      </div>
    </section>
  );
}
