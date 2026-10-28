/**
 * The meta layer: what is unlocked, political capital, the yearly agenda, the pacing director and the inner circle.
 * Leaf-ish module (imports only util and types) so every system can call it without import cycles.
 */
import { subRng } from "../../game/engine/rng";
import type { Cap, Effects, FixState, Inherit, Portrait } from "./types";
import { addMod, clamp, clamp100, lever, pushNews, strength } from "./util";

// ------------------------------------------------------------------ run options
export interface RunOptions { quick?: boolean; legacy?: boolean; perks?: string[]; inherit?: Inherit }

export const newCap = (o: RunOptions = {}): Cap => ({
  pc: 50, unlocked: [], agenda: [], agendaDue: true, offer: [], agendaLog: [], tension: 20, calm: 0, rate: 1,
  quick: !!o.quick, legacy: !!o.legacy, era: 1, perks: o.perks ?? [], dynasty: o.inherit?.gen ?? 0, castPrev: {},
});

/** an old save has no meta layer: everything stays open, nothing is owed */
export function backfillCap(s: FixState) {
  if (s.cap) { s.cap.legacy ??= false; s.cap.era ??= 1; s.cap.castPrev ??= {}; s.cap.agendaLog ??= []; s.cap.offer ??= []; s.cap.agenda ??= []; s.cap.unlocked ??= []; s.cap.perks ??= []; return; }
  s.cap = newCap();
  s.cap.agendaDue = false;
  s.cap.unlocked = UNLOCKS.map((u) => u.id);
  s.cap.pc = 60;
}

// ------------------------------------------------------------------ perks (bought between games)
export interface Perk { id: string; icon: string; name: string; cost: number; blurb: string }
export const PERKS: Perk[] = [
  { id: "governor", icon: "🤝", name: "A loyal governor", cost: 15, blurb: "Every governor starts warmer toward you." },
  { id: "seed", icon: "💰", name: "Seed money", cost: 20, blurb: "The treasury starts 12% fuller." },
  { id: "clean", icon: "🧼", name: "Clean slate", cost: 20, blurb: "A little less corruption and a little more trust on day one." },
  { id: "friends", icon: "🍻", name: "Old friends", cost: 15, blurb: "Your backers start happier." },
  { id: "honeymoon", icon: "🌹", name: "Honeymoon", cost: 20, blurb: "Approval starts 4 points higher." },
  { id: "capital", icon: "⚡", name: "Deep pockets of favour", cost: 25, blurb: "Start with 80 political capital and earn a little more every month." },
  { id: "intel", icon: "🕵️", name: "Intelligence service", cost: 20, blurb: "Coup risk starts lower." },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p])) as Record<string, Perk>;
export const MAX_PERKS = 2;

export function applyRunOptions(s: FixState, o: RunOptions) {
  for (const id of s.cap.perks) {
    if (id === "governor") for (const g of s.governors) g.relation = clamp100(g.relation + 15);
    else if (id === "seed") s.fin.treasury *= 1.12;
    else if (id === "clean") { s.gov.corruption = clamp100(s.gov.corruption - 4); s.gov.trust = clamp100(s.gov.trust + 3); }
    else if (id === "friends") for (const b of s.backers) b.mood = clamp100(b.mood + 12);
    else if (id === "honeymoon") s.gov.approval = clamp(s.gov.approval + 4, 0, 100);
    else if (id === "capital") s.cap.pc = 80;
    else if (id === "intel") s.rule.coupRisk = Math.max(2, s.rule.coupRisk - 8);
  }
  const h = o.inherit;
  if (h) {
    s.eco.fx = clamp(h.fx, 700, 6000);
    s.eco.inflation = clamp(h.inflation, 6, 45);
    s.gov.corruption = clamp100(h.corruption);
    s.rule.democracy = clamp100(h.democracy);
    s.rule.lawLevel = clamp(h.lawLevel, 0, 4) as 0 | 1 | 2 | 3 | 4;
    s.fin.domesticDebt = Math.max(20000, h.domesticDebt);
    s.fin.foreignDebt = Math.max(20, h.foreignDebt);
    s.gov.trust = clamp(40 + (h.approval - 50) / 2, 15, 75);
    s.gov.approval = clamp(45 + (h.approval - 50) / 3, 30, 70);
    s.meta.president = s.meta.president === "Madam/Mr President" ? `Successor to ${h.name}` : s.meta.president;
  }
}

