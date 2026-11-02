import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { CAMPAIGNS, FUN_TEMPLATES, TITLES, earnedTitles, frontPage, funMonthly, ramadanMonth } from "../engine/fun";
import { topicOf } from "../engine/social";
import { subRng } from "../../game/engine/rng";

const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 10; s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary; return s; };

describe("the fun layer", () => {
  it("every new event can be answered every way, lucky or not, and says what happened", () => {
    for (const t of FUN_TEMPLATES) for (const o of t.options) for (const ok of [true, false]) {
      const s = rich(9100); s.flags.afconRoll = 0.1; const e = createEvent(s, t.id, "NG-FC"); expect(e, t.id).toBeTruthy();
      const r = respond(s, e!.id, o.id, ok); expect(r.message.length, `${t.id}/${o.id}/${ok}`).toBeGreaterThan(8);
    }
  });
  it("story campaigns run through three chapters and can be won", () => {
    for (const c of CAMPAIGNS) {
      const s = rich(9101); s.flags.campActive = c.id; s.flags[`camp:${c.id}`] = 1; s.flags.campNext = 0; s.foreign.rel = { imf: 90, china: 90, usa: 90, ecowas: 90 }; s.rule.coupRisk = 10;
      for (let step = 1; step <= 3; step++) {
        funMonthly(s, subRng(1, c.id, step)); const e = s.events.find((x) => x.tpl === `camp_${c.id}_${step}` && x.status === "open"); expect(e, `${c.id} ${step}`).toBeTruthy();
        respond(s, e!.id, e!.options[0].id, true as never); s.month += 3;
      }
      expect(Number(s.flags[`camp:${c.id}`])).toBe(4); expect(s.flags.campActive).toBeUndefined();
    }
    const s = rich(9102); s.flags.campActive = "oil"; s.flags["camp:oil"] = 1; s.flags.campNext = 0;
    for (let step = 1; step <= 3; step++) { funMonthly(s, subRng(2, "o", step)); const e = s.events.find((x) => x.tpl === `camp_oil_${step}` && x.status === "open")!; respond(s, e.id, step === 3 ? "trial" : step === 1 ? "quiet" : "arrest", true as never); s.month += 3; }
    expect(s.flags["title:cartelBreaker"]).toBeDefined();
  });
  it("the calendar brings Detty December, Ramadan, the rains, JAMB and AFCON", () => {
    const s = rich(9103); s.month = 0; for (let i = 0; i < 40; i++) { s.month++; funMonthly(s, subRng(9103, "c", i)); for (const e of s.events) e.status = "resolved"; }
    const src = s.news.map((n) => n.source.split(":")[0]);
    for (const k of ["detty", "ramadan", "sallah", "rains", "oct1"]) expect(src, k).toContain(k);
    expect(s.events.some((e) => e.tpl === "calJamb")).toBe(true); expect(s.events.some((e) => e.tpl === "calAfcon")).toBe(true);
    expect(ramadanMonth(2025)).toBe(2); expect(ramadanMonth(2028)).toBeLessThan(2);
  });
  it("press conferences ask about your real record", () => {
    const s = rich(9104); s.me.evidence = 60; const e = createEvent(s, "pressConf", "NG-FC")!; expect(e.cause).toMatch(/rich|thieves/);
    const t = rich(9105); t.eco.foodInflation = 40; t.me.evidence = 0; t.promises = []; const e2 = createEvent(t, "pressConf", "NG-FC")!; expect(e2.cause).toMatch(/rice/);
  });
  it("cabinet meetings, press conferences and crises arrive by themselves", () => {
    const s = rich(9106); s.rule.coupRisk = 40; const seen = new Set<string>();
    for (let i = 0; i < 120; i++) { s.month++; funMonthly(s, subRng(9106, "m", i)); for (const e of s.events) { seen.add(e.tpl); e.status = "resolved"; } }
    expect(seen.has("cabinetMeeting")).toBe(true); expect(seen.has("pressConf")).toBe(true); expect([...seen].some((x) => x.startsWith("crisis"))).toBe(true);
  });
  it("titles are earned from how you rule, and the front page reflects the month", () => {
    const s = rich(9107); s.eco.foodInflation = 5; s.gov.approval = 80; funMonthly(s, subRng(1, "t", 1));
    const got = earnedTitles(s).map((x) => x.id); expect(got).toContain("foodBasket"); expect(got).toContain("peoples"); expect(TITLES.length).toBeGreaterThanOrEqual(16);
    expect(s.news.some((n) => /new name for their president/.test(n.headline))).toBe(true);
    const fp = frontPage(s, topicOf); expect(fp.headline.length).toBeGreaterThan(10); expect(fp.prices.length).toBe(3); expect(fp.paper).toMatch(/[A-Z]/);
  });
  it("a long game with everything on stays stable", () => { const s = rich(9108); advanceMonths(s, 60); expect(s.month).toBeGreaterThan(30); });
});

describe("people at the start", () => {
  it("each game deals a different, varied line-up with women and men, quirks and stories", async () => {
    const { cosCandidates, vpCandidates } = await import("../engine/dayone");
    const kinds = new Set<string>(), bios = new Set<string>(); let women = 0, men = 0;
    for (let seed = 1; seed <= 40; seed++) { const s = newGame(seed); for (const a of [...cosCandidates(s), ...vpCandidates(s)]) { kinds.add(a.kind); bios.add(a.bio); if (a.female) women++; else men++; expect(a.quirk).toBeTruthy(); expect(a.bio).not.toMatch(/\{/); } expect(new Set(cosCandidates(s).map((a) => a.kind)).size).toBe(4); }
    expect(kinds.size).toBeGreaterThanOrEqual(12); expect(bios.size).toBeGreaterThan(30); expect(women).toBeGreaterThan(40); expect(men).toBeGreaterThan(40);
    const lineups = new Set([1, 2, 3, 4, 5, 6].map((sd) => cosCandidates(newGame(sd)).map((a) => a.kind).join())); expect(lineups.size).toBeGreaterThan(3);
  });
  it("the inner circle does not repeat the same line every month", async () => {
    const { cast } = await import("../engine/meta");
    const s = rich(9200); const lines = new Set<string>(); for (let i = 0; i < 12; i++) { s.month++; lines.add(cast(s).find((f) => f.id === "general")!.line); }
    expect(lines.size).toBeGreaterThan(1);
  });
});
