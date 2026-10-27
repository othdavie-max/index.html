/**
 * Power and corruption. The National Assembly is full of named lawmakers; some steal. You decide what to do with them
 * (expose, arrest, blackmail, protect, take a cut), what the law says the punishment is (a ladder from reprimand to the
 * death penalty), and how far you will go to stay in power (buy INEC, postpone the election, crush the press...).
 * Every authoritarian step feeds four danger meters: street anger, coup risk, international pressure and elite loyalty.
 * All names are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID, STATES } from "../../game/data/states";
import type { FixState, Lawmaker, LmStatus, Portrait } from "./types";
import { addMod, calMonth, clamp, clamp100, nb, pushNews, pushReport, removeMods } from "./util";
import { createEvent } from "./events";
import { finishTerm } from "./legacy";
import { staffCoup } from "./dayone";
import { ripple } from "./ripples";

// ---------------------------------------------------------------- the law ladder
export interface LawDef { level: 0 | 1 | 2 | 3 | 4; name: string; short: string; blurb: string; icon: string }
export const LAWS: LawDef[] = [
  { level: 0, name: "Weak laws", short: "Reprimands", icon: "📄", blurb: "Stealing public money earns a reprimand and, at most, a small fine. Almost nobody is afraid of the law." },
  { level: 1, name: "Asset Recovery Act", short: "Seize the loot", icon: "💰", blurb: "Corrupt officials must hand back what they stole, plus a heavy fine." },
  { level: 2, name: "Mandatory prison", short: "Prison", icon: "⛓️", blurb: "Five to ten years in prison for stealing public money. Jailed lawmakers lose their seats." },
  { level: 3, name: "Life for grand corruption", short: "Life sentence", icon: "🔒", blurb: "Stealing ₦1bn or more earns life in prison." },
  { level: 4, name: "Death penalty for grand corruption", short: "Death penalty", icon: "⚖️", blurb: "The harshest rung. It frightens officials, but courts can make mistakes and the world is watching." },
];
export const LAW_EFFECTS: Record<number, Partial<Record<"corruption" | "procurement" | "trust" | "investor", number>>> = {
  1: { corruption: -2, trust: 1 }, 2: { corruption: -4, procurement: 3, trust: 2 }, 3: { corruption: -6, procurement: 5, trust: 2 }, 4: { corruption: -8, procurement: 6, trust: 1, investor: -2 },
};

// ---------------------------------------------------------------- lawmakers
const FIRST = ["Adamu", "Bola", "Chidi", "Dayo", "Emeka", "Fatima", "Gbenga", "Halima", "Ifeanyi", "Jibrin", "Kemi", "Lanre", "Musa", "Ngozi", "Obinna", "Patience", "Qasim", "Rilwan", "Sade", "Tunde", "Umar", "Victoria", "Wale", "Yemisi", "Zainab", "Ibrahim", "Emmanuel", "Grace", "Danladi", "Uche"];
const LAST = ["Abubakar", "Bello", "Chukwu", "Dantata", "Ekwueme", "Fagbemi", "Gana", "Haruna", "Ikpeazu", "Jonathan-Eze", "Kolawole", "Lawan", "Maina", "Nwachukwu", "Okoro", "Peters", "Quadri", "Rabiu", "Salihu", "Tinubu-Adeyemo", "Usman", "Vandi", "Wada", "Yar'Adua-Sule", "Zubairu", "Akande", "Balogun", "Duru", "Etim", "Gumel"];
const TRAITS = ["Smooth talker", "Old-school patron", "Young reformer", "Party enforcer", "Media darling", "Quiet dealmaker", "Loud populist", "Religious leader", "Former general", "Business tycoon"];
const TOWN: Record<string, string> = {};

function portraitFor(rng: Rng): Portrait { return { skin: rng.int(1, 5), hair: rng.int(0, 3), style: rng.int(0, 3), accent: rng.int(0, 4) }; }

function newLawmaker(s: FixState, rng: Rng, id: string, chamber: "senate" | "reps", stateId?: string, party?: "NPP" | "PRA"): Lawmaker {
  const st = stateId ?? rng.pick(STATES.map((x) => x.id));
  const gov = s.governors?.find((g) => g.zone === STATE_BY_ID[st]?.zone);
  const p = party ?? (gov ? (rng.chance(0.65) ? gov.party : gov.party === "NPP" ? "PRA" : "NPP") : rng.chance(0.55) ? "NPP" : "PRA");
  return {
    id, name: `${chamber === "senate" ? "Sen." : "Hon."} ${rng.pick(FIRST)} ${rng.pick(LAST)}`, chamber, stateId: st, party: p,
    loyalty: Math.round(p === "NPP" ? rng.range(45, 75) : rng.range(18, 48)), greed: Math.round(rng.range(18, 92)), stolen: 0, evidence: 0, status: "active",
    portrait: portraitFor(rng), trait: rng.pick(TRAITS), since: s.month,
  };
}

export function initPower(s: FixState) {
  const rng = subRng(s.meta.seed, "lawmakers");
  const lms: Lawmaker[] = [];
  const picks = rng.shuffle(STATES.map((x) => x.id));
  for (let i = 0; i < 12; i++) lms.push(newLawmaker(s, rng, `sen${i}`, "senate", picks[i]));
  for (let i = 0; i < 18; i++) lms.push(newLawmaker(s, rng, `rep${i}`, "reps", picks[(i + 12) % picks.length]));
  s.lawmakers = lms;
  s.rule = {
    lawLevel: 0, deterrence: 0, streetAnger: 25, coupRisk: 12, intlPressure: 10, eliteLoyalty: 55, pressFreedom: 60, judiciary: 45, inecControl: 0, democracy: 72,
    emergencyUntil: -1, shutdownUntil: -1, termExtra: 0, maxTerms: 2, acts: [], executions: 0, convicted: 0, wrongful: 0, rigged: false, stolenElection: false, inecExposed: 0, uprising: 0, abuse: 0,
  };
}

export const lmById = (s: FixState, id: string) => s.lawmakers.find((l) => l.id === id);
export const sitting = (s: FixState) => s.lawmakers.filter((l) => l.status === "active" || l.status === "controlled" || l.status === "protected" || l.status === "exposed");
export const emergencyOn = (s: FixState) => s.month < s.rule.emergencyUntil;
export const shutdownOn = (s: FixState) => s.month < s.rule.shutdownUntil;
export const lawyer = (s: FixState) => LAWS[s.rule.lawLevel];

/** how scared lawmakers are of getting caught and punished (0..0.9); a harsh law that is never enforced scares few */
export function deterrence(s: FixState): number {
  const enforce = 0.45 + 0.55 * (s.rule.judiciary / 100);
  return clamp((0.07 * s.rule.lawLevel + s.rule.deterrence / 135) * enforce, 0, 0.9);
}
/** loyalty of sitting lawmakers, on -25..+25, feeds Assembly support */
export function lawmakerLoyalty(s: FixState): number {
  const l = sitting(s);
  if (!l.length) return 0;
  return clamp(l.reduce((a, x) => a + (x.loyalty - 50), 0) / l.length * 0.5, -25, 25);
}
export const authoritarian = (s: FixState) => s.rule.democracy < 50;
export const dictator = (s: FixState) => s.rule.democracy < 38;
export const democracyLabel = (s: FixState) => (s.rule.democracy >= 72 ? "Free" : s.rule.democracy >= 55 ? "Fragile democracy" : s.rule.democracy >= 38 ? "Strongman rule" : "Dictatorship");