// ------------------------------------------------------------------ 1. systems that unlock as the story reaches them
export interface UnlockDef { id: string; label: string; icon: string; tabs: string[]; hint: string; why: string; test: (s: FixState, t: (n: number) => number) => boolean }
/** thresholds shrink in quick games */
export const T = (s: FixState) => (n: number) => (s.cap?.quick ? Math.max(1, Math.ceil(n / 2)) : n);
export const UNLOCKS: UnlockDef[] = [
  { id: "moves", label: "Big Moves", icon: "♟️", tabs: ["moves"], hint: "Opens in month 2", why: "The big levers of power are now in your hands: the naira peg, bank rules, and more.", test: (s, t) => s.month >= t(2) },
  { id: "deals", label: "Investors", icon: "🏭", tabs: ["deals"], hint: "Opens in month 3", why: "Investors are circling. Terms you offer decide who comes and who walks.", test: (s, t) => s.month >= t(3) || s.deals.length > 0 },
  { id: "assembly", label: "National Assembly", icon: "🏛️", tabs: ["assembly"], hint: "Opens in month 3", why: "The Assembly now sits. Laws, the budget and your lawmakers all pass through it.", test: (s, t) => s.month >= t(3) },
  { id: "power", label: "Seat of Power", icon: "👑", tabs: ["power"], hint: "Opens in month 3, or when trouble starts", why: "The danger meters are live: street anger, coup risk and the army's mood.", test: (s, t) => s.month >= t(3) || s.rule.abuse > 0 || s.rule.coupRisk >= 20 || s.rule.streetAnger >= 30 },
  { id: "foreign", label: "Foreign Relations", icon: "🌍", tabs: ["foreign"], hint: "Opens in month 4", why: "Lenders and neighbours have noticed you. IMF, China, the US and ECOWAS can all be worked.", test: (s, t) => s.month >= t(4) || !!s.foreign.imf },
  { id: "party", label: "Party politics", icon: "🎪", tabs: ["party"], hint: "Opens in month 4", why: "Your party is restless. Your Vice President is watching the door.", test: (s, t) => s.month >= t(4) },
  { id: "enemies", label: "Enemies", icon: "🗡️", tabs: ["enemies"], hint: "Opens when you make your first enemy", why: "Someone now wants you gone. Watch them.", test: (s, t) => s.enemies.length > 0 || s.month >= t(8) },
  { id: "military", label: "Military", icon: "🎖️", tabs: ["military"], hint: "Opens in month 6, or when the barracks stir", why: "The armed forces are now yours to build, pay and manage.", test: (s, t) => s.month >= t(6) || s.rule.coupRisk >= 30 },
  { id: "lending", label: "Lending abroad", icon: "🤲", tabs: ["lending"], hint: "Opens when debt is under 10% of GDP", why: "You are out of the debt trap. Now you can lend, and buy friends.", test: (s) => (s.lend?.loans.length ?? 0) > 0 || (s.fin.domesticDebt + s.fin.foreignDebt * s.eco.fx) / (230000 * (s.eco.gdpIdx / 100) * (s.eco.priceLevel / 100)) < 0.1 },
];
export const UNLOCK_BY_ID = Object.fromEntries(UNLOCKS.map((u) => [u.id, u])) as Record<string, UnlockDef>;
const TAB_TO_UNLOCK: Record<string, string> = Object.fromEntries(UNLOCKS.flatMap((u) => u.tabs.map((x) => [x, u.id])));
/** null when open, else the hint explaining when it opens */
export function tabLock(s: FixState, tab: string): string | null {
  const id = TAB_TO_UNLOCK[tab];
  if (!id || !s.cap || s.cap.unlocked.includes(id)) return null;
  return UNLOCK_BY_ID[id].hint;
}
export function checkUnlocks(s: FixState, announce = true) {
  const t = T(s);
  for (const u of UNLOCKS) {
    if (s.cap.unlocked.includes(u.id) || !u.test(s, t)) continue;
    s.cap.unlocked.push(u.id);
    if (announce && s.month > 0) pushNews(s, { source: `unlock:${u.id}`, headline: `New: ${u.label}`, body: u.why, tone: "good" });
  }
}

