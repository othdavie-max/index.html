/**
 * Your advisers bring ideas to your desk: "Sir, we should build this." What they propose depends on how smart they are.
 * You can build it yourself, tell them to go and handle it (and then their skill, honesty and loyalty decide how well it
 * goes), put it off, or let them act on their own from now on. Late-bound to actions.ts through spawn.ts.
 */
import { subRng, type Rng } from "../../game/engine/rng";
import { STATES } from "../../game/data/states";
import { POLICIES, PROJECTS } from "../data/catalogue";
import type { Aide, Funding, FixState, Lever } from "./types";
import { builders, createEvent } from "./spawn";
import { noteStolen } from "./ledger";
import { advisers } from "./dayone";
import { infraScore, nb, powerRatio, pushNews, pushReport, clamp, clamp100 } from "./util";

type Need = "food" | "power" | "infra" | "jobs" | "fx" | "gov" | "sec" | "social" | "oil";
const LEVER_NEED: Partial<Record<Lever, Need>> = {
  foodSupply: "food", postHarvest: "food", storage: "food", irrigation: "food", inputs: "food", foodPrice: "food",
  power: "power", grid: "power", gas: "power", maint: "power", roads: "infra", rail: "infra", ports: "infra", transport: "infra",
  jobs: "jobs", sme: "jobs", manuf: "jobs", exports: "jobs", skills: "jobs", wage: "jobs",
  fxSupply: "fx", fxDemand: "fx", investor: "fx", revenue: "fx",
  corruption: "gov", procurement: "gov", capacity: "gov", transparency: "gov", taxCompl: "gov", trust: "gov",
  security: "sec", forces: "sec", education: "social", health: "social", welfare: "social", happiness: "social",
  refinery: "oil", oilTheft: "oil", crude: "oil",
};
const NEG_GOOD = new Set<Lever>(["corruption", "oilTheft", "foodPrice", "inflation", "jobs", "transport"]);
const SCALE: Partial<Record<Lever, number>> = { power: 400, refinery: 40, crude: 100, revenue: 40, exports: 0.3, wage: 5, roads: 8, rail: 8, ports: 8 };
const NEED_LABEL: Record<Need, string> = { food: "food prices", power: "the blackouts", infra: "our roads, rail and ports", jobs: "jobs", fx: "the naira and our finances", gov: "waste and corruption in government", sec: "security", social: "schools and clinics", oil: "fuel and the refineries" };
const REGION_KEY: Partial<Record<Need, "food" | "power" | "jobless" | "insecurity">> = { food: "food", power: "power", jobs: "jobless", sec: "insecurity" };

export function needs(s: FixState): Record<Need, number> {
  return {
    food: clamp((s.eco.foodInflation - 10) / 25, 0, 1), power: clamp((0.5 - powerRatio(s)) / 0.35, 0, 1), infra: clamp((60 - infraScore(s)) / 50, 0, 1),
    jobs: clamp((s.jobs.unemployment - 8) / 25, 0, 1), fx: clamp((32 - s.eco.reserves) / 25 + (s.eco.inflation > 25 ? 0.25 : 0), 0, 1), gov: clamp(s.gov.corruption / 100, 0, 1),
    sec: clamp(s.sec.index / 100, 0, 1), social: clamp((60 - (s.soc.education + s.soc.health) / 2) / 50, 0, 1), oil: clamp(s.oil.scarcity / 100, 0, 1),
  };
}

export interface Idea { kind: "project" | "policy"; id: string; name: string; score: number; need: Need; vanity?: boolean }
function scoreEffects(effects: Partial<Record<Lever, number>>, w: Record<Need, number>): { score: number; need: Need } {
  let score = 0; const by: Partial<Record<Need, number>> = {};
  for (const [k, v] of Object.entries(effects) as [Lever, number][]) {
    const n = LEVER_NEED[k]; if (!n) continue;
    const c = w[n] * Math.max(0, NEG_GOOD.has(k) ? -v : v) / (SCALE[k] ?? 5);
    score += c; by[n] = (by[n] ?? 0) + c;
  }
  const need = (Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "gov") as Need;
  return { score, need };
}
const recentlyDeclined = (s: FixState, key: string) => typeof s.flags[`decl:${key}`] === "number" && s.month - (s.flags[`decl:${key}`] as number) < 8;

