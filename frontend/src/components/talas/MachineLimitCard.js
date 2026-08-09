import React from 'react';
import { Gauge, Lock, Wand2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { useApp } from '../../context/AppContext';
import { activeLimitLabel, presetsForOp, resolveLimits } from '../../data/materials';
import { formatNumber } from '../../lib/units';
import { ClampNotice, Eyebrow, NumericField, StatusChip } from './Primitives';

/**
 * Tezgâh limiti kartı.
 * - Varsayılan: OTOMATİK (tezgâh tipi preseti) — kullanıcı değer girmek zorunda değil
 * - "Manuel değer gir" kutusu işaretlenmedikçe sayı alanları DEVRE DIŞI
 */
export function MachineLimitCard({ op, clamped, notes }) {
  const { settings, updateSettings, updateManualLimit } = useApp();
  const limits = resolveLimits(op, settings);
  const presets = presetsForOp(op);
  const activePreset = (settings.presetByOp && settings.presetByOp[op]) || presets[0]?.id;

  return (
    <section aria-label="Tezgâh limiti" data-testid="machine-limit-card">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>TEZGÂH</Eyebrow>
          <h2 className="title-md text-foreground">Devir limiti</h2>
        </div>
        <div className="shrink-0 pb-1">
          <StatusChip tone={settings.limitEnabled ? (clamped ? 'warn' : 'ok') : 'neutral'} testId="limit-state-chip">
            {settings.limitEnabled ? activeLimitLabel(op, settings) : 'Kapalı'}
          </StatusChip>
        </div>
      </div>

      <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
            <Gauge className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-card-foreground">Tezgâh limitini uygula</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Devir ve ilerleme tezgâh kapasitesini aşmayacak şekilde otomatik sınırlanır
            </p>
          </div>
          <Switch
            checked={settings.limitEnabled}
            onCheckedChange={(v) => updateSettings({ limitEnabled: !!v })}
            aria-label="Tezgâh limitini uygula"
            data-testid="limit-enabled-switch"
          />
        </div>

        {settings.limitEnabled ? (
          <>
            <div className={`px-4 py-3 ${settings.manualLimits ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Tezgâh tipi (otomatik)
                </p>
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={settings.manualLimits}
                    onClick={() => updateSettings({ presetByOp: { ...settings.presetByOp, [op]: p.id } })}
                    data-testid={`preset-${p.id}`}
                    className={`shrink-0 rounded-theme border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                      activePreset === p.id && !settings.manualLimits
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-input'
                    }`}
                  >
                    <span
                      className={`block text-xs font-semibold ${
                        activePreset === p.id && !settings.manualLimits ? 'text-primary' : 'text-card-foreground'
                      }`}
                    >
                      {p.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 px-4 py-3" htmlFor="manual-limits-checkbox">
              <Checkbox
                id="manual-limits-checkbox"
                checked={settings.manualLimits}
                onCheckedChange={(v) => updateSettings({ manualLimits: !!v })}
                data-testid="manual-limits-checkbox"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-card-foreground">Manuel değer gir</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {settings.manualLimits
                    ? 'Kendi tezgâh değerlerinizi girin'
                    : 'Kapalı — tezgâh değerleri otomatik alınır, giriş devre dışı'}
                </span>
              </span>
              {!settings.manualLimits ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
            </label>

            <NumericField
              id="limit-max-rpm"
              label="Maksimum iş mili devri"
              hint={settings.manualLimits ? 'Manuel' : `Otomatik: ${formatNumber(limits?.maxRpm || 0, 0)} dev/dk`}
              kind="rpm"
              value={settings.manualLimits ? settings.manual.maxRpm : limits?.maxRpm || 0}
              onChange={(v) => updateManualLimit({ maxRpm: v })}
              disabled={!settings.manualLimits}
              testId="limit-max-rpm"
            />
            <NumericField
              id="limit-max-feed"
              label="Maksimum ilerleme"
              hint={settings.manualLimits ? 'Manuel' : `Otomatik: ${formatNumber(limits?.maxFeed || 0, 0)} mm/dk`}
              kind="vf"
              value={settings.manualLimits ? settings.manual.maxFeed : limits?.maxFeed || 0}
              onChange={(v) => updateManualLimit({ maxFeed: v })}
              disabled={!settings.manualLimits}
              testId="limit-max-feed"
            />
          </>
        ) : null}
      </div>

      <div className="mt-3">
        {clamped ? (
          <ClampNotice
            tone="warn"
            title="Tezgâh limiti uygulandı"
            body="Hesap, tezgâh kapasitesine göre düşürüldü. Efektif kesme hızı yeniden hesaplandı."
            notes={notes}
          />
        ) : (
          <ClampNotice
            tone="ok"
            title={settings.limitEnabled ? 'Tezgâh limiti içinde' : 'Tezgâh limiti uygulanmadı'}
            body={
              settings.limitEnabled
                ? 'Hesaplanan devir ve ilerleme tezgâh kapasitesinin altında.'
                : 'Limit kapalı; teorik değerler gösteriliyor.'
            }
          />
        )}
      </div>
    </section>
  );
}
