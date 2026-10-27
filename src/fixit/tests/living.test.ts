import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths, advanceMonth } from "../engine/sim";
import { respond } from "../engine/actions";
import { canStartProject } from "../engine/actions";
import { createEvent } from "../engine/events";
import { addMod } from "../engine/util";
import { punish } from "../engine/power";
import { activeEnemies, dealWithEnemy, ripple } from "../engine/ripples";
import { DEAL_DEFS, dealsOpen } from "../engine/investors";
import { deserialise, serialise } from "../persistence";
import type { FixState } from "../engine/types";

describe("fuel and refineries", () => {
  it("refineries only work if maintained: uptime falls without maintenance", () => {
    const a = newGame(601), b = newGame(601);
    for (const s of [a, b]) addMod(s, "t:ref", "new refinery", { refinery: 300 }, { duration: null, ramp: 1 });
    addMod(b, "t:maint", "good maintenance", { maint: 40 }, { duration: null, ramp: 1 });
    advanceMonths(a, 24); advanceMonths(b, 24);
    expect(b.oil.uptime).toBeGreaterThan(a.oil.uptime + 5);
    expect(b.oil.refined).toBeGreaterThan(a.oil.refined);
  });
  it("fuel made at home lowers the pump price and the queues", () => {
    const a = newGame(602), b = newGame(602);
    addMod(b, "t:ref", "refineries", { refinery: 420, maint: 30 }, { duration: null, ramp: 1 });
    advanceMonths(a, 12); advanceMonths(b, 12);
    expect(b.fuel.importShare).toBeLessThan(a.fuel.importShare);
    expect(b.fuel.pump).toBeLessThan(a.fuel.pump);
    expect(b.oil.scarcity).toBeLessThan(a.oil.scarcity);
  });
});

describe("investor deals", () => {
  it("offers arrive when investors are confident, then build and open with visible effects", () => {
    let opened = 0, offered = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = newGame(seed + 610); s.eco.investor = 70;
      for (let i = 0; i < 40 && !s.done; i++) {
        s.eco.investor = Math.max(s.eco.investor, 60);
        for (const e of s.events.filter((x) => x.status === "open")) { if (e.tpl === "investorOffer") offered++; respond(s, e.id, e.tpl === "investorOffer" ? "generous" : e.options[0].id); }
        advanceMonths(s, 1);
      }
      opened += dealsOpen(s).length;
    }
    expect(offered).toBeGreaterThan(2); expect(opened).toBeGreaterThan(1);
    expect(DEAL_DEFS.length).toBeGreaterThanOrEqual(6);
  });
  it("deals stall when security collapses", () => {
    const s = newGame(620); s.eco.investor = 70;
    s.deals.push({ id: "d1", name: "x", sector: "x", stateId: "NG-LA", capex: 1, jobs: 1, start: 0, months: 10, progress: 0.2, status: "building", terms: "fair", benefit: "", effects: {}, revenue: 1 });
    s.rule.democracy = 8; advanceMonths(s, 2);
    expect(s.deals[0].status).toBe("stalled");
  });
});

describe("ripples and enemies", () => {
  it("an execution sets off a chain of named reactions over months and creates an enemy", () => {
    let enemies = 0, titles = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const s = newGame(seed + 630); s.rule.lawLevel = 4; const lm = s.lawmakers[0]; lm.stolen = 80; lm.evidence = 80;
      punish(s, lm, "case");
      advanceMonths(s, 20);
      titles += s.timeline.filter((t) => t.chain === "execute").length;
      enemies += activeEnemies(s).length + s.enemies.filter((e) => e.status !== "active").length;
      expect(s.news.some((n) => n.headline === "Fear in the Assembly")).toBe(true);
    }
    expect(titles).toBeGreaterThan(20); expect(enemies).toBeGreaterThan(3);
  });
  it("enemies fight back, and you can buy them off, make peace or crush them", () => {
    const s = newGame(640); s.fin.treasury = 1e5; ripple(s, "press"); ripple(s, "rival"); ripple(s, "purge");
    advanceMonths(s, 14);
    expect(s.enemies.length).toBeGreaterThan(0);
    const outcomes = new Set<string>();
    for (const how of ["buy", "peace", "crush"] as const) for (let seed = 1; seed <= 10; seed++) {
      const t = newGame(seed + 640); t.fin.treasury = 1e5;
      t.enemies.push({ id: "e1", name: "Col. Test", reason: "test", portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, plan: "coup", power: 40, grudge: 50, zone: "NW", status: "active", since: 0 });
      const r = dealWithEnemy(t, "e1", how); outcomes.add(`${how}:${r.ok}:${t.enemies[0].status}`);
    }
    expect([...outcomes].some((o) => o.startsWith("buy:true:bought"))).toBe(true);
    expect([...outcomes].some((o) => o.startsWith("peace:true:reconciled"))).toBe(true);
    expect([...outcomes].some((o) => o.startsWith("crush:true:crushed"))).toBe(true);
    expect([...outcomes].some((o) => o.startsWith("crush:false:active"))).toBe(true);
  });
  it("an enemy event can show up when a strong enemy is active", () => {
    const s = newGame(650); s.fin.treasury = 1e5;
    s.enemies.push({ id: "e1", name: "Col. Test", reason: "test", portrait: { skin: 1, hair: 0, style: 0, accent: 0 }, plan: "coup", power: 70, grudge: 90, zone: "NW", status: "active", since: 0 });
    let seen = false; for (let i = 0; i < 40 && !seen; i++) { advanceMonths(s, 1); seen = s.events.some((e) => e.tpl === "enemyMove"); }
    expect(seen).toBe(true);
  });
  it("the timeline records what your decisions caused", () => {
    const s = newGame(660); ripple(s, "purge"); expect(s.timeline.length).toBe(1);
    const back = deserialise(serialise(s)).state; expect(back.timeline.length).toBe(1);
  });
});

