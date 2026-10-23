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

const BASE_YAHOO_EVENTS: EventDef[] = [
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

// ---------------------------------------------------------------------------
// Random moments in the life
// ---------------------------------------------------------------------------
const pay = (q: Player, amt: number, why: string) => { const a = Math.min(Math.max(0, q.money), Math.round(amt)); if (a > 0) transact(q, { amount: -a, reason: why, category: "crime" }); return a; };
const earn = (q: Player, amt: number, why: string) => { const a = Math.round(amt); transact(q, { amount: a, reason: why, category: "crime" }); q.loot += a; q.flags.yahooEarned = Number(q.flags.yahooEarned ?? 0) + a; return a; };
const cool = (q: Player, n: number) => { q.crime.heat = clamp(q.crime.heat - n); };
const cantAfford = (p: Player, amt: number) => (p.money < amt ? T("Not enough cash", "Cash no reach") : false);
const yev = (id: string, title: [string, string], weight: number, text: [string, string], choices: EventDef["choices"], extraValid?: (p: Player) => boolean): EventDef => ({
  id, title: dual(title[0], title[1]), weight: (p) => (isYahoo(p) && (!extraValid || extraValid(p)) ? weight : 0), valid: isYahoo, text: () => T(text[0], text[1]), choices,
});

export const YAHOO_EXTRA: EventDef[] = [
  yev("yahoo_owambe", ["Owambe season", "Owambe season"], 3,
    ["A big owambe is coming and the boys are planning to spray naira like confetti. Everyone will see who is 'doing well'.", "Big owambe dey come and the boys wan spray naira like confetti. Everybody go see who dey 'do well'."],
    (p) => [
      { label: T("Spray big", "Spray big"), sub: naira(I(p, 1_500_000)), disabled: cantAfford(p, I(p, 1_500_000)), run: (q) => { pay(q, I(q, 1_500_000), T("Spraying at the owambe", "Spray for owambe")); bump(q, "reputation", 3); bump(q, "happiness", 6); q.crime.heat = clamp(q.crime.heat + 12); return T("You are the star of the night. Phones are out and every aunty has your name. So will EFCC.", "You be star of the night. Phones out and every aunty sabi your name. EFCC too go sabi."); } },
      { label: T("Spray small and watch", "Spray small and watch"), sub: naira(I(p, 100_000)), run: (q) => { pay(q, I(q, 100_000), T("Spraying at the owambe", "Spray for owambe")); bump(q, "happiness", 2); return T("You show face without showing off. Wise.", "You show face without too show off. Wise."); } },
      { label: T("Skip it", "Skip am"), run: (q) => { cool(q, 3); return T("You stay home. Nobody knows your business.", "You stay house. Nobody know your business."); } },
    ]),
  yev("yahoo_mugu_fights_back", ["The client is also a scammer", "Client na scammer too"], 2.5,
    ["Your best client suddenly asks you to 'invest' in his own deal. He is running a scam of his own. Mugu of the year.", "Your best client suddenly say make you 'invest' for him own deal. E dey run him own scam. Mugu of the year."],
    (p) => [
      { label: T("Send some money anyway", "Send some money"), sub: naira(I(p, 2_000_000)), disabled: cantAfford(p, I(p, 2_000_000)), run: (q) => { pay(q, I(q, 2_000_000), T("Sent to a fake investor", "Send to fake investor")); bump(q, "stress", 5); return T("The 'investment' vanishes. You just got scammed by a scammer. Your boys will never let you forget it.", "The 'investment' vanish. Scammer scam you. Your boys no go let you forget."); } },
      { label: T("Block him", "Block am"), run: (q) => { q.flags.yahooSkill = Math.min(100, skillOf(q) + 1); return T("Respect the hustle. You block him and learn something.", "Respect the hustle. You block am and learn something."); } },
      { label: T("Report him to the platform", "Report am to the platform"), run: (q) => { q.crime.heat = clamp(q.crime.heat + 5); return T("It feels righteous, until you remember what you do for a living.", "E feel righteous, till you remember wetin you dey do."); } },
    ], (p) => marksOf(p).length > 0),
  yev("yahoo_mama_asks", ["Mama asks questions", "Mama dey ask question"], 3,
    ["Your mother puts down her wrapper and looks at you. \"Which work is this? Where is all this money coming from?\" Your phone buzzes on the table.", "Your mama drop wrapper and look you. \"Which work be this? Where all this money dey come from?\" Your phone dey buzz for table."],
    (p) => [
      { label: T("\"IT consulting, Mama\"", "\"IT consulting, Mama\""), run: (q) => { bump(q, "stress", 3); q.family.happy = clamp(q.family.happy - 2); return T("She does not believe you but she stops asking. For now.", "She no believe but she stop to ask. For now."); } },
      { label: T("Give her money for church", "Give her money for church"), sub: naira(I(p, 300_000)), disabled: cantAfford(p, I(p, 300_000)), run: (q) => { pay(q, I(q, 300_000), T("Gift to Mama", "Gift for Mama")); q.family.happy = clamp(q.family.happy + 4); cool(q, 3); return T("Mama prays over you for ten minutes. Questions forgotten.", "Mama pray over you for ten minutes. She forget the question."); } },
      { label: T("Come clean", "Tell am the truth"), run: (q) => { q.family.happy = clamp(q.family.happy - 12); bump(q, "reputation", 1); bump(q, "stress", 8); return T("She cries, then prays, then asks you to stop. She means it.", "She cry, pray, then beg you to stop. She mean am."); } },
    ]),
  yev("yahoo_church_tithe", ["The prophet's blessing", "Prophet blessing"], 2,
    ["The prophet has noticed your big offerings. \"The Lord has blessed you, my son. A seed of ₦1,500,000 will close every door against your enemies.\"", "Prophet don notice your big offering. \"God don bless you, my son. Seed of ₦1,500,000 go close every door for your enemies.\""],
    (p) => [
      { label: T("Sow the seed", "Sow the seed"), sub: naira(I(p, 1_500_000)), disabled: cantAfford(p, I(p, 1_500_000)), run: (q) => { pay(q, I(q, 1_500_000), T("Seed to the prophet", "Seed for prophet")); cool(q, 15); bump(q, "reputation", 3); return T("The church is your cover now. Nobody asks where a generous man's money comes from.", "Church don be your cover. Nobody dey ask where generous man money dey come from."); } },
      { label: T("Give a small offering", "Give small offering"), sub: naira(I(p, 100_000)), run: (q) => { pay(q, I(q, 100_000), T("Offering", "Offering")); bump(q, "reputation", 1); return T("The prophet smiles politely. His eyes say 'not enough'.", "Prophet smile politely. Him eye talk 'e no reach'."); } },
      { label: T("Walk away", "Waka go"), run: () => T("You leave with your money and your sins.", "You leave with your money and your sins.") },
    ]),
  yev("yahoo_account_frozen", ["Account restricted", "Account restricted"], 2.5,
    ["Your bank sends an alert: your account has been restricted pending 'source of funds' documents. Your POS float is stuck too.", "Your bank send alert: dem restrict your account for 'source of funds' document. Your POS float don stuck too."],
    (p) => [
      { label: T("Pay an insider to release it", "Pay insider to release am"), sub: naira(I(p, 1_200_000)), disabled: cantAfford(p, I(p, 1_200_000)), run: (q) => { pay(q, I(q, 1_200_000), T("Settling a bank insider", "Settle bank insider")); cool(q, 6); return T("Your account is back in an hour. Your insider now knows too much.", "Your account return after one hour. The insider don sabi too much."); } },
      { label: T("Use another account", "Use another account"), run: (q) => { q.crime.heat = clamp(q.crime.heat + 8); const l = pay(q, q.money * 0.1, T("Fees on the cousin's account", "Fees for cousin account")); return T(`You route things through a cousin's account. ${naira(l)} in 'fees', and one more person in trouble if this goes wrong.`, `You route am through cousin account. ${naira(l)} for 'fees', and one more person wey fit enter trouble.`); } },
      { label: T("Wait it out", "Wait am out"), run: (q) => { bump(q, "stress", 5); q.crime.heat = clamp(q.crime.heat + 4); return T("Three weeks of begging the bank. They keep your name on a list.", "Three weeks of begging bank. Dem don put your name for list."); } },
    ]),
  yev("yahoo_apprentice", ["A small boy wants to learn", "Small boy wan learn"], 2,
    ["A younger guy from the street keeps following you. \"Oga, teach me the work. I will do anything.\"", "Small guy from street dey follow you. \"Oga, teach me the work. I go do anything.\""],
    (p) => [
      { label: T("Train him", "Train am"), sub: T("He pays a cut, but he talks too much", "E go pay cut, but e dey talk too much"), run: (q) => { const a = earn(q, I(q, rand(300_000, 900_000)), T("Cut from your apprentice", "Cut from your apprentice")); q.crime.heat = clamp(q.crime.heat + 7); return chance(0.2) ? T(`He pays ${naira(a)}, then brags about you at a bar. The heat is up.`, `He pay ${naira(a)}, then e brag about you for bar. Heat don rise.`) : T(`He brings in ${naira(a)} in his first month.`, `E bring ${naira(a)} for first month.`); } },
      { label: T("Send him away", "Send am go"), run: (q) => { bump(q, "reputation", 1); return T("Not your wahala. He finds someone else.", "No be your wahala. E go find another person."); } },
      { label: T("Tell him to go to school", "Tell am go school"), run: (q) => { bump(q, "happiness", 3); bump(q, "reputation", 2); return T("He looks at you like you are mad. Then he goes. Years later he thanks you.", "E look you like say you mad. Then e go. Years later e thank you."); } },
    ]),
  yev("yahoo_whale", ["The big client", "The big client"], 1.8,
    ["A 'client' abroad has real money, lots of it, and wants to move fast. This is the kind of thing that changes your life, or ends it.", "One 'client' abroad get real money, plenty, and wan move fast. This kind thing fit change your life, or end am."],
    (p) => [
      { label: T("Go all in", "Go all in"), sub: T("Huge payout, huge heat", "Huge money, huge heat"), run: (q) => { if (chance(0.5 + skillOf(q) / 300 + kitLevel(q) * 0.04)) { const a = earn(q, I(q, rand(15_000_000, 70_000_000)), T("Fraud proceeds", "Fraud proceeds")); q.crime.heat = clamp(q.crime.heat + 25); bump(q, "stress", 6); return T(`It works: ${naira(a)}. You will need to disappear for a while.`, `E work: ${naira(a)}. You go need disappear for small time.`); } q.crime.heat = clamp(q.crime.heat + 30); return T("It collapses. The client was a decoy. Your name is somewhere it should not be.", "E collapse. The client na decoy. Your name dey where e no suppose dey."); } },
      { label: T("Take a smaller slice", "Take small slice"), run: (q) => { const a = earn(q, I(q, rand(2_000_000, 8_000_000)), T("Fraud proceeds", "Fraud proceeds")); q.crime.heat = clamp(q.crime.heat + 10); return T(`You settle for ${naira(a)} and keep your head down.`, `You take ${naira(a)} and keep your head down.`); } },
      { label: T("Pass", "Pass"), run: (q) => { cool(q, 4); return T("Too good to be true usually is. Even in this business.", "Too good to be true no dey true. Even for this business."); } },
    ], (p) => skillOf(p) >= 25),
  yev("yahoo_boys_crew", ["The crew", "The crew"], 2,
    ["A group of boys runs a 'big setup' in a rented flat: shared laptops, shared clients, shared risk. They want you in.", "Some boys dey run 'big setup' for rented flat: shared laptop, shared client, shared risk. Dem wan carry you join."],
    (p) => [
      { label: T("Join the crew", "Join the crew"), sub: T("More income, more heat", "More money, more heat"), run: (q) => { const a = earn(q, I(q, rand(1_000_000, 4_000_000)), T("Crew share", "Crew share")); q.crime.heat = clamp(q.crime.heat + 12); q.flags.yahooSkill = Math.min(100, skillOf(q) + 3); return T(`The first month pays ${naira(a)}. You also learn faster. But if one of them is caught, you are all in the same boat.`, `First month pay ${naira(a)}. You learn faster too. But if one catch, una dey the same boat.`); } },
      { label: T("Stay solo", "Stay solo"), run: () => T("Fewer mouths, fewer leaks.", "Fewer mouth, fewer leak.") },
    ]),
  yev("yahoo_friend_arrested", ["A friend is picked up", "Your friend don enter wahala"], 2,
    ["News reaches you: one of your boys was picked up at a hotel. His girlfriend is calling you, crying. \"Please, help him.\"", "Gist reach you: one of your boys dem pick for hotel. Him girlfriend dey call you, dey cry. \"Abeg, help am.\""],
    (p) => [
      { label: T("Pay for his bail", "Pay him bail"), sub: naira(I(p, 1_000_000)), disabled: cantAfford(p, I(p, 1_000_000)), run: (q) => { pay(q, I(q, 1_000_000), T("Bail for a friend", "Bail for friend")); bump(q, "reputation", 2); q.crime.heat = clamp(q.crime.heat + 4); return T("He walks free and swears loyalty. You hope he means it.", "E waka comot and swear loyalty. You hope e mean am."); } },
      { label: T("Delete his number", "Delete him number"), run: (q) => { cool(q, 5); bump(q, "reputation", -3); bump(q, "stress", 4); return T("You wipe the chats and change your SIM. He will remember that.", "You wipe chat and change SIM. E go remember that one."); } },
      { label: T("Do nothing", "Do nothing"), run: (q) => { q.crime.heat = clamp(q.crime.heat + 5); return T("You wait. Nobody calls. Which is its own kind of scary.", "You wait. Nobody call. That one too dey scary."); } },
    ]),
  yev("yahoo_spiritualist", ["The spiritualist", "The spiritualist"], 1.5,
    ["Someone swears by a 'spiritual man' in Ibadan who sells charms to 'blind EFCC's eyes'. It costs a lot and nobody has any proof.", "Person swear for one 'spiritual man' for Ibadan wey dey sell charm to 'blind EFCC eye'. E cost well and nobody get proof."],
    (p) => [
      { label: T("Pay for the charm", "Pay for the charm"), sub: naira(I(p, 800_000)), disabled: cantAfford(p, I(p, 800_000)), run: (q) => { pay(q, I(q, 800_000), T("A 'protective' charm", "'Protection' charm")); bump(q, "stress", -5); return chance(0.15) ? T("Somehow a whole month passes with no problems. You tell everyone it works.", "A whole month pass with no wahala. You tell everybody say e work.") : T("You feel protected. That is all you got for the money.", "You feel protected. Na only that you get for the money."); } },
      { label: T("Laugh and leave", "Laugh and leave"), run: (q) => { q.flags.yahooSkill = Math.min(100, skillOf(q) + 0.5); return T("You keep your money and your focus.", "You keep your money and your focus."); } },
    ]),
  yev("yahoo_neighbours", ["Nosy neighbours", "Nosy neighbours"], 2.5,
    ["The woman downstairs asks again where you work. You have a new generator, three phones and a car that does not belong to anyone who 'works at a bank'.", "Woman for downstairs ask again where you dey work. You get new generator, three phones and motor wey no be bank staff own."],
    (p) => [
      { label: T("Give her a gift", "Give her gift"), sub: naira(I(p, 200_000)), disabled: cantAfford(p, I(p, 200_000)), run: (q) => { pay(q, I(q, 200_000), T("A gift for the neighbour", "Gift for neighbour")); cool(q, 3); return T("She becomes your biggest supporter. 'He is a good boy', she tells everyone.", "She turn your biggest supporter. 'Na good boy', she dey tell everybody."); } },
      { label: T("Move to a new area", "Move go new area"), sub: naira(I(p, 600_000)), disabled: cantAfford(p, I(p, 600_000)), run: (q) => { pay(q, I(q, 600_000), T("Moving costs", "Moving cost")); cool(q, 10); return T("A new flat, a new story. Nobody here knows you.", "New flat, new story. Nobody here know you."); } },
      { label: T("Ignore her", "Ignore her"), run: (q) => { q.crime.heat = clamp(q.crime.heat + 5); return T("Her questions turn into rumours.", "Her questions turn rumour."); } },
    ]),
  yev("yahoo_police_checkpoint", ["Checkpoint", "Checkpoint"], 2.5,
    ["Officers wave you down at a checkpoint at night. \"Open your phone. Show us your chats.\" Your screen is full of 'work' messages.", "Police wave you down for checkpoint for night. \"Open your phone. Show us your chat.\" Your screen full of 'work' message."],
    (p) => [
      { label: T("Settle them", "Settle them"), sub: naira(I(p, 150_000)), disabled: cantAfford(p, I(p, 150_000)), run: (q) => { pay(q, I(q, 150_000), T("Settling at a checkpoint", "Settle for checkpoint")); return T("They pocket the money and let you pass: 'Next time, be careful'.", "Dem collect money and let you pass: 'Next time, take care'."); } },
      { label: T("Refuse and argue", "Refuse and argue"), run: (q) => { if (chance(0.4)) { q.crime.cases.push({ id: uid(), charge: T("Online fraud and scams", "Online fraud and scam"), severity: 2, stage: "arrested", openedAge: q.age, evidence: 50, lawyer: "none", loot: Number(q.flags.yahooEarned ?? 0), remand: false, confessed: false, trialAge: q.age + 1 }); return T("They take you to the station and examine the phone. A case is opened.", "Dem carry you go station and check the phone. Dem open case."); } bump(q, "stress", 5); return T("They get tired of you and let you go, with a threat.", "Dem tire for you and let you go, with threat."); } },
      { label: T("Wipe the phone before they take it", "Wipe the phone before dem collect am"), run: (q) => { if (chance(0.5)) { cool(q, 6); return T("Clean as a whistle. They find nothing and are annoyed about it.", "Clean pass whistle. Dem no see anything and dem vex."); } q.crime.heat = clamp(q.crime.heat + 10); return T("They see you deleting. That is worse.", "Dem see you dey delete. That one worse."); } },
    ]),
];

export const YAHOO_EVENTS: EventDef[] = [...BASE_YAHOO_EVENTS, ...YAHOO_EXTRA];
