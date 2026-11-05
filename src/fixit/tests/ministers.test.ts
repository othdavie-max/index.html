import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { workLog } from "../engine/ministerwork";
import { PORTFOLIOS } from "../engine/cabinet";

const run = (seed: number, skill: number, integrity: number, months = 36) => {
  const s = newGame(seed); s.fin.treasury = 1e5;
  for (const p of PORTFOLIOS) { const m = s.cabinet.members[p.id]; if (m) { m.skill = skill; m.integrity = integrity; m.mood = 70; } }
  advanceMonths(s, months); return workLog(s);
};
describe("ministers at work", () => {
  it("strong ministers deliver on their own, weak ones blunder, and dishonest ones lose money", () => {
    let good = 0, goodWeak = 0, bad = 0, badStrong = 0, dirty = 0, dirtyClean = 0;
    for (let seed = 0; seed < 12; seed++) {
      const a = run(5000 + seed, 90, 90), b = run(5000 + seed, 25, 90), c = run(5000 + seed, 90, 10);
      good += a.filter((e) => e.tone === "good").length; bad += b.filter((e) => e.tone === "bad").length; goodWeak += b.filter((e) => e.tone === "good").length; badStrong += a.filter((e) => e.tone === "bad").length;
      dirty += c.filter((e) => e.tone === "dirty").length; dirtyClean += a.filter((e) => e.tone === "dirty").length;
    }
    expect(good).toBeGreaterThan(goodWeak * 2);
    expect(bad).toBeGreaterThan(badStrong);
    expect(dirty).toBeGreaterThan(dirtyClean);
  });
  it("skipping the cabinet screen is a gamble, not the best team", () => {
    const skills: number[] = [];
    for (let seed = 0; seed < 30; seed++) { const s = newGame(5200 + seed); for (const p of PORTFOLIOS) { const m = s.cabinet.members[p.id]; if (m) skills.push(m.skill); } }
    const avg = skills.reduce((a, b) => a + b, 0) / Math.max(1, skills.length);
    expect(avg).toBeLessThan(80);
  });
});
