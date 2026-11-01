/**
 * A robot plays many games, choosing random actions every month, and checks that nothing crashes, no number turns into
 * NaN or Infinity, key values stay in range, and the game survives a save and reload at any point.
 */
import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonth } from "../engine/sim";
import { nextTerm, applyFuel, applyMeasure, borrow, enactPolicy, repealPolicy, respond, startProject } from "../engine/actions";
import { POLICIES, PROJECTS, MEASURES } from "../data/catalogue";
import { doMove } from "../engine/bigmoves";
import { POWERS, applyPower } from "../engine/office";
import { ASKS, negotiate, travel } from "../engine/diplomacy";
import { BODIES, RESOLUTIONS, campaign, propose } from "../engine/un";
import { MEGAS, startMega } from "../engine/late";
import { answer, inbox } from "../engine/worldlife";
import { POST_KINDS, playerPost, socialSync } from "../engine/social";
import { W } from "../engine/world";
import { GOV_ACTIONS, govAction } from "../engine/govs";
import { THEATRES, STRATEGIES, commanders, launchOp, endOp } from "../engine/ops";
import { PRODUCTS, TRADE_PARTNERS, SUPPLIERS, signDeal, startVisit, armsDeal } from "../engine/trade";
import { setRate } from "../engine/dials";
import { TOOLS, applyTool } from "../engine/power";
import { setBots, banX, unbanX, actOnAcct, X } from "../engine/social";
import { rumours, actOnRumour, RUMOUR_ACTIONS } from "../engine/office";
import { setFundStyle, cancelMega } from "../engine/late";
import { depositFund } from "../engine/lending";
import { canContinue, continueNigeria, successors } from "../engine/succession";
import { deserialise, serialise } from "../persistence";
import { STATES } from "../../game/data/states";
import { subRng, type Rng } from "../../game/engine/rng";
import type { FixState } from "../engine/types";

function badNumbers(o: unknown, path = "s", out: string[] = [], depth = 0): string[] {
  if (out.length > 5 || depth > 7) return out;
  if (typeof o === "number") { if (!Number.isFinite(o)) out.push(`${path}=${o}`); return out; }
  if (Array.isArray(o)) { o.slice(0, 60).forEach((v, i) => badNumbers(v, `${path}[${i}]`, out, depth + 1)); return out; }
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) badNumbers(v, `${path}.${k}`, out, depth + 1);
  return out;
}
const MOVES = ["jets", "probe", "cbn", "redesign", "amnesty", "nysc", "privatise", "relocate", "petrolcap"];
function randomAct(s: FixState, r: Rng) {
  const st = STATES[r.int(0, STATES.length - 1)].id;
  const k = r.int(0, 30);
  try {
    switch (k) {
      case 0: enactPolicy(s, r.pick(POLICIES).id); break;
      case 1: repealPolicy(s, r.pick(POLICIES).id); break;
      case 2: startProject(s, r.pick(PROJECTS).id, st, r.pick(["treasury", "domestic", "concessional", "ppp"] as const)); break;
      case 3: applyMeasure(s, r.pick(MEASURES).id); break;
      case 4: applyFuel(s, r.pick(["increase", "reduce", "remove", "reform"] as const)); break;
      case 5: borrow(s, r.pick(["domestic", "bond", "repay"] as const), r.int(1, 3)); break;
      case 6: { const e = s.events.filter((x) => x.status === "open"); if (e.length) { const ev = r.pick(e); if (ev.options.length) respond(s, ev.id, r.pick(ev.options).id); } break; }
      case 7: doMove(s, r.pick(MOVES)); break;
      case 8: { const p = r.pick(POWERS); applyPower(s, p.id, p.choices?.[0]?.id); break; }
      case 9: { const c = r.pick(W(s).c); travel(s, c.id); negotiate(s, c.id, r.pick(ASKS).id); break; }
      case 10: campaign(s, r.pick(BODIES).id); break;
      case 11: propose(s, r.pick(RESOLUTIONS).id); break;
      case 12: startMega(s, r.pick(MEGAS).id); break;
      case 13: { const m = inbox(s).find((x) => !x.done && x.options); if (m) answer(s, m.id, r.pick(m.options!).id); break; }
      case 14: { const p = r.pick(POST_KINDS); playerPost(s, p.id, p.choices?.[0]?.id); break; }
      case 15: govAction(s, st, r.pick(GOV_ACTIONS).id); break;
      case 16: { const th = r.pick(THEATRES).id; const c = commanders(s, th); if (c.length) launchOp(s, th, r.pick(STRATEGIES).id, r.pick([1, 2, 3] as const), c[0].id); break; }
      case 17: endOp(s, r.pick(THEATRES).id); break;
      case 18: signDeal(s, r.pick(TRADE_PARTNERS).id, r.pick(PRODUCTS).id); break;
      case 19: startVisit(s, r.pick(TRADE_PARTNERS).id); break;
      case 20: armsDeal(s, r.pick(SUPPLIERS).id); break;
      case 21: setRate(s, r.pick([-1, 0, 1] as const)); break;
      case 22: if (r.chance(0.3)) applyTool(s, r.pick(TOOLS).id); break;
      case 23: setBots(s, r.pick([0, 1, 2, 3] as const)); break;
      case 24: if (r.chance(0.2)) { if (X(s).banned === null) banX(s); else unbanX(s); } break;
      case 25: { const a = r.pick(X(s).accts.filter((x) => x.kind !== "bot")); actOnAcct(s, a.id, r.pick(["kind", "sharp", "block", "unblock", "summon"] as const)); break; }
      case 26: { const ru = rumours(s).find((x) => !x.done); if (ru) actOnRumour(s, ru.id, r.pick(RUMOUR_ACTIONS[ru.kind]).id); break; }
      case 27: setFundStyle(s, r.pick(["safe", "balanced", "bold"])); depositFund(s, 50); break;
      case 28: cancelMega(s, r.pick(MEGAS).id); break;
      default: break;
    }
  } catch (e) { throw new Error(`action ${k} at month ${s.month}: ${(e as Error).stack}`); }
  socialSync(s);
}

