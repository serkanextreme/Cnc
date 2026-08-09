import React from 'react';
import { Gauge, RotateCcw } from 'lucide-react';
import { hardnessText } from '../../data/materials';
import { formatNumber } from '../../lib/units';
import { Eyebrow, NumericField, StatusChip } from './Primitives';

/**
 * Ölçülen sertlik kartı — aynı malzemenin farklı sertlik durumu için
 * önerilen Vc / ilerleme aralıklarını ve kc değerini canlı olarak düzeltir.
 */
export function HardnessCard({ material, adjusted, value, onChange, op }) {
  if (!material) return null;
  const baseHB = Number(material.baseHB) || 0;
  const active = value > 0 && Math.abs(value - baseHB) > 0.5;
  const presets = [
    { label: 'Yumuşak', hb: Math.max(60, Math.round(baseHB * 0.7)) },
    { label: 'Katalog', hb: baseHB },
    { label: 'Sert', hb: Math.round(baseHB * 1.3) },
    { label: 'Çok sert', hb: Math.round(baseHB * 1.6) },
  ];
  const feedKey = op === 'freze' ? 'fz' : 'f';
  const before = material.ops[op] ? material.ops[op].karbur : null;
  const after = adjusted && adjusted.ops[op] ? adjusted.ops[op].karbur : null;

  return (
    <section aria-label="Ölçülen sertlik" data-testid="hardness-card">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>SERTLİK DURUMU</Eyebrow>
          <h2 className="title-md text-foreground">Ölçülen sertlik</h2>
        </div>
        <div className="shrink-0 pb-1">
          <StatusChip tone={active ? 'warn' : 'neutral'} icon={Gauge} testId="hardness-state">
            {active ? `${formatNumber(value, 0)} HB` : `Katalog · ${hardnessText(material)}`}
          </StatusChip>
        </div>
      </div>

      <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Aynı malzeme farklı sertlikte gelebilir. Ölçtüğünüz sertliği girin; önerilen kesme hızı,
            ilerleme ve kesme kuvveti otomatik düzeltilir.
          </p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.hb === baseHB ? 0 : p.hb)}
                data-testid={`hardness-preset-${p.label}`}
                className={`shrink-0 rounded-theme border px-3 py-2 text-left transition-colors ${
                  (p.hb === baseHB && !active) || (active && Math.abs(value - p.hb) < 0.5)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-input'
                }`}
              >
                <span className="block text-xs font-semibold text-card-foreground">{p.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.hb} HB</span>
              </button>
            ))}
          </div>
        </div>

        <NumericField
          id={`hardness-${op}`}
          label="Ölçülen sertlik (HB)"
          hint={`Katalog: ${baseHB} HB · 0 = katalog değeri`}
          kind="deg"
          unitOverride="HB"
          value={value || 0}
          onChange={onChange}
          testId="input-hardness"
        />

        {active && before && after ? (
          <div className="px-4 py-3">
            <Eyebrow className="mb-2">Düzeltilmiş öneri (karbür)</Eyebrow>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-theme border border-border bg-input px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Vc katalog</p>
                <p className="num-md mt-0.5 text-muted-foreground">{before.vc[0]}–{before.vc[1]}</p>
              </div>
              <div className="rounded-theme border border-primary bg-primary/10 px-3 py-2">
                <p className="text-[11px] text-primary">Vc düzeltilmiş</p>
                <p className="num-md mt-0.5 text-primary" data-testid="hardness-adjusted-vc">
                  {after.vc[0]}–{after.vc[1]}
                </p>
              </div>
              <div className="rounded-theme border border-border bg-input px-3 py-2">
                <p className="text-[11px] text-muted-foreground">kc katalog</p>
                <p className="num-md mt-0.5 text-muted-foreground">{material.kc}</p>
              </div>
              <div className="rounded-theme border border-accent/60 bg-accent/10 px-3 py-2">
                <p className="text-[11px] text-accent">kc düzeltilmiş</p>
                <p className="num-md mt-0.5 text-accent" data-testid="hardness-adjusted-kc">{adjusted.kc}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {feedKey === 'fz' ? 'Diş başına ilerleme' : 'İlerleme'}: {after[feedKey][0]}–{after[feedKey][1]}
            </p>
            <button
              type="button"
              onClick={() => onChange(0)}
              data-testid="reset-hardness"
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Katalog değerine dön
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
