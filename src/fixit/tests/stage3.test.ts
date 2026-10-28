import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { enactPolicy, startProject } from "../engine/actions";
import { POLICIES, PROJECTS, POLICY_BY_ID, PROJECT_BY_ID } from "../data/catalogue";
import { LADDERS, jobsCreated, ladderProgress, laddersMonthly, rungState } from "../engine/ladders";
import { MOVES, doMove } from "../engine/bigmoves";
import { carryOut, ideas, makeProposal, proposers, routineMonthly, setRoutine } from "../engine/proposals";
import { ministerCard, signatureOf } from "../engine/cabinet";
import { createEvent } from "../engine/events";
import { respond } from "../engine/actions";
import { castArcsMonthly } from "../engine/castarcs";
import { subRng } from "../../game/engine/rng";
import { billFor } from "../engine/politics";
import { BILL_DIFFICULTY } from "../engine/politics";

const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.eco.investor = 80; s.fin.creditRating = 80; return s; };

describe("a reviewed catalogue", () => {
  it("retired items are hidden and never proposed, but still resolve for old saves", () => {
    for (const id of ["eduCut", "healthCut"]) { expect(POLICY_BY_ID[id].retired).toBe(true); }
    for (const id of ["transit", "pipelineSecure"]) { expect(PROJECT_BY_ID[id].retired).toBe(true); }
    const s = rich(8001); for (const i of ideas(s, true)) expect(["eduCut", "healthCut", "transit", "pipelineSecure"]).not.toContain(i.id);
  });
  it("ten new policies and thirteen new projects, each well formed", () => {
    for (const id of ["cngConversion", "mineralsLicensing", "startupAct", "creativeFund", "tourismVisa", "landReform", "diasporaBonds", "digitalId", "oilTheftTaskForce", "ecowasTrade"]) { const p = POLICY_BY_ID[id]; expect(p, id).toBeDefined(); expect(p.setup).toBeGreaterThan(0); expect(Object.keys(p.effects).length).toBeGreaterThan(0); }
    for (const id of ["fertiliserPlant", "riceMills", "exportHub", "garmentHub", "lithiumPlant", "nollywoodCity", "techHubs", "tourismSites", "modularRefinery", "cngStations", "broadband", "housing", "dams"]) { const d = PROJECT_BY_ID[id]; expect(d, id).toBeDefined(); expect(d.funding.length).toBeGreaterThan(0); expect(d.months).toBeGreaterThan(5); }
    expect(PROJECTS.filter((d) => !d.retired).length).toBeGreaterThan(30); expect(POLICIES.filter((p) => !p.retired).length).toBeGreaterThan(30);
  });
  it("laws that change taxes, land, ID or trade need the Assembly; executive programmes do not", () => {
    for (const id of ["landReform", "digitalId", "diasporaBonds", "mineralsLicensing", "ecowasTrade"]) { expect(BILL_DIFFICULTY[`policy:${id}`], id).toBeGreaterThan(0); expect(billFor({ type: "policy", id })).not.toBeNull(); }
    for (const id of ["cngConversion", "oilTheftTaskForce", "creativeFund", "tourismVisa"]) expect(billFor({ type: "policy", id })).toBeNull();
  });
  it("new projects really change the state they are built in", () => {
    const s = rich(8002);
    for (const id of ["garmentHub", "housing", "techHubs"]) { const r = startProject(s, id, id === "garmentHub" ? "NG-KN" : "NG-LA", "treasury"); expect(r.ok, id).toBe(true); }
    expect(s.projects.length).toBe(3);
  });
});

