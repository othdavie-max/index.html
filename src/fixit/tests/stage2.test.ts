import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { backCandidate, currentPrimary, ENDORSEMENTS, finishPrimary, govMult, govOf, initGovs } from "../engine/govs";
import { PROMISES, pledgesMonthly, PLEDGE_DEADLINE, setPromises } from "../engine/promises";
import { appoint, autoFillRest, KEY_PORTFOLIOS, ministerEffects, signatureOf } from "../engine/cabinet";
import { cosCandidates, finishDayOne, vpCandidates } from "../engine/dayone";
import { startProject } from "../engine/actions";
import { localEffects } from "../engine/sim";
import { deserialise, serialise } from "../persistence";

describe("thirty-six governors", () => {
  it("every state has its own governor with skill, honesty and loyalty", () => {
    const s = newGame(6001);
    expect(s.govs.length).toBe(36); expect(new Set(s.govs.map((g) => g.stateId)).size).toBe(36);
    for (const g of s.govs) { expect(g.skill).toBeGreaterThanOrEqual(20); expect(g.integrity).toBeGreaterThanOrEqual(12); expect(g.portrait.skin).toBeGreaterThan(0); }
    expect(new Set(s.govs.map((g) => g.name)).size).toBeGreaterThan(30);
  });
  it("a good governor makes your project do more in his state than a weak one", () => {
    const run = (skill: number, integ: number) => {
      const s = newGame(6002); s.fin.treasury = 1e6; s.cap.pc = 100;
      const g = govOf(s, "NG-KN")!; g.skill = skill; g.integrity = integ;
      startProject(s, "solar", "NG-KN", "treasury"); const p = s.projects[0]; p.status = "done"; p.done = 0; p.benefitScale = 1; advanceMonths(s, 12);
      return { eff: localEffects(s)["NG-KN"].power!, mult: govMult(s, "NG-KN") };
    };
    const good = run(90, 90), bad = run(25, 15);
    expect(good.mult).toBeGreaterThan(bad.mult); expect(good.eff).toBeLessThan(bad.eff);
  });
  it("old saves get governors and skip the primaries", () => {
    const s = newGame(6003); const raw = JSON.parse(serialise(s)); delete raw.state.govs; delete raw.state.flags.primary;
    const v = deserialise(JSON.stringify(raw)).state;
    expect(v.govs.length).toBe(36); expect(v.flags.primaryDone).toBe(1);
  });
});

describe("the primaries", () => {
  it("six races with three candidates each, and a limit of three endorsements", () => {
    const s = newGame(6010); const p = currentPrimary(s)!;
    expect(p.races.length).toBe(6); for (const r of p.races) expect(r.cands.length).toBe(3);
    for (let i = 0; i < ENDORSEMENTS; i++) expect(backCandidate(s, p.races[i].stateId, p.races[i].cands[0].id).ok).toBe(true);
    expect(backCandidate(s, p.races[ENDORSEMENTS].stateId, p.races[ENDORSEMENTS].cands[0].id).ok).toBe(false);
    expect(backCandidate(s, p.races[0].stateId, null).ok).toBe(true);
    expect(backCandidate(s, p.races[ENDORSEMENTS].stateId, p.races[ENDORSEMENTS].cands[0].id).ok).toBe(true);
  });
  it("backing a candidate makes them much likelier to win, and they owe you", () => {
    let backedWins = 0, neutralWins = 0, n = 0;
    for (let seed = 7000; seed < 7060; seed++) {
      const a = newGame(seed); const p = currentPrimary(a)!; const r = p.races[0]; backCandidate(a, r.stateId, r.cands[0].id); const out = finishPrimary(a).find((x) => x.stateId === r.stateId)!;
      const b = newGame(seed); const o2 = finishPrimary(b).find((x) => x.stateId === r.stateId)!;
      if (out.youWon) backedWins++; if (o2.winner === r.cands[0].name) neutralWins++; n++;
      if (out.youWon) { const g = govOf(a, r.stateId)!; expect(g.backed).toBe(true); expect(g.loyalty).toBeGreaterThanOrEqual(r.cands[0].loyalty); }
    }
    expect(backedWins).toBeGreaterThan(neutralWins + 8); expect(n).toBe(60);
  });
  it("the winners really become the governors", () => {
    const s = newGame(6011); const before = new Map(s.govs.map((g) => [g.stateId, g.name]));
    const res = finishPrimary(s);
    expect(res.length).toBe(6); for (const r of res) expect(govOf(s, r.stateId)!.name).toBe(r.winner);
    expect(s.flags.primaryDone).toBe(1); expect(res.some((r) => before.get(r.stateId) !== r.winner)).toBe(true); void initGovs;
  });
});

describe("promises with numbers and deadlines", () => {
  it("there are thirteen, each with a number to hit", () => { expect(PROMISES.length).toBe(13); for (const p of PROMISES) { expect(p.label).toMatch(/\d/); expect(p.status(newGame(6020)).length).toBeGreaterThan(2); } });
  it("a promise kept is celebrated once; a promise missed at the deadline costs trust once", () => {
    const s = newGame(6021); s.fin.treasury = 1e6; setPromises(s, ["build", "inflation", "naira"]);
    s.month = 6; for (let i = 0; i < 5; i++) s.projects.push({ id: `x${i}`, defId: "solar", name: "x", stateId: "NG-KN", funding: "treasury", start: 0, months: 1, delay: 0, progress: 1, cost: 1, baseCost: 1, spent: 1, leaked: 0, quality: 1, status: "done", notes: [] });
    pledgesMonthly(s); pledgesMonthly(s);
    expect(s.news.filter((n) => n.headline.startsWith("Promise kept: 5 projects")).length).toBe(1);
    const trust = s.gov.trust; s.eco.inflation = 40; s.month = PLEDGE_DEADLINE + 1; pledgesMonthly(s); pledgesMonthly(s);
    expect(s.news.filter((n) => n.headline.startsWith("Promise broken: Inflation")).length).toBe(1); expect(s.gov.trust).toBeLessThan(trust);
  });
});

describe("a team with character", () => {
  it("every candidate has a story, a quote, and a flaw; ministers have a signature ability", () => {
    const s = newGame(6030);
    for (const a of [...cosCandidates(s), ...vpCandidates(s)]) { expect(a.quote?.length).toBeGreaterThan(8); expect(a.bio.length).toBeGreaterThan(10); }
    for (const m of s.cabinet.pool) { expect(signatureOf(m).label.length).toBeGreaterThan(5); }
  });
  it("the signature only works for ministers you picked, and it is felt in the numbers", () => {
    const s = newGame(6031); const m = s.cabinet.pool.find((x) => x.portfolio === "power" && x.faction !== "crony")!;
    const plain = ministerEffects({ ...m, picked: false }, "power"), picked = ministerEffects({ ...m, picked: true }, "power");
    expect(JSON.stringify(plain)).not.toBe(JSON.stringify(picked));
    appoint(s, "power", m.id); expect(s.cabinet.members.power!.picked).toBe(true);
  });
  it("you choose four key ministers; your chief of staff fills the rest with capable people", () => {
    const s = newGame(6032); expect(KEY_PORTFOLIOS.length).toBe(4);
    const before = s.cabinet.members.cbn!.skill;
    autoFillRest(s); expect(s.cabinet.members.cbn!.skill).toBeGreaterThanOrEqual(before);
    finishDayOne(s); expect(s.staff.picked).toBe(true);
  });
});
