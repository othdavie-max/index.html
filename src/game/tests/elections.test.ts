import { describe, it, expect } from "vitest";
import { makeGame, lgaNamed } from "./helpers";
import { runContest, TERMS, type Runner, type ModelContext } from "../engine/electionModel";
import { ruleOf } from "../engine/world";
import { checkPlayerEligibility } from "../engine/eligibility";
import { availableRaces, declareCandidacy } from "../engine/campaign";
import { perform } from "../engine/actions";
import { advance } from "./helpers";
import type { GameState } from "../engine/types";
import type { OfficeId } from "../data/rules";

const base = (key: string, partyId: string, over: Partial<Runner> = {}): Runner => ({
  key, partyId, name: key, isPlayer: false, charId: null, appeal: 50, charisma: 50, integrity: 50, organisation: 40, momentum: 0, scandal: 0, budgetRatio: 0.3,
  incumbent: false, homeLgaId: null, homeStateId: null, ...over,
});
function ctxFor(s: GameState, office: OfficeId, lgaIds: string[], key: string, month = 13, round: 1 | 2 = 1): ModelContext {
  return { state: s, rule: ruleOf(s), office, seatLgaIds: lgaIds, lgaWeights: lgaIds.map(() => 1), seatStateId: office === "president" ? null : lgaIds[0].split("-").slice(0, 2).join("-"), electionMonth: month, round, rngSeedKey: key };
}
/** give every LGA the same neutral affinity over the listed parties */
function neutral(s: GameState, parties: string[]) {
  for (const l of Object.values(s.lgas)) { l.affinity = Object.fromEntries(parties.map((p) => [p, 1 / parties.length])); }
}
const allLgas = (s: GameState) => Object.keys(s.lgas);
const stateLgas = (s: GameState, id: string) => s.states[id].lgaIds;

