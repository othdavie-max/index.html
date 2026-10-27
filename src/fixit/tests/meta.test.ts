import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { createEvent } from "../engine/events";
import { applyTool, lawmakerAction } from "../engine/power";
import { warnMinister } from "../engine/cabinet";
import { AGENDA, AGENDA_BY_ID, PC_COST, UNLOCKS, agendaProgress, backfillCap, cast, checkUnlocks, directorMood, inheritFrom, payPc, pcIncome, pickAgenda, tabLock, whyChain } from "../engine/meta";
import { pidgin } from "../engine/pidgin";
import { FixSaves, EMPTY_LEGACY, deserialise, legacyAward, serialise, validate } from "../persistence";
import { MemoryBackend } from "../../game/persistence/saveSystem";

describe("systems unlock as the story reaches them", () => {
  it("a new game starts with the late systems closed and explains when they open", () => {
    const s = newGame(2001);
    expect(tabLock(s, "moves")).toMatch(/month 2/);
    expect(tabLock(s, "assembly")).not.toBeNull();
    expect(tabLock(s, "military")).not.toBeNull();
    expect(tabLock(s, "presidency")).toBeNull();
    expect(tabLock(s, "nation")).toBeNull();
  });
  it("they open on schedule, once, and are announced in the news", () => {
    const s = newGame(2002); s.fin.treasury = 1e5;
    advanceMonths(s, 3);
    expect(s.cap.unlocked).toContain("moves"); expect(s.cap.unlocked).toContain("assembly");
    expect(s.news.some((n) => n.source === "unlock:assembly")).toBe(true);
    advanceMonths(s, 4);
    expect(s.cap.unlocked).toContain("military"); expect(s.cap.unlocked).toContain("foreign");
    const n = s.cap.unlocked.length; checkUnlocks(s); expect(s.cap.unlocked.length).toBe(n);
  });
  it("trouble opens the seat of power early", () => {
    const s = newGame(2003); expect(tabLock(s, "power")).not.toBeNull();
    s.rule.streetAnger = 40; checkUnlocks(s); expect(tabLock(s, "power")).toBeNull();
  });
  it("a quick game opens systems twice as fast", () => {
    const s = newGame(2004, "P", { quick: true }); s.fin.treasury = 1e5;
    advanceMonths(s, 3);
    expect(s.cap.unlocked).toContain("assembly"); expect(s.cap.unlocked).toContain("military");
    const slow = newGame(2004); slow.fin.treasury = 1e5; advanceMonths(slow, 3); expect(slow.cap.unlocked).not.toContain("military");
  });
  it("an old save with no meta layer keeps everything open", () => {
    const s = newGame(2005); const raw = JSON.parse(JSON.stringify(s)); delete raw.cap;
    const v = validate(raw);
    expect(v.cap.unlocked.length).toBe(UNLOCKS.length); expect(v.cap.agendaDue).toBe(false);
    backfillCap(v); expect(tabLock(v, "military")).toBeNull();
  });
});

describe("political capital", () => {
  it("bold moves cost capital and are refused when you cannot afford them", () => {
    const s = newGame(2010); s.fin.treasury = 1e5; s.rule.lawLevel = 1;
    s.cap.pc = 0;
    const r = applyTool(s, "inec");
    expect(r.ok).toBe(false); expect(r.message).toMatch(/political capital/);
    s.cap.pc = 30; const r2 = applyTool(s, "inec");
    expect(r2.ok).toBe(true); expect(s.cap.pc).toBe(30 - PC_COST.tool);
  });
  it("a refused move does not charge you", () => {
    const s = newGame(2011); s.cap.pc = 50; s.fin.treasury = 0;
    const r = applyTool(s, "inec"); expect(r.ok).toBe(false); expect(s.cap.pc).toBe(50);
  });
  it("warnings and lawmaker actions cost capital too", () => {
    const s = newGame(2012); s.cap.pc = 3;
    expect(warnMinister(s, "finance").ok).toBe(false);
    expect(lawmakerAction(s, s.lawmakers[0].id, "investigate").ok).toBe(false);
    s.cap.pc = 30; expect(warnMinister(s, "finance").ok).toBe(true); expect(s.cap.pc).toBe(30 - PC_COST.warn);
  });
  it("it refills every month in proportion to how well you are doing, and never leaves 0..100", () => {
    const s = newGame(2013); s.fin.treasury = 1e5; s.cap.pc = 10;
    const before = s.cap.pc; advanceMonths(s, 1); expect(s.cap.pc).toBeGreaterThan(before);
    s.gov.approval = 80; s.gov.trust = 70; s.assembly.support = 80; const rich = pcIncome(s);
    s.gov.approval = 20; s.gov.trust = 15; s.assembly.support = 20; const poor = pcIncome(s);
    expect(rich).toBeGreaterThan(poor);
    s.cap.pc = 99; advanceMonths(s, 3); expect(s.cap.pc).toBeLessThanOrEqual(100);
    expect(payPc(s, 500, "x")).toMatch(/Not enough/);
  });
});