export function act(s: FixState, id: string, d: { democracy?: number; anger?: number; intl?: number; elite?: number; coup?: number; press?: number; judiciary?: number; trust?: number }) {
  const p = s.rule;
  p.acts.push(id); if (p.acts.length > 60) p.acts.shift();
  p.abuse = clamp(p.abuse + Math.max(0, -(d.democracy ?? 0)), 0, 120);
  p.democracy = clamp100(p.democracy + (d.democracy ?? 0));
  p.streetAnger = clamp100(p.streetAnger + (d.anger ?? 0));
  p.intlPressure = clamp100(p.intlPressure + (d.intl ?? 0));
  p.eliteLoyalty = clamp100(p.eliteLoyalty + (d.elite ?? 0));
  p.coupRisk = clamp100(p.coupRisk + (d.coup ?? 0));
  p.pressFreedom = clamp100(p.pressFreedom + (d.press ?? 0));
  p.judiciary = clamp100(p.judiciary + (d.judiciary ?? 0));
  if (d.trust) s.gov.trust = clamp100(s.gov.trust + d.trust);
  s.flags.lastActMonth = s.month;
}
export interface PResult { ok: boolean; message: string }
const fail = (message: string): PResult => ({ ok: false, message });
const mult = (s: FixState) => 0.6 + 0.4 * (s.eco.priceLevel / 100);
function pay(s: FixState, bn: number): string | null {
  const c = bn * mult(s);
  if (c > s.fin.treasury + 0.001) return `The treasury has ${nb(s.fin.treasury)} but this needs ${nb(c)}.`;
  s.fin.treasury -= c; return null;
}

