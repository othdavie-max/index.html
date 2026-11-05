/**
 * Grudges. Countries remember how you treated them: every request you refuse, every deal you cancel and every vote you
 * cast against them adds "heat". Once a country is hot enough it hits back short of war: tariffs on your exports, a full
 * embargo, visa bans, hacks, money for your opposition, a campaign against you at the UN, trouble on the border.
 * Favours you did them in the past hold them back. You can repair a feud with an apology, a sweetener, or by
 * standing firm (which plays well at home and makes it worse abroad). Everything is simulated.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import { addMod, clamp, clamp100, jflag, pushNews, removeMods } from "./util";
import { W, saveW, type Country } from "./world";
import { setEmbargo } from "./agreements";
import { payPc } from "./meta";

export interface Feud { heat: number; why: { month: number; text: string }[] }
export type MeasureKind = "tariff" | "embargo" | "visa" | "hack" | "funding" | "unvote" | "border";
export interface Measure { id: string; country: string; kind: MeasureKind; since: number; until: number; text: string }
export const MEASURE: Record<MeasureKind, { icon: string; label: string; verb: string }> = {
  tariff: { icon: "🧾", label: "Tariffs on our exports", verb: "slaps tariffs on Nigerian goods" },
  embargo: { icon: "⛔", label: "Trade embargo", verb: "freezes all trade with Nigeria" },
  visa: { icon: "🛂", label: "Visa and travel ban", verb: "bans visas for Nigerian officials and bans flights" },
  hack: { icon: "💻", label: "Cyberattack", verb: "is blamed for a cyberattack on government systems" },
  funding: { icon: "💼", label: "Funds your opposition", verb: "is quietly funding Nigeria's opposition" },
  unvote: { icon: "🗳️", label: "Campaigns against you at the UN", verb: "lobbies other countries against Nigeria at the UN" },
  border: { icon: "🪖", label: "Trouble on the border", verb: "lets armed groups cause trouble on the border" },
};
export const HOT = 30;

const store = (s: FixState) => jflag<Record<string, Feud>>(s, "feuds", {});
const saveStore = (s: FixState, f: Record<string, Feud>) => { s.flags.feuds = JSON.stringify(f); };
export const measures = (s: FixState): Measure[] => jflag<Measure[]>(s, "measures", []).filter((m) => m.until > s.month);
const saveMeasures = (s: FixState, l: Measure[]) => { s.flags.measures = JSON.stringify(l); };
export const heatOf = (s: FixState, id: string) => store(s)[id]?.heat ?? 0;
export const feudOf = (s: FixState, id: string): Feud => store(s)[id] ?? { heat: 0, why: [] };
export function addHeat(s: FixState, id: string, d: number, why?: string) {
  const f = store(s); const x = (f[id] ??= { heat: 0, why: [] });
  x.heat = clamp(x.heat + d, 0, 100);
  if (why && d > 0) x.why = [...x.why, { month: s.month, text: why }].slice(-4);
  saveStore(s, f);
}
/** how much a country matters: bigger economies hit harder (0.3..1) */
export const sizeOf = (c: Country) => clamp(Math.log10(Math.max(100, c.gdp)) / 4.5, 0.3, 1);
export const mood = (heat: number) => (heat >= 70 ? { icon: "🔥", word: "Furious", col: "#b91c1c" } : heat >= 50 ? { icon: "😠", word: "Angry", col: "#c2410c" } : heat >= HOT ? { icon: "😒", word: "Holding a grudge", col: "#b45309" } : heat >= 12 ? { icon: "😐", word: "Irritated", col: "#a16207" } : { icon: "🙂", word: "No quarrel", col: "#047857" });
export const feudList = (s: FixState) => Object.entries(store(s)).filter(([, f]) => f.heat >= 12).map(([id, f]) => ({ id, heat: f.heat })).sort((a, b) => b.heat - a.heat);
export const measuresAgainst = (s: FixState, id: string) => measures(s).filter((m) => m.country === id);
export const visaBanned = (s: FixState, id: string) => measuresAgainst(s, id).some((m) => m.kind === "visa");
const owesOf = (s: FixState): Record<string, number> => jflag<Record<string, number>>(s, "owes", {});

