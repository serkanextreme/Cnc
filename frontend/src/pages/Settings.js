import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bolt,
  CircleDotDashed,
  Coins,
  Download,
  Drill,
  Gauge,
  Lock,
  RotateCw,
  Ruler,
  Timer,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { useApp } from '../context/AppContext';
import { MACHINE_PRESETS, presetsForOp, SEED_MATERIALS } from '../data/materials';
import {
  BottomTabBar,
  Eyebrow,
  GhostButton,
  IconButton,
  NumericField,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  SegmentedToggle,
  StatusChip,
} from '../components/talas/Primitives';
import { exportAll, importAll } from '../lib/storage';
import { formatNumber, UNIT_SYSTEMS } from '../lib/units';

const OPS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed },
  { id: 'torna', label: 'Torna', icon: RotateCw },
  { id: 'matkap', label: 'Matkap', icon: Drill },
  { id: 'dis', label: 'Kılavuz / Diş', icon: Bolt },
];

const CURRENCIES = [
  { id: 'TL', label: 'TL' },
  { id: 'USD', label: 'USD' },
  { id: 'EUR', label: 'EUR' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    settings, updateSettings, updateManualLimit, setPresetForOp,
    history, customMaterials, clearHistory, replaceAll, tools,
  } = useApp();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    try {
      const payload = exportAll();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talas-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Yedek indirildi');
    } catch (err) {
      toast.error('Yedek alınamadı');
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      importAll(payload);
      replaceAll(payload);
      toast.success('Yedek geri yüklendi');
    } catch (err) {
      toast.error('Geçersiz yedek dosyası');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="SİSTEM"
        title="Ayarlar"
        size="xl"
        right={<IconButton icon={Gauge} label="Ayarlar" tone="primary" />}
      />

      <main className="space-y-6 px-5 pt-5">
        <section aria-label="Birim sistemi">
          <SectionHeading eyebrow="BİRİMLER" title="Birim sistemi" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-card-foreground">Ölçü birimi seçin</p>
              </div>
              <SegmentedToggle
                options={UNIT_SYSTEMS.map((u) => ({ id: u.id, label: u.label }))}
                value={settings.unitSystem}
                onChange={(v) => {
                  updateSettings({ unitSystem: v });
                  toast.success(v === 'metric' ? 'Metrik sisteme geçildi' : 'İnç sistemine geçildi');
                }}
                ariaLabel="Birim sistemi"
                testId="unit-system-toggle"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {UNIT_SYSTEMS.map((u) => (
                  <div
                    key={u.id}
                    className={`rounded-theme border px-3 py-2 ${
                      settings.unitSystem === u.id ? 'border-primary bg-primary/10' : 'border-border bg-input'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${settings.unitSystem === u.id ? 'text-primary' : 'text-card-foreground'}`}>
                      {u.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{u.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Tezgâh limitleri">
          <SectionHeading
            eyebrow="TEZGÂH"
            title="Devir limitleri"
            right={
              <StatusChip tone={settings.limitEnabled ? 'ok' : 'neutral'}>
                {settings.limitEnabled ? (settings.manualLimits ? 'Manuel' : 'Otomatik') : 'Kapalı'}
              </StatusChip>
            }
          />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                <Gauge className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-card-foreground">Tezgâh limitini uygula</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sonuçlar tezgâh kapasitesine göre otomatik sınırlanır
                </p>
              </div>
              <Switch
                checked={settings.limitEnabled}
                onCheckedChange={(v) => updateSettings({ limitEnabled: !!v })}
                aria-label="Tezgâh limitini uygula"
                data-testid="settings-limit-switch"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 px-4 py-3" htmlFor="settings-manual-checkbox">
              <Checkbox
                id="settings-manual-checkbox"
                checked={settings.manualLimits}
                onCheckedChange={(v) => updateSettings({ manualLimits: !!v })}
                disabled={!settings.limitEnabled}
                data-testid="settings-manual-checkbox"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-card-foreground">Manuel değer gir</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {settings.manualLimits
                    ? 'Aşağıdaki alanlar aktif'
                    : 'Kapalı — tezgâh tipine göre otomatik, giriş devre dışı'}
                </span>
              </span>
              {!settings.manualLimits ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
            </label>

            <NumericField
              id="settings-max-rpm"
              label="Maksimum iş mili devri"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="rpm"
              value={settings.manual.maxRpm}
              onChange={(v) => updateManualLimit({ maxRpm: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testId="settings-max-rpm"
            />
            <NumericField
              id="settings-max-feed"
              label="Maksimum ilerleme"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="vf"
              value={settings.manual.maxFeed}
              onChange={(v) => updateManualLimit({ maxFeed: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testId="settings-max-feed"
            />
            <NumericField
              id="settings-power"
              label="İş mili gücü"
              hint={settings.manualLimits ? 'Manuel' : 'Otomatik presetten alınır'}
              kind="power"
              value={settings.manual.powerKw}
              onChange={(v) => updateManualLimit({ powerKw: v })}
              disabled={!settings.manualLimits || !settings.limitEnabled}
              testId="settings-power"
            />
          </div>

          <div className={`mt-3 space-y-3 ${settings.manualLimits || !settings.limitEnabled ? 'opacity-50' : ''}`}>
            {OPS.map((op) => {
              const presets = presetsForOp(op.id);
              const activeId = settings.presetByOp[op.id];
              const active = MACHINE_PRESETS[activeId];
              return (
                <div key={op.id} className="rounded-theme border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <op.icon className="h-4 w-4 text-accent" />
                      <p className="text-sm font-semibold text-card-foreground">{op.label} tezgâhı</p>
                    </div>
                    <p className="text-[11px] font-semibold text-primary">
                      {active ? `${formatNumber(active.maxRpm, 0)} dev/dk` : '—'}
                    </p>
                  </div>
                  <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={settings.manualLimits || !settings.limitEnabled}
                        onClick={() => setPresetForOp(op.id, p.id)}
                        data-testid={`settings-preset-${op.id}-${p.id}`}
                        className={`shrink-0 rounded-theme border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                          activeId === p.id ? 'border-primary bg-primary/10' : 'border-border bg-input'
                        }`}
                      >
                        <span className={`block text-xs font-semibold ${activeId === p.id ? 'text-primary' : 'text-card-foreground'}`}>
                          {p.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="Hesaplama">
          <SectionHeading eyebrow="HESAPLAMA" title="İş mili verimi" />
          <div className="overflow-hidden rounded-theme border border-border bg-card">
            <NumericField
              id="settings-efficiency"
              label="Verim (η)"
              hint="Güç hesabında kullanılır · 0,60–1,00"
              kind="deg"
              unitOverride="η"
              value={settings.efficiency}
              onChange={(v) => updateSettings({ efficiency: Math.min(Math.max(v, 0.3), 1) })}
              testId="settings-efficiency"
            />
          </div>
        </section>

        <section aria-label="Takım ömrü ve maliyet">
          <SectionHeading
            eyebrow="TAKIM ÖMRÜ"
            title="Ömür ve maliyet"
            right={<StatusChip tone="accent" icon={Timer}>T{settings.refLife || 15} dk</StatusChip>}
          />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                <Coins className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-card-foreground">Para birimi</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Maliyet hesaplarında kullanılır</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <SegmentedToggle
                options={CURRENCIES}
                value={settings.currency || 'TL'}
                onChange={(v) => updateSettings({ currency: v })}
                ariaLabel="Para birimi"
                testId="currency-toggle"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="settings-ref-life"
                label="Referans ömür"
                hint="Taylor T_ref"
                kind="deg"
                unitOverride="dk"
                value={settings.refLife || 15}
                onChange={(v) => updateSettings({ refLife: Math.max(1, v) })}
                testId="settings-ref-life"
              />
              <NumericField
                id="settings-target-life"
                label="Hedef ömür"
                hint="Vc önerisi için"
                kind="deg"
                unitOverride="dk"
                value={settings.targetLife || 30}
                onChange={(v) => updateSettings({ targetLife: Math.max(1, v) })}
                testId="settings-target-life"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="settings-tool-price"
                label="Takım fiyatı"
                kind="deg"
                unitOverride={settings.currency || 'TL'}
                value={settings.toolPrice}
                onChange={(v) => updateSettings({ toolPrice: v })}
                testId="settings-tool-price"
              />
              <NumericField
                id="settings-tool-edges"
                label="Kesici ağız"
                kind="deg"
                unitOverride="adet"
                value={settings.toolEdges}
                onChange={(v) => updateSettings({ toolEdges: Math.max(1, Math.round(v)) })}
                testId="settings-tool-edges"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="settings-hourly"
                label="Tezgâh saat ücreti"
                kind="deg"
                unitOverride={`${settings.currency || 'TL'}/s`}
                value={settings.hourlyRate}
                onChange={(v) => updateSettings({ hourlyRate: v })}
                testId="settings-hourly-rate"
              />
              <NumericField
                id="settings-part-min"
                label="Parça süresi"
                kind="deg"
                unitOverride="dk"
                value={settings.partMinutes}
                onChange={(v) => updateSettings({ partMinutes: v })}
                testId="settings-part-minutes"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Takım ömrü Taylor denklemi (Vc × T<sup>n</sup> = C) ile hesaplanır; karbür n = 0,25, HSS n = 0,125.
          </p>
        </section>

        <section aria-label="Veri yönetimi">
          <SectionHeading eyebrow="VERİ" title="Yedekleme" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-card-foreground">Cihazdaki veriler</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {history.length} hesap kaydı · {customMaterials.length} özel malzeme · {tools.length} takım ·{' '}
                {SEED_MATERIALS.length} hazır malzeme kalitesi
              </p>
            </div>
            <div className="flex gap-3 px-4 py-3">
              <GhostButton icon={Download} onClick={handleExport} testId="export-data" className="flex-1">
                Dışa aktar
              </GhostButton>
              <GhostButton
                icon={Upload}
                onClick={() => fileRef.current && fileRef.current.click()}
                testId="import-data"
                className="flex-1"
              >
                {busy ? 'Yükleniyor…' : 'İçe aktar'}
              </GhostButton>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => handleImport(e.target.files && e.target.files[0])}
                className="hidden"
                data-testid="import-file"
              />
            </div>
            <div className="px-4 py-3">
              <GhostButton
                icon={Trash2}
                tone="destructive"
                onClick={() => {
                  clearHistory();
                  toast.success('Geçmiş temizlendi');
                }}
                testId="settings-clear-history"
                className="w-full"
              >
                Geçmişi temizle
              </GhostButton>
            </div>
          </div>
        </section>

        <section aria-label="Uygulama">
          <SectionHeading eyebrow="UYGULAMA" title="Talaş" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-success/15 text-success">
                <WifiOff className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-card-foreground">Çevrimdışı çalışır</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tüm hesaplamalar ve veriler telefonda; internet gerekmez.
                </p>
              </div>
              <StatusChip tone={navigator.onLine ? 'ok' : 'warn'}>{navigator.onLine ? 'Çevrimiçi' : 'Çevrimdışı'}</StatusChip>
            </div>
            <div className="px-4 py-3">
              <Eyebrow>Ana ekrana ekleme</Eyebrow>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tarayıcı menüsünden “Ana ekrana ekle” seçeneğiyle uygulamayı telefona kurabilirsiniz. Kurulduktan sonra
                internet olmadan da açılır.
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-card-foreground">Sürüm</p>
              <p className="text-xs text-muted-foreground">1.0.0</p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mx-auto block pb-2 text-xs font-semibold text-muted-foreground"
        >
          Hesaplamaya dön
        </button>
      </main>

      <BottomTabBar active="ayarlar" />
    </ScreenShell>
  );
}
