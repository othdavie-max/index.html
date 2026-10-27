/**
 * Advisers. Your Chief of Staff and Vice President read the situation and tell you what they think. A skilled, honest
 * adviser warns you with the real numbers; a flatterer says "Great idea, Sir"; a general pushes force; a cleric
 * preaches. Everything is computed from the live game state, so the advice is always about what is actually happening.
 * (Rule-based and deterministic: it works offline and gives the same answer for the same situation.)
 */
import { subRng } from "../../game/engine/rng";
import type { Aide, AideKind, FixState, GameEvent } from "./types";
import { billChance } from "./politics";
import { sitting, TOOLS, deterrence } from "./power";
import { advisers } from "./dayone";
import { TEMPLATE_BY_ID } from "./events";
import { nb } from "./util";
import { pegged } from "./bigmoves";
import { budgetDue } from "./politics";

export type Stance = "go" | "caution" | "stop";
export interface Advice { by: Aide; stance: Stance; text: string; sound: boolean }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const VOICE: Record<AideKind, string> = {
  friend: "Oga,", technocrat: "Mr President, the numbers:", chieftain: "Politically speaking,", general: "From a security point of view,", cleric: "With respect, Sir,",
  regional: "My people in the zone say:", loyalist: "The party feels:", defector: "I know how the other side thinks:",
};
const LEAD: Record<Stance, string[]> = {
  go: ["I say do it.", "This is a good move.", "Go ahead."],
  caution: ["Proceed with care.", "Think twice.", "It can work, but it is risky."],
  stop: ["I advise against it.", "Please do not do this.", "This could finish us."],
};
const stanceOf = (risk: number): Stance => (risk < 0.35 ? "go" : risk < 0.65 ? "caution" : "stop");

// ---------------------------------------------------------------- facts about an action
interface Fact { risk: number; why: string }
const friendly = (s: FixState) => sitting(s).filter((l) => l.loyalty >= 55).length;
export function factsFor(s: FixState, key: string): Fact | null {
  const P = s.rule;
  if (key.startsWith("law:") || key === "amendment") {
    const p = billChance(s, key);
    const lvl = key === "amendment" ? 5 : Number(key.slice(4));
    let risk = 1 - p;
    const bits = [`Only ${friendly(s)} of ${sitting(s).length} lawmakers are friendly and your Assembly support is ${Math.round(s.assembly.support)}%. It passes about ${Math.round(p * 100)}% of the time.`];
    if (lvl === 4) { risk = clamp(risk * 0.7 + 0.3 + 0.2 * (1 - P.judiciary / 100)); bits.push(`The death penalty frightens thieves, but with courts at ${Math.round(P.judiciary)}/100 innocent people can be executed, and world pressure is already ${Math.round(P.intlPressure)}.`); }
    if (key === "amendment") { risk = clamp(risk * 0.6 + 0.35); bits.push(`Scrapping term limits will make the opposition, the press and the world furious (pressure ${Math.round(P.intlPressure)}).`); }
    if (lvl >= 2 && lvl <= 3 && P.judiciary < 40) bits.push(`Weak courts (${Math.round(P.judiciary)}/100) may not enforce it.`);
    return { risk: clamp(risk), why: bits.join(" ") };
  }
  if (key.startsWith("tool:")) {
    const id = key.slice(5), t = TOOLS.find((x) => x.id === id);
    if (!t) return null;
    const heat = (P.coupRisk + P.streetAnger + P.intlPressure) / 300;
    const base: Record<string, number> = { inec: 0.35, postpone: 0.55, emergency: 0.4, press: 0.4, shutdown: 0.45, rival: 0.5, military: 0.1, purge: 0.5, governors: 0.25, decree: 0.3 };
    const risk = clamp((base[id] ?? 0.3) + 0.9 * heat + (P.democracy < 45 ? 0.15 : 0) + 0.004 * P.abuse);
    return { risk, why: `Coup risk is ${Math.round(P.coupRisk)}, street anger ${Math.round(P.streetAnger)} and world pressure ${Math.round(P.intlPressure)}. ${t.risk} Your recent abuse of power is ${Math.round(P.abuse)}.` };
  }
  if (key.startsWith("move:")) {
    const id = key.slice(5);
    if (id === "peg") {
      const ratio = Math.max(1, s.eco.fx / Math.max(1, s.eco.fx * 0.6));
      const burn = Math.min(26, 6 * (ratio - 1));
      return { risk: 0.8, why: `Holding the naira at a bold rate means the central bank sells about $${burn.toFixed(0)}bn a month (more for a lower rate). Reserves are $${s.eco.reserves.toFixed(1)}bn, so the peg collapses in months, not years, and the black market will show the real price.` };
    }
    const m: Record<string, [number, string]> = {
      jets: [0.1, "A small saving and a big symbol. Your backers will grumble about the jet."],
      lawpay: [0.55, `Lawmakers will punish you in every vote: your Assembly support is ${Math.round(s.assembly.support)}% and would drop by about 14.`],
      treatment: [0.25, "Elites hate it, but it helps the health system and your image."],
      borders: [0.6, "Prices jump first, neighbours retaliate, and smuggling only slowly falls."],
      print: [0.8, `It feels wonderful for two months. Then prices climb. Inflation is already ${s.eco.inflation.toFixed(0)}%.`],
      school: [0.35, "A good idea that costs money every month. Watch the contractors."],
      jollof: [0.05, "Costs almost nothing and lifts the mood. Ghana will complain."],
      importban: [0.6, "Rice prices jump now. It only works if farmers get seeds and fertiliser."],
    };
    const x = m[id]; return x ? { risk: x[0], why: x[1] } : null;
  }
  return null;
}

