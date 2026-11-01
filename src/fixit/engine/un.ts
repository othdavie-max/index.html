/**
 * The world stage: seats in international bodies (won by campaigning for votes), resolutions you can put to the UN, and
 * victory paths with progress bars. Winning a path is celebrated, and the game goes on.
 */
import { subRng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, pushNews } from "./util";
import { earnPc, payPc } from "./meta";
import { W, league, saveW, type Country } from "./world";
import { leaderOf } from "./diplomacy";

const money = (s: FixState, bn: number) => Math.round(bn * (0.6 + 0.4 * s.eco.priceLevel / 100));
const seats = (s: FixState): Record<string, number> => { try { return JSON.parse(String(s.flags.seats ?? "{}")) as Record<string, number>; } catch { return {}; } };
const saveSeats = (s: FixState, x: Record<string, number>) => { s.flags.seats = JSON.stringify(x); };
export const holds = (s: FixState, id: string) => { const v = seats(s)[id]; return v !== undefined && (v === -1 || v > s.month); };
const me = (s: FixState) => league(s).find((r) => r.me)!;
/** a country backs you if it likes you, more so if it owes you */
export const backs = (s: FixState, c: Country) => { const owe = Number((JSON.parse(String(s.flags.owes ?? "{}")) as Record<string, number>)[c.id] ?? 0); return c.rel + owe * 4 >= 56; };
export const supporters = (s: FixState) => W(s).c.filter((c) => backs(s, c)).length;

export interface Body { id: string; icon: string; name: string; blurb: string; need: (s: FixState) => string | null; votes: number; pc: number; cost: number; term: number | null; effect: string; win: (s: FixState) => void }
export const BODIES: Body[] = [
  { id: "g20", icon: "🌐", name: "Join the G20", blurb: "The club of the twenty biggest economies.", need: (s) => (me(s).rank <= 16 ? null : "Nigeria must be in the world's top 16."), votes: 9, pc: 4, cost: 10, term: null, effect: "Permanent influence and investor confidence.", win: (s) => { s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 2); addMod(s, "un:g20", "G20 member", { investor: 1.5 }, { duration: null, ramp: 3 }); } },
  { id: "au", icon: "🌍", name: "Chair the African Union", blurb: "Speak for the continent for two years.", need: (s) => (s.flags.africaFirst ? null : "Nigeria must be Africa's leading power."), votes: 5, pc: 3, cost: 8, term: 24, effect: "Influence and warmer neighbours while you chair.", win: (s) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 10); addMod(s, "un:au", "African Union chair", { exports: 0.04 }, { duration: 24, ramp: 2 }); } },
  { id: "unsc", icon: "🏛️", name: "A seat on the UN Security Council", blurb: "Two years at the top table. Lets you put resolutions to a vote.", need: (s) => (me(s).rank <= 18 ? null : "Only countries in the top 18 are taken seriously."), votes: 12, pc: 5, cost: 20, term: 24, effect: "Resolutions, prestige and a lot of phone calls.", win: (s) => { s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 1.5); } },
  { id: "imf", icon: "🏦", name: "A permanent seat on the IMF board", blurb: "Help write the rules of world money.", need: (s) => (me(s).rank <= 10 ? null : "Only a top-10 economy gets a board seat."), votes: 12, pc: 5, cost: 15, term: null, effect: "Cheaper borrowing and a voice for the naira.", win: (s) => { s.fin.creditRating = clamp100(s.fin.creditRating + 8); s.foreign.rel.imf = clamp100(s.foreign.rel.imf + 10); } },
  { id: "wto", icon: "📦", name: "Chair the world trade talks", blurb: "Set the agenda for global trade for two years.", need: (s) => (me(s).rank <= 12 ? null : "A top-12 economy is needed."), votes: 11, pc: 4, cost: 12, term: 24, effect: "Better terms for Nigerian exports.", win: (s) => { addMod(s, "un:wto", "Trade talks chair", { exports: 0.08, fxSupply: 0.3 }, { duration: 24, ramp: 2 }); } },
  { id: "p5", icon: "⭐", name: "A permanent Security Council seat", blurb: "Join the five. Africa's first permanent seat.", need: (s) => (me(s).rank > 5 ? "Only a top-five power can ask." : !s.flags.unReform ? "The Council must be reformed first (pass a reform resolution)." : null), votes: 17, pc: 10, cost: 60, term: null, effect: "A veto, and a place in history.", win: (s) => { s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 5); s.gov.trust = clamp100(s.gov.trust + 5); } },
];
export function bodyBlock(s: FixState, b: Body): string | null {
  if (holds(s, b.id)) return b.term ? "You hold it now." : "Already yours.";
  const cd = Number(s.flags[`uncd:${b.id}`] ?? -99); if (s.month - cd < 12) return `You lost a vote recently. Try again in ${12 - (s.month - cd)} months.`;
  return b.need(s);
}
export function campaign(s: FixState, id: string): { ok: boolean; message: string } {
  const b = BODIES.find((x) => x.id === id); if (!b) return { ok: false, message: "Unknown." };
  const bl = bodyBlock(s, b); if (bl) return { ok: false, message: bl };
  if (money(s, b.cost) > s.fin.treasury) return { ok: false, message: "Not enough cash for the campaign." };
  const err = payPc(s, b.pc, "campaign for the seat"); if (err) return { ok: false, message: err };
  s.fin.treasury -= money(s, b.cost);
  const sup = supporters(s); const rng = subRng(s.meta.seed, "unvote", id, s.month);
  const yes = sup + Math.round(rng.normal(0, 1.5));
  if (yes >= b.votes) {
    const x = seats(s); x[id] = b.term ? s.month + b.term : -1; saveSeats(s, x); b.win(s); earnPc(s, 3);
    pushNews(s, { source: `unwin:${id}:${s.month}`, headline: `Nigeria wins its bid: ${b.name}`, body: `${yes} countries backed Nigeria. ${b.effect}`, tone: "good" });
    s.timeline.push({ month: s.month, title: `Won: ${b.name}`, text: `${yes} votes.`, tone: "good", chain: "un" });
    return { ok: true, message: `Victory: ${yes} countries voted for Nigeria (you needed ${b.votes}). ${b.effect}` };
  }
  s.flags[`uncd:${id}`] = s.month;
  pushNews(s, { source: `unlose:${id}:${s.month}`, headline: `Nigeria's bid falls short: ${b.name}`, body: `Only ${Math.max(0, yes)} countries backed it. Diplomats say Nigeria needs more friends.`, tone: "bad" });
  return { ok: true, message: `Defeat: only ${Math.max(0, yes)} votes, ${b.votes} were needed. Make more friends (visits, aid, favours) and try again in a year.` };
}

