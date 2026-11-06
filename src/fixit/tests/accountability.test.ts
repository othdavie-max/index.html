import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { appoint, warnMinister, warnMult } from "../engine/cabinet";
import { BACKER_GIFTS, giveGift, prosecuteGovernor, prosecuteMinister } from "../engine/officials";
import { activeEnemies } from "../engine/ripples";
import { punish, sitting, amendConstitution } from "../engine/power";
import { billChance } from "../engine/politics";
import { evaluateTermEnd, refuseToLeave } from "../engine/legacy";
import { finishDayOne } from "../engine/dayone";
import { backerSupport } from "../engine/backers";
import type { FixState } from "../engine/types";

const hire = (s: FixState, faction: "technocrat" | "crony") => { for (const p of ["finance", "cbn", "agriculture", "power", "works", "security"] as const) appoint(s, p, s.cabinet.pool.find((m) => m.portfolio === p && m.faction === faction)!.id); };

describe("officials are mortal", () => {
  it("an executed minister is gone for good: not in the cabinet, not in the pool, listed as gone", () => {
    const s = newGame(801); s.rule.lawLevel = 4; const m = s.cabinet.members.finance!;
    const msg = prosecuteMinister(s, "finance");
    expect(msg).toMatch(/sentenced to death/);
    expect(s.cabinet.members.finance).toBeUndefined();
    expect(s.cabinet.pool.some((x) => x.id === m.id)).toBe(false);
    expect(s.gone.find((g) => g.id === m.id)?.how).toBe("executed");
    expect(s.rule.executions).toBe(1);
    advanceMonths(s, 40);
    expect(Object.values(s.cabinet.members).some((x) => x?.id === m.id)).toBe(false);
  });
  it("other ministers take notice: honest but afraid", () => {
    const s = newGame(802); s.rule.lawLevel = 4; const other = s.cabinet.members.cbn!, i0 = other.integrity, mo0 = other.mood;
    prosecuteMinister(s, "finance");
    expect(other.integrity).toBeGreaterThan(i0); expect(other.mood).toBeLessThan(mo0);
  });
  it("weak law means a reprimand, and he stays", () => {
    const s = newGame(803); const m = s.cabinet.members.finance!;
    prosecuteMinister(s, "finance");
    expect(s.cabinet.members.finance?.id).toBe(m.id); expect(s.gone.length).toBe(0);
  });
  it("a jailed minister comes out after his sentence, and becomes an enemy", () => {
    const s = newGame(804); s.rule.lawLevel = 2; const m = s.cabinet.members.works!;
    prosecuteMinister(s, "works");
    expect(s.gone.find((g) => g.id === m.id)?.how).toBe("jailed");
    advanceMonths(s, 33);
    expect(s.gone.find((g) => g.id === m.id)?.how).toBe("released");
    expect(activeEnemies(s).some((e) => m.name.includes(e.name) || e.reason.includes("jailed"))).toBe(true);
  });
  it("a governor can be executed and is replaced by a new face; the old one never returns", () => {
    const s = newGame(805); s.rule.lawLevel = 4; const g = s.governors.find((x) => x.zone === "NW")!, name = g.name;
    prosecuteGovernor(s, "NW");
    expect(s.governors.find((x) => x.zone === "NW")!.name).not.toBe(name);
    expect(s.governors.some((x) => x.name === name)).toBe(false);
    expect(s.gone.some((x) => x.name.includes(name) && x.how === "executed")).toBe(true);
    advanceMonths(s, 30); expect(s.governors.some((x) => x.name === name)).toBe(false);
  });
  it("jailed lawmakers are released later and come back as enemies", () => {
    const s = newGame(806); s.rule.lawLevel = 2; const lm = s.lawmakers[0]; lm.stolen = 90; lm.evidence = 90;
    punish(s, lm, "case");
    expect(lm.status).toBe("jailed"); expect(lm.releaseAt).toBeGreaterThan(s.month);
    advanceMonths(s, 32);
    expect(lm.status).toBe("released");
    expect(sitting(s).some((x) => x.id === lm.id)).toBe(false);
    expect(s.enemies.some((e) => e.id === `rel-${lm.id}`)).toBe(true);
  });
  it("life and death sentences never come out", () => {
    const s = newGame(807); s.rule.lawLevel = 3; const lm = s.lawmakers[1]; lm.stolen = 90; lm.evidence = 90; punish(s, lm, "case");
    advanceMonths(s, 60); expect(lm.status).toBe("jailed");
  });
  it("a minister scandal offers a real prosecution that follows the law", () => {
    const s = newGame(808); s.rule.lawLevel = 4; s.rule.judiciary = 100; s.fin.treasury = 1e5;
    let dead = 0;
    for (let i = 0; i < 8; i++) { const t = newGame(810 + i); t.rule.lawLevel = 4; t.rule.judiciary = 100; t.fin.treasury = 1e5; t.flags.scandalMinister = "finance"; const e = createEvent(t, "ministerScandal", "NG-FC")!; expect(e.options.map((o) => o.id)).toContain("prosecute"); respond(t, e.id, "prosecute"); if (t.gone.length) dead++; }
    expect(dead).toBeGreaterThan(4);
  });
});

