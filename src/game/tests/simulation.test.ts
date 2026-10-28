import { describe, it, expect } from "vitest";
import { makeGame, advance, lgaNamed, digest, diffKeys } from "./helpers";
import { advanceMonth, canAdvance, advanceToNextEvent } from "../engine/turn";
import { perform } from "../engine/actions";
import { gameDate, playerAge, dateOf, monthIndexOf } from "../engine/calendar";
import { processEvents } from "../engine/events";
import { createNewGame, validateConfig } from "../engine/newgame";
import { BACKGROUNDS } from "../data/life";
import { LGA_BY_ID } from "../engine/admin";

describe("calendar and time advancement", () => {
  it("converts month indexes to dates and back, across year ends", () => {
    expect(dateOf(0)).toEqual({ year: 2026, month: 1 });
    expect(dateOf(11)).toEqual({ year: 2026, month: 12 });
    expect(dateOf(12)).toEqual({ year: 2027, month: 1 });
    expect(monthIndexOf(2027, 2)).toBe(13);
  });
  it("advances exactly one month per call and keeps the clock consistent", () => {
    const s = makeGame();
    expect(s.clock).toEqual({ monthIndex: 0, processedThrough: 0 });
    expect(advanceMonth(s)).toBe(true);
    expect(s.clock).toEqual({ monthIndex: 1, processedThrough: 1 });
    expect(gameDate(s)).toEqual({ year: 2026, month: 2 });
    advance(s, 11);
    expect(gameDate(s)).toEqual({ year: 2027, month: 1 });
    expect(s.clock.processedThrough).toBe(12);
  });
  it("ages the player on their birthday", () => {
    const s = makeGame({ startAge: 18 });
    const start = playerAge(s);
    expect(start).toBe(18);
    advance(s, 12, { keepAfloat: 300000 });
    expect(playerAge(s)).toBe(19);
  });
  it("refuses to advance while a decision is pending or the life has ended", () => {
    const s = makeGame();
    s.pending.push({ occurrenceId: "x@0@player", defId: "viral_post", title: "t", text: "t", scopeId: null, choices: [{ id: "ignore", label: "l", desc: "d" }], deadline: 5, defaultChoiceId: "ignore" });
    expect(canAdvance(s).ok).toBe(false);
    expect(perform(s, { t: "advance" }).ok).toBe(false);
    expect(s.clock.monthIndex).toBe(0);
    s.pending = [];
    s.gameOver = { month: 0, kind: "died", text: "x" };
    expect(canAdvance(s).ok).toBe(false);
  });
  it("does not process a month twice", () => {
    const s = makeGame();
    advance(s, 3);
    const cashBefore = s.player.finances.cash;
    const news = s.news.length;
    // pretend the clock was rewound by a bug/duplicate call: the guard must refuse to re-process
    s.clock.monthIndex = 2;
    expect(advanceMonth(s)).toBe(false);
    expect(s.player.finances.cash).toBe(cashBefore);
    expect(s.news.length).toBe(news);
  });
  it("advance-to-next-event stops for something worth attention and never runs unbounded", () => {
    const s = makeGame();
    const n = advanceToNextEvent(s, 24);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(24);
    expect(s.clock.monthIndex).toBe(n);
  });
});

describe("determinism", () => {
  it("same seed and same actions give identical worlds", () => {
    const a = makeGame({ seed: 777 });
    const b = makeGame({ seed: 777 });
    perform(a, { t: "joinParty", partyId: "PHP" }); perform(b, { t: "joinParty", partyId: "PHP" });
    advance(a, 30, { keepAfloat: 100000 }); advance(b, 30, { keepAfloat: 100000 });
    expect(diffKeys(a as never, b as never)).toEqual([]);
    expect(digest(a)).toBe(digest(b));
  });
  it("different seeds produce different worlds", () => {
    const a = makeGame({ seed: 1 });
    const b = makeGame({ seed: 2 });
    expect(digest(a.states)).not.toBe(digest(b.states));
  });
});

