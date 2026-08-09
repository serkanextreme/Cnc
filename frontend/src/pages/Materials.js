import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anvil,
  Atom,
  ChevronDown,
  ChevronRight,
  Circle,
  Coins,
  Component,
  Flame,
  Hammer,
  LibraryBig,
  Layers3,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Star,
  Triangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  GROUPS,
  ISO_GROUPS,
  MACHINABILITY,
  machinabilityLabel,
  machinabilityTone,
  matchesQuery,
  recommended,
} from '../data/materials';
import {
  BottomTabBar,
  Eyebrow,
  EmptyState,
  IconButton,
  ListCard,
  Row,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  StatusChip,
} from '../components/talas/Primitives';
import { formatRange, unitLabel } from '../lib/units';

const GROUP_ICONS = {
  Anvil, Hammer, ShieldCheck, Triangle, Circle, Coins, Atom, Flame, Component,
};

const HARDNESS_FILTERS = [
  { id: 'all', label: 'Tüm sertlikler' },
  { id: 'hb-soft', label: '≤ 150 HB' },
  { id: 'hb-mid', label: '> 150 HB' },
  { id: 'hrc-low', label: '≤ 44 HRC' },
  { id: 'hrc-high', label: '> 44 HRC' },
];

function matchHardness(m, filter) {
  if (filter === 'all') return true;
  const max = m.hardness[1];
  if (filter === 'hb-soft') return m.hardnessScale === 'HB' && max <= 150;
  if (filter === 'hb-mid') return m.hardnessScale === 'HB' && max > 150;
  if (filter === 'hrc-low') return m.hardnessScale === 'HRC' && max <= 44;
  if (filter === 'hrc-high') return m.hardnessScale === 'HRC' && max > 44;
  return true;
}

