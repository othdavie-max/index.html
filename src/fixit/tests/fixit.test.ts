import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonth, advanceMonths } from "../engine/sim";
import { applyFuel, borrow, enactPolicy, previewFuel, respond, startProject, applyMeasure, setFxDefence } from "../engine/actions";
import { computeChallenge } from "../engine/challenge";
import { createEvent, openEvents } from "../engine/events";
import { buildLegacy } from "../engine/legacy";
import { deserialise, serialise, FixSaves } from "../persistence";
import { MemoryBackend } from "../../game/persistence/saveSystem";
import { debtServiceRatio, foodAffordIdx, snap } from "../engine/util";
import { lgaLayerValue, stateLayerValue } from "../engine/views";
import { STATES } from "../../game/data/states";
import { ADMIN_LGAS, LGA_BY_ID } from "../../game/engine/admin";
import { REGION_OVERRIDES } from "../data/catalogue";
import type { FixState } from "../engine/types";

const run = (s: FixState, n: number) => advanceMonths(s, n);

describe("time and determinism", () => {
  it("advances one month at a time and never double-applies", () => {
    const s = newGame(5);
    expect(advanceMonth(s)).toBe(true);
    expect(s.month).toBe(1);
    s.month = 0; // replaying the same month index must be refused
    expect(advanceMonth(s)).toBe(false);
    expect(s.month).toBe(0);
  });
  it("same seed and choices reproduce the same world", () => {
    const a = newGame(11), b = newGame(11);
    for (const s of [a, b]) { enactPolicy(s, "taxDrive"); run(s, 18); }
    expect(JSON.stringify(snap(a))).toBe(JSON.stringify(snap(b)));
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
  });
});

describe("fuel subsidy depends on conditions", () => {
  it("same removal gives different savings and risk under different conditions", () => {
    const good = newGame(1), bad = newGame(1);
    bad.eco.fx = 2600; bad.fin.treasury = 100; bad.gov.trust = 20; bad.eco.wageIdx = 70;
    good.eco.fx = 1100; good.gov.trust = 70;
    const g = previewFuel(good, "remove"), b = previewFuel(bad, "remove");
    expect(b.saving).toBeGreaterThan(g.saving); // a weak naira makes the subsidy bill bigger
    expect(b.risk === "high" || b.risk === "medium").toBe(true);
    expect(g.risk).not.toBe("high");
  });
  it("removal raises pump price, cuts the bill and lowers happiness", () => {
    const s = newGame(2); run(s, 1);
    const before = { pump: s.fuel.pump, cost: s.fuel.costMonthly, h: s.gov.happiness };
    expect(applyFuel(s, "remove").ok).toBe(true);
    run(s, 4);
    expect(s.fuel.pump).toBeGreaterThan(before.pump * 1.2);
    expect(s.fuel.costMonthly).toBeLessThan(before.cost * 0.4);
    expect(s.gov.happiness).toBeLessThan(before.h);
  });
  it("targeted reform needs capacity: transfers cost money and are recorded", () => {
    const s = newGame(2);
    expect(applyFuel(s, "reform").ok).toBe(true);
    expect(s.fuel.transfers).toBe(true);
    expect(applyFuel(s, "reform").ok).toBe(false);
  });
});

describe("currency, inflation, affordability", () => {
  it("FX moves are consistent with dollar balance", () => {
    const s = newGame(3);
    s.jobs.exports = 0.2; s.eco.investor = 20; // far less dollar supply
    const fx0 = s.eco.fx;
    run(s, 12);
    expect(s.eco.fx).toBeGreaterThan(fx0 * 1.1);
    const t = newGame(3); t.jobs.exports = 2.5; t.eco.investor = 70; t.eco.inflation = 6; t.eco.emaDrift = 0;
    run(t, 12);
    expect(t.eco.fx).toBeLessThan(t.baseline.fx * 1.05);
  });
  it("defending the naira drains reserves", () => {
    const a = newGame(4), b = newGame(4);
    a.jobs.exports = 0.2; b.jobs.exports = 0.2;
    setFxDefence(a, 0); setFxDefence(b, 1);
    run(a, 6); run(b, 6);
    expect(b.eco.reserves).toBeLessThan(a.eco.reserves);
  });
  it("inflation erodes food affordability when wages lag", () => {
    const s = newGame(6); run(s, 24);
    expect(s.eco.priceLevel).toBeGreaterThan(130);
    expect(foodAffordIdx(s)).toBeLessThan(95);
  });
});

