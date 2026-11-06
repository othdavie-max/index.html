import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { GOV_ACTIONS, currentPrimary, finishPrimary, govAction, govOf, govsMonthly, replaceGov, startPrimary } from "../engine/govs";
import { POWERS, RUMOUR_ACTIONS, actOnRumour, applyPower, intelMonthly, officeMonthly, powerBlock, rumours } from "../engine/office";
import { PRODUCTS, SUPPLIERS, armsDeal, dealBlock, dealsOf, signDeal, startVisit, tradeMonthly, visitCooldown } from "../engine/trade";
import { THEATRES, commanders, endOp, launchOp, opsMonthly, opsOf } from "../engine/ops";
import { whipCount, winOver, billChance } from "../engine/politics";
import { RATE_LABEL, rateLevel, setRate } from "../engine/dials";
import { startProject } from "../engine/actions";
import { subRng } from "../../game/engine/rng";

const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 8; s.staff.picked = true; return s; };

describe("governors with lives", () => {
  it("a good governor improves his state month by month; a bad one lets it slide", () => {
    const run = (skill: number) => { const s = rich(9001); const g = govOf(s, "NG-KN")!; g.skill = skill; g.integrity = 80; const r = s.regions["NG-KN"]; const before = r.off.jobless; for (let i = 0; i < 36; i++) govsMonthly(s, subRng(1, "g", i)); return r.off.jobless - before; };
    expect(run(90)).toBeLessThan(run(20) - 3);
  });
  it("dishonest governors loot, and sometimes it comes out", () => {
    const s = rich(9002); for (const g of s.govs) g.integrity = 5; s.rule.pressFreedom = 100;
    for (let i = 0; i < 60 && !s.events.some((e) => e.tpl === "govScandal"); i++) { s.month++; govsMonthly(s, subRng(9002, "l", i)); }
    expect(s.ledger.stolen).toBeGreaterThan(0); expect(s.events.some((e) => e.tpl === "govScandal")).toBe(true);
    const e = s.events.find((x) => x.tpl === "govScandal")!; const st = e.stateId; const old = govOf(s, st)!.name;
    respond(s, e.id, "prosecute", true as never); expect(govOf(s, st)!.name).not.toBe(old); expect(s.ledger.recovered).toBeGreaterThan(0);
  });
  it("a badly run state in turmoil asks for help; a disloyal ambitious governor defects", () => {
    const s = rich(9003); const g = govOf(s, "NG-LA")!; g.skill = 20; g.integrity = 90; s.regions["NG-LA"].unrest = 90;
    for (let i = 0; i < 80 && !s.events.some((e) => e.tpl === "govCrisis"); i++) { s.month++; s.regions["NG-LA"].unrest = 90; govsMonthly(s, subRng(9003, "c", i)); }
    expect(s.events.some((e) => e.tpl === "govCrisis")).toBe(true);
    const d = govOf(s, "NG-KN")!; d.party = "NPP"; d.loyalty = 5; d.ambition = 90; const sup = s.assembly.support;
    for (let i = 0; i < 200 && d.party === "NPP"; i++) { d.loyalty = 5; govsMonthly(s, subRng(9003, "d", i)); }
    expect(govOf(s, "NG-KN")!.party).toBe("PRA"); expect(s.assembly.support).toBeLessThan(sup);
  });
  it("you can release funds, withhold them, or send the anti-graft agency", () => {
    const s = rich(9004); const g = govOf(s, "NG-KN")!; g.integrity = 10; const l0 = g.loyalty;
    expect(govAction(s, "NG-KN", "release").ok).toBe(true); expect(govOf(s, "NG-KN")!.loyalty).toBeGreaterThan(l0);
    expect(govAction(s, "NG-KN", "release").ok).toBe(false);
    const old = govOf(s, "NG-KN")!.name; const r = govAction(s, "NG-KN", "investigate"); expect(r.ok).toBe(true); expect(govOf(s, "NG-KN")!.name).not.toBe(old);
    const clean = govOf(s, "NG-LA")!; clean.integrity = 95; const name = clean.name; govAction(s, "NG-LA", "investigate"); expect(govOf(s, "NG-LA")!.name).toBe(name);
    expect(GOV_ACTIONS.length).toBe(3);
  });
  it("governorship elections at the midterm: incumbents can be re-elected or thrown out", () => {
    const s = rich(9005); s.month = 24; advanceMonths(s, 0); startPrimary(s, true);
    const p = currentPrimary(s)!; expect(p.mid).toBe(true); expect(p.races[0].cands[0].bio).toMatch(/sitting governor/);
    const inc = govOf(s, p.races[0].stateId)!.name; const res = finishPrimary(s);
    for (const r of res) { const g = govOf(s, r.stateId)!; expect(g.name).toBe(r.winner); if (r.winner === inc && r.stateId === p.races[0].stateId) expect(g.terms).toBe(2); }
    void replaceGov;
  });
  it("the midterm election starts by itself in a normal game", () => {
    const s = newGame(9006); s.fin.treasury = 1e7; s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary;
    advanceMonths(s, 25); expect(currentPrimary(s)?.mid).toBe(true);
  });
});