/** every sensible thing the government could start right now, best first */
export function ideas(s: FixState, withVanity = false): Idea[] {
  const w = needs(s), out: Idea[] = [];
  for (const d of PROJECTS) {
    if (d.cat === "National dreams" && !withVanity) continue;
    if (d.unlock?.(s)) continue;
    const total = s.projects.filter((p) => p.defId === d.id && p.status !== "cancelled").length;
    if (d.max && total >= d.max) continue;
    if (s.projects.some((p) => p.defId === d.id && (p.status === "active" || p.status === "stalled"))) continue;
    if (recentlyDeclined(s, `project:${d.id}`)) continue;
    const { score, need } = scoreEffects(d.benefit, w);
    out.push({ kind: "project", id: d.id, name: d.name, score: score / (1 + d.cost / 900), need, vanity: d.cat === "National dreams" });
  }
  for (const d of POLICIES) {
    if (s.policies[d.id]?.active || recentlyDeclined(s, `policy:${d.id}`)) continue;
    if (d.setup * (0.6 + 0.4 * s.eco.priceLevel / 100) > s.fin.treasury * 0.6) continue;
    const { score, need } = scoreEffects(d.effects, w);
    out.push({ kind: "policy", id: d.id, name: d.name, score: score / (1 + d.monthly / 60), need });
  }
  return out.filter((i) => i.score > 0 || withVanity).sort((a, b) => b.score - a.score);
}

export interface Proposal { kind: "project" | "policy"; id: string; name: string; stateId?: string; funding?: Funding; by: string; need: Need; vanity: boolean; padded: boolean; reason: string }

function pickSite(s: FixState, rng: Rng, defId: string, need: Need): { stateId: string; funding: Funding } | null {
  const d = builders();
  const def = PROJECTS.find((x) => x.id === defId)!;
  const key = REGION_KEY[need];
  const pool = def.sites ?? STATES.map((x) => x.id);
  const ranked = [...pool].sort((a, b) => (key ? s.regions[b][key] - s.regions[a][key] : s.regions[b].unrest - s.regions[a].unrest) + rng.range(-6, 6));
  for (const st of ranked.slice(0, 6)) for (const f of def.funding) if (!d.canStartProject(s, defId, st, f as Funding)) return { stateId: st, funding: f as Funding };
  return null;
}

/** a clever adviser proposes what the country really needs; a weak one proposes something else */
export function makeProposal(s: FixState, a: Aide, rng: Rng): Proposal | null {
  let list = ideas(s);
  if (!list.length) return null;
  let vanity = false, idea: Idea;
  if (a.skill >= 60) idea = list[0];
  else if (a.skill >= 45) idea = rng.pick(list.slice(0, 3));
  else if (rng.chance(0.5)) { list = ideas(s, true).filter((i) => i.vanity || i.score < list[0].score * 0.5); if (!list.length) return null; idea = rng.pick(list); vanity = true; }
  else idea = rng.pick(list.slice(0, 6));
  const padded = a.integrity < 38 && rng.chance(0.7);
  let stateId: string | undefined, funding: Funding | undefined;
  if (idea.kind === "project") { const site = pickSite(s, rng, idea.id, idea.need); if (!site) return null; stateId = site.stateId; funding = site.funding; }
  const reason = vanity ? `Sir, I think the nation wants to see something grand. This would make people proud.`
    : a.skill >= 60 ? `The numbers are plain, Sir: ${NEED_LABEL[idea.need]} is where we are weakest, and nothing we are doing fixes it. This does.`
    : a.skill >= 45 ? `I think ${NEED_LABEL[idea.need]} is worth attention, Sir. This should help.`
    : `Sir, I have been thinking about this one for a while. I believe it would be good for the country.`;
  return { kind: idea.kind, id: idea.id, name: idea.name, stateId, funding, by: a.id, need: idea.need, vanity, padded, reason };
}

// ---------------------------------------------------------------- doing it
export type Mode = "own" | "deleg";
const byId = (s: FixState, id: string): Aide | null => advisers(s).find((x) => x.id === id) ?? null;

/** how a task goes when an aide runs it: skill sets quality, honesty sets what leaks, loyalty sets effort */
export interface Handling { quality: number; delay: number; overrun: number; steal: number; wrecked: boolean; notes: string[] }
export function handling(a: Aide, rng: Rng): Handling {
  const notes: string[] = [];
  let quality = (a.skill - 50) / 200, delay = 0, overrun = 0, steal = 0, wrecked = false;
  if (a.skill >= 70) notes.push("Run by someone who knows what they are doing.");
  else if (a.skill < 40) { delay += rng.int(1, 3); overrun += rng.range(0.08, 0.2); notes.push("The aide was out of his depth: delays and cost overruns."); }
  if (a.loyalty < 40) { delay += 2; notes.push("The aide gave it half his attention: weeks lost."); }
  if (a.integrity < 38) { steal = rng.range(0.1, 0.22); quality -= 0.1; notes.push("Contracts went to the aide's own people at padded prices."); }
  if (a.integrity < 30 && a.loyalty < 40 && rng.chance(0.4)) { wrecked = true; quality = -0.3; delay += 4; overrun += 0.25; notes.push("Neglected and looted: the work is shoddy and far behind."); }
  if (a.skill >= 65 && a.integrity >= 60 && a.loyalty >= 55) { quality += 0.08; overrun -= 0.06; }
  return { quality, delay, overrun, steal, wrecked, notes };
}

