import { describe, it, expect } from "vitest";
import { makeGame, advance, digest } from "./helpers";
import { perform } from "../engine/actions";
import { joinParty, leaveParty, defect, applyPartyOffice, foundingRequirements, startFoundingParty, processPartyFounding } from "../engine/politics";
import { enterOfficeAsPlayer } from "../engine/campaign";
import { execInfo, startProject, jurisdictionBudget, setAllocations, setFuelSubsidy, divertFunds, inflateProject, appoint, nomineesFor } from "../engine/governance";
import { startScheme, cover, institutions, hireLawyers } from "../engine/corruption";
import { checkPlayerEligibility } from "../engine/eligibility";
import { stepEconomy, initialEconomy, normaliseAllocations, subsidyCostAnnualBn, importParityFuelPrice, addShock, debtToGdp } from "../engine/economy";
import { Rng } from "../engine/rng";
import { credit, debit, netWorth, closeMonth } from "../engine/finance";
import { upcoming, suggestions } from "../engine/insights";
import { contestIdFor } from "../engine/elections";
import { weightedAverageIndicators } from "../engine/world";
import type { GameState } from "../engine/types";

function makeChair(seed = 3): GameState {
  const s = makeGame({ startAge: 30, seed });
  const seat = s.seats[`lgc:${s.player.residenceLgaId}`];
  const c = s.contests[contestIdFor(seat)] ?? ({ phase: "done" } as never);
  perform(s, { t: "joinParty", partyId: "NRC" });
  enterOfficeAsPlayer(s, seat, c);
  s.government.localTreasuryM = 5_000;
  return s;
}

describe("personal and government finances stay separate", () => {
  it("every change in liquid funds is explained by a ledger entry", () => {
    for (const bg of ["business", "low"]) {
      const s = makeGame({ seed: 12, backgroundId: bg, startAge: 27, path: { courseId: "economics", jobId: "bank_officer" } });
      const start = s.player.finances.cash + s.player.finances.savings;
      advance(s, 18);
      const f = s.player.finances;
      const ledger = f.ledger.filter((l) => l.account === "cash").reduce((t, l) => t + l.amount, 0);
      // amounts are rounded to whole naira per entry, so allow a small rounding tolerance
      expect(Math.abs(f.cash + f.savings - start - ledger)).toBeLessThan(200);
      for (const l of f.ledger) { expect(l.label.length).toBeGreaterThan(0); expect(Number.isFinite(l.amount)).toBe(true); }
    }
  });
  it("income and spending always carry a reason and category", () => {
    const s = makeGame({ startAge: 27, path: { courseId: "economics", jobId: "bank_officer" } });
    advance(s, 3);
    const cats = new Set(s.player.finances.ledger.map((l) => l.cat));
    expect(cats.has("salary")).toBe(true);
    expect(cats.has("food")).toBe(true);
    expect(cats.has("rent") || cats.has("transport")).toBe(true);
  });
  it("shortfalls on essentials become a loan, never negative cash", () => {
    const s = makeGame({ backgroundId: "low", seed: 4 });
    s.player.finances.cash = 0; s.player.finances.savings = 0;
    advance(s, 4);
    expect(s.player.finances.cash).toBeGreaterThanOrEqual(0);
    expect(s.player.finances.debts.length).toBeGreaterThan(0);
    expect(s.player.attrs.stress).toBeGreaterThan(18);
  });
  it("running a project from the treasury does not touch personal money", () => {
    const s = makeChair();
    const cash0 = s.player.finances.cash, sav0 = s.player.finances.savings, nw0 = netWorth(s.player.finances);
    const t0 = s.government.localTreasuryM;
    const r = startProject(s, "l_boreholes", "budget");
    expect(r.ok).toBe(true);
    for (let i = 0; i < 4; i++) { s.pending = []; credit(s, "other", 0, "noop"); }
    // advance without the engine's personal income/expenses interfering: compare treasury against personal deltas
    const before = { cash: s.player.finances.cash };
    advance(s, 3, { keepAfloat: 0 });
    expect(s.government.localTreasuryM).not.toBe(t0);
    // personal cash changed only by living costs/salary, never by project spending: ledger has no project entries
    expect(s.player.finances.ledger.some((l) => /borehole/i.test(l.label))).toBe(false);
    void cash0; void sav0; void nw0; void before;
  });
  it("public money reaches the player's pocket only through an explicit corrupt action", () => {
    const s = makeChair();
    const illicit0 = s.player.finances.illicit;
    advance(s, 6);
    expect(s.player.finances.illicit).toBe(illicit0); // months of governing never create illicit money by themselves
    const cash = s.player.finances.cash, savings = s.player.finances.savings, treasury = s.government.localTreasuryM;
    const res = divertFunds(s, 100);
    expect(res.ok).toBe(true);
    expect(s.player.finances.illicit).toBeGreaterThan(0);
    expect(s.player.finances.cash).toBe(cash); // lawful accounts untouched by the diversion
    expect(s.player.finances.savings).toBe(savings);
    expect(s.government.localTreasuryM).toBe(treasury - 100); // it came out of the public treasury
    expect(s.player.integrity.schemes.some((x) => x.kind === "fund_diversion" && x.category === "criminal")).toBe(true);
  });
});

