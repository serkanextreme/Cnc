import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bolt,
  CircleDotDashed,
  Drill,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { OPERATIONS, TOOL_MATERIALS } from '../data/materials';
import {
  BottomTabBar,
  EmptyState,
  Eyebrow,
  GhostButton,
  IconButton,
  NumericField,
  PrimaryButton,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  SegmentedToggle,
  StatusChip,
} from '../components/talas/Primitives';
import { formatNumber } from '../lib/units';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill, dis: Bolt };

const emptyTool = () => ({
  id: '',
  name: '',
  op: 'freze',
  type: 'karbur',
  diameter: 12,
  edges: 4,
  price: 1200,
  lifeMinutes: 15,
  usedMinutes: 0,
  note: '',
});

export default function Tools() {
  const navigate = useNavigate();
  const { tools, saveTool, deleteTool, addToolUsage, resetToolUsage, settings } = useApp();
  const [form, setForm] = useState(null);
  const cur = settings.currency || 'TL';

  const sorted = useMemo(
    () => [...tools].sort((a, b) => {
      const pa = a.lifeMinutes > 0 ? (a.usedMinutes || 0) / a.lifeMinutes : 0;
      const pb = b.lifeMinutes > 0 ? (b.usedMinutes || 0) / b.lifeMinutes : 0;
      return pb - pa;
    }),
    [tools],
  );

  const warnCount = tools.filter((t) => t.lifeMinutes > 0 && (t.usedMinutes || 0) / t.lifeMinutes >= 0.8).length;

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Takım adı gerekli');
      return;
    }
    saveTool({ ...form, name: form.name.trim() });
    toast.success(form.id ? 'Takım güncellendi' : 'Takım eklendi');
    setForm(null);
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="TAKIM YÖNETİMİ"
        title="Takımlarım"
        size="xl"
        right={
          <IconButton
            icon={Plus}
            label="Takım ekle"
            tone="primary"
            testId="add-tool"
            onClick={() => setForm(emptyTool())}
          />
        }
      >
        <div className="mt-4 flex items-center gap-2">
          <StatusChip tone="neutral" icon={Wrench}>{tools.length} takım</StatusChip>
          {warnCount ? (
            <StatusChip tone="warn" icon={TriangleAlert} testId="tools-warning">
              {warnCount} takım ömür sonuna yakın
            </StatusChip>
          ) : (
            <StatusChip tone="ok">Ömürler güvenli aralıkta</StatusChip>
          )}
        </div>
      </ScreenHeader>

      <main className="space-y-6 px-5 pt-5">
        {form ? (
          <section aria-label="Takım formu" data-testid="tool-form">
            <SectionHeading
              eyebrow={form.id ? 'DÜZENLE' : 'YENİ TAKIM'}
              title={form.id ? 'Takımı güncelle' : 'Takım ekle'}
              right={
                <button type="button" onClick={() => setForm(null)} className="text-xs font-semibold text-muted-foreground" data-testid="close-tool-form">
                  <X className="h-4 w-4" />
                </button>
              }
            />
            <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
              <div className="px-4 py-3">
                <label className="text-sm font-semibold text-card-foreground" htmlFor="tool-name">Takım adı</label>
                <input
                  id="tool-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="örn. Ø12 4 ağız karbür freze"
                  data-testid="tool-name"
                  className="mt-2 h-12 w-full rounded-theme border border-border bg-input px-3 text-base text-foreground outline-none"
                />
              </div>
              <div className="px-4 py-3">
                <Eyebrow className="mb-2">İşlem</Eyebrow>
                <SegmentedToggle
                  options={OPERATIONS.map((o) => ({ id: o.id, label: o.label }))}
                  value={form.op}
                  onChange={(v) => setForm({ ...form, op: v })}
                  ariaLabel="İşlem"
                  testId="tool-op"
                />
              </div>
              <div className="px-4 py-3">
                <Eyebrow className="mb-2">Takım malzemesi</Eyebrow>
                <SegmentedToggle
                  options={TOOL_MATERIALS}
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  ariaLabel="Takım malzemesi"
                  testId="tool-type"
                />
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <NumericField
                  id="tool-d"
                  label="Çap"
                  kind="length"
                  value={form.diameter}
                  onChange={(v) => setForm({ ...form, diameter: v })}
                  testId="tool-diameter"
                />
                <NumericField
                  id="tool-edges"
                  label="Kesici ağız"
                  kind="deg"
                  unitOverride="adet"
                  value={form.edges}
                  onChange={(v) => setForm({ ...form, edges: Math.max(1, Math.round(v)) })}
                  testId="tool-edges"
                />
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <NumericField
                  id="tool-price"
                  label="Fiyat"
                  kind="deg"
                  unitOverride={cur}
                  value={form.price}
                  onChange={(v) => setForm({ ...form, price: v })}
                  testId="tool-price"
                />
                <NumericField
                  id="tool-life"
                  label="Ömür bütçesi"
                  kind="deg"
                  unitOverride="dk"
                  value={form.lifeMinutes}
                  onChange={(v) => setForm({ ...form, lifeMinutes: v })}
                  testId="tool-life"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <GhostButton onClick={() => setForm(null)} className="flex-1" testId="cancel-tool">İptal</GhostButton>
              <PrimaryButton icon={Save} onClick={handleSave} testId="save-tool">Kaydet</PrimaryButton>
            </div>
          </section>
        ) : null}

        {sorted.length === 0 && !form ? (
          <EmptyState
            icon={Wrench}
            title="Takım yok"
            body="Takımlarınızı ekleyin; her hesapta kullanım süresini sayaca ekleyip ömür takibi yapabilirsiniz."
            action={<PrimaryButton icon={Plus} onClick={() => setForm(emptyTool())} testId="empty-add-tool">Takım Ekle</PrimaryButton>}
            testId="tools-empty"
          />
        ) : null}

        {sorted.length ? (
          <section aria-label="Takım listesi">
            <SectionHeading eyebrow="KULLANIM SAYACI" title="Takım ömrü takibi" />
            <div className="space-y-3">
              {sorted.map((t) => {
                const pct = t.lifeMinutes > 0 ? Math.min(100, ((t.usedMinutes || 0) / t.lifeMinutes) * 100) : 0;
                const tone = pct >= 100 ? 'error' : pct >= 80 ? 'warn' : 'ok';
                const barColor = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-primary' : 'bg-success';
                const Icon = OP_ICONS[t.op] || Wrench;
                return (
                  <div
                    key={t.id}
                    className="overflow-hidden rounded-theme border border-border bg-card"
                    data-testid={`tool-${t.id}`}
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-card-foreground">{t.name}</p>
                          <StatusChip tone={tone}>%{formatNumber(pct, 0)}</StatusChip>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Ø{formatNumber(t.diameter, 2)} mm · {t.edges} ağız · {t.type === 'hss' ? 'HSS' : 'Karbür'} ·{' '}
                          {formatNumber(t.price, 0)} {cur}
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {formatNumber(t.usedMinutes || 0, 1)} / {formatNumber(t.lifeMinutes, 0)} dk kullanıldı
                          {t.edgeIndex ? ` · ${t.edgeIndex}. uç` : ''}
                        </p>
                        {pct >= 80 ? (
                          <p className={`mt-1.5 text-[11px] font-semibold ${pct >= 100 ? 'text-destructive' : 'text-primary'}`}>
                            {pct >= 100 ? 'Ömür doldu — ucu değiştirin' : 'Ömrün %80’i doldu — takımı kontrol edin'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
                      <button
                        type="button"
                        onClick={() => { addToolUsage(t.id, 5); toast.success('5 dk eklendi'); }}
                        data-testid={`usage5-${t.id}`}
                        className="px-2 py-3 text-[11px] font-semibold text-card-foreground transition-colors active:bg-muted/60"
                      >
                        +5 dk
                      </button>
                      <button
                        type="button"
                        onClick={() => { addToolUsage(t.id, 30); toast.success('30 dk eklendi'); }}
                        data-testid={`usage30-${t.id}`}
                        className="px-2 py-3 text-[11px] font-semibold text-card-foreground transition-colors active:bg-muted/60"
                      >
                        +30 dk
                      </button>
                      <button
                        type="button"
                        onClick={() => { resetToolUsage(t.id); toast.success('Sayaç sıfırlandı — yeni uç'); }}
                        data-testid={`reset-${t.id}`}
                        className="flex items-center justify-center gap-1 px-2 py-3 text-[11px] font-semibold text-primary transition-colors active:bg-muted/60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Yeni uç
                      </button>
                      <button
                        type="button"
                        onClick={() => { deleteTool(t.id); toast.success('Takım silindi'); }}
                        data-testid={`delete-tool-${t.id}`}
                        className="flex items-center justify-center gap-1 px-2 py-3 text-[11px] font-semibold text-destructive transition-colors active:bg-muted/60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...t })}
                      data-testid={`edit-tool-${t.id}`}
                      className="w-full border-t border-border px-4 py-2.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      Düzenle
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="rounded-theme border border-border bg-muted px-4 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Ömür bütçesini hesap ekranındaki “Tahmini takım ömrü” değerine göre belirleyebilirsiniz. Hesap
            ekranından “Takım kullanımı kaydet” ile parça süresini doğrudan sayaca ekleyebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mx-auto block pb-2 text-xs font-semibold text-muted-foreground"
        >
          Hesaplamaya dön
        </button>
      </main>

      <BottomTabBar active="takimlar" />
    </ScreenShell>
  );
}
