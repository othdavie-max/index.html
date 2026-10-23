import { npcAge, npcsByRole } from "./family";
import { bump } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Npc, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

/** How a parent leaves the estate. Most split it equally; some favour a child. */
export type HeirStyle = "equal" | "nice" | "one" | "none";

const first = (n: Npc | null | undefined) => (n ? n.name.split(" ")[0] : T("Your parent", "Your parent"));

/** What the family owns at the death of the last parent, in today's naira. */
export function familyEstate(p: Player, parent: Npc): number {
  const years = clamp(npcAge(p, parent), 40, 85) - 25;
  const wealth = p.fam.income * Math.pow(p.index, 0.9) * (1.2 + years * 0.12);
  return Math.max(0, Math.round(wealth - p.fam.debts * Math.pow(p.index, 0.9)));
}

function styleFor(parent: Npc): HeirStyle {
  // A strict, materialistic parent is more likely to play favourites; a generous one splits fairly.
  const favour = 0.12 + (parent.materialism - 50) / 400 + (parent.strictness - 50) / 500;
  const r = rand(0, 1);
  if (r < 0.1) return "none";
  if (r < 0.1 + clamp(favour, 0.05, 0.3)) return "nice";
  if (r < 0.1 + clamp(favour, 0.05, 0.3) + 0.06) return "one";
  return "equal";
}

export interface Split { me: number; siblings: { id: string; pct: number }[]; style: HeirStyle; favourite: string | null }

/** The share each child gets, as fractions of the estate. */
export function splitEstate(p: Player, parent: Npc, style: HeirStyle): Split {
  const sibs = npcsByRole(p, "sibling");
  const kids = [{ id: "me", c: parent.closeness }, ...sibs.map((s) => ({ id: s.id, c: s.closeness + (s.generosity - 50) / 3 }))];
  const n = kids.length;
  const share = (map: Record<string, number>): Split => ({ me: map.me, siblings: sibs.map((s) => ({ id: s.id, pct: map[s.id] })), style, favourite: null });
  if (style === "equal" || style === "none" || n === 1) return share(Object.fromEntries(kids.map((k) => [k.id, 1 / n])));
  if (style === "nice") {
    const fav = kids.reduce((a, b) => (b.c > a.c ? b : a));
    const map = Object.fromEntries(kids.map((k) => [k.id, k.id === fav.id ? 0.65 : 0.35 / (n - 1)]));
    return { ...share(map), favourite: fav.id };
  }
  const fav = pick(kids);
  return { ...share(Object.fromEntries(kids.map((k) => [k.id, k.id === fav.id ? 1 : 0]))), favourite: fav.id };
}

/** Called when a mother or father dies. The last parent's death opens the will. */
export function parentEstate(p: Player, dead: Npc, lines: string[], pending: Pending[]) {
  const other = npcsByRole(p, "dad", "mom").find((n) => n.alive && n.id !== dead.id);
  if (other) {
    // The surviving spouse inherits first.
    lines.push(T(`${first(other)} inherits everything for now.`, `${first(other)} inherit everything for now.`));
    return;
  }
  const estate = familyEstate(p, dead);
  if (estate < 2_000_000) return;
  const style = styleFor(dead);
  const split = splitEstate(p, dead, style);
  const mine = Math.round(estate * split.me);
  pending.push({ kind: "event", id: "parent_estate", data: { who: dead.name, estate, style, mine, fav: split.favourite ?? "", sibs: JSON.stringify(split.siblings), month: randInt(1, 12) } });
}

const styleText = (style: string, mine: number, estate: number) => {
  if (style === "none") return T("There is no will, so the family splits it by custom, which means arguments.", "No will dey, so family go share am by custom, e mean say quarrel dey.");
  if (style === "nice") return T("The will favours the child who stayed closest.", "The will favour the pikin wey stay close.");
  if (style === "one") return T("The will leaves nearly everything to a single child.", "The will leave almost everything for one pikin.");
  return T("The will splits it equally between all the children.", "The will share am equally between all the pikin.");
};

