"use client";

import type { Player } from "./types";
import { T, naira } from "./util";

export interface Chip { id: number; emoji: string; text: string; tone: "good" | "bad" | "neutral" }

const STATS: [keyof Player["stats"], string, string, string, boolean][] = [
  ["health", "❤️", "Health", "Health", false], ["happiness", "😊", "Happiness", "Happiness", false], ["smarts", "🧠", "Smarts", "Smarts", false],
  ["looks", "✨", "Looks", "Looks", false], ["stress", "😰", "Stress", "Stress", true], ["reputation", "⭐", "Reputation", "Reputation", false],
  ["connections", "🤝", "Connections", "Connections", false], ["fitness", "💪", "Fitness", "Fitness", false],
];

let seq = 1;
/** The small "+1 Happiness" style chips that pop up after something changes your stats or cash. */
export function changeChips(a: Player, b: Player, min = 1): Chip[] {
  const out: Chip[] = [];
  for (const [k, emoji, en, pcm, bad] of STATS) {
    const d = Math.round(b.stats[k] - a.stats[k]);
    if (Math.abs(d) < min) continue;
    const good = bad ? d < 0 : d > 0;
    out.push({ id: seq++, emoji, text: `${T(en, pcm)} ${d > 0 ? "+" : "−"}${Math.abs(d)}`, tone: good ? "good" : "bad" });
  }
  const m = b.money - a.money;
  if (Math.abs(m) >= 10_000 * b.index) out.push({ id: seq++, emoji: "₦", text: `${m > 0 ? "+" : "−"}${naira(Math.abs(m))}`, tone: m > 0 ? "good" : "bad" });
  return out.sort((x, y) => (x.tone === y.tone ? 0 : x.tone === "good" ? -1 : 1)).slice(0, 4);
}

const TONE = { good: "text-emerald-700 ring-emerald-200", bad: "text-rose-700 ring-rose-200", neutral: "text-slate-700 ring-slate-200" } as const;

/** Small floating pop-ups: no black bar, nothing covers the game. They appear, hang for a moment and fade. */
export function Pops({ chips, note }: { chips: Chip[]; note: string }) {
  if (!chips.length && !note) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[74px] z-[45] flex flex-col items-center gap-1.5 px-4" aria-live="polite">
      <style>{`@keyframes nlpop{0%{opacity:0;transform:translateY(12px) scale(.55)}12%{opacity:1;transform:translateY(0) scale(1.1)}22%{transform:translateY(0) scale(1)}78%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-10px) scale(.96)}}.nlpop{animation:nlpop 2.6s cubic-bezier(.2,.9,.3,1) both}`}</style>
      {note && (
        <div key={note} className="nlpop max-w-[88%] rounded-2xl bg-white/95 px-3.5 py-1.5 text-center text-[12.5px] font-semibold leading-snug text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur">{note}</div>
      )}
      <div className="flex flex-wrap justify-center gap-1.5">
        {chips.map((c, i) => (
          <span key={c.id} className={`nlpop inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[13px] font-extrabold shadow-lg ring-1 backdrop-blur ${TONE[c.tone]}`} style={{ animationDelay: `${i * 90}ms` }}>
            <span aria-hidden>{c.emoji}</span>{c.text}
          </span>
        ))}
      </div>
    </div>
  );
}