// ------------------------------------------------------------------------------------------------ resolutions
export interface Resolution { id: string; icon: string; name: string; blurb: string; need?: (s: FixState) => string | null; lean: (s: FixState, c: Country) => number; pass: (s: FixState) => string }
export const RESOLUTIONS: Resolution[] = [
  { id: "debt", icon: "🤲", name: "Debt relief for poor countries", blurb: "Cancel part of the debts of the poorest nations.", lean: (s, c) => (c.gdp < 1000 ? 0.35 : c.gdp > 4000 ? -0.25 : 0), pass: (s) => { for (const c of W(s).c) if (c.gdp < 1000) c.rel = clamp100(c.rel + 6); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 6); return "Africa celebrates. Rich lenders grumble."; } },
  { id: "climate", icon: "🌱", name: "A global climate fund for Africa", blurb: "Rich polluters pay for floods and droughts in Africa.", lean: (s, c) => (c.region === "africa" ? 0.4 : ["us", "cn", "ru", "sa"].includes(c.id) ? -0.25 : 0.05), pass: (s) => { addMod(s, "un:climate", "Climate fund money", { irrigation: 1, foodSupply: 1 }, { duration: 36, ramp: 3 }); return "Money for flood walls and irrigation starts to flow."; } },
  { id: "embargo", icon: "🚫", name: "An arms embargo on the country behind the rebels", blurb: "Punish whoever is arming insurgents in the region.", need: (s) => (s.flags.lateRival ? null : "No rival has been identified yet."), lean: (s, c) => (c.id === String(s.flags.lateRival) ? -1 : c.rel > 60 ? 0.2 : 0), pass: (s) => { const w = W(s); const r = w.c.find((c) => c.id === String(s.flags.lateRival)); if (r) { r.trend.mil -= 0.4; r.rel = clamp100(r.rel - 15); } saveW(s, w); s.sec.index = Math.max(0, s.sec.index - 2); return `${r?.name ?? "The rival"} is isolated. The rebels' supply dries up.`; } },
  { id: "reform", icon: "⚖️", name: "Reform the Security Council", blurb: "Africa deserves a permanent seat. Open the club.", need: (s) => (me(s).rank <= 8 ? null : "Only a top-8 power can push Council reform."), lean: (s, c) => (["us", "cn", "ru", "gb", "fr"].includes(c.id) ? -0.35 : c.region === "africa" ? 0.4 : 0.1), pass: (s) => { s.flags.unReform = s.month; return "The Council agrees to expand. A permanent African seat is now possible."; } },
  { id: "naira", icon: "₦", name: "Recognise the naira as a reserve currency", blurb: "Ask the world's central banks to hold naira.", need: (s) => (Number(s.flags.nairaStep ?? 0) >= 1 ? null : "The naira must already be a regional currency."), lean: (s, c) => (W(s).naira.includes(c.id) ? 0.5 : c.id === "us" ? -0.5 : 0), pass: (s) => { const w = W(s); for (const c of w.c) if (w.bloc.includes(c.id) && !w.naira.includes(c.id)) { w.naira.push(c.id); break; } saveW(s, w); return "One more country starts to hold naira, and the market notices."; } },
];
export function resBlock(s: FixState, r: Resolution): string | null {
  if (!holds(s, "unsc") && !holds(s, "p5")) return "You need a Security Council seat to put resolutions to a vote.";
  const cd = Number(s.flags[`rescd:${r.id}`] ?? -99); if (s.month - cd < 12) return `Voted on recently. Try again in ${12 - (s.month - cd)} months.`;
  return r.need?.(s) ?? null;
}
export function propose(s: FixState, id: string): { ok: boolean; message: string; tally?: { yes: string[]; no: string[] } } {
  const r = RESOLUTIONS.find((x) => x.id === id); if (!r) return { ok: false, message: "Unknown." };
  const b = resBlock(s, r); if (b) return { ok: false, message: b };
  const err = payPc(s, 4, "table the resolution"); if (err) return { ok: false, message: err };
  s.flags[`rescd:${id}`] = s.month;
  const rng = subRng(s.meta.seed, "res", id, s.month); const yes: string[] = [], no: string[] = [];
  for (const c of W(s).c) { const a = leaderOf(s, c).arch; const p = clamp(0.35 + (c.rel - 50) / 90 + r.lean(s, c) + (a === "skeptic" ? -0.08 : a === "charmer" ? 0.05 : 0), 0.03, 0.97); (rng.chance(p) ? yes : no).push(c.flag); }
  const passed = yes.length > no.length;
  if (passed) { const t = r.pass(s); earnPc(s, 2); s.flags.resPassed = Number(s.flags.resPassed ?? 0) + 1; pushNews(s, { source: `res:${id}:${s.month}`, headline: `UN passes Nigeria's resolution: ${r.name}`, body: `${yes.length} for, ${no.length} against. ${t}`, tone: "good" }); return { ok: true, message: `Passed ${yes.length}–${no.length}. ${t}`, tally: { yes, no } }; }
  pushNews(s, { source: `resfail:${id}:${s.month}`, headline: `Nigeria's UN resolution fails: ${r.name}`, body: `${yes.length} for, ${no.length} against.`, tone: "bad" });
  return { ok: true, message: `Failed ${yes.length}–${no.length}. Win more friends and try again next year.`, tally: { yes, no } };
}