describe("robot players", () => {
  for (const [seed, opts] of [[101, {}], [202, { difficulty: "hard" }], [303, { legacy: true }], [404, { sandbox: true }], [505, { quick: true }], [606, { difficulty: "easy" }]] as const) {
    it(`seed ${seed} ${JSON.stringify(opts)}: 10 years of random play stays sane`, () => {
      let s = newGame(seed, "Robot", opts as never);
      s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary;
      const r = subRng(seed, "robot");
      let ends = 0;
      for (let m = 0; m < 120; m++) {
        if (s.ended) { ends++; if (!nextTerm(s).ok) { if (canContinue(s) !== null) break; const r2 = continueNigeria(s, successors(s)[0].id); expect(r2.ok).toBe(true); s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary; } }
        for (let a = 0; a < 4; a++) randomAct(s, r);
        expect(() => advanceMonth(s), `month ${s.month}`).not.toThrow();
        const bad = badNumbers(s); expect(bad, `month ${s.month}`).toEqual([]);
        expect(s.gov.approval).toBeGreaterThanOrEqual(0); expect(s.gov.approval).toBeLessThanOrEqual(100);
        expect(s.eco.fx).toBeGreaterThan(0); expect(s.cap.pc).toBeGreaterThanOrEqual(0);
        for (const k of ["streetAnger", "coupRisk", "intlPressure", "eliteLoyalty", "pressFreedom", "judiciary", "democracy"] as const) { expect(s.rule[k], `rule.${k}`).toBeGreaterThanOrEqual(0); expect(s.rule[k], `rule.${k}`).toBeLessThanOrEqual(100); }
        for (const k of ["trust", "happiness", "corruption"] as const) { expect(s.gov[k], `gov.${k}`).toBeGreaterThanOrEqual(0); expect(s.gov[k], `gov.${k}`).toBeLessThanOrEqual(100); }
        expect(s.mil.strength).toBeGreaterThanOrEqual(0); expect(s.mil.strength).toBeLessThanOrEqual(100);
        if (m % 17 === 5) { s = deserialise(serialise(s)).state; }
      }
      console.log(`seed ${seed}: reached month ${s.month}, ended=${s.ended?.kind ?? "no"}${s.ended?.cause ? "/" + s.ended.cause : ""}, terms=${s.terms.length}, era=${s.cap.era}, restarts=${ends}`);
      expect(s.month).toBeGreaterThan(10);
    });
  }
});
