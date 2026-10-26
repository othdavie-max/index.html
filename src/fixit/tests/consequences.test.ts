import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { applyMeasure, enactPolicy, repealPolicy, respond, applyFuel } from "../engine/actions";
import { createEvent } from "../engine/events";
import { upcoming } from "../engine/forecast";
import { computeChallenge } from "../engine/challenge";
import { setPromises, promiseScore, checkAchievements } from "../engine/promises";
import { reelectionChance } from "../engine/legacy";
import { snap } from "../engine/util";

describe("decisions affect the future", () => {
  it("releasing grain plants a visible future consequence that resolves on time", () => {
    const s = newGame(21);
    applyMeasure(s, "grainReserve");
    const echo = s.echoes.find((e) => e.kind === "emptySilos")!;
    expect(echo.status).toBe("pending");
    expect(upcoming(s, 20).some((u) => u.kind === "consequence" && u.label.includes("silos"))).toBe(true);
    advanceMonths(s, echo.due - s.month);
    expect(echo.status).toBe("pending");
    advanceMonths(s, 1);
    expect(echo.status).toBe("done");
    expect(s.reports.some((r) => r.title.startsWith("Consequence"))).toBe(true);
  });
  it("what you do before a consequence arrives changes how it turns out", () => {
    const a = newGame(22), b = newGame(22);
    for (const s of [a, b]) applyMeasure(s, "grainReserve");
    b.agri.storage = 40; // b invested in storage in the meantime
    const due = a.echoes[0].due;
    expect(due % 12).toBe(0); // lands in June, the start of the lean season
    advanceMonths(a, due + 1); advanceMonths(b, due + 1);
    expect(a.echoes[0].outTone).toBe("bad");
    expect(b.echoes[0].outTone).toBe("good");
  });
  it("good reforms pay off later only if you keep them", () => {
    const keep = newGame(23), drop = newGame(23);
    for (const s of [keep, drop]) { s.fin.treasury = 1e5; enactPolicy(s, "eProcure"); }
    advanceMonths(drop, 3); repealPolicy(drop, "eProcure");
    const p0 = keep.gov.procurement;
    advanceMonths(keep, 14); advanceMonths(drop, 11);
    expect(keep.echoes[0].outTone).toBe("good");
    expect(keep.gov.procurement).toBeGreaterThan(p0);
    expect(drop.echoes[0].outTone).toBe("bad");
  });
  it("event choices plant consequences (kickback leaves a paper trail)", () => {
    const s = newGame(24);
    const ev = createEvent(s, "kickback", "NG-FC")!;
    respond(s, ev.id, "accept");
    const e0 = s.me.evidence;
    expect(s.echoes.some((e) => e.kind === "kickbackTrail")).toBe(true);
    advanceMonths(s, 11);
    expect(s.me.evidence).toBeGreaterThan(e0);
  });
  it("fuel decisions plant follow-on effects", () => {
    const s = newGame(25);
    applyFuel(s, "remove");
    expect(s.echoes.some((e) => e.kind === "fuelShockWave")).toBe(true);
  });
  it("consequences are deterministic across replays", () => {
    const a = newGame(26), b = newGame(26);
    for (const s of [a, b]) { applyMeasure(s, "securityPush"); applyMeasure(s, "wageDeal"); advanceMonths(s, 12); }
    expect(a.echoes.map((e) => e.outcome)).toEqual(b.echoes.map((e) => e.outcome));
    expect(JSON.stringify(snap(a))).toBe(JSON.stringify(snap(b)));
  });
  it("every challenge action shows effects now and, where relevant, what it sets up for later", () => {
    const s = newGame(27);
    const ch = computeChallenge(s);
    expect(ch.actions.some((a) => (a.chips?.length ?? 0) > 0)).toBe(true);
    expect(ch.actions.some((a) => !!a.later)).toBe(true);
    expect(ch.advice?.length).toBeGreaterThan(0);
  });
});

describe("promises, milestones and scandals", () => {
  it("promises are limited to three and change re-election odds", () => {
    const s = newGame(28);
    setPromises(s, ["inflation", "power", "food", "jobs"]);
    expect(s.promises.length).toBe(3);
    const base = reelectionChance(s);
    s.eco.inflation = 9; s.power.available = 7000; // two promises now kept
    expect(promiseScore(s).kept).toBe(2);
    expect(reelectionChance(s)).toBeGreaterThan(base);
  });
  it("milestones are awarded once", () => {
    const s = newGame(29); s.eco.inflation = 8;
    expect(checkAchievements(s).length).toBeGreaterThan(0);
    expect(checkAchievements(s).length).toBe(0);
  });
  it("investigations count as scandals", () => {
    const s = newGame(30); s.fin.treasury = 5000;
    const ev = createEvent(s, "investigation", "NG-FC")!;
    respond(s, ev.id, "cooperate");
    expect(s.me.scandals).toBe(1);
  });
});
