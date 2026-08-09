import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calculator,
  CircleDotDashed,
  Drill,
  Info,
  Layers3,
  Pencil,
  RotateCw,
  Star,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import { midOf, groupLabel, machinabilityLabel, machinabilityTone, recommended, TOOL_MATERIALS } from '../data/materials';
import {
  BottomActionBar,
  Eyebrow,
  EmptyState,
  GhostButton,
  IconButton,
  PrimaryButton,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  SegmentedToggle,
  StatusChip,
} from '../components/talas/Primitives';
import { formatRange, unitLabel } from '../lib/units';

const OP_TABS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed, feedKey: 'fz', feedLabel: 'Diş başına ilerleme', feedSym: 'fz' },
  { id: 'torna', label: 'Torna', icon: RotateCw, feedKey: 'f', feedLabel: 'İlerleme', feedSym: 'f' },
  { id: 'matkap', label: 'Matkap', icon: Drill, feedKey: 'f', feedLabel: 'İlerleme', feedSym: 'f' },
];

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    materialById, favorites, toggleFavorite, setActiveMaterialId, updateDraft, unitSystem,
  } = useApp();
  const [op, setOp] = useState('freze');
  const [tool, setTool] = useState('karbur');

  const material = materialById(id);

  const rec = useMemo(() => (material ? recommended(material, op, tool) : null), [material, op, tool]);
  const tab = OP_TABS.find((t) => t.id === op);

  if (!material) {
    return (
      <ScreenShell>
        <ScreenHeader eyebrow="MALZEME DETAYI" title="Bulunamadı" onBack={() => navigate('/malzemeler')} />
        <main className="px-5 pt-6">
          <EmptyState
            icon={Layers3}
            title="Malzeme bulunamadı"
            body="Bu malzeme silinmiş olabilir."
            action={<PrimaryButton onClick={() => navigate('/malzemeler')}>Kütüphaneye dön</PrimaryButton>}
          />
        </main>
      </ScreenShell>
    );
  }

  const isFav = favorites.includes(material.id);
  const hardnessText =
    material.hardness[0] === material.hardness[1]
      ? `${material.hardness[0]}`
      : `${material.hardness[0]}–${material.hardness[1]}`;

  const useInCalculation = () => {
    setActiveMaterialId(material.id);
    if (rec) {
      if (op === 'freze') {
        updateDraft('freze', { tool, vc: Math.round(midOf(rec.vc)), fz: Number(midOf(rec.fz).toFixed(3)) });
      } else if (op === 'torna') {
        updateDraft('torna', { tool, vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)) });
      } else {
        updateDraft('matkap', { tool, vc: Math.round(midOf(rec.vc)), f: Number(midOf(rec.f).toFixed(2)), coolant: material.coolant });
      }
    }
    toast.success(`${material.code} hesaplamada kullanılıyor`, { description: 'Önerilen değerler yüklendi' });
    navigate(`/${op}`);
  };

  const otherOps = OP_TABS.filter((t) => t.id !== op);

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="MALZEME DETAYI"
        title={`${material.code} ${material.name}`}
        onBack={() => navigate('/malzemeler')}
        right={
          material.custom ? (
            <IconButton
              icon={Pencil}
              label="Düzenle"
              tone="primary"
              testId="edit-material"
              onClick={() => navigate(`/malzeme/${material.id}/duzenle`)}
            />
          ) : (
            <IconButton icon={Layers3} label="Malzeme" tone="accent" />
          )
        }
      />

      <main className="space-y-5 px-5 pt-5">
        <section className="overflow-hidden rounded-theme border border-border bg-card" aria-label="Malzeme özellikleri">
          <div className="border-l-4 border-primary px-4 py-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{material.code}</p>
              {material.custom ? <StatusChip tone="accent">ÖZEL</StatusChip> : null}
            </div>
            <h2 className="title-lg mt-1 text-card-foreground">{material.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{material.desc || material.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 border-t border-border">
            <div className="border-r border-border px-4 py-3">
              <Eyebrow>Sertlik</Eyebrow>
              <p className="num-md mt-1 text-card-foreground" data-testid="detail-hardness">
                {hardnessText} <span className="text-base">{material.hardnessScale}</span>
              </p>
            </div>
            <div className="px-4 py-3">
              <Eyebrow>Çekme dayanımı</Eyebrow>
              <p className="num-md mt-1 text-card-foreground">
                {material.tensile[0]}–{material.tensile[1]} <span className="text-base">MPa</span>
              </p>
            </div>
            <div className="col-span-2 grid grid-cols-2 border-t border-border">
              <div className="border-r border-border px-4 py-3">
                <Eyebrow>Grup</Eyebrow>
                <p className="mt-1 text-sm font-semibold text-card-foreground">{groupLabel(material.group)}</p>
              </div>
              <div className="px-4 py-3">
                <Eyebrow>Özgül kesme kuvveti</Eyebrow>
                <p className="mt-1 text-sm font-semibold text-card-foreground">{material.kc} N/mm²</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Malzeme tanımları">
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={machinabilityTone(material.machinability)}>
              {machinabilityLabel(material.machinability)} işlenebilirlik
            </StatusChip>
            {(material.tags || []).map((t) => (
              <span
                key={t}
                className="rounded-theme border border-border bg-muted px-3 py-2 text-xs font-semibold text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="onerilen-parametreler">
          <SectionHeading
            eyebrow="KESİCİ VERİLERİ"
            title="Önerilen parametreler"
            right={<span className="text-xs text-muted-foreground">{tool === 'hss' ? 'HSS takım' : 'Karbür takım'}</span>}
          />

          <div className="grid grid-cols-3 border-b border-border" role="tablist" aria-label="İşlem türü">
            {OP_TABS.map((t) => {
              const active = t.id === op;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOp(t.id)}
                  data-testid={`detail-tab-${t.id}`}
                  className={`relative flex h-11 items-center justify-center gap-1.5 text-sm transition-colors ${
                    active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {active ? <span className="absolute bottom-0 h-0.5 w-full bg-primary" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <SegmentedToggle
              options={TOOL_MATERIALS}
              value={tool}
              onChange={setTool}
              ariaLabel="Takım malzemesi"
              testId="detail-tool-toggle"
            />
          </div>

          <div role="tabpanel" className="mt-4 overflow-hidden rounded-theme border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                <tab.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-heading text-xl font-bold uppercase tracking-tight text-card-foreground">{tab.label}</p>
                <p className="text-xs text-muted-foreground">
                  {tool === 'hss' ? 'HSS' : 'Karbür'} takımlar için başlangıç aralığı
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <Eyebrow>Kesme hızı</Eyebrow>
                  <p className="mt-1 text-sm text-muted-foreground">Vc</p>
                </div>
                <p className="num-lg text-primary" data-testid="detail-vc">
                  {rec ? formatRange('vc', rec.vc, unitSystem) : '—'}{' '}
                  <span className="text-lg">{unitLabel('vc', unitSystem)}</span>
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <Eyebrow>{tab.feedLabel}</Eyebrow>
                  <p className="mt-1 text-sm text-muted-foreground">{tab.feedSym}</p>
                </div>
                <p className="num-lg text-card-foreground" data-testid="detail-feed">
                  {rec ? formatRange(tab.feedKey, rec[tab.feedKey], unitSystem) : '—'}{' '}
                  <span className="text-lg">{unitLabel(tab.feedKey, unitSystem)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card" aria-label="Diğer işlem aralıkları">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-muted text-accent">
                <Info className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-card-foreground">Diğer işlem başlangıç aralıkları</p>
            </div>
            {otherOps.map((t) => {
              const r = recommended(material, t.id, tool);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOp(t.id)}
                  data-testid={`other-op-${t.id}`}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 active:bg-muted/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-accent">
                    <t.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-card-foreground">
                      {t.label} <span className="font-normal text-muted-foreground">· {tool === 'hss' ? 'HSS' : 'Karbür'}</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Kesme hızı{' '}
                      <span className="font-semibold text-secondary-foreground">
                        {r ? formatRange('vc', r.vc, unitSystem) : '—'} {unitLabel('vc', unitSystem)}
                      </span>{' '}
                      · İlerleme{' '}
                      <span className="font-semibold text-secondary-foreground">
                        {r ? formatRange(t.feedKey, r[t.feedKey], unitSystem) : '—'} {unitLabel(t.feedKey, unitSystem)}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-theme border border-border bg-muted px-4 py-3" aria-label="Parametre notu">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              Değerler başlangıç aralığıdır. Takım çıkıntısı, soğutma, bağlama ve tezgâh rijitliğine göre ayarlayın.
            </p>
          </div>
        </section>
      </main>

      <BottomActionBar>
        <GhostButton
          icon={Star}
          onClick={() => {
            toggleFavorite(material.id);
            toast.success(isFav ? 'Favoriden çıkarıldı' : 'Favorilere eklendi');
          }}
          testId="detail-favorite"
          className="w-12 shrink-0 px-0"
        >
          <span className="sr-only">Favori</span>
        </GhostButton>
        <PrimaryButton icon={Calculator} onClick={useInCalculation} testId="use-in-calculation">
          Hesaplamada Kullan
        </PrimaryButton>
      </BottomActionBar>
    </ScreenShell>
  );
}
