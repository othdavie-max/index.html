import { I, bump, luckBonus } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt, uid } from "./util";

/** The "Yahoo boy" hustle as a small game: find clients, build trust, cash out, keep the heat down.
 *  The crime and court flow lives in crime.ts; this only decides when EFCC comes knocking. */
export interface Mark {
  id: string;
  name: string;
  kind: number;
  /** How much they could part with, 1-5. */
  deep: number;
  /** How suspicious they are, 0-100. */
  wary: number;
  trust: number;
  /** Times you worked them. */
  rounds: number;
}

const NAMES = ["Bob", "Linda", "Gary", "Susan", "Mike", "Karen", "Peter", "Helen", "Tom", "Nancy", "Frank", "Diane", "Greg", "Carol", "Ray", "Joyce"];
export const MARK_KINDS: { en: string; pcm: string; emoji: string }[] = [
  { en: "Lonely retiree", pcm: "Lonely old person", emoji: "👴" },
  { en: "Online shopper", pcm: "Online shopper", emoji: "🛒" },
  { en: "Crypto hobbyist", pcm: "Crypto person", emoji: "🪙" },
  { en: "Small-business owner", pcm: "Small business owner", emoji: "🏪" },
  { en: "Charity donor", pcm: "Charity donor", emoji: "🎗️" },
  { en: "Job seeker", pcm: "Person wey dey find job", emoji: "💼" },
];
export const KIT_NAMES = [["Old laptop", "Old laptop"], ["Good laptop and data", "Good laptop and data"], ["Fast setup, VPN, spare SIMs", "Fast setup, VPN, spare SIM"], ["Full operation", "Full operation"]] as const;
const KIT_COST = [0, 400_000, 1_500_000, 6_000_000];
const SESSIONS = 8;

export const isYahoo = (p: Player) => p.job?.id === "yahoo";
const num = (p: Player, k: string, d = 0) => Number(p.flags[k] ?? d);

export function marksOf(p: Player): Mark[] {
  try { return JSON.parse(String(p.flags.yahooMarks ?? "[]")) as Mark[]; } catch { return []; }
}
const save = (p: Player, m: Mark[]) => { p.flags.yahooMarks = JSON.stringify(m.slice(0, 8)); };
export const kitLevel = (p: Player) => num(p, "yahooKit");
export const skillOf = (p: Player) => num(p, "yahooSkill", 10);
export function sessionsLeft(p: Player): number {
  if (num(p, "yahooAge", -1) !== p.age) return SESSIONS;
  return num(p, "yahooLeft", SESSIONS);
}
function spendSession(p: Player) { p.flags.yahooAge = p.age; p.flags.yahooLeft = sessionsLeft(p) - 1; }

export function yahooBlock(p: Player): string | null {
  if (!isYahoo(p)) return T("You are not in that line of work", "You no dey that work");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (sessionsLeft(p) <= 0) return T("No more sessions this year", "No more session this year");
  return null;
}
const dataCost = (p: Player) => Math.round(I(p, 12_000));
const heatUp = (p: Player, n: number) => { p.crime.heat = clamp(p.crime.heat + n); };

export function hunt(p: Player): string {
  const b = yahooBlock(p);
  if (b) return b;
  if (p.money < dataCost(p)) return T(`You need ${naira(dataCost(p))} for data and airtime.`, `You need ${naira(dataCost(p))} for data and airtime.`);
  transact(p, { amount: -dataCost(p), reason: T("Data and airtime", "Data and airtime"), category: "crime" });
  spendSession(p);
  const found: Mark[] = [];
  const n = randInt(1, 2) + (kitLevel(p) >= 2 ? 1 : 0);
  for (let i = 0; i < n; i++) found.push({ id: uid(), name: pick(NAMES), kind: randInt(0, MARK_KINDS.length - 1), deep: clamp(randInt(1, 3) + (chance(0.2) ? 2 : 0) + (kitLevel(p) >= 3 ? 1 : 0), 1, 5), wary: randInt(15, 70), trust: 0, rounds: 0 });
  save(p, [...found, ...marksOf(p)]);
  heatUp(p, 1);
  return T(`You line up ${found.length} new client${found.length > 1 ? "s" : ""}.`, `You line up ${found.length} new client${found.length > 1 ? "s" : ""}.`);
}

export type Approach = "chat" | "story" | "pressure";

