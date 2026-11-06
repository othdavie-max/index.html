/** Plain icon chips for what an event choice does, read from its effects. Choices that run custom code show what they can. */
import type { Fx } from "./events";
import { chips, type Chip } from "./forecast";

const GROUPS: Record<string, string> = { traders: "Traders", farmers: "Farmers", youth: "Youth", workers: "Workers", business: "Business", military: "Army", faith: "Faith leaders" };
export function fxChips(fx: Fx | undefined, max = 4): Chip[] {
  if (!fx) return [];
  const out: (Chip & { w: number })[] = [];
  const add = (label: string, v: number | undefined, goodWhenUp: boolean, w = 1) => { if (v) out.push({ label, up: v > 0, good: (v > 0) === goodWhenUp, w: Math.abs(v) * w }); };
  add("Protest risk", fx.unrest, false, 0.2); add("Trust", fx.trust, true, 1.4); add("Budget", fx.treasury, true, 0.05); add("Safety", fx.insecurity ? -fx.insecurity : 0, true, 0.6);
  add("Scandal risk", fx.evidence, false, 0.6); add("Street anger", fx.anger, false, 0.4); add("Coup risk", fx.coup, false, 0.5); add("World pressure", fx.intl, false, 0.5); add("Democracy", fx.democracy, true, 0.5);
  add("Press freedom", fx.press, true, 0.5); add("Elite loyalty", fx.elite, true, 0.5); add("Human rights", fx.humanRights, true, 0.4); add("Reserves", fx.reserves, true, 0.3); add("Corruption", fx.corruption, false, 0.5);
  for (const [g, v] of Object.entries(fx.groups ?? {})) add(GROUPS[g] ?? g, v as number, true, 0.5);
  const rest = fx.mods ? chips(fx.mods, max) : [];
  return [...out.sort((a, b) => b.w - a.w).map(({ label, up, good }) => ({ label, up, good })), ...rest].filter((c, i, a) => a.findIndex((x) => x.label === c.label) === i).slice(0, max);
}
