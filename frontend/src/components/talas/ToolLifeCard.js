import React, { useMemo, useState } from 'react';
import { Coins, Gauge, Plus, Sparkles, Timer, TriangleAlert, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { coolantLifeFactor, midOf } from '../../data/materials';
import { toolCost, toolLifeMinutes, vcForTargetLife, wearStatus } from '../../lib/calc';
import { formatNumber, formatQty, unitLabel } from '../../lib/units';
import { Eyebrow, NumericField, StatusChip } from './Primitives';

const STATUS_MAP = {
  iyi: { tone: 'ok', label: 'Ömür iyi' },
  dikkat: { tone: 'warn', label: 'Ömür kısa' },
  kritik: { tone: 'error', label: 'Ömür kritik' },
  bilinmiyor: { tone: 'neutral', label: '—' },
};

/**
 * Takım ömrü (Taylor) + parça başı maliyet + aşınma uyarısı.
 * Her hesap ekranında gösterilir; kayıtlı takımlara kullanım eklenebilir.
 */
export function ToolLifeCard({ op, vc, vcRange, tool, coolant, onApplyVc, cycleSeconds }) {
  const {
    settings, updateSettings, unitSystem, tools, addToolUsage,
  } = useApp();
  const [selectedTool, setSelectedTool] = useState('');

  const vcRef = useMemo(() => (vcRange ? midOf(vcRange) : vc), [vcRange, vc]);
  const life = useMemo(
    () => toolLifeMinutes({
      vc,
      vcRef,
      tool: tool === 'hss' ? 'hss' : 'karbur',
      refLife: settings.refLife || 15,
      coolant: coolant || 'sivi',
    }),
    [vc, vcRef, tool, settings.refLife, coolant],
  );
  const status = wearStatus(life);
  const partMinutes = Number(settings.partMinutes) > 0
    ? Number(settings.partMinutes)
    : (cycleSeconds ? cycleSeconds / 60 : 1);
  const cost = useMemo(
    () => toolCost({
      toolPrice: settings.toolPrice,
      edges: settings.toolEdges,
      lifeMinutes: life,
      partMinutes,
      hourlyRate: settings.hourlyRate,
    }),
    [settings.toolPrice, settings.toolEdges, settings.hourlyRate, life, partMinutes],
  );
  const suggestedVc = useMemo(
    () => vcForTargetLife({
      targetLife: settings.targetLife || 30,
      vcRef,
      tool: tool === 'hss' ? 'hss' : 'karbur',
      refLife: settings.refLife || 15,
      coolant: coolant || 'sivi',
    }),
    [settings.targetLife, vcRef, tool, settings.refLife, coolant],
  );

  const cur = settings.currency || 'TL';
  const money = (v) => `${formatNumber(v, 2)} ${cur}`;
  const opTools = tools.filter((t) => !t.op || t.op === op);

  return (
    <section aria-label="Takım ömrü ve maliyet" data-testid="tool-life-card">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>TAKIM ÖMRÜ &amp; MALİYET</Eyebrow>
          <h2 className="title-md text-foreground">Ömür ve maliyet</h2>
        </div>
        <div className="shrink-0 pb-1">
          <StatusChip tone={STATUS_MAP[status].tone} icon={Timer} testId="wear-status">
            {STATUS_MAP[status].label}
          </StatusChip>
        </div>
      </div>

      <div className="overflow-hidden rounded-theme border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="px-4 py-4">
            <Eyebrow>Tahmini takım ömrü</Eyebrow>
            <p className="num-xl mt-1 text-primary" data-testid="tool-life-minutes">
              {formatNumber(life, life < 10 ? 1 : 0)}
            </p>
            <p className="mt-1 text-xs font-semibold text-card-foreground">dakika kesme</p>
          </div>
          <div className="px-4 py-4">
            <Eyebrow>Parça başı toplam</Eyebrow>
            <p className="num-xl mt-1 text-foreground" data-testid="cost-per-part">
              {formatNumber(cost.totalPerPart, 2)}
            </p>
            <p className="mt-1 text-xs font-semibold text-card-foreground">{cur} / parça</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Eyebrow>Takım maliyeti</Eyebrow>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Uç başına {money(cost.costPerEdge)} · uçla {formatNumber(cost.partsPerEdge, 1)} parça
              </p>
            </div>
            <p className="num-md shrink-0 text-accent" data-testid="tool-cost-part">{money(cost.toolCostPerPart)}</p>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Eyebrow>Tezgâh maliyeti</Eyebrow>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatNumber(settings.hourlyRate, 0)} {cur}/saat · {formatNumber(partMinutes, 2)} dk/parça
              </p>
            </div>
            <p className="num-md shrink-0 text-foreground" data-testid="machine-cost-part">{money(cost.machineCostPerPart)}</p>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Eyebrow>Referans</Eyebrow>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Vc referans {formatQty('vc', vcRef, unitSystem)} {unitLabel('vc', unitSystem)} · T{settings.refLife || 15} dk ·{' '}
                {tool === 'hss' ? 'HSS n=0,125' : 'Karbür n=0,25'} · soğutma ×{coolantLifeFactor(coolant)}
              </p>
            </div>
            <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        {status !== 'iyi' && onApplyVc ? (
          <button
            type="button"
            onClick={() => {
              onApplyVc(Math.round(suggestedVc));
              toast.success(`Kesme hızı ${formatNumber(suggestedVc, 0)} yapıldı`, {
                description: `Hedef ömür ${settings.targetLife || 30} dk`,
              });
            }}
            data-testid="apply-life-vc"
            className="flex w-full items-center gap-2 border-t border-border bg-primary/10 px-4 py-3 text-left text-xs font-semibold text-primary"
          >
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Ömür kısa — Vc {formatQty('vc', suggestedVc, unitSystem)} {unitLabel('vc', unitSystem)} yaparsan ömür{' '}
            {settings.targetLife || 30} dk olur (uygula)
          </button>
        ) : null}

        {status === 'iyi' && onApplyVc ? (
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-success" />
            {settings.targetLife || 30} dk ömür için Vc {formatQty('vc', suggestedVc, unitSystem)}{' '}
            {unitLabel('vc', unitSystem)} olmalı
          </div>
        ) : null}
      </div>

      {/* maliyet girdileri */}
      <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
            <Coins className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-card-foreground">Maliyet girdileri</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Değerler tüm hesaplarda kullanılır</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <NumericField
            id="tl-price"
            label="Takım fiyatı"
            kind="deg"
            unitOverride={cur}
            value={settings.toolPrice}
            onChange={(v) => updateSettings({ toolPrice: v })}
            testId="input-tool-price"
          />
          <NumericField
            id="tl-edges"
            label="Kesici ağız"
            kind="deg"
            unitOverride="adet"
            value={settings.toolEdges}
            onChange={(v) => updateSettings({ toolEdges: Math.max(1, Math.round(v)) })}
            testId="input-tool-edges"
          />
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <NumericField
            id="tl-rate"
            label="Tezgâh saat ücreti"
            kind="deg"
            unitOverride={`${cur}/s`}
            value={settings.hourlyRate}
            onChange={(v) => updateSettings({ hourlyRate: v })}
            testId="input-hourly-rate"
          />
          <NumericField
            id="tl-part"
            label="Parça süresi"
            kind="deg"
            unitOverride="dk"
            value={settings.partMinutes}
            onChange={(v) => updateSettings({ partMinutes: v })}
            testId="input-part-minutes"
          />
        </div>
      </div>

      {/* kayıtlı takıma kullanım ekle */}
      {opTools.length ? (
        <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
              <Wrench className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-card-foreground">Takım kullanımı kaydet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bu hesabın kesme süresini takım sayacına ekle
              </p>
            </div>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
            {opTools.map((t) => {
              const pct = t.lifeMinutes > 0 ? Math.min(100, ((t.usedMinutes || 0) / t.lifeMinutes) * 100) : 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTool(t.id === selectedTool ? '' : t.id)}
                  data-testid={`select-tool-${t.id}`}
                  className={`shrink-0 rounded-theme border px-3 py-2 text-left transition-colors ${
                    selectedTool === t.id ? 'border-primary bg-primary/10' : 'border-border bg-input'
                  }`}
                >
                  <span className={`block text-xs font-semibold ${selectedTool === t.id ? 'text-primary' : 'text-card-foreground'}`}>
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    %{formatNumber(pct, 0)} kullanıldı
                  </span>
                </button>
              );
            })}
          </div>
          {selectedTool ? (
            <button
              type="button"
              onClick={() => {
                addToolUsage(selectedTool, partMinutes);
                toast.success(`${formatNumber(partMinutes, 2)} dk kullanım eklendi`);
              }}
              data-testid="add-tool-usage"
              className="flex w-full items-center justify-center gap-2 border-t border-border bg-primary/10 px-4 py-3 text-xs font-bold text-primary"
            >
              <Plus className="h-4 w-4" />
              {formatNumber(partMinutes, 2)} dk kullanım ekle
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