export function work(p: Player, id: string, how: Approach): string {
  const b = yahooBlock(p);
  if (b) return b;
  const ms = marksOf(p);
  const m = ms.find((x) => x.id === id);
  if (!m) return "";
  spendSession(p);
  m.rounds += 1;
  const sk = skillOf(p) + kitLevel(p) * 6 + p.stats.smarts / 5;
  const base = how === "chat" ? 0.62 : how === "story" ? 0.5 : 0.36;
  const win = chance(clamp(base + (sk - m.wary) / 200 + luckBonus(p), 0.1, 0.92));
  const gain = how === "chat" ? randInt(8, 16) : how === "story" ? randInt(14, 26) : randInt(20, 36);
  if (win) {
    m.trust = clamp(m.trust + gain);
    m.wary = clamp(m.wary - 3);
    heatUp(p, how === "pressure" ? 3 : 1);
    p.flags.yahooSkill = Math.min(100, skillOf(p) + 0.8);
    save(p, ms);
    return how === "chat" ? T(`${m.name} warms up to you.`, `${m.name} dey warm up to you.`) : how === "story" ? T(`${m.name} believes your story and wants to help.`, `${m.name} believe your story and wan help.`) : T(`${m.name} feels the pressure and leans in.`, `${m.name} feel the pressure and dey lean in.`);
  }
  m.wary = clamp(m.wary + (how === "pressure" ? 18 : 8));
  heatUp(p, how === "pressure" ? 6 : 2);
  if (m.wary > 85 || chance(how === "pressure" ? 0.25 : 0.06)) {
    save(p, ms.filter((x) => x.id !== id));
    heatUp(p, 8);
    return T(`${m.name} gets suspicious, blocks you and reports the account.`, `${m.name} suspect, block you and report the account.`);
  }
  save(p, ms);
  return T(`${m.name} goes quiet. They are getting suspicious.`, `${m.name} don quiet. E don dey suspect.`);
}

export function cashOut(p: Player, id: string): string {
  const b = yahooBlock(p);
  if (b) return b;
  const ms = marksOf(p);
  const m = ms.find((x) => x.id === id);
  if (!m) return "";
  spendSession(p);
  const pr = clamp(m.trust / 100 - m.wary / 220 + skillOf(p) / 400 + luckBonus(p), 0.05, 0.9);
  save(p, ms.filter((x) => x.id !== id));
  if (chance(pr)) {
    const amt = Math.round(I(p, rand(0.4, 1.2) * [0, 600_000, 2_200_000, 6_000_000, 14_000_000, 35_000_000][m.deep]));
    transact(p, { amount: amt, reason: T("Fraud proceeds", "Fraud proceeds"), category: "crime" });
    p.loot += amt;
    p.flags.yahooEarned = num(p, "yahooEarned") + amt;
    p.flags.yahooSkill = Math.min(100, skillOf(p) + 2);
    heatUp(p, 8 + m.deep * 3);
    bump(p, "reputation", -2);
    bump(p, "stress", 3);
    const o = [T("You cash it out and switch SIMs.", "You cash am out and change SIM.")];
    if (amt > I(p, 5_000_000)) o.push(T("Everyone in the area will notice your new money.", "Everybody for area go see your new money."));
    return T(`${m.name} sends ${naira(amt)}. `, `${m.name} send ${naira(amt)}. `) + o.join(" ");
  }
  heatUp(p, 10);
  return T(`${m.name} backs out at the last minute and reports it. The heat goes up.`, `${m.name} comot for last minute and report am. Heat don rise.`);
}

export function dropMark(p: Player, id: string): string {
  save(p, marksOf(p).filter((x) => x.id !== id));
  return T("You drop that client.", "You drop that client.");
}

export const kitCost = (p: Player) => (kitLevel(p) >= 3 ? 0 : Math.round(I(p, KIT_COST[kitLevel(p) + 1])));
export function upgradeKit(p: Player): string {
  if (!isYahoo(p)) return "";
  if (kitLevel(p) >= 3) return T("You already run the full operation.", "You don get full operation.");
  const c = kitCost(p);
  if (p.money < c) return T(`You need ${naira(c)}.`, `You need ${naira(c)}.`);
  transact(p, { amount: -c, reason: T("Equipment", "Equipment"), category: "crime" });
  p.flags.yahooKit = kitLevel(p) + 1;
  return T(`Upgraded: ${KIT_NAMES[kitLevel(p)][0]}.`, `Upgrade: ${KIT_NAMES[kitLevel(p)][1]}.`);
}

export function layLow(p: Player): string {
  const b = yahooBlock(p);
  if (b) return b;
  spendSession(p);
  p.crime.heat = clamp(p.crime.heat - 18);
  bump(p, "stress", -3);
  return T("You stay off the phone for a few weeks. The heat cools.", "You stay off phone for some weeks. Heat don cool.");
}

export const launderCost = (p: Player) => Math.round(Math.max(I(p, 100_000), Math.min(p.money * 0.08, I(p, 6_000_000))));
export function launder(p: Player): string {
  if (!isYahoo(p) || p.prison > 0) return "";
  const c = launderCost(p);
  if (p.money < c) return T(`Cleaning money costs ${naira(c)}.`, `To wash money cost ${naira(c)}.`);
  transact(p, { amount: -c, reason: T("Washing the money (POS and shops)", "Wash money (POS and shops)"), category: "crime" });
  p.crime.heat = clamp(p.crime.heat - 22);
  return T("You push the money through POS shops and a relative's business. It looks cleaner.", "You pass the money through POS shops and relative business. E look cleaner.");
}