// ---------------------------------------------------------------- the hit
interface Plan { kind: MeasureKind; w: number }
function plans(s: FixState, c: Country, heat: number): Plan[] {
  const big = c.inf >= 50 || c.gdp > 3000;
  const p: Plan[] = [{ kind: "tariff", w: 3 }, { kind: "visa", w: 2 }];
  if (heat >= 55) p.push({ kind: "embargo", w: 1.6 });
  if (c.tech >= 55) p.push({ kind: "hack", w: 1.6 });
  if (heat >= 45 && big) p.push({ kind: "funding", w: 1.5 });
  if (c.inf >= 45) p.push({ kind: "unvote", w: 2 });
  if (c.region === "africa") p.push({ kind: "border", w: 2.2 });
  return p;
}
function strike(s: FixState, c: Country, kind: MeasureKind, rng: Rng) {
  const size = sizeOf(c); const len = 4 + Math.round(size * 6);
  const m: Measure = { id: `${c.id}:${kind}:${s.month}`, country: c.id, kind, since: s.month, until: s.month + len, text: `${c.name} ${MEASURE[kind].verb}.` };
  const l = measures(s); l.push(m); saveMeasures(s, l);
  if (kind === "embargo") setEmbargo(s, c.id, m.until);
  if (kind === "hack") { const loss = Math.round(20 + 50 * size); s.fin.treasury = Math.max(0, s.fin.treasury - loss); m.text += ` About ₦${loss}bn went missing.`; }
  if (kind === "funding") { s.gov.opposition = clamp100(s.gov.opposition + 5 * size + 2); s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); }
  if (kind === "unvote") s.rule.intlPressure = clamp100(s.rule.intlPressure + 4 + 4 * size);
  if (kind === "border") { s.sec.banditry = clamp100(s.sec.banditry + 3); s.sec.index = clamp100(s.sec.index + 2); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 3); }
  const L = [`${c.flag} ${c.name} ${MEASURE[kind].verb}`, "Diplomats call it a message. Nigeria's press calls it payback."];
  pushNews(s, { source: `feud:${c.id}:${kind}:${s.month}`, headline: L[0], body: `${feudOf(s, c.id).why.slice(-1)[0]?.text ?? "Old grievances"} is the reason given. ${L[1]}`, tone: "bad" });
  void rng;
  return m;
}

/** effects of the active measures, rebuilt every month */
function applyMeasureEffects(s: FixState) {
  removeMods(s, "feud");
  const w = W(s);
  for (const m of measures(s)) {
    const c = w.c.find((x) => x.id === m.country); if (!c) continue; const size = sizeOf(c);
    const e: Effects = {};
    if (m.kind === "tariff") { e.exports = -0.12 * size; e.fxSupply = -0.3 * size; e.revenue = -6 * size; }
    if (m.kind === "embargo") { e.exports = -0.1 * size; e.investor = -1 * size; }
    if (m.kind === "visa") { e.investor = -1.1 * size; e.sme = -0.5 * size; }
    if (m.kind === "hack") { e.capacity = -2.5 * size; e.transparency = -1; }
    if (Object.keys(e).length) addMod(s, "feud", `${MEASURE[m.kind].label} (${c.name})`, e, { duration: null, ramp: 1 });
  }
}

export function feudsMonthly(s: FixState, rng: Rng) {
  const w = W(s); const f = store(s); const o = owesOf(s);
  // time cools most grudges, slowly; a long list of grievances cools slower
  for (const [id, x] of Object.entries(f)) { x.heat = clamp(x.heat - (x.why.length >= 3 ? 0.6 : 1.1), 0, 100); if (x.heat <= 0 && !x.why.length) delete f[id]; }
  saveStore(s, f);
  const active = measures(s);
  for (const c of w.c) {
    const heat = f[c.id]?.heat ?? 0; if (heat < HOT) continue;
    if (active.filter((m) => m.country === c.id).length >= 2) continue;
    const owe = o[c.id] ?? 0; const shield = owe >= 3 ? 0.2 : owe >= 1 ? 0.45 : 1;
    const hawk = c.mil >= 65 ? 1.3 : 1;
    const p = clamp((heat - 26) / 260, 0, 0.3) * shield * hawk;
    if (!rng.chance(p)) continue;
    const opts = plans(s, c, heat).filter((q) => !active.some((m) => m.country === c.id && m.kind === q.kind));
    if (!opts.length) continue;
    let x = rng.next() * opts.reduce((a, b) => a + b.w, 0); let pick = opts[0]; for (const q of opts) { x -= q.w; if (x <= 0) { pick = q; break; } }
    const m = strike(s, c, pick.kind, rng);
    f[c.id].heat = Math.max(0, f[c.id].heat - 12); saveStore(s, f); // they have vented
    sendFeudMessage(s, c, m);
    if (owe > 0) { o[c.id] = Math.max(0, owe - 1); s.flags.owes = JSON.stringify(o); }
  }
  applyMeasureEffects(s);
  saveW(s, w);
}

