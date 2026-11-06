import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { enactPolicy, respond, startProject, applyFuel } from "../engine/actions";
import { createEvent } from "../engine/events";
import { billChance, billFor, budgetDue, callVote, giveSpeech, lobby, passBudget } from "../engine/politics";
import { dominantTrait, earn, governorOf, governorSpeed } from "../engine/society";
import { hallEntry, deserialise, serialise } from "../persistence";
import { ISSUE_BY_ID, issuesOf } from "../engine/setup";
import { lever } from "../engine/util";

describe("random starting issues, difficulty and identity", () => {
  it("every game rolls its own mix of national issues; the same seed repeats it", () => {
    const mixes = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame(seed);
      const ids = issuesOf(s).map((i) => i.id);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids.filter((id) => ISSUE_BY_ID[id].good).length).toBeLessThanOrEqual(1);
      for (const id of ids) for (const c of ISSUE_BY_ID[id].clash ?? []) expect(ids).not.toContain(c);
      mixes.add(ids.slice().sort().join(","));
    }
    expect(mixes.size).toBeGreaterThan(12);
    expect(newGame(5).meta.scenario).toBe(newGame(5).meta.scenario);
  });
  it("each issue really changes the starting state", () => {
    const base = newGame(61, "X", { issues: [] }), debt = newGame(61, "X", { issues: ["debt"] }), naira = newGame(61, "X", { issues: ["naira"] }), food = newGame(61, "X", { issues: ["food"] });
    expect(debt.fin.treasury).toBeLessThan(base.fin.treasury);
    expect(debt.fin.creditRating).toBeLessThan(base.fin.creditRating);
    expect(naira.eco.fx).toBeGreaterThan(base.eco.fx);
    expect(food.eco.foodInflation).toBeGreaterThan(base.eco.foodInflation);
    advanceMonths(food, 1);
    expect(food.agri.weather).toBeLessThan(0); // the poor rains are kept for the first year
  });
  it("difficulty changes starting cash; name and portrait are kept", () => {
    const e = newGame(62, "X", { difficulty: "easy" }), h = newGame(62, "X", { difficulty: "hard", president: "Adaora Bello", portrait: { skin: 1, hair: 2, style: 3, accent: 4 } });
    expect(e.fin.treasury).toBeGreaterThan(h.fin.treasury);
    expect(h.meta.president).toBe("Adaora Bello");
    expect(h.meta.portrait.style).toBe(3);
  });
});

describe("groups and reputation", () => {
  it("a minimum wage pleases workers and angers business owners", () => {
    const a = newGame(63), b = newGame(63);
    enactPolicy(b, "minWage");
    advanceMonths(a, 1); advanceMonths(b, 1);
    expect(b.groups.workers).toBeGreaterThan(a.groups.workers);
    expect(b.groups.business).toBeLessThan(a.groups.business);
  });
  it("reform choices earn a reputation that has effects", () => {
    const s = newGame(64); s.fin.treasury = 1e5;
    for (const p of ["eProcure", "civilService", "taxDrive"]) enactPolicy(s, p);
    expect(dominantTrait(s)).toBe("reformer");
    advanceMonths(s, 1);
    expect(s.modifiers.some((m) => m.source === "reputation")).toBe(true);
    earn(s, "event:kickback:accept"); earn(s, "event:kickback:accept");
    expect(s.reputation.clean).toBeLessThan(0);
  });
});

describe("governors", () => {
  it("projects in a zone improve the governor's mood, which speeds projects there", () => {
    const s = newGame(65); s.fin.treasury = 1e5;
    const g = governorOf(s, "NG-KN")!;
    const r0 = g.relation, sp0 = governorSpeed(s, "NG-KN");
    startProject(s, "schools", "NG-KN", "treasury");
    expect(g.relation).toBeGreaterThan(r0);
    expect(governorSpeed(s, "NG-KN")).toBeGreaterThan(sp0);
  });
  it("governor requests change the relationship", () => {
    const s = newGame(66); s.fin.treasury = 1e5;
    const ev = createEvent(s, "govRequest", "NG-OY")!;
    const g = governorOf(s, "NG-OY")!; const r0 = g.relation;
    respond(s, ev.id, "decline");
    expect(g.relation).toBeLessThan(r0);
  });
});