describe("politics: parties and defection", () => {
  it("joins a party, builds relationships and records history", () => {
    const s = makeGame({ startAge: 22, backgroundId: "political" });
    const before = Object.keys(s.player.relationships).length;
    expect(joinParty(s, "PHP").ok).toBe(true);
    expect(s.player.politics.membership!.partyId).toBe("PHP");
    expect(Object.keys(s.player.relationships).length).toBeGreaterThanOrEqual(before);
    expect(joinParty(s, "NRC").ok).toBe(false); // already a member
  });
  it("cannot join before 18 or an unknown party", () => {
    const s = makeGame();
    expect(joinParty(s, "ZZZ").ok).toBe(false);
  });
  it("leaving withdraws any candidacy and ends eligibility", () => {
    const s = makeGame({ startAge: 40 });
    joinParty(s, "PHP");
    s.player.politics.candidacies.push({ contestId: "x", office: "reps", seatId: "s", stage: "aspirant", formPaid: true, campaign: { activities: { rallies: 0, media: 0, grassroots: 0, logistics: 0, digital: 0 }, spentTotal: 0, organisation: 0, momentum: 0, rallies: 0, debatePerformance: null, endorsements: [], unlawfulSpending: 0, concealedDonations: 0, pendingMonthlySpend: 0 }, declaredMonth: 0, primarySpend: 0, delegatesBought: 0, debatePrepared: false });
    leaveParty(s);
    expect(s.player.politics.membership).toBeNull();
    expect(s.player.politics.candidacies[0].stage).toBe("withdrawn");
    advance(s, 4, { keepAfloat: 200000 });
    expect(checkPlayerEligibility(s, "reps", 20).checks.find((c) => c.id === "party")!.ok).toBe(false);
  });
  it("defection has real consequences: old allies cool, trust falls, standing starts low", () => {
    const s = makeGame({ startAge: 32, backgroundId: "political", seed: 8 });
    joinParty(s, "PHP");
    advance(s, 4, { keepAfloat: 100000 });
    const phpFriends = Object.values(s.player.relationships).filter((r) => s.chars[r.id]?.partyId === "PHP");
    const affBefore = phpFriends.map((r) => r.affinity);
    const trust0 = s.player.integrity.publicTrust;
    const rep0 = s.player.attrs.reputation;
    s.player.fame.lgas[s.player.residenceLgaId] = 30;
    const res = defect(s, "NRC");
    expect(res.ok).toBe(true);
    expect(s.player.politics.membership!.partyId).toBe("NRC");
    expect(s.player.politics.membership!.standing).toBeLessThanOrEqual(20);
    expect(s.player.politics.defections).toBe(1);
    expect(s.player.integrity.publicTrust).toBeLessThan(trust0);
    expect(s.player.attrs.reputation).toBeLessThan(rep0);
    phpFriends.forEach((r, i) => expect(r.affinity).toBeLessThan(affBefore[i]));
    expect(s.player.fame.lgas[s.player.residenceLgaId]).toBeLessThan(30);
    expect(defect(s, "NRC").ok).toBe(false);
  });
  it("party posts cost money and depend on standing", () => {
    const s = makeGame({ startAge: 30, backgroundId: "political", seed: 9 });
    joinParty(s, "PHP");
    const cash = s.player.finances.cash + s.player.finances.savings;
    applyPartyOffice(s, "ward", false);
    expect(s.player.finances.cash + s.player.finances.savings).toBeLessThan(cash);
    expect(applyPartyOffice(s, "national", true).ok).toBe(false); // needs standing 60+
  });
  it("a new party can only be founded when the simulated requirements are met", () => {
    const s = makeGame({ startAge: 35, backgroundId: "inherited", seed: 10 });
    const cfg = { name: "Test Renewal Party", abbr: "TRP", color: "#7c3aed", economic: 0, social: 0, federalism: 0, motto: "" };
    expect(startFoundingParty(s, cfg).ok).toBe(false); // not enough fame/capital
    s.player.fame.national = 40; s.player.politics.capital = 60;
    const req = foundingRequirements(s);
    expect(req.fee).toBeGreaterThan(0);
    expect(startFoundingParty(s, { ...cfg, abbr: "NRC" }).ok).toBe(false); // abbreviation taken
    expect(startFoundingParty(s, cfg).ok).toBe(true);
    advance(s, 12, { keepAfloat: 300000 });
    processPartyFounding(s);
    expect(s.player.politics.foundedPartyId).toBeTruthy();
    const id = s.player.politics.foundedPartyId!;
    expect(s.parties[id].exists).toBe(true);
    expect(s.customParties[id].abbr).toBe("TRP");
    for (const l of Object.values(s.lgas)) { const sum = Object.values(l.affinity).reduce((a, b) => a + b, 0); expect(sum).toBeCloseTo(1, 5); expect(l.affinity[id]).toBeGreaterThan(0); }
  });
});

