import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { W, saveW, myRank, worldMonthly } from "../engine/world";
import { LATE_TEMPLATES, MEGAS, NAIRA_STEPS, blocShare, cancelMega, lateMonthly, megaBlock, megaCost, megas, setFundStyle, startMega } from "../engine/late";
import { ASKS, askBlock, negotiate, travel } from "../engine/diplomacy";
import { createEvent } from "../engine/events";
import { subRng } from "../../game/engine/rng";

const boom = (s: ReturnType<typeof newGame>) => { s.eco.gdpIdx = 900; s.eco.fx = 300; s.eco.priceLevel = 220; s.mil.strength = 85; s.jobs.skills = 85; s.soc.education = 85; s.jobs.productivity = 160; s.foreign.rel = { imf: 80, china: 80, usa: 80, ecowas: 80 }; s.rule.democracy = 85; };
const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e8; s.cap.pc = 100; s.month = 30; s.staff.picked = true; return s; };

describe("success brings its own problems", () => {
  it("a strong Nigeria is troubled by new kinds of events, not the same old ones", () => {
    const s = rich(7001); boom(s); const seen = new Set<string>();
    for (let i = 0; i < 160; i++) { s.month++; worldMonthly(s, subRng(7001, "w", i)); lateMonthly(s, subRng(7001, "l", i)); for (const e of s.events) if (/^late|^era/.test(e.tpl)) { seen.add(e.tpl); e.status = "resolved"; } s.flags.lateAt = -99; }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
  it("every late event can be answered every way and says what happened", () => {
    for (const t of LATE_TEMPLATES) for (const o of t.options) for (const ok of [true, false]) {
      const s = rich(7002); boom(s); s.flags.lateRival = "cn"; W(s); const e = createEvent(s, t.id, "NG-FC"); expect(e, t.id).toBeTruthy();
      const r = respond(s, e!.id, o.id, ok); expect(r.ok === ok || r.ok !== undefined, `${t.id}/${o.id}`).toBe(true); expect(r.message.length, `${t.id}/${o.id}`).toBeGreaterThan(10);
    }
  });
  it("the world is shaken every few years and the table is reshuffled", () => {
    const s = rich(7003); boom(s); s.month = 20; let hits = 0; const slump = () => W(s).c.filter((c) => c.slump).length;
    for (let i = 0; i < 90; i++) { s.month++; lateMonthly(s, subRng(7003, "e", i)); for (const e of s.events) if (/^era/.test(e.tpl) && e.status === "open") { e.status = "resolved"; hits++; } }
    expect(hits).toBeGreaterThanOrEqual(1); expect(W(s).era).toBeGreaterThanOrEqual(1); expect(slump() + W(s).eraLog.length).toBeGreaterThan(0);
    expect(s.news.some((n) => /shakes the world/.test(n.headline))).toBe(true);
  });
  it("each shock makes the rest of the world a little stronger", () => {
    const s = rich(7004); const g0 = W(s).c.reduce((a, c) => a + c.baseG, 0); s.month = 20; for (let i = 0; i < 120; i++) { s.month++; lateMonthly(s, subRng(7004, "g", i)); for (const e of s.events) e.status = "resolved"; }
    expect(W(s).c.reduce((a, c) => a + c.baseG, 0)).toBeGreaterThan(g0);
  });
});

describe("mega-projects never run out", () => {
  it("they cost cash every month, can pause, and pay off when done", () => {
    const s = rich(7010); boom(s); const cash = s.fin.treasury; expect(startMega(s, "university").ok).toBe(true);
    for (let i = 0; i < 31; i++) { s.month++; lateMonthly(s, subRng(7010, "m", i)); for (const e of s.events) e.status = "resolved"; }
    expect(s.fin.treasury).toBeLessThan(cash - 200); expect(megas(s).done.university).toBe(1); expect(s.news.some((n) => /university.*complete/i.test(n.headline))).toBe(true); expect(Number(s.flags.techBoost)).toBeGreaterThan(2);
    const p = rich(7011); startMega(p, "university"); p.fin.treasury = 0; p.month++; lateMonthly(p, subRng(1, "x", 1)); expect(megas(p).run[0].paused).toBe(true);
  });
  it("every one can be built again at a bigger scale", () => {
    const s = rich(7012); boom(s); const c1 = megaCost(s, MEGAS[0]); startMega(s, "university"); for (let i = 0; i < 31; i++) { s.month++; lateMonthly(s, subRng(7012, "m", i)); for (const e of s.events) e.status = "resolved"; }
    expect(megaCost(s, MEGAS[0])).toBeGreaterThan(c1 * 1.5); expect(megaBlock(s, MEGAS[0])).toBeNull();
  });
  it("the biggest dreams unlock after the smaller ones, and three at a time is the limit", () => {
    const s = rich(7013); boom(s); const moon = MEGAS.find((m) => m.id === "moon")!; expect(megaBlock(s, moon)).toMatch(/space programme/i);
    startMega(s, "university"); startMega(s, "space"); startMega(s, "nuclear"); expect(megaBlock(s, MEGAS.find((m) => m.id === "capital")!)).toMatch(/Three mega-projects/);
    expect(cancelMega(s, "space").ok).toBe(true); expect(megas(s).run.length).toBe(2);
  });
  it("the sovereign fund can be invested boldly, and swings", () => {
    const run = (style: string, seed: number) => { const s = rich(seed); s.lend.fund = 1000; setFundStyle(s, style); const v: number[] = []; for (let i = 0; i < 60; i++) { s.month++; lateMonthly(s, subRng(seed, "f", i)); for (const e of s.events) e.status = "resolved"; v.push(s.lend.fund); } return v; };
    const bold = run("bold", 7014); expect(Math.min(...bold)).toBeGreaterThan(0); expect(new Set(bold.map((x) => Math.round(x))).size).toBeGreaterThan(30);
  });
});

describe("the naira abroad", () => {
  it("only a top-10 power can get countries to use the naira, and the steps are announced", () => {
    const s = rich(7020); boom(s); s.flags.africaFirst = 1; travel(s, "gh"); const w = W(s); w.c.find((c) => c.id === "gh")!.rel = 95; saveW(s, w);
    const w1 = W(s); w1.at = "gh"; saveW(s, w1);
    expect(askBlock(s, W(s).c.find((c) => c.id === "gh")!, ASKS.find((a) => a.id === "naira")!)).toMatch(/Prosperity Zone/);
    for (let i = 0; i < 12 && !W(s).bloc.includes("gh"); i++) { const w2 = W(s); w2.at = "gh"; saveW(s, w2); delete (s.flags as Record<string, unknown>).wasks; negotiate(s, "gh", "bloc"); s.month++; }
    expect(W(s).bloc).toContain("gh"); expect(myRank(s)).toBeLessThanOrEqual(10);
    for (let i = 0; i < 12 && !W(s).naira.includes("gh"); i++) { const w3 = W(s); w3.at = "gh"; saveW(s, w3); delete (s.flags as Record<string, unknown>).wasks; negotiate(s, "gh", "naira"); s.month++; }
    expect(W(s).naira).toContain("gh");
    const w4 = W(s); w4.naira = w4.c.filter((c) => c.region !== "americas").map((c) => c.id); w4.bloc = w4.naira; saveW(s, w4);
    expect(blocShare(s)).toBeGreaterThan(NAIRA_STEPS[2].at); lateMonthly(s, subRng(1, "n", 1)); expect(Number(s.flags.nairaStep)).toBe(1); lateMonthly(s, subRng(1, "n", 2)); lateMonthly(s, subRng(1, "n", 3));
    expect(Number(s.flags.nairaStep)).toBe(3); expect(W(s).reserve).toBe(true); expect(s.news.some((n) => /rival to the dollar/i.test(n.headline))).toBe(true);
  });
});

describe("a full run", () => {
  it("ten years of a thriving Nigeria stays eventful and does not crash", () => {
    const s = newGame(7030); s.fin.treasury = 1e8; s.cap.pc = 100; s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary; boom(s);
    for (let y = 0; y < 10; y++) { for (const e of s.events) if (e.status === "open") e.status = "resolved"; boom(s); advanceMonths(s, 12); }
    expect(s.events.filter((e) => /^late|^era/.test(e.tpl)).length).toBeGreaterThan(2);
  });
});
void respond;