describe("the yearly agenda", () => {
  it("offers four cards, takes two, and gives a real boost", () => {
    const s = newGame(2020);
    expect(s.cap.agendaDue).toBe(true); expect(s.cap.offer.length).toBe(4);
    expect(new Set(s.cap.offer).size).toBe(4);
    pickAgenda(s, s.cap.offer.slice(0, 3));
    expect(s.cap.agenda.length).toBe(2); expect(s.cap.agendaDue).toBe(false);
    expect(s.modifiers.some((m) => m.source.startsWith("agenda:"))).toBe(true);
  });
  it("is judged at the year end: kept pays capital and approval, missed costs trust", () => {
    const s = newGame(2021); s.fin.treasury = 1e5;
    s.cap.agenda = []; pickAgenda(s, ["popular", "books"]);
    // force one success and one failure
    s.cap.agenda[0].from = s.gov.approval - 20; s.cap.agenda[1].from = s.fin.treasury * 5;
    const pc0 = s.cap.pc; advanceMonths(s, 12);
    expect(s.cap.agendaLog.length).toBe(2);
    expect(s.cap.agendaLog.find((l) => l.id === "popular")!.ok).toBe(true);
    expect(s.cap.agendaLog.find((l) => l.id === "books")!.ok).toBe(false);
    expect(s.news.some((n) => n.headline.startsWith("Agenda kept"))).toBe(true);
    expect(s.news.some((n) => n.headline.startsWith("Agenda missed"))).toBe(true);
    expect(s.cap.agendaDue).toBe(true); expect(s.cap.agenda.length).toBe(0); expect(s.cap.pc).toBeGreaterThan(pc0 - 1);
  });
  it("every agenda card has a goal, a gauge and a boost", () => {
    const s = newGame(2022);
    for (const a of AGENDA) { expect(Number.isFinite(a.gauge(s))).toBe(true); expect(a.goal.length).toBeGreaterThan(5); expect(Object.keys(a.bonus).length).toBeGreaterThan(0); expect(AGENDA_BY_ID[a.id]).toBe(a); }
    pickAgenda(s, ["feed"]); expect(agendaProgress(s)[0].ok).toBe(false);
  });
});

describe("the pacing director", () => {
  it("gives breathing room after a storm and tightens after a calm spell", () => {
    const s = newGame(2030); s.fin.treasury = 1e5;
    s.cap.tension = 90; s.cap.calm = 0;
    advanceMonths(s, 1);
    expect(s.cap.rate).toBeLessThan(1);
    const t = newGame(2031); t.fin.treasury = 1e5;
    t.events = []; t.cap.tension = 0; t.cap.calm = 5;
    advanceMonths(t, 1); expect(t.cap.rate).toBeGreaterThan(1);
    expect(["Storm", "Tense", "Too quiet", "Steady"]).toContain(directorMood(t).label);
  });
  it("keeps its multiplier in a sane range for a whole game", () => {
    const s = newGame(2032); s.fin.treasury = 1e5;
    for (let i = 0; i < 40; i++) { advanceMonths(s, 1); if (s.ended) break; expect(s.cap.rate).toBeGreaterThanOrEqual(0.4); expect(s.cap.rate).toBeLessThanOrEqual(2); expect(s.cap.tension).toBeGreaterThanOrEqual(0); expect(s.cap.tension).toBeLessThanOrEqual(100); }
  });
});