// ---------------------------------------------------------------- punishment
/** what happens to a convicted lawmaker under the law as it stands */
export function punish(s: FixState, lm: Lawmaker, why: "case" | "arrest" | "courts", political = false): string {
  const level = s.rule.lawLevel;
  const rng = subRng(s.meta.seed, "punish", lm.id, s.month, s.rule.convicted);
  const wrongful = political || (lm.stolen < 5 && lm.evidence < 50);
  const lines: string[] = [];
  if (wrongful) {
    s.rule.wrongful++;
    act(s, "politicalArrest", { democracy: -8, intl: 6, anger: 3, elite: -2, press: -3 });
    s.gov.trust = clamp100(s.gov.trust - 2);
    lm.status = "jailed";
    ripple(s, "wrongful", { name: lm.name, stateId: lm.stateId, lmId: lm.id });
    lines.push(`${lm.name} was locked up on thin evidence. Critics call it a political arrest.`);
  } else if (level === 0) {
    lm.loyalty = clamp100(lm.loyalty - 5); lm.evidence = 0;
    s.fin.treasury += lm.stolen * 0.05;
    lines.push(`The law only allows a reprimand and a small fine. ${lm.name} laughs it off and keeps the loot.`);
    s.rule.deterrence = clamp100(s.rule.deterrence + 0.5);
    lm.stolen *= 0.9;
    return lines.join(" ");
  } else {
    const back = lm.stolen * (level === 1 ? 0.6 : level === 2 ? 0.4 : 0.3);
    s.fin.treasury += back;
    s.rule.convicted++;
    s.rule.deterrence = clamp100(s.rule.deterrence + [0, 4, 9, 14, 22][level]);
    if (level === 1) { lm.stolen = 0; lm.evidence = 0; lm.loyalty = clamp100(lm.loyalty - 10); lines.push(`${lm.name} was ordered to hand back ${nb(back)} and pay a heavy fine.`); }
    else {
      lm.status = level === 4 ? "executed" : "jailed";
      lines.push(level === 2 ? `${lm.name} was sentenced to prison and lost the seat; ${nb(back)} was recovered.` : level === 3 ? `${lm.name} was sentenced to life in prison; ${nb(back)} was recovered.` : `${lm.name} was sentenced to death for grand corruption. ${nb(back)} was recovered.`);
      ripple(s, level === 4 ? "execute" : "jail", { name: lm.name, stateId: lm.stateId, lmId: lm.id });
      if (level === 4) { s.rule.executions++; act(s, "execution", { intl: 8, anger: rng.chance(0.4) ? 4 : -2, democracy: -2, elite: -3 }); s.sec.humanRights = clamp100(s.sec.humanRights - 6); }
      if (level === 3) act(s, "lifeSentence", { intl: 2, elite: -2 });
      if (level === 2) act(s, "prison", { elite: -1 });
    }
    s.gov.trust = clamp100(s.gov.trust + (level === 1 ? 1 : 2.5));
    s.gov.corruption = clamp100(s.gov.corruption - 0.4 * level);
  }
  // colleagues take notice: loyalists of the same party resent it, in proportion to how harsh the law is
  const colleagues = sitting(s).filter((x) => x.id !== lm.id);
  for (const c of colleagues) if (c.party === lm.party) c.loyalty = clamp100(c.loyalty - (wrongful ? 4 : 1 + level * 0.8) * (c.greed / 60));
  s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty - (wrongful ? 2 : level * 0.8));
  if (lm.status === "jailed" || lm.status === "executed") replaceSeat(s, lm);
  // wrongful convictions also happen to real cases when the courts are weak and the law is harsh
  if (!wrongful && level >= 2 && rng.chance(0.07 * level * (1 - s.rule.judiciary / 130))) {
    s.rule.wrongful++; s.gov.trust = clamp100(s.gov.trust - 3); s.rule.intlPressure = clamp100(s.rule.intlPressure + 4);
    lines.push(`Later evidence suggests the court may have convicted the wrong man in another case. Rights groups are furious.`);
  }
  pushNews(s, { source: `punish:${lm.id}:${s.month}`, headline: lm.status === "executed" ? `${lm.name} sentenced to death for corruption` : lm.status === "jailed" ? `${lm.name} jailed` : `${lm.name} forced to return stolen funds`, body: lines[0], tone: wrongful ? "bad" : "good", stateId: lm.stateId });
  void why;
  return lines.join(" ");
}

function replaceSeat(s: FixState, gone: Lawmaker) {
  const rng = subRng(s.meta.seed, "bye-election", gone.id, s.month);
  const gov = s.governors.find((g) => g.zone === STATE_BY_ID[gone.stateId]?.zone);
  const party = gov && rng.chance(0.7) ? gov.party : rng.chance(0.5) ? "NPP" : "PRA";
  const idn = `${gone.chamber === "senate" ? "sen" : "rep"}-b${s.month}-${s.lawmakers.length}`;
  const fresh = newLawmaker(s, rng, idn, gone.chamber, gone.stateId, party);
  fresh.greed = Math.round(clamp(gone.greed - 20 + rng.range(-10, 10), 10, 90)); // a lesson was learned
  s.lawmakers.push(fresh);
}