// ------------------------------------------------------------------ 2. political capital
export const PC_COST = { project: 3, policy: 4, tool: 12, lawmaker: 6, warn: 5, lobby: 5, gift: 6, enemyBuy: 5, enemyPeace: 3, enemyCrush: 10, move: 10, speech: 4, law: 10 } as const;
export function pcIncome(s: FixState): number {
  const a = clamp((s.gov.approval - 45) / 10, -2, 3), tr = clamp((s.gov.trust - 40) / 20, -1, 1.5), as = clamp((s.assembly.support - 50) / 30, -1, 1);
  const open = s.events.filter((e) => e.status === "open").length;
  return clamp(2.5 + a + tr + as + (s.cap.perks.includes("capital") ? 1 : 0) - (open >= 5 ? 1 : 0), 1, 9);
}
export function earnPc(s: FixState, n: number) { if (s.cap) s.cap.pc = clamp(s.cap.pc + n, 0, 100); }
/** pay for a bold move; returns an error message when you cannot afford it, else null */
export function payPc(s: FixState, cost: number, what: string): string | null {
  if (!s.cap) return null;
  if (s.cap.pc < cost) return `Not enough political capital to ${what}: need ${cost}, you have ${Math.floor(s.cap.pc)}. It grows when voters like you, the Assembly backs you and you keep promises.`;
  s.cap.pc -= cost;
  return null;
}