describe("the president's office", () => {
  it("every power has a cost, a cooldown and a story", () => {
    expect(POWERS.length).toBeGreaterThanOrEqual(9);
    for (const p of POWERS) { const s = rich(9010); s.rule.streetAnger = 40; s.gone.push({ id: "g1", name: "Sen. Test", role: "Senator", how: "jailed", month: 2 }); const pc = s.cap.pc; const r = applyPower(s, p.id, p.choices?.[0]?.id); expect(r.ok, p.id).toBe(true); expect(r.message.length).toBeGreaterThan(15); expect(s.cap.pc).toBeLessThan(pc); expect(powerBlock(s, p), p.id).not.toBeNull(); }
  });
  it("some powers have requirements: you cannot pardon who is not jailed", () => {
    const s = rich(9011); s.rule.streetAnger = 5; expect(applyPower(s, "pardonyouth").ok).toBe(false); expect(applyPower(s, "pardonofficial").ok).toBe(false);
  });
  it("a commission of inquiry reports in six months and can recover money, or flop if the courts are weak", () => {
    const s = rich(9012); s.rule.judiciary = 80; applyPower(s, "inquiry", "oil"); const rec = s.ledger.recovered; advanceMonths(s, 7); expect(s.ledger.recovered).toBeGreaterThan(rec);
    const t = rich(9013); t.rule.judiciary = 10; applyPower(t, "inquiry", "army"); advanceMonths(t, 7); expect(t.news.some((n) => n.headline.includes("collapses"))).toBe(true);
  });
  it("rumours: some true, some false; investigating reveals; acting on a false one does harm", () => {
    const s = rich(9014); let tr = 0, fa = 0;
    for (let seed = 0; seed < 300; seed++) { const t = rich(9100 + seed); t.rule.coupRisk = 50; t.party.vpAmbition = 70; t.me.evidence = 30; t.staff.vp = t.staff.cos ?? null; intelMonthly(t, subRng(seed, "i")); for (const r of rumours(t)) { if (r.real) tr++; else fa++; } }
    expect(tr).toBeGreaterThan(10); expect(fa).toBeGreaterThan(3);
    s.rule.coupRisk = 5; const all = [{ id: "r1", month: 8, kind: "coup" as const, text: "x", real: false }]; s.flags.intel = JSON.stringify(all);
    const cr = s.rule.coupRisk, mil = s.groupMood.military;
    expect(actOnRumour(s, "r1", "purge").ok).toBe(true); expect(s.rule.coupRisk).toBeGreaterThan(cr); expect(s.groupMood.military).toBeLessThan(mil);
    s.flags.intel = JSON.stringify([{ id: "r2", month: 8, kind: "minister", text: "y", real: true, target: "finance" }]);
    expect(actOnRumour(s, "r2", "investigate").ok).toBe(true); expect(rumours(s)[0].hint).toMatch(/true/);
    expect(RUMOUR_ACTIONS.coup.length).toBe(3); void officeMonthly;
  });
  it("calling the National Security Council sharpens the service", () => {
    const s = rich(9015); applyPower(s, "nsc"); expect(s.flags.nscAt).toBe(s.month);
  });
});

describe("trade, visits and arms", () => {
  it("you can only sell what you have built, to a partner who likes you", () => {
    const s = rich(9020);
    expect(dealBlock(s, "china", "crude")).toBeNull(); expect(dealBlock(s, "china", "lithium")).not.toBeNull(); expect(dealBlock(s, "china", "minerals")).not.toBeNull(); expect(dealBlock(s, "china", "rice")).not.toBeNull();
    s.foreign.rel.usa = 20; expect(dealBlock(s, "usa", "crude")).toMatch(/not warm/);
    expect(PRODUCTS.length).toBe(6);
  });
  it("a deal pays off, and a partner suspends it if you rule badly", () => {
    const s = rich(9021); const before = s.modifiers.length; expect(signDeal(s, "usa", "crude").ok).toBe(true); expect(s.modifiers.length).toBe(before + 1); expect(signDeal(s, "usa", "crude").ok).toBe(false);
    s.rule.executions = 2; tradeMonthly(s); expect(dealsOf(s)[0].suspended).toBe(true); expect(s.news.some((n) => n.headline.includes("suspends"))).toBe(true);
  });
  it("what you build opens new markets", () => {
    const s = rich(9022); startProject(s, "garmentHub", "NG-KN", "treasury"); const p = s.projects[0]; p.status = "done"; p.done = 0;
    expect(dealBlock(s, "india", "textiles")).toBeNull(); expect(signDeal(s, "india", "textiles").ok).toBe(true);
  });
  it("a state visit is a scene with real asks, once a year per partner", () => {
    const s = rich(9023); expect(startVisit(s, "china").ok).toBe(true); const e = s.events.find((x) => x.tpl === "stateVisit")!; expect(e.title).toMatch(/China/);
    expect(e.options.map((o) => o.id)).toEqual(["invest", "debt", "security", "smile"]); respond(s, e.id, "smile", true as never);
    expect(visitCooldown(s, "china")).toBeGreaterThan(0); expect(startVisit(s, "china").ok).toBe(false);
  });
  it("arms deals add strength and carry strings", () => {
    const s = rich(9024); const m = s.mil.strength; expect(armsDeal(s, "china").ok).toBe(true); expect(s.mil.strength).toBeGreaterThan(m); expect(armsDeal(s, "china").ok).toBe(false);
    s.rule.executions = 3; expect(armsDeal(s, "usa").ok).toBe(false); expect(SUPPLIERS.length).toBe(3);
  });
});

