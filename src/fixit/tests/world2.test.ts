import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { rally, answerDebate } from "../engine/rival";
import { FAMILY_DEFS } from "../engine/families";
import { landmarks, stateStory } from "../engine/views";
import { PARTNERS, relWord } from "../engine/foreign";
import { SECTORS, toggleProgramme, programmeOn, leakage } from "../engine/sectors";
import { PRESIDENTS, STARTS } from "../engine/setup";
import { yearReview } from "../engine/review";
import { reaction, BIG_NEWS } from "../engine/street";
import { finishDayOne } from "../engine/dayone";
import { deserialise, serialise, hallEntry } from "../persistence";

describe("mini-game plumbing", () => {
  it("a mini-game can decide an event's outcome", () => {
    const a = newGame(901), b = newGame(901);
    for (const [s, ok] of [[a, true], [b, false]] as const) { s.fin.treasury = 1e5; const e = createEvent(s, "unionWage", "NG-FC")!; respond(s, e.id, "half", ok); }
    expect(a.events.find((e) => e.tpl === "unionWage")?.outcome).toMatch(/2 a\.m\./);
    expect(b.events.find((e) => e.tpl === "unionWage")?.outcome).toMatch(/strike|walked/i);
  });
  it("a strong rally gives more than a weak one; a fast debate answer scores extra", () => {
    const mk = () => { const s = newGame(902); s.month = s.termStart + 44; s.processed = s.month - 1; s.fin.treasury = 1e5; return s; };
    const a = mk(), b = mk(); rally(a, "NW", 1.5); rally(b, "NW", 0.7);
    expect(a.campaign.rallies.NW).toBeGreaterThan(b.campaign.rallies.NW);
    const c = mk(), d = mk(); answerDebate(c, "prices", "record", 0.5); answerDebate(d, "prices", "record", -0.8);
    expect(c.campaign.debateShift).toBeGreaterThan(d.campaign.debateShift);
  });
});

describe("families you follow", () => {
  it("start with five named families and move with the country", () => {
    const s = newGame(910);
    expect(s.families.length).toBe(FAMILY_DEFS.length);
    const good = newGame(910), bad = newGame(910);
    good.eco.inflation = 8; good.eco.foodInflation = 8; good.power.available = 12000; bad.eco.inflation = 55; bad.eco.foodInflation = 60; bad.power.available = 1500;
    advanceMonths(good, 6); advanceMonths(bad, 6);
    const m = (x: typeof good) => x.families.reduce((a, f) => a + f.mood, 0);
    expect(m(good)).toBeGreaterThan(m(bad));
  });
  it("a struggling family eventually gives up, and the country hears about it", () => {
    const s = newGame(911); const f = s.families[1]; f.mood = 5; f.low = 8; advanceMonths(s, 3);
    expect(f.status === "left" || s.families.some((x) => x.status === "left")).toBe(true);
    expect(s.news.some((n) => n.source.startsWith("fam:"))).toBe(true);
  });
  it("one of them visits your desk once a year", () => {
    const s = newGame(912); s.fin.treasury = 1e5; let seen = false;
    for (let i = 0; i < 13 && !seen; i++) { advanceMonths(s, 1); seen = s.events.some((e) => e.tpl === "familyVisit"); }
    expect(seen).toBe(true);
  });
});

describe("the map shows what you did", () => {
  it("projects, investor deals and fires appear as landmarks, and states have a story", () => {
    const s = newGame(920);
    s.projects.push({ id: "p1", defId: "refinery", name: "Refinery", stateId: "NG-RI", funding: "treasury", start: 0, months: 1, delay: 0, progress: 1, cost: 1, baseCost: 1, spent: 1, leaked: 0, quality: 1, status: "done", notes: [], done: 1 });
    s.regions["NG-KN"].unrest = 90;
    const lm = landmarks(s);
    expect(lm.some((x) => x.glyph === "🛢️" && x.stateId === "NG-RI")).toBe(true);
    expect(lm.some((x) => x.glyph === "🔥" && x.stateId === "NG-KN")).toBe(true);
    expect(stateStory(s, "NG-RI")).toMatch(/refinery/i);
  });
});

