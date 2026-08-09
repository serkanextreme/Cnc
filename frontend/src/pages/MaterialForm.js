import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleDotDashed, Drill, Info, RotateCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import {
  COOLANT_OPTIONS,
  emptyCustomMaterial,
  GROUPS,
  MACHINABILITY,
  TOOL_MATERIALS,
} from '../data/materials';
import {
  BottomActionBar,
  Eyebrow,
  GhostButton,
  NumericField,
  PrimaryButton,
  ScreenHeader,
  ScreenShell,
  SectionHeading,
  SegmentedToggle,
  StatusChip,
} from '../components/talas/Primitives';
import { unitLabel } from '../lib/units';

const OP_TABS = [
  { id: 'freze', label: 'Freze', icon: CircleDotDashed, feedKey: 'fz', feedLabel: 'Diş başına ilerleme (fz)' },
  { id: 'torna', label: 'Torna', icon: RotateCw, feedKey: 'f', feedLabel: 'İlerleme (f)' },
  { id: 'matkap', label: 'Matkap', icon: Drill, feedKey: 'f', feedLabel: 'İlerleme (f)' },
];

export default function MaterialForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { materialById, saveCustomMaterial, deleteCustomMaterial, unitSystem } = useApp();

  const existing = id ? materialById(id) : null;
  const [form, setForm] = useState(() =>
    existing ? JSON.parse(JSON.stringify(existing)) : emptyCustomMaterial(),
  );
  const [op, setOp] = useState('freze');
  const [tool, setTool] = useState('karbur');
  const [touched, setTouched] = useState(false);

  const tab = OP_TABS.find((t) => t.id === op);
  const feedKey = tab.feedKey;

  const errors = useMemo(() => {
    const e = {};
    if (!form.code.trim()) e.code = 'Malzeme kodu gerekli';
    if (!form.name.trim()) e.name = 'Malzeme adı gerekli';
    if (!(form.kc > 0)) e.kc = 'Özgül kesme kuvveti sıfırdan büyük olmalı';
    if (form.hardness[0] > form.hardness[1]) e.hardness = 'Sertlik alt sınırı üst sınırdan büyük olamaz';
    if (form.tensile[0] > form.tensile[1]) e.tensile = 'Çekme dayanımı aralığı hatalı';
    ['freze', 'torna', 'matkap'].forEach((o) => {
      ['karbur', 'hss'].forEach((t) => {
        const k = o === 'freze' ? 'fz' : 'f';
        const entry = form.ops[o][t];
        if (!(entry.vc[0] > 0) || entry.vc[0] > entry.vc[1]) e[`${o}-${t}-vc`] = 'Vc aralığı hatalı';
        if (!(entry[k][0] > 0) || entry[k][0] > entry[k][1]) e[`${o}-${t}-${k}`] = 'İlerleme aralığı hatalı';
      });
    });
    return e;
  }, [form]);

  const setField = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setOpsValue = (o, t, key, index, value) => {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.ops[o][t][key][index] = value;
      return next;
    });
  };
  const setPair = (field, index, value) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleSave = () => {
    setTouched(true);
    const errorList = Object.values(errors);
    if (errorList.length) {
      toast.error('Eksik veya hatalı alan var', { description: errorList[0] });
      return;
    }
    const saved = saveCustomMaterial({
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      tags: form.tags && form.tags.length ? form.tags : ['Özel malzeme'],
      desc: form.desc || 'Kullanıcı tanımlı malzeme',
    });
    toast.success(existing ? 'Malzeme güncellendi' : 'Malzeme eklendi', { description: saved.code });
    navigate(`/malzemeler/${saved.id}`);
  };

  const handleDelete = () => {
    if (!existing) return;
    deleteCustomMaterial(existing.id);
    toast.success('Malzeme silindi');
    navigate('/malzemeler');
  };

  const err = (key) => (touched ? errors[key] : undefined);

  return (
    <ScreenShell>
      <ScreenHeader
        eyebrow={existing ? 'ÖZEL MALZEME' : 'YENİ KAYIT'}
        title={existing ? 'Malzemeyi Düzenle' : 'Malzeme Ekle'}
        onBack={() => navigate(-1)}
        right={<StatusChip tone="accent">ÖZEL</StatusChip>}
      />

      <main className="space-y-6 px-5 pt-4">
        <section aria-label="Kimlik">
          <SectionHeading eyebrow="KİMLİK" title="Malzeme bilgisi" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <label className="text-sm font-semibold text-card-foreground" htmlFor="form-code">
                Malzeme kodu
              </label>
              <input
                id="form-code"
                value={form.code}
                onChange={(e) => setField({ code: e.target.value })}
                placeholder="örn. 42CrMo4"
                data-testid="form-code"
                className={`mt-2 h-12 w-full rounded-theme border bg-input px-3 font-heading text-2xl font-bold tracking-tight text-foreground outline-none ${
                  err('code') ? 'border-destructive' : 'border-border'
                }`}
              />
              {err('code') ? <p className="mt-1.5 text-[11px] font-medium text-destructive">{err('code')}</p> : null}
            </div>
            <div className="px-4 py-3">
              <label className="text-sm font-semibold text-card-foreground" htmlFor="form-name">
                Malzeme adı
              </label>
              <input
                id="form-name"
                value={form.name}
                onChange={(e) => setField({ name: e.target.value })}
                placeholder="örn. Islah Çeliği"
                data-testid="form-name"
                className={`mt-2 h-12 w-full rounded-theme border bg-input px-3 text-base text-foreground outline-none ${
                  err('name') ? 'border-destructive' : 'border-border'
                }`}
              />
              {err('name') ? <p className="mt-1.5 text-[11px] font-medium text-destructive">{err('name')}</p> : null}
            </div>
            <div className="px-4 py-3">
              <label className="text-sm font-semibold text-card-foreground" htmlFor="form-subtitle">
                Alt bilgi / standart
              </label>
              <input
                id="form-subtitle"
                value={form.subtitle}
                onChange={(e) => setField({ subtitle: e.target.value })}
                placeholder="örn. 1.7225 · AISI 4140"
                data-testid="form-subtitle"
                className="mt-2 h-12 w-full rounded-theme border border-border bg-input px-3 text-base text-foreground outline-none"
              />
            </div>
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Malzeme grubu</Eyebrow>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setField({ group: g.id })}
                    data-testid={`form-group-${g.id}`}
                    className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                      form.group === g.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-input text-card-foreground'
                    }`}
                  >
                    {g.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">İşlenebilirlik</Eyebrow>
              <SegmentedToggle
                options={MACHINABILITY}
                value={form.machinability}
                onChange={(v) => setField({ machinability: v })}
                ariaLabel="İşlenebilirlik"
                testId="form-mach"
              />
            </div>
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Soğutma</Eyebrow>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {COOLANT_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setField({ coolant: c.id })}
                    data-testid={`form-coolant-${c.id}`}
                    className={`shrink-0 rounded-theme border px-3 py-2 text-xs font-semibold transition-colors ${
                      form.coolant === c.id
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-input text-card-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Mekanik özellikler">
          <SectionHeading eyebrow="MEKANİK" title="Özellikler" />
          <div className="overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="px-4 py-3">
              <Eyebrow className="mb-2">Sertlik skalası</Eyebrow>
              <SegmentedToggle
                options={[
                  { id: 'HB', label: 'HB' },
                  { id: 'HRC', label: 'HRC' },
                ]}
                value={form.hardnessScale}
                onChange={(v) => setField({ hardnessScale: v })}
                ariaLabel="Sertlik skalası"
                testId="form-hardness-scale"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="form-hardness-min"
                label="Sertlik min"
                kind="deg"
                unitOverride={form.hardnessScale}
                value={form.hardness[0]}
                onChange={(v) => setPair('hardness', 0, v)}
                status={err('hardness') ? 'error' : 'neutral'}
                testId="form-hardness-min"
              />
              <NumericField
                id="form-hardness-max"
                label="Sertlik max"
                kind="deg"
                unitOverride={form.hardnessScale}
                value={form.hardness[1]}
                onChange={(v) => setPair('hardness', 1, v)}
                status={err('hardness') ? 'error' : 'neutral'}
                testId="form-hardness-max"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id="form-tensile-min"
                label="Çekme min"
                kind="deg"
                unitOverride="MPa"
                value={form.tensile[0]}
                onChange={(v) => setPair('tensile', 0, v)}
                status={err('tensile') ? 'error' : 'neutral'}
                testId="form-tensile-min"
              />
              <NumericField
                id="form-tensile-max"
                label="Çekme max"
                kind="deg"
                unitOverride="MPa"
                value={form.tensile[1]}
                onChange={(v) => setPair('tensile', 1, v)}
                status={err('tensile') ? 'error' : 'neutral'}
                testId="form-tensile-max"
              />
            </div>
            <NumericField
              id="form-kc"
              label="Özgül kesme kuvveti (kc)"
              hint="Güç ve tork hesabında kullanılır"
              kind="deg"
              unitOverride="N/mm²"
              value={form.kc}
              onChange={(v) => setField({ kc: v })}
              status={err('kc') ? 'error' : 'neutral'}
              error={err('kc')}
              testId="form-kc"
            />
          </div>
        </section>

        <section aria-label="Önerilen aralıklar">
          <SectionHeading eyebrow="ÖNERİLEN ARALIKLAR" title="Kesme verileri" />
          <div className="grid grid-cols-3 border-b border-border" role="tablist">
            {OP_TABS.map((t) => {
              const active = t.id === op;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOp(t.id)}
                  data-testid={`form-tab-${t.id}`}
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
              testId="form-tool-toggle"
            />
          </div>
          <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card divide-y divide-border">
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id={`form-${op}-${tool}-vc-min`}
                label="Vc min"
                kind="vc"
                value={form.ops[op][tool].vc[0]}
                onChange={(v) => setOpsValue(op, tool, 'vc', 0, v)}
                status={err(`${op}-${tool}-vc`) ? 'error' : 'neutral'}
                testId={`form-vc-min`}
              />
              <NumericField
                id={`form-${op}-${tool}-vc-max`}
                label="Vc max"
                kind="vc"
                value={form.ops[op][tool].vc[1]}
                onChange={(v) => setOpsValue(op, tool, 'vc', 1, v)}
                status={err(`${op}-${tool}-vc`) ? 'error' : 'neutral'}
                testId={`form-vc-max`}
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <NumericField
                id={`form-${op}-${tool}-feed-min`}
                label={`${feedKey} min`}
                kind={feedKey}
                value={form.ops[op][tool][feedKey][0]}
                onChange={(v) => setOpsValue(op, tool, feedKey, 0, v)}
                status={err(`${op}-${tool}-${feedKey}`) ? 'error' : 'neutral'}
                testId={`form-feed-min`}
              />
              <NumericField
                id={`form-${op}-${tool}-feed-max`}
                label={`${feedKey} max`}
                kind={feedKey}
                value={form.ops[op][tool][feedKey][1]}
                onChange={(v) => setOpsValue(op, tool, feedKey, 1, v)}
                status={err(`${op}-${tool}-${feedKey}`) ? 'error' : 'neutral'}
                testId={`form-feed-max`}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {tab.feedLabel} · {unitLabel(feedKey, unitSystem)} — {tool === 'hss' ? 'HSS' : 'Karbür'} takımlar için
          </p>
        </section>

        <div className="rounded-theme border border-border bg-muted px-4 py-3">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              Girdiğiniz değerler yalnızca bu cihazda saklanır ve hesaplamalarda öneri olarak kullanılır.
            </p>
          </div>
        </div>

        {existing ? (
          <GhostButton icon={Trash2} tone="destructive" onClick={handleDelete} testId="delete-material" className="w-full">
            Malzemeyi Sil
          </GhostButton>
        ) : null}
      </main>

      <BottomActionBar>
        <GhostButton onClick={() => navigate(-1)} testId="cancel-button" className="flex-1">
          İptal
        </GhostButton>
        <PrimaryButton icon={Save} onClick={handleSave} testId="save-material">
          Kaydet
        </PrimaryButton>
      </BottomActionBar>
    </ScreenShell>
  );
}