// ------------------------------------------------------------------------------------------------ victory paths
export interface Path { id: string; icon: string; name: string; goal: string; progress: (s: FixState) => number }
const AFRICA = ["eg", "za", "et", "ke", "gh"];
export const PATHS: Path[] = [
  { id: "econ", icon: "💰", name: "Economic superpower", goal: "The biggest economy in the league.", progress: (s) => { const l = league(s); const top = Math.max(...l.filter((r) => !r.me).map((r) => r.econ)); return clamp(me(s).econ / top * 100, 0, 100); } },
  { id: "africa", icon: "🌍", name: "Leader of Africa", goal: "Africa's number one, chair of the AU, and all five African powers in your Prosperity Zone.", progress: (s) => (s.flags.africaFirst ? 30 : 0) + (holds(s, "au") || s.flags["victory:africa"] ? 30 : 0) + 40 * W(s).bloc.filter((id) => AFRICA.includes(id)).length / AFRICA.length },
  { id: "naira", icon: "₦", name: "The naira rules the world", goal: "The naira becomes a rival to the dollar.", progress: (s) => clamp(Number(s.flags.nairaStep ?? 0) / 3 * 100, 0, 100) },
  { id: "diplo", icon: "🏛️", name: "Diplomatic giant", goal: "A permanent seat on the Security Council.", progress: (s) => (holds(s, "p5") ? 100 : clamp((holds(s, "g20") ? 20 : 0) + (holds(s, "unsc") ? 20 : 0) + (s.flags.unReform ? 30 : 0) + 10 * Math.min(3, Number(s.flags.resPassed ?? 0)), 0, 90)) },
  { id: "clean", icon: "🕊️", name: "Clean statesman", goal: "Eight years with a healthy democracy and clean hands.", progress: (s) => clamp(Number(s.flags.cleanMonths ?? 0) / 96 * 100, 0, 100) },
];
export function unMonthly(s: FixState) {
  if (s.rule.democracy >= 60 && s.me.evidence < 25) s.flags.cleanMonths = Number(s.flags.cleanMonths ?? 0) + 1;
  for (const p of PATHS) if (!s.flags[`victory:${p.id}`] && p.progress(s) >= 99.5) {
    s.flags[`victory:${p.id}`] = s.month; earnPc(s, 8);
    pushNews(s, { source: `victory:${p.id}`, headline: `VICTORY: ${p.name}`, body: `${p.goal} Nigeria has done it. The story goes on.`, tone: "good" });
    s.timeline.push({ month: s.month, title: `Victory: ${p.name}`, text: p.goal, tone: "good", chain: "victory" });
    s.achievements.push({ id: `victory:${p.id}`, label: `Victory: ${p.name}`, month: s.month });
  }
}