describe("election model", () => {
  it("is deterministic for the same inputs", () => {
    const s = makeGame();
    const lgas = stateLgas(s, "NG-LA");
    const r = () => [base("a", "NRC"), base("b", "PHP"), base("c", "LCM")];
    const x = runContest(ctxFor(s, "governor", lgas, "k1"), r());
    const y = runContest(ctxFor(s, "governor", lgas, "k1"), r());
    expect(x.votes).toEqual(y.votes);
    expect(x.winnerKey).toBe(y.winnerKey);
  });
  it("produces coherent results: shares sum to 1, turnout bounded, votes ≤ registered", () => {
    const s = makeGame();
    const res = runContest(ctxFor(s, "reps", stateLgas(s, "NG-KN").slice(0, 3), "k2"), [base("a", "NRC"), base("b", "PHP"), base("c", "SDU")]);
    const sum = Object.values(res.shares).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(res.turnout).toBeGreaterThan(0.05);
    expect(res.turnout).toBeLessThan(0.85);
    expect(res.totalVotes).toBeLessThanOrEqual(res.registered);
    for (const t of TERMS) for (const k of ["a", "b", "c"]) expect(typeof res.factors[k][t]).toBe("number");
    expect(res.winnerKey).toBe(Object.entries(res.votes).sort((a, b) => b[1] - a[1])[0][0]); // plurality for legislative seats
  });
  it("presidential: leader without the required spread does not win outright; runoff goes to the finalists", () => {
    const s = makeGame();
    const parties = ["NRC", "PHP"];
    // NRC overwhelmingly strong in 10 populous states, weak (but present) elsewhere; PHP wins the rest
    const strong = new Set(["NG-KN", "NG-KD", "NG-KT", "NG-JI", "NG-BA", "NG-BO", "NG-SO", "NG-NI", "NG-KE", "NG-ZA", "NG-BE", "NG-PL", "NG-OY"]);
    for (const l of Object.values(s.lgas)) {
      const sid = l.id.split("-").slice(0, 2).join("-");
      l.affinity = strong.has(sid) ? { NRC: 0.97, PHP: 0.03 } : { NRC: 0.03, PHP: 0.97 };
    }
    const res = runContest(ctxFor(s, "president", allLgas(s), "pres-a"), [base("x", "NRC"), base("y", "PHP")]);
    expect(res.spread).toBeDefined();
    expect(res.spread!.unitsNeeded).toBe(24);
    expect(res.spread!.achieved).toBe(false);
    expect(res.needsRunoff).toBe(true);
    expect(res.finalists).toHaveLength(2);
  });
  it("presidential: a broad coalition across states wins outright", () => {
    const s = makeGame();
    neutral(s, ["NRC", "PHP", "LCM"]);
    for (const l of Object.values(s.lgas)) l.affinity = { NRC: 0.5, PHP: 0.3, LCM: 0.2 };
    const res = runContest(ctxFor(s, "president", allLgas(s), "pres-b"), [base("x", "NRC"), base("y", "PHP"), base("z", "LCM")]);
    expect(res.winnerKey).toBe("x");
    expect(res.spread!.achieved).toBe(true);
    expect(res.spread!.unitsMet).toBeGreaterThanOrEqual(24);
    expect(res.needsRunoff).toBeFalsy();
  });
  it("governorship: 25% in two-thirds of LGAs is required", () => {
    const s = makeGame();
    const lgas = stateLgas(s, "NG-LA"); // 20 LGAs → needs 14
    // three parties split: leader gets ~34% overall but under 25% in half the LGAs
    lgas.forEach((id, i) => { s.lgas[id].affinity = i < 10 ? { NRC: 0.55, PHP: 0.3, LCM: 0.15 } : { NRC: 0.15, PHP: 0.55, LCM: 0.30 }; });
    const res = runContest(ctxFor(s, "governor", lgas, "gov-a"), [base("x", "NRC"), base("y", "PHP"), base("z", "LCM")]);
    expect(res.spread!.unitsNeeded).toBe(14);
    expect(res.spread!.achieved).toBe(false);
    expect(res.needsRunoff).toBe(true);
    lgas.forEach((id) => { s.lgas[id].affinity = { NRC: 0.55, PHP: 0.3, LCM: 0.15 }; });
    const res2 = runContest(ctxFor(s, "governor", lgas, "gov-b"), [base("x", "NRC"), base("y", "PHP"), base("z", "LCM")]);
    expect(res2.spread!.achieved).toBe(true);
    expect(res2.needsRunoff).toBeFalsy();
  });
  it("runoff pits two finalists and the winner has the most votes", () => {
    const s = makeGame();
    for (const l of Object.values(s.lgas)) l.affinity = { NRC: 0.4, PHP: 0.35, LCM: 0.25 };
    const lgas = stateLgas(s, "NG-KN");
    const res = runContest({ ...ctxFor(s, "governor", lgas, "run-1", 14, 2), eliminated: [{ partyId: "LCM", endorses: "y" }] }, [base("x", "NRC"), base("y", "PHP")]);
    expect(Object.keys(res.votes).sort()).toEqual(["x", "y"]);
    expect(res.winnerKey).toBe(res.votes.x > res.votes.y ? "x" : "y");
  });

  describe("outcomes follow the underlying conditions (not scripts)", () => {
    const wins = (mk: (s: GameState) => [Runner, Runner], office: OfficeId = "reps", n = 40) => {
      let a = 0;
      for (let i = 0; i < n; i++) {
        const s = makeGame({ seed: 100 + i });
        const lgas = stateLgas(s, "NG-OY").slice(0, 3);
        neutral(s, ["NRC", "PHP"]);
        const [r1, r2] = mk(s);
        const res = runContest(ctxFor(s, office, lgas, `mc${i}`), [r1, r2]);
        if (res.winnerKey === "a") a++;
      }
      return a / n;
    };
    it("money helps but does not guarantee victory", () => {
      const rich = wins(() => [base("a", "NRC", { budgetRatio: 1.0 }), base("b", "PHP", { budgetRatio: 0.15 })]);
      expect(rich).toBeGreaterThan(0.55);
      expect(rich).toBeLessThan(0.99);
    });
    it("a well-funded candidate loses to a popular, organised, locally rooted one", () => {
      const p = wins((s) => [base("a", "NRC", { budgetRatio: 1.4, appeal: 35, organisation: 10, momentum: -0.2 }), base("b", "PHP", { budgetRatio: 0.1, appeal: 68, organisation: 70, momentum: 0.2, homeLgaId: stateLgas(s, "NG-OY")[0], homeStateId: "NG-OY" })]);
      expect(p).toBeLessThan(0.25);
    });
    it("party base matters", () => {
      let a = 0;
      for (let i = 0; i < 30; i++) {
        const s = makeGame({ seed: 200 + i });
        const lgas = stateLgas(s, "NG-OY").slice(0, 3);
        for (const id of lgas) s.lgas[id].affinity = { NRC: 0.7, PHP: 0.3 };
        const res = runContest(ctxFor(s, "reps", lgas, `pb${i}`), [base("a", "NRC"), base("b", "PHP")]);
        if (res.winnerKey === "a") a++;
      }
      expect(a / 30).toBeGreaterThan(0.8);
    });
    it("a bad economy hurts the governing party", () => {
      const run = (sat: number) => {
        let tot = 0;
        for (let i = 0; i < 20; i++) {
          const s = makeGame({ seed: 300 + i });
          s.economy.satisfaction = sat;
          const pres = s.seats["pres"].partyId!;
          const other = pres === "PHP" ? "NRC" : "PHP";
          neutral(s, [pres, other]);
          const res = runContest(ctxFor(s, "president", allLgas(s), `eco${i}`), [base("a", pres), base("b", other)]);
          tot += res.shares.a;
        }
        return tot / 20;
      };
      expect(run(75)).toBeGreaterThan(run(20) + 0.05);
    });
    it("insecurity lowers turnout", () => {
      const run = (inc: number) => {
        const s = makeGame({ seed: 7 });
        const lgas = stateLgas(s, "NG-BO");
        s.states["NG-BO"].incidents = inc;
        return runContest(ctxFor(s, "governor", lgas, "turn"), [base("a", "NRC"), base("b", "PHP")]).turnout;
      };
      expect(run(0)).toBeGreaterThan(run(90));
    });
    it("scandal costs votes", () => {
      let clean = 0, tainted = 0;
      for (let i = 0; i < 25; i++) {
        const s = makeGame({ seed: 400 + i });
        const lgas = stateLgas(s, "NG-OY").slice(0, 3);
        neutral(s, ["NRC", "PHP"]);
        clean += runContest(ctxFor(s, "reps", lgas, `sc${i}`), [base("a", "NRC"), base("b", "PHP")]).shares.a;
        tainted += runContest(ctxFor(s, "reps", lgas, `sc${i}`), [base("a", "NRC", { scandal: 70 }), base("b", "PHP")]).shares.a;
      }
      expect(clean).toBeGreaterThan(tainted);
    });
  });
});