// ---------------------------------------------------------------- how an adviser sees it
function trueSound(a: Aide, rng: ReturnType<typeof subRng>) { return rng.next() < 0.3 + 0.65 * (a.skill / 100) * (0.5 + 0.5 * a.integrity / 100); }
function opine(s: FixState, a: Aide, key: string, f: Fact): Advice {
  const rng = subRng(s.meta.seed, "advice", key, s.month, a.id);
  const truth = stanceOf(f.risk);
  let stance: Stance = truth;
  const forceKey = key === "law:4" || /tool:(emergency|rival|press|shutdown|purge)/.test(key);
  if (a.kind === "friend" && a.skill < 62 && rng.chance(0.65)) stance = "go"; // a flatterer
  else if (a.kind === "general" && forceKey && rng.chance(0.7)) stance = "go";
  else if (a.kind === "cleric" && key === "law:4") stance = "stop";
  else if (!trueSound(a, rng)) stance = (["go", "caution", "stop"] as Stance[]).filter((x) => x !== truth)[rng.int(0, 1)];
  const lead = LEAD[stance][rng.int(0, 2)];
  const knows = a.skill >= 65 && (stance === truth);
  const detail = knows ? ` ${f.why}` : a.skill >= 50 && stance === truth ? ` ${f.why.split(". ")[0]}.` : a.kind === "friend" && stance === "go" ? " Nobody will dare say a word, Sir." : stance === "stop" ? " I just feel it is too dangerous." : " It should be fine.";
  const extra = a.kind === "cleric" && key === "law:4" ? " The people we execute will be judged by a higher court too." : a.kind === "general" && stance === "go" && forceKey ? " Strong leaders act." : "";
  return { by: a, stance, text: `${VOICE[a.kind]} ${lead}${detail}${extra}`, sound: stance === truth };
}
export function adviceFor(s: FixState, key: string): Advice[] {
  const f = factsFor(s, key);
  if (!f) return [];
  return advisers(s).map((a) => opine(s, a, key, f));
}

