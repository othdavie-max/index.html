import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { appoint, sack, vacancies, PORTFOLIOS, cabinetScore } from "../engine/cabinet";
import { lever, snap } from "../engine/util";
import { createEvent } from "../engine/events";
import { respond } from "../engine/actions";
import { answerDebate, attackAd, campaignOpen, mobilise, projectVote, rally, runElection, winChance } from "../engine/rival";
import { streetVoices } from "../engine/voices";
import { deserialise, serialise } from "../persistence";
import type { FixState } from "../engine/types";

const toCampaign = (s: FixState) => { s.month = s.termStart + 42; s.processed = s.month - 1; };

describe("cabinet", () => {
  it("starts with six inherited loyalists and four candidates for each post, one of them your own person", () => {
    const s = newGame(41);
    expect(Object.values(s.cabinet.members).every((m) => m?.faction === "loyalist")).toBe(true);
    for (const p of PORTFOLIOS) expect(s.cabinet.pool.filter((m) => m.portfolio === p.id).length).toBe(4);
  });
  it("a skilled minister improves their area; a vacancy hurts it", () => {
    const a = newGame(42), b = newGame(42), c = newGame(42);
    const tech = b.cabinet.pool.find((m) => m.portfolio === "power" && m.faction === "technocrat")!;
    appoint(b, "power", tech.id);
    sack(c, "power");
    expect(vacancies(c).map((v) => v.id)).toContain("power");
    advanceMonths(a, 4); advanceMonths(b, 4); advanceMonths(c, 4);
    expect(lever(b, "power")).toBeGreaterThan(lever(a, "power"));
    expect(lever(c, "power")).toBeLessThan(lever(a, "power"));
    expect(cabinetScore(b)).toBeGreaterThan(cabinetScore(a));
  });
  it("reshuffles are free early but cost trust later", () => {
    const s = newGame(43);
    const t0 = s.gov.trust;
    appoint(s, "finance", s.cabinet.pool.find((m) => m.portfolio === "finance")!.id);
    expect(s.gov.trust).toBe(t0);
    s.month = 10;
    appoint(s, "cbn", s.cabinet.pool.find((m) => m.portfolio === "cbn")!.id);
    expect(s.gov.trust).toBeLessThan(t0);
  });
  it("a minister scandal can be answered by sacking them", () => {
    const s = newGame(44);
    s.flags.scandalMinister = "works";
    const ev = createEvent(s, "ministerScandal", "NG-FC")!;
    expect(ev.title).toContain(s.cabinet.members.works!.name);
    respond(s, ev.id, "sack");
    expect(s.cabinet.members.works).toBeUndefined();
  });
});

describe("election", () => {
  it("needs over 50% and 25% in 24 states; results are per state and deterministic", () => {
    const s = newGame(45);
    const v = projectVote(s);
    expect(Object.keys(v.states).length).toBe(37);
    expect(v.won).toBe(v.national > 50 && v.statesOver25 >= 24);
    const a = newGame(46), b = newGame(46);
    a.month = b.month = 48;
    expect(runElection(a)).toEqual(runElection(b));
  });
  it("approval drives the chance of winning", () => {
    const lo = newGame(47), hi = newGame(47);
    lo.gov.approval = 30; hi.gov.approval = 65;
    expect(winChance(hi)).toBeGreaterThan(winChance(lo) + 0.3);
  });
  it("a term ends with a state-by-state election result", () => {
    const s = newGame(48); s.fin.treasury = 1e6;
    advanceMonths(s, 50);
    expect(s.election).not.toBeNull();
    expect(Object.keys(s.election!.states).length).toBe(37);
    expect(s.ended).not.toBeNull();
  });
});

describe("campaign", () => {
  it("only opens six months before election day and allows two activities a month", () => {
    const s = newGame(49); s.fin.treasury = 1e5;
    expect(campaignOpen(s)).toBe(false);
    expect(rally(s, "SW").ok).toBe(false);
    toCampaign(s);
    expect(campaignOpen(s)).toBe(true);
    const before = projectVote(s).states["NG-LA"];
    expect(rally(s, "SW").ok).toBe(true);
    expect(projectVote(s).states["NG-LA"]).toBeGreaterThan(before);
    expect(mobilise(s).ok).toBe(true);
    expect(attackAd(s).ok).toBe(false); // third activity this month
  });
  it("repeat rallies in the same zone gain less", () => {
    const s = newGame(50); s.fin.treasury = 1e5; toCampaign(s);
    rally(s, "NW"); const first = s.campaign.rallies.NW;
    s.month++; rally(s, "NW"); const second = s.campaign.rallies.NW - first;
    expect(second).toBeLessThan(first);
  });
  it("debate answers shift the vote and can only be given once", () => {
    const s = newGame(51); toCampaign(s);
    answerDebate(s, "prices", "promise");
    const shift = s.campaign.debateShift;
    expect(shift).not.toBe(0);
    expect(answerDebate(s, "prices", "record").ok).toBe(false);
    expect(s.campaign.debateShift).toBe(shift);
  });
});

describe("voices, rival and saves", () => {
  it("street voices are deterministic, varied and quote real numbers", () => {
    const s = newGame(52); s.fuel.history = [500, 500, 500]; advanceMonths(s, 3);
    const a = streetVoices(s), b = streetVoices(s);
    expect(a).toEqual(b);
    expect(new Set(a.map((v) => v.topic)).size).toBe(a.length);
    const all = streetVoices(s, 12).map((v) => v.quote).join(" ");
    expect(all).toMatch(/₦/);
  });
  it("the rival reacts to fuel price rises", () => {
    const s = newGame(53);
    advanceMonths(s, 2);
    s.history[s.history.length - 1].fuel *= 1.4;
    advanceMonths(s, 1);
    expect(s.news.some((n) => n.source.startsWith("rival:"))).toBe(true);
  });
  it("older saves without a cabinet or rival load and get one", () => {
    const s = newGame(54);
    const raw = JSON.parse(serialise(s));
    delete raw.state.cabinet; delete raw.state.rival; delete raw.state.campaign; delete raw.state.election;
    const back = deserialise(JSON.stringify(raw)).state;
    expect(Object.keys(back.cabinet.members).length).toBe(6);
    expect(back.rival.name.length).toBeGreaterThan(3);
    expect(JSON.stringify(snap(back))).toBeTruthy();
  });
});