describe("the inner circle and the why-chain", () => {
  it("eight recurring faces with feelings, lines and portraits", () => {
    const s = newGame(2040); s.staff.cos ??= null;
    const faces = cast(s);
    expect(faces.length).toBeGreaterThanOrEqual(6);
    for (const f of faces) { expect(f.mood).toBeGreaterThanOrEqual(0); expect(f.mood).toBeLessThanOrEqual(100); expect(f.line.length).toBeGreaterThan(5); expect(f.portrait.skin).toBeGreaterThan(0); }
    expect(faces.map((f) => f.id)).toEqual(expect.arrayContaining(["rival", "godfather", "mama", "general", "journo", "governor"]));
  });
  it("faces react to what you do", () => {
    const s = newGame(2041);
    const before = cast(s).find((f) => f.id === "mama")!.mood;
    s.groupMood.traders = -35;
    const after = cast(s).find((f) => f.id === "mama")!;
    expect(after.mood).toBeLessThan(before); expect(after.emotion).toMatch(/😠|😈|😕/);
  });
  it("every HUD meter can explain itself", () => {
    const s = newGame(2042); s.fin.treasury = 1e5; advanceMonths(s, 4);
    for (const k of ["cash", "fx", "debt", "inflation", "jobless", "mood", "approval", "capital"] as const) {
      const w = whyChain(s, k); expect(w.title.length).toBeGreaterThan(2); expect(w.now.length).toBeGreaterThan(0); expect(w.change.length).toBeGreaterThan(0); expect(w.tip.length).toBeGreaterThan(5);
    }
    expect(whyChain(s, "inflation").reasons.length).toBeGreaterThan(0);
  });
});

describe("variety", () => {
  it("the same crisis reads differently and escalates when it repeats", () => {
    const s = newGame(2050); s.fin.treasury = 1e5;
    const a = createEvent(s, "foodProtest", "NG-KN")!;
    a.status = "resolved"; advanceMonths(s, 1);
    const b = createEvent(s, "foodProtest", "NG-LA")!;
    expect(b.title).toMatch(/second time/); expect(b.cause).toMatch(/second time this year/);
    b.status = "resolved"; advanceMonths(s, 1);
    const c = createEvent(s, "foodProtest", "NG-OY")!;
    expect(c.title).toMatch(/again/); expect(c.scale).toBeGreaterThanOrEqual(b.scale);
    expect(a.cause.split(".")[0]).not.toBe("");
  });
});

describe("Naija Pidgin", () => {
  it("turns flavour into pidgin deterministically and keeps numbers", () => {
    const t = "Petrol is ₦750 a litre. We cannot buy food and the government does not care.";
    const p = pidgin(t);
    expect(p).toContain("₦750"); expect(p).toMatch(/no fit/); expect(p).toMatch(/chop/); expect(p).toMatch(/goment/);
    expect(pidgin(t)).toBe(p); expect(pidgin("")).toBe("");
  });
});

