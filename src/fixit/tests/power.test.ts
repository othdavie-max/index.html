import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent, openEvents } from "../engine/events";
import { LAWS, annulElection, amendConstitution, canAnnul, decreeLaw, deterrence, enactLawNow, lawmakerAction, nextLaw, overthrow, punish, sitting, applyTool, riggingBonus, monthsLeft } from "../engine/power";
import { callVote, billChance, billLabel } from "../engine/politics";
import { chooseExit, continueNextTerm, evaluateTermEnd } from "../engine/legacy";
import { runElection, campaignOpen } from "../engine/rival";
import { computeEnding, ENDINGS } from "../engine/endings";
import { deserialise, serialise } from "../persistence";
import type { FixState } from "../engine/types";

const caseFor = (s: FixState, id = "sen0", amount = 80) => { const lm = s.lawmakers.find((l) => l.id === id)!; s.flags.caseLm = lm.id; s.flags.caseAmount = amount; lm.stolen = amount; lm.evidence = 70; return { lm, ev: createEvent(s, "lmCase", lm.stateId)! }; };
const toElection = (s: FixState) => { s.month = s.termStart + 47; s.processed = s.month - 1; };

describe("lawmakers", () => {
  it("the Assembly is full of named lawmakers from both parties", () => {
    const s = newGame(81);
    expect(s.lawmakers.length).toBe(30);
    expect(s.lawmakers.filter((l) => l.chamber === "senate").length).toBe(12);
    expect(new Set(s.lawmakers.map((l) => l.party)).size).toBe(2);
    expect(s.lawmakers.every((l) => l.name.length > 5 && l.greed >= 10)).toBe(true);
  });
  it("some lawmakers steal and get caught: a case appears on your desk", () => {
    let seen = false;
    for (let seed = 1; seed <= 6 && !seen; seed++) { const s = newGame(seed); advanceMonths(s, 24); seen = s.events.some((e) => e.tpl === "lmCase"); }
    expect(seen).toBe(true);
  });
  it("a harsher law frightens lawmakers: fewer thefts", () => {
    const thefts = (level: 0 | 4) => { let n = 0; for (let seed = 1; seed <= 4; seed++) { const s = newGame(seed); s.rule.lawLevel = level; s.rule.deterrence = level ? 80 : 0; advanceMonths(s, 30); n += s.lawmakers.reduce((a, l) => a + l.stolen, 0); } return n; };
    expect(thefts(4)).toBeLessThan(thefts(0) * 0.6);
  });
  it("the law is only as scary as its enforcement: a weak judiciary blunts it", () => {
    const a = newGame(82), b = newGame(82);
    a.rule.lawLevel = b.rule.lawLevel = 4; a.rule.judiciary = 90; b.rule.judiciary = 10;
    expect(deterrence(b)).toBeLessThan(deterrence(a));
  });
});

describe("punishment under the law ladder", () => {
  it("reprimand, seizure, prison, life and death are different", () => {
    const run = (lvl: 0 | 1 | 2 | 3 | 4) => { const s = newGame(83); s.rule.lawLevel = lvl; const lm = s.lawmakers[0]; lm.stolen = 100; lm.evidence = 80; const t0 = s.fin.treasury; punish(s, lm, "case"); return { s, lm, gain: s.fin.treasury - t0 }; };
    const l0 = run(0), l1 = run(1), l2 = run(2), l3 = run(3), l4 = run(4);
    expect(l0.lm.status).toBe("active"); expect(l1.lm.status).toBe("active");
    expect(l1.gain).toBeGreaterThan(l0.gain + 40);
    expect(l2.lm.status).toBe("jailed"); expect(l3.lm.status).toBe("jailed");
    expect(l4.lm.status).toBe("executed"); expect(l4.s.rule.executions).toBe(1);
    expect(l4.s.rule.intlPressure).toBeGreaterThan(l2.s.rule.intlPressure + 5);
    expect(l2.s.lawmakers.length).toBe(31); // a by-election fills the seat
  });
  it("arresting without proof is a political arrest that hurts democracy", () => {
    const s = newGame(84); const lm = s.lawmakers[1]; lm.evidence = 0; lm.stolen = 0; s.rule.lawLevel = 2;
    const d0 = s.rule.democracy;
    lawmakerAction(s, lm.id, "arrest");
    expect(s.rule.democracy).toBeLessThan(d0 - 5); expect(s.rule.wrongful).toBe(1); expect(lm.status).toBe("jailed");
  });
  it("a corruption case offers prosecute, blackmail, protect or cut", () => {
    const { ev } = caseFor(newGame(85));
    expect(ev.options.map((o) => o.id)).toEqual(["prosecute", "blackmail", "protect", "cut"]);
  });
});

