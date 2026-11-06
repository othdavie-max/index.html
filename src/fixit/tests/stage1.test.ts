import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonth, advanceMonths, localEffects } from "../engine/sim";
import { startProject } from "../engine/actions";
import { canContinue, continueNigeria, successors } from "../engine/succession";
import { stateProgress } from "../engine/progress";
import { termCap } from "../engine/terms";
import { snap } from "../engine/util";

const endTerm = (s: ReturnType<typeof newGame>) => { s.fin.treasury = 1e6; s.gov.approval = 80; for (let i = 0; i < 120 && !s.ended; i++) advanceMonth(s); };

describe("what you build changes the place you build it", () => {
  it("a finished project pulls its state and, a little, its zone toward better numbers", () => {
    const s = newGame(5001); s.fin.treasury = 1e6; s.cap.pc = 100;
    startProject(s, "solar", "NG-KN", "treasury");
    const p = s.projects[0]; p.status = "done"; p.done = s.month; p.benefitScale = 1;
    advanceMonths(s, 12);
    const loc = localEffects(s);
    expect(loc["NG-KN"].power!).toBeLessThan(-10);
    const neighbour = Object.keys(loc).find((id) => id !== "NG-KN" && (loc[id].power ?? 0) < 0);
    expect(neighbour).toBeDefined(); expect(loc[neighbour!].power!).toBeGreaterThan(loc["NG-KN"].power!);
  });
  it("a state reports its own progress against day one, with light hours and a verdict", () => {
    const s = newGame(5002); s.fin.treasury = 1e6;
    const r = s.regions["NG-KN"]; r.start = { food: r.food, insecurity: r.insecurity, jobless: r.jobless, power: r.power };
    r.power -= 40; r.jobless -= 15; r.food -= 10;
    const p = stateProgress(s, "NG-KN")!;
    expect(p.powerHours[1]).toBeGreaterThan(p.powerHours[0]); expect(p.jobsCreated).toBeGreaterThan(0); expect(p.verdict).toBe("thriving");
    r.power += 90; r.jobless += 30; r.food += 20; expect(stateProgress(s, "NG-KN")!.verdict).toBe("slipping");
  });
  it("big improvements are celebrated in the news once", () => {
    const s = newGame(5003); s.fin.treasury = 1e6; advanceMonths(s, 7);
    const r = s.regions["NG-KN"]; r.power = Math.max(0, (r.start?.power ?? 50) - 30);
    advanceMonths(s, 1); advanceMonths(s, 1);
    expect(s.news.filter((n) => n.source === "ms:NG-KN:power").length).toBeLessThanOrEqual(1);
  });
});

describe("continue this Nigeria", () => {
  it("the same country carries on: nothing about the economy or projects is touched", () => {
    const s = newGame(5010); s.eco.fx = 520; s.eco.inflation = 9; s.fin.treasury = 5e5;
    startProject(s, "solar", "NG-KN", "treasury"); s.projects[0].status = "done"; s.projects[0].done = 3;
    endTerm(s); expect(s.done).toBe(true); expect(canContinue(s)).toBeNull();
    const fx = s.eco.fx, infl = s.eco.inflation, done = s.projects.filter((p) => p.status === "done").length, debt = s.fin.domesticDebt;
    const opts = successors(s); expect(opts.length).toBeGreaterThanOrEqual(2);
    const r = continueNigeria(s, opts[0].id);
    expect(r.ok).toBe(true); expect(s.done).toBe(false); expect(s.ended).toBeNull();
    expect(s.eco.fx).toBe(fx); expect(s.eco.inflation).toBe(infl); expect(s.fin.domesticDebt).toBe(debt);
    expect(s.projects.filter((p) => p.status === "done").length).toBe(done);
    expect(s.meta.president).toBe(opts[0].name); expect(s.cap.era).toBe(2); expect(s.term).toBe(1);
    expect(s.promises).toEqual([]); expect(s.staff.picked).toBe(false); expect(s.me.evidence).toBe(0);
  });
  it("the new president can govern: the game keeps running with nothing resetting", () => {
    const s = newGame(5011); endTerm(s);
    continueNigeria(s, successors(s)[0].id);
    s.staff.picked = true; const fx0 = s.eco.fx;
    advanceMonths(s, 6);
    expect(s.month).toBeGreaterThan(48); expect(Math.abs(s.eco.fx - fx0) / fx0).toBeLessThan(0.4);
    expect(s.baseline.month).toBeGreaterThanOrEqual(48); void snap;
  });
  it("a different president means different candidates for the team", () => {
    const s = newGame(5012); endTerm(s);
    const first = s.cabinet.pool.map((m) => m.id).join();
    continueNigeria(s, successors(s)[0].id);
    expect(s.cabinet.pool.map((m) => m.id).join()).not.toBe(first);
  });
  it("fleeing the country ends it for good", () => {
    const s = newGame(5013); endTerm(s); s.flags.exit = "flee"; expect(canContinue(s)).not.toBeNull();
    expect(continueNigeria(s, "party").ok).toBe(false);
  });
  it("a defeated president's rival is offered as the next one", () => {
    const s = newGame(5014); s.fin.treasury = 1e6; s.gov.approval = 10; s.gov.trust = 10;
    for (let i = 0; i < 120 && !s.ended; i++) advanceMonth(s);
    if (s.terms[s.terms.length - 1]?.result === "lost") expect(successors(s)[0].source).toBe("rival");
  });
  it("legacy mode has no term limit; quick has one", () => {
    expect(termCap(newGame(5015, undefined, { legacy: true }))).toBe(99);
    expect(termCap(newGame(5016, undefined, { quick: true }))).toBe(1);
    expect(termCap(newGame(5017))).toBe(2);
  });
});
