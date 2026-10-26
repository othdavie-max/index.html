import { I, bump } from "./helpers";
import { GATES } from "./eligibility";
import { transact } from "./ledger";
import { ARCS as A1, type Arc, type Fx } from "./arcsData";
import { ARCS2 } from "./arcsData2";
import type { Choice, EventDef, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

export const ARCS: Arc[] = [...A1, ...ARCS2];
const BY_ID = Object.fromEntries(ARCS.map((a) => [a.id, a])) as Record<string, Arc>;

function apply(q: Player, fx: Fx | undefined, why: string) {
  if (!fx) return;
  if (fx.m) transact(q, { amount: Math.max(-Math.max(0, q.money), Math.round(I(q, fx.m))), reason: why, category: "event" });
  if (fx.h) bump(q, "happiness", fx.h);
  if (fx.s) bump(q, "stress", fx.s);
  if (fx.r) bump(q, "reputation", fx.r);
  if (fx.c) bump(q, "connections", fx.c);
  if (fx.hp) bump(q, "health", fx.hp);
  if (fx.sm) bump(q, "smarts", fx.sm);
  if (fx.fam) q.family.happy = clamp(q.family.happy + fx.fam);
}
const doneArcs = (p: Player): string[] => String(p.flags.arcsDone ?? "").split(",").filter(Boolean);
export const activeArc = (p: Player): Arc | null => (p.flags.arc ? BY_ID[String(p.flags.arc)] ?? null : null);

/** Starts a new story now and then, and moves the current one on by a chapter each year. */
export function arcYear(p: Player, pending: Pending[]) {
  if (p.prison > 0 || p.age < 12) return;
  const a = activeArc(p);
  if (a) {
    if (p.age >= Number(p.flags.arcAt ?? 0)) pending.push({ kind: "event", id: `arc_${a.id}_${Number(p.flags.arcStep ?? 0)}`, data: { month: randInt(1, 12) } });
    return;
  }
  if (p.age - Number(p.flags.arcLast ?? -10) < 4 || !chance(0.16)) return;
  const pool = ARCS.filter((x) => p.age >= x.ages[0] && p.age <= x.ages[1] && !doneArcs(p).includes(x.id) && (!x.rented || p.housing.type === "rented"));
  if (!pool.length) return;
  const n = pick(pool);
  p.flags.arc = n.id; p.flags.arcStep = 0; p.flags.arcScore = 0; p.flags.arcAt = p.age;
  pending.push({ kind: "event", id: `arc_${n.id}_0`, data: { month: randInt(1, 12) } });
}

function stepEvent(a: Arc, n: number): EventDef {
  const id = `arc_${a.id}_${n}`;
  GATES[id] = { minAge: Math.max(12, a.ages[0]) };
  const st = a.steps[n];
  return {
    id,
    title: dual(`${a.emoji} ${a.title[0]} · ${n + 1}/3`, `${a.emoji} ${a.title[1]} · ${n + 1}/3`),
    weight: () => 0,
    valid: (p) => p.flags.arc === a.id && Number(p.flags.arcStep ?? 0) === n,
    text: () => T(st.text[0], st.text[1]),
    choices: (p): Choice[] => st.choices.map((c) => ({
      label: T(c.label[0], c.label[1]),
      sub: c.cost ? naira(I(p, c.cost)) : undefined,
      disabled: c.cost && p.money < I(p, c.cost) ? T("Not enough cash", "Cash no reach") : false,
      run: (q: Player) => {
        if (c.cost) transact(q, { amount: -Math.round(I(q, c.cost)), reason: T(a.title[0], a.title[1]), category: "event" });
        apply(q, c.fx, T(a.title[0], a.title[1]));
        q.flags.arcScore = Number(q.flags.arcScore ?? 0) + (c.score ?? 0);
        const said = T(c.text[0], c.text[1]);
        if (n < 2) {
          q.flags.arcStep = n + 1; q.flags.arcAt = q.age + 1;
          return `${said}\n\n${T("⏳ To be continued next year...", "⏳ E go continue next year...")}`;
        }
        const good = Number(q.flags.arcScore) + rand(-1.2, 1.2) >= 1.5;
        const end = good ? a.good : a.bad;
        apply(q, end.fx, T(a.title[0], a.title[1]));
        delete q.flags.arc; delete q.flags.arcStep; delete q.flags.arcAt; delete q.flags.arcScore;
        q.flags.arcLast = q.age;
        q.flags.arcsDone = [...doneArcs(q), a.id].join(",");
        return `${said}\n\n${good ? "🎉" : "😔"} ${T(end.text[0], end.text[1])}`;
      },
    })),
  };
}

export const ARC_EVENTS: EventDef[] = ARCS.flatMap((a) => [0, 1, 2].map((n) => stepEvent(a, n)));