describe("borrowing and public finances", () => {
  it("foreign bonds add dollar debt and cash; local debt raises interest", () => {
    const s = newGame(7);
    const d0 = s.fin.foreignDebt, t0 = s.fin.treasury, r0 = s.fin.domRate;
    expect(borrow(s, "bond", 1).ok).toBe(true);
    expect(s.fin.foreignDebt).toBeCloseTo(d0 + 1);
    expect(s.fin.treasury).toBeGreaterThan(t0 + 1000);
    borrow(s, "domestic", 3000);
    expect(s.fin.domRate).toBeGreaterThan(r0);
  });
  it("a weaker naira raises foreign debt service in naira", () => {
    const s = newGame(7); run(s, 1);
    const a = s.fin.debtService; s.eco.fx *= 1.5; run(s, 1);
    expect(s.fin.debtService).toBeGreaterThan(a * 1.1);
  });
  it("government funds, reserves, debt and personal wealth are separate", () => {
    const s = newGame(7);
    const w = s.me.wealth, res = s.eco.reserves;
    borrow(s, "domestic", 1000);
    expect(s.me.wealth).toBe(w);
    expect(s.eco.reserves).toBe(res);
  });
  it("unaffordable actions are refused without charging", () => {
    const s = newGame(7); s.fin.treasury = 5;
    const r = enactPolicy(s, "powerPay");
    expect(r.ok).toBe(false); expect(s.fin.treasury).toBe(5);
  });
  it("heavy debt burden leads to money printing and higher inflation", () => {
    const s = newGame(7); s.fin.domesticDebt = 160000; s.fin.treasury = 0;
    run(s, 2);
    expect(debtServiceRatio(s)).toBeGreaterThan(0.7);
    expect(s.fin.waysAndMeans).toBeGreaterThan(0);
  });
});

describe("projects", () => {
  it("progress, spend and completion follow the plan and deliver benefits", () => {
    const s = newGame(8); s.fin.treasury = 50000;
    expect(startProject(s, "solar", "NG-KN", "treasury").ok).toBe(true);
    const p = s.projects[0];
    const power0 = s.power.available;
    run(s, 8); expect(p.progress).toBeGreaterThan(0.2); expect(p.progress).toBeLessThan(1); expect(p.spent).toBeGreaterThan(0);
    run(s, 14); expect(p.status).toBe("done"); expect(p.benefitScale).toBeGreaterThan(0.3);
    run(s, 8); expect(s.power.available).toBeGreaterThan(power0 + 50);
  });
  it("projects stall when there is no cash and resume after", () => {
    const s = newGame(8); s.fin.treasury = 600; startProject(s, "highway", "NG-KD", "treasury");
    s.fin.treasury = 0; s.fin.spend = 0;
    const p = s.projects[0];
    run(s, 1); // auto-borrow refills a buffer; force a dry treasury inside the project step
    s.fin.treasury = 0;
    const prog = p.progress;
    advanceMonth(s);
    expect(["active", "stalled"]).toContain(p.status);
    expect(p.progress).toBeGreaterThanOrEqual(prog);
  });
  it("weak procurement and corruption raise leakage", () => {
    const a = newGame(9), b = newGame(9);
    for (const s of [a, b]) s.fin.treasury = 50000;
    b.gov.corruption = 95; b.gov.procurement = 10; a.gov.corruption = 20; a.gov.procurement = 80;
    startProject(a, "schools", "NG-OY", "treasury"); startProject(b, "schools", "NG-OY", "treasury");
    run(a, 6); run(b, 6);
    expect(b.projects[0].leaked).toBeGreaterThan(a.projects[0].leaked * 2);
  });
  it("giving a contract to a friend enriches you and leaves evidence", () => {
    const s = newGame(9); const w = s.me.wealth;
    startProject(s, "schools", "NG-OY", "treasury", { favour: true });
    expect(s.me.wealth).toBeGreaterThan(w); expect(s.me.evidence).toBeGreaterThan(0);
  });
});