export default function Materials() {
  const navigate = useNavigate();
  const { materials, favorites, toggleFavorite, activeMaterialId, setActiveMaterialId, unitSystem } = useApp();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('all'); // all | code
  const [group, setGroup] = useState('all');
  const [hardness, setHardness] = useState('all');
  const [mach, setMach] = useState('all');
  const [openGroup, setOpenGroup] = useState(null);
  const [iso, setIso] = useState('all');
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    return materials.filter((m) => {
      if (group !== 'all' && m.group !== group) return false;
      if (iso !== 'all' && m.isoGroup !== iso) return false;
      if (mach !== 'all' && m.machinability !== mach) return false;
      if (!matchHardness(m, hardness)) return false;
      if (!needle) return true;
      if (searchMode === 'code') return m.code.toLocaleLowerCase('tr').includes(needle);
      return matchesQuery(m, needle);
    });
  }, [materials, query, searchMode, group, hardness, mach, iso]);

  const filtersActive = query.trim() !== '' || group !== 'all' || hardness !== 'all' || mach !== 'all' || iso !== 'all';
  const favMaterials = materials.filter((m) => favorites.includes(m.id));
  const customMats = materials.filter((m) => m.custom);

  const hardnessText = (m) =>
    m.hardness[0] === m.hardness[1]
      ? `${m.hardness[0]} ${m.hardnessScale}`
      : `${m.hardness[0]}–${m.hardness[1]} ${m.hardnessScale}`;

  const renderMaterialRow = (m) => {
    const rec = recommended(m, 'freze', 'karbur');
    const isFav = favorites.includes(m.id);
    return (
      <div key={m.id} className="flex items-stretch">
        <button
          type="button"
          onClick={() => navigate(`/malzemeler/${m.id}`)}
          data-testid={`material-${m.id}`}
          className="relative min-w-0 flex-1 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
        >
          {m.id === activeMaterialId ? <span className="absolute bottom-0 left-0 top-0 w-1 bg-primary" /> : null}
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-theme ${
                m.id === activeMaterialId ? 'bg-primary text-primary-foreground' : 'bg-muted text-accent'
              }`}
            >
              <Layers3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="num-md truncate text-card-foreground">{m.code}</p>
                {m.id === activeMaterialId ? <span className="text-[11px] font-semibold text-primary">SEÇİLİ</span> : null}
                {m.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-card-foreground">
                {m.name} {m.subtitle ? <span className="font-normal text-muted-foreground">· {m.subtitle}</span> : null}
              </p>
              <p className="mt-1 truncate text-[11px] text-accent">
                {(m.standards || []).slice(0, 4).join(' · ')}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {hardnessText(m)}
                {rec ? ` · Vc ${formatRange('vc', rec.vc, unitSystem)} ${unitLabel('vc', unitSystem)}` : ''}
              </p>
              <div className="mt-2">
                <StatusChip tone={machinabilityTone(m.machinability)}>{machinabilityLabel(m.machinability)}</StatusChip>
              </div>
            </div>
            <ChevronRight className="mt-1 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          </div>
        </button>
        <button
          type="button"
          aria-label={isFav ? 'Favoriden çıkar' : 'Favoriye ekle'}
          onClick={() => toggleFavorite(m.id)}
          data-testid={`fav-${m.id}`}
          className="flex w-12 shrink-0 items-center justify-center border-l border-border transition-colors active:bg-muted/60"
        >
          <Star className={`h-5 w-5 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>
    );
  };

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="TEKNİK KÜTÜPHANE"
        title="Malzemeler"
        size="xl"
        right={<IconButton icon={LibraryBig} label="Kütüphane" tone="accent" />}
      >
        <div className="mt-4 flex overflow-hidden rounded-theme border border-border bg-input">
          <div className="flex h-12 flex-1 items-center gap-2 px-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Malzeme ara"
              data-testid="material-search"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchMode((s) => (s === 'all' ? 'code' : 'all'))}
            data-testid="search-mode-toggle"
            className="border-l border-border px-3 text-xs font-semibold text-primary"
          >
            {searchMode === 'all' ? 'Kod / Ad' : 'Sadece Kod'}
          </button>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', short: 'Malzeme türü' }, ...GROUPS].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              data-testid={`filter-group-${g.id}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                group === g.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground'
              }`}
            >
              <Layers3 className="h-4 w-4" />
              {g.short}
            </button>
          ))}
        </div>

        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', label: 'ISO grubu' }, ...ISO_GROUPS.map((g) => ({ id: g.id, label: g.label }))].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setIso(g.id)}
              data-testid={`filter-iso-${g.id}`}
              className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                iso === g.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {HARDNESS_FILTERS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setHardness(h.id)}
              data-testid={`filter-hardness-${h.id}`}
              className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                hardness === h.id ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-card text-card-foreground'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', label: 'İşlenebilirlik' }, ...MACHINABILITY].map((mc) => (
            <button
              key={mc.id}
              type="button"
              onClick={() => setMach(mc.id)}
              data-testid={`filter-mach-${mc.id}`}
              className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                mach === mc.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground'
              }`}
            >
              {mc.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-theme border border-primary/50 bg-primary/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sertlik skalası</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                HRC çeliklerde yaklaşık 20–68 HRC aralığında kullanılır. 68 HRC üzeri değerler için HRC yerine HV
                (Vickers) veya uygun Rockwell skalası kullanılmalıdır; 90 HRC geçerli bir Rockwell C değeri değildir.
              </p>
            </div>
          </div>
        </div>
      </ScreenHeader>

      <main className="px-5 pt-5">
        <button
          type="button"
          onClick={() => navigate('/malzeme/yeni')}
          data-testid="add-material-button"
          className="flex w-full items-center gap-3 rounded-theme border border-primary bg-primary px-4 py-3.5 text-left text-primary-foreground shadow-sm transition-colors active:brightness-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary-foreground/10">
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Kendi malzememi ekle</span>
            <span className="mt-0.5 block text-xs text-primary-foreground/80">
              Kendi Vc / ilerleme aralıklarınızı kaydedin
            </span>
          </span>
          <ChevronRight className="h-[18px] w-[18px]" />
        </button>

        {filtersActive ? (
          <section className="mt-6" aria-label="Arama sonuçları">
            <SectionHeading
              eyebrow={`SONUÇLAR · ${filtered.length} MALZEME`}
              title="Filtreli liste"
              right={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setGroup('all');
                    setHardness('all');
                    setMach('all');
                    setIso('all');
                  }}
                  data-testid="clear-filters"
                  className="text-xs font-semibold text-primary"
                >
                  Filtreleri temizle
                </button>
              }
            />
            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Sonuç bulunamadı"
                body="Arama veya filtreleri değiştirip yeniden deneyin."
                testId="materials-empty"
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border" data-testid="filtered-list">
                  {filtered.slice(0, limit).map(renderMaterialRow)}
                </div>
                {filtered.length > limit ? (
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 40)}
                    data-testid="load-more"
                    className="mx-auto mt-3 block rounded-theme border border-border bg-card px-4 py-2.5 text-xs font-semibold text-primary"
                  >
                    {filtered.length - limit} malzeme daha göster
                  </button>
                ) : null}
              </>
            )}
          </section>
        ) : (
          <>
            <section className="mt-6" aria-labelledby="sik-kullanilan">
              <SectionHeading
                eyebrow="HIZLI SEÇİM"
                title="Sık kullanılanlar"
                right={<span className="text-xs text-muted-foreground">{favMaterials.length} malzeme</span>}
              />
              {favMaterials.length === 0 ? (
                <div className="rounded-theme border border-border bg-card px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-card-foreground">Favori yok</p>
                  <p className="mt-1 text-xs text-muted-foreground">Yıldız ikonuna dokunarak favori ekleyin.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border" data-testid="favorites-list">
                  {favMaterials.map(renderMaterialRow)}
                </div>
              )}
            </section>

            {customMats.length ? (
              <section className="mt-6" aria-label="Özel malzemeler">
                <SectionHeading eyebrow="BENİM MALZEMELERİM" title="Özel kayıtlar" />
                <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border" data-testid="custom-list">
                  {customMats.map(renderMaterialRow)}
                </div>
              </section>
            ) : null}

            <section className="mt-6" aria-labelledby="kutuphane">
              <SectionHeading
                eyebrow="TÜM MALZEMELER"
                title="Kütüphane"
                right={<span className="text-xs text-muted-foreground">{materials.length} kalite</span>}
              />
              <ListCard testId="group-list">
                {GROUPS.map((g) => {
                  const items = materials.filter((m) => m.group === g.id);
                  const Icon = GROUP_ICONS[g.icon] || Layers3;
                  const isOpen = openGroup === g.id;
                  return (
                    <div key={g.id}>
                      <Row
                        icon={Icon}
                        iconTone={isOpen ? 'secondary' : 'muted'}
                        title={g.label}
                        subtitle={items.map((m) => m.code).join(', ')}
                        onClick={() => setOpenGroup(isOpen ? null : g.id)}
                        testId={`group-${g.id}`}
                        right={
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">{items.length}</span>
                            {isOpen ? (
                              <ChevronDown className="h-[18px] w-[18px] text-primary" />
                            ) : (
                              <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
                            )}
                          </span>
                        }
                      />
                      {isOpen ? (
                        <div className="border-t border-border bg-background/40 divide-y divide-border" data-testid={`group-items-${g.id}`}>
                          {items.map(renderMaterialRow)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </ListCard>
            </section>
          </>
        )}

        <div className="mt-6 rounded-theme border border-border bg-muted px-4 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Değerler başlangıç aralığıdır. Takım çıkıntısı, soğutma, bağlama ve tezgâh rijitliğine göre ayarlayın.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveMaterialId(activeMaterialId);
            navigate('/');
          }}
          className="mx-auto mt-4 block text-xs font-semibold text-muted-foreground"
        >
          Hesaplamaya dön
        </button>
      </main>

      <BottomTabBar active="malzemeler" />
    </ScreenShell>
  );
}
