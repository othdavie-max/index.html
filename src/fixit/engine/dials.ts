/** The three dials of the economy: the interest rate, the naira, and the fuel price. The interest rate is new; the others already exist. */
import type { Effects, FixState } from "./types";
import { addMod, removeMods } from "./util";
import { payPc } from "./meta";

export type RateLevel = -1 | 0 | 1;
export const RATE_LABEL: Record<RateLevel, { name: string; blurb: string }> = {
  [-1]: { name: "Low", blurb: "Cheap credit: more loans and jobs, but prices and the naira suffer." },
  0: { name: "Neutral", blurb: "The central bank sets rates by its own judgement." },
  1: { name: "High", blurb: "Expensive credit cools prices and helps the naira, but costs jobs and raises the government's borrowing bill." },
};
export const rateLevel = (s: FixState): RateLevel => ((Number(s.flags.rate ?? 0) as RateLevel) ?? 0);
const EFFECTS: Record<RateLevel, Effects> = {
  [-1]: { inflation: 1.4, jobs: -0.4, sme: 2, investor: -1, fxSupply: -0.15 },
  0: {},
  1: { inflation: -2.4, fxSupply: 0.25, jobs: 0.5, sme: -2, investor: 1 },
};
export function setRate(s: FixState, level: RateLevel): { ok: boolean; message: string } {
  if (level === rateLevel(s)) return { ok: false, message: "That is where it already is." };
  const cd = Number(s.flags.rateAt ?? -99);
  if (s.month - cd < 3) return { ok: false, message: `The central bank will not change course again so soon (${3 - (s.month - cd)} more months).` };
  const pcE = payPc(s, 3, "move the interest rate"); if (pcE) return { ok: false, message: pcE };
  s.flags.rate = level; s.flags.rateAt = s.month;
  removeMods(s, "dial:rate");
  if (level !== 0) { addMod(s, "dial:rate", `Interest rate: ${RATE_LABEL[level].name.toLowerCase()}`, EFFECTS[level], { duration: null, ramp: 4 }); const m = s.modifiers[s.modifiers.length - 1]; if (m && level === 1) m.monthly = 15; }
  return { ok: true, message: `Interest rates are now ${RATE_LABEL[level].name.toLowerCase()}. ${RATE_LABEL[level].blurb}` };
}
