/**
 * Accountability. Everyone you appoint can be warned, prosecuted, jailed or executed, and then they are GONE: they
 * never return to the cabinet, the governors' mansions or the Assembly. Jailed people eventually come out, angry.
 * Your backers also expect something for their money, and there are ways around them. All people are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Backer, FixState, Governor, Portfolio } from "./types";
import { clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";
import { removeMinister, sack } from "./cabinet";
import { ripple } from "./ripples";
import { act } from "./act";

const ZONE: Record<string, string> = { NC: "North-Central", NE: "North-East", NW: "North-West", SE: "South-East", SS: "South-South", SW: "South-West" };
const FIRST = ["Aminu", "Kayode", "Ifeanyi", "Hassan", "Bassey", "Tamuno", "Yakubu", "Chiedu", "Sadiq", "Olumide", "Ngozi", "Hadiza"];
const LAST = ["Waziri", "Adeniyi", "Okoye", "Garuba", "Etuk", "Danbaba", "Nwosu", "Lawal", "Bakare", "Umar", "Eze", "Oyelaran"];

// ---------------------------------------------------------------- the law decides
const VERB = ["reprimanded", "forced to hand back the loot", "sent to prison", "given a life sentence", "sentenced to death"];
const stateOfZone = (zone: string) => Object.values(STATE_BY_ID).find((x) => x.zone === zone)?.id ?? "NG-FC";

/** the punishment a minister gets under the law as it stands */
export function prosecuteMinister(s: FixState, portfolio: Portfolio): string {
  const m = s.cabinet.members[portfolio];
  if (!m) return "The post is already vacant.";
  const level = s.rule.lawLevel;
  const own = m.faction === "crony" || m.faction === "loyalist";
  const others = Object.values(s.cabinet.members).filter((x) => x && x.portfolio !== portfolio);
  if (level === 0) { m.integrity = Math.min(100, m.integrity + 3); m.mood = clamp100(m.mood - 6); return `${m.name} was reprimanded. The law is too weak to do more. Everyone noticed.`; }
  s.rule.convicted++;
  s.rule.deterrence = clamp100(s.rule.deterrence + [0, 3, 8, 12, 20][level]);
  const text = `${m.name} was ${VERB[level]}.`;
  if (level === 1) { s.fin.treasury += 12; sack(s, portfolio); }
  else if (level === 4) {
    removeMinister(s, portfolio, "executed");
    s.rule.executions++; act(s, "execution", { intl: 8, anger: 3, democracy: -2, elite: -3 });
    ripple(s, "execute", { name: m.name, stateId: stateOfZone(m.zone || "NC") });
  } else {
    removeMinister(s, portfolio, "jailed", level === 2 ? s.month + 30 : undefined);
    act(s, "prison", { elite: -2 });
    ripple(s, "jail", { name: m.name, stateId: stateOfZone(m.zone || "NC") });
  }
  for (const o of others) if (o) { o.integrity = Math.min(100, o.integrity + 3 + level); o.mood = clamp100(o.mood - 3 - level); }
  if (own) for (const b of s.backers) b.mood = clamp100(b.mood - (level === 4 ? 14 : 7) * b.power);
  s.gov.trust = clamp100(s.gov.trust + 2.5);
  s.gov.corruption = clamp100(s.gov.corruption - 0.5 * level);
  s.flags.lastPunish = s.month; delete s.flags.hollowWarn;
  pushNews(s, { source: `pm:${m.id}:${s.month}`, headline: level === 4 ? `${m.name} sentenced to death` : level >= 2 ? `${m.name} jailed` : `${m.name} hands back stolen funds`, body: text, tone: "good" });
  return `${text} Every other minister has taken notice.`;
}

