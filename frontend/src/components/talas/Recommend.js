import React from 'react';
import { Lightbulb, Wand2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRange, unitLabel } from '../../lib/units';
import { Eyebrow, StatusChip } from './Primitives';

/**
 * Önerilen aralık kartı — tek dokunuşla önerilen (orta) değeri uygular.
 * items: [{ key, label, kind, range, current, status, onApply }]
 */
export function RecommendPanel({ items, onApplyAll, testId = 'recommend-panel' }) {
  const { unitSystem } = useApp();
  return (
    <section aria-label="Önerilen değerler" data-testid={testId}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>MALZEME ÖNERİSİ</Eyebrow>
          <h2 className="title-md text-foreground">Önerilen aralık</h2>
        </div>
        {onApplyAll ? (
          <button
            type="button"
            onClick={onApplyAll}
            data-testid="apply-all-recommended"
            className="flex shrink-0 items-center gap-1.5 pb-1 text-xs font-semibold text-primary"
          >
            <Wand2 className="h-4 w-4" />
            Tümünü uygula
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
              <Lightbulb className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRange(item.kind, item.range, unitSystem)} {unitLabel(item.kind, unitSystem)}
              </p>
            </div>
            <StatusChip tone={item.status === 'ok' ? 'ok' : item.status === 'warn' ? 'warn' : 'error'}>
              {item.statusLabel}
            </StatusChip>
            <button
              type="button"
              onClick={item.onApply}
              data-testid={`apply-${item.key}`}
              className="shrink-0 rounded-theme border border-border px-3 py-2 text-xs font-semibold text-primary transition-colors active:bg-muted/60"
            >
              Uygula
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