// ---------------------------------------------------------------- monthly briefing
export interface Issue { id: string; sev: number; min: number; text: string; go?: string; good?: boolean }
export function issues(s: FixState): Issue[] {
  const P = s.rule, out: Issue[] = [];
  const add = (i: Issue) => out.push(i);
  if (s.assembly.support < 48) add({ id: "assembly", sev: (55 - s.assembly.support) / 40, min: 35, text: `You have only ${friendly(s)} friendly lawmakers (support ${Math.round(s.assembly.support)}%). Harsh bills such as the death penalty will fail until you win some over.`, go: "assembly" });
  if (s.eco.reserves < 22) add({ id: "reserves", sev: clamp((26 - s.eco.reserves) / 20), min: 50, text: `Reserves are down to $${s.eco.reserves.toFixed(1)}bn. The naira has very little defence left.`, go: "nation" });
  const bk = s.backers?.find((b) => b.mood < 35);
  if (bk) add({ id: "backer", sev: clamp((45 - bk.mood) / 40), min: 30, text: `${bk.name} is unhappy and talking to people. Expect trouble from his zone.`, go: "cabinet" });
  if (P.coupRisk > 35) add({ id: "coup", sev: clamp((P.coupRisk - 25) / 50), min: 40, text: `Coup risk is ${Math.round(P.coupRisk)}. Officers are meeting. Think about pay, or about easing the pressure.`, go: "power" });
  if (P.streetAnger > 50) add({ id: "anger", sev: clamp((P.streetAnger - 40) / 50), min: 35, text: `Street anger is ${Math.round(P.streetAnger)}. Food and fuel prices are driving it.`, go: "power" });
  if (budgetDue(s) && s.month > 0) add({ id: "budget", sev: 0.5, min: 25, text: "The annual budget is due. Lawmakers are waiting, and every month of delay costs credibility.", go: "policies" });
  if (s.eco.inflation > 25) add({ id: "infl", sev: clamp((s.eco.inflation - 20) / 25), min: 35, text: `Inflation is ${s.eco.inflation.toFixed(0)}%. Families are skipping meals. Look at food supply and the naira.`, go: "policies" });
  if (s.fin.treasury < 40) add({ id: "cash", sev: 0.7, min: 35, text: `Cash is only ${nb(s.fin.treasury)}. You cannot afford big moves or emergencies.`, go: "nation" });
  if (!s.projects.some((p) => p.status === "active")) add({ id: "proj", sev: 0.3, min: 25, text: "No project is under way. Lasting change needs them, and ribbon-cutting wins votes.", go: "projects" });
  if (pegged(s)) add({ id: "peg", sev: 0.9, min: 40, text: `The naira peg is burning reserves (now $${s.eco.reserves.toFixed(1)}bn). It will break unless the rate is released.`, go: "nation" });
  if (s.assembly.support >= 65) add({ id: "window", sev: 0.35, min: 55, text: `Your Assembly support is ${Math.round(s.assembly.support)}%. This is the moment to push the next law, while lawmakers are friendly.`, go: "power", good: true });
  if (s.rule.lawLevel < 4 && deterrence(s) < 15 && s.month > 6) add({ id: "weaklaw", sev: 0.4, min: 45, text: "The law is too weak to scare lawmakers: they are stealing freely. Think about the next rung of the ladder.", go: "power" });
  return out.sort((a, b) => b.sev - a.sev);
}
export function briefing(s: FixState): Advice[] {
  const all = issues(s), res: Advice[] = [];
  for (const a of advisers(s)) {
    const rng = subRng(s.meta.seed, "brief", s.month, a.id);
    const seen = all.filter((i) => a.skill + (a.kind === "general" && ["coup"].includes(i.id) ? 25 : 0) + (a.kind === "chieftain" && ["assembly", "backer"].includes(i.id) ? 25 : 0) + (a.kind === "technocrat" && ["reserves", "infl", "cash", "peg"].includes(i.id) ? 15 : 0) >= i.min);
    const first = seen[0];
    if (!first) { res.push({ by: a, stance: "go", text: `${VOICE[a.kind]} I see no big danger right now, Sir.`, sound: all.length === 0 }); continue; }
    if (a.kind === "friend" && a.skill < 62 && first.sev > 0.35 && !first.good && rng.chance(0.65)) { res.push({ by: a, stance: "go", text: `${VOICE[a.kind]} Everything is under control, Sir. The people love you, nobody is complaining.`, sound: false }); continue; }
    const flip = a.skill < 45 && rng.chance(0.4) && seen[1];
    const pick = flip ? seen[1] : first;
    res.push({ by: a, stance: pick.good ? "go" : pick.sev > 0.6 ? "stop" : "caution", text: `${VOICE[a.kind]} ${pick.text}`, sound: !flip });
  }
  return res;
}
export const topIssue = (s: FixState): Issue | null => issues(s)[0] ?? null;

// ---------------------------------------------------------------- advice on an event
export interface EventAdvice { by: Aide; optId: string; label: string; text: string; sound: boolean }
export function eventAdvice(s: FixState, e: GameEvent): EventAdvice[] {
  const tpl = TEMPLATE_BY_ID[e.tpl];
  if (!tpl) return [];
  const opts = tpl.options.map((o) => ({ id: o.id, label: o.dyn?.(s).label ?? o.label, cost: typeof o.cost === "function" ? o.cost(s) : o.cost, chance: Math.min(0.97, Math.max(0.05, o.chance(s, e))) }));
  if (!opts.length) return [];
  const score = (o: (typeof opts)[number]) => o.chance - 0.0009 * o.cost;
  const best = [...opts].sort((a, b) => score(b) - score(a))[0];
  return advisers(s).map((a) => {
    const rng = subRng(s.meta.seed, "evadvice", e.id, a.id);
    let pick = best;
    if (a.kind === "friend" && a.skill < 62) pick = [...opts].sort((x, y) => x.cost - y.cost)[0];
    else if (a.kind === "general" && rng.chance(0.6)) pick = opts.find((o) => /army|force|troop|raid|arrest|crack|rescue|security/i.test(o.id + o.label)) ?? best;
    else if (a.kind === "cleric" && rng.chance(0.6)) pick = opts.find((o) => /talk|dialogue|appeal|reconcile|meet|peace/i.test(o.id + o.label)) ?? best;
    else if (rng.next() > 0.3 + 0.65 * (a.skill / 100)) pick = opts[rng.int(0, opts.length - 1)];
    const why = a.skill >= 60 ? ` About ${Math.round(pick.chance * 100)}% chance of working${pick.cost ? `, and it costs ${nb(pick.cost)}` : ""}.` : a.skill >= 45 ? " It seems the sensible one." : "";
    return { by: a, optId: pick.id, label: pick.label, text: `${VOICE[a.kind]} I would go for “${pick.label}”.${why}`, sound: pick.id === best.id };
  });
}