// ---------------------------------------------------------------- the envoy's offer (an inbox message with three choices)
function sendFeudMessage(s: FixState, c: Country, m: Measure) {
  const l = jflag<unknown[]>(s, "inbox", []) as { id: string }[];
  l.push({ id: `m${s.month}-${l.length}-feud`, month: s.month, from: c.id, kind: "feud", title: `${c.flag} ${c.name}: "${MEASURE[m.kind].label}"`, text: `${m.text} Their ambassador is waiting for your answer. You can calm it down, or stand firm. ${feudOf(s, c.id).why.slice(-1)[0] ? `Their complaint: ${feudOf(s, c.id).why.slice(-1)[0].text}.` : ""}`, due: s.month + 3,
    options: [{ id: "apologise", label: "Apologise and talk", hint: "Costs political capital. Ends it sooner and cools the grudge." }, { id: "sweeten", label: "Send a sweetener", hint: "Costs cash. Works fast." }, { id: "firm", label: "Stand firm", hint: "Plays well at home. Makes it worse abroad." }], amount: 0 } as never);
  s.flags.inbox = JSON.stringify(l.slice(-40));
}

export function repairCost(s: FixState, c: Country) { return Math.round((12 + 60 * sizeOf(c)) * (0.6 + 0.4 * s.eco.priceLevel / 100)); }
/** repair a grudge: "apologise" (political capital), "sweeten" (cash) or "firm" (domestic applause, worse abroad) */
export function repairFeud(s: FixState, id: string, how: "apologise" | "sweeten" | "firm"): { ok: boolean; message: string } {
  const w = W(s); const c = w.c.find((x) => x.id === id); if (!c) return { ok: false, message: "Unknown country." };
  const f = store(s); const x = (f[id] ??= { heat: 0, why: [] });
  const ms = measuresAgainst(s, id);
  const end = (until: number) => { const all = jflag<Measure[]>(s, "measures", []); for (const m of all) if (m.country === id && m.until > until) m.until = until; saveMeasures(s, all); if (until <= s.month + 1) { const e = jflag<Record<string, number>>(s, "embargo", {}); if ((e[id] ?? 0) > s.month + 1) { e[id] = s.month + 1; s.flags.embargo = JSON.stringify(e); } } };
  let msg: string;
  if (how === "apologise") { const e = payPc(s, 3, "apologise"); if (e) return { ok: false, message: e }; x.heat = clamp(x.heat - 20, 0, 100); c.rel = clamp100(c.rel + 6); end(s.month + 2); s.gov.approval = clamp(s.gov.approval - 0.8, 0, 100); msg = `You phone ${c.name}'s leader and say the right things. Some at home call it weakness.`; }
  else if (how === "sweeten") { const cost = repairCost(s, c); if (cost > s.fin.treasury) return { ok: false, message: `You need ${cost}bn in cash.` }; s.fin.treasury -= cost; x.heat = clamp(x.heat - 32, 0, 100); c.rel = clamp100(c.rel + 8); end(s.month + 1); msg = `A quiet package reaches ${c.name}: scholarships, a port rebate, a few contracts. The tone changes overnight.`; }
  else { x.heat = clamp(x.heat + 6, 0, 100); s.gov.approval = clamp(s.gov.approval + 1.5, 0, 100); s.rule.streetAnger = clamp100(s.rule.streetAnger - 1); msg = `You say Nigeria will not be pushed around. Crowds cheer. ${c.name} does not.`; }
  saveStore(s, f); saveW(s, w); applyMeasureEffects(s);
  void ms;
  return { ok: true, message: msg };
}