describe("quick term, dynasty and legacy perks", () => {
  it("a quick game is one term, ends in a verdict and never offers to stay on", () => {
    const s = newGame(2060, "P", { quick: true }); s.fin.treasury = 1e6; s.gov.approval = 80;
    for (let i = 0; i < 60 && !s.ended; i++) advanceMonths(s, 1);
    expect(s.ended).not.toBeNull(); expect(s.done).toBe(true);
    expect(s.ended!.text).toMatch(/quick term/i); expect(s.ended!.overstay).toBeFalsy(); expect(s.election).toBeNull();
  });
  it("perks change the starting position", () => {
    const base = newGame(2061), rich = newGame(2061, "P", { perks: ["seed", "capital", "honeymoon"] });
    expect(rich.fin.treasury).toBeGreaterThan(base.fin.treasury); expect(rich.cap.pc).toBe(80); expect(rich.gov.approval).toBeGreaterThan(base.gov.approval);
  });
  it("a successor inherits the last president's Nigeria", () => {
    const a = newGame(2062); a.gov.corruption = 90; a.eco.fx = 4000; a.rule.democracy = 20; a.fin.domesticDebt = 200000;
    const inh = inheritFrom(a);
    const b = newGame(2063, undefined, { inherit: inh });
    expect(b.gov.corruption).toBeGreaterThanOrEqual(85); expect(b.eco.fx).toBe(4000); expect(b.rule.democracy).toBe(20); expect(b.fin.domesticDebt).toBe(200000);
    expect(b.cap.dynasty).toBe(1); expect(b.meta.president).toMatch(/Successor/);
  });
  it("legacy points and perks persist between games", async () => {
    const saves = new FixSaves(new MemoryBackend());
    expect((await saves.legacy()).points).toBe(0);
    await saves.saveLegacy({ ...EMPTY_LEGACY, points: 40, owned: ["seed"], equipped: ["seed"], games: 2 });
    const m = await saves.legacy(); expect(m.points).toBe(40); expect(m.equipped).toEqual(["seed"]);
    const s = newGame(2064); s.fin.treasury = 1e5; advanceMonths(s, 6);
    s.terms.push({ term: 1, result: "completed", start: s.baseline, end: s.history[s.history.length - 1], title: "t", months: 6 });
    const first = legacyAward(s, true), again = legacyAward(s, false);
    expect(first).toBeGreaterThan(again); expect(again).toBeGreaterThan(0);
    s.cap.dynasty = 2; expect(legacyAward(s, false)).toBeGreaterThan(again);
  });
  it("the meta layer survives a save and a load", () => {
    const s = newGame(2065); s.fin.treasury = 1e5; advanceMonths(s, 5); pickAgenda(s, ["jobs"]);
    const back = deserialise(serialise(s)).state;
    expect(back.cap).toEqual(s.cap);
  });
  it("the same seed gives the same meta state", () => {
    const run = () => { const s = newGame(2066); s.fin.treasury = 1e5; advanceMonths(s, 14); return JSON.stringify(s.cap); };
    expect(run()).toBe(run());
  });
});

import { respond } from "../engine/actions";
import { carryOut, handling, ideas, isAuto, makeProposal, propLog, proposalOf, proposalsMonthly, setAuto } from "../engine/proposals";
import { subRng } from "../../game/engine/rng";
import { PROJECT_BY_ID } from "../data/catalogue";
import type { Aide } from "../engine/types";

const aide = (o: Partial<Aide>): Aide => ({ id: "x", kind: "technocrat", name: "Test Aide", bio: "", skill: 70, loyalty: 70, integrity: 70, portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, revealed: false, since: 0, ...o });
const withTeam = (seed: number, a: Aide) => { const s = newGame(seed); s.fin.treasury = 1e5; s.staff.cos = a; s.staff.picked = true; return s; };

