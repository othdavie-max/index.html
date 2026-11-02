/**
 * "What will this choice do?" without writing it by hand: play the choice (assuming it works) on a copy of the game
 * and show what moved. Works for every event, including ones that run custom code.
 */
import type { FixState } from "./types";
import { chips, type Chip } from "./forecast";
import { resolveEvent } from "./events";

interface M { label: string; get: (s: FixState) => number; goodWhenUp: boolean; min: number; scale: number }
const METRICS: M[] = [
  { label: "Approval", get: (s) => s.gov.approval, goodWhenUp: true, min: 0.6, scale: 1 }, { label: "Trust", get: (s) => s.gov.trust, goodWhenUp: true, min: 0.6, scale: 1 }, { label: "Happiness", get: (s) => s.gov.happiness, goodWhenUp: true, min: 0.6, scale: 1 },
  { label: "Budget", get: (s) => s.fin.treasury, goodWhenUp: true, min: 6, scale: 12 }, { label: "Street anger", get: (s) => s.rule.streetAnger, goodWhenUp: false, min: 1, scale: 1.4 }, { label: "Coup risk", get: (s) => s.rule.coupRisk, goodWhenUp: false, min: 1, scale: 1.2 },
  { label: "World pressure", get: (s) => s.rule.intlPressure, goodWhenUp: false, min: 1, scale: 1.4 }, { label: "Democracy", get: (s) => s.rule.democracy, goodWhenUp: true, min: 0.8, scale: 1.2 }, { label: "Press freedom", get: (s) => s.rule.pressFreedom, goodWhenUp: true, min: 1, scale: 1.4 },
  { label: "Safety", get: (s) => -s.sec.index, goodWhenUp: true, min: 1, scale: 1.4 }, { label: "Corruption", get: (s) => s.gov.corruption, goodWhenUp: false, min: 0.5, scale: 1.2 }, { label: "Reserves", get: (s) => s.eco.reserves, goodWhenUp: true, min: 1, scale: 4 },
  { label: "Elite loyalty", get: (s) => s.rule.eliteLoyalty, goodWhenUp: true, min: 1, scale: 1.4 }, { label: "Human rights", get: (s) => s.sec.humanRights, goodWhenUp: true, min: 1, scale: 1.4 },
];
const GROUPS = ["traders", "farmers", "youth", "workers", "business", "military", "faith"] as const;
const GNAME: Record<string, string> = { traders: "Traders", farmers: "Farmers", youth: "Youth", workers: "Workers", business: "Business", military: "Army", faith: "Faith leaders" };
const cache = new Map<string, Chip[]>();

export function previewChips(s: FixState, eventId: string, optionId: string, max = 4): Chip[] {
  const key = `${s.meta.id}:${eventId}:${optionId}:${s.month}`;
  const hit = cache.get(key); if (hit) return hit;
  let out: Chip[] = [];
  try {
    const copy = structuredClone(s) as FixState;
    const before = new Set(copy.modifiers.map((m) => m.id));
    const r = resolveEvent(copy, eventId, optionId, true);
    if (!("error" in r)) {
      const found: (Chip & { w: number })[] = [];
      for (const m of METRICS) { const d = m.get(copy) - m.get(s); if (Math.abs(d) >= m.min) found.push({ label: m.label, up: d > 0, good: (d > 0) === m.goodWhenUp, w: Math.abs(d) / m.scale }); }
      for (const g of GROUPS) { const d = copy.groupMood[g] - s.groupMood[g]; if (Math.abs(d) >= 1.5) found.push({ label: GNAME[g], up: d > 0, good: d > 0, w: Math.abs(d) / 3 }); }
      const dFx = (copy.eco.fx - s.eco.fx) / s.eco.fx; if (Math.abs(dFx) >= 0.01) found.push({ label: "Naira", up: dFx < 0, good: dFx < 0, w: Math.abs(dFx) * 40 });
      const eff: Record<string, number> = {};
      for (const m of copy.modifiers) if (!before.has(m.id)) for (const [k, v] of Object.entries(m.effects)) eff[k] = (eff[k] ?? 0) + (v as number);
      const lever = chips(eff, 3);
      out = [...found.sort((a, b) => b.w - a.w).map(({ label, up, good }) => ({ label, up, good })), ...lever].filter((c, i, a) => a.findIndex((x) => x.label === c.label) === i).slice(0, max);
    }
  } catch { out = []; }
  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}
