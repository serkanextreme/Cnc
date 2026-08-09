import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleDotDashed,
  Drill,
  History as HistoryIcon,
  RotateCcw,
  RotateCw,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import {
  BottomTabBar,
  EmptyState,
  Eyebrow,
  IconButton,
  PrimaryButton,
  ScreenHeader,
  ScreenShell,
} from '../components/talas/Primitives';
import { buildShareText, describeRecord, groupByDay, shareText, todayStats } from '../lib/records';
import { formatNumber, formatQty, unitLabel } from '../lib/units';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill };
const OP_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'freze', label: 'Freze' },
  { id: 'torna', label: 'Torna' },
  { id: 'matkap', label: 'Matkap' },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history, deleteHistory, clearHistory, unitSystem } = useApp();
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? history : history.filter((r) => r.op === filter)),
    [history, filter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const stats = useMemo(() => todayStats(history), [history]);

  const handleShare = async (rec) => {
    const res = await shareText(buildShareText(rec, unitSystem, rec.materialName));
    if (res === 'copied') toast.success('Panoya kopyalandı');
    else if (res === 'failed') toast.error('Paylaşım desteklenmiyor');
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="HESAPLAMA KAYITLARI"
        title="Geçmiş"
        size="xl"
        right={
          <IconButton
            icon={SlidersHorizontal}
            label="Geçmişi filtrele"
            tone={showFilters ? 'primary' : 'muted'}
            testId="toggle-filters"
            onClick={() => setShowFilters((s) => !s)}
          />
        }
      >
        <section className="mt-5 border-l-2 border-primary pl-4" aria-label="Bugünkü hesaplama özeti">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="num-lg text-primary" data-testid="today-total">
                {stats.total} HESAPLAMA
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">Bugün tamamlandı</p>
            </div>
            <p className="pb-0.5 text-right text-xs leading-5 text-muted-foreground">
              {stats.counts.freze} Freze · {stats.counts.torna} Torna
              <br />
              {stats.counts.matkap} Matkap
            </p>
          </div>
        </section>

        {showFilters ? (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="history-filters">
            {OP_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-testid={`history-filter-${f.id}`}
                className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                  filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
            {history.length ? (
              <button
                type="button"
                onClick={() => {
                  clearHistory();
                  toast.success('Geçmiş temizlendi');
                }}
                data-testid="clear-history"
                className="shrink-0 rounded-theme border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Tümünü sil
              </button>
            ) : null}
          </div>
        ) : null}
      </ScreenHeader>

      <main className="px-5 pt-5">
        {groups.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="Kayıt yok"
            body="Bir hesaplama yapıp 'Hesaplamayı Kaydet' dediğinizde burada listelenir."
            action={<PrimaryButton onClick={() => navigate('/')}>Hesaplamaya Başla</PrimaryButton>}
            testId="history-empty"
          />
        ) : (
          <div className="space-y-7">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="title-md text-foreground">{g.label}</h2>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">{g.date}</span>
                </div>
                <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
                  {g.items.map((rec) => {
                    const d = describeRecord(rec, unitSystem);
                    const Icon = OP_ICONS[rec.op] || CircleDotDashed;
                    return (
                      <article key={rec.id} className="flex" data-testid={`history-row-${rec.id}`}>
                        <div className="min-w-0 flex-1 px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                              <Icon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-semibold text-card-foreground">
                                  {d.title} <span className="font-normal text-muted-foreground">· {d.material}</span>
                                </p>
                                <p className="shrink-0 text-[11px] text-muted-foreground">{d.time}</p>
                              </div>
                              {d.subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{d.subtitle}</p> : null}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-theme bg-muted px-2 py-1 font-heading text-lg font-bold leading-none text-primary">
                                  {formatNumber(rec.outputs.n, 0)}{' '}
                                  <span className="font-body text-[10px] font-semibold text-muted-foreground">
                                    {unitLabel('rpm', unitSystem)}
                                  </span>
                                </span>
                                <span className="rounded-theme bg-muted px-2 py-1 font-heading text-lg font-bold leading-none text-accent">
                                  {formatQty('vf', rec.outputs.vf, unitSystem)}{' '}
                                  <span className="font-body text-[10px] font-semibold text-muted-foreground">
                                    {unitLabel('vf', unitSystem)}
                                  </span>
                                </span>
                              </div>
                              <div className="mt-3 flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/${rec.op}?record=${rec.id}`)}
                                  data-testid={`reopen-${rec.id}`}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Hesaplamayı yeniden aç
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShare(rec)}
                                  data-testid={`share-${rec.id}`}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                  Paylaş
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Kaydı sil"
                          onClick={() => {
                            deleteHistory(rec.id);
                            toast.success('Kayıt silindi');
                          }}
                          data-testid={`delete-${rec.id}`}
                          className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-l border-border bg-destructive text-destructive-foreground transition-colors active:brightness-95"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Sil</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {history.length ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Eyebrow className="inline">Toplam {history.length} kayıt · yalnızca bu cihazda saklanır</Eyebrow>
          </p>
        ) : null}
      </main>

      <BottomTabBar active="gecmis" />
    </ScreenShell>
  );
}