// ------------------------------------------------------------------ 3. the yearly agenda
export interface AgendaDef {
  id: string; icon: string; name: string; blurb: string; goal: string;
  gauge: (s: FixState) => number;
  ok: (from: number, now: number) => boolean;
  show: (from: number, now: number) => string;
  bonus: Effects; bonusText: string;
}
const dn = (need: number) => (f: number, n: number) => f - n >= need;
const up = (need: number) => (f: number, n: number) => n - f >= need;
const delta = (unit: string, d = 1) => (f: number, n: number) => `${n >= f ? "+" : "−"}${Math.abs(n - f).toFixed(d)}${unit}`;
export const AGENDA: AgendaDef[] = [
  { id: "feed", icon: "🌾", name: "Feed the Nation", blurb: "A year of farms, markets and cheaper food.", goal: "Food inflation down 3 points", gauge: (s) => s.eco.foodInflation, ok: dn(3), show: delta(" pts"), bonus: { foodPrice: -1.5, foodSupply: 1 }, bonusText: "Food prices ease and supply grows a little." },
  { id: "light", icon: "💡", name: "Power for All", blurb: "More light, fewer generators.", goal: "Electricity up 500 MW", gauge: (s) => s.power.available, ok: up(500), show: delta(" MW", 0), bonus: { power: 200, grid: 2 }, bonusText: "Extra megawatts and a steadier grid." },
  { id: "clean", icon: "🧹", name: "War on Corruption", blurb: "Tighter procurement and a cleaner state.", goal: "Corruption down 4 points", gauge: (s) => s.gov.corruption, ok: dn(4), show: delta(" pts"), bonus: { corruption: -2, procurement: 2 }, bonusText: "Less leakage in contracts." },
  { id: "jobs", icon: "👷", name: "Jobs, Jobs, Jobs", blurb: "Workshops, small business and factories.", goal: "Unemployment down 1.2 points", gauge: (s) => s.jobs.unemployment, ok: dn(1.2), show: delta(" pts"), bonus: { jobs: -1.2, sme: 2 }, bonusText: "More hiring and a better climate for small business." },
  { id: "naira", icon: "💵", name: "Defend the Naira", blurb: "Stop the slide.", goal: "Naira no weaker than +3% on the start of the year", gauge: (s) => s.eco.fx, ok: (f, n) => n <= f * 1.03, show: (f, n) => `${n >= f ? "+" : "−"}${Math.abs(((n - f) / f) * 100).toFixed(1)}%`, bonus: { fxSupply: 1.2, investor: 1 }, bonusText: "A little more dollar supply and investor confidence." },
  { id: "peace", icon: "🕊️", name: "A Year of Peace", blurb: "Quieter roads, safer farms.", goal: "Security risk down 4 points", gauge: (s) => s.sec.index, ok: dn(4), show: delta(" pts"), bonus: { security: 2, forces: 1 }, bonusText: "Forces do a little better on the ground." },
  { id: "popular", icon: "❤️", name: "Win Hearts", blurb: "Be the president the people feel.", goal: "Approval up 6 points", gauge: (s) => s.gov.approval, ok: up(6), show: delta(" pts"), bonus: { happiness: 1.2, trust: 1 }, bonusText: "Mood and trust get a small lift." },
  { id: "build", icon: "🏗️", name: "Year of Delivery", blurb: "Finish what you started.", goal: "Complete 2 projects", gauge: (s) => s.projects.filter((p) => p.status === "done").length, ok: up(2), show: delta("", 0), bonus: { capacity: 3 }, bonusText: "The civil service delivers a bit faster." },
  { id: "books", icon: "📒", name: "Balance the Books", blurb: "Save, collect, and stop leaking.", goal: "Cash in the treasury up 10%", gauge: (s) => s.fin.treasury, ok: (f, n) => n >= f * 1.1, show: (f, n) => `${n >= f ? "+" : "−"}${Math.abs(((n - f) / Math.max(1, f)) * 100).toFixed(0)}%`, bonus: { revenue: 1.5, taxCompl: 2 }, bonusText: "Collections improve." },
  { id: "grip", icon: "🔒", name: "Tighten the Grip", blurb: "Keep the powerful on side.", goal: "Elite loyalty up 6 points", gauge: (s) => s.rule.eliteLoyalty, ok: up(6), show: delta(" pts"), bonus: { security: 1 }, bonusText: "The security chiefs stay close." },
  { id: "party", icon: "🎪", name: "One Party, One Voice", blurb: "Hold the party together.", goal: "Party unity up 5 points", gauge: (s) => (s.party.north + s.party.south + s.party.youth + s.party.oldguard) / 4, ok: up(5), show: delta(" pts"), bonus: { trust: 1.2 }, bonusText: "A united party speaks well of you." },
];
export const AGENDA_BY_ID = Object.fromEntries(AGENDA.map((a) => [a.id, a])) as Record<string, AgendaDef>;
export const AGENDA_PICKS = 2;