// ---------------------------------------------------------------- dealing with a lawmaker
export interface LmAction { id: "investigate" | "bribe" | "arrest" | "expose" | "blackmail" | "protect" | "cut"; label: string; explain: string; cost: number; need?: (lm: Lawmaker) => string | null }
export const LM_ACTIONS: LmAction[] = [
  { id: "investigate", label: "Investigate", explain: "Have agents dig into their finances. Builds proof.", cost: 15, need: (l) => (l.evidence >= 90 ? "You already have all the proof you need." : null) },
  { id: "bribe", label: "Buy their loyalty", explain: "Contracts and favours to win their vote. Adds to corruption.", cost: 25 },
  { id: "arrest", label: "Arrest", explain: "Have them arrested. With proof they face the law's punishment; without it, it is a political arrest.", cost: 5 },
  { id: "expose", label: "Leak it to the press", explain: "Needs proof. The public turns on them and the courts follow, slowly.", cost: 3, need: (l) => (l.evidence < 40 ? "You need more proof first (40+)." : null) },
  { id: "blackmail", label: "Blackmail them", explain: "Needs proof. They vote your way from now on. If the file leaks, it is your scandal.", cost: 0, need: (l) => (l.evidence < 40 ? "You need more proof first (40+)." : null) },
  { id: "protect", label: "Protect them", explain: "Shield them from investigators. They owe you; you share the guilt.", cost: 0 },
  { id: "cut", label: "Demand a cut", explain: "Take your share of what they steal. You get rich, and leave a trail.", cost: 0, need: (l) => (l.stolen < 5 ? "They have not stolen anything worth a cut." : null) },
];
export function lmActionBlock(s: FixState, lm: Lawmaker, a: LmAction): string | null {
  if (lm.status === "jailed" || lm.status === "executed") return "No longer in the Assembly.";
  const n = a.need?.(lm); if (n) return n;
  if (a.id === "blackmail" && lm.status === "controlled") return "Already under your thumb.";
  if (a.id === "protect" && lm.status === "protected") return "Already protected.";
  if (a.id === "expose" && lm.status === "exposed") return "Already exposed.";
  if (a.cost * mult(s) > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function lawmakerAction(s: FixState, id: string, action: LmAction["id"]): PResult {
  const lm = lmById(s, id);
  const def = LM_ACTIONS.find((x) => x.id === action);
  if (!lm || !def) return fail("Unknown lawmaker or action.");
  const block = lmActionBlock(s, lm, def); if (block) return fail(block);
  const err = def.cost ? pay(s, def.cost) : null; if (err) return fail(err);
  const rng = subRng(s.meta.seed, "lm-act", lm.id, action, s.month);
  switch (action) {
    case "investigate": {
      const gain = 25 + (lm.stolen > 0 ? 25 : 0) + rng.int(0, 10);
      lm.evidence = clamp100(lm.evidence + gain);
      return { ok: true, message: lm.stolen > 5 ? `Agents found a trail: ${lm.name} has hidden about ${nb(lm.stolen)}. Proof ${Math.round(lm.evidence)}/100.` : `Agents found little on ${lm.name}. Proof ${Math.round(lm.evidence)}/100.` };
    }
    case "bribe": {
      lm.loyalty = clamp100(lm.loyalty + 22); lm.greed = clamp100(lm.greed + 4);
      s.gov.corruption = clamp100(s.gov.corruption + 0.4); s.me.evidence = clamp100(s.me.evidence + 1.5);
      return { ok: true, message: `${lm.name} is now much friendlier to your bills. (Loyalty ${Math.round(lm.loyalty)})` };
    }
    case "arrest": {
      const political = lm.evidence < 40;
      const text = punish(s, lm, "arrest", political);
      return { ok: !political, message: text };
    }
    case "expose": {
      lm.status = "exposed"; lm.loyalty = clamp100(lm.loyalty - 25); s.gov.trust = clamp100(s.gov.trust + 2.5);
      s.flags[`exposed:${lm.id}`] = s.month;
      pushNews(s, { source: `expose:${lm.id}`, headline: `Leaked documents implicate ${lm.name}`, body: `Papers show ${nb(lm.stolen)} missing from budget lines tied to the lawmaker. The courts are expected to follow.`, tone: "good", stateId: lm.stateId });
      return { ok: true, message: `${lm.name} is exposed. The courts will act in a few months.` };
    }
    case "blackmail": {
      lm.status = "controlled"; lm.loyalty = 92; s.flags[`blackmail:${lm.id}`] = s.month; s.rule.acts.push("blackmail");
      return { ok: true, message: `${lm.name} now votes the way you want. Keep the file safe.` };
    }
    case "protect": {
      lm.status = "protected"; lm.loyalty = clamp100(lm.loyalty + 25); lm.evidence = 0;
      s.gov.corruption = clamp100(s.gov.corruption + 0.5); s.me.evidence = clamp100(s.me.evidence + 3); s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty + 1.5);
      return { ok: true, message: `${lm.name} is under your protection and will not forget it.` };
    }
    case "cut": {
      const take = Math.round(clamp(lm.stolen, 10, 200) * 3);
      s.me.wealth += take; s.me.evidence = clamp100(s.me.evidence + 8); s.me.acts.push("kickback"); lm.loyalty = clamp100(lm.loyalty + 10);
      return { ok: true, message: `₦${take.toLocaleString()}m lands in your own accounts, and in somebody's notebook.` };
    }
  }
}

// ---------------------------------------------------------------- the law ladder: votes and decrees
export const nextLaw = (s: FixState): LawDef | null => (s.rule.lawLevel >= 4 ? null : LAWS[s.rule.lawLevel + 1]);
export const LAW_DIFFICULTY = [0, 6, 12, 20, 30];
export function enactLawNow(s: FixState): PResult {
  const n = nextLaw(s); if (!n) return fail("This is already the harshest law.");
  s.rule.lawLevel = n.level;
  removeMods(s, "law");
  const fx = LAW_EFFECTS[n.level];
  if (fx) addMod(s, "law", n.name, fx as never, { duration: null, ramp: 3 });
  pushNews(s, { source: `law:${n.level}`, headline: `${n.name} becomes law`, body: n.blurb, tone: n.level >= 3 ? "neutral" : "good" });
  pushReport(s, { title: `New anti-corruption law: ${n.name}`, tone: "neutral", lines: [n.blurb, `Lawmakers fear it only if the courts enforce it, and each punishment you order sends a message.`, n.level >= 3 ? "Expect resistance from the Assembly and criticism from rights groups." : "Greedy lawmakers will resent it."] });
  return { ok: true, message: `${n.name} is now the law.` };
}
export function decreeLaw(s: FixState): PResult {
  const n = nextLaw(s); if (!n) return fail("This is already the harshest law.");
  act(s, "decree", { democracy: -8, intl: 4, elite: -3, anger: 2 });
  for (const l of sitting(s)) l.loyalty = clamp100(l.loyalty - 5);
  return enactLawNow(s);
}

// ---------------------------------------------------------------- strongman tools
export interface Tool { id: string; icon: string; name: string; explain: string; cost: number; risk: string; cooldown?: number; need?: (s: FixState) => string | null }
export const TOOLS: Tool[] = [
  { id: "inec", icon: "🗳️", name: "Buy the electoral commission (INEC)", explain: "Officials 'manage' the count in your favour. More control, bigger rigging.", cost: 80, risk: "If it leaks, it is a national scandal.", need: (s) => (s.rule.inecControl >= 100 ? "You already own INEC." : null) },
  { id: "postpone", icon: "⏳", name: "Postpone the election by 6 months", explain: "Blame 'security'. Buys time, but the term is no longer legitimate.", cost: 10, risk: "Anger, foreign pressure and coup risk climb every month you overstay.", need: (s) => (monthsLeft(s) > 8 ? "Only possible in the last months of a term." : s.rule.termExtra >= 24 ? "You cannot postpone any longer." : null) },
  { id: "emergency", icon: "🚨", name: "Declare a state of emergency (6 months)", explain: "Troops on the streets, protests banned. Anger is held down while it lasts.", cost: 20, risk: "It ends with a burst of anger, and the world notices.", need: (s) => (emergencyOn(s) ? "A state of emergency is already in force." : null) },
  { id: "press", icon: "📰", name: "Crack down on the press", explain: "Journalists are jailed or silenced. Scandals stop leaking.", cost: 15, risk: "Press freedom falls; foreign and domestic anger.", need: (s) => (s.rule.pressFreedom <= 10 ? "The press is already silenced." : null) },
  { id: "shutdown", icon: "📵", name: "Shut down the internet (3 months)", explain: "Stops protests from organising online.", cost: 10, risk: "Businesses and young people suffer; investors flee.", need: (s) => (shutdownOn(s) ? "Already shut down." : null) },
  { id: "rival", icon: "⛓️", name: "Arrest the opposition leader", explain: "Remove your rival from the race.", cost: 5, risk: "A martyr; heavy foreign condemnation." },
  { id: "military", icon: "🎖️", name: "Pay and equip the military", explain: "Bonuses and new equipment keep the generals loyal.", cost: 100, risk: "An expensive habit; the generals will expect it again." },
  { id: "purge", icon: "🪖", name: "Purge disloyal officers", explain: "Remove officers who might plot against you.", cost: 10, risk: "Purged officers have friends; the army grows more resentful." },
  { id: "governors", icon: "🤝", name: "Buy the governors", explain: "Security-vote 'gifts' and contracts for loyalty.", cost: 120, risk: "More corruption, more paper trails.", cooldown: 8 },
  { id: "decree", icon: "📜", name: "Rule by decree", explain: "Pass the next anti-corruption law without the Assembly.", cost: 0, risk: "Lawmakers resent it; democracy takes a blow.", need: (s) => (s.rule.lawLevel >= 4 ? "The law ladder is complete." : null) },
];
export const monthsLeft = (s: FixState) => s.termStart + 48 + s.rule.termExtra - s.month;
export function toolBlock(s: FixState, t: Tool): string | null {
  const cd = s.flags[`cd:tool:${t.id}`]; if (typeof cd === "number" && s.month < cd) return "Not available again yet.";
  const n = t.need?.(s); if (n) return n;
  if (t.cost * mult(s) > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function applyTool(s: FixState, id: string): PResult {
  const t = TOOLS.find((x) => x.id === id); if (!t) return fail("Unknown tool.");
  const block = toolBlock(s, t); if (block) return fail(block);
  if (id === "decree") return decreeLaw(s);
  const err = t.cost ? pay(s, t.cost) : null; if (err) return fail(err);
  const P = s.rule;
  const rng = subRng(s.meta.seed, "tool", id, s.month);
  if (t.cooldown) s.flags[`cd:tool:${id}`] = s.month + t.cooldown;
  switch (id) {
    case "inec": {
      P.inecControl = clamp100(P.inecControl + 30);
      act(s, "buyINEC", { democracy: -6, intl: 2, elite: 1 });
      s.me.evidence = clamp100(s.me.evidence + 6); s.gov.corruption = clamp100(s.gov.corruption + 0.5);
      return { ok: true, message: `INEC control is now ${P.inecControl}%. Rigging gets easier, and so does a scandal.` };
    }
    case "postpone": {
      P.termExtra += 6;
      act(s, "postpone", { democracy: -10, anger: 10, intl: 8, elite: -3, coup: 4 });
      pushNews(s, { source: `postpone:${s.month}`, headline: "President postpones election citing security", body: "The opposition calls it a power grab; foreign governments express concern.", tone: "bad" });
      return { ok: true, message: `The election is pushed back six months. Every month you overstay raises the danger.` };
    }
    case "emergency": {
      P.emergencyUntil = s.month + 6;
      act(s, "emergency", { democracy: -12, intl: 8, anger: 3, elite: -2, press: -10 });
      s.eco.investor = clamp100(s.eco.investor - 3);
      for (const r of Object.values(s.regions)) r.unrest = clamp100(r.unrest * 0.7);
      pushNews(s, { source: `emergency:${s.month}`, headline: "State of emergency declared nationwide", body: "Troops deployed; public gatherings banned.", tone: "bad" });
      return { ok: true, message: "State of emergency declared for six months. Protests are held down for now." };
    }
    case "press": {
      act(s, "pressCrackdown", { democracy: -10, press: -30, anger: 6, intl: 6, trust: -3 });
      ripple(s, "press");
      s.groupMood.youth = clamp(s.groupMood.youth - 6, -40, 40);
      pushNews(s, { source: `press:${s.month}`, headline: "Newspaper offices raided; journalists detained", body: "Press groups call it the worst attack on media freedom in years.", tone: "bad" });
      return { ok: true, message: "The press has been muzzled. Fewer scandals will leak, at a price." };
    }
    case "shutdown": {
      P.shutdownUntil = s.month + 3;
      act(s, "shutdown", { democracy: -8, intl: 4, anger: 3 });
      s.eco.investor = clamp100(s.eco.investor - 4); s.jobs.sme = clamp100(s.jobs.sme - 2);
      s.groupMood.youth = clamp(s.groupMood.youth - 10, -40, 40); s.groupMood.business = clamp(s.groupMood.business - 6, -40, 40);
      return { ok: true, message: "The internet is off for three months. Protests cannot organise online; the economy suffers." };
    }
    case "rival": {
      s.rival.popularity = clamp100(s.rival.popularity - 18);
      act(s, "arrestRival", { democracy: -15, intl: 10, anger: 8, elite: -2 });
      s.flags.rivalMartyr = s.month;
      ripple(s, "rival");
      pushNews(s, { source: `rival:${s.month}`, headline: `${s.rival.name} arrested`, body: "Supporters say the charges are political.", tone: "bad" });
      return { ok: true, message: `${s.rival.name} is in custody. Their supporters are furious; a martyr may be more dangerous than a rival.` };
    }
    case "military": {
      act(s, "payMilitary", { coup: -15, elite: 2 });
      s.groupMood.military = clamp(s.groupMood.military + 14, -40, 40);
      return { ok: true, message: "The generals are happy for now. Coup risk falls." };
    }
    case "purge": {
      act(s, "purge", { coup: -18, elite: -3, intl: 1, anger: 1 });
      s.groupMood.military = clamp(s.groupMood.military - 8, -40, 40);
      s.flags.purgeEcho = s.month + 6;
      ripple(s, "purge");
      return { ok: true, message: "Suspected plotters are out. Coup risk falls now, but the army will remember." };
    }
    case "governors": {
      for (const g of s.governors) g.relation = clamp100(g.relation + 15);
      act(s, "buyGovernors", { elite: 10 });
      s.gov.corruption = clamp100(s.gov.corruption + 1); s.me.evidence = clamp100(s.me.evidence + 4);
      return { ok: true, message: "Every governor is now your friend, for as long as the money flows." };
    }
  }
  void rng;
  return fail("Nothing happened.");
}

// ---------------------------------------------------------------- losing power
export function overthrow(s: FixState, cause: "coup" | "uprising"): string {
  const text = cause === "coup" ? "Soldiers seized the villa and state television. You are no longer President." : "Millions filled the streets and the army refused to fire on them. You are no longer President.";
  finishTerm(s, "removed", text, cause);
  return text;
}
/** After losing an election: cancel the result. Needs INEC, emergency powers and the army's tolerance. */
export function annulChance(s: FixState): number {
  const P = s.rule;
  return clamp(0.2 + 0.003 * P.inecControl + 0.004 * (s.groups.military - 40) + 0.003 * (P.eliteLoyalty - 40) - 0.002 * P.streetAnger + (emergencyOn(s) ? 0.1 : 0), 0.08, 0.85);
}
export function canAnnul(s: FixState): string | null {
  const last = s.terms[s.terms.length - 1];
  if (!s.ended || !s.election || !last || last.result !== "lost") return "There is no lost election to annul.";
  if (s.rule.inecControl < 25 && !emergencyOn(s)) return "You need control of INEC (25%+) or a state of emergency to annul an election.";
  return null;
}
export function annulElection(s: FixState): PResult {
  const block = canAnnul(s); if (block) return fail(block);
  const roll = subRng(s.meta.seed, "annul", s.term, s.month).next();
  const ok = roll < annulChance(s);
  s.terms.pop(); s.ended = null; s.done = false; s.election = null;
  if (ok) {
    s.rule.termExtra = 12;
    act(s, "annul", { democracy: -25, anger: 20, intl: 15, elite: -5, coup: 6 });
    pushNews(s, { source: `annul:${s.month}`, headline: "Election results annulled", body: "The President says the vote was 'compromised by foreign interference'. The opposition calls it a coup in civilian clothes.", tone: "bad" });
    return { ok: true, message: "The result is annulled. You stay in office, and half the country wants you out." };
  }
  const text = overthrow(s, "coup");
  return { ok: false, message: `The generals refused to back you. ${text}` };
}

// ---------------------------------------------------------------- the constitution
export function amendConstitution(s: FixState): PResult {
  s.rule.maxTerms = 99;
  act(s, "noTermLimits", { democracy: -18, anger: 12, intl: 12, elite: -2 });
  pushNews(s, { source: `amend:${s.month}`, headline: "Assembly scraps presidential term limits", body: "Lawmakers voted to allow the President to seek unlimited terms. Opposition leaders walked out.", tone: "bad" });
  return { ok: true, message: "Term limits are gone. You may stand again and again." };
}

// ---------------------------------------------------------------- elections
export const riggingBonus = (s: FixState) => (s.rule ? s.rule.inecControl * 0.12 : 0);

// ---------------------------------------------------------------- monthly
export function powerMonthly(s: FixState, rng: Rng) {
  const P = s.rule;
  const lawD = deterrence(s);
  const press = P.pressFreedom / 100;

  // lawmakers: some steal, some are caught
  let openCases = s.events.filter((e) => e.tpl === "lmCase" && e.status === "open").length;
  for (const lm of s.lawmakers) {
    if (lm.status === "jailed" || lm.status === "executed") continue;
    if (lm.status === "exposed" && s.flags[`exposed:${lm.id}`] !== undefined && s.month - (s.flags[`exposed:${lm.id}`] as number) >= 3) {
      const convict = rng.chance(0.2 + 0.7 * (P.judiciary / 100));
      if (convict) { const t = punish(s, lm, "courts"); pushReport(s, { title: `${lm.name}: the courts decide`, tone: "good", lines: [t] }); }
      else { lm.status = "active"; lm.loyalty = clamp100(lm.loyalty - 10); lm.greed = clamp100(lm.greed + 8); pushReport(s, { title: `${lm.name} walks free`, tone: "bad", lines: ["The judge threw the case out for 'lack of evidence'. Weak courts protect big men."] }); pushNews(s, { source: `acquit:${lm.id}`, headline: `${lm.name} cleared by court`, body: "Critics say the courts are for sale.", tone: "bad" }); P.judiciary = clamp100(P.judiciary - 1); }
      delete s.flags[`exposed:${lm.id}`];
      continue;
    }
    const controlled = lm.status === "controlled" || lm.status === "protected";
    const p = (lm.greed / 100) * 0.024 * (1 - lawD) * (controlled ? 1.3 : 1);
    if (!rng.chance(p)) continue;
    const amount = Math.round(rng.range(15, 110) * (0.6 + lm.greed / 80));
    lm.stolen += amount;
    s.gov.corruption = clamp100(s.gov.corruption + 0.12);
    s.fin.treasury = Math.max(0, s.fin.treasury - amount * 0.25);
    const caught = !controlled && openCases < 2 && rng.chance(0.28 + 0.4 * press + 0.002 * s.gov.transparency);
    if (caught) {
      lm.evidence = clamp100(Math.max(lm.evidence, 70));
      s.flags.caseLm = lm.id; s.flags.caseAmount = amount;
      createEvent(s, "lmCase", lm.stateId);
      openCases++;
    }
  }
  // controlled lawmakers: files can leak (only if the press is free enough to publish them)
  for (const lm of s.lawmakers) {
    if (lm.status !== "controlled") continue;
    if (rng.chance(0.012 * (0.3 + press))) {
      lm.status = "active"; lm.loyalty = clamp100(lm.loyalty - 40);
      s.me.evidence = clamp100(s.me.evidence + 12); s.me.scandals += 1; s.gov.trust = clamp100(s.gov.trust - 3.5);
      pushNews(s, { source: `bm-leak:${lm.id}:${s.month}`, headline: "Blackmail file on lawmaker leaked, points to presidency", body: `${lm.name} says the President held a dossier over them.`, tone: "bad", stateId: lm.stateId });
    }
  }
  // INEC bribery can be exposed
  if (P.inecControl > 0 && rng.chance(0.012 + 0.04 * (P.inecControl / 100) * press)) {
    P.inecExposed++; P.inecControl = clamp100(P.inecControl - 35); s.me.scandals += 1; s.me.evidence = clamp100(s.me.evidence + 12);
    act(s, "inecExposed", { democracy: -6, anger: 10, intl: 8, trust: -5 });
    pushNews(s, { source: `inec-exposed:${s.month}`, headline: "Whistleblower reveals payments to electoral commission", body: "Observers demand an inquiry. INEC's head has resigned.", tone: "bad" });
  }
  // laws breed resentment: lawmakers' loyalty slips a little with each rung, harder for the greedy
  if (P.lawLevel > 0) for (const lm of sitting(s)) if (lm.status === "active") lm.loyalty = clamp100(lm.loyalty - 0.12 * P.lawLevel * (lm.greed / 60));
  // otherwise loyalty drifts back toward each party's baseline
  for (const lm of sitting(s)) if (lm.status === "active") lm.loyalty = clamp100(lm.loyalty + 0.05 * ((lm.party === "NPP" ? 60 : 35) + (s.gov.approval - 45) * 0.3 - lm.loyalty));
  P.deterrence = P.deterrence * 0.975;
  P.abuse = P.abuse * 0.975;

  // ----- danger meters
  const emerg = emergencyOn(s), shut = shutdownOn(s);
  const overstay = Math.max(0, s.month - (s.termStart + 48));
  const tA = clamp100(30 + (50 - s.gov.happiness) * 1.1 + 0.3 * (s.eco.foodInflation - 25) - (emerg ? 15 : 0) - (shut ? 12 : 0) + (overstay > 0 ? 14 : 0) + (P.democracy < 45 ? (45 - P.democracy) * 0.25 : 0) + 0.12 * P.abuse);
  P.streetAnger = clamp100(P.streetAnger + 0.14 * (tA - P.streetAnger));
  if (s.flags.emergencyWas && !emerg) { P.streetAnger = clamp100(P.streetAnger + 10); }
  s.flags.emergencyWas = emerg;
  if (s.flags.shutdownWas && !shut) { P.streetAnger = clamp100(P.streetAnger + 5); }
  s.flags.shutdownWas = shut;

  const purgeEcho = typeof s.flags.purgeEcho === "number" && s.month >= (s.flags.purgeEcho as number) && s.month < (s.flags.purgeEcho as number) + 6 ? 9 : 0;
  const tC = clamp100(6 + 0.45 * Math.max(0, P.streetAnger - 35) + Math.max(-8, 0.5 * (50 - s.groups.military)) + Math.max(-8, 0.3 * (50 - P.eliteLoyalty)) + 0.2 * P.abuse + (P.democracy < 40 ? (40 - P.democracy) * 0.25 : 0) + 0.25 * Math.max(0, P.intlPressure - 60) + purgeEcho + staffCoup(s) + (overstay > 0 ? 8 : 0));
  P.coupRisk = clamp100(P.coupRisk + 0.13 * (tC - P.coupRisk));
  P.intlPressure = clamp100(P.intlPressure * 0.985 + (overstay > 0 ? 0.7 : 0));
  const eTarget = clamp100(0.5 * (s.governors.reduce((a, g) => a + g.relation, 0) / Math.max(1, s.governors.length)) + 0.3 * s.assembly.support + 0.2 * (50 + lawmakerLoyalty(s) * 2));
  P.eliteLoyalty = clamp100(P.eliteLoyalty + 0.1 * (eTarget - P.eliteLoyalty));
  // democracy only slowly heals, and only if you stop abusing power
  const recent = typeof s.flags.lastActMonth === "number" ? s.month - (s.flags.lastActMonth as number) : 99;
  if (recent >= 6 && P.democracy < 72) P.democracy = clamp100(P.democracy + 0.15);
  if (P.pressFreedom < 60 && recent >= 6) P.pressFreedom = clamp100(P.pressFreedom + 0.3);
  if (overstay > 0) P.democracy = clamp100(P.democracy - 0.4);

  // ----- consequences of the meters (as events)
  const has = (tpl: string) => s.events.some((e) => e.tpl === tpl && e.status === "open");
  const bigCity = () => rng.pick(["NG-LA", "NG-KN", "NG-FC", "NG-RI", "NG-OY"]);
  if (P.streetAnger > 70 && !has("megaProtest") && rng.chance(0.1 + (P.streetAnger - 70) / 120)) createEvent(s, "megaProtest", bigCity());
  if (P.coupRisk > 60 && !has("coupAttempt") && rng.chance(0.03 + (P.coupRisk - 60) / 150)) createEvent(s, "coupAttempt", "NG-FC");
  if (P.intlPressure > 70 && !has("sanctions") && !s.flags.sanctionsAt || (P.intlPressure > 70 && typeof s.flags.sanctionsAt === "number" && s.month - (s.flags.sanctionsAt as number) > 10 && !has("sanctions") && rng.chance(0.1))) { s.flags.sanctionsAt = s.month; createEvent(s, "sanctions", "NG-FC"); }
  if (P.eliteLoyalty < 28 && !has("eliteRevolt") && rng.chance(0.08)) createEvent(s, "eliteRevolt", "NG-FC");
  // while sanctions bite, the economy feels it
  removeMods(s, "meters");
  const fx: Record<string, number> = {};
  if (P.intlPressure > 60) { fx.investor = -(P.intlPressure - 60) * 0.18; fx.fxSupply = -(P.intlPressure - 60) * 0.012; }
  if (P.streetAnger > 60) fx.happiness = -(P.streetAnger - 60) * 0.05;
  if (Object.keys(fx).length) addMod(s, "meters", "Political climate", fx as never, { duration: null });
  // total revolution
  P.uprising = P.streetAnger >= 92 ? P.uprising + 1 : 0;
  if (P.uprising >= 4 && !s.ended) overthrow(s, "uprising");
  void calMonth;
}

export function relationLabel(lm: Lawmaker): string { return lm.loyalty >= 75 ? "Devoted" : lm.loyalty >= 55 ? "Friendly" : lm.loyalty >= 38 ? "Wavering" : "Hostile"; }
export const STATUS_LABEL: Record<LmStatus, string> = { active: "Sitting", exposed: "Exposed", jailed: "Jailed", executed: "Executed", controlled: "Under your thumb", protected: "Protected" };
export { TOWN };
