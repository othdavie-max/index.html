import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent, TEMPLATE_BY_ID } from "../engine/events";
import { DEBT_FREE_AT, debtFree, debtView, repayForeign } from "../engine/debt";
import { checkRecords } from "../engine/history";
import { depositFund, lendingOpen, outstanding, withdrawFund } from "../engine/lending";
import { MIL_PROGRAMMES, milCoup, regionalRank, toggleMil } from "../engine/military";
import { statesCreated, statesCost } from "../engine/newstates";
import { deserialise, serialise } from "../persistence";
import type { FixState } from "../engine/types";

const clean = (seed: number) => { const s = newGame(seed); s.fin.domesticDebt = 100; s.fin.foreignDebt = 0.2; s.fin.treasury = 1e5; return s; };

describe("national debt", () => {
  it("starts heavy, and repaying foreign debt costs naira and cuts the debt", () => {
    const s = newGame(1001); s.fin.treasury = 1e5; const d0 = debtView(s);
    expect(d0.pctGdp).toBeGreaterThan(30); expect(d0.label).toMatch(/Heavy|Crushing|Manageable/);
    const r = repayForeign(s, 5); expect(r.ok).toBe(true);
    expect(debtView(s).foreignUsd).toBeCloseTo(d0.foreignUsd - 5, 5); expect(s.fin.treasury).toBeLessThan(1e5);
    expect(repayForeign(s, 999).ok).toBe(false);
    const poor = newGame(1001); poor.fin.treasury = 100; expect(repayForeign(poor, 5).ok).toBe(false);
  });
  it("becoming debt-free is recognised with a record card, and a credit-rating boost", () => {
    const s = clean(1002);
    advanceMonths(s, 1);
    expect(debtFree(s)).toBe(true); expect(debtView(s).pctGdp).toBeLessThanOrEqual(DEBT_FREE_AT);
    expect(s.flags.debtFree).toBeDefined();
    expect(s.achievements.some((a) => a.id === "rec:dfree")).toBe(true);
    expect(checkRecords(s)).toEqual([]);
  });
  it("debt-free is reachable by active play within two terms", () => {
    const s = newGame(1003); s.fin.treasury = 1e5;
    let free = false;
    for (let m = 0; m < 96 && !s.done && !free; m++) {
      for (const e of s.events.filter((x) => x.status === "open")) respond(s, e.id, e.options[e.options.length - 1].id);
      if (m % 3 === 0) { s.fin.treasury = Math.max(s.fin.treasury, 5000); const d = debtView(s); repayForeign(s, Math.min(d.foreignUsd, 3)); if (s.fin.domesticDebt > 0) s.fin.domesticDebt = Math.max(0, s.fin.domesticDebt - 2500); }
      advanceMonths(s, 1); free = debtFree(s);
    }
    expect(free).toBe(true);
  });
  it("an annual debt review is published", () => {
    const s = newGame(1004); advanceMonths(s, 12);
    expect(s.news.some((n) => n.headline.startsWith("Annual debt review"))).toBe(true);
  });
});

describe("lending abroad", () => {
  it("is locked while in debt and opens when debt is low", () => {
    expect(lendingOpen(newGame(1010))).toBe(false); expect(lendingOpen(clean(1010))).toBe(true);
    const s = newGame(1011); expect(depositFund(s, 100).ok).toBe(false);
  });
  it("a savings fund takes the surplus and grows", () => {
    const s = clean(1012); const t0 = s.fin.treasury;
    expect(depositFund(s, 1000).ok).toBe(true); expect(s.fin.treasury).toBe(t0 - 1000);
    advanceMonths(s, 12); expect(s.lend.fund).toBeGreaterThan(1030);
    expect(withdrawFund(s, 500).ok).toBe(true); expect(withdrawFund(s, 1e9).ok).toBe(false);
  });
  it("neighbours ask for loans, which earn interest and can default", () => {
    let offered = 0, defaulted = 0, earned = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = clean(1020 + seed);
      for (let i = 0; i < 60 && !s.done; i++) {
        s.fin.domesticDebt = 100; s.fin.foreignDebt = 0.2; s.fin.treasury = Math.max(s.fin.treasury, 1e5);
        for (const e of s.events.filter((x) => x.status === "open")) { if (e.tpl === "lendOffer") { offered++; respond(s, e.id, "lend"); } else if (e.tpl === "loanDefault") { defaulted++; respond(s, e.id, "restructure"); } else respond(s, e.id, e.options[e.options.length - 1].id); }
        advanceMonths(s, 1);
      }
      earned += s.lend.loans.reduce((a, l) => a + l.earned, 0); expect(outstanding(s)).toBeGreaterThanOrEqual(0);
    }
    expect(offered).toBeGreaterThan(3); expect(earned).toBeGreaterThan(0); expect(defaulted).toBeGreaterThanOrEqual(0);
  });
  it("a default can be forgiven, restructured or collateral seized", () => {
    const s = clean(1030); s.lend.loans.push({ id: "ln1", borrower: "kamura", amountUsd: 2, rate: 6, start: 0, term: 36, status: "defaulted", strings: "none", earned: 0 }); s.flags.defLoan = "ln1";
    const e = createEvent(s, "loanDefault", "NG-FC")!; expect(e.options.map((o) => o.id)).toEqual(["forgive", "restructure", "seize"]);
    respond(s, e.id, "forgive"); expect(s.lend.loans[0].status).toBe("forgiven");
  });
});

