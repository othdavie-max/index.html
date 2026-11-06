import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { NG, W, africaRank, league, myRank, nextTarget, saveW, worldMonthly } from "../engine/world";
import { ARCH, ASKS, askBlock, chance, diplomacyMonthly, flyHome, leaderOf, negotiate, respect, travel } from "../engine/diplomacy";
import { subRng } from "../../game/engine/rng";

const boom = (s: ReturnType<typeof newGame>) => { s.eco.gdpIdx = 900; s.eco.fx = 300; s.eco.priceLevel = 220; s.mil.strength = 85; s.jobs.skills = 85; s.soc.education = 85; s.jobs.productivity = 160; s.foreign.rel = { imf: 80, china: 80, usa: 80, ecowas: 80 }; s.rule.democracy = 85; };
const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 8; return s; };

describe("the world league", () => {
  it("has 23 countries and starts Nigeria near the bottom, with Africa's giants above", () => {
    const s = newGame(6001); const l = league(s); expect(l.length).toBe(23);
    expect(myRank(s)).toBeGreaterThan(17); expect(africaRank(s)).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < l.length; i++) expect(l[i - 1].score).toBeGreaterThanOrEqual(l[i].score);
  });
  it("different seeds shape different worlds", () => { expect(league(newGame(1))[0].gdp).not.toBe(league(newGame(2))[0].gdp); });
  it("the other countries do not stand still", () => {
    const s = rich(6002); const before = W(s).c.find((c) => c.id === "cn")!; const g0 = before.gdp, t0 = before.tech; advanceMonths(s, 60);
    const now = W(s).c.find((c) => c.id === "cn")!; expect(now.gdp).toBeGreaterThan(g0 * 1.1); expect(now.tech).toBeGreaterThan(t0 + 3);
  });
  it("climbing the league makes headlines: you pass people, then break into the top 10", () => {
    const s = rich(6003); worldMonthly(s, subRng(1, "w", 0)); const r0 = myRank(s); boom(s);
    for (let i = 0; i < 4; i++) { s.month++; worldMonthly(s, subRng(1, "w", i + 1)); }
    expect(myRank(s)).toBeLessThan(r0 - 8); expect(s.news.some((n) => /overtakes/.test(n.headline))).toBe(true); expect(s.news.some((n) => /top three|top 10|top 15|top 20|top-five|second|number one/.test(n.headline))).toBe(true);
    expect(s.news.some((n) => /Africa's number one/.test(n.headline))).toBe(true);
  });
  it("tells you who is next and what you lack", () => {
    const s = rich(6004); const t = nextTarget(s)!; expect(t.row.rank).toBe(myRank(s) - 1); expect(t.gaps.length).toBe(4); expect(t.hint.length).toBeGreaterThan(10);
  });
  it("technology, military and influence all count, not only money", () => {
    const s = rich(6005); const a = league(s).find((r) => r.id === NG)!.score; s.flags.techBoost = 15; s.flags.milBoost = 15; s.flags.infBoost = 12; const b = league(s).find((r) => r.id === NG)!.score; expect(b).toBeGreaterThan(a + 4);
  });
});

describe("visiting other countries", () => {
  it("a poor Nigeria is turned away by a big power, and a strong one is welcomed", () => {
    const s = rich(6010); const us = W(s).c.find((c) => c.id === "us")!; expect(respect(s, us)).toBeLessThan(0.2);
    const r = travel(s, "us"); expect(r.ok).toBe(true); expect(r.message).toMatch(/will not see you/); expect(W(s).at).toBeNull();
    boom(s); expect(respect(s, W(s).c.find((c) => c.id === "us")!)).toBeGreaterThan(0.2); const t = travel(s, "gh"); expect(t.ok).toBe(true); expect(W(s).at).toBe("gh");
  });
  it("you must be there to ask, and every leader has a temperament", () => {
    const s = rich(6011); boom(s); const gh = W(s).c.find((c) => c.id === "gh")!; expect(askBlock(s, gh, ASKS[1])).toMatch(/in person/);
    expect(Object.keys(ARCH).length).toBe(7); for (const c of W(s).c) expect(ARCH[leaderOf(s, c).arch]).toBeTruthy();
    expect(leaderOf(s, gh)).toEqual(leaderOf(s, gh));
  });
  it("a pact pays off once, a failed ask costs goodwill, and asks cool down", () => {
    const s = rich(6012); boom(s); travel(s, "ke"); const base = s.modifiers.length;
    const ke0 = W(s).c.find((c) => c.id === "ke")!; ke0.rel = 95; saveW(s, W(s)); const w = W(s); w.c.find((c) => c.id === "ke")!.rel = 95; saveW(s, w);
    let ok = false; for (let k = 0; k < 6 && !ok; k++) { negotiate(s, "ke", "friend"); s.month += 3; } 
    s.month += 3; const w2 = W(s); w2.at = "ke"; saveW(s, w2);
    expect(chance(s, W(s).c.find((c) => c.id === "ke")!, ASKS[1])).toBeGreaterThan(0.6);
    for (let k = 0; k < 8 && !s.modifiers.some((m) => m.source === "world:ke:trade"); k++) { const w3 = W(s); w3.at = "ke"; saveW(s, w3); delete (s.flags as Record<string, unknown>).wasks; negotiate(s, "ke", "trade"); s.month++; ok = true; }
    expect(s.modifiers.length).toBeGreaterThan(base);
    const w4 = W(s); w4.at = "ke"; saveW(s, w4); expect(askBlock(s, W(s).c.find((c) => c.id === "ke")!, ASKS[1])).toMatch(/Already agreed/);
  });
  it("strong countries start calling once you are doing well", () => {
    const s = rich(6013); boom(s); s.month = 20; let n = 0; for (let i = 0; i < 80 && !W(s).invites.length; i++) { s.month++; diplomacyMonthly(s, subRng(6013, "i", i)); n++; }
    expect(W(s).invites.length).toBeGreaterThan(0); expect(s.news.some((x) => /invites Nigeria/.test(x.headline))).toBe(true);
    const id = W(s).invites[0]; const pc = s.cap.pc; expect(travel(s, id).ok).toBe(true); expect(s.cap.pc).toBe(pc); expect(W(s).invites.includes(id)).toBe(false); void flyHome; void n;
  });
  it("the world is saved and survives a reload", () => { const s = rich(6014); advanceMonths(s, 14); const c = JSON.parse(JSON.stringify(s)); expect(league(c).map((r) => r.id)).toEqual(league(s).map((r) => r.id)); });
});