function newGovernor(s: FixState, old: Governor, rng: Rng): Governor {
  const party = rng.chance(0.55) ? old.party : old.party === "NPP" ? "PRA" : "NPP";
  return { zone: old.zone, name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`, party, relation: 40, ambition: rng.int(20, 80) };
}
export function prosecuteGovernor(s: FixState, zone: string): string {
  const i = s.governors.findIndex((g) => g.zone === zone);
  if (i < 0) return "Unknown zone.";
  const g = s.governors[i];
  const level = s.rule.lawLevel;
  const rng = subRng(s.meta.seed, "newgov", zone, s.month);
  const stateId = stateOfZone(zone);
  if (level === 0) { g.relation = clamp100(g.relation - 8); return `Governor ${g.name} was reprimanded. He laughed it off.`; }
  s.rule.convicted++; s.rule.deterrence = clamp100(s.rule.deterrence + [0, 4, 9, 14, 22][level]);
  const text = `Governor ${g.name} was ${VERB[level]}.`;
  if (level === 1) { s.fin.treasury += 25; g.relation = clamp100(g.relation - 14); return `${text} He stays in office, humiliated and hostile.`; }
  s.gone.push({ id: `gov-${g.name}`, name: `Gov. ${g.name}`, role: `Governor, ${ZONE[zone]}`, how: level === 4 ? "executed" : "jailed", month: s.month, releaseAt: level === 2 ? s.month + 30 : undefined, stateId });
  s.governors[i] = newGovernor(s, g, rng);
  for (const [id, r] of Object.entries(s.regions)) if (STATE_BY_ID[id]?.zone === zone) r.unrest = clamp100(r.unrest + 6);
  if (level === 4) { s.rule.executions++; act(s, "execution", { intl: 9, anger: 4, democracy: -3, elite: -5 }); ripple(s, "execute", { name: `Gov. ${g.name}`, stateId }); }
  else { act(s, "prison", { elite: -3 }); ripple(s, "jail", { name: `Gov. ${g.name}`, stateId }); }
  s.flags.lastPunish = s.month;
  pushNews(s, { source: `pg:${zone}:${s.month}`, headline: level === 4 ? `Governor ${g.name} sentenced to death` : `Governor ${g.name} jailed`, body: `${text} ${s.governors[i].name} has been sworn in as the new governor.`, tone: "good", stateId });
  return `${text} ${s.governors[i].name} is the new governor of the ${ZONE[zone]}.`;
}

// ---------------------------------------------------------------- monthly: prisoners come out, and the backers come knocking
export function officialsMonthly(s: FixState) {
  const rng = subRng(s.meta.seed, "release", s.month);
  for (const l of s.lawmakers) {
    if (l.status === "jailed" && l.releaseAt !== undefined && s.month >= l.releaseAt) {
      l.status = "released";
      pushNews(s, { source: `rel:${l.id}`, headline: `${l.name} freed from prison`, body: "He walked out of prison to a crowd of supporters and said he was 'a victim of politics'.", tone: "bad", stateId: l.stateId });
      s.enemies.push({ id: `rel-${l.id}`, name: l.name.replace(/^(Sen\.|Hon\.) /, ""), reason: "You put him in prison and he served his time", portrait: l.portrait, plan: "leaks", power: 35, grudge: 82, zone: STATE_BY_ID[l.stateId]?.zone ?? "NC", status: "active", since: s.month });
      s.timeline.push({ month: s.month, title: `${l.name} is out of prison`, text: "He is free, bitter and well informed.", tone: "bad", chain: "release" });
    }
  }
  for (const g of s.gone) {
    if (g.how === "jailed" && g.releaseAt !== undefined && s.month >= g.releaseAt) {
      g.how = "released";
      pushNews(s, { source: `relg:${g.id}`, headline: `${g.name} freed after serving his sentence`, body: "He says he was punished for 'refusing to bow'. Crowds greeted him at the gate.", tone: "bad" });
      s.enemies.push({ id: `rel-${g.id}`, name: g.name.replace(/^Gov\. /, ""), reason: `You jailed him (${g.role})`, portrait: { skin: rng.int(1, 5), hair: rng.int(0, 3), style: rng.int(0, 3), accent: rng.int(0, 4) }, plan: g.role.startsWith("Governor") ? "rival" : "leaks", power: g.role.startsWith("Governor") ? 48 : 32, grudge: 80, zone: "NC", status: "active", since: s.month });
      s.timeline.push({ month: s.month, title: `${g.name} is out of prison`, text: "He has a grudge and a lot of free time.", tone: "bad", chain: "release" });
    }
  }
  // the first month in office: the backers come to see what they got
  if (s.staff?.picked && !s.flags.ultimatum && s.month >= 1 && s.backers.length) {
    const avg = s.backers.reduce((a, b) => a + b.mood, 0) / s.backers.length;
    s.flags.ultimatum = s.month;
    if (avg < 56) createEvent(s, "backerUltimatum", "NG-FC");
  }
}

// ---------------------------------------------------------------- backers: gifts and ways around them
export const BACKER_GIFTS = [
  { id: "board", label: "Give his nominee a board seat", explain: "A seat on an oil company or port board. Cheap, quiet, mildly corrupt.", cost: 0, mood: 10, corruption: 0.4, evidence: 1 },
  { id: "ambassador", label: "Make his man an ambassador", explain: "Foreign posting for a relative or ally. Costs prestige, not cash.", cost: 4, mood: 14, corruption: 0.2, evidence: 0 },
  { id: "oilblock", label: "Give him an oil-lifting licence", explain: "The big prize. Everyone will want to know how he got it.", cost: 0, mood: 26, corruption: 1.6, evidence: 4 },
  { id: "praise", label: "Praise him in public", explain: "A speech about 'the elders who made this possible'. Free; works once.", cost: 0, mood: 6, corruption: 0, evidence: 0 },
] as const;
export function giftBlock(s: FixState, b: Backer, id: string): string | null {
  const g = BACKER_GIFTS.find((x) => x.id === id); if (!g) return "Unknown gift.";
  const cd = s.flags[`cd:gift:${b.id}:${id}`]; if (typeof cd === "number" && s.month < cd) return "Not again yet.";
  if (g.cost * (0.6 + 0.4 * s.eco.priceLevel / 100) > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function giveGift(s: FixState, backerId: string, id: string): { ok: boolean; message: string } {
  const b = s.backers.find((x) => x.id === backerId), g = BACKER_GIFTS.find((x) => x.id === id);
  if (!b || !g) return { ok: false, message: "Unknown." };
  const block = giftBlock(s, b, id); if (block) return { ok: false, message: block };
  s.fin.treasury -= g.cost * (0.6 + 0.4 * s.eco.priceLevel / 100);
  b.mood = clamp100(b.mood + g.mood); b.owed = Math.max(0, b.owed - g.mood);
  s.gov.corruption = clamp100(s.gov.corruption + g.corruption); s.me.evidence = clamp100(s.me.evidence + g.evidence);
  s.flags[`cd:gift:${b.id}:${id}`] = s.month + 8;
  return { ok: true, message: `${b.name} is pleased (${g.label.toLowerCase()}).${g.evidence ? " It leaves a paper trail." : ""}` };
}

// ---------------------------------------------------------------- templates
const unhappy = (s: FixState) => s.backers.filter((b) => b.mood < 56);
const govOf = (s: FixState) => s.governors.find((g) => g.zone === s.flags.lootZone);
const loyalCount = (s: FixState) => Object.values(s.cabinet.members).filter((m) => m && (m.faction === "crony" || m.faction === "loyalist")).length;
const prosecuteLabel = (s: FixState) => (s.rule.lawLevel === 0 ? "Prosecute (the law is weak: a reprimand)" : s.rule.lawLevel === 1 ? "Prosecute: seize the loot" : s.rule.lawLevel === 2 ? "Prosecute: send him to prison" : s.rule.lawLevel === 3 ? "Prosecute: life in prison" : "Prosecute: death sentence");

export const OFFICIAL_TEMPLATES: unknown[] = [
  {
    id: "governorLoot", kind: "case" as const, urgency: 2,
    onCreate: (s: FixState) => { const g = s.governors[(s.month * 7 + s.me.scandals) % s.governors.length]; s.flags.lootZone = g.zone; s.flags.lootAmt = 40 + ((s.month * 13) % 90); },
    title: (s: FixState) => { const g = govOf(s); return g ? `Governor ${g.name} caught diverting ${nb(Number(s.flags.lootAmt ?? 60))}` : "A governor is caught stealing"; },
    cause: (s: FixState) => { const g = govOf(s); return `${g ? `Governor ${g.name} (${g.party}, ${ZONE[g.zone]})` : "A governor"} allegedly diverted ${nb(Number(s.flags.lootAmt ?? 60))} meant for schools and roads. He is popular at home and has the zone's lawmakers in his pocket. Under today's law the punishment is: ${["a reprimand", "seizing the loot", "prison", "life in prison", "death"][s.rule.lawLevel]}. Other governors are watching what you do.`; },
    options: [
      { id: "prosecute", label: "Prosecute", explain: "The courts decide, and the law as it stands is applied.", cost: 5, tradeoff: "His zone will not forgive you, and he will not go quietly.", unc: "medium" as const, dyn: (s: FixState) => ({ label: prosecuteLabel(s) }), chance: (s: FixState) => 0.3 + 0.5 * (s.rule.judiciary / 100), win: { run: (s: FixState) => prosecuteGovernor(s, String(s.flags.lootZone)) }, lose: { judiciary: -1, trust: -1, run: (s: FixState) => { const g = govOf(s); if (g) g.relation = clamp100(g.relation - 12); return `The case collapsed. ${g?.name ?? "The governor"} walked free, richer and angrier. He is telling people you are afraid of him.`; } }, winText: "", loseText: "" },
      { id: "leverage", label: "Quietly keep the file as leverage", explain: "He votes your way from now on.", cost: 0, tradeoff: "If it leaks, it is your scandal.", unc: "low" as const, chance: () => 0.85, win: { elite: 2, run: (s: FixState) => { const g = govOf(s); if (g) g.relation = clamp100(g.relation + 12); return `${g?.name ?? "He"} saw the file and became very friendly.`; } }, lose: { run: (s: FixState) => { const g = govOf(s); if (g) g.relation = clamp100(g.relation - 8); return "He called your bluff."; } }, winText: "", loseText: "" },
      { id: "cut", label: "Take a cut and look away", explain: "Everybody in the villa eats.", cost: 0, tradeoff: "A paper trail.", unc: "high" as const, chance: () => 0.85, win: { wealth: 25, evidence: 6, corruption: 1 }, lose: { evidence: 10, scandal: 1, trust: -3 }, winText: "A bag was delivered to your wife's tailor.", loseText: "The bag was traced to you." },
    ],
    expire: { corruption: 1.2, trust: -2, run: (s: FixState) => { const g = govOf(s); if (g) g.relation = clamp100(g.relation + 3); return g ? `Governor ${g.name} concluded that nobody can touch him.` : undefined; } }, expireText: () => "Governors concluded that nobody can touch them.",
  },
  {
    id: "backerUltimatum", kind: "request" as const, urgency: 1,
    title: () => "Your backers have seen your cabinet list",
    cause: (s: FixState) => `${unhappy(s).map((b) => b.name).join(", ") || "Your backers"} came to the villa together. "We put you here. You gave the ministries to strangers who never paid a naira. What do we tell the people who gave us money for you?" The room is very quiet.`,
    options: [
      { id: "appease", label: "Give them contracts and board seats", explain: "Pay what you owe, in the currency of Nigerian politics.", cost: 30, tradeoff: "Money leaks, and it creates a paper trail.", unc: "low" as const, chance: () => 0.95, win: { corruption: 1.2, evidence: 3, run: (s: FixState) => { for (const b of s.backers) if (b.mood < 60) { b.mood = clamp100(b.mood + 22); b.owed = Math.max(0, b.owed - 30); } return "The three men left smiling. A road contract and two board seats changed hands before lunch."; } }, lose: {}, winText: "", loseText: "" },
      { id: "deputies", label: "Make their nominees permanent secretaries and special advisers", explain: "A way around it: they get seats, your qualified ministers stay on top.", cost: 0, tradeoff: "Deputies steal quietly, and your ministers resent them.", unc: "medium" as const, chance: () => 0.8, win: { mods: { procurement: -1.5, capacity: -2 }, dur: 18, run: (s: FixState) => { s.flags.deputies = s.month; for (const b of s.backers) if (b.mood < 60) b.mood = clamp100(b.mood + 13); return "Three nominees became permanent secretaries. The ministers say it is like having an uncle in every office."; } }, lose: { run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood + 3); return "They accepted the posts and said it was not enough."; } }, winText: "", loseText: "" },
      { id: "promise", label: "Promise: 'in eight months, my own people will get their turn'", explain: "Buy time. They will check.", cost: 0, tradeoff: "If you do not deliver, they will not forget.", unc: "medium" as const, chance: (s: FixState) => 0.5 + 0.3 * (s.gov.trust / 100), win: { run: (s: FixState) => { const m = JSON.parse(String(s.flags.mems ?? "[]")) as unknown[]; m.push({ kind: "backerJobs", stateId: "NG-FC", due: s.month + 8, asked: s.month }); s.flags.mems = JSON.stringify(m); for (const b of s.backers) if (b.mood < 60) b.mood = clamp100(b.mood + 9); return "They nodded slowly. 'Eight months, Mr President.' Somebody wrote it down."; } }, lose: { run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood - 4); return "They did not believe a word."; } }, winText: "", loseText: "" },
      { id: "hold", label: "Hold the line: 'I owe the country, not you'", explain: "A clean break. The press will love it.", cost: 0, tradeoff: "They will make you pay, immediately and for a long time.", unc: "high" as const, chance: () => 0.95, win: { trust: 1.5, run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood - 16); s.assembly.support = clamp100(s.assembly.support - 8); s.flags.budgetBlockUntil = s.month + 8; ripple(s, "snub"); return "They left without a handshake. By evening, five senators had cancelled their meetings and the budget committee 'needed more time'."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { trust: -1, run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood - 10); s.assembly.support = clamp100(s.assembly.support - 5); ripple(s, "snub"); return "They waited, then took your silence as your answer."; } }, expireText: () => "Silence was taken as an answer.",
  },
];

export const COURT_TEMPLATES = [
  {
    id: "courtChallenge", kind: "power" as const, urgency: 1,
    title: () => "The Supreme Court rules on your stay in office",
    cause: (s: FixState) => `Seven judges will decide whether ${s.flags.illegitimate !== undefined ? "you may remain in office after your term" : "the amendment scrapping term limits is lawful"}. The streets are watching. So is the army.`,
    options: [
      { id: "obey", label: "Respect the court", explain: "The law wins.", cost: 0, tradeoff: s_tradeoff(), unc: "low" as const, chance: () => 1, win: { democracy: 10, anger: -14, intl: -8, trust: 4, run: (s: FixState) => { if (s.flags.illegitimate !== undefined) { s.flags.courtObeyed = s.month; return "You told the nation you will obey. You will leave office when the court says so."; } s.rule.maxTerms = 2; return "The amendment is struck down. Term limits are back."; } }, lose: {}, winText: "", loseText: "" },
      { id: "pack", label: "Pack the court with your own judges", explain: "Add judges overnight.", cost: 15, tradeoff: "If it works, nobody will trust the courts again.", unc: "high" as const, chance: (s: FixState) => 0.45 + 0.2 * (s.assembly.support / 100), win: { democracy: -10, judiciary: -25, intl: 8, anger: 6, run: () => "Three new judges were sworn in at midnight. The ruling now reads very differently." }, lose: { democracy: -6, judiciary: -10, anger: 12, intl: 10, coup: 4, run: () => "The Assembly refused the new judges. You now look weak and lawless at the same time." }, winText: "", loseText: "" },
      { id: "ignore", label: "Ignore the ruling", explain: "You are the president.", cost: 0, tradeoff: "Nothing stops you but the army.", unc: "high" as const, chance: () => 0.95, win: { democracy: -8, anger: 10, intl: 8, coup: 6, run: () => "The ruling was read out. Nobody enforced it. Lawyers wept on the courthouse steps." }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { democracy: -5, anger: 6, coup: 3 }, expireText: () => "You said nothing. The court's silence-breaking ruling was ignored by default.",
  },
];
function s_tradeoff() { return "You lose your place in history's longest chapter."; }

export const ALL_OFFICIAL = [...(OFFICIAL_TEMPLATES as object[]), ...COURT_TEMPLATES];
export interface OfficialTrigger { tpl: string; gap: number; p: (s: FixState) => number; place: (s: FixState, pick: <T>(a: T[]) => T) => string }
export const OFFICIAL_TRIGGERS: OfficialTrigger[] = [
  { tpl: "governorLoot", gap: 14, p: (s) => (s.month >= 6 ? 0.03 + 0.0004 * s.gov.corruption : 0), place: () => "NG-FC" },
];
export { loyalCount };