export function offerAgenda(s: FixState) {
  const rng = subRng(s.meta.seed, "agenda", Math.floor(s.month / 12));
  s.cap.offer = rng.shuffle([...AGENDA]).slice(0, 4).map((a) => a.id);
  s.cap.agendaDue = true;
}
export function pickAgenda(s: FixState, ids: string[]) {
  const chosen = ids.filter((id) => AGENDA_BY_ID[id]).slice(0, AGENDA_PICKS);
  s.cap.agenda = chosen.map((id) => ({ id, from: AGENDA_BY_ID[id].gauge(s), start: s.month }));
  for (const id of chosen) addMod(s, `agenda:${id}`, `Agenda: ${AGENDA_BY_ID[id].name}`, AGENDA_BY_ID[id].bonus, { duration: 12, ramp: 2 });
  s.cap.agendaDue = false;
}
export function agendaProgress(s: FixState) {
  return s.cap.agenda.map((p) => { const d = AGENDA_BY_ID[p.id]; const now = d.gauge(s); return { def: d, from: p.from, now, ok: d.ok(p.from, now), text: d.show(p.from, now) }; });
}
function settleAgenda(s: FixState) {
  const year = Math.floor(s.month / 12);
  for (const r of agendaProgress(s)) {
    s.cap.agendaLog.push({ year, id: r.def.id, ok: r.ok, text: r.text });
    if (r.ok) {
      earnPc(s, 12); s.gov.approval = clamp100(s.gov.approval + 2);
      pushNews(s, { source: `agenda:${year}:${r.def.id}`, headline: `Agenda kept: ${r.def.name}`, body: `You set out to: ${r.def.goal.toLowerCase()}. You did it (${r.text}). The country noticed.`, tone: "good" });
      s.timeline.push({ month: s.month, title: `Agenda kept: ${r.def.name}`, text: r.def.goal, tone: "good" });
    } else {
      earnPc(s, -3); s.gov.trust = clamp100(s.gov.trust - 1.5);
      pushNews(s, { source: `agenda:${year}:${r.def.id}`, headline: `Agenda missed: ${r.def.name}`, body: `You promised: ${r.def.goal.toLowerCase()}. It did not happen (${r.text}). Critics are counting.`, tone: "bad" });
      s.timeline.push({ month: s.month, title: `Agenda missed: ${r.def.name}`, text: r.def.goal, tone: "bad" });
    }
  }
  if (s.timeline.length > 120) s.timeline.splice(0, s.timeline.length - 120);
  if (s.cap.agendaLog.length > 40) s.cap.agendaLog.splice(0, s.cap.agendaLog.length - 40);
  s.cap.agenda = [];
}

// ------------------------------------------------------------------ 5. the pacing director
const CRISIS_KINDS = new Set(["protest", "strike", "insecurity", "flood", "foodcrisis", "grid", "oilattack", "scandal", "global"]);
export function directorMonthly(s: FixState) {
  const c = s.cap;
  const lastMonth = s.events.filter((e) => CRISIS_KINDS.has(e.kind) && e.born >= s.month - 2 && e.born < s.month);
  const open = s.events.filter((e) => e.status === "open" && CRISIS_KINDS.has(e.kind)).length;
  c.tension = clamp100(c.tension * 0.55 + 14 * lastMonth.length + 4 * open + (s.rule.coupRisk > 55 ? 8 : 0) + (s.rule.streetAnger > 65 ? 8 : 0));
  c.calm = c.tension < 22 ? c.calm + 1 : 0;
  let rate = 1;
  if (c.tension >= 60) rate = 0.55;
  else if (c.tension >= 38) rate = 0.85;
  else if (c.calm >= 3) rate = Math.min(1.8, 1.3 + 0.12 * (c.calm - 3));
  const strong = s.gov.approval > 65 && s.gov.trust > 55;
  const year = Math.floor(s.month / 12);
  c.rate = clamp(rate * (strong ? 1.1 : 1) * (1 + 0.05 * Math.min(3, year)), 0.4, 2);
  if (c.calm === 4 && !s.flags[`quiet:${s.month}`]) { s.flags[`quiet:${s.month}`] = 1; pushNews(s, { source: `quiet:${s.month}`, headline: "A quiet spell in the capital. Too quiet?", body: "Aides say it is the calmest few months in a long time. Veterans of Aso Rock say that never lasts.", tone: "neutral" }); }
}
export const directorMood = (s: FixState): { label: string; tone: "good" | "warn" | "bad" } => s.cap.tension >= 60 ? { label: "Storm", tone: "bad" } : s.cap.tension >= 38 ? { label: "Tense", tone: "warn" } : s.cap.calm >= 3 ? { label: "Too quiet", tone: "warn" } : { label: "Steady", tone: "good" };