describe("operations, the whip count and the interest dial", () => {
  it("an operation costs money every month and brings insecurity down; a good commander does better", () => {
    const run = (skill: number) => { const s = rich(9030); s.mil.strength = 60; const cm = { ...commanders(s, "ne")[0], skill, integrity: 90, loyalty: 90 }; s.flags.ops = JSON.stringify([{ theatre: "ne", strategy: "offensive", funding: 3, commander: cm, since: 8, progress: 0 }]); const t0 = s.sec.terror; for (let i = 0; i < 12; i++) { s.month++; opsMonthly(s, subRng(9030, "o", i)); } return t0 - s.sec.terror; };
    expect(run(90)).toBeGreaterThan(run(30));
  });
  it("you can launch two at most, end one, and a corrupt commander steals", () => {
    const s = rich(9031); const c = (t: string) => commanders(s, t)[0].id;
    expect(launchOp(s, "ne", "hearts", 2, c("ne")).ok).toBe(true); expect(launchOp(s, "nw", "defensive", 1, c("nw")).ok).toBe(true); expect(launchOp(s, "delta", "hearts", 1, c("delta")).ok).toBe(false);
    expect(launchOp(s, "ne", "hearts", 2, c("ne")).ok).toBe(false); expect(endOp(s, "ne").ok).toBe(true); expect(opsOf(s).length).toBe(1);
    const t = rich(9032); const bad = { ...commanders(t, "ne")[2], integrity: 5 }; t.flags.ops = JSON.stringify([{ theatre: "ne", strategy: "defensive", funding: 3, commander: bad, since: 8, progress: 0 }]);
    for (let i = 0; i < 40; i++) { t.month++; opsMonthly(t, subRng(9032, "o", i)); } expect(t.ledger.stolen).toBeGreaterThan(0); expect(THEATRES.length).toBe(3);
  });
  it("an offensive strategy costs human rights; hearts and minds earns them", () => {
    const run = (strategy: string) => { const s = rich(9033); s.mil.strength = 60; const cm = { ...commanders(s, "nw")[0], integrity: 60 }; s.flags.ops = JSON.stringify([{ theatre: "nw", strategy, funding: 2, commander: cm, since: 8, progress: 0 }]); const h = s.sec.humanRights; for (let i = 0; i < 12; i++) { s.month++; opsMonthly(s, subRng(9033, "o", i)); } return s.sec.humanRights - h; };
    expect(run("offensive")).toBeLessThan(0); expect(run("hearts")).toBeGreaterThan(0);
  });
  it("the whip count splits the chamber into yes, undecided and no, and an undecided member can be won over", () => {
    const s = rich(9040); const w = whipCount(s, "policy:taxDrive");
    expect(w.seats.yes + w.seats.maybe + w.seats.no).toBeGreaterThan(400); expect(w.maybe.length).toBeGreaterThan(5); expect(w.need).toBe(235);
    const lm = w.maybe[0]; const l0 = lm.loyalty, p0 = billChance(s, "policy:taxDrive"); expect(winOver(s, "policy:taxDrive", lm.id).ok).toBe(true);
    expect(lm.loyalty).toBeGreaterThan(l0); expect(billChance(s, "policy:taxDrive")).toBeGreaterThan(p0); expect(winOver(s, "policy:taxDrive", lm.id).ok).toBe(false);
  });
  it("a high interest rate cools prices and costs jobs; changing it is capped", () => {
    const s = rich(9050); expect(rateLevel(s)).toBe(0); expect(setRate(s, 1).ok).toBe(true); expect(s.modifiers.some((m) => m.source === "dial:rate")).toBe(true);
    expect(setRate(s, -1).ok).toBe(false); s.month += 4; expect(setRate(s, -1).ok).toBe(true); expect(RATE_LABEL[-1].name).toBe("Low");
  });
});
void createEvent;