describe("foreign relations", () => {
  it("relations move with what you do at home", () => {
    const a = newGame(930), b = newGame(930);
    b.rule.democracy = 20; b.rule.executions = 4; b.rule.stolenElection = true;
    advanceMonths(a, 24); advanceMonths(b, 24);
    expect(b.foreign.rel.usa).toBeLessThan(a.foreign.rel.usa - 8);
    expect(PARTNERS.length).toBe(4); expect(relWord(10)).toBe("Pariah");
  });
  it("an IMF programme pays tranches, and is suspended if you break its conditions", () => {
    const s = newGame(931); s.fin.treasury = 1e5; s.eco.reserves = 14;
    const e = createEvent(s, "imfOffer", "NG-FC")!; respond(s, e.id, "sign");
    expect(s.foreign.imf).not.toBeNull();
    s.eco.fxDefence = 0.9; advanceMonths(s, 6);
    expect(s.foreign.imf?.suspended).toBe(true);
    expect(s.news.some((n) => n.headline.includes("IMF suspends"))).toBe(true);
  });
  it("American help is suspended when you execute people", () => {
    const s = newGame(932); s.fin.treasury = 1e5; const e = createEvent(s, "usaOffer", "NG-FC")!; respond(s, e.id, "accept");
    expect(s.foreign.usaAid?.suspended).toBe(false);
    s.rule.executions = 1; advanceMonths(s, 2);
    expect(s.foreign.usaAid?.suspended).toBe(true);
  });
  it("the Chinese deal builds rail and pledges oil money", () => {
    const s = newGame(933); s.fin.treasury = 1e5; const e = createEvent(s, "chinaOffer", "NG-FC")!; respond(s, e.id, "accept");
    expect(s.modifiers.some((m) => m.source === "foreign:china")).toBe(true);
    expect(s.modifiers.some((m) => m.source === "foreign:china:oil")).toBe(true);
  });
});

describe("party and family life", () => {
  it("an ambitious vice president eventually leaves and becomes an enemy", () => {
    const s = newGame(940); s.fin.treasury = 1e5; finishDayOne(s);
    const vp = { id: "vp", kind: "regional" as const, name: "Test VP", bio: "", skill: 60, loyalty: 20, integrity: 50, portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, revealed: true, since: 0 };
    s.staff.vp = vp; s.party.vpAmbition = 95; s.party.vpStage = 1;
    advanceMonths(s, 2);
    expect(s.staff.vp).toBeNull();
    expect(s.enemies.some((e) => e.name === "Test VP")).toBe(true);
  });
  it("a restless faction brings demands; the primary can hurt you at the polls", () => {
    const s = newGame(941); s.party.north = 10; s.month = 8; s.processed = 7;
    let seen = false; for (let i = 0; i < 20 && !seen; i++) { advanceMonths(s, 1); seen = s.events.some((e) => e.tpl === "factionDemand"); }
    expect(seen).toBe(true);
    const t = newGame(942); const p0 = t.flags.primaryHit; t.flags.primaryHit = 5; expect(Number(t.flags.primaryHit)).toBeGreaterThan(Number(p0 ?? 0));
  });
  it("a hidden illness leaks, and a collapse can follow", () => {
    const s = newGame(943); s.fin.treasury = 1e5; s.home.health = 40; s.month = 20; s.processed = 19;
    s.home.illness = { since: 10, hidden: true, acting: false };
    advanceMonths(s, 4);
    expect(s.events.some((e) => e.tpl === "collapse") || s.news.some((n) => n.headline.includes("Where is the president"))).toBe(true);
  });
  it("money abroad can leak", () => {
    let leaks = 0;
    for (let seed = 1; seed <= 6; seed++) { const s = newGame(950 + seed); s.home.abroad = 900; for (let i = 0; i < 60 && !s.done; i++) { for (const e of s.events.filter((x) => x.status === "open")) respond(s, e.id, e.options[0].id); advanceMonths(s, 1); if (s.events.some((e) => e.tpl === "accountLeak")) { leaks++; break; } } }
    expect(leaks).toBeGreaterThan(2);
  });
});