// ------------------------------------------------------------------ monthly hook after the month turns over
export function metaTurn(s: FixState) {
  const c = s.cap;
  c.pc = clamp(c.pc + pcIncome(s), 0, 100);
  checkUnlocks(s);
  if (s.month > 0 && s.month % 12 === 0) { settleAgenda(s); offerAgenda(s); }
  for (const f of cast(s)) c.castPrev[f.id] = f.mood;
}

// ------------------------------------------------------------------ 4. why did that move? a plain chain of causes
export type WhyKey = "cash" | "fx" | "debt" | "inflation" | "jobless" | "mood" | "approval" | "capital";
const WHY_META: Record<WhyKey, { title: string; levers: string[]; why?: string; now: (s: FixState) => string; hist: (h: FixState["history"][number]) => number; goodWhenDown: boolean }> = {
  cash: { title: "Cash in the treasury", levers: ["revenue", "taxCompl", "corruption"], why: "fiscal", now: (s) => `₦${Math.round(s.fin.treasury).toLocaleString()}bn`, hist: (h) => h.treasury, goodWhenDown: false },
  fx: { title: "The naira", levers: ["fxSupply", "fxDemand", "investor"], why: "fx", now: (s) => `₦${Math.round(s.eco.fx).toLocaleString()} per dollar`, hist: (h) => h.fx, goodWhenDown: true },
  debt: { title: "National debt", levers: ["revenue"], why: "fiscal", now: (s) => `${Math.round((s.fin.domesticDebt + s.fin.foreignDebt * s.eco.fx) / (230000 * (s.eco.gdpIdx / 100) * (s.eco.priceLevel / 100)) * 100)}% of GDP`, hist: (h) => h.debtGdp, goodWhenDown: true },
  inflation: { title: "Inflation", levers: ["inflation", "foodPrice", "transport", "fxSupply"], why: "inflation", now: (s) => `${s.eco.inflation.toFixed(1)}%`, hist: (h) => h.inflation, goodWhenDown: true },
  jobless: { title: "Unemployment", levers: ["jobs", "sme", "manuf"], now: (s) => `${s.jobs.unemployment.toFixed(1)}%`, hist: (h) => h.unemployment, goodWhenDown: true },
  mood: { title: "National mood", levers: ["happiness", "trust"], why: "happiness", now: (s) => `${Math.round(s.gov.happiness)}`, hist: (h) => h.happiness, goodWhenDown: false },
  approval: { title: "Your approval", levers: ["happiness", "trust"], why: "happiness", now: (s) => `${Math.round(s.gov.approval)}%`, hist: (h) => h.approval, goodWhenDown: false },
  capital: { title: "Political capital", levers: [], now: (s) => `${Math.floor(s.cap.pc)} of 100`, hist: () => 0, goodWhenDown: false },
};
export interface WhyChain { title: string; now: string; change: string; tone: "good" | "bad" | "neutral"; reasons: string[]; levers: { label: string; text: string; good: boolean }[]; moves: { month: number; title: string; tone: "good" | "bad" | "neutral" }[]; tip: string }
export function whyChain(s: FixState, key: WhyKey): WhyChain {
  const m = WHY_META[key];
  const h = s.history;
  const a = h[Math.max(0, h.length - 4)], b = h[h.length - 1];
  const d = m.hist(b) - m.hist(a);
  const pct = m.hist(a) ? (d / Math.abs(m.hist(a))) * 100 : 0;
  const change = key === "capital" ? `+${pcIncome(s).toFixed(1)} a month` : Math.abs(pct) < 0.5 ? "no real change in 3 months" : `${d >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% in 3 months`;
  const tone: WhyChain["tone"] = key === "capital" || Math.abs(pct) < 0.5 ? "neutral" : (d < 0) === m.goodWhenDown ? "good" : "bad";
  const reasons = (m.why && s.why[m.why]) ? s.why[m.why].slice(0, 4) : [];
  const levers: WhyChain["levers"] = [];
  for (const mod of s.modifiers) {
    const st = strength(mod, s.month);
    if (!st) continue;
    for (const L of m.levers) {
      const v = (mod.effects as Record<string, number | undefined>)[L];
      if (v === undefined || Math.abs(v * mod.scale * st) < 0.2) continue;
      const lv = lever(s, L as never);
      const good = L === "corruption" || L === "inflation" || L === "foodPrice" || L === "transport" || L === "jobs" || L === "oilTheft" ? v < 0 : v > 0;
      levers.push({ label: mod.label.replace(/^(policy|project|measure):/, ""), text: `${L} ${v > 0 ? "+" : "−"}${Math.abs(v * mod.scale * st).toFixed(1)} (all sources ${lv >= 0 ? "+" : "−"}${Math.abs(lv).toFixed(1)})`, good });
    }
  }
  levers.sort((x, y) => x.text.length - y.text.length);
  const moves = s.timeline.filter((t) => t.month >= s.month - 8).slice(-3).reverse().map((t) => ({ month: t.month, title: t.title, tone: t.tone }));
  const tip = key === "capital" ? "Earn it with approval, trust, Assembly support, finished projects and kept agendas. Spend it on bold moves: power tools, lobbying, warnings, gifts, big moves and speeches." : `Tap Open panel to act on it. ${tone === "bad" ? "It is moving the wrong way: look at the first reason." : tone === "good" ? "It is moving your way. Keep what you are doing." : "Steady for now."}`;
  return { title: m.title, now: m.now(s), change, tone, reasons, levers: levers.slice(0, 4), moves, tip };
}