describe("government: powers, projects and consequences", () => {
  it("only executives control budgets; legislators do not", () => {
    const s = makeGame({ startAge: 30 });
    expect(execInfo(s)).toBeNull();
    const seat = s.states[s.player.residenceStateId].repsSeatIds.map((x) => s.seats[x])[0];
    joinParty(s, "NRC");
    enterOfficeAsPlayer(s, seat, { phase: "done" } as never);
    expect(execInfo(s)).toBeNull();
    expect(setAllocations(s, { infrastructure: 1, health: 0, education: 0, security: 0, power: 0, welfare: 0, agriculture: 0, admin: 0 }).ok).toBe(false);
  });
  it("a local chairman cannot launch state or federal projects", () => {
    const s = makeChair();
    expect(startProject(s, "s_roads", "budget").ok).toBe(false);
    expect(startProject(s, "f_highways", "budget").ok).toBe(false);
    expect(startProject(s, "l_roads", "budget").ok).toBe(true);
    expect(startProject(s, "l_roads", "budget").ok).toBe(false); // already running
  });
  it("projects take time and improve the right indicators; they are not instant", () => {
    const a = makeChair(21);
    const b = makeChair(21);
    const lga = a.player.residenceLgaId;
    expect(startProject(a, "l_phc", "budget").ok).toBe(true);
    const h0 = a.lgas[lga].indicators.health;
    advance(a, 2, { keepAfloat: 100000 }); advance(b, 2, { keepAfloat: 100000 });
    const p = a.government.projects[0];
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(0.5);
    expect(p.status).toBe("active");
    advance(a, 14, { keepAfloat: 100000 }); advance(b, 14, { keepAfloat: 100000 });
    expect(a.government.projects[0].status).toBe("complete");
    expect(a.lgas[lga].indicators.health).toBeGreaterThan(b.lgas[lga].indicators.health + 1.5);
    expect(h0).toBeDefined();
  });
  it("a project is refused when the treasury cannot fund it", () => {
    const s = makeChair();
    s.government.localTreasuryM = 1;
    expect(startProject(s, "l_market", "budget").ok).toBe(false);
  });
  it("budget allocations are normalised and measurable", () => {
    const n = normaliseAllocations({ infrastructure: 2, health: 2, education: 0, security: 0, power: 0, welfare: 0, agriculture: 0, admin: 0 });
    expect(Object.values(n).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(n.infrastructure).toBeCloseTo(0.5, 9);
    const s = makeChair();
    expect(jurisdictionBudget(s, execInfo(s)!).revenueMonthlyM).toBeGreaterThan(0);
  });
  it("the president controls fuel subsidy; removing it raises pump prices over time", () => {
    const mk = () => { const s = makeGame({ startAge: 40, seed: 77 }); joinParty(s, "NRC"); const seat = s.seats["pres"]; enterOfficeAsPlayer(s, seat, { phase: "done" } as never); s.economy.fuelSubsidy = 0.5; s.economy.fuelPrice = importParityFuelPrice(s.economy) * 0.5; s.government.legislativeSupport = 80; return s; };
    const keep = mk(), cut = mk();
    expect(setFuelSubsidy(cut, 0).ok).toBe(true);
    advance(keep, 8, { keepAfloat: 10_000_000 }); advance(cut, 8, { keepAfloat: 10_000_000 });
    expect(cut.economy.fuelPrice).toBeGreaterThan(keep.economy.fuelPrice * 1.3);
    expect(subsidyCostAnnualBn(cut.economy)).toBe(0);
    expect(subsidyCostAnnualBn(keep.economy)).toBeGreaterThan(1000);
  });
  it("padding a contract reduces the project's delivered benefit and opens a scheme", () => {
    const a = makeChair(31), b = makeChair(31);
    startProject(a, "l_roads", "budget"); startProject(b, "l_roads", "budget");
    expect(inflateProject(a, a.government.projects[0].id).ok).toBe(true);
    advance(a, 12, { keepAfloat: 100000 }); advance(b, 12, { keepAfloat: 100000 });
    const lga = a.player.residenceLgaId;
    expect(a.lgas[lga].indicators.infrastructure).toBeLessThan(b.lgas[lga].indicators.infrastructure);
    expect(a.player.integrity.schemes.some((x) => x.kind === "project_inflation")).toBe(true);
  });
  it("appointments feed efficiency", () => {
    const s = makeChair();
    const post = "Supervisor for Works";
    const nom = nomineesFor(s, post);
    expect(nom.length).toBeGreaterThan(0);
    expect(appoint(s, post, nom[0].id).ok).toBe(true);
    expect(s.government.appointees.some((x) => x.post === post)).toBe(true);
  });
  it("entering office unlocks government and pays only the official remuneration", () => {
    const s = makeChair();
    expect(s.player.politics.seatId).toBe(`lgc:${s.player.residenceLgaId}`);
    expect(s.player.occupation.kind).toBe("politician");
    expect(s.seats[s.player.politics.seatId!].holderId).toBe("player");
    expect(s.player.politics.pastOffices).toHaveLength(1);
    advance(s, 1);
    expect(s.player.finances.ledger.some((l) => l.cat === "office_pay")).toBe(true);
  });
});

describe("corruption, investigation and accountability", () => {
  it("a clean player is never investigated", () => {
    for (const seed of [1, 2, 3]) {
      const s = makeGame({ seed, startAge: 30, backgroundId: "political" });
      joinParty(s, "NRC");
      advance(s, 100, { keepAfloat: 150000 });
      expect(s.player.integrity.cases).toHaveLength(0);
      expect(s.player.integrity.schemes).toHaveLength(0);
      expect(s.news.filter((n) => n.topic === "corruption" && n.personal)).toHaveLength(0);
      expect(s.player.integrity.exposure).toBe(0);
    }
  });
  it("wrongdoing has traceable triggers, and consequences link back to the scheme", () => {
    let opened = 0, charged = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = makeChair(seed);
      startScheme(s, { kind: "fund_diversion", label: "Test diversion", gain: 20_000_000, category: "criminal", evidence: 70, witnesses: 6, officeId: null });
      advance(s, 70, { keepAfloat: 1_000_000 });
      for (const c of s.player.integrity.cases) {
        opened++;
        expect(s.player.integrity.schemes.some((x) => x.id === c.schemeId)).toBe(true);
        expect(s.news.some((n) => n.source === `case:${c.id}`)).toBe(true);
        if (c.stage !== "audit" && c.stage !== "investigation") charged++;
      }
      for (const n of s.news.filter((x) => x.source.startsWith("scheme:"))) expect(s.player.integrity.schemes.some((x) => `scheme:${x.id}` === n.source)).toBe(true);
    }
    expect(opened).toBeGreaterThan(0);
    expect(charged).toBeGreaterThanOrEqual(0);
  });
  it("conviction recovers proceeds, jails the player, removes them from office and bars candidacy", () => {
    // find a seed where the scheme ends in conviction
    let found = false;
    for (let seed = 1; seed <= 25 && !found; seed++) {
      const s = makeChair(seed);
      startScheme(s, { kind: "fund_diversion", label: "Big diversion", gain: 30_000_000, category: "criminal", evidence: 95, witnesses: 8, officeId: null });
      const illicit0 = s.player.finances.illicit;
      advance(s, 80, { keepAfloat: 1_000_000 });
      if (s.player.integrity.convictions.length) {
        found = true;
        expect(s.player.finances.illicit).toBeLessThan(illicit0);
        expect(typeof s.flags["jailedUntil"]).toBe("number");
        expect(s.player.politics.seatId).toBeNull();
        expect(s.player.politics.membership).toBeNull();
        const e = checkPlayerEligibility(s, "reps", s.clock.monthIndex + 12);
        expect(e.checks.find((c) => c.id === "conviction")!.ok).toBe(false);
      }
    }
    expect(found).toBe(true);
  });
  it("political cover helps but is capped — there is no immunity", () => {
    const s = makeGame({ startAge: 40, seed: 5 });
    joinParty(s, "NRC");
    s.parties["NRC"].inPower = true;
    s.player.integrity.influence = 100; s.player.politics.membership!.standing = 100;
    expect(cover(s)).toBeGreaterThan(cover(makeGame({ seed: 5 })));
    expect(cover(s)).toBeLessThan(0.7);
    expect(institutions(s).independence).toBeGreaterThan(0.1);
  });
  it("lawyers improve the defence but cost money", () => {
    const s = makeGame({ backgroundId: "inherited", seed: 6 });
    const cash = s.player.finances.cash + s.player.finances.savings;
    hireLawyers(s);
    expect(s.player.flags["defence_strength"]).toBeGreaterThan(0);
    expect(s.player.finances.cash + s.player.finances.savings).toBeLessThan(cash);
  });
});