export function carryOut(s: FixState, p: Proposal, mode: Mode, rng: Rng = subRng(s.meta.seed, "carry", p.id, s.month)): { ok: boolean; text: string } {
  const a = byId(s, p.by), b = builders();
  const who = a?.name ?? "Your aide";
  const h = mode === "deleg" && a ? handling(a, rng) : null;
  if (p.kind === "project") {
    const site = p.stateId && p.funding ? { stateId: p.stateId, funding: p.funding } : null;
    if (!site) return { ok: false, text: "The site fell through." };
    const err = b.canStartProject(s, p.id, site.stateId, site.funding);
    if (err) return { ok: false, text: `It cannot go ahead now: ${err}` };
    const r = b.startProject(s, p.id, site.stateId, site.funding, { favour: !!h && h.steal > 0, free: mode === "deleg" });
    if (!r.ok) return { ok: false, text: r.message };
    const pr = s.projects[s.projects.length - 1];
    if (h) {
      pr.quality = clamp(pr.quality + h.quality, 0.2, 1);
      pr.delay += h.delay;
      if (h.overrun) { const add = pr.baseCost * h.overrun; pr.cost += add; }
      if (h.steal > 0) { const cut = pr.cost * h.steal; noteStolen(s, Math.round(cut)); pr.leaked += cut * 0.5; s.gov.corruption = clamp100(s.gov.corruption + 0.8); s.me.evidence = clamp100(s.me.evidence + 2); if (a) a.revealed = rng.chance(0.5) || a.revealed; }
      pr.notes.push(`Handled by ${who}.`, ...h.notes);
      if (a) a.loyalty = clamp100(a.loyalty + 2);
      return { ok: true, text: `${who} took the ${pr.name.toLowerCase()} in hand. ${h.wrecked ? "It is already going badly." : h.notes[0] ?? "It is under way."}` };
    }
    return { ok: true, text: `${pr.name} starts in ${STATES.find((x) => x.id === site.stateId)?.name}, on your orders.` };
  }
  const r = b.enactPolicy(s, p.id, { free: mode === "deleg" });
  if (!r.ok) return { ok: false, text: r.message };
  if (h && a) {
    const m = s.modifiers.find((x) => x.source === `policy:${p.id}`);
    if (m) m.scale = clamp(0.8 + h.quality - (h.wrecked ? 0.3 : 0), 0.35, 1.1);
    if (h.steal > 0) { noteStolen(s, Math.round(40 * h.steal * 4)); s.gov.corruption = clamp100(s.gov.corruption + 0.6); a.revealed = a.revealed || rng.chance(0.4); }
    a.loyalty = clamp100(a.loyalty + 2);
    return { ok: true, text: `${who} rolled out ${p.name.toLowerCase()}. ${h.notes[0] ?? "It is in force."}` };
  }
  return { ok: true, text: `${p.name} is now in force, on your orders.` };
}

// ---------------------------------------------------------------- the monthly knock on your door
export interface LogItem { month: number; by: string; what: string; mode: "own" | "deleg" | "auto"; text: string }
export const propLog = (s: FixState): LogItem[] => { try { return JSON.parse(String(s.flags.propLog ?? "[]")) as LogItem[]; } catch { return []; } };
const addLog = (s: FixState, i: LogItem) => { const l = propLog(s); l.push(i); s.flags.propLog = JSON.stringify(l.slice(-12)); };
export const isAuto = (s: FixState, aideId: string) => s.flags[`auto:${aideId}`] === 1;
export const setAuto = (s: FixState, aideId: string, on: boolean) => { if (on) s.flags[`auto:${aideId}`] = 1; else delete s.flags[`auto:${aideId}`]; };
export const proposalOf = (s: FixState, eventId: string): Proposal | null => { try { return JSON.parse(String(s.flags[`ev:${eventId}:prop`])) as Proposal; } catch { return null; } };