export const PARENT_EVENTS: EventDef[] = [
  {
    id: "parent_estate",
    title: dual("The will is read", "Dem read the will"),
    weight: () => 0,
    text: (p, d) => {
      const mine = Number(d.mine ?? 0);
      const estate = Number(d.estate ?? 0);
      const body = mine > 0
        ? T(`You inherit ${naira(mine)} of an estate worth about ${naira(estate)}.`, `You inherit ${naira(mine)} from estate wey reach ${naira(estate)}.`)
        : T(`The estate is worth about ${naira(estate)}, but you are left out.`, `The estate reach ${naira(estate)}, but dem leave you out.`);
      return T(`The family gathers to read ${String(d.who)}'s will. ${styleText(String(d.style), mine, estate)} ${body}`, `Family gather to read ${String(d.who)} will. ${styleText(String(d.style), mine, estate)} ${body}`);
    },
    choices: (p, d) => {
      const mine = Number(d.mine ?? 0);
      const sibs = JSON.parse(String(d.sibs ?? "[]")) as { id: string; pct: number }[];
      const estate = Number(d.estate ?? 0);
      const bank = (q: Player, amt: number, why: string) => { if (amt > 0) transact(q, { amount: amt, reason: why, category: "inheritance" }); };
      const reason = T(`Inheritance from ${String(d.who)}`, `Inheritance from ${String(d.who)}`);
      const choices = [
        { label: T("Accept your share", "Take your share"), sub: mine > 0 ? naira(mine) : undefined, run: (q: Player) => {
          bank(q, mine, reason);
          for (const s of sibs) { const n = q.npcs[s.id]; if (n && mine > 0 && s.pct < 0.1 && String(d.style) !== "equal") n.closeness = clamp(n.closeness - 6); }
          if (mine > 0 && String(d.style) === "nice" && d.fav !== "me") bump(q, "happiness", -4);
          bump(q, "happiness", mine > 0 ? 2 : -6);
          return mine > 0 ? T(`${naira(mine)} lands in your account. It does not bring them back.`, `${naira(mine)} enter your account. E no fit bring dem back.`) : T("You sign the papers quietly.", "You sign the papers quietly.");
        } },
      ];
      if (sibs.length > 0 && mine > 0) {
        choices.push({ label: T("Share with your siblings equally", "Share am equal with your siblings"), sub: naira(Math.round(mine / (sibs.length + 1))), run: (q: Player) => {
          const each = Math.round((estate - 0) / (sibs.length + 1));
          bank(q, Math.max(each, 0), reason);
          for (const s of sibs) { const n = q.npcs[s.id]; if (n) n.closeness = clamp(n.closeness + 8); }
          bump(q, "reputation", 3);
          return T("Everyone is taken care of. The family talks about it for years.", "Everybody get something. The family go dey talk am for years.");
        } });
      }
      if (String(d.style) !== "equal" && sibs.length > 0 && Number(d.mine) < estate / (sibs.length + 1)) {
        choices.push({ label: T("Contest it in court", "Take am go court"), sub: T("Costly, could go either way", "E cost, fit go any side"), run: (q: Player) => {
          const fee = Math.min(q.money, Math.round(estate * 0.05));
          if (fee > 0) transact(q, { amount: -fee, reason: T("Legal fees contesting the will", "Lawyer fees for will case"), category: "legal" });
          for (const s of sibs) { const n = q.npcs[s.id]; if (n) n.closeness = clamp(n.closeness - 12); }
          if (chance(0.45)) { const eq = Math.round(estate / (sibs.length + 1)); bank(q, eq, reason); return T(`The court orders an equal split: ${naira(eq)} to you. The family is not speaking.`, `Court order equal share: ${naira(eq)} for you. Family no dey talk.`); }
          bump(q, "stress", 6);
          return T("The court upholds the will. You lose the case and the siblings.", "Court uphold the will. You lose the case and your siblings.");
        } });
      }
      return choices;
    },
  },
];

/** Leaving a spouse or children out of your will upsets them. Called yearly. */
export function willReactions(p: Player, lines: string[]) {
  const shares = p.will?.shares;
  if (!shares || shares.length === 0) return;
  const total = shares.reduce((s, x) => s + x.pct, 0) || 100;
  const pct = (id: string) => ((shares.find((s) => s.id === id)?.pct ?? 0) / total) * 100;
  const kidsPct = p.kids.reduce((s, _, i) => s + pct(`kid:${i}`), 0);
  const spousePct = p.spouse ? pct("spouse") : 0;
  if (p.spouse && p.kids.length > 0 && spousePct < 10 && kidsPct > 80) {
    p.spouse.happy = clamp(p.spouse.happy - 8);
    const sp = p.spouse.npcId ? p.npcs[p.spouse.npcId] : null;
    if (sp) sp.closeness = clamp(sp.closeness - 6);
    lines.push(T(`${p.spouse.name} found out the will leaves almost nothing to them, and is hurt.`, `${p.spouse.name} know say your will leave almost nothing for am, e pain am.`));
  }
  if (p.spouse && p.kids.length > 0 && kidsPct < 10 && spousePct > 80) {
    for (const k of p.kids) k.closeness = clamp((k.closeness ?? 50) - 8);
    lines.push(T("Your children heard that everything goes to your spouse, and they are angry.", "Your pikin hear say everything go your spouse, dem vex."));
  }
  if (p.kids.length > 1) {
    p.kids.forEach((k, i) => {
      if (pct(`kid:${i}`) === 0 && kidsPct > 0) {
        k.closeness = clamp((k.closeness ?? 50) - 6);
        lines.push(T(`${k.name} learns they are not in your will.`, `${k.name} learn say dem no dey your will.`));
      }
    });
  }
}

/** A warning shown while editing the will, so the player knows who it upsets. */
export function willWarning(p: Player): string | null {
  const tmp: string[] = [];
  const copy = structuredClone(p);
  willReactions(copy, tmp);
  return tmp.length ? T("Careful: ", "Careful: ") + tmp[0] : null;
}