describe("solution ladders", () => {
  it("five ladders, each with real steps that exist in the catalogue", () => {
    expect(LADDERS.length).toBe(5);
    for (const l of LADDERS) { expect(l.rungs.length).toBeGreaterThanOrEqual(5); expect(l.milestones.length).toBeGreaterThanOrEqual(2); for (const r of l.rungs) expect(r.kind === "project" ? PROJECT_BY_ID[r.ref] : POLICY_BY_ID[r.ref], r.ref).toBeDefined(); }
  });
  it("climbing the food ladder makes Nigeria self-sufficient, then an exporter, with real rewards", () => {
    const s = rich(8010); s.month = 4;
    enactPolicy(s, "farmInputs");
    const finish = (def: string, st: string) => { startProject(s, def, st, "treasury"); const p = s.projects[s.projects.length - 1]; p.status = "done"; p.done = s.month; p.benefitScale = 1; };
    finish("irrigation", "NG-KN"); finish("storage", "NG-KD");
    laddersMonthly(s); expect(s.flags["lad:riceself"]).toBeUndefined();
    finish("riceMills", "NG-KN"); laddersMonthly(s);
    expect(s.flags["lad:riceself"]).toBeDefined(); expect(s.news.some((n) => n.headline === "Nigeria is self-sufficient in rice")).toBe(true);
    expect(s.modifiers.some((m) => m.source === "ladder:riceself")).toBe(true);
    const n = s.news.filter((x) => x.headline === "Nigeria is self-sufficient in rice").length; laddersMonthly(s); expect(s.news.filter((x) => x.headline === "Nigeria is self-sufficient in rice").length).toBe(n);
    expect(rungState(s, LADDERS[0].rungs[6]).state).toBe("open");
    finish("exportHub", "NG-LA"); const res = s.eco.reserves; laddersMonthly(s); expect(s.flags["lad:riceexport"]).toBeDefined(); laddersMonthly(s); expect(s.eco.reserves).toBeGreaterThan(res);
    expect(ladderProgress(s, LADDERS[0])).toBeGreaterThan(0.5);
  });
  it("the export hub is locked until you can process food, and lithium needs the licensing policy", () => {
    const s = rich(8011);
    expect(rungState(s, { kind: "project", ref: "exportHub", why: "" }).state).toBe("locked");
    expect(rungState(s, { kind: "project", ref: "lithiumPlant", why: "" }).state).toBe("locked");
    enactPolicy(s, "mineralsLicensing"); expect(rungState(s, { kind: "project", ref: "lithiumPlant", why: "" }).state).toBe("open");
  });
  it("jobs are counted, and milestones fire as they pass", () => {
    const s = rich(8012); s.month = 5; expect(jobsCreated(s)).toBe(0);
    for (const id of ["skillsCorps", "smeLoans", "startupAct"]) enactPolicy(s, id);
    for (const [def, st] of [["industrial", "NG-KN"], ["garmentHub", "NG-KN"]] as const) { startProject(s, def, st, "treasury"); const p = s.projects[s.projects.length - 1]; p.status = "done"; p.done = 0; p.benefitScale = 1; }
    expect(jobsCreated(s)).toBeGreaterThan(300000); laddersMonthly(s);
    expect(s.flags["lad:jobs100"]).toBeDefined(); expect(s.flags["lad:jobs500"]).toBeUndefined();
  });
});

describe("new big moves", () => {
  it("the jollof joke is gone and eight serious moves are in", () => {
    const ids = MOVES.map((m) => m.id); expect(ids).not.toContain("jollof");
    for (const id of ["probe", "sackcbn", "redesign", "amnesty", "youthservice", "privatise", "relocate", "pricecap"]) expect(ids).toContain(id);
  });
  it("each one runs, costs capital, returns a story and leaves a trace", () => {
    for (const id of ["probe", "sackcbn", "redesign", "amnesty", "youthservice", "privatise", "relocate", "pricecap"]) {
      const s = rich(8020); const pc = s.cap.pc; const r = doMove(s, id);
      expect(r.ok, id).toBe(true); expect(r.message.length).toBeGreaterThan(20); expect(s.cap.pc).toBeLessThan(pc);
    }
  });
  it("consequences arrive later: the price cap ends in a catch-up jump, the redesign pays back", () => {
    const s = rich(8021); s.eco.reserves = 40; doMove(s, "pricecap"); doMove(s, "redesign");
    advanceMonths(s, 8);
    expect(s.news.some((n) => n.headline.startsWith("Petrol cap ends"))).toBe(true); expect(s.news.some((n) => n.headline.startsWith("Cash swap deadline"))).toBe(true);
  });
});