export function proposalsMonthly(s: FixState, rng: Rng) {
  const team = advisers(s);
  if (!team.length || s.month < 3) return;
  if (s.events.some((e) => e.tpl === "adviserProposal" && e.status === "open")) return;
  const last = Number(s.flags.lastProposal ?? -9);
  if (s.month - last < 2 || !rng.chance(0.55)) return;
  const a = team[Math.floor(s.month / 2) % team.length];
  const p = makeProposal(s, a, rng);
  if (!p) return;
  s.flags.lastProposal = s.month;
  if (isAuto(s, a.id)) {
    const r = carryOut(s, p, "deleg", rng);
    addLog(s, { month: s.month, by: a.name, what: p.name, mode: "auto", text: r.text });
    pushNews(s, { source: `prop-auto:${s.month}`, headline: `${a.name} acts on his own: ${p.name}`, body: r.text, tone: r.ok ? "neutral" : "bad" });
    pushReport(s, { title: `${a.name} handled: ${p.name}`, tone: r.ok ? "neutral" : "bad", lines: [r.text] });
    return;
  }
  s.flags.propPending = JSON.stringify(p);
  const ev = createEvent(s, "adviserProposal", "NG-FC");
  if (ev) s.flags[`ev:${ev.id}:prop`] = JSON.stringify(p);
}

const nameOf = (s: FixState) => { try { const p = JSON.parse(String(s.flags.propPending)) as Proposal; return byId(s, p.by)?.name ?? "Your aide"; } catch { return "Your aide"; } };
const pend = (s: FixState): Proposal => JSON.parse(String(s.flags.propPending)) as Proposal;
const pe = (s: FixState, e: { id: string }) => proposalOf(s, e.id) ?? pend(s);
function act(mode: Mode | "auto") {
  return (s: FixState, e: { id: string }) => {
    const p = pe(s, e), a = byId(s, p.by);
    if (mode === "auto" && a) setAuto(s, a.id, true);
    const r = carryOut(s, p, mode === "own" ? "own" : "deleg");
    addLog(s, { month: s.month, by: a?.name ?? "Aide", what: p.name, mode, text: r.text });
    return r.text;
  };
}
const opt = (id: string, label: string, explain: string, tradeoff: string, mode: Mode | "auto") => ({
  id, label, explain, cost: 0, tradeoff, unc: "low" as const, chance: () => 0.97, winText: "", loseText: "",
  win: { run: act(mode) }, lose: { run: act(mode) },
});
export const PROPOSAL_TEMPLATES = [
  {
    id: "adviserProposal", kind: "request" as const, urgency: 4,
    title: (s: FixState) => { try { const p = pend(s); return `${nameOf(s)} proposes: ${p.name}`; } catch { return "An idea from your adviser"; } },
    cause: (s: FixState) => { try { const p = pend(s); const d = p.kind === "project" ? PROJECTS.find((x) => x.id === p.id)! : null; const pol = p.kind === "policy" ? POLICIES.find((x) => x.id === p.id)! : null; return `${p.reason} ${d ? `It would cost about ${nb(d.cost * (s.eco.priceLevel / 100))} over ${d.months} months and deliver: ${d.benefitText.toLowerCase()}.` : pol ? `Setup about ${nb(pol.setup)}. ${pol.long}` : ""} You are not building it yet. The choice is yours.`; } catch { return ""; } },
    options: [
      opt("own", "Yes, I will build it myself", "You start it, you fund it, you stay in control.", "Uses your attention, and the money comes from the treasury.", "own"),
      opt("deleg", "Go and handle it yourself", "They run it start to finish. Their skill sets how well, their honesty how much leaks, and their loyalty how hard they try.", "A corrupt, slack or weak aide will pad it, slow it down, or wreck it.", "deleg"),
      opt("auto", "Handle things like this yourself from now on", "They start good ideas without asking you again. You can switch this off under People then Advisers.", "You see the results later, not the decisions. Risky with an aide you do not fully trust.", "auto"),
      { id: "no", label: "Not now", explain: "I have other things on my mind.", cost: 0, tradeoff: "It will not be raised again for eight months.", unc: "low" as const, chance: () => 0.97, winText: "", loseText: "",
        win: { run: (s: FixState, e: { id: string }) => { const p = pe(s, e); s.flags[`decl:${p.kind}:${p.id}`] = s.month; const a = byId(s, p.by); if (a && a.skill >= 60) a.loyalty = clamp100(a.loyalty - 1); return `You put off ${p.name.toLowerCase()}. ${a?.name ?? "Your aide"} nods and says he will keep it ready.`; } },
        lose: { run: (s: FixState, e: { id: string }) => { const p = pe(s, e); s.flags[`decl:${p.kind}:${p.id}`] = s.month; return "Shelved."; } } },
    ],
    expire: {}, expireText: () => "You did not answer. The idea was quietly shelved.",
  },
];
