import React from 'react';
import { CircleCheck, Sigma, TriangleAlert } from 'lucide-react';
import { Eyebrow, StatusChip } from './Primitives';

const VALUE_TONES = {
  primary: 'text-primary',
  accent: 'text-accent',
  foreground: 'text-foreground',
  destructive: 'text-destructive',
  success: 'text-success',
};

function MetricCell({ label, value, unit, tone = 'foreground', testId, className = '' }) {
  return (
    <div className={`px-4 py-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p
        key={value}
        className={`num-xl mt-1 animate-value-in ${VALUE_TONES[tone]}`}
        data-testid={testId}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-card-foreground">{unit}</p>
    </div>
  );
}

/**
 * Canlı sonuç kartı — mockup'taki primary çerçeveli, üst şeritli 2 kolonlu blok.
 * metrics: [{label,value,unit,tone,testId}] (ilk 2 tanesi büyük hücre)
 * extras:  [{label,note,value,unit,tone,testId}]
 */
export function ResultCard({
  eyebrow = 'CANLI SONUÇ',
  title,
  status = 'ok',
  statusLabel,
  metrics = [],
  extras = [],
  footer,
  testId = 'result-card',
}) {
  const invalid = status === 'error';
  const [first, second, ...restMetrics] = metrics;
  const chipTone = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'error';
  const StatusIcon = status === 'ok' ? CircleCheck : TriangleAlert;

  return (
    <section aria-label={title} data-testid={testId}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
          <h2 className="title-md text-foreground">{title}</h2>
        </div>
        <div className="shrink-0 pb-1">
          <StatusChip tone={chipTone} icon={StatusIcon} testId="result-status">
            {statusLabel}
          </StatusChip>
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-theme border bg-card ${invalid ? 'border-destructive' : 'border-primary'}`}
      >
        <div className={`h-1 ${invalid ? 'bg-destructive' : 'bg-primary'}`} />
        <div className="grid grid-cols-2">
          {first ? (
            <MetricCell {...first} className="border-b border-r border-border" />
          ) : null}
          {second ? <MetricCell {...second} className="border-b border-border" /> : null}
          {restMetrics.map((m) => (
            <MetricCell key={m.label} {...m} className="col-span-2 border-b border-border" />
          ))}
          {extras.map((x) => (
            <div
              key={x.label}
              className="col-span-2 flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{x.label}</p>
                {x.note ? <p className="mt-0.5 text-sm font-semibold text-card-foreground">{x.note}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className={`num-lg ${VALUE_TONES[x.tone || 'accent']}`} data-testid={x.testId}>
                  {x.value}
                </p>
                {x.unit ? <p className="mt-1 text-xs font-semibold text-muted-foreground">{x.unit}</p> : null}
              </div>
            </div>
          ))}
        </div>
        {footer}
      </div>
    </section>
  );
}

/** Formül doğrulama paneli — mockup'taki "DOĞRULAMA / Formüller" bloğu */
export function FormulaPanel({ rows, title = 'Formüller', eyebrow = 'DOĞRULAMA', testId = 'formula-panel' }) {
  return (
    <section aria-label={title} data-testid={testId}>
      <div className="mb-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="title-md text-foreground">{title}</h2>
      </div>
      <div className="overflow-hidden rounded-theme border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Sigma className="h-[18px] w-[18px] text-accent" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            Girilen değerlerle doğrulandı
          </p>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.expr} className="flex items-center justify-between gap-3 px-4 py-3" data-testid="formula-row">
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold tracking-tight text-card-foreground">{row.expr}</p>
                {row.note ? <p className="mt-0.5 text-[11px] text-muted-foreground">{row.note}</p> : null}
              </div>
              <span className="shrink-0 rounded-theme bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {row.tag || 'Doğrulandı'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
