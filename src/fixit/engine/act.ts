/** Authoritarian and abusive acts all leave the same marks on the danger meters. Leaf module: imports nothing from the engine. */
import type { FixState } from "./types";
import { clamp, clamp100 } from "./util";

export function act(s: FixState, id: string, d: { democracy?: number; anger?: number; intl?: number; elite?: number; coup?: number; press?: number; judiciary?: number; trust?: number }) {
  const p = s.rule;
  p.acts.push(id); if (p.acts.length > 60) p.acts.shift();
  p.abuse = clamp(p.abuse + Math.max(0, -(d.democracy ?? 0)), 0, 120);
  p.democracy = clamp100(p.democracy + (d.democracy ?? 0));
  p.streetAnger = clamp100(p.streetAnger + (d.anger ?? 0));
  p.intlPressure = clamp100(p.intlPressure + (d.intl ?? 0));
  p.eliteLoyalty = clamp100(p.eliteLoyalty + (d.elite ?? 0));
  p.coupRisk = clamp100(p.coupRisk + (d.coup ?? 0));
  p.pressFreedom = clamp100(p.pressFreedom + (d.press ?? 0));
  p.judiciary = clamp100(p.judiciary + (d.judiciary ?? 0));
  if (d.trust) s.gov.trust = clamp100(s.gov.trust + d.trust);
  s.flags.lastActMonth = s.month;
}
