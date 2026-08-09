import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  History as HistoryIcon,
  Layers3,
  Minus,
  Plus,
  Settings2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { parseNumber, toInputText, toMetric, unitLabel } from '../../lib/units';

/* ------------------------------------------------------------------ shell */
export function ScreenShell({ children, bottomPad = 'pb-28', testId = 'screen-shell' }) {
  return (
    <div className="min-h-[100dvh] w-full bg-background font-body text-foreground" data-testid={testId}>
      <div className={`mx-auto w-full max-w-[430px] ${bottomPad}`}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children, className = '' }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function IconButton({ icon: Icon, onClick, label, tone = 'default', testId, className = '' }) {
  const tones = {
    default: 'border-border bg-card text-card-foreground',
    primary: 'border-primary/50 bg-primary/10 text-primary',
    accent: 'border-border bg-card text-accent',
    muted: 'border-border bg-card text-muted-foreground',
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      data-testid={testId}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border transition-colors active:brightness-110 ${tones[tone]} ${className}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}

/** Büyük başlık — mockup'taki header düzeni (eyebrow + condensed title) */
export function ScreenHeader({
  eyebrow,
  title,
  onBack,
  right,
  children,
  size = 'lg',
  testId = 'screen-header',
}) {
  return (
    <header
      className="border-b border-border bg-background px-5 pb-4 pt-8"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <IconButton icon={ArrowLeft} label="Geri dön" onClick={onBack} testId="back-button" />
        ) : null}
        <div className="min-w-0 flex-1">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            className={`mt-0.5 truncate ${size === 'xl' ? 'title-xl' : 'title-lg'} text-foreground`}
            data-testid="screen-title"
          >
            {title}
          </h1>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

export function SectionHeading({ eyebrow, title, right, className = '' }) {
  return (
    <div className={`mb-3 flex items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="title-md text-foreground">{title}</h2>
      </div>
      {right ? <div className="shrink-0 pb-1">{right}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ cards */
export function ListCard({ children, className = '', divided = true, testId = 'list-card' }) {
  return (
    <div
      className={`overflow-hidden rounded-theme border border-border bg-card ${divided ? 'divide-y divide-border' : ''} ${className}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function Row({
  icon: Icon,
  iconTone = 'muted',
  title,
  subtitle,
  meta,
  onClick,
  right,
  chevron = false,
  testId,
  className = '',
}) {
  const Comp = onClick ? 'button' : 'div';
  const tones = {
    muted: 'bg-muted text-accent',
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive/15 text-destructive',
    success: 'bg-success/15 text-success',
  };
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={testId}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${onClick ? 'active:bg-muted/60' : ''} ${className}`}
    >
      {Icon ? (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-theme ${tones[iconTone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {meta ? <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{meta}</span> : null}
        <span className="block truncate text-sm font-semibold text-card-foreground">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
      {right}
      {chevron ? <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" /> : null}
    </Comp>
  );
}

/* ------------------------------------------------------------------ chips */
const CHIP_TONES = {
  ok: 'bg-success/15 text-success border-success/30',
  success: 'bg-success/15 text-success border-success/30',
  warn: 'bg-primary/15 text-primary border-primary/40',
  primary: 'bg-primary/15 text-primary border-primary/40',
  error: 'bg-destructive/15 text-destructive border-destructive/40',
  destructive: 'bg-destructive/15 text-destructive border-destructive/40',
  accent: 'bg-accent/15 text-accent border-accent/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function StatusChip({ tone = 'neutral', icon: Icon, children, testId, className = '' }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-theme border px-2 py-1 text-[11px] font-semibold ${CHIP_TONES[tone] || CHIP_TONES.neutral} ${className}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- segmented */
export function SegmentedToggle({ options, value, onChange, tone = 'primary', ariaLabel, testId, className = '' }) {
  const activeCls = tone === 'secondary'
    ? 'bg-secondary text-secondary-foreground'
    : 'bg-primary text-primary-foreground';
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-testid={testId}
      className={`grid rounded-theme border border-border bg-muted p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            data-testid={testId ? `${testId}-${opt.id}` : undefined}
            className={`min-h-[40px] rounded-[7px] px-2 py-2 text-sm font-semibold transition-colors ${active ? `${activeCls} shadow-sm` : 'text-muted-foreground active:bg-background/40'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- stepper */
export function Stepper({ value, onChange, min = 1, max = 12, label, hint, testId = 'stepper' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-card-foreground">{hint}</p>
      </div>
      <div className="flex h-11 shrink-0 items-center rounded-theme border border-border bg-input">
        <button
          type="button"
          aria-label="Azalt"
          data-testid={`${testId}-minus`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-full w-11 items-center justify-center border-r border-border text-muted-foreground transition-colors active:bg-muted/60"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="num-md flex w-12 justify-center text-foreground" data-testid={`${testId}-value`}>
          {value}
        </span>
        <button
          type="button"
          aria-label="Artır"
          data-testid={`${testId}-plus`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-full w-11 items-center justify-center border-l border-border text-primary transition-colors active:bg-muted/60"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- numeric field */
export function NumericField({
  id,
  label,
  hint,
  hintTone = 'muted',
  kind = 'length',
  value,
  onChange,
  disabled = false,
  status = 'neutral',
  unitOverride,
  testId,
  error,
  className = '',
}) {
  const { unitSystem } = useApp();
  const [text, setText] = useState(() => toInputText(kind, value, unitSystem));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toInputText(kind, value, unitSystem));
  }, [value, unitSystem, kind, focused]);

  const handleChange = (raw) => {
    setText(raw);
    const parsed = parseNumber(raw);
    if (Number.isFinite(parsed)) onChange(toMetric(kind, parsed, unitSystem));
  };

  const borders = {
    error: 'border-destructive',
    warn: 'border-primary/60',
    ok: 'border-border',
    neutral: 'border-border',
  };
  const hintCls = hintTone === 'warn' ? 'text-primary' : hintTone === 'error' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={`px-4 py-3 ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-card-foreground" htmlFor={id}>
          {label}
        </label>
        {hint ? <span className={`shrink-0 text-[11px] font-medium ${hintCls}`}>{hint}</span> : null}
      </div>
      <div className={`mt-2 flex h-12 items-center rounded-theme border bg-input ${borders[status] || borders.neutral}`}>
        <input
          id={id}
          data-testid={testId}
          value={text}
          disabled={disabled}
          inputMode="decimal"
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setText(toInputText(kind, value, unitSystem));
          }}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 font-heading text-2xl font-bold tracking-tight text-foreground outline-none disabled:cursor-not-allowed"
        />
        <span className="shrink-0 border-l border-border px-3 text-sm font-semibold text-muted-foreground">
          {unitOverride || unitLabel(kind, unitSystem)}
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] font-medium text-destructive" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- notices */
export function ClampNotice({ notes, tone = 'warn', title, body, action, testId = 'clamp-notice' }) {
  const isWarn = tone === 'warn';
  return (
    <div
      data-testid={testId}
      className={`rounded-theme border px-4 py-3 ${isWarn ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted'}`}
    >
      <div className="flex items-start gap-3">
        {isWarn ? (
          <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
        ) : (
          <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isWarn ? 'text-primary' : 'text-foreground'}`}>{title}</p>
          {body ? <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{body}</p> : null}
          {notes && notes.length ? (
            <ul className="mt-1 space-y-0.5">
              {notes.map((n) => (
                <li key={n} className="text-xs leading-4 text-muted-foreground">
                  · {n}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, testId = 'empty-state' }) {
  return (
    <div className="rounded-theme border border-border bg-card px-6 py-10 text-center" data-testid={testId}>
      {Icon ? (
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-theme bg-muted text-accent">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="title-md text-foreground">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-[280px] text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------ bottom bars */
const TABS = [
  { id: 'hesapla', label: 'Hesapla', icon: Calculator, to: '/' },
  { id: 'malzemeler', label: 'Malzemeler', icon: Layers3, to: '/malzemeler' },
  { id: 'gecmis', label: 'Geçmiş', icon: HistoryIcon, to: '/gecmis' },
  { id: 'ayarlar', label: 'Ayarlar', icon: Settings2, to: '/ayarlar' },
];

export function BottomTabBar({ active }) {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background safe-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[430px] items-start justify-around px-3 pt-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.to)}
              data-testid={`tab-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-w-[70px] flex-col items-center gap-1 pt-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {isActive ? <span className="absolute -top-2 h-0.5 w-9 bg-primary" /> : null}
              <Icon className="h-5 w-5" />
              <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomActionBar({ children, testId = 'bottom-action-bar' }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background px-5 pb-4 pt-3 safe-bottom"
      data-testid={testId}
    >
      <div className="mx-auto flex w-full max-w-[430px] items-center gap-3">{children}</div>
    </div>
  );
}

export function PrimaryButton({ icon: Icon, children, onClick, testId, disabled, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-theme bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors active:brightness-95 disabled:opacity-50 ${className}`}
    >
      {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({ icon: Icon, children, onClick, testId, tone = 'default', className = '' }) {
  const tones = {
    default: 'border-border bg-card text-card-foreground',
    destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex h-12 items-center justify-center gap-2 rounded-theme border px-4 text-sm font-semibold transition-colors active:brightness-110 ${tones[tone]} ${className}`}
    >
      {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}
