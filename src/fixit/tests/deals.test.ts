import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { GOODS, importFlow, imp, exportFlow } from "../engine/imports";
import { SEED_IN, agreements, coverage, embargoed, priceMult, setEmbargo } from "../engine/agreements";
import { cancelAgreement, signCrude, signImport, tradeRoutes, cancelGoodExport } from "../engine/deals";
import { addHeat, heatOf, feudsMonthly, measures, repairFeud } from "../engine/feuds";
import { answer, inbox } from "../engine/worldlife";
import { W, saveW } from "../engine/world";
import { subRng } from "../../game/engine/rng";

const fresh = (seed = 4101) => { const s = newGame(seed); s.fin.treasury = 1e5; s.cap.pc = 90; return s; };

describe("trade agreements", () => {
  it("start deals mirror each product's first two suppliers, and routes come only from deals", () => {
    const s = fresh();
    for (const g of GOODS) expect(SEED_IN[g.id]).toEqual(g.suppliers.slice(0, 2));
    const r = tradeRoutes(s);
    const sellers = new Set(agreements(s).filter((a) => a.dir === "in").map((a) => a.with));
    for (const x of r.filter((y) => !y.out)) expect(sellers.has(x.who)).toBe(true);
    // a country with no deal never appears
    expect(r.some((x) => x.who === "mx")).toBe(false);
    // cancel every supplier of rice: no inbound rice route, shortage starts
    for (const a of agreements(s).filter((x) => x.good === "rice")) cancelAgreement(s, a.id);
    expect(tradeRoutes(s).some((x) => x.label === "Rice in")).toBe(false);
    expect(coverage(s, "rice")).toBe(0);
    expect(importFlow(s, "rice")).toBe(0);
  });
  it("one supplier is a squeeze, cheap deals cut the bill, premium costs more, a cut makes you overpay", () => {
    const s = fresh(4102);
    const base = importFlow(s, "wheat");
    cancelAgreement(s, "in:wheat:ca"); expect(coverage(s, "wheat")).toBe(0.85);
    expect(importFlow(s, "wheat")).toBeLessThan(base);
    expect(signImport(s, "wheat", "ca", "cheap", false).ok).toBe(true);
    expect(priceMult(s, "wheat")).toBeLessThan(1);
    expect(signImport(s, "sugar", "in", "fair", false).ok).toBe(false); // already supplied
    const w0 = s.me.wealth; cancelAgreement(s, "in:rice:br");
    expect(signImport(s, "rice", "br", "fair", true).ok).toBe(true);
    expect(s.me.wealth).toBeGreaterThan(w0); expect(s.me.evidence).toBeGreaterThan(0);
    expect(priceMult(s, "rice")).toBeGreaterThan(1);
  });
  it("new crude customers bring dollars; cancelling one costs relations and builds a grudge", () => {
    const s = fresh(4103);
    const before = s.modifiers.length;
    const w = W(s); w.c.find((c) => c.id === "cn")!.rel = 70; saveW(s, w);
    expect(signCrude(s, "cn", "fair", false).ok).toBe(true);
    advanceMonths(s, 3);
    expect(agreements(s).filter((a) => a.good === "crude").length).toBe(3);
    const h = heatOf(s, "in"); cancelAgreement(s, "out:crude:in");
    expect(heatOf(s, "in")).toBeGreaterThan(h);
    expect(before).toBeGreaterThanOrEqual(0);
  });
  it("an embargo freezes the deal on the map and in the economy", () => {
    const s = fresh(4104);
    setEmbargo(s, "ae", s.month + 6); expect(embargoed(s, "ae")).toBe(true);
    expect(coverage(s, "fuel")).toBe(0.85);
    expect(tradeRoutes(s).find((x) => x.who === "ae")?.state).toBe("blocked");
    const st = imp(s); st.rice.exports = ["gh"]; s.flags.imports = JSON.stringify(st);
    const e0 = exportFlow(s, "rice"); setEmbargo(s, "gh", s.month + 3); expect(exportFlow(s, "rice")).toBeLessThan(e0);
    expect(cancelGoodExport(s, "rice", "gh").ok).toBe(true);
  });
});

describe("grudges and requests with memory", () => {
  it("refusing a request builds heat; a hot country eventually hits back; apologising cools it", () => {
    const s = fresh(4105);
    const w = W(s); const c = w.c.find((x) => x.id === "ke")!; c.rel = 60; saveW(s, w);
    addHeat(s, "ke", 70, "test grievance");
    let hit = false;
    for (let m = 0; m < 60 && !hit; m++) { feudsMonthly(s, subRng(s.meta.seed, "t", m)); s.month++; hit = measures(s).length > 0; }
    expect(hit).toBe(true);
    const h = heatOf(s, "ke"); const r = repairFeud(s, "ke", "apologise"); expect(r.ok).toBe(true);
    expect(heatOf(s, "ke")).toBeLessThan(h);
  });
  it("a favour owed holds a country back", () => {
    let hits = 0, hitsOwed = 0;
    for (let seed = 0; seed < 40; seed++) {
      for (const owed of [false, true]) {
        const s = fresh(4200 + seed); addHeat(s, "gh", 60, "x"); if (owed) s.flags.owes = JSON.stringify({ gh: 3 });
        for (let m = 0; m < 6; m++) { feudsMonthly(s, subRng(s.meta.seed, "t", m)); s.month++; }
        if (measures(s).length) { if (owed) hitsOwed++; else hits++; }
      }
    }
    expect(hitsOwed).toBeLessThan(hits);
  });
  it("answering the new request kinds works and refusing adds heat", () => {
    const s = fresh(4106);
    const w = W(s); const c = w.c.find((x) => x.id === "gh")!; c.rel = 60; saveW(s, w);
    const msgs = inbox(s); msgs.push({ id: "t1", month: s.month, from: "gh", kind: "cheapoil", title: "t", text: "t", options: [{ id: "give", label: "g" }, { id: "no", label: "n" }] }); s.flags.inbox = JSON.stringify(msgs);
    const h = heatOf(s, "gh"); expect(answer(s, "t1", "no").ok).toBe(true); expect(heatOf(s, "gh")).toBeGreaterThan(h);
    const m2 = inbox(s); m2.push({ id: "t2", month: s.month, from: "gh", kind: "seat", title: "t", text: "t", options: [{ id: "give", label: "g" }] }); s.flags.inbox = JSON.stringify(m2);
    expect(answer(s, "t2", "give").ok).toBe(true);
  });
  it("a long game with deals and feuds stays stable", () => {
    const s = fresh(4107); addHeat(s, "us", 80, "x"); addHeat(s, "cn", 60, "x");
    advanceMonths(s, 48);
    expect(Number.isFinite(s.fin.treasury)).toBe(true);
    expect(s.eco.fx).toBeGreaterThan(0);
  });
});
