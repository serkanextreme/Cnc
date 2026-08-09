import React, { useMemo, useState } from 'react';
import { Layers3, Search, Star, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { useApp } from '../../context/AppContext';
import { GROUPS, groupShort, machinabilityLabel, machinabilityTone, recommended } from '../../data/materials';
import { formatRange } from '../../lib/units';
import { Eyebrow, Row, StatusChip } from './Primitives';

/** Aktif malzeme özet kartı — mockup'taki "Malzeme / Değiştir" satırı */
export function MaterialSummaryCard({ material, onChange, testId = 'active-material-card' }) {
  if (!material) return null;
  return (
    <section
      className="rounded-theme border border-border bg-card"
      aria-label="Aktif malzeme"
      data-testid={testId}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
          <Layers3 className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow className="text-[11px] tracking-[0.12em]">Malzeme</Eyebrow>
          <p className="truncate text-sm font-semibold text-card-foreground" data-testid="active-material-name">
            {material.code} {material.name}{' '}
            <span className="font-normal text-muted-foreground">
              · {material.hardness[0] === material.hardness[1]
                ? `${material.hardness[0]} ${material.hardnessScale}`
                : `${material.hardness[0]}–${material.hardness[1]} ${material.hardnessScale}`}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onChange}
          data-testid="change-material-button"
          className="shrink-0 rounded-theme border border-border px-3 py-2 text-xs font-semibold text-primary transition-colors active:bg-muted/60"
        >
          Değiştir
        </button>
      </div>
    </section>
  );
}

/** Alt taraftan açılan malzeme seçici (arama + favoriler + tüm liste) */
export function MaterialPickerDrawer({ open, onOpenChange, op = 'freze', tool = 'karbur', onSelect }) {
  const { materials, favorites, activeMaterialId } = useApp();
  const { unitSystem } = useApp();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    return materials.filter((m) => {
      if (group !== 'all' && m.group !== group) return false;
      if (!needle) return true;
      return (
        m.code.toLocaleLowerCase('tr').includes(needle) ||
        m.name.toLocaleLowerCase('tr').includes(needle) ||
        (m.subtitle || '').toLocaleLowerCase('tr').includes(needle)
      );
    });
  }, [materials, query, group]);

  const favList = filtered.filter((m) => favorites.includes(m.id));
  const restList = filtered.filter((m) => !favorites.includes(m.id));

  const renderRow = (m) => {
    const rec = recommended(m, op, tool);
    return (
      <Row
        key={m.id}
        icon={Layers3}
        iconTone={m.id === activeMaterialId ? 'primary' : 'muted'}
        title={`${m.code} · ${m.name}`}
        subtitle={rec ? `Vc ${formatRange('vc', rec.vc, unitSystem)} ${unitSystem === 'imperial' ? 'SFM' : 'm/dk'}` : m.subtitle}
        onClick={() => {
          onSelect(m);
          onOpenChange(false);
        }}
        testId={`picker-material-${m.id}`}
        right={
          <div className="flex shrink-0 items-center gap-2">
            {m.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
            {favorites.includes(m.id) ? <Star className="h-4 w-4 fill-primary text-primary" /> : null}
            <StatusChip tone={machinabilityTone(m.machinability)}>{machinabilityLabel(m.machinability)}</StatusChip>
          </div>
        }
      />
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border bg-card" data-testid="material-picker-drawer">
        <DrawerHeader className="border-b border-border px-5 pb-3 pt-1 text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Eyebrow>MALZEME SEÇ</Eyebrow>
              <DrawerTitle className="title-md text-foreground">Kütüphane</DrawerTitle>
            </div>
            <button
              type="button"
              aria-label="Kapat"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-theme border border-border bg-background text-muted-foreground"
              data-testid="picker-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex h-11 items-center rounded-theme border border-border bg-input px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kod veya ad ara"
              data-testid="picker-search"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {[{ id: 'all', short: 'Tümü' }, ...GROUPS].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                data-testid={`picker-group-${g.id}`}
                className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                  group === g.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-card-foreground'
                }`}
              >
                {g.short || groupShort(g.id)}
              </button>
            ))}
          </div>
        </DrawerHeader>
        <div className="max-h-[58vh] overflow-y-auto px-5 pb-6 pt-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="picker-empty">
              Sonuç bulunamadı
            </p>
          ) : (
            <div className="space-y-4">
              {favList.length ? (
                <div>
                  <Eyebrow className="mb-2">SIK KULLANILANLAR</Eyebrow>
                  <div className="overflow-hidden rounded-theme border border-border bg-background/40 divide-y divide-border">
                    {favList.map(renderRow)}
                  </div>
                </div>
              ) : null}
              {restList.length ? (
                <div>
                  <Eyebrow className="mb-2">TÜM MALZEMELER · {restList.length}</Eyebrow>
                  <div className="overflow-hidden rounded-theme border border-border bg-background/40 divide-y divide-border">
                    {restList.map(renderRow)}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
