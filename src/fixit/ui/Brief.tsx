"use client";
/** Short by default, full on tap. */
import { useState, type ReactNode } from "react";

/** the first sentence, trimmed to about `max` characters, and whether anything was cut */
export function shorten(text: string, max = 72): { short: string; cut: boolean } {
  const t = text.trim().replace(/\s+/g, " ");
  const ABBR = /(?:\b(?:Dr|Prof|Mr|Mrs|Ms|Gen|Hon|Engr|Barr|Sen|Gov|Rev|Col|Lt|St|Rtd|rtd|vs|etc)|\b[A-Z])\.$/;
  let end = -1; for (let i = 0; i < t.length; i++) { if (".!?".includes(t[i]) && (i === t.length - 1 || t[i + 1] === " ") && !ABBR.test(t.slice(0, i + 1))) { end = i; break; } }
  const first = end >= 0 ? t.slice(0, end + 1) : t;
  if (first.length <= max && first.length >= t.length - 1) return { short: first, cut: false };
  if (first.length <= max) return { short: first, cut: true };
  const cut = first.slice(0, max); const sp = cut.lastIndexOf(" ");
  return { short: `${cut.slice(0, sp > 30 ? sp : max).replace(/[,;:\s]+$/, "")}…`, cut: true };
}
/** one short line with an ⓘ that reveals the rest */
export function Brief({ text, max = 72, className = "g-small" }: { text: string; max?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const { short, cut } = shorten(text, max);
  return (
    <span className={className}>
      {open ? text : short}
      {cut && <button type="button" className="fx-info" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-expanded={open} aria-label={open ? "Show less" : "Show more"}>{open ? "−" : "ⓘ"}</button>}
    </span>
  );
}
/** a collapsed explanation: an ⓘ button, and the text only when asked for */
export function Tip({ children, label = "What is this?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fx-tip">
      <button type="button" className="fx-tip-btn" onClick={() => setOpen(!open)} aria-expanded={open}>ⓘ {label}</button>
      {open && <div className="fx-tip-body g-small">{children}</div>}
    </div>
  );
}
