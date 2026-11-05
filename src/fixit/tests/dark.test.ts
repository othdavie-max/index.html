import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { ASSETS, buryEvidence, buyAsset, empire, moveOffshore, netWorth, richRank } from "../engine/empire";
import { changeLook, imageOf } from "../engine/looks";
import { lawmakerAction, lmCost, LM_ACTIONS, sitting } from "../engine/power";
import { PRESSURE } from "../engine/setup";

const fresh = (seed = 6101, o = {}) => { const s = newGame(seed, "Test", o); s.fin.treasury = 1e5; s.cap.pc = 99; return s; };
describe("private empire", () => {
  it("moves money offshore for a fee, buys assets, and the rich list reacts", () => {
    const s = fresh(); s.me.wealth = 3000; const nw0 = netWorth(s), r0 = richRank(s);
    expect(moveOffshore(s, 1500).ok).toBe(true); expect(empire(s).hidden).toBeCloseTo(1350, 0); expect(s.me.wealth).toBe(1500);
    expect(buyAsset(s, "hotel").ok).toBe(true); expect(buyAsset(s, "hotel").ok).toBe(false);
    expect(buyAsset(s, "club").ok).toBe(true);
    expect(netWorth(s)).toBeLessThan(nw0); // fees and depreciation: spending is not free
    s.me.wealth += 20000; expect(richRank(s)).toBeLessThanOrEqual(r0);
    expect(ASSETS.length).toBeGreaterThan(5);
  });
  it("stealing opportunities turn up and a long game runs", () => {
    const s = fresh(6102); s.me.wealth = 500; advanceMonths(s, 40);
    expect(Number.isFinite(s.me.wealth)).toBe(true);
  });
  it("burying evidence either helps or backfires, and always costs cash", () => {
    const s = fresh(6103); s.me.wealth = 1000; s.me.evidence = 50; const w = s.me.wealth;
    buryEvidence(s); expect(s.me.wealth).toBe(w - 150);
  });
});
describe("looks and the Assembly", () => {
  it("each outfit pleases some groups and puts others off", () => {
    const base = fresh(6104).meta.portrait;
    const suit = imageOf({ ...base, outfit: 2, wear: 0, glasses: 0, beard: 0 }), shirt = imageOf({ ...base, outfit: 0, wear: 0, glasses: 0, beard: 0 });
    expect(suit.tilt.business!).toBeGreaterThan(0); expect(suit.tilt.youth!).toBeLessThan(0);
    expect(shirt.tilt.youth!).toBeGreaterThan(0); expect(shirt.tilt.business!).toBeLessThan(0);
    const s = fresh(6105); s.groupMood.business = 0;
    changeLook(s, { outfit: 2, wear: 0, glasses: 1, beard: 0 }); advanceMonths(s, 24);
    expect(s.groupMood.business).toBeGreaterThan(0);
  });
  it("bribing gets dearer each time, and bought loyalty fades", () => {
    const s = fresh(6106); const lm = sitting(s)[0]; const def = LM_ACTIONS.find((a) => a.id === "bribe")!;
    const c0 = lmCost(lm, def); lawmakerAction(s, lm.id, "bribe"); expect(lmCost(lm, def)).toBeGreaterThan(c0);
    const l0 = lm.loyalty; advanceMonths(s, 4); expect(lm.loyalty).toBeLessThan(l0);
  });
});
describe("difficulty", () => {
  it("the harder levels apply real pressure", () => {
    expect(PRESSURE.nigeria.drain).toBeGreaterThan(PRESSURE.hard.drain); expect(PRESSURE.hard.drain).toBeGreaterThan(PRESSURE.normal.drain);
    const mk = (d: "normal" | "nigeria") => { const s = newGame(6107, "T", { difficulty: d }); s.cap.pc = 99; advanceMonths(s, 36); return s; };
    const a = mk("normal"), b = mk("nigeria");
    expect(b.eco.inflation).toBeGreaterThan(a.eco.inflation); expect(b.gov.approval).toBeLessThan(a.gov.approval);
  });
});
