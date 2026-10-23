import { I, bump } from "./helpers";
import { GATES } from "./eligibility";
import { transact } from "./ledger";
import type { Choice, EventDef, Player } from "./types";
import { T, chance, dual, naira } from "./util";

/**
 * Everyday Nigerian situations. They are deliberately rare (each shows up in only a small share of lives)
 * and each offers a real choice with a cost, a risk or both. Written as data so more can be added easily.
 */
export type L = [string, string];
type Need = "phone" | "smartphone" | "laptop" | "job" | "noJob" | "spouse" | "house" | "school";

/** Effects. `m` is money in today's naira; the rest are stat changes. */
export interface Fx { m?: number; h?: number; s?: number; hp?: number; r?: number; c?: number; sm?: number; f?: number; fam?: number }
export interface Ch {
  label: L;
  text: L;
  fx?: Fx;
  /** Shown on the button and required in cash. */
  cost?: number;
  bad?: { p: number; text: L; fx?: Fx };
}
export interface Scn {
  id: string;
  title: L;
  text: L;
  ages: [number, number];
  /** Rarity: roughly 0.3 to 1. Typical events in the game sit between 2 and 8. */
  w: number;
  needs?: Need[];
  when?: (p: Player) => boolean;
  choices: Ch[];
}

function apply(q: Player, fx: Fx | undefined, why: L) {
  if (!fx) return;
  if (fx.m) transact(q, { amount: I(q, fx.m), reason: T(why[0], why[1]), category: "event" });
  if (fx.h) bump(q, "happiness", fx.h);
  if (fx.s) bump(q, "stress", fx.s);
  if (fx.hp) bump(q, "health", fx.hp);
  if (fx.r) bump(q, "reputation", fx.r);
  if (fx.c) bump(q, "connections", fx.c);
  if (fx.sm) bump(q, "smarts", fx.sm);
  if (fx.f) bump(q, "fitness", fx.f);
  if (fx.fam) q.family.happy = Math.max(0, Math.min(100, q.family.happy + fx.fam));
}

/** Scales every scenario weight down so any one of them is met in only a small share of lives. */
const RARITY = 0.28;

export function scenarioDef(s: Scn): EventDef {
  GATES[s.id] = { minAge: s.ages[0], maxAge: s.ages[1], needs: s.needs };
  return {
    id: s.id,
    title: dual(s.title[0], s.title[1]),
    weight: (p) => (!s.when || s.when(p) ? s.w * RARITY : 0),
    text: () => T(s.text[0], s.text[1]),
    choices: (p): Choice[] => {
      const list: Choice[] = s.choices.map((c) => ({
      label: T(c.label[0], c.label[1]),
      sub: c.cost ? naira(I(p, c.cost)) : undefined,
      disabled: c.cost && p.money < I(p, c.cost) ? T("Not enough cash", "Cash no reach") : false,
      run: (q: Player) => {
        apply(q, c.cost ? { ...c.fx, m: (c.fx?.m ?? 0) - c.cost } : c.fx, s.title);
        let out = T(c.text[0], c.text[1]);
        if (c.bad && chance(c.bad.p)) {
          apply(q, c.bad.fx, s.title);
          out += ` ${T(c.bad.text[0], c.bad.text[1])}`;
        }
        return out;
      },
      }));
      // Nobody should be stuck on a screen they cannot pay their way out of.
      if (list.every((x) => x.disabled)) list.push({ label: T("Do nothing", "Do nothing"), sub: undefined, disabled: false, run: (q) => { bump(q, "stress", 3); return T("You cannot afford any of it, so you let it pass and feel bad about it.", "You no fit afford any of am, so you let am pass and e pain you."); } });
      return list;
    },
  };
}
