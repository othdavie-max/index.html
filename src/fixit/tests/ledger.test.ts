import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { punish } from "../engine/power";
import { prosecuteGovernor, prosecuteMinister } from "../engine/officials";
import { allocate, recoverLoot } from "../engine/ledger";
import { yearReview } from "../engine/review";
import { deserialise, serialise } from "../persistence";

describe("the loot ledger", () => {
  it("stolen money is counted as lawmakers steal", () => {
    const s = newGame(1101); s.fin.treasury = 1e5; advanceMonths(s, 30);
    expect(s.ledger.stolen).toBeGreaterThan(0);
  });
  it("ministers and governors now return loot at every level of the law", () => {
    for (const level of [1, 2, 3, 4] as const) {
      const a = newGame(1102 + level); a.rule.lawLevel = level; prosecuteMinister(a, "finance");
      expect(a.ledger.recovered).toBeGreaterThan(0);
      const b = newGame(1110 + level); b.rule.lawLevel = level; b.flags.lootAmt = 100; prosecuteGovernor(b, "NW");
      expect(b.ledger.recovered).toBeGreaterThan(0);
    }
  });
  it("a reprimand recovers almost nothing; harsher laws recover more", () => {
    const rec = (level: 0 | 1 | 2 | 3 | 4) => { const s = newGame(1120); s.rule.lawLevel = level; const lm = s.lawmakers[0]; lm.stolen = 100; lm.evidence = 90; punish(s, lm, "case"); return s.ledger.recovered; };
    expect(rec(0)).toBeLessThan(rec(1)); expect(rec(1)).toBeGreaterThan(rec(4));
  });
  it("recovered loot waits for your decision, and offers a choice", () => {
    const s = newGame(1130); s.fin.treasury = 1000;
    recoverLoot(s, 60, "Sen. Test");
    expect(s.ledger.pending).toBe(60); expect(s.fin.treasury).toBe(1000);
    const e = s.events.find((x) => x.tpl === "lootDecision")!; expect(e).toBeDefined();
    expect(e.options.map((o) => o.id)).toEqual(["schools", "clinics", "roads", "debt", "fund", "treasury"]);
    respond(s, e.id, "schools");
    expect(s.ledger.pending).toBe(0); expect(s.ledger.used.schools).toBe(60);
    expect(s.modifiers.some((m) => m.source.startsWith("loot:schools"))).toBe(true);
    expect(s.news.some((n) => n.headline.includes("Recovered loot funds"))).toBe(true);
  });
  it("each destination does something real", () => {
    const base = () => { const s = newGame(1140); s.fin.treasury = 1000; recoverLoot(s, 50, "x"); return s; };
    const t = base(); allocate(t, "treasury"); expect(t.fin.treasury).toBe(1050);
    const d = base(), d0 = d.fin.domesticDebt; allocate(d, "debt"); expect(d.fin.domesticDebt).toBe(d0 - 50);
    const c = base(); allocate(c, "clinics"); expect(c.modifiers.some((m) => m.source.startsWith("loot:clinics") && (m.effects.health ?? 0) > 0)).toBe(true);
    const r = base(); allocate(r, "roads"); expect(r.modifiers.some((m) => m.source.startsWith("loot:roads"))).toBe(true);
    const f = base(); allocate(f, "fund"); expect(f.fin.treasury).toBe(1050); // no savings fund yet: treasury
    expect(allocate(t, "schools").ok).toBe(false);
  });
  it("loot you ignore is swept into the treasury, and nothing is lost", () => {
    const s = newGame(1150); s.fin.treasury = 1e5; recoverLoot(s, 40, "x");
    const e = s.events.find((x) => x.tpl === "lootDecision")!; void e;
    advanceMonths(s, 6);
    expect(s.ledger.pending).toBe(0);
    expect((s.ledger.used.treasury ?? 0)).toBeGreaterThan(0);
  });
  it("the year review and old saves know about the ledger", () => {
    const s = newGame(1160); s.ledger.stolen = 300; s.ledger.recovered = 120;
    expect(yearReview(s, 1).permanent.join(" ")).toMatch(/Stolen so far: ₦300bn. Recovered: ₦120bn/);
    const raw = JSON.parse(serialise(s)); delete raw.state.ledger;
    const back = deserialise(JSON.stringify(raw)).state; expect(back.ledger.recovered).toBe(0); advanceMonths(back, 2);
  });
  it("an executed governor's loot shows up in the ledger and the toast flag", () => {
    const s = newGame(1170); s.rule.lawLevel = 4; createEvent(s, "governorLoot", "NG-FC"); s.flags.lootAmt = 120;
    prosecuteGovernor(s, "NW");
    expect(s.ledger.recovered).toBeGreaterThan(30); expect(String(s.flags.lootToast)).toMatch(/Governor/);
  });
});
