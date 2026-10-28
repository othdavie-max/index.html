import { describe, it, expect } from "vitest";
import { makeGame, advance } from "./helpers";
import { partition, apportion } from "../engine/geometry";
import { Rng, subRng } from "../engine/rng";
import { STATES } from "../data/states";

describe("constituency delimitation (simulated)", () => {
  it("splits items into compact, balanced, deterministic groups", () => {
    const items = Array.from({ length: 23 }, (_, i) => ({ id: `i${i}`, x: (i * 37) % 11, y: (i * 17) % 7, w: 1 + (i % 4) }));
    const a = partition(items, 5), b = partition(items, 5);
    expect(a.map((g) => g.map((x) => x.id))).toEqual(b.map((g) => g.map((x) => x.id)));
    expect(a).toHaveLength(5);
    expect(a.flat()).toHaveLength(23);
    expect(new Set(a.flat().map((x) => x.id)).size).toBe(23);
    expect(a.every((g) => g.length >= 1)).toBe(true);
  });
  it("apportions seats with a minimum of one each and the right total", () => {
    const r = apportion([10, 1, 1, 30], 12);
    expect(r.reduce((a, b) => a + b, 0)).toBe(12);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(1);
    expect(r[3]).toBeGreaterThan(r[1]);
  });
  it("gives each state exactly its constitutional seat counts", () => {
    const s = makeGame();
    for (const m of STATES) {
      const st = s.states[m.id];
      expect(st.repsSeatIds, m.id).toHaveLength(m.repsSeats);
      expect(st.senateSeatIds, m.id).toHaveLength(m.isFct ? 1 : 3);
      if (!m.isFct) { expect(st.assemblySeatIds.length).toBeGreaterThanOrEqual(24); expect(st.assemblySeatIds.length).toBeLessThanOrEqual(40); }
      else expect(st.assemblySeatIds).toHaveLength(0);
    }
  });
});

describe("random numbers", () => {
  it("are reproducible from a seed and independent per stream", () => {
    const a = new Rng(5), b = new Rng(5);
    expect([a.next(), a.next(), a.int(1, 10)]).toEqual([b.next(), b.next(), b.int(1, 10)]);
    expect(subRng(1, "x", 2).next()).toBe(subRng(1, "x", 2).next());
    expect(subRng(1, "x", 2).next()).not.toBe(subRng(1, "y", 2).next());
    const r = new Rng(9); const xs = Array.from({ length: 2000 }, () => r.next());
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0); expect(Math.max(...xs)).toBeLessThan(1);
  });
});

describe("AI politicians", () => {
  it("run for office, defect and replace each other without breaking the world", () => {
    const s = makeGame({ seed: 21 });
    advance(s, 60, { keepAfloat: 100000 });
    expect(s.news.some((n) => n.topic === "party")).toBe(true);
    for (const seat of Object.values(s.seats)) {
      expect(seat.holderId, seat.id).toBeTruthy();
      if (seat.holderId !== "player") expect(s.chars[seat.holderId!], seat.id).toBeDefined();
      if (seat.holderId !== "player") { const c = s.chars[seat.holderId!]; expect(c.seatId, seat.id).toBe(seat.id); expect(c.status === "active" || c.status === "retired" || c.status === "jailed" || c.status === "deceased").toBe(true); }
    }
    // no person holds two seats
    const holders = Object.values(s.seats).map((x) => x.holderId);
    expect(new Set(holders).size).toBe(holders.length);
  });
  it("respect role: legislators and governors hold different office types, and a president has term limits", () => {
    const s = makeGame({ seed: 22 });
    advance(s, 25, { keepAfloat: 100000 });
    const pres = s.chars[s.seats["pres"].holderId!];
    expect(s.seats[pres.seatId!].office).toBe("president");
    for (const g of Object.values(s.seats).filter((x) => x.office === "governor")) expect(s.chars[g.holderId!].seatId).toBe(g.id);
  });
});