describe("candidate eligibility follows the ruleset", () => {
  const eligible = (s: GameState, office: OfficeId, month = 13) => checkPlayerEligibility(s, office, month);
  const ok = (e: ReturnType<typeof eligible>, id: string) => e.checks.find((c) => c.id === id)!.ok;
  it("enforces minimum ages per office on election day", () => {
    const young = makeGame({ startAge: 24 });
    perform(young, { t: "joinParty", partyId: "PHP" }); advance(young, 3, { keepAfloat: 50000 });
    // election day 12 months from start: player is 24 now (+ up to 12 months)
    expect(ok(eligible(young, "reps", young.clock.monthIndex), "age")).toBe(false);
    expect(ok(eligible(young, "reps", young.clock.monthIndex + 12), "age")).toBe(true); // 25 by then
    expect(ok(eligible(young, "senate", young.clock.monthIndex + 12), "age")).toBe(false);
    expect(ok(eligible(young, "governor", young.clock.monthIndex + 12), "age")).toBe(false);
    expect(ok(eligible(young, "president", young.clock.monthIndex + 12), "age")).toBe(false);
    const older = makeGame({ startAge: 35 });
    for (const o of ["senate", "governor", "president", "reps", "state_assembly", "lg_chair"] as OfficeId[]) expect(ok(eligible(older, o, 1), "age"), o).toBe(true);
  });
  it("different offices have different rules (not identical)", () => {
    const rule = ruleOf(makeGame());
    expect(new Set(Object.values(rule.offices).map((o) => o.minAge)).size).toBeGreaterThan(2);
    expect(rule.offices.president.termLimit).toBe(2);
    expect(rule.offices.senate.termLimit).toBeNull();
    expect(rule.offices.president.citizenshipByBirth).toBe(true);
  });
  it("requires party sponsorship for a minimum period", () => {
    const s = makeGame({ startAge: 40 });
    expect(ok(eligible(s, "reps"), "party")).toBe(false);
    perform(s, { t: "joinParty", partyId: "NRC" });
    expect(ok(eligible(s, "reps"), "party")).toBe(false); // joined this month
    advance(s, 3, { keepAfloat: 100000 });
    expect(ok(eligible(s, "reps"), "party")).toBe(true);
  });
  it("requires secondary-school education", () => {
    const s = makeGame({ startAge: 40 });
    s.player.education.level = "none";
    expect(ok(eligible(s, "governor"), "education")).toBe(false);
    s.player.education.level = "secondary";
    expect(ok(eligible(s, "governor"), "education")).toBe(true);
  });
  it("applies term limits only where they exist", () => {
    const s = makeGame({ startAge: 45 });
    s.player.politics.termsServed = { president: 2, senate: 5 };
    expect(ok(eligible(s, "president"), "terms")).toBe(false);
    expect(ok(eligible(s, "senate"), "terms")).toBe(true);
  });
  it("bars recent convictions for dishonesty for ten years, then no more", () => {
    const s = makeGame({ startAge: 45 });
    s.clock.monthIndex = 60;
    s.player.integrity.convictions.push({ m: 50, text: "fraud", dishonesty: true });
    expect(ok(eligible(s, "reps", 60 + 24), "conviction")).toBe(false);
    expect(ok(eligible(s, "reps", 50 + 10 * 12 + 1), "conviction")).toBe(true);
    s.player.integrity.convictions = [{ m: 50, text: "traffic offence", dishonesty: false }];
    expect(ok(eligible(s, "reps", 60 + 24), "conviction")).toBe(true);
  });
  it("requires appointees to resign before contesting", () => {
    const s = makeGame({ startAge: 40 });
    s.player.politics.appointment = { id: "ap1", label: "Adviser", office: "x", since: 0, level: "state", stateId: "NG-LA" };
    expect(ok(eligible(s, "reps"), "appointee")).toBe(false);
    perform(s, { t: "resignAppointment" });
    expect(ok(eligible(s, "reps"), "appointee")).toBe(true);
  });
});