describe("advisers bring ideas to your desk", () => {
  it("a clever adviser proposes what the country needs most", () => {
    const s = withTeam(3001, aide({ skill: 80 })); s.month = 6;
    const top = ideas(s)[0];
    const p = makeProposal(s, s.staff.cos!, subRng(1, "t"))!;
    expect(p.id).toBe(top.id); expect(p.vanity).toBe(false);
  });
  it("a weak adviser sometimes proposes a vanity project instead", () => {
    const s = withTeam(3002, aide({ skill: 20 })); s.month = 6;
    let vanity = 0; for (let i = 0; i < 40; i++) { const p = makeProposal(s, s.staff.cos!, subRng(i, "v")); if (p?.vanity) vanity++; }
    expect(vanity).toBeGreaterThan(3);
  });
  it("proposals reach the desk with four honest options, one at a time", () => {
    const s = withTeam(3003, aide({ skill: 75 })); s.month = 5;
    for (let i = 0; i < 12 && !s.events.some((e) => e.tpl === "adviserProposal"); i++) { s.month += 2; proposalsMonthly(s, subRng(3003, "p", i)); }
    const e = s.events.find((x) => x.tpl === "adviserProposal")!; expect(e).toBeDefined();
    expect(e.options.map((o) => o.id)).toEqual(["own", "deleg", "auto", "no"]);
    expect(proposalOf(s, e.id)).not.toBeNull();
    const n = s.events.filter((x) => x.tpl === "adviserProposal").length; s.month += 3; proposalsMonthly(s, subRng(1, "again")); expect(s.events.filter((x) => x.tpl === "adviserProposal").length).toBe(n);
  });
  it("saying yes builds it yourself with no meddling", () => {
    const s = withTeam(3004, aide({ skill: 75 })); s.month = 5;
    for (let i = 0; i < 12 && !s.events.some((e) => e.tpl === "adviserProposal"); i++) { s.month += 2; proposalsMonthly(s, subRng(3004, "p", i)); }
    const e = s.events.find((x) => x.tpl === "adviserProposal")!; const p = proposalOf(s, e.id)!;
    const before = s.projects.length, pol = Object.keys(s.policies).length; respond(s, e.id, "own");
    expect(p.kind === "project" ? s.projects.length : Object.keys(s.policies).length).toBe((p.kind === "project" ? before : pol) + 1);
    expect(propLog(s)[0].mode).toBe("own");
  });
  it("'not now' puts it off for months", () => {
    const s = withTeam(3005, aide({})); s.month = 5;
    for (let i = 0; i < 12 && !s.events.some((e) => e.tpl === "adviserProposal"); i++) { s.month += 2; proposalsMonthly(s, subRng(3005, "p", i)); }
    const e = s.events.find((x) => x.tpl === "adviserProposal")!; const p = proposalOf(s, e.id)!;
    respond(s, e.id, "no"); expect(ideas(s).some((i) => i.id === p.id && i.kind === p.kind)).toBe(false);
  });
  it("delegating to a good aide goes well; a corrupt, disloyal one wrecks it", () => {
    const run = (a: Aide, seed: number) => {
      const s = withTeam(seed, a); s.month = 6;
      const proj = ideas(s).find((i) => i.kind === "project" && !PROJECT_BY_ID[i.id].sites)!;
      const p = { kind: "project" as const, id: proj.id, name: proj.name, stateId: "NG-KN", funding: "treasury" as const, by: a.id, need: proj.need, vanity: false, padded: false, reason: "" };
      const r = carryOut(s, p, "deleg", subRng(seed, "c"));
      return { s, r, pr: s.projects[s.projects.length - 1] };
    };
    const good = run(aide({ skill: 90, integrity: 90, loyalty: 90 }), 3010), bad = run(aide({ skill: 25, integrity: 10, loyalty: 10 }), 3010);
    expect(good.r.ok && bad.r.ok).toBe(true);
    expect(bad.pr.quality).toBeLessThan(good.pr.quality);
    expect(bad.pr.delay).toBeGreaterThan(good.pr.delay);
    expect(bad.pr.cost).toBeGreaterThan(good.pr.cost);
    expect(bad.s.ledger.stolen).toBeGreaterThan(good.s.ledger.stolen);
    expect(bad.pr.notes.join(" ")).toMatch(/Handled by/);
  });
  it("skill, honesty and loyalty each matter on their own", () => {
    const r = subRng(1, "h");
    expect(handling(aide({ skill: 25 }), r).delay).toBeGreaterThan(0);
    expect(handling(aide({ loyalty: 20 }), r).delay).toBeGreaterThanOrEqual(2);
    expect(handling(aide({ integrity: 20 }), r).steal).toBeGreaterThan(0);
    const best = handling(aide({ skill: 90, integrity: 90, loyalty: 90 }), r); expect(best.steal).toBe(0); expect(best.quality).toBeGreaterThan(0.15);
  });
  it("'handle it from now on' acts without asking and keeps a log", () => {
    const s = withTeam(3020, aide({ skill: 80 })); s.month = 5;
    setAuto(s, s.staff.cos!.id, true); expect(isAuto(s, s.staff.cos!.id)).toBe(true);
    for (let i = 0; i < 20 && propLog(s).length === 0; i++) { s.month += 2; proposalsMonthly(s, subRng(3020, "a", i)); }
    expect(propLog(s)[0].mode).toBe("auto"); expect(s.events.some((e) => e.tpl === "adviserProposal" && e.status === "open")).toBe(false);
    expect(s.news.some((n) => n.source.startsWith("prop-auto"))).toBe(true);
  });
});