describe("the desk, expectations and term crises", () => {
  it("the desk is never empty: cards arrive almost every month", () => {
    let empty = 0, cards = 0;
    for (let seed = 1; seed <= 4; seed++) { const s = newGame(seed + 670); for (let i = 0; i < 36 && !s.done; i++) { for (const e of s.events.filter((x) => x.status === "open")) respond(s, e.id, e.options[0].id); advanceMonth(s); if (s.ended) break; const open = s.events.filter((e) => e.status === "open").length; if (open === 0) empty++; cards += open; } }
    expect(empty).toBeLessThan(18); expect(cards).toBeGreaterThan(80);
  });
  it("a promised road comes back: kept or broken", () => {
    const a = newGame(680), b = newGame(680);
    for (const s of [a, b]) { const e = createEvent(s, "villageRoad", "NG-KN")!; respond(s, e.id, "promise"); }
    a.projects.push({ id: "pX", defId: "farmRoads", name: "road", stateId: "NG-KN", funding: "treasury", start: 0, months: 1, delay: 0, progress: 1, cost: 1, baseCost: 1, spent: 1, leaked: 0, quality: 1, status: "done", notes: [], done: 5 });
    const t0 = a.gov.trust, t1 = b.gov.trust;
    advanceMonths(a, 18); advanceMonths(b, 18);
    expect(a.news.some((n) => n.headline.includes("kept his word"))).toBe(true);
    expect(b.news.some((n) => n.headline.includes("you promised us a road"))).toBe(true); void t0; void t1;
  });
  it("expectations rise as you succeed, dragging mood unless you keep delivering", () => {
    const s = newGame(690); advanceMonths(s, 30);
    expect(Number(s.flags.expect)).toBeGreaterThan(0.9);
    expect(s.modifiers.some((m) => m.source === "expectations")).toBe(true);
  });
  it("term 2 brings an oil crash, term 3 an elite plot, term 4 a succession fight", () => {
    for (const [term, tpl] of [[2, "oilCrash"], [3, "elitePlot"], [4, "succession"]] as const) {
      const s = newGame(700 + term); s.term = term; s.termStart = s.month; s.flags.noop = 1;
      advanceMonths(s, 10);
      expect(s.events.some((e) => e.tpl === tpl)).toBe(true);
    }
  });
});

describe("national dreams", () => {
  it("unlock only after the basics are delivered", () => {
    const s = newGame(710);
    expect(canStartProject(s, "dreamWorldCup", "NG-LA", "treasury")).toMatch(/four other projects/);
    for (let i = 0; i < 4; i++) s.projects.push({ id: `q${i}`, defId: "storage", name: "s", stateId: "NG-KN", funding: "treasury", start: 0, months: 1, delay: 0, progress: 1, cost: 1, baseCost: 1, spent: 1, leaked: 0, quality: 1, status: "done", notes: [], done: 1 });
    s.fin.treasury = 1e6;
    expect(canStartProject(s, "dreamWorldCup", "NG-LA", "treasury")).toBeNull();
    expect(canStartProject(s, "dreamRailCalabar", "NG-LA", "treasury")).toBeNull();
    expect(canStartProject(s, "dreamPeace", "NG-BO", "treasury")).toBeNull();
  });
});

describe("old saves", () => {
  it("load with the new fields filled in", () => {
    const s = newGame(720); const raw = JSON.parse(serialise(s)); delete raw.state.deals; delete raw.state.enemies; delete raw.state.timeline; delete raw.state.oil.uptime; delete raw.state.oil.scarcity;
    const back = deserialise(JSON.stringify(raw)).state;
    expect(back.deals).toEqual([]); expect(back.oil.uptime).toBe(70); advanceMonths(back, 3);
  });
});
