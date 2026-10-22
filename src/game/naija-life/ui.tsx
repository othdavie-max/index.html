"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { T } from "./util";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Navy used for headings and key text across the app. */
export const NAVY = "#0b2a6b";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_6px_20px_-12px_rgba(30,64,175,0.22)]", className)}>{children}</div>;
}

export function H({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-2 mt-1">
      <h3 className="text-[14px] font-extrabold tracking-tight text-[#0b2a6b]">{children}</h3>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function Bar({ label, value, tone = "green", invert }: { label: string; value: number; tone?: "green" | "gold" | "red" | "blue"; invert?: boolean }) {
  const shown = Math.round(value);
  const good = invert ? 100 - shown : shown;
  const color = tone === "gold" ? "#f59e0b" : tone === "blue" ? "#3b82f6" : tone === "red" ? "#ef4444" : good < 30 ? "#ef4444" : good < 55 ? "#f59e0b" : "#22c55e";
  return (
    <div>
      <div className="flex justify-between text-[11px] font-medium text-slate-500">
        <span>{label}</span>
        <span>{shown}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, shown))}%`, background: color }} />
      </div>
    </div>
  );
}

export function Btn({
  children, onClick, disabled, tone = "green", small, className, title,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "green" | "gold" | "red" | "ghost"; small?: boolean; className?: string; title?: string;
}) {
  const tones = {
    green: "bg-emerald-500 text-white hover:bg-emerald-600",
    gold: "bg-blue-600 text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700",
    red: "bg-red-500 text-white hover:bg-red-600",
    ghost: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-2xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        small ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2.5 text-[13px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "gold" | "red" }) {
  const t = {
    gray: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    gold: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-600",
  };
  return <span className={cx("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", t[tone])}>{children}</span>;
}

export function Sheet({ children, title, onClose }: { children: ReactNode; title?: string; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-slate-100 bg-white p-5 text-slate-800 shadow-2xl sm:rounded-3xl">
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold tracking-tight text-[#0b2a6b]">{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label={T("Close", "Close")} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-500">
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Meter({ label, value, max = 10, invert, compact }: { label: string; value: number; max?: number; invert?: boolean; compact?: boolean }) {
  const pct = (value / max) * 100;
  const good = invert ? 100 - pct : pct;
  const color = good < 35 ? "#ef4444" : good < 65 ? "#f59e0b" : "#22c55e";
  if (compact) {
    return (
      <div className="text-[10px] text-slate-500">
        {label}
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-600">
      <span className="w-14 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** A compact row of section tabs that keeps long screens short. */
export function SubTabs<K extends string>({ tabs, value, onChange }: { tabs: { id: K; label: ReactNode; badge?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 py-0.5" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold", value === t.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600")}>
          {t.label}{t.badge ? <span className="ml-1 rounded-full bg-white/25 px-1.5 text-[10px]">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export interface HubRow { id: string; emoji: string; tile: string; name: string; desc?: string; node?: ReactNode; onClick?: () => void; hidden?: boolean }
export interface HubGroup { title?: string; rows: HubRow[] }

/** A grouped list of tappable rows: emoji tile, title, one-line description, chevron. */
export function HubList({ groups, onPick }: { groups: HubGroup[]; onPick: (r: HubRow) => void }) {
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => {
        const rows = g.rows.filter((r) => !r.hidden);
        if (rows.length === 0) return null;
        return (
          <section key={gi}>
            {g.title && <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{g.title}</h2>}
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
              {rows.map((r) => (
                <button key={r.id} type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-slate-50">
                  <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[24px]", r.tile)}>{r.emoji}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{r.name}</span>{r.desc && <span className="block truncate text-[12px] leading-snug text-slate-500">{r.desc}</span>}</span>
                  <span className="shrink-0 text-xl font-black text-blue-500">›</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function BackPill({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mb-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-slate-200">‹ {label}</button>;
}

/** A list of sections; tapping one opens its content with a back button. */
export function Hub({ groups, top, back }: { groups: HubGroup[]; top?: ReactNode; back: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const row = groups.flatMap((g) => g.rows).find((r) => r.id === open && !r.hidden);
  if (row) return (<><BackPill label={back} onClick={() => setOpen(null)} />{row.node}</>);
  return (<>{top}<HubList groups={groups} onPick={(r) => (r.onClick ? r.onClick() : setOpen(r.id))} /></>);
}
