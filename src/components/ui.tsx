import React from 'react';

export function Card({ children, className = '', deep = false }: { children: React.ReactNode; className?: string; deep?: boolean }) {
  return (
    <div className={`${deep ? 'parchment-deep' : 'parchment'} ornate-border ${className}`}>
      <div className="relative p-5">{children}</div>
    </div>
  );
}

export function CardHeader({ icon, title, subtitle, right }: { icon?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-3 pb-3 border-b border-[rgba(120,80,30,0.25)]">
      <div className="flex items-start gap-3">
        {icon && <div className="text-[var(--color-crimson-500)] mt-0.5">{icon}</div>}
        <div>
          <h3 className="font-[var(--font-display)] uppercase tracking-[0.16em] text-[0.82rem] font-semibold text-[var(--color-ink-400)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-ink-300)] mt-0.5 italic">{subtitle}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Fleuron({ children }: { children: React.ReactNode }) {
  return <div className="fleuron my-4">{children}</div>;
}

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip">{text}</span>
    </span>
  );
}

export function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[var(--font-display)] uppercase tracking-[0.18em] text-[0.65rem] text-[var(--color-ink-300)] font-semibold">
      {children}
    </span>
  );
}

export function StatValue({ value, unit, color = 'text-[var(--color-ink-500)]', size = 'lg' }: { value: React.ReactNode; unit?: string; color?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };
  return (
    <span className={`tabular-nums font-[var(--font-display)] font-bold ${color} ${sizes[size]}`}>
      {value}
      {unit && <span className="text-[0.5em] ml-1 font-normal opacity-70 tracking-wider uppercase">{unit}</span>}
    </span>
  );
}

export function PipBar({ pct, color = '#5a7745', count = 12 }: { pct: number; color?: string; count?: number }) {
  const lit = Math.round((pct / 100) * count);
  return (
    <div className="pip-strip" style={{ color }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`pip ${i < lit ? 'on' : ''}`} />
      ))}
    </div>
  );
}

export function RiskMeter({ label, value, invert = false, tooltip, suffix = '%' }: { label: string; value: number; invert?: boolean; tooltip?: string; suffix?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const severity = invert ? 100 - pct : pct;
  const color =
    severity >= 50 ? '#9b1c1c' :
    severity >= 25 ? '#c46a1a' :
    severity >= 10 ? '#b8860b' :
    '#5a7745';
  const verdict =
    severity >= 50 ? 'Dire' :
    severity >= 25 ? 'Grave' :
    severity >= 10 ? 'Watchful' :
    'Secure';

  return (
    <div className="vellum p-3 rounded-sm">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.62rem] text-[#c2a778]">{label}</span>
        <Tooltip text={tooltip || ''}>
          <span className="text-[0.6rem] text-[#8a6a3f] font-bold tracking-wider uppercase cursor-help">{tooltip ? 'ⓘ' : ''}</span>
        </Tooltip>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-[var(--font-display)] font-bold tabular-nums" style={{ color }}>
          {value.toFixed(1)}<span className="text-[0.55em] ml-0.5 opacity-70">{suffix}</span>
        </span>
        <span
          className="text-[0.62rem] font-[var(--font-display)] uppercase tracking-[0.14em] font-bold mb-1"
          style={{ color }}
        >
          {verdict}
        </span>
      </div>
      <div className="mt-2">
        <PipBar pct={severity} color={color} count={16} />
      </div>
    </div>
  );
}

export function IconButton({ children, onClick, title, active = false, variant = 'wood' }: { children: React.ReactNode; onClick?: () => void; title?: string; active?: boolean; variant?: 'wood' | 'primary' | 'danger' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`btn-wood ${variant !== 'wood' ? variant : ''} ${active ? 'primary' : ''} inline-flex items-center justify-center gap-1.5`}
    >
      {children}
    </button>
  );
}