describe("events fire once and change real state", () => {
  it("never records the same occurrence twice", () => {
    const s = makeGame();
    advance(s, 60, { keepAfloat: 200000 });
    const ids = s.eventLog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(5);
  });
  it("re-running event processing for the same month adds nothing", () => {
    const s = makeGame();
    advance(s, 20);
    const before = s.eventLog.length;
    const cooldowns = JSON.stringify(s.eventCooldowns);
    processEvents(s); // same month again
    expect(s.eventLog.length).toBe(before);
    expect(JSON.stringify(s.eventCooldowns)).toBe(cooldowns);
  });
  it("news is always traceable to something that happened", () => {
    const s = makeGame();
    advance(s, 48, { keepAfloat: 200000 });
    const logIds = new Set(s.eventLog.map((e) => e.id));
    let checked = 0;
    for (const n of s.news) {
      expect(n.source.length).toBeGreaterThan(0);
      if (/^[a-z_]+@\d+@/.test(n.source)) { expect(logIds.has(n.source.split(":ai")[0]), n.source).toBe(true); checked++; }
      if (n.source.startsWith("election:")) { const cid = n.source.slice("election:".length).replace(/:r1$/, ""); expect(cid.startsWith("C:")).toBe(true); }
    }
    expect(checked).toBeGreaterThan(0);
    // each source+headline pair appears once
    const keys = s.news.map((n) => `${n.source}|${n.headline}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("a fuel-price shock raises fuel prices and inflation pressure", () => {
    const s = makeGame({ seed: 5 });
    const base = JSON.parse(JSON.stringify(s));
    // apply the shock to one and not the other, same seed otherwise
    s.economy.shocks.push({ id: "t1", key: "fuelPrice", amount: 40, months: 3, remaining: 3, source: "test", mode: "pct" });
    advance(s, 6); advance(base, 6);
    expect(s.economy.fuelPrice).toBeGreaterThan(base.economy.fuelPrice * 1.05);
    expect(s.economy.inflation).toBeGreaterThan(base.economy.inflation);
  });
});

describe("new games", () => {
  it("works for every family background and records the birthplace", () => {
    for (const b of BACKGROUNDS) {
      const l = lgaNamed("Fagge");
      const s = makeGame({ backgroundId: b.id, birthLgaId: l.id, birthStateId: l.stateId, seed: 9 });
      expect(s.player.backgroundId).toBe(b.id);
      expect(s.player.birthLgaId).toBe(l.id);
      expect(s.player.birthStateId).toBe("NG-KN");
      expect(s.player.residenceLgaId).toBe(l.id);
      expect(s.player.finances.cash).toBe(b.cash);
      expect(s.player.finances.savings).toBe(b.savings);
    }
  });
  it("starts different backgrounds with different resources and connections", () => {
    const poor = makeGame({ backgroundId: "low" });
    const rich = makeGame({ backgroundId: "inherited" });
    const connected = makeGame({ backgroundId: "political" });
    expect(rich.player.finances.savings).toBeGreaterThan(poor.player.finances.savings * 10);
    expect(Object.keys(connected.player.relationships).length).toBeGreaterThan(Object.keys(poor.player.relationships).length);
    expect(connected.player.politics.capital).toBeGreaterThan(poor.player.politics.capital);
  });
  it("rejects invalid configs", () => {
    const l = lgaNamed("Ikeja");
    const base = { name: "A", female: true, birthStateId: l.stateId, birthLgaId: l.id, startAge: 18, backgroundId: "low", difficulty: "standard" as const };
    expect(validateConfig({ ...base, name: " " }).length).toBeGreaterThan(0);
    expect(validateConfig({ ...base, birthStateId: "NG-KN" }).length).toBeGreaterThan(0); // LGA not in that state
    expect(validateConfig({ ...base, startAge: 17 }).length).toBeGreaterThan(0);
    expect(validateConfig({ ...base, bonus: { intelligence: 15 } }).length).toBeGreaterThan(0);
    expect(validateConfig({ ...base, bonus: { intelligence: 14, charisma: 14 } }).length).toBeGreaterThan(0);
    expect(() => createNewGame({ ...base, birthLgaId: "nope" })).toThrow();
  });
  it("older starts skip ahead consistently", () => {
    const s = makeGame({ startAge: 27, path: { courseId: "law", jobId: "associate_lawyer" }, backgroundId: "middle" });
    expect(playerAge(s)).toBe(27);
    expect(s.player.education.certificates).toContain("LL.B Law");
    expect(s.player.occupation.jobId).toBe("associate_lawyer");
    const l = LGA_BY_ID[s.player.birthLgaId];
    expect(l).toBeDefined();
  });
  it("sandbox adds starting cash; challenging reduces it", () => {
    const std = makeGame({ backgroundId: "middle" });
    const sb = makeGame({ backgroundId: "middle", difficulty: "sandbox", sandbox: { startingCash: 5_000_000 } });
    const ch = makeGame({ backgroundId: "middle", difficulty: "challenging" });
    expect(sb.player.finances.cash).toBe(std.player.finances.cash + 5_000_000);
    expect(ch.player.finances.cash).toBeLessThan(std.player.finances.cash);
  });
  it("builds the political world: seats, parties and politicians", () => {
    const s = makeGame();
    expect(Object.keys(s.states)).toHaveLength(37);
    expect(Object.keys(s.lgas)).toHaveLength(774);
    const seats = Object.values(s.seats);
    expect(seats.filter((x) => x.office === "lg_chair")).toHaveLength(774);
    expect(seats.filter((x) => x.office === "governor")).toHaveLength(36);
    expect(seats.filter((x) => x.office === "senate")).toHaveLength(109);
    expect(seats.filter((x) => x.office === "reps")).toHaveLength(360);
    expect(seats.filter((x) => x.office === "president")).toHaveLength(1);
    expect(seats.filter((x) => x.office === "state_assembly").length).toBeGreaterThan(800);
    for (const x of seats) expect(x.holderId && s.chars[x.holderId], x.id).toBeTruthy();
    expect(Object.values(s.parties).filter((p) => p.exists)).toHaveLength(7);
    // no party holds every governorship
    const govParties = new Set(seats.filter((x) => x.office === "governor").map((x) => x.partyId));
    expect(govParties.size).toBeGreaterThan(2);
  });
  it("every LGA is represented in a House of Reps and a Senate seat of its own state", () => {
    const s = makeGame();
    for (const l of Object.values(s.lgas)) {
      const st = s.states[l.id.split("-").slice(0, 2).join("-")];
      expect(st.repsSeatIds.some((id) => s.seats[id].lgaIds.includes(l.id)), l.id).toBe(true);
      expect(st.senateSeatIds.some((id) => s.seats[id].lgaIds.includes(l.id)), l.id).toBe(true);
    }
  });
});