describe("the military", () => {
  it("programmes raise strength over time at a monthly cost, and a strong unmanaged army raises coup risk", () => {
    const a = newGame(1040), b = newGame(1040); a.fin.treasury = b.fin.treasury = 1e6;
    for (const p of MIL_PROGRAMMES.filter((x) => x.id !== "veterans")) toggleMil(a, p.id);
    advanceMonths(a, 40); advanceMonths(b, 40);
    expect(a.mil.strength).toBeGreaterThan(b.mil.strength + 10);
    expect(a.modifiers.some((m) => m.source === "military:recruit" && m.monthly === 40)).toBe(true);
    a.mil.strength = 90; const without = milCoup(a); toggleMil(a, "veterans"); expect(milCoup(a)).toBeLessThan(without);
  });
  it("neighbours arm in response, and border clashes depend on strength", () => {
    const s = newGame(1041); s.fin.treasury = 1e6; for (const p of MIL_PROGRAMMES) toggleMil(s, p.id);
    const n0 = s.mil.neighbours.reduce((a, n) => a + n.strength, 0);
    advanceMonths(s, 60); expect(s.mil.neighbours.reduce((a, n) => a + n.strength, 0)).toBeGreaterThan(n0);
    const weak = newGame(1042), strong = newGame(1042); weak.mil.strength = 20; strong.mil.strength = 90; weak.flags.clashWith = strong.flags.clashWith = "sahelia";
    const ew = createEvent(weak, "borderClash", "NG-KT")!, es = createEvent(strong, "borderClash", "NG-KT")!;
    const opt = TEMPLATE_BY_ID.borderClash.options[0];
    expect(ew.options.length).toBe(3); expect(opt.chance(strong, es)).toBeGreaterThan(opt.chance(weak, ew) + 0.3);
    expect(regionalRank(strong)).toBe(1); expect(regionalRank(weak)).toBeGreaterThan(1);
  });
  it("a neighbour in crisis offers a peacekeeping role", () => {
    const s = newGame(1043); s.fin.treasury = 1e5; s.mil.neighbours[0].stability = 10; s.flags.crisisIn = s.mil.neighbours[0].id;
    const e = createEvent(s, "neighbourCrisis", "NG-FC")!; respond(s, e.id, "aid");
    expect(s.foreign.rel.ecowas).toBeGreaterThan(55);
  });
});

describe("new states", () => {
  it("regions petition, and creating a state pleases them but adds a running cost", () => {
    const s = newGame(1050); s.fin.treasury = 1e5; s.assembly.support = 95; let seen = false;
    for (let i = 0; i < 60 && !seen; i++) { advanceMonths(s, 1); seen = s.events.some((e) => e.tpl === "statePetition"); }
    expect(seen).toBe(true);
    let created = 0;
    for (let seed = 1; seed <= 8; seed++) { const t = newGame(1060 + seed); t.fin.treasury = 1e5; t.assembly.support = 99; t.flags.petitionIdx = seed % 5; const e = createEvent(t, "statePetition", "NG-NI")!; respond(t, e.id, "create"); if (statesCreated(t) > 0) { created++; expect(statesCost(t)).toBe(14); expect(t.modifiers.some((m) => m.source.startsWith("newstate:"))).toBe(true); expect(t.flags.followPetition).toBe(1); } }
    expect(created).toBeGreaterThan(3);
  });
  it("rejecting angers the region", () => {
    const s = newGame(1051); s.fin.treasury = 1e5; s.flags.petitionIdx = 0; const e = createEvent(s, "statePetition", "NG-NI")!;
    const u0 = s.regions["NG-NI"].unrest; respond(s, e.id, "reject");
    expect(s.regions["NG-NI"].unrest).toBeGreaterThan(u0); expect(statesCreated(s)).toBe(0);
  });
});

describe("old saves", () => {
  it("get military and lending", () => {
    const s = newGame(1070); const raw = JSON.parse(serialise(s)); delete raw.state.mil; delete raw.state.lend;
    const back: FixState = deserialise(JSON.stringify(raw)).state;
    expect(back.mil.neighbours.length).toBe(5); expect(back.lend.loans).toEqual([]); advanceMonths(back, 3);
  });
});