describe("case decisions", () => {
  const run = (opt: string, setup?: (s: FixState) => void) => { const s = newGame(86); s.fin.treasury = 1e5; setup?.(s); const { lm, ev } = caseFor(s); const w0 = s.me.wealth; const r = respond(s, ev.id, opt); return { s, lm, r, w0 }; };
  it("blackmail makes them yours; protect shields them; cut enriches you", () => {
    let bm = false;
    for (let i = 0; i < 6 && !bm; i++) { const x = run("blackmail", (s) => { s.meta.seed = 86 + i; }); bm = x.lm.status === "controlled"; }
    expect(bm).toBe(true);
    const p = run("protect"); expect(["protected", "active"]).toContain(p.lm.status);
    const c = run("cut"); expect(c.s.me.wealth).toBeGreaterThanOrEqual(c.w0);
  });
  it("prosecuting under a strong law with good courts punishes them", () => {
    let hit = 0;
    for (let seed = 1; seed <= 12; seed++) { const s = newGame(seed + 90); s.fin.treasury = 1e5; s.rule.lawLevel = 2; s.rule.judiciary = 95; const { lm, ev } = caseFor(s); respond(s, ev.id, "prosecute"); if (lm.status === "jailed") hit++; }
    expect(hit).toBeGreaterThanOrEqual(8);
  });
  it("ignoring a case lets them get away and costs trust", () => {
    const s = newGame(87); const { lm, ev } = caseFor(s); const t0 = s.gov.trust; const g0 = lm.greed;
    advanceMonths(s, 4);
    expect(s.events.find((e) => e.id === ev.id)?.status).toBe("expired");
    expect(s.gov.trust).toBeLessThan(t0); expect(lm.greed).toBeGreaterThanOrEqual(g0);
  });
});

describe("the law ladder", () => {
  it("must be climbed one rung at a time, through the Assembly", () => {
    const s = newGame(88); s.fin.treasury = 1e5;
    expect(nextLaw(s)?.level).toBe(1);
    expect(billLabel("law:2")).toBe(LAWS[2].name);
    s.assembly.support = 99;
    const r = callVote(s, "law:1", () => enactLawNow(s));
    expect(r.ok).toBe(true); expect(s.rule.lawLevel).toBe(1);
    expect(billChance(s, "law:4")).toBeLessThan(billChance(s, "law:2"));
  });
  it("the harsher the law, the harder to pass; greedy lawmakers resist", () => {
    const s = newGame(89); expect(billChance(s, "law:4")).toBeLessThan(billChance(s, "law:1"));
    const t = newGame(89); for (const l of t.lawmakers) l.greed = 95;
    expect(billChance(t, "law:2")).toBeLessThan(billChance(s, "law:2"));
  });
  it("a dictator can decree the law, at democracy's expense", () => {
    const s = newGame(90); const d0 = s.rule.democracy;
    decreeLaw(s);
    expect(s.rule.lawLevel).toBe(1); expect(s.rule.democracy).toBeLessThan(d0);
  });
  it("laws change corruption over time", () => {
    const s = newGame(91); enactLawNow(s); enactLawNow(s); enactLawNow(s);
    expect(s.modifiers.some((m) => m.source === "law")).toBe(true);
  });
});

