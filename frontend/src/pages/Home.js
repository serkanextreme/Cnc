import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  CircleDotDashed,
  Drill,
  Ruler,
  RotateCw,
  Settings2,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MaterialPickerDrawer, MaterialSummaryCard } from '../components/talas/MaterialPicker';
import {
  BottomTabBar,
  Eyebrow,
  IconButton,
  ListCard,
  Row,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  StatusChip,
} from '../components/talas/Primitives';
import { describeRecord } from '../lib/records';
import { formatNumber, formatQty, unitLabel } from '../lib/units';

const OP_ICONS = { freze: CircleDotDashed, torna: RotateCw, matkap: Drill };

export default function Home() {
  const navigate = useNavigate();
  const { activeMaterial, setActiveMaterialId, history, unitSystem, settings } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);

  const recent = useMemo(() => history.slice(0, 3), [history]);

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow="CNC PARAMETRELERİ"
        title="İşlem ve malzeme"
        size="xl"
        right={
          <IconButton
            icon={Settings2}
            label="Ayarlar"
            tone="primary"
            testId="header-settings"
            onClick={() => navigate('/ayarlar')}
          />
        }
      >
        <div className="mt-3 flex items-center gap-2">
          <StatusChip tone="accent" icon={WifiOff} testId="offline-chip">
            İnternetsiz çalışır
          </StatusChip>
          <StatusChip tone="neutral" icon={Ruler}>
            {settings.unitSystem === 'imperial' ? 'İnç · SFM' : 'Metrik · mm'}
          </StatusChip>
        </div>
      </ScreenHeader>

      <main className="px-5 pt-4">
        <MaterialSummaryCard material={activeMaterial} onChange={() => setPickerOpen(true)} />

        <section className="mt-5" aria-labelledby="islem-baslik">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <Eyebrow>HESAPLAMA</Eyebrow>
              <h2 id="islem-baslik" className="title-md text-foreground">
                İşlem türü
              </h2>
            </div>
            <p className="shrink-0 pb-1 text-right text-[10px] leading-4 text-muted-foreground">
              Operatör · Mühendis
              <br />
              Programcı
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/freze')}
              data-testid="op-freze"
              className="col-span-2 rounded-theme border border-primary bg-primary p-4 text-left text-primary-foreground shadow-sm transition-colors active:brightness-95"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-theme bg-primary-foreground/10">
                  <CircleDotDashed className="h-6 w-6" />
                </span>
                <ChevronRight className="mt-1 h-5 w-5" />
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <h3 className="title-lg">Freze</h3>
                  <p className="mt-1 text-sm font-medium text-primary-foreground/80">Kanal, cep ve yüzey frezeleme</p>
                </div>
                <div className="mb-0.5 text-right text-[11px] font-semibold uppercase leading-5 tracking-[0.08em]">
                  <p>Kesme hızı</p>
                  <p>Devir · İlerleme</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/torna')}
              data-testid="op-torna"
              className="rounded-theme border border-border bg-card p-4 text-left text-card-foreground transition-colors active:bg-muted/60"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-accent">
                  <RotateCw className="h-5 w-5" />
                </span>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <h3 className="title-md mt-6">Torna</h3>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                Kesme hızı
                <br />
                Devir · İlerleme
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/matkap')}
              data-testid="op-matkap"
              className="rounded-theme border border-border bg-card p-4 text-left text-card-foreground transition-colors active:bg-muted/60"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-accent">
                  <Drill className="h-5 w-5" />
                </span>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <h3 className="title-md mt-6">Matkap</h3>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                Kesme hızı
                <br />
                Devir · İlerleme
              </p>
            </button>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="son-kullanilan">
          <SectionHeading
            eyebrow="HIZLI ERİŞİM"
            title="Son kullanılan"
            right={
              <button
                type="button"
                onClick={() => navigate('/gecmis')}
                data-testid="see-all-history"
                className="text-xs font-semibold text-primary"
              >
                Tümünü gör
              </button>
            }
          />

          {recent.length === 0 ? (
            <div className="rounded-theme border border-border bg-card px-4 py-6 text-center" data-testid="recent-empty">
              <p className="text-sm font-semibold text-card-foreground">Henüz hesap kaydı yok</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bir işlem seçip hesaplayın, sonucu kaydettiğinizde burada görünecek.
              </p>
            </div>
          ) : (
            <ListCard>
              {recent.map((rec) => {
                const d = describeRecord(rec, unitSystem);
                const Icon = OP_ICONS[rec.op] || CircleDotDashed;
                return (
                  <Row
                    key={rec.id}
                    icon={Icon}
                    iconTone="muted"
                    title={
                      <>
                        {d.title} <span className="font-normal text-muted-foreground">· {d.material}</span>
                      </>
                    }
                    subtitle={`${formatNumber(rec.outputs.n, 0)} ${unitLabel('rpm', unitSystem)} · ${formatQty('vf', rec.outputs.vf, unitSystem)} ${unitLabel('vf', unitSystem)}`}
                    onClick={() => navigate(`/${rec.op}?record=${rec.id}`)}
                    chevron
                    testId={`recent-${rec.id}`}
                  />
                );
              })}
            </ListCard>
          )}
        </section>
      </main>

      <MaterialPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        op="freze"
        tool="karbur"
        onSelect={(m) => setActiveMaterialId(m.id)}
      />
      <BottomTabBar active="hesapla" />
    </ScreenShell>
  );
}
