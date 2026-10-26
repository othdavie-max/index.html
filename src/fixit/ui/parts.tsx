"use client";
/** Small shared UI pieces for the Fix-It game. */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { Tone } from "../engine/views";

export const TONE_WORD: Record<Tone, string> = { good: "Good", ok: "Steady", warn: "Worrying", bad: "Serious" };

export function Word({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="fx-word" data-tone={tone}>{children}</span>;
}

/** Arrow + number so direction is never conveyed by colour alone. `goodWhenDown` for prices and the naira rate. */
export function Trend({ delta, unit = "", goodWhenDown = false, digits = 1, label }: { delta: number; unit?: string; goodWhenDown?: boolean; digits?: number; label?: string }) {
  const flat = Math.abs(delta) < 0.5 * 10 ** -digits;
  const up = delta > 0;
  const good = flat ? null : up !== goodWhenDown;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={good === null ? "g-muted" : good ? "fx-delta-good" : "fx-delta-bad"} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12 }} aria-label={label}>
      <Icon size={14} aria-hidden />{flat ? "steady" : `${up ? "+" : "−"}${Math.abs(delta).toFixed(digits)}${unit}`}
    </span>
  );
}

export function UncBadge({ u }: { u: "low" | "medium" | "high" }) {
  const map = { low: ["Predictable", "green"], medium: ["Some uncertainty", "amber"], high: ["Very uncertain", "red"] } as const;
  return <span className={`g-badge g-badge-${map[u][1]}`} title="How far the real result could differ from what is expected">{u === "high" ? "◆◆◆" : u === "medium" ? "◆◆" : "◆"} {map[u][0]}</span>;
}

export const bn = (n: number) => {
  const a = Math.abs(n), sg = n < 0 ? "−" : "";
  return a >= 1000 ? `${sg}₦${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}tn` : `${sg}₦${Math.round(a).toLocaleString("en-NG")}bn`;
};