describe("warning appointees", () => {
  it("warned ministers steal less, but your own people resent it", () => {
    const s = newGame(820); hire(s, "crony"); const m = s.cabinet.members.finance!, mood0 = m.mood, b0 = s.backers[0].mood;
    warnMinister(s, "finance");
    expect(m.warned).toBeDefined(); expect(m.mood).toBeLessThan(mood0); expect(s.backers[0].mood).toBeLessThan(b0);
    expect(warnMult(s, m)).toBeLessThan(0.75);
    expect(warnMinister(s, "finance").ok).toBe(false);
  });
  it("a warning you do not enforce becomes worthless", () => {
    const s = newGame(821); hire(s, "crony"); warnMinister(s, "finance"); s.fin.treasury = 1e5;
    s.flags.scandalMinister = "finance"; const e = createEvent(s, "ministerScandal", "NG-FC")!; const t0 = s.gov.trust;
    respond(s, e.id, "defend");
    expect(s.flags.hollowWarn).toBeDefined(); expect(s.gov.trust).toBeLessThan(t0);
    expect(warnMult(s, s.cabinet.members.finance!)).toBe(1);
  });
});

describe("backers expect something, and there is a way around them", () => {
  const dayOne = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e5; hire(s, "technocrat"); finishDayOne(s); return s; };
  it("snubbing them with a technocrat cabinet brings an ultimatum in the first month", () => {
    const s = dayOne(830); advanceMonths(s, 2);
    expect(s.events.some((e) => e.tpl === "backerUltimatum")).toBe(true);
  });
  it("holding the line has immediate consequences: weaker Assembly, blocked budget, a snub chain", () => {
    const s = dayOne(831); advanceMonths(s, 2);
    const e = s.events.find((x) => x.tpl === "backerUltimatum")!; const a0 = s.assembly.support, b = billChance(s, "budget");
    respond(s, e.id, "hold");
    expect(s.assembly.support).toBeLessThan(a0 - 5);
    expect(billChance(s, "budget")).toBeLessThan(b - 0.15);
    advanceMonths(s, 4);
    expect(s.news.some((n) => n.headline.includes("we made you"))).toBe(true);
  });
  it("giving their nominees deputy posts is a way around it", () => {
    const s = dayOne(832); advanceMonths(s, 2);
    const e = s.events.find((x) => x.tpl === "backerUltimatum")!; const m0 = s.backers.reduce((a, b) => a + b.mood, 0);
    respond(s, e.id, "deputies");
    expect(s.backers.reduce((a, b) => a + b.mood, 0)).toBeGreaterThan(m0 + 15);
    expect(s.flags.deputies).toBeDefined();
  });
  it("a promise to give them jobs later is checked, and broken promises hurt", () => {
    let hurt = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const s = dayOne(840 + seed); advanceMonths(s, 2);
      const e = s.events.find((x) => x.tpl === "backerUltimatum")!; respond(s, e.id, "promise");
      if (!String(s.flags.mems).includes("backerJobs")) continue;
      advanceMonths(s, 10);
      if (s.news.some((n) => n.headline.includes("he lied"))) hurt++;
    }
    expect(hurt).toBeGreaterThan(3);
  });
  it("gifts please a backer, cost something and cool down", () => {
    const s = newGame(850); s.fin.treasury = 1e5; const b = s.backers[0]; b.mood = 20; const c0 = s.gov.corruption;
    expect(giveGift(s, b.id, "oilblock").ok).toBe(true);
    expect(b.mood).toBeGreaterThan(40); expect(s.gov.corruption).toBeGreaterThan(c0);
    expect(giveGift(s, b.id, "oilblock").ok).toBe(false);
    expect(BACKER_GIFTS.length).toBeGreaterThanOrEqual(4);
    expect(backerSupport(s)).toBeDefined();
  });
});

