"use client";
/** Reusable UI building blocks for the game (buttons, cards, meters, tabs, dialogs, charts, states). */
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, X, AlertTriangle, Inbox } from "lucide-react";

export const naira = (n: number, compact = false): string => {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (compact || v >= 10_000_000) {
    if (v >= 1e12) return `${sign}₦${(v / 1e12).toFixed(2)}tn`;
    if (v >= 1e9) return `${sign}₦${(v / 1e9).toFixed(2)}bn`;
    if (v >= 1e6) return `${sign}₦${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)}m`;
    if (v >= 1e4 && compact) return `${sign}₦${(v / 1e3).toFixed(0)}k`;
  }
  return `${sign}₦${Math.round(v).toLocaleString("en-NG")}`;
};
export const nairaM = (millions: number) => naira(millions * 1e6, true);
export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

// ---------------------------------------------------------------- buttons
type BtnVariant = "primary" | "navy" | "default" | "danger" | "ghost" | "light";
export function Button({ variant = "default", size, block, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm"; block?: boolean }) {
  const v = { primary: "g-btn-primary", navy: "g-btn-navy", default: "", danger: "g-btn-danger", ghost: "g-btn-ghost", light: "g-btn-light" }[variant];
  return (
    <button type="button" {...rest} className={cx("g-btn", v, size === "sm" && "g-btn-sm", block && "g-btn-block", className)}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- cards
export function Card({ title, icon, action, children, className, tone }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tone?: "dark" | "green" }) {
  return (
    <section className={cx("g-card", tone === "dark" && "g-card-dark", tone === "green" && "g-card-green", className)}>
      {(title || action) && (
        <div className="g-card-head">
          <h3>{icon}{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Meter({ label, value, max = 100, tone, hint, suffix }: { label: string; value: number; max?: number; tone?: "green" | "amber" | "red" | "blue" | "auto" | "inverse"; hint?: string; suffix?: string }) {
  const p = Math.max(0, Math.min(100, (value / max) * 100));
  let t = tone;
  if (t === "auto") t = p >= 55 ? "green" : p >= 30 ? "amber" : "red";
  if (t === "inverse") t = p <= 35 ? "green" : p <= 65 ? "amber" : "red";
  return (
    <div className="g-meter" title={hint}>
      <span>{label}</span>
      <b>{Math.round(value)}{suffix ?? ""}</b>
      <div className={cx("g-bar", t === "amber" && "g-bar-amber", t === "red" && "g-bar-red", t === "blue" && "g-bar-blue")} role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
        <span style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function Bar({ value, tone, label }: { value: number; tone?: "amber" | "red" | "blue"; label?: string }) {
  return (
    <div className={cx("g-bar", tone === "amber" && "g-bar-amber", tone === "red" && "g-bar-red", tone === "blue" && "g-bar-blue")} role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Badge({ tone, children }: { tone?: "green" | "red" | "amber" | "blue" | "navy"; children: ReactNode }) {
  return <span className={cx("g-badge", tone && `g-badge-${tone}`)}>{children}</span>;
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="g-card-flat">
      <div className="g-row g-tiny g-muted" style={{ gap: 6 }}>{icon}{label}</div>
      <div className="g-num" style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && <div className="g-tiny g-muted" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "good"; children: ReactNode }) {
  return <div className={cx("g-callout", `g-callout-${tone}`)} role={tone === "bad" ? "alert" : undefined}>{children}</div>;
}

export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="g-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {help && <span className="g-help">{help}</span>}
      {error && <span className="g-error">{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- tabs
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="g-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className="g-tab" onClick={() => onChange(t.id)}>
          {t.label} {t.badge}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- dialogs
export function Modal({ title, onClose, children, wide, closable = true, footer }: { title: ReactNode; onClose?: () => void; children: ReactNode; wide?: boolean; closable?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && closable && onClose) onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [closable, onClose]);
  return (
    <div className="gm-modal-root gm" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && closable && onClose) onClose(); }}>
      <div className={cx("gm-modal", wide && "gm-modal-wide")} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} tabIndex={-1} ref={ref}>
        <header>
          <h2>{title}</h2>
          {closable && onClose && <button className="g-btn g-btn-ghost g-btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>}
        </header>
        <div className="gm-body">{children}{footer && <div className="g-row g-wrap" style={{ justifyContent: "flex-end", marginTop: 4 }}>{footer}</div>}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel = "Confirm", tone = "primary", onConfirm, onCancel }: { title: string; body: ReactNode; confirmLabel?: string; tone?: "primary" | "danger"; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel} footer={<><Button onClick={onCancel}>Cancel</Button><Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="g-small" style={{ lineHeight: 1.55 }}>{body}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------- states
export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="g-col" style={{ alignItems: "center", textAlign: "center", padding: "26px 12px", gap: 8 }}>
      <div style={{ color: "#94a3b8" }}>{icon ?? <Inbox size={30} />}</div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {body && <div className="g-small g-muted" style={{ maxWidth: 360 }}>{body}</div>}
      {action}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="g-callout g-callout-bad g-col" role="alert">
      <div className="g-row"><AlertTriangle size={18} /> <b>Something went wrong</b></div>
      <div>{message}</div>
      {onRetry && <div><Button size="sm" onClick={onRetry}>Try again</Button></div>}
    </div>
  );
}
export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="g-row g-muted" style={{ justifyContent: "center", padding: 24 }} role="status"><Loader2 className="animate-spin" size={20} /> {label}</div>;
}

// ---------------------------------------------------------------- portrait / avatar
const SKINS = ["#f3d2b3", "#e0ac84", "#c68642", "#a1683a", "#7b4a2a", "#4a2f1d"];
const HAIRS = ["#0d0d0d", "#2b1b12", "#4a3426", "#6b6b6b"];
const ACCENTS = ["#00c875", "#2563eb", "#e11d48", "#f59e0b", "#7c3aed"];
export function Portrait({ p, size = 64, name }: { p: { skin: number; hair: number; style: number; accent: number }; size?: number; name?: string }) {
  const skin = SKINS[p.skin % SKINS.length], hair = HAIRS[p.hair % HAIRS.length], acc = ACCENTS[p.accent % ACCENTS.length];
  const style = p.style % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={name ? `Portrait of ${name}` : "Character portrait"} style={{ borderRadius: 999, background: "linear-gradient(160deg,#dbe7f3,#b9cde2)", flex: "none" }}>
      <path d="M12 100c2-24 18-34 38-34s36 10 38 34z" fill={acc} />
      <rect x="43" y="52" width="14" height="16" rx="6" fill={skin} />
      <ellipse cx="50" cy="40" rx="18" ry="21" fill={skin} />
      {style === 0 && <path d="M31 36c0-17 11-22 20-22s19 5 19 22c-4-8-10-11-19-11s-16 3-20 11z" fill={hair} />}
      {style === 1 && <path d="M30 40c-2-22 10-28 21-28 12 0 22 8 19 28-3-10-9-14-19-14s-18 4-21 14z" fill={hair} />}
      {style === 2 && <><path d="M30 40c-2-22 10-28 21-28 12 0 22 8 19 28-3-10-9-14-19-14s-18 4-21 14z" fill={hair} /><circle cx="30" cy="30" r="9" fill={hair} /><circle cx="70" cy="30" r="9" fill={hair} /></>}
      {style === 3 && <path d="M32 33c3-12 11-15 19-15s16 3 18 15c-5-5-10-6-18-6s-14 1-19 6z" fill={hair} opacity="0.9" />}
      <circle cx="43" cy="41" r="2" fill="#1f2937" /><circle cx="57" cy="41" r="2" fill="#1f2937" />
      <path d="M44 50c3 3 9 3 12 0" stroke="#7c3f2a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export const PORTRAIT_OPTIONS = { skin: SKINS.length, hair: HAIRS.length, style: 4, accent: ACCENTS.length, skinColors: SKINS, accents: ACCENTS };

export function Initials({ name, size = 40, color = "#0b1f36" }: { name: string; size?: number; color?: string }) {
  const t = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className="g-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }} aria-hidden>{t}</div>;
}

// ---------------------------------------------------------------- results bar (election shares)
export function ResultsBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((t, i) => t + i.value, 0) || 1;
  return (
    <div>
      <div className="g-results-bar" role="img" aria-label={items.map((i) => `${i.label} ${((i.value / total) * 100).toFixed(1)}%`).join(", ")}>
        {items.map((i) => <span key={i.label} title={`${i.label}: ${((i.value / total) * 100).toFixed(1)}%`} style={{ width: `${(i.value / total) * 100}%`, background: i.color }} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- line chart (SVG, no dependencies)
export interface Series { label: string; color: string; points: { x: number; y: number }[] }
export function LineChart({ series, height = 150, format = (v: number) => v.toFixed(1), xLabel }: { series: Series[]; height?: number; format?: (v: number) => string; xLabel?: (x: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = height, pad = { l: 38, r: 8, t: 8, b: 20 };
  const all = series.flatMap((s) => s.points);
  if (Math.max(0, ...series.map((x) => x.points.length)) < 2) return <div className="g-small g-muted">Not enough history yet — advance a few months.</div>;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const padY = (y1 - y0) * 0.1; y0 -= padY; y1 += padY;
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const ticks = [y0 + padY, (y0 + y1) / 2, y1 - padY];
  const longest = series.reduce((a, s) => (s.points.length > a.points.length ? s : a), series[0]);
  const hoverPt = hover !== null ? longest.points[Math.min(longest.points.length - 1, hover)] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.label).join(", ")} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const rel = ((e.clientX - r.left) / r.width) * W; const xv = x0 + ((rel - pad.l) / (W - pad.l - pad.r)) * (x1 - x0); let best = 0, bd = Infinity; longest.points.forEach((p, i) => { const d = Math.abs(p.x - xv); if (d < bd) { bd = d; best = i; } }); setHover(best); }}>
        {ticks.map((t, i) => (<g key={i}><line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="#e2e8f0" /><text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{format(t)}</text></g>))}
        {series.map((s) => <polyline key={s.label} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} />)}
        {hoverPt && <line x1={sx(hoverPt.x)} x2={sx(hoverPt.x)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeDasharray="3 3" />}
        <text x={pad.l} y={H - 4} fontSize="10" fill="#64748b">{xLabel ? xLabel(x0) : x0}</text>
        <text x={W - pad.r} y={H - 4} fontSize="10" fill="#64748b" textAnchor="end">{xLabel ? xLabel(x1) : x1}</text>
      </svg>
      <div className="g-row g-wrap g-tiny" style={{ gap: 12 }}>
        {series.map((s) => (
          <span key={s.label} className="g-row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.label}
            {hoverPt && <b className="g-num">{format(s.points.find((p) => p.x === hoverPt.x)?.y ?? NaN)}</b>}</span>
        ))}
        {hoverPt && xLabel && <span className="g-muted">{xLabel(hoverPt.x)}</span>}
      </div>
    </div>
  );
}
