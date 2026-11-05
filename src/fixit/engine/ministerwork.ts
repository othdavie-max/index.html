/**
 * Ministers at work. Every month a capable, motivated minister can take an initiative on their own: fix a stretch of
 * highway, break up a kidnapping ring, plug a tax leak. The better and more honest they are, the more often and the
 * more it delivers. A weak minister blunders instead, and a dishonest one pockets part of the money (and the scandal
 * lands on you). Each initiative is logged so you can see what your people actually did, and a visible slice of it
 * happens in a real state on the map.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState, Minister, Portfolio } from "./types";
import { addMod, clamp, clamp100, jflag, pushNews, pushReport } from "./util";
import { STATE_BY_ID, STATES } from "../../game/data/states";
import { noteStolen } from "./ledger";

export interface WorkLog { month: number; portfolio: Portfolio; minister: string; text: string; tone: "good" | "bad" | "dirty"; stateId?: string; gain?: string }
export const workLog = (s: FixState): WorkLog[] => jflag<WorkLog[]>(s, "minLog", []);
const push = (s: FixState, e: WorkLog) => { const l = workLog(s); l.push(e); s.flags.minLog = JSON.stringify(l.slice(-24)); };

interface Move { text: (m: Minister, st: string) => string; gain: string; eff: (k: number) => Effects; local?: (s: FixState, id: string, k: number) => void; dur: number }
const MOVES: Record<Portfolio, { good: Move[]; bad: { text: (m: Minister) => string; eff: Effects }[] }> = {
  finance: {
    good: [
      { text: (m, st) => `${m.name} cracks down on tax evasion by big firms in ${st}.`, gain: "More tax collected", eff: (k) => ({ taxCompl: 0.9 * k, revenue: 16 * k }), dur: 10 },
      { text: (m) => `${m.name} renegotiates a costly loan and cuts the interest bill.`, gain: "Cheaper debt", eff: (k) => ({ revenue: 12 * k, investor: 0.6 * k }), dur: 14 },
    ],
    bad: [{ text: (m) => `${m.name} approves a badly priced bond. Investors wince.`, eff: { investor: -1, revenue: -6 } }],
  },
  cbn: {
    good: [
      { text: (m) => `${m.name} mops up excess naira and calms the exchange rate.`, gain: "Steadier naira", eff: (k) => ({ fxSupply: 0.3 * k, inflation: -0.5 * k }), dur: 8 },
      { text: (m) => `${m.name} orders banks to lend to farmers and small firms.`, gain: "More credit for business", eff: (k) => ({ sme: 0.8 * k, jobs: 0.2 * k }), dur: 12 },
    ],
    bad: [{ text: (m) => `${m.name} prints too freely. Prices begin to climb.`, eff: { inflation: 0.7, fxDemand: 0.3 } }],
  },
  agriculture: {
    good: [
      { text: (m, st) => `${m.name} opens seed and fertiliser depots across ${st}.`, gain: "More food grown", eff: (k) => ({ foodSupply: 0.6 * k, inputs: 0.5 * k }), local: (s, id, k) => { const r = s.regions[id]; if (r) r.food = clamp100(r.food - 5 * k); }, dur: 10 },
      { text: (m, st) => `${m.name} brokers a grain buy-back scheme in ${st}; less food rots.`, gain: "Less food wasted", eff: (k) => ({ postHarvest: 0.5 * k, foodPrice: -0.7 * k }), local: (s, id, k) => { const r = s.regions[id]; if (r) r.food = clamp100(r.food - 4 * k); }, dur: 8 },
    ],
    bad: [{ text: (m) => `${m.name} lets fertiliser sit in a warehouse until the planting season passes.`, eff: { foodSupply: -0.5, foodPrice: 0.8 } }],
  },
  power: {
    good: [
      { text: (m, st) => `${m.name} clears a transmission bottleneck near ${st}. Lights stay on longer.`, gain: "More electricity", eff: (k) => ({ grid: 0.7 * k, power: 0.4 * k }), local: (s, id, k) => { const r = s.regions[id]; if (r) r.power = clamp100(r.power - 7 * k); }, dur: 10 },
      { text: (m) => `${m.name} settles a gas supply dispute. The power plants fire up again.`, gain: "Gas for power plants", eff: (k) => ({ gas: 0.7 * k, power: 0.3 * k }), dur: 8 },
    ],
    bad: [{ text: (m) => `${m.name} signs a power contract that nobody can fulfil.`, eff: { grid: -0.5, revenue: -5 } }],
  },
  works: {
    good: [
      { text: (m, st) => `${m.name} repairs the main highway through ${st} on time.`, gain: "Better roads", eff: (k) => ({ roads: 0.5 * k, maint: 0.4 * k }), local: (s, id, k) => { const r = s.regions[id]; if (r) r.jobless = clamp100(r.jobless - 2 * k); }, dur: 10 },
      { text: (m) => `${m.name} pays off contractor arrears and works restart on stalled roads.`, gain: "Stalled works restart", eff: (k) => ({ procurement: 0.6 * k, roads: 0.3 * k }), dur: 8 },
    ],
    bad: [{ text: (m) => `${m.name} awards a road contract to an unqualified friend. The road washes away.`, eff: { roads: -0.4, procurement: -0.8 } }],
  },
  security: {
    good: [
      { text: (m, st) => `${m.name} breaks up a kidnapping ring operating around ${st}.`, gain: "Safer roads", eff: (k) => ({ security: 0.7 * k }), local: (s, id, k) => { const r = s.regions[id]; if (r) { r.insecurity = clamp100(r.insecurity - 8 * k); r.unrest = clamp100(r.unrest - 3 * k); } s.sec.index = clamp(s.sec.index - 0.8 * k, 0, 100); }, dur: 10 },
      { text: (m) => `${m.name} sets up a joint patrol with neighbouring states.`, gain: "Fewer attacks", eff: (k) => ({ security: 0.5 * k, forces: 0.3 * k }), dur: 10 },
    ],
    bad: [{ text: (m) => `${m.name}'s officers shake down travellers. Anger spreads.`, eff: { security: -0.4, trust: -0.6 } }],
  },
};
const AREA: Record<Portfolio, string> = { finance: "revenue", cbn: "money", agriculture: "farming", power: "power", works: "roads", security: "security" };

export function ministerWorkMonthly(s: FixState, rng: Rng) {
  if (s.month < 3) return;
  for (const [port, m] of Object.entries(s.cabinet.members) as [Portfolio, Minister | undefined][]) {
    if (!m) continue;
    const last = Number(s.flags[`mw:${port}`] ?? -9); if (s.month - last < 3) continue;
    const motivation = m.mood >= 55 ? 1.15 : m.mood >= 35 ? 1 : 0.5;
    const pGood = clamp((m.skill - 30) / 100 * 0.13 * motivation, 0, 0.14);
    const pBad = clamp((55 - m.skill) / 55 * 0.045, 0, 0.045);
    const r = rng.next();
    if (r < pGood) {
      const mv = rng.pick(MOVES[port].good); const k = 0.55 + m.skill / 100 * 0.9;
      const st = rng.pick(STATES.filter((x) => !!s.regions[x.id])); const stName = STATE_BY_ID[st.id]?.name ?? st.id;
      addMod(s, `mwork:${port}:${s.month}`, `${m.name}: ${mv.gain}`, mv.eff(k), { duration: mv.dur, ramp: 2 });
      mv.local?.(s, st.id, k);
      const text = mv.text(m, stName);
      s.flags[`mw:${port}`] = s.month;
      let dirty = "";
      const leak = Math.max(0, (50 - m.integrity) / 50);
      if (leak > 0 && rng.chance(leak * 0.55)) { const amt = Math.round(8 + leak * 30); noteStolen(s, amt / 10); s.me.evidence = clamp(s.me.evidence + 2 * leak, 0, 100); dirty = ` About ₦${amt}bn of the budget "went astray".`; if (rng.chance(0.25)) s.me.scandals += 0; }
      push(s, { month: s.month, portfolio: port, minister: m.name, text: text + dirty, tone: dirty ? "dirty" : "good", stateId: st.id, gain: mv.gain });
      pushReport(s, { title: `${m.name} delivers`, tone: dirty ? "neutral" : "good", lines: [text + dirty, `Effect: ${mv.gain.toLowerCase()} for about ${mv.dur} months.`] });
      pushNews(s, { source: `mwork:${port}:${s.month}`, headline: text.replace(/\.$/, ""), body: dirty ? "Auditors later question where part of the money went." : `${mv.gain}.`, tone: dirty ? "neutral" : "good" });
    } else if (r > 1 - pBad) {
      const b = rng.pick(MOVES[port].bad);
      addMod(s, `mwork:${port}:${s.month}`, `${m.name}: blunder`, b.eff, { duration: 8, ramp: 1 });
      s.flags[`mw:${port}`] = s.month;
      const text = b.text(m); push(s, { month: s.month, portfolio: port, minister: m.name, text, tone: "bad" });
      pushReport(s, { title: `${m.name} blunders`, tone: "bad", lines: [text, "A better minister would not have done this."] });
      pushNews(s, { source: `mblunder:${port}:${s.month}`, headline: text.replace(/\.$/, ""), body: "The opposition is already asking who appointed them.", tone: "bad" });
      s.gov.trust = clamp(s.gov.trust - 0.5, 0, 100);
    }
  }
}
export { AREA };
