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
        <div className="gm-body">{children}{footer && <div className="g-row g-wrap gm-foot" style={{ justifyContent: "flex-end", marginTop: 4 }}>{footer}</div>}</div>
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
const ACCENTS = ["#00c875", "#2563eb", "#e11d48", "#f59e0b", "#7c3aed", "#0f766e", "#b45309", "#111827"];
export type PortraitData = { skin: number; hair: number; style: number; accent: number; wear?: number; glasses?: number; beard?: number; outfit?: number };
/** a hand-drawn SVG portrait: 8 hairstyles, headwear (fila, gele, headscarf, red cap), glasses, beards and outfits (shirt, agbada, suit, kaftan) */
export function Portrait({ p, size = 64, name }: { p: PortraitData; size?: number; name?: string }) {
  const skin = SKINS[p.skin % SKINS.length], hair = HAIRS[p.hair % HAIRS.length], acc = ACCENTS[p.accent % ACCENTS.length];
  const style = p.style % 8, wear = (p.wear ?? 0) % 5, gl = (p.glasses ?? 0) % 3, beard = (p.beard ?? 0) % 3, outfit = (p.outfit ?? 0) % 4;
  const covered = wear === 2 || wear === 3;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={name ? `Portrait of ${name}` : "Character portrait"} style={{ borderRadius: 999, background: "linear-gradient(160deg,#dbe7f3,#b8cde3)", flex: "0 0 auto" }}>
      {/* behind the head */}
      {!covered && style === 4 && <><path d="M30 38c-4 18-3 34 2 46h8c-4-12-5-28-3-44z" fill={hair} /><path d="M70 38c4 18 3 34-2 46h-8c4-12 5-28 3-44z" fill={hair} /></>}
      {!covered && style === 5 && <circle cx="50" cy="34" r="27" fill={hair} />}
      {wear === 3 && <path d="M26 44c0-22 11-32 24-32s24 10 24 32v40H26z" fill={acc} />}
      {/* clothes */}
      {outfit === 0 && <path d="M12 100c2-24 18-34 38-34s36 10 38 34z" fill={acc} />}
      {outfit === 1 && <><path d="M4 100c3-26 22-36 46-36s43 10 46 36z" fill={acc} /><path d="M40 66l10 14 10-14" fill="none" stroke="#f5d57a" strokeWidth="3" /><path d="M42 70c3 6 13 6 16 0" fill="none" stroke="#f5d57a" strokeWidth="1.6" strokeDasharray="2 2" /></>}
      {outfit === 2 && <><path d="M12 100c2-24 18-34 38-34s36 10 38 34z" fill="#1f2a44" /><path d="M42 66l8 16 8-16z" fill="#fff" /><path d="M48 70h4l1 14-3 4-3-4z" fill={acc} /></>}
      {outfit === 3 && <><path d="M14 100c2-24 17-34 36-34s34 10 36 34z" fill={acc} /><path d="M46 66h8v30h-8z" fill="#f5d57a" opacity=".85" /><path d="M46 72h8M46 78h8M46 84h8" stroke={acc} strokeWidth="1.2" /></>}
      {wear === 3 && <path d="M34 60c4 10 28 10 32 0l2 10c-6 8-30 8-36 0z" fill={acc} />}
      <rect x="43" y="52" width="14" height="16" rx="6" fill={skin} />
      <ellipse cx="50" cy="40" rx="18" ry="21" fill={skin} />
      {/* hair */}
      {!covered && style === 0 && <path d="M31 36c0-17 11-22 20-22s19 5 19 22c-4-8-10-11-19-11s-16 3-20 11z" fill={hair} />}
      {!covered && style === 1 && <path d="M30 40c-2-22 10-28 21-28 12 0 22 8 19 28-3-10-9-14-19-14s-18 4-21 14z" fill={hair} />}
      {!covered && style === 2 && <><path d="M30 40c-2-22 10-28 21-28 12 0 22 8 19 28-3-10-9-14-19-14s-18 4-21 14z" fill={hair} /><circle cx="30" cy="30" r="9" fill={hair} /><circle cx="70" cy="30" r="9" fill={hair} /></>}
      {!covered && style === 3 && <path d="M32 33c3-12 11-15 19-15s16 3 18 15c-5-5-10-6-18-6s-14 1-19 6z" fill={hair} opacity="0.9" />}
      {!covered && style === 4 && <path d="M30 40c-2-22 10-28 21-28 12 0 22 8 19 28-3-10-9-14-19-14s-18 4-21 14z" fill={hair} />}
      {!covered && style === 4 && <path d="M38 18v10M44 15v11M50 14v11M56 15v11M62 18v10" stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.2" />}
      {!covered && style === 5 && <path d="M32 40c0-12 8-18 18-18s18 6 18 18c-4-8-10-10-18-10s-14 2-18 10z" fill={hair} />}
      {!covered && style === 6 && <><circle cx="50" cy="14" r="8" fill={hair} /><path d="M31 38c0-17 11-22 19-22s19 5 19 22c-4-9-11-12-19-12s-15 3-19 12z" fill={hair} /></>}
      {!covered && style === 7 && <><path d="M31 36c0-16 11-21 19-21s19 5 19 21c-4-7-11-10-19-10s-15 3-19 10z" fill={hair} opacity=".55" /><path d="M42 18l-4 9" stroke={skin} strokeWidth="1.5" /></>}
      {/* headwear */}
      {wear === 1 && <path d="M31 30c2-12 12-16 22-15 10 1 17 6 17 13-2 2-6 4-12 2-8-3-18-3-27 0z" fill={acc} stroke="#00000022" />}
      {wear === 2 && <><path d="M24 30c4-18 18-24 30-22 14 2 24 10 22 22-6 6-14 6-24 5-12-1-20-1-28-5z" fill={acc} /><path d="M30 26c10-6 24-8 40-2M34 18c8-4 18-5 30 0M60 10c8 4 14 10 16 18" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" /></>}
      {wear === 3 && <path d="M30 40c0-18 9-26 20-26s20 8 20 26c-4-10-11-14-20-14s-16 4-20 14z" fill={acc} />}
      {wear === 4 && <path d="M33 26c2-9 9-12 17-12s15 3 17 12c-5 3-12 4-17 4s-12-1-17-4z" fill="#b91c1c" stroke="#00000022" />}
      {/* face */}
      <path d="M40 35h6M54 35h6" stroke="#1f2937" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
      <circle cx="43" cy="41" r="2" fill="#1f2937" /><circle cx="57" cy="41" r="2" fill="#1f2937" />
      {gl === 1 && <g fill="none" stroke="#111827" strokeWidth="1.5"><circle cx="43" cy="41" r="5" /><circle cx="57" cy="41" r="5" /><path d="M48 41h4" /></g>}
      {gl === 2 && <g fill="none" stroke="#111827" strokeWidth="1.6"><rect x="37" y="37" width="11" height="8" rx="2" /><rect x="52" y="37" width="11" height="8" rx="2" /><path d="M48 40h4" /></g>}
      {beard === 1 && <path d="M45 54c2 4 8 4 10 0v4c-2 3-8 3-10 0z" fill={hair} />}
      {beard === 2 && <path d="M33 44c0 12 7 19 17 19s17-7 17-19c-3 6-6 8-8 8-3-2-15-2-18 0-2 0-5-2-8-8z" fill={hair} />}
      <path d="M44 50c3 3 9 3 12 0" stroke={beard === 2 ? "#e5e7eb" : "#7c3f2a"} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export const PORTRAIT_OPTIONS = { skin: SKINS.length, hair: HAIRS.length, style: 8, accent: ACCENTS.length, wear: 5, glasses: 3, beard: 3, outfit: 4, skinColors: SKINS, accents: ACCENTS };
export const PORTRAIT_NAMES = {
  style: ["Short crop", "Rounded", "Puffs", "Close cut", "Braids", "Afro", "Top bun", "Fade"],
  wear: ["Nothing", "Fila cap", "Gele", "Headscarf", "Red cap"], glasses: ["None", "Round", "Square"], beard: ["Clean", "Goatee", "Full beard"], outfit: ["Shirt", "Agbada", "Suit", "Kaftan"],
  hair: ["Black", "Dark brown", "Brown", "Grey"], skin: ["Very light", "Light", "Medium", "Brown", "Dark", "Very dark"], accent: ["Green", "Blue", "Red", "Gold", "Purple", "Teal", "Copper", "Black"],
} as const;

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
  // never zoom in so far that a tiny wobble looks like a cliff
  { const mid = (y0 + y1) / 2, minSpan = Math.max(2, Math.abs(mid) * 0.08); if (y1 - y0 < minSpan) { y0 = mid - minSpan / 2; y1 = mid + minSpan / 2; } }
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
      <div className="g-row g-wrap g-tiny" style={{ gap: 12, display: series.length < 2 ? "none" : undefined }}>
        {series.map((s) => (
          <span key={s.label} className="g-row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.label}
            {hoverPt && <b className="g-num">{format(s.points.find((p) => p.x === hoverPt.x)?.y ?? NaN)}</b>}</span>
        ))}
        {hoverPt && xLabel && <span className="g-muted">{xLabel(hoverPt.x)}</span>}
      </div>
    </div>
  );
}