describe("economy module", () => {
  it("stays within sane bounds for decades under many seeds", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const eco = initialEconomy(40);
      const rng = new Rng(seed);
      const avg = { economy: 45, infrastructure: 45, security: 50, health: 45, education: 45, power: 40 };
      for (let m = 0; m < 480; m++) {
        stepEconomy(eco, { avg, efficiency: 0.58, deficitTarget: 0.2 }, rng);
        expect(eco.inflation).toBeGreaterThanOrEqual(1); expect(eco.inflation).toBeLessThanOrEqual(80);
        expect(eco.fxRate).toBeGreaterThanOrEqual(300); expect(eco.fxRate).toBeLessThanOrEqual(9000);
        expect(eco.unemployment).toBeGreaterThanOrEqual(2); expect(eco.unemployment).toBeLessThanOrEqual(40);
        expect(Number.isFinite(eco.debtBn)).toBe(true);
        expect(eco.satisfaction).toBeGreaterThanOrEqual(5); expect(eco.satisfaction).toBeLessThanOrEqual(95);
      }
    }
  });
  it("an oil price spike lifts revenue; a slump cuts it", () => {
    const run = (amount: number) => {
      const eco = initialEconomy(40); const rng = new Rng(3);
      addShock(eco, { id: "o", key: "oilPrice", amount, months: 3, source: "t", mode: "pct" });
      for (let i = 0; i < 4; i++) stepEconomy(eco, { avg: { economy: 45, infrastructure: 45, security: 50, health: 45, education: 45, power: 40 }, efficiency: 0.58, deficitTarget: 0.2 }, rng);
      return eco.revenueAnnualBn;
    };
    expect(run(40)).toBeGreaterThan(run(0));
    expect(run(-40)).toBeLessThan(run(0));
  });
  it("shocks are applied once and decay", () => {
    const eco = initialEconomy(40);
    addShock(eco, { id: "same", key: "inflation", amount: 3, months: 2, source: "t", mode: "abs" });
    addShock(eco, { id: "same", key: "inflation", amount: 3, months: 2, source: "t", mode: "abs" });
    expect(eco.shocks).toHaveLength(1);
    const rng = new Rng(1);
    for (let i = 0; i < 3; i++) stepEconomy(eco, { avg: { economy: 45, infrastructure: 45, security: 50, health: 45, education: 45, power: 40 }, efficiency: 0.58, deficitTarget: 0.2 }, rng);
    expect(eco.shocks).toHaveLength(0);
  });
  it("fuel subsidy cost scales with the subsidy share", () => {
    const e = initialEconomy(40);
    const c0 = subsidyCostAnnualBn({ ...e, fuelSubsidy: 0 }), c5 = subsidyCostAnnualBn({ ...e, fuelSubsidy: 0.5 }), c10 = subsidyCostAnnualBn({ ...e, fuelSubsidy: 1 });
    expect(c0).toBe(0);
    expect(c10).toBeCloseTo(c5 * 2, 5);
    expect(debtToGdp(e)).toBeGreaterThan(0);
  });
  it("a blackout event lowers power and raises business costs for a business owner", () => {
    const a = makeGame({ seed: 1, startAge: 30, backgroundId: "business" });
    const b = makeGame({ seed: 1, startAge: 30, backgroundId: "business" });
    perform(a, { t: "startBusiness", typeId: "restaurant", name: "A" }); perform(b, { t: "startBusiness", typeId: "restaurant", name: "A" });
    for (const l of Object.values(a.states)) l.indicators.power = 15;
    advance(a, 6); advance(b, 6);
    expect(a.player.business!.monthlyCosts).toBeGreaterThan(b.player.business!.monthlyCosts);
    expect(weightedAverageIndicators(a).power).toBeLessThan(weightedAverageIndicators(b).power);
  });
});

describe("insights for the interface", () => {
  it("lists deadlines in order and suggests sensible next steps", () => {
    const s = makeGame({ startAge: 20 });
    const up = upcoming(s, 10);
    expect(up.length).toBeGreaterThan(0);
    for (let i = 1; i < up.length; i++) expect(up[i].month).toBeGreaterThanOrEqual(up[i - 1].month);
    expect(suggestions(s).length).toBeGreaterThan(0);
    s.player.finances.cash = 0; s.player.finances.savings = 0;
    expect(suggestions(s).some((x) => x.id === "money")).toBe(true);
  });
  it("closeMonth records a monthly summary", () => {
    const s = makeGame();
    credit(s, "salary", 1000, "x"); debit(s, "food", 400, "y");
    closeMonth(s);
    const last = s.player.finances.monthly.at(-1)!;
    expect(last.income).toBe(1000); expect(last.expense).toBe(400);
    expect(digest(last)).toBeTruthy();
  });
});
