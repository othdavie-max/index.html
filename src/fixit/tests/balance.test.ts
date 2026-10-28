import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonth } from "../engine/sim";
import { respond, startProject, enactPolicy, applyMeasure } from "../engine/actions";
import { ideas, needs } from "../engine/proposals";
import { PROJECT_BY_ID } from "../data/catalogue";
import { computeEnding } from "../engine/endings";
import { applyTool } from "../engine/power";
import { continueNextTerm } from "../engine/legacy";
import { TEMPLATE_BY_ID } from "../engine/events";

type Style = "idle" | "first" | "smart" | "strong";
function play(seed: number, style: Style) {
  const s = newGame(seed, undefined, { archetype: "career" });
  s.staff.picked = true;
  let steps = 0;
  const rows: string[] = [];
  while (!s.done && steps++ < 200) {
    if (s.ended) { if (s.ended.kind === "term" && !s.done && continueNextTerm(s)) continue; break; }
    // act
    for (const e of s.events.filter((x) => x.status === "open")) {
      if (style === "idle") break;
      const opts = TEMPLATE_BY_ID[e.tpl].options;
      let pick = opts[0];
      if (style === "smart" || style === "strong") {
        const afford = opts.filter((o) => !["accept", "cut", "give", "favour"].includes(o.id) && (typeof o.cost === "function" ? 0 : o.cost) * 0.8 < s.fin.treasury * 0.08);
        const T = (afford.length ? afford : opts.filter((o) => !["accept", "cut", "give", "favour"].includes(o.id)));
        pick = T.reduce((a, b) => (a.chance(s, e) >= b.chance(s, e) ? a : b));
      }
      try { respond(s, e.id, pick.id); } catch { /* ignore */ }
    }
    if (style === "smart" || style === "strong") {
      if (s.month % 2 === 0) {
        const act = s.projects.filter((p) => p.status === "active").length;
        if (act < 3) {
          const id = ideas(s).find((i) => i.kind === "project" && !PROJECT_BY_ID[i.id].sites);
          if (id) { const d = PROJECT_BY_ID[id.id]; const f = d.funding.includes("treasury") ? "treasury" : d.funding[0]; startProject(s, id.id, "NG-KN", f as never); }
        }
      }
      if (s.month % 3 === 1) { const p = ideas(s).find((i) => i.kind === "policy"); if (p) enactPolicy(s, p.id); }
    }
    if (style === "smart" || style === "strong") {
      const w = needs(s); const top = (Object.entries(w).sort((a, b) => b[1] - a[1])[0][0]) as string;
      const M: Record<string, string[]> = { food: ["grainReserve", "foodVouchers"], fx: ["fxSale", "investorRoadshow"], power: ["overtimeGrid"], jobs: ["jobsBlitz"], sec: ["securityPush"], gov: ["auditSweep"], social: ["dialogue"], infra: ["dialogue"], oil: ["dieselRelief"] };
      for (const id of M[top] ?? ["dialogue"]) applyMeasure(s, id);
    }
    if (style === "strong" && s.month % 5 === 0) { applyTool(s, "press"); applyTool(s, "inec"); }
    advanceMonth(s);
    if (s.month % 12 === 0) rows.push(`coup${Math.round(s.rule.coupRisk)} anger${Math.round(s.rule.streetAnger)} dem${Math.round(s.rule.democracy)} intl${Math.round(s.rule.intlPressure)} `+`y${s.month / 12}: ap${Math.round(s.gov.approval)} mood${Math.round(s.gov.happiness)} infl${Math.round(s.eco.inflation)} fx${Math.round(s.eco.fx)} unemp${Math.round(s.jobs.unemployment)} open${s.events.filter((e) => e.status === "open").length} pc${Math.round(s.cap.pc)}`);
  }
  let end = "?"; try { end = computeEnding(s).name; } catch { /* */ }
  return { s, rows, end };
}
describe("play styles end differently (balance regression)", () => {
  const run = (style: Style) => [11, 12, 13, 14, 15, 16].map((seed) => play(seed, style));
  it("doing nothing never wins re-election; careless play does not either", () => {
    for (const r of run("idle")) expect(r.s.terms.some((t) => t.result === "won")).toBe(false);
    for (const r of run("first")) expect(r.s.terms.some((t) => t.result === "won")).toBe(false);
  });
  it("one-man rule is a real gamble: some regimes fall, and it costs capital", () => {
    const rs = run("strong");
    expect(rs.filter((r) => r.s.ended?.cause === "coup" || r.s.ended?.cause === "uprising" || r.end === "Kleptocrat in Exile").length).toBeGreaterThanOrEqual(1);
    const pcLow = rs.filter((r) => r.rows[0] && /pc\d{1,2}$/.test(r.rows[0])).length;
    expect(pcLow).toBeGreaterThanOrEqual(3);
  });
  it("competent honest play ends in a close contest, not a landslide of either kind", () => {
    const rs = run("smart");
    for (const r of rs) { const v = r.s.election?.national ?? 40; expect(v).toBeGreaterThan(30); expect(v).toBeLessThan(65); }
  });
});