export function settleContact(p: Player): string {
  if (!isYahoo(p) || p.prison > 0) return "";
  const c = Math.round(I(p, 800_000 + p.crime.heat * 40_000));
  if (p.money < c) return T(`Your contact wants ${naira(c)}.`, `Your contact want ${naira(c)}.`);
  transact(p, { amount: -c, reason: T("Settling a contact", "Settle contact"), category: "crime" });
  p.crime.heat = clamp(p.crime.heat - 25);
  return T("A friend in the right office says your name has been quietly removed from a list.", "One friend for correct office say dem don quietly remove your name from list.");
}

export function quitYahoo(p: Player): string {
  if (!isYahoo(p)) return "";
  p.job = null;
  p.flags.yahooMarks = "[]";
  bump(p, "stress", -6);
  return T("You delete the accounts and start over.", "You delete the accounts and start afresh.");
}

/** Called once a year while in the game. */
export function yahooYear(p: Player, lines: string[], pending: import("./types").Pending[]) {
  if (!isYahoo(p)) return;
  const flashy = p.money > 40_000_000 * p.index ? 0.05 : 0;
  const risk = clamp(0.01 + p.crime.heat / 280 + flashy + (p.vehicles.some((v) => v.luxury) ? 0.03 : 0) - kitLevel(p) * 0.01, 0.01, 0.6);
  save(p, marksOf(p).map((m) => ({ ...m, trust: clamp(m.trust - 15) })).filter((m) => m.trust > 0 || m.rounds === 0));
  if (chance(risk)) {
    pending.push({ kind: "event", id: "efcc_raid", data: { month: randInt(1, 12) } });
    lines.push(T("EFCC is asking questions in your area.", "EFCC dey ask question for your area."));
  }
}

export const YAHOO_EVENTS: EventDef[] = [
  {
    id: "efcc_raid",
    title: dual("EFCC at the door", "EFCC for door"),
    weight: () => 0,
    valid: isYahoo,
    init: (p) => ({ bribe: Math.round(I(p, rand(1_500_000, 6_000_000) * (1 + p.crime.heat / 60))) }),
    text: () => T("5 a.m. Heavy knocking. Men in jackets with EFCC on the back. Your phones and laptop are on the table.", "5 a.m. Heavy knock. Men wear jacket wey get EFCC for back. Your phones and laptop dey table."),
    choices: (p, d) => [
      { label: T("Run through the back", "Run pass back door"), sub: T("Risky, keeps your phones", "Risky, you go keep your phones"), run: (q) => {
        if (chance(0.45 + luckBonus(q))) { q.crime.heat = clamp(q.crime.heat - 15); return T("You get away. You are not sleeping at home again for a while.", "You escape. You no go sleep house again for small time."); }
        q.crime.cases.push({ id: uid(), charge: T("Online fraud and scams", "Online fraud and scam"), severity: 3, stage: "arrested", openedAge: q.age, evidence: 80, lawyer: "none", loot: Number(q.flags.yahooEarned ?? 0), remand: false, confessed: false, trialAge: q.age + 1 });
        return T("They catch you at the fence. You are arrested.", "Dem catch you for fence. Dem arrest you.");
      } },
      { label: T("Settle the team lead", "Settle the team lead"), sub: naira(Number(d.bribe)), disabled: p.money < Number(d.bribe) ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
        q.money -= Number(d.bribe);
        if (chance(0.55)) { q.crime.heat = clamp(q.crime.heat - 30); return T("The raid becomes a 'misunderstanding'. Naija.", "The raid turn 'misunderstanding'. Naija."); }
        q.crime.cases.push({ id: uid(), charge: T("Online fraud and scams", "Online fraud and scam"), severity: 3, stage: "arrested", openedAge: q.age, evidence: 85, lawyer: "none", loot: Number(q.flags.yahooEarned ?? 0), remand: false, confessed: false, trialAge: q.age + 1 });
        return T("He takes the money and the arrest anyway. You are in a cell.", "He collect the money and arrest you anyway. You dey cell.");
      } },
      { label: T("Cooperate", "Cooperate"), run: (q) => {
        q.crime.cases.push({ id: uid(), charge: T("Online fraud and scams", "Online fraud and scam"), severity: 3, stage: "arrested", openedAge: q.age, evidence: 70, lawyer: "none", loot: Number(q.flags.yahooEarned ?? 0), remand: false, confessed: false, trialAge: q.age + 1 });
        q.job = null; q.flags.yahooMarks = "[]";
        return T("You are taken in. You can get a lawyer from the Law tab.", "Dem carry you go. You fit get lawyer from the Law tab.");
      } },
    ],
  },
];