// ------------------------------------------------------------------ 6. the inner circle: a few faces you actually know
export interface Face { id: string; name: string; role: string; portrait: Portrait; mood: number; trend: number; emotion: "😊" | "🙂" | "😕" | "😠" | "😈"; line: string; icon: string }
const GEN = ["General Ibrahim Danladi", "General Chukwuma Obi", "General Musa Garba", "General Tunde Bakare", "General Yakubu Sani"];
const JOURNO = ["Tunde Adeyemi", "Ngozi Eze", "Fatima Bello", "Kemi Ogunleye", "Chinedu Okafor"];
function portraitOf(seed: number, key: string): Portrait {
  const r = subRng(seed, "cast", key);
  return { skin: r.int(1, 5), hair: r.int(0, 3), style: r.int(0, 3), accent: r.int(0, 4) };
}
const emotion = (mood: number, scheming: boolean): Face["emotion"] => (mood >= 72 ? "😊" : mood >= 50 ? "🙂" : mood >= 32 ? "😕" : scheming ? "😈" : "😠");
const tier = (m: number) => (m >= 62 ? 0 : m >= 36 ? 1 : 2);

export function cast(s: FixState): Face[] {
  const out: Face[] = [];
  const seed = s.meta.seed;
  const push = (id: string, name: string, role: string, icon: string, portrait: Portrait, mood: number, scheming: boolean, line: string) => {
    const m = Math.round(clamp100(mood + Number(s.flags[`fav:${id}`] ?? 0)));
    out.push({ id, name, role, icon, portrait, mood: m, trend: s.cap && s.cap.castPrev[id] !== undefined ? m - s.cap.castPrev[id] : 0, emotion: emotion(m, scheming), line });
  };
  const fuel = Math.round(s.fuel.pump);
  const cos = s.staff?.cos;
  if (cos) push("cos", cos.name, "Chief of Staff", "🗂️", cos.portrait, cos.loyalty, cos.integrity < 40, [
    ["Sir, the desk is under control. I will handle what I can and bring you only what matters.", "Sir, I will be honest: we are stretched. Choose carefully this month.", "Sir, I did not sign up for this. People are talking, and not kindly."][tier(cos.loyalty)],
    s.ledger.stolen > 200 ? "Sir, the auditors are asking about the numbers again." : "",
  ].filter(Boolean).join(" "));
  const vp = s.staff?.vp;
  if (vp) push("vp", vp.name, "Vice President", "🤝", vp.portrait, vp.loyalty - 0.4 * s.party.vpAmbition, s.party.vpAmbition > 55, [
    "Whatever you need, Oga. I am your shadow.", "I attend the funerals and wait. But people keep asking me about 2031.", "I have not been consulted in weeks. The party is asking where I stand.",
  ][tier(vp.loyalty - 0.4 * s.party.vpAmbition)]);
  push("rival", s.rival.name, `Rival, ${s.rival.party}`, "🥊", portraitOf(seed, "rival"), 60 - (s.rival.popularity - 45) * 1.2, true, [
    "He nods politely on TV, but his people say he is not worried about you.", "He is on every channel saying you are failing. People are listening.", "He smells blood. He says the next election is already won.",
  ][s.rival.popularity > 52 ? 2 : s.rival.popularity > 44 ? 1 : 0]);
  const gf = [...s.backers].sort((a, b) => b.power - a.power)[0];
  if (gf) push("godfather", gf.name, gf.title, "🎩", portraitOf(seed, `gf:${gf.id}`), gf.mood, gf.mood < 40, [
    "My boy, you are doing well. Remember who put you there, and we will be fine.", "You have forgotten the road that brought you, Mr President. Visit me soon.", "I made you. I can unmake you. Think carefully.",
  ][tier(gf.mood)]);
  push("mama", "Mama Nkechi", "Market women's leader", "🧺", portraitOf(seed, "mama"), 50 + s.groupMood.traders * 1.25, false, [
    "Oga, market dey move small small. Keep am so.", `Petrol is ₦${fuel}. My women say the profit is gone, Sir.`, "We will block the road at Balogun if nothing changes. Abeg listen!",
  ][tier(50 + s.groupMood.traders * 1.25)]);
  const gen = GEN[Math.abs(seed) % GEN.length];
  const gm = 50 + s.groupMood.military * 1.25 - s.rule.coupRisk * 0.4;
  push("general", gen, "Chief of Defence Staff", "🎖️", portraitOf(seed, "general"), gm, s.rule.coupRisk > 45, [
    "The forces are loyal and well. Nothing to report, Sir.", "The boys complain about pay and equipment. I am holding them, for now.", "Sir, the barracks are restless. I cannot promise anything.",
  ][tier(gm)]);
  const jm = 30 + (s.gov.transparency - 38) * 0.6 + (s.rule.pressFreedom - 50) * 0.4 - s.me.scandals * 4;
  push("journo", JOURNO[Math.abs(seed >> 3) % JOURNO.length], "Investigative journalist", "📰", portraitOf(seed, "journo"), jm, jm < 20, [
    "Your office is more open than the last one. Credit where due, Sir.", "I am working on a story about contracts. I will call for a comment.", s.rule.executions > 0 ? "People ask what happened to the executed men. I intend to find out." : "My editor says the press is not as free as it was. I wonder why.",
  ][tier(jm)]);
  const gv = [...s.governors].sort((a, b) => b.ambition - a.ambition)[0];
  if (gv) push("governor", gv.name, `Governor, ${gv.zone}`, "🏛️", portraitOf(seed, `gov:${gv.zone}`), gv.relation, gv.ambition > 60 && gv.relation < 45, [
    "Mr President, my people are grateful. Count on my state.", "My state is waiting for the federal money we were promised.", "Abuja has forgotten us. Some of my colleagues are talking about a new alliance.",
  ][tier(gv.relation)]);
  return out;
}

// ------------------------------------------------------------------ dynasty: your chosen successor inherits your Nigeria
export function inheritFrom(s: FixState): Inherit {
  return { name: s.meta.president, fx: s.eco.fx, inflation: s.eco.inflation, corruption: s.gov.corruption, democracy: s.rule.democracy, lawLevel: s.rule.lawLevel, domesticDebt: s.fin.domesticDebt, foreignDebt: s.fin.foreignDebt, trust: s.gov.trust, approval: s.gov.approval, gen: (s.cap?.dynasty ?? 0) + 1 };
}