describe("declaring candidacy", () => {
  it("needs an open window, eligibility and the nomination fee", () => {
    const s = makeGame({ startAge: 30, backgroundId: "business", seed: 31 });
    perform(s, { t: "joinParty", partyId: "NRC" });
    advance(s, 3, { keepAfloat: 300000 });
    const races = availableRaces(s);
    const chair = races.find((r) => r.seat.office === "lg_chair")!;
    expect(chair).toBeDefined();
    if (!chair.open) {
      expect(declareCandidacy(s, chair.seat.id).ok).toBe(false);
    }
    // senate/governor/president require age 35
    const gov = availableRaces(s).find((r) => r.seat.office === "governor")!;
    expect(gov.eligibility.eligible).toBe(false);
    expect(declareCandidacy(s, gov.seat.id).ok).toBe(false);
    expect(lgaNamed("Ikeja")).toBeTruthy();
  });
  it("charges the fee once, from personal funds, and rejects a second candidacy", () => {
    const s = makeGame({ startAge: 30, backgroundId: "business", seed: 31 });
    perform(s, { t: "joinParty", partyId: "NRC" });
    let r;
    for (let i = 0; i < 30 && !r; i++) { advance(s, 1, { keepAfloat: 500000 }); r = availableRaces(s).find((x) => x.open && x.eligibility.eligible && x.seat.office !== "president"); }
    expect(r).toBeDefined();
    s.player.finances.cash += 30_000_000;
    const before = s.player.finances.cash + s.player.finances.savings;
    const res = declareCandidacy(s, r!.seat.id);
    expect(res.ok).toBe(true);
    const after = s.player.finances.cash + s.player.finances.savings;
    expect(before - after).toBe(r!.fee);
    const again = declareCandidacy(s, r!.seat.id);
    expect(again.ok).toBe(false);
  });
});