describe("staying on has real consequences", () => {
  const atEnd = (seed: number) => { const s = newGame(seed); s.term = 2; s.termStart = s.month; s.month = s.termStart + 48; s.processed = s.month - 1; evaluateTermEnd(s); return s; };
  it("the end of the last term offers a choice, not an automatic win", () => {
    const s = atEnd(860);
    expect(s.ended?.overstay).toBe(true); expect(s.done).toBe(true);
  });
  it("refusing to leave triggers a chain: ECOWAS, the court, governors, officers, a general strike", () => {
    const s = atEnd(861); const d0 = s.rule.democracy;
    expect(refuseToLeave(s).ok).toBe(true);
    expect(s.done).toBe(false); expect(s.ended).toBeNull(); expect(s.rule.democracy).toBeLessThan(d0 - 25);
    advanceMonths(s, 9);
    const heads = s.news.map((n) => n.headline);
    for (const h of ["ECOWAS suspends Nigeria", "The Supreme Court rules against you", "Governors choose sides", "Officers meet in secret", "A general strike"]) expect(heads).toContain(h);
    expect(s.events.some((e) => e.tpl === "courtChallenge")).toBe(true);
    expect(s.enemies.length).toBeGreaterThanOrEqual(2);
  });
  it("obeying the court ends it: you leave", () => {
    const s = atEnd(862); refuseToLeave(s); advanceMonths(s, 3);
    const e = s.events.find((x) => x.tpl === "courtChallenge" && x.status === "open")!; respond(s, e.id, "obey");
    advanceMonths(s, 2);
    expect(s.done).toBe(true);
  });
  it("overstaying again is worse", () => {
    const a = atEnd(863), b = atEnd(863); refuseToLeave(a);
    refuseToLeave(b); b.flags.overstays = 2; const before = b.rule.coupRisk; b.ended = { kind: "term", text: "x", overstay: true }; b.done = true; b.terms.push({ term: 2, result: "completed", start: b.baseline, end: b.baseline, title: "t", months: 48 }); refuseToLeave(b);
    expect(b.rule.coupRisk).toBeGreaterThan(before);
  });
  it("scrapping term limits is hard without a loyal Assembly, and sets off a chain when it passes", () => {
    const s = newGame(864); for (const l of s.lawmakers) l.loyalty = 25; s.assembly.support = 70;
    expect(billChance(s, "amendment")).toBeLessThan(0.15);
    const t = newGame(864); for (const l of t.lawmakers) l.loyalty = 85; t.assembly.support = 80;
    expect(billChance(t, "amendment")).toBeLessThan(0.3); // even a loyal Assembly needs lobbying, bribes and favours
    t.assembly.lobby.amendment = 25;
    expect(billChance(t, "amendment")).toBeGreaterThan(0.5);
    amendConstitution(t); advanceMonths(t, 8);
    expect(t.news.some((n) => n.headline === "Opposition walks out")).toBe(true);
    expect(t.news.some((n) => n.headline === "ECOWAS and the AU express alarm")).toBe(true);
    expect(t.events.some((e) => e.tpl === "courtChallenge")).toBe(true);
  });
});