describe("National Assembly", () => {
  it("controversial bills need a vote; lobbying raises the odds", () => {
    const s = newGame(67); s.fin.treasury = 1e5;
    expect(billFor({ type: "fuel", action: "remove" })).toBe("fuel:remove");
    expect(billFor({ type: "policy", id: "gridMaint" })).toBeNull();
    const p0 = billChance(s, "fuel:remove");
    lobby(s, "fuel:remove", "projects"); lobby(s, "fuel:remove", "favours");
    expect(billChance(s, "fuel:remove")).toBeGreaterThan(p0);
  });
  it("a passed bill takes effect; a defeated one does not", () => {
    const s = newGame(68); s.fin.treasury = 1e5;
    s.assembly.support = 95;
    const r = callVote(s, "policy:taxDrive", () => enactPolicy(s, "taxDrive"));
    expect(r.ok).toBe(true); expect(s.policies.taxDrive?.active).toBe(true);
    expect(r.yes + r.no).toBe(469); expect(r.yes).toBeGreaterThan(234);
    const t = newGame(69); t.assembly.support = 5;
    const r2 = callVote(t, "fuel:remove", () => applyFuel(t, "remove"));
    expect(r2.ok).toBe(false); expect(t.fuel.coverage).toBeGreaterThan(0.1); expect(t.assembly.defeats).toBe(1);
  });
});

describe("budget and speeches", () => {
  it("the budget sets spending levels with running costs and group reactions", () => {
    const s = newGame(70);
    expect(budgetDue(s)).toBe(false);
    passBudget(s, { education: 2, health: 0, security: -1, infrastructure: 0, social: 0 });
    const m = s.modifiers.find((x) => x.source === "budget")!;
    expect(m.monthly).toBe(2 * 25 - 30);
    expect(s.groupMood.youth).toBeGreaterThan(0);
    expect(s.groupMood.military).toBeLessThan(0);
    advanceMonths(s, 5);
    expect(lever(s, "education")).toBeGreaterThan(3);
    s.month = 8; expect(budgetDue(s)).toBe(true); // a new calendar year has started
  });
  it("speeches have a cooldown and the same tone works differently over time", () => {
    const early = newGame(71), late = newGame(71);
    const t0 = early.gov.trust;
    giveSpeech(early, "blame");
    expect(early.gov.trust).toBeGreaterThan(t0);
    expect(giveSpeech(early, "honest").ok).toBe(false);
    advanceMonths(late, 20);
    const t1 = late.gov.trust; giveSpeech(late, "blame");
    expect(late.gov.trust).toBeLessThan(t1);
  });
});

describe("story arcs", () => {
  it("a badly handled outbreak becomes a bigger crisis later", () => {
    const s = newGame(72); s.fin.treasury = 1e5;
    const ev = createEvent(s, "outbreak1", "NG-LA")!;
    respond(s, ev.id, "downplay");
    const outcome = s.events.find((e) => e.id === ev.id)!.outcome!;
    advanceMonths(s, 5);
    const next = s.events.find((e) => e.tpl === "outbreak2" || e.tpl === "outbreak3");
    if (outcome.includes("burned out")) expect(next).toBeUndefined(); // got lucky: the arc ends
    else expect(next?.tpl).toBe("outbreak2");
    // a well-handled outbreak leads instead to the vaccine stage
    const t = newGame(76); t.fin.treasury = 1e5; t.soc.health = 95;
    const ev2 = createEvent(t, "outbreak1", "NG-KN")!;
    const r = respond(t, ev2.id, "teams");
    advanceMonths(t, 6);
    expect(t.events.some((e) => e.tpl === (r.ok ? "outbreak3" : "outbreak2"))).toBe(true);
  });
  it("an oil crash lowers the oil price when it begins and continues to a second stage", () => {
    const s = newGame(73);
    const p0 = s.eco.oilPrice;
    const ev = createEvent(s, "oilcrash1", "NG-FC")!;
    expect(s.eco.oilPrice).toBeLessThan(p0 - 20);
    respond(s, ev.id, "borrow");
    advanceMonths(s, 5);
    expect(s.events.some((e) => e.tpl === "oilcrash2")).toBe(true);
  });
});

describe("hall and saves", () => {
  it("a finished term produces a hall entry", () => {
    const s = newGame(74, "Test Pres"); s.fin.treasury = 1e6;
    advanceMonths(s, 50);
    const h = hallEntry(s)!;
    expect(h.president).toBe("Test Pres");
    expect(typeof h.score).toBe("number");
  });
  it("old saves without the new systems still load", () => {
    const s = newGame(75);
    const raw = JSON.parse(serialise(s));
    for (const k of ["assembly", "governors", "groups", "groupMood", "reputation", "budget", "speech"]) delete raw.state[k];
    delete raw.state.meta.scenario; delete raw.state.meta.portrait;
    const back = deserialise(JSON.stringify(raw)).state;
    expect(back.governors.length).toBe(6);
    expect(back.assembly.support).toBeGreaterThan(0);
    advanceMonths(back, 2);
    expect(back.month).toBe(2);
  });
});
