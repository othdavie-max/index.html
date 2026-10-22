"use client";

import type { ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-white/10 bg-[#0e2218] p-4", className)}>{children}</div>;
}

export function H({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-2 mt-1">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#f5b82e]">{children}</h3>
      {sub && <p className="mt-0.5 text-xs text-emerald-100/60">{sub}</p>}
    </div>
  );
}

export function Bar({ label, value, tone = "green", invert }: { label: string; value: number; tone?: "green" | "gold" | "red" | "blue"; invert?: boolean }) {
  const shown = Math.round(value);
  const good = invert ? 100 - shown : shown;
  const color = tone === "gold" ? "#f5b82e" : tone === "blue" ? "#4aa8ff" : tone === "red" ? "#ff6b5a" : good < 30 ? "#ff6b5a" : good < 55 ? "#f5b82e" : "#2ecc71";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-emerald-100/70">
        <span>{label}</span>
        <span>{shown}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
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
    green: "bg-[#1f9d55] text-white hover:bg-[#25b362]",
    gold: "bg-[#f5b82e] text-[#1b1400] hover:bg-[#ffc94d]",
    red: "bg-[#c0392b] text-white hover:bg-[#d84a3b]",
    ghost: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
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
    gray: "bg-white/10 text-white/70",
    green: "bg-emerald-500/20 text-emerald-300",
    gold: "bg-[#f5b82e]/20 text-[#f5b82e]",
    red: "bg-red-500/20 text-red-300",
  };
  return <span className={cx("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", t[tone])}>{children}</span>;
}

export function Sheet({ children, title, onClose }: { children: ReactNode; title?: string; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b1d13] p-5 shadow-2xl sm:rounded-3xl">
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-white">{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 px-2.5 py-1 text-sm text-white/70">
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
  const color = good < 35 ? "#ff6b5a" : good < 65 ? "#f5b82e" : "#2ecc71";
  if (compact) {
    return (
      <div className="text-[10px] text-white/60">
        {label}
        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[11px] text-white/70">
      <span className="w-14 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