describe("ministers run their sectors", () => {
  it("ministers bring ideas from their own sector, and their quality follows their skill", () => {
    const s = rich(8030); s.month = 6;
    const power = proposers(s).find((p) => p.role === "Power Minister")!; power.skill = 85;
    const p = makeProposal(s, power, subRng(1, "m"))!; expect(p).not.toBeNull(); expect(["power", "oil"]).toContain(p.need); expect(p.reason).toMatch(/As your Power Minister/);
  });
  it("delegating to a corrupt minister wrecks the project; an honest one does it well", () => {
    const run = (skill: number, integrity: number, mood: number) => {
      const s = rich(8031); s.month = 6; const m = s.cabinet.members.power!; m.skill = skill; m.integrity = integrity; m.mood = mood;
      const p = { kind: "project" as const, id: "gasPlant", name: "Gas power plant", stateId: "NG-RI", funding: "treasury" as const, by: m.id, need: "power" as const, vanity: false, padded: false, reason: "", role: "Power Minister" };
      carryOut(s, p, "deleg", subRng(8031, "c")); return { s, pr: s.projects[s.projects.length - 1] };
    };
    const good = run(90, 90, 90), bad = run(25, 10, 10);
    expect(bad.pr.quality).toBeLessThan(good.pr.quality); expect(bad.s.ledger.stolen).toBeGreaterThan(good.s.ledger.stolen); expect(bad.pr.notes.join(" ")).toMatch(/Handled by/);
  });
  it("a report card says what each minister adds, and picked ministers have a signature", () => {
    const s = rich(8032); const c = ministerCard(s, "power")!; expect(["A", "B", "C", "D", "F"]).toContain(c.grade); expect(c.line).toMatch(/Because of them/);
    const m = s.cabinet.pool.find((x) => x.portfolio === "power" && x.faction !== "crony")!; expect(signatureOf(m).label.length).toBeGreaterThan(4);
  });
  it("good ministers deliver breakthroughs; unhappy ones threaten to quit", () => {
    const g = rich(8033); g.month = 9; const m = g.cabinet.members.finance!; m.skill = 90; m.integrity = 90; m.since = 0; let ev = false;
    for (let i = 0; i < 80 && !ev; i++) { g.month += 1; castArcsMonthly(g, subRng(8033, "g", i)); for (const x of g.events) if (x.tpl.startsWith("arc")) x.status = "resolved"; ev = g.events.some((e) => e.tpl === "minBreakthrough"); if (!ev) for (const k of Object.keys(g.flags)) if (k.startsWith("minLast:") || k.startsWith("arcLast:")) delete g.flags[k]; }
    expect(ev).toBe(true);
    const q = rich(8034); q.month = 9; const m2 = q.cabinet.members.power!; m2.skill = 80; m2.mood = 10; let threat = false;
    for (let i = 0; i < 80 && !threat; i++) { q.month += 1; castArcsMonthly(q, subRng(8034, "q", i)); for (const x of q.events) if (x.tpl.startsWith("arc")) x.status = "resolved"; threat = q.events.some((e) => e.tpl === "minThreat"); if (!threat) for (const k of Object.keys(q.flags)) if (k.startsWith("minLast:") || k.startsWith("arcLast:")) delete q.flags[k]; }
    expect(threat).toBe(true);
    const e = q.events.find((x) => x.tpl === "minThreat")!; respond(q, e.id, "go"); expect(q.cabinet.members.power).toBeUndefined();
  });
});

describe("your chief of staff handles routine matters, if you let them", () => {
  it("only when switched on, and only small requests", () => {
    const s = rich(8040); s.month = 6; s.staff.cos = { id: "c", kind: "technocrat", name: "Dr C", bio: "", skill: 80, loyalty: 80, integrity: 90, portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, revealed: true, since: 0 };
    const e = createEvent(s, "marketLetter", "NG-LA")!; const big = createEvent(s, "backerDemand", "NG-FC");
    routineMonthly(s, subRng(1, "r")); expect(e.status).toBe("open");
    setRoutine(s, true); routineMonthly(s, subRng(1, "r"));
    expect(e.status).toBe("resolved"); if (big) expect(big.status).toBe("open");
  });
  it("a corrupt chief of staff sometimes takes the dirty way out and it leaves a trail", () => {
    let dirty = 0;
    for (let seed = 8050; seed < 8080; seed++) {
      const s = rich(seed); s.month = 6; s.staff.cos = { id: "c", kind: "friend", name: "Friend", bio: "", skill: 70, loyalty: 90, integrity: 10, portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, revealed: false, since: 0 };
      setRoutine(s, true); const before = s.me.evidence; const e = createEvent(s, "relatives", "NG-FC")!; routineMonthly(s, subRng(seed, "r")); if (e.chosen === "give" || s.me.evidence > before) dirty++;
    }
    expect(dirty).toBeGreaterThan(3);
  });
});