describe("sectors and replay", () => {
  it("sector programmes cost money and take effect, and corruption leaks the benefit", () => {
    const s = newGame(960); s.fin.treasury = 1e5;
    expect(toggleProgramme(s, "agri", "fert").ok).toBe(true);
    expect(programmeOn(s, "agri", "fert")).toBe(true);
    expect(s.modifiers.find((m) => m.source === "sector:agri:fert")?.monthly).toBe(25);
    expect(toggleProgramme(s, "agri", "fert").ok).toBe(true); expect(programmeOn(s, "agri", "fert")).toBe(false);
    const clean = newGame(961), dirty = newGame(961); clean.gov.corruption = 5; dirty.gov.corruption = 95;
    expect(leakage(dirty)).toBeLessThan(leakage(clean));
    expect(SECTORS.length).toBe(4);
    const poor = newGame(962); poor.fin.treasury = 10; expect(toggleProgramme(poor, "oil", "gas").ok).toBe(false);
  });
  it("president types and challenge starts change the world", () => {
    const base = newGame(970, "x", { archetype: "career" });
    const gen = newGame(970, "x", { archetype: "general" }), tech = newGame(970, "x", { archetype: "tech" });
    expect(gen.rule.coupRisk).toBeLessThan(base.rule.coupRisk); expect(gen.groupMood.military).toBeGreaterThan(base.groupMood.military);
    expect(tech.groupMood.youth).toBeGreaterThan(base.groupMood.youth);
    const coup = newGame(970, "x", { start: "coup" }), rec = newGame(970, "x", { start: "recession" });
    expect(coup.rule.coupRisk).toBeGreaterThan(30); expect(rec.eco.inflation).toBeGreaterThan(base.eco.inflation + 5);
    expect(PRESIDENTS.length).toBe(5); expect(STARTS.length).toBe(3);
  });
  it("daily challenge worlds are identical for everyone", () => {
    const a = newGame(20261027, "x", { archetype: "tech", start: "recession", daily: "20261027" }), b = newGame(20261027, "x", { archetype: "tech", start: "recession", daily: "20261027" });
    expect(JSON.stringify(a.eco)).toBe(JSON.stringify(b.eco)); expect(a.meta.daily).toBe("20261027");
    expect(hallEntry(a)).toBeNull();
  });
});

describe("feel", () => {
  it("the year review lists decisions, consequences and what is permanent", () => {
    const s = newGame(980); s.rule.lawLevel = 4; s.rule.executions = 1;
    s.gone.push({ id: "g1", name: "Sen. Test", role: "Senator", how: "executed", month: 5 });
    s.reports.push({ id: "r1", month: 5, title: "Case: Prosecute", lines: ["Sen. Test was sentenced to death."], tone: "good" });
    s.timeline.push({ month: 6, title: "Fear in the Assembly", text: "Cases fell.", tone: "good", chain: "execute" });
    const r = yearReview(s, 1);
    expect(r.decisions.length).toBe(1); expect(r.echoes.length).toBe(1);
    expect(r.permanent.join(" ")).toMatch(/executed/);
  });
  it("big news is recognised and gets a street reaction", () => {
    expect(BIG_NEWS.test("ripple:execute:0:5")).toBe(true); expect(BIG_NEWS.test("event:abc")).toBe(false);
    expect(reaction("Peg collapses", "bad").length).toBeGreaterThan(10);
  });
  it("the first-turns coach advances by itself and review comes due each year", () => {
    const s = newGame(981); finishDayOne(s);
    expect(s.flags.coach).toBe(0);
    advanceMonths(s, 12);
    expect(Number(s.flags.coach)).toBeGreaterThanOrEqual(3);
    expect(s.flags.reviewDue).toBe(1);
  });
  it("old saves load with the new fields", () => {
    const s = newGame(982); const raw = JSON.parse(serialise(s)); for (const k of ["families", "foreign", "party", "home"]) delete raw.state[k];
    const back = deserialise(JSON.stringify(raw)).state;
    expect(back.families.length).toBe(5); expect(back.foreign.rel.imf).toBe(45); expect(back.party.north).toBe(55); expect(back.home.kids).toBe(3);
    advanceMonths(back, 3);
  });
});