describe("strongman tools and danger meters", () => {
  it("each authoritarian act lowers democracy and raises danger", () => {
    const s = newGame(92); s.fin.treasury = 1e5;
    const before = { d: s.rule.democracy, a: s.rule.streetAnger, i: s.rule.intlPressure };
    applyTool(s, "press"); applyTool(s, "emergency"); applyTool(s, "rival");
    expect(s.rule.democracy).toBeLessThan(before.d - 25);
    expect(s.rule.intlPressure).toBeGreaterThan(before.i + 10);
    expect(s.rule.streetAnger).toBeGreaterThan(before.a);
    expect(s.rule.pressFreedom).toBeLessThan(40);
    expect(s.rule.abuse).toBeGreaterThan(20);
  });
  it("paying the generals lowers coup risk; purging them does too but leaves resentment", () => {
    const s = newGame(93); s.fin.treasury = 1e5; const c0 = s.rule.coupRisk;
    applyTool(s, "military"); expect(s.rule.coupRisk).toBeLessThan(c0);
    const t = newGame(93); t.fin.treasury = 1e5; applyTool(t, "purge");
    expect(t.flags.purgeEcho).toBeDefined();
  });
  it("tools have costs and cooldowns", () => {
    const s = newGame(94); s.fin.treasury = 10;
    expect(applyTool(s, "governors").ok).toBe(false);
    s.fin.treasury = 1e5;
    expect(applyTool(s, "governors").ok).toBe(true); expect(applyTool(s, "governors").ok).toBe(false);
  });
  it("abuse of power breeds mass protests, coups and uprisings over time", () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const s = newGame(seed + 100); s.fin.treasury = 1e6;
      for (let i = 0; i < 40 && !s.done; i++) { if (i % 4 === 1) { applyTool(s, "rival"); applyTool(s, "press"); } for (const e of openEvents(s)) respond(s, e.id, e.options[e.options.length - 1].id); advanceMonths(s, 1); for (const e of s.events) if (e.kind === "power" || e.tpl === "megaProtest") kinds.add(e.tpl); if (s.ended?.cause) kinds.add(`end:${s.ended.cause}`); }
    }
    expect(kinds.has("megaProtest")).toBe(true);
    expect([...kinds].some((k) => k === "coupAttempt" || k === "sanctions" || k.startsWith("end:"))).toBe(true);
  });
  it("democracy heals slowly if you stop abusing power", () => {
    const s = newGame(95); s.fin.treasury = 1e5; applyTool(s, "press");
    const d0 = s.rule.democracy; advanceMonths(s, 24);
    expect(s.rule.democracy).toBeGreaterThan(d0);
  });
});

describe("rigging, postponing and staying on", () => {
  it("buying INEC adds to your vote and can steal an election you would have lost", () => {
    let stolen = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame(seed + 200); s.gov.approval = 38; s.rule.inecControl = 100; toElection(s);
      const r = runElection(s);
      expect(r.honest).toBeDefined();
      if (r.stolen) { stolen++; expect(s.rule.stolenElection).toBe(true); expect(s.rule.streetAnger).toBeGreaterThan(40); expect(s.events.some((e) => e.tpl === "megaProtest")).toBe(true); }
      expect(r.national).toBeGreaterThanOrEqual((r.honest ?? 0) + 5);
    }
    expect(stolen).toBeGreaterThan(0);
  });
  it("an election you win honestly is not flagged as stolen", () => {
    const s = newGame(210); s.gov.approval = 80; s.gov.trust = 70; s.rule.inecControl = 0; toElection(s);
    expect(runElection(s).stolen).toBe(false);
  });
  it("INEC bribery can leak", () => {
    let leaked = 0;
    for (let seed = 1; seed <= 6; seed++) { const s = newGame(seed + 220); s.rule.inecControl = 100; advanceMonths(s, 36); leaked += s.rule.inecExposed; }
    expect(leaked).toBeGreaterThan(0);
  });
  it("postponing the election extends the term but angers the country", () => {
    const s = newGame(96); s.fin.treasury = 1e5;
    expect(applyTool(s, "postpone").ok).toBe(false); // too early
    s.month = s.termStart + 44; s.processed = s.month - 1;
    expect(monthsLeft(s)).toBe(4);
    const a0 = s.rule.streetAnger;
    expect(applyTool(s, "postpone").ok).toBe(true);
    expect(monthsLeft(s)).toBe(10); expect(s.rule.streetAnger).toBeGreaterThan(a0);
    advanceMonths(s, 6);
    expect(s.ended).toBeNull(); // no election at the old date
  });
  it("term limits can be scrapped by constitutional amendment, and then you can keep winning", () => {
    const s = newGame(97); amendConstitution(s);
    expect(s.rule.maxTerms).toBe(99);
    s.gov.approval = 85; s.gov.trust = 75; s.rule.inecControl = 100;
    for (let t = 0; t < 3; t++) { toElection(s); advanceMonths(s, 1); if (s.ended) continueNextTerm(s); s.gov.approval = 85; }
    expect(s.term).toBeGreaterThanOrEqual(3);
  });
  it("the story ends after four terms even without term limits", () => {
    const s = newGame(98); s.rule.maxTerms = 99; s.term = 4; s.termStart = 0; s.month = 48; s.processed = 47;
    evaluateTermEnd(s);
    expect(s.done).toBe(true); expect(s.ended?.text).toMatch(/sixteen/);
  });
  it("after losing you can try to annul the result, with a real chance of a coup", () => {
    let kept = 0, toppled = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame(seed + 300); s.gov.approval = 30; s.rule.inecControl = 0; toElection(s); advanceMonths(s, 1);
      if (!s.ended || s.terms[0]?.result !== "lost") continue;
      expect(canAnnul(s)).toMatch(/INEC/); s.rule.inecControl = 70;
      expect(canAnnul(s)).toBeNull();
      const r = annulElection(s);
      if (r.ok) { kept++; expect(s.ended).toBeNull(); expect(s.done).toBe(false); expect(s.rule.democracy).toBeLessThan(60); } else { toppled++; expect(s.ended?.cause).toBe("coup"); }
    }
    expect(kept + toppled).toBeGreaterThan(5);
    expect(kept).toBeGreaterThan(0);
  });
  it("you cannot annul without INEC or emergency powers", () => {
    const s = newGame(99); s.gov.approval = 20; toElection(s); advanceMonths(s, 1);
    if (s.ended && s.terms[0]?.result === "lost") expect(canAnnul(s)).toMatch(/INEC/);
  });
  it("campaign window follows the election date", () => {
    const s = newGame(100); toElection(s);
    expect(campaignOpen(s)).toBe(true);
    s.rule.termExtra = 12; expect(campaignOpen(s)).toBe(false);
    expect(riggingBonus(s)).toBe(0);
  });
});

