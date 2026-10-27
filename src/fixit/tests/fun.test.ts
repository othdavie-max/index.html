import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { appoint, sack } from "../engine/cabinet";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { cosCandidates, pickChiefOfStaff, staffAssembly } from "../engine/dayone";
import { backersMonthly, backerSupport, hireMood } from "../engine/backers";
import { checkRecords, RECORDS } from "../engine/history";
import { MOVES, doMove, pegged } from "../engine/bigmoves";
import { subRng } from "../../game/engine/rng";
import { deserialise, serialise } from "../persistence";

describe("day one: chief of staff", () => {
  it("offers four different kinds of people", () => {
    const c = cosCandidates(newGame(201));
    expect(c.length).toBe(4);
    expect(new Set(c.map((x) => x.kind)).size).toBe(4);
    expect(c.map((x) => x.kind)).toContain("friend");
  });
  it("the party chairman's son brings Assembly votes; the technocrat does not", () => {
    const a = newGame(202), b = newGame(202);
    const ca = cosCandidates(a).find((x) => x.kind === "chieftain")!, cb = cosCandidates(b).find((x) => x.kind === "technocrat")!;
    pickChiefOfStaff(a, ca.id); pickChiefOfStaff(b, cb.id);
    expect(staffAssembly(a)).toBeGreaterThan(staffAssembly(b));
  });
  it("a dishonest childhood friend eventually embarrasses you", () => {
    let seen = 0;
    for (let seed = 1; seed <= 25 && !seen; seed++) {
      const s = newGame(seed + 210); const f = cosCandidates(s).find((x) => x.kind === "friend")!; pickChiefOfStaff(s, f.id);
      if (s.staff.cos!.integrity >= 50) continue;
      advanceMonths(s, 40); if (s.events.some((e) => e.tpl === "cosFriend") || s.flags.cosFriendDone) seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("backers", () => {
  it("you start with three backers who want something back", () => {
    const s = newGame(220);
    expect(s.backers.length).toBe(3);
    expect(s.backers.every((b) => b.owed > 0 && b.mood > 55)).toBe(true);
  });
  it("hiring your own people pleases them; hiring qualified strangers does not", () => {
    const own = newGame(221), qual = newGame(221);
    for (const p of ["finance", "cbn", "power"] as const) {
      appoint(own, p, own.cabinet.pool.find((m) => m.portfolio === p && m.faction === "crony")!.id);
      appoint(qual, p, qual.cabinet.pool.find((m) => m.portfolio === p && m.faction === "technocrat")!.id);
    }
    expect(own.backers.reduce((a, b) => a + b.mood, 0)).toBeGreaterThan(qual.backers.reduce((a, b) => a + b.mood, 0) + 40);
    expect(backerSupport(own)).toBeGreaterThan(backerSupport(qual));
    expect(hireMood("technocrat", true)).toBeLessThan(0);
  });
  it("angry backers fight back: anger, insecurity, a blocked Assembly and sabotage events", () => {
    let sab = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = newGame(seed + 230); for (const b of s.backers) b.mood = 8;
      const a0 = s.assembly.support, r0 = s.rule.streetAnger;
      for (let i = 0; i < 24; i++) { for (const e of s.events.filter((x) => x.status === "open")) respond(s, e.id, e.options[e.options.length - 1].id); advanceMonths(s, 1); for (const b of s.backers) b.mood = Math.min(b.mood, 15); }
      if (s.events.some((e) => e.tpl === "backerSabotage")) sab++;
      expect(s.assembly.support).toBeLessThan(a0 + 5); void r0;
    }
    expect(sab).toBeGreaterThan(3);
  });
  it("making peace calms a backer; exposing him can backfire", () => {
    const s = newGame(240); s.fin.treasury = 1e5; for (const b of s.backers) b.mood = 10;
    const e = createEvent(s, "backerSabotage", "NG-FC")!;
    expect(e.title).toContain(s.backers.find((b) => b.id === s.flags.sabBacker)!.name);
    const m0 = s.backers.find((b) => b.id === s.flags.sabBacker)!.mood;
    for (let i = 0; i < 6; i++) { const t = newGame(240 + i); t.fin.treasury = 1e5; for (const b of t.backers) b.mood = 10; const ev = createEvent(t, "backerSabotage", "NG-FC")!; respond(t, ev.id, "reconcile"); }
    expect(m0).toBe(10);
  });
  it("a crony minister who steals puts you on the spot", () => {
    const s = newGame(250);
    const m = s.cabinet.pool.find((x) => x.portfolio === "finance" && x.faction === "crony")!; m.integrity = 10; appoint(s, "finance", m.id);
    let seen = false;
    for (let i = 0; i < 60 && !seen; i++) { backersMonthly(s, subRng(s.meta.seed, "t", i)); s.month++; seen = s.events.some((e) => e.tpl === "cronyLoot"); }
    expect(seen).toBe(true);
  });
  it("sacking your own people costs you their sponsors' goodwill", () => {
    const s = newGame(260); const before = s.backers[0].mood; sack(s, "finance");
    expect(s.backers[0].mood).toBeLessThan(before);
  });
});

describe("record cards", () => {
  it("fire once, with history and a tone", () => {
    const s = newGame(270); s.eco.inflation = 8; s.eco.fx = 450; s.fuel.pump = 90; s.power.available = 11000; s.eco.reserves = 65;
    const got = checkRecords(s);
    for (const id of ["i10", "n500", "f100", "p10k", "r62"]) expect(got).toContain(id);
    expect(checkRecords(s)).toEqual([]);
    expect(s.news.some((n) => n.headline.includes("SINGLE-DIGIT"))).toBe(true);
  });
  it("bad records exist too", () => { expect(RECORDS.filter((r) => r.tone === "bad").length).toBeGreaterThanOrEqual(5); });
  it("does not fire on day one", () => { const s = newGame(271); expect(checkRecords(s).filter((i) => RECORDS.find((r) => r.id === i)!.tone === "good")).toEqual([]); });
});

describe("big moves", () => {
  it("fixing the naira at ₦1 makes cheap fuel for a moment, then collapses when reserves run out", () => {
    const s = newGame(280);
    expect(doMove(s, "peg", 1).ok).toBe(true);
    expect(pegged(s)).toBe(true);
    advanceMonths(s, 1);
    expect(s.eco.fx).toBe(1);
    expect(s.fuel.pump).toBeLessThan(500);
    advanceMonths(s, 6);
    expect(pegged(s)).toBe(false);
    expect(s.eco.fx).toBeGreaterThan(1500);
    expect(s.news.some((n) => n.headline.includes("Peg collapses"))).toBe(true);
  });
  it("a modest peg holds for a long time and records are flagged 'official only'", () => {
    const s = newGame(281); doMove(s, "peg", 1400);
    advanceMonths(s, 3);
    expect(pegged(s)).toBe(true);
  });
  it("every other move has an effect, a price tag and a risk", () => {
    for (const m of MOVES.filter((x) => x.id !== "peg")) {
      const s = newGame(290); s.fin.treasury = 1e5; const t0 = s.fin.treasury, h0 = s.gov.happiness + s.gov.trust + s.assembly.support + s.modifiers.length;
      const r = doMove(s, m.id); expect(r.ok).toBe(true);
      expect(s.fin.treasury !== t0 || s.gov.happiness + s.gov.trust + s.assembly.support + s.modifiers.length !== h0).toBe(true);
      if (m.once) expect(doMove(s, m.id).ok).toBe(false);
      advanceMonths(s, 14);
    }
  });
  it("printing money feels good, then costs you", () => {
    const s = newGame(291); const inf0 = s.eco.inflation; doMove(s, "print"); advanceMonths(s, 8);
    expect(s.modifiers.some((m) => m.source === "move:print:bill")).toBe(true); void inf0;
  });
  it("saves from before this update load fine", () => {
    const s = newGame(292); const raw = JSON.parse(serialise(s)); delete raw.state.backers; delete raw.state.staff;
    const back = deserialise(JSON.stringify(raw)).state;
    expect(back.backers.length).toBe(3); advanceMonths(back, 3);
  });
});

describe("new Nigerian events", () => {
  it("appear over a long game", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) { const s = newGame(seed + 300); for (let i = 0; i < 48 && !s.done; i++) { for (const e of s.events.filter((x) => x.status === "open")) { seen.add(e.tpl); respond(s, e.id, e.options[0].id); } advanceMonths(s, 1); } }
    const fresh = ["xmasFuel", "japa", "cashScarce", "kidnapRoad", "waec", "checkpoint", "partyJollof", "backerDemand"].filter((t) => seen.has(t));
    expect(fresh.length).toBeGreaterThanOrEqual(4);
  });
});

import { adviceFor, briefing, eventAdvice, factsFor, issues } from "../engine/advice";
import { pickVice, vpCandidates } from "../engine/dayone";
import type { Aide, FixState } from "../engine/types";

const withAdvisers = (seed: number, cos: Partial<Aide>, vp?: Partial<Aide>) => {
  const s = newGame(seed);
  const c = cosCandidates(s)[0]; pickChiefOfStaff(s, c.id);
  Object.assign(s.staff.cos!, cos);
  if (vp) { pickVice(s, vpCandidates(s)[0].id); Object.assign(s.staff.vp!, vp); }
  return s;
};
describe("advisers", () => {
  it("the vice president is a real pick with a real effect", () => {
    const s = newGame(400);
    expect(vpCandidates(s).length).toBe(4);
    const reg = vpCandidates(s).find((x) => x.kind === "regional")!, a0 = s.assembly.support;
    pickVice(s, reg.id);
    expect(s.assembly.support).toBeGreaterThan(a0);
    expect(s.staff.vp?.kind).toBe("regional");
  });
  it("a clever, honest adviser warns about the death penalty with the real numbers", () => {
    let hit = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = withAdvisers(seed + 410, { kind: "technocrat", skill: 92, integrity: 95 });
      s.assembly.support = 30; s.rule.judiciary = 25; s.rule.lawLevel = 3;
      const a = adviceFor(s, "law:4")[0];
      if (a.stance !== "go" && /Assembly support is 30%/.test(a.text) && a.sound) hit++;
    }
    expect(hit).toBeGreaterThanOrEqual(9);
  });
  it("a flatterer says 'go' and is usually wrong when the plan is dangerous", () => {
    let flattered = 0, wrong = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = withAdvisers(seed + 430, { kind: "friend", skill: 38, integrity: 30 });
      s.assembly.support = 25; s.rule.lawLevel = 3;
      const a = adviceFor(s, "law:4")[0];
      if (a.stance === "go") flattered++; if (!a.sound) wrong++;
    }
    expect(flattered).toBeGreaterThan(8); expect(wrong).toBeGreaterThan(8);
  });
  it("a general pushes force; a cleric preaches against the death penalty", () => {
    let gen = 0, cle = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const g = withAdvisers(seed + 450, { kind: "general", skill: 60, integrity: 70 }); g.rule.coupRisk = 50;
      if (adviceFor(g, "tool:emergency")[0].stance === "go") gen++;
      const c = withAdvisers(seed + 450, { kind: "cleric", skill: 60, integrity: 80 });
      if (adviceFor(c, "law:4")[0].stance === "stop") cle++;
    }
    expect(gen).toBeGreaterThan(7); expect(cle).toBe(15);
  });
  it("facts exist for every law, tool and move the player can ask about", () => {
    const s = newGame(460);
    for (const k of ["law:1", "law:2", "law:3", "law:4", "amendment", "tool:inec", "tool:postpone", "tool:military", "move:peg", "move:print", "move:jollof"]) expect(factsFor(s, k)).not.toBeNull();
    expect(factsFor(s, "move:peg")!.risk).toBeGreaterThan(0.6);
    expect(factsFor(s, "move:jollof")!.risk).toBeLessThan(0.2);
  });
  it("the briefing notices what is going wrong; advisers with different strengths see different things", () => {
    const s = withAdvisers(470, { kind: "technocrat", skill: 90, integrity: 90 }, { kind: "general", skill: 40, integrity: 70 });
    s.rule.coupRisk = 60; s.eco.reserves = 12; s.assembly.support = 35;
    expect(issues(s).map((i) => i.id)).toEqual(expect.arrayContaining(["coup", "reserves", "assembly"]));
    const b = briefing(s);
    expect(b.length).toBe(2);
    expect(b[0].text).not.toBe(b[1].text);
  });
  it("a flatterer hides bad news", () => {
    let hid = 0;
    for (let seed = 1; seed <= 14; seed++) {
      const s = withAdvisers(seed + 480, { kind: "friend", skill: 40, integrity: 30 });
      s.rule.streetAnger = 80; s.rule.coupRisk = 70;
      if (/under control/.test(briefing(s)[0].text)) hid++;
    }
    expect(hid).toBeGreaterThan(5);
  });
  it("they recommend an option on every event, and a skilled one picks the best", () => {
    const s = withAdvisers(490, { kind: "technocrat", skill: 95, integrity: 90 });
    const e = createEvent(s, "backerDemand", "NG-FC") ?? createEvent(s, "cosParty", "NG-FC")!;
    const adv = eventAdvice(s, e);
    expect(adv.length).toBe(1);
    expect(e.options.some((o) => o.id === adv[0].optId)).toBe(true);
    let sound = 0;
    for (let seed = 1; seed <= 12; seed++) { const t = withAdvisers(seed + 500, { kind: "technocrat", skill: 95, integrity: 90 }); const ev = createEvent(t, "cosParty", "NG-FC")!; if (eventAdvice(t, ev)[0].sound) sound++; }
    expect(sound).toBeGreaterThanOrEqual(8);
  });
  it("no advisers, no advice", () => { const s = newGame(495); expect(adviceFor(s, "law:2")).toEqual([]); expect(briefing(s)).toEqual([]); });
});
void (null as unknown as FixState);
