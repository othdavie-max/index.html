import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { GOODS, buildFactory, exportBlock, factoryBlock, imp, importsMonthly, localShare, setPolicy, signExport, totalExports, totalImports } from "../engine/imports";
import { W, saveW } from "../engine/world";
import { subRng } from "../../game/engine/rng";

const g = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 6; return s; };
describe("imports, factories and exports", () => {
  it("Nigeria starts as an importer of almost everything", () => {
    const s = g(1); expect(totalImports(s)).toBeGreaterThan(12); expect(totalExports(s)).toBe(0); expect(GOODS.length).toBeGreaterThanOrEqual(10);
    expect(localShare(s, "phones")).toBeLessThan(0.1); expect(localShare(s, "rice")).toBeGreaterThan(0.4);
  });
  it("banning an import before you can make it raises prices and smuggling; a tariff earns revenue", () => {
    const s = g(2); importsMonthly(s, subRng(1, "a", 1)); const base = s.modifiers.find((m) => m.source === "imports")!.effects;
    expect(setPolicy(s, "rice", "ban").ok).toBe(true); expect(setPolicy(s, "phones", "tariff").ok).toBe(true); importsMonthly(s, subRng(1, "a", 2));
    const e = s.modifiers.find((m) => m.source === "imports")!.effects;
    expect(e.foodPrice ?? 0).toBeGreaterThan(base.foodPrice ?? 0); expect(e.corruption ?? 0).toBeGreaterThan(0); expect(e.revenue ?? 0).toBeGreaterThan(0);
    expect(setPolicy(s, "fuel", "ban").ok).toBe(false);
  });
  it("factories raise home production, cut the import bill and create jobs; heavy industry needs power", () => {
    const s = g(3); const b0 = totalImports(s), l0 = localShare(s, "medicine");
    for (let i = 0; i < 3; i++) { expect(buildFactory(s, "medicine").ok).toBe(true); expect(buildFactory(s, "medicine").ok).toBe(false); s.month += 8; importsMonthly(s, subRng(3, "f", i)); }
    expect(imp(s).medicine.factory).toBe(3); expect(localShare(s, "medicine")).toBeGreaterThan(l0 + 0.4); expect(totalImports(s)).toBeLessThan(b0);
    expect((s.modifiers.find((m) => m.source === "imports")!.effects.jobs ?? 0)).toBeLessThan(0);
    const t = g(4); t.power.available = 500; expect(factoryBlock(t, "machinery")).toMatch(/electricity/);
  });
  it("once home production passes 80%, buyers appear and exports earn dollars", () => {
    const s = g(5); expect(exportBlock(s, "medicine", "gh")).toMatch(/80%/);
    const st = imp(s); st.medicine.factory = 5; s.flags.imports = JSON.stringify(st); expect(localShare(s, "medicine")).toBeGreaterThan(0.8);
    const w = W(s); w.c.find((c) => c.id === "gh")!.rel = 70; saveW(s, w);
    expect(signExport(s, "medicine", "gh").ok).toBe(true); expect(signExport(s, "medicine", "gh").ok).toBe(false); expect(totalExports(s)).toBeGreaterThan(0);
    importsMonthly(s, subRng(5, "e", 1)); expect(s.modifiers.find((m) => m.source === "imports")!.effects.fxSupply ?? 0).toBeGreaterThan(0);
  });
  it("a long game with trade running stays stable", () => { const s = g(6); advanceMonths(s, 40); expect(totalImports(s)).toBeGreaterThan(0); });
});