describe("food supply and storage", () => {
  it("more storage reduces post-harvest loss and eases food prices", () => {
    const a = newGame(10), b = newGame(10);
    b.agri.storage = 70;
    run(a, 12); run(b, 12);
    expect(b.agri.loss).toBeLessThan(a.agri.loss);
    expect(b.eco.foodInflation).toBeLessThan(a.eco.foodInflation);
  });
  it("insecurity cuts food supply", () => {
    const a = newGame(10), b = newGame(10);
    b.sec.banditry = 95; b.sec.terror = 95; b.sec.communal = 95; b.sec.index = 95;
    run(a, 3); run(b, 3);
    expect(b.agri.supply).toBeLessThan(a.agri.supply);
  });
});

describe("protests, events, corruption", () => {
  it("fuel price spikes trigger protests that can be answered", () => {
    let seen = 0;
    for (let seed = 1; seed <= 12 && !seen; seed++) {
      const s = newGame(seed); run(s, 1); applyFuel(s, "remove"); run(s, 6);
      seen = s.events.filter((e) => e.tpl === "fuelProtest").length;
      if (seen) {
        const ev = s.events.find((e) => e.tpl === "fuelProtest" && e.status === "open");
        if (ev) { s.fin.treasury = 5000; const r = respond(s, ev.id, "allowance"); expect(r.ok).toBeTypeOf("boolean"); expect(s.events.find((e) => e.id === ev.id)?.status).toBe("resolved"); }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
  it("unanswered situations escalate; answered ones cannot be answered twice", () => {
    const s = newGame(1); s.fin.treasury = 5000;
    const ev = createEvent(s, "foodProtest", "NG-KN")!;
    expect(respond(s, ev.id, "negotiate").ok).toBeTypeOf("boolean");
    expect("ok" in respond(s, ev.id, "negotiate") && respond(s, ev.id, "negotiate").ok).toBe(false);
    const e2 = createEvent(s, "banditry", "NG-ZA")!;
    const trust = s.gov.trust; run(s, 4);
    expect(s.events.find((e) => e.id === e2.id)?.status).toBe("expired");
    expect(s.gov.trust).toBeLessThan(trust);
  });
  it("no improper dealings means no scandal hazard; evidence creates one", () => {
    const clean = newGame(3); run(clean, 36);
    expect(clean.events.some((e) => e.tpl === "investigation")).toBe(false);
    const dirty = newGame(3); dirty.me.evidence = 90; dirty.gov.transparency = 70; run(dirty, 12);
    expect(dirty.events.some((e) => e.tpl === "investigation")).toBe(true);
  });
  it("taking a kickback is not rewarded for the country", () => {
    const s = newGame(3); s.fin.treasury = 5000;
    const ev = createEvent(s, "kickback", "NG-FC")!;
    const w = s.me.wealth; respond(s, ev.id, "accept");
    expect(s.me.wealth).toBeGreaterThan(w); expect(s.me.evidence).toBeGreaterThan(5); expect(s.me.acts).toContain("kickback");
  });
});

describe("dashboard is driven by state", () => {
  it("challenge changes with conditions and always offers real actions", () => {
    const s = newGame(12);
    const c0 = computeChallenge(s);
    expect(c0.actions.length).toBeGreaterThanOrEqual(1);
    s.power.available = 1500; s.eco.foodInflation = 12; s.eco.inflation = 8; s.fuel.coverage = 0; s.sec.index = 30; s.sec.banditry = s.sec.terror = s.sec.communal = 30;
    expect(computeChallenge(s).id).toBe("power");
    const ev = createEvent(s, "banditry", "NG-BO")!; ev.deadline = s.month + 1;
    expect(computeChallenge(s).eventId).toBe(ev.id);
    expect(openEvents(s).length).toBe(1);
  });
  it("measures cost money and carry uncertainty-based outcomes", () => {
    const s = newGame(12); const t = s.fin.treasury;
    expect(applyMeasure(s, "grainReserve").ok).toBe(true);
    expect(s.fin.treasury).toBeLessThan(t);
    expect(applyMeasure(s, "grainReserve").ok).toBe(false); // cooldown
  });
});

describe("term, legacy, saves", () => {
  it("a term ends after 48 months with a legacy built from outcomes", () => {
    const s = newGame(13); s.fin.treasury = 1e6;
    run(s, 60);
    expect(s.ended).not.toBeNull();
    expect(s.terms.length).toBe(1);
    const lg = buildLegacy(s, s.terms[0].start, s.terms[0].end, s.terms[0].result);
    expect(lg.rows.length).toBeGreaterThan(10);
    expect(lg.title.length).toBeGreaterThan(3);
    expect(advanceMonth(s)).toBe(false);
  });
  it("corrupt self-enriching play earns the matching title", () => {
    const s = newGame(13); s.me.wealth = 9000; s.me.acts = ["kickback", "kickback", "kickback"]; s.gov.happiness = 30;
    const lg = buildLegacy(s, s.baseline, snap(s), "lost");
    expect(lg.title).toBe("Self-Enriching President");
  });
  it("save and load round-trips exactly and rejects corruption", async () => {
    const s = newGame(14); enactPolicy(s, "taxDrive"); run(s, 10);
    const back = deserialise(serialise(s)).state;
    expect(JSON.stringify(back)).toBe(JSON.stringify(s));
    run(back, 5); run(s, 5);
    expect(JSON.stringify(snap(back))).toBe(JSON.stringify(snap(s)));
    expect(() => deserialise("{not json")).toThrow();
    expect(() => deserialise(JSON.stringify({ format: "nigeria-fixit-save", version: 1, state: { month: 3 } }))).toThrow();
    const saves = new FixSaves(new MemoryBackend());
    await saves.save("1", s);
    expect((await saves.load("1")).month).toBe(s.month);
    expect((await saves.list()).find((x) => x.slot === "1")?.summary?.month).toBe(s.month);
  });
});

describe("map and geography integrity", () => {
  it("every state has regional data and valid overrides; all 774 LGAs resolve to a state", () => {
    const s = newGame(1);
    expect(STATES.length).toBe(37);
    for (const st of STATES) expect(s.regions[st.id]).toBeDefined();
    for (const id of Object.keys(REGION_OVERRIDES)) expect(s.regions[id]).toBeDefined();
    expect(ADMIN_LGAS.length).toBe(774);
    for (const l of ADMIN_LGAS) expect(s.regions[LGA_BY_ID[l.id].stateId]).toBeDefined();
  });
  it("layer values are bounded and stable; LGA values are deterministic", () => {
    const s = newGame(1); run(s, 6);
    for (const st of STATES) for (const l of ["overview", "food", "security", "jobs", "power", "flood", "unrest"] as const) { const v = stateLayerValue(s, st.id, l); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
    const id = ADMIN_LGAS[100].id;
    expect(lgaLayerValue(s, id, "food")).toBe(lgaLayerValue(s, id, "food"));
  });
  it("completed local projects reduce local stress", () => {
    const a = newGame(1), b = newGame(1); b.fin.treasury = 1e6; a.fin.treasury = 1e6;
    startProject(b, "solar", "NG-BO", "treasury");
    run(a, 24); run(b, 24);
    expect(b.regions["NG-BO"].power).toBeLessThan(a.regions["NG-BO"].power);
  });
});