describe("endings", () => {
  const end = (setup: (s: FixState) => void) => { const s = newGame(110); setup(s); return computeEnding(s).id; };
  const finish = (s: FixState, result: "won" | "lost" | "removed" | "completed", cause?: "coup" | "uprising" | "impeached") => { s.terms.push({ term: s.term, result, start: s.baseline, end: { ...s.baseline, happiness: s.gov.happiness, realIncome: 100 }, title: "t", months: 48 }); s.done = result !== "won"; s.ended = { kind: result === "removed" ? "removed" : "term", text: "", cause }; };
  it("covers many different endings", () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(11);
    expect(end((s) => { s.gov.happiness = 70; s.rule.democracy = 72; finish(s, "completed"); })).toBe("father");
    expect(end((s) => { s.gov.happiness = 70; s.rule.democracy = 60; s.me.evidence = 5; s.me.wealth = 1500; finish(s, "completed"); })).toBe("statesman");
    expect(end((s) => { s.rule.democracy = 30; s.gov.happiness = 60; s.projects = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, status: "done" }) as never); finish(s, "completed"); })).toBe("builder");
    expect(end((s) => { s.rule.democracy = 20; s.term = 3; s.rule.maxTerms = 99; finish(s, "completed"); })).toBe("forlife");
    expect(end((s) => { s.me.wealth = 2000; s.me.evidence = 60; s.flags.exit = "flee"; finish(s, "lost"); })).toBe("kleptocrat");
    expect(end((s) => { s.me.evidence = 60; s.me.wealth = 100; finish(s, "lost"); })).toBe("trial");
    expect(end((s) => { finish(s, "removed", "coup"); s.me.wealth = 50; s.me.evidence = 0; })).toBe("coup");
    expect(end((s) => { finish(s, "removed", "uprising"); s.me.wealth = 50; s.me.evidence = 0; })).toBe("uprising");
    expect(end((s) => { finish(s, "removed", "impeached"); s.me.evidence = 0; })).toBe("impeached");
    expect(end((s) => { s.gov.happiness = 60; finish(s, "lost"); s.me.evidence = 0; s.me.wealth = 0; })).toBe("votedout");
  });
  it("a fallen president with loot and a dirty record gets a choice: flee or stay", () => {
    const s = newGame(111); s.me.wealth = 1500; s.me.evidence = 50;
    overthrow(s, "coup");
    expect(s.ended?.choice).toBe(true);
    expect(chooseExit(s, "flee")).toBe(true);
    expect(computeEnding(s).id).toBe("kleptocrat");
    const t = newGame(111); t.me.wealth = 1500; t.me.evidence = 50; overthrow(t, "uprising"); chooseExit(t, "stay");
    expect(computeEnding(t).id).toBe("uprising");
  });
  it("a clean president overthrown gets no choice and keeps his name", () => {
    const s = newGame(112); s.me.wealth = 50; s.me.evidence = 0; overthrow(s, "coup");
    expect(s.ended?.choice).toBe(false); expect(s.done).toBe(true); expect(s.terms[0].ending).toBe("Overthrown in a Coup");
  });
  it("saves from before the power system load and get lawmakers and meters", () => {
    const s = newGame(113);
    const raw = JSON.parse(serialise(s)); delete raw.state.lawmakers; delete raw.state.rule;
    const back = deserialise(JSON.stringify(raw)).state;
    expect(back.lawmakers.length).toBe(30); expect(back.rule.democracy).toBe(72);
    advanceMonths(back, 3);
  });
  it("the sitting list excludes the jailed", () => {
    const s = newGame(114); s.lawmakers[0].status = "jailed";
    expect(sitting(s).length).toBe(29);
  });
});
