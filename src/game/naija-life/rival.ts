import { addCousin } from "./events6";
import { netWorthReal } from "./finance";
import { I, bump, eligibleJobs, luckBonus } from "./helpers";
import { transact } from "./ledger";
import { ownsPersonalCar } from "./vehicles";
import type { EventDef, Npc, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

// ---------------------------------------------------------------------------
// The rival: someone your age whose life you are always compared with
// ---------------------------------------------------------------------------
export interface Rival {
  npcId: string;
  /** Real (price-index adjusted) wealth. */
  wealth: number;
  drive: number;
  edu: 0 | 1 | 2;
  car: boolean;
  house: boolean;
  married: number;
  kids: number;
  beaten: number;
}
const RIVAL_NAMES: [string, string][] = [["Chinedu", "male"], ["Emeka", "male"], ["Tunde", "male"], ["Bola", "male"], ["Ngozi", "female"], ["Funke", "female"], ["Amina", "female"], ["Ibrahim", "male"], ["Kemi", "female"], ["Obinna", "male"]];

export function rivalOf(p: Player): Rival | null {
  try { const r = JSON.parse(String(p.flags.rival ?? "null")) as Rival | null; return r && p.npcs[r.npcId] ? r : null; } catch { return null; }
}
const saveRival = (p: Player, r: Rival) => { p.flags.rival = JSON.stringify(r); };
export const rivalNpc = (p: Player): Npc | null => { const r = rivalOf(p); return r ? p.npcs[r.npcId] : null; };

export function ensureRival(p: Player) {
  if (p.age < 6 || p.flags.rival) return;
  const [name, gender] = pick(RIVAL_NAMES);
  const n = addCousin(p);
  n.name = `${name} ${p.surname}`;
  n.gender = gender as "male" | "female";
  n.ageDelta = randInt(-1, 2);
  n.closeness = randInt(30, 55);
  n.traits = ["rival", ...n.traits];
  const r: Rival = { npcId: n.id, wealth: Math.max(100_000, p.fam.income * rand(0.5, 1.4)), drive: rand(0.7, 1.4), edu: 0, car: false, house: false, married: 0, kids: 0, beaten: 0 };
  saveRival(p, r);
}
const first = (n: Npc) => n.name.split(" ")[0];

/** Compare you with your rival across the things Nigerian families compare. */
export function rivalCompare(p: Player): { key: string; en: string; pcm: string; you: string; them: string; ahead: boolean | null }[] {
  const r = rivalOf(p);
  if (!r) return [];
  const mine = netWorthReal(p);
  const edu = (v: number) => (v >= 2 ? T("Degree", "Degree") : v === 1 ? T("Secondary", "Secondary") : T("None", "None"));
  const myEdu = p.edu === "tertiary" ? 2 : p.edu === "secondary" ? 1 : 0;
  const cmp = (a: number, b: number): boolean | null => (a === b ? null : a > b);
  return [
    { key: "wealth", en: "Net worth", pcm: "Net worth", you: naira(Math.max(0, mine) * p.index), them: naira(r.wealth * p.index), ahead: cmp(mine, r.wealth) },
    { key: "edu", en: "Education", pcm: "Education", you: edu(myEdu), them: edu(r.edu), ahead: cmp(myEdu, r.edu) },
    { key: "car", en: "Car", pcm: "Car", you: ownsPersonalCar(p) ? "✓" : "✗", them: r.car ? "✓" : "✗", ahead: cmp(Number(ownsPersonalCar(p)), Number(r.car)) },
    { key: "house", en: "House", pcm: "House", you: p.houses.length ? "✓" : "✗", them: r.house ? "✓" : "✗", ahead: cmp(Number(p.houses.length > 0), Number(r.house)) },
    { key: "married", en: "Married", pcm: "Married", you: p.spouse ? "✓" : "✗", them: r.married ? "✓" : "✗", ahead: cmp(Number(Boolean(p.spouse)), Number(Boolean(r.married))) },
    { key: "kids", en: "Children", pcm: "Children", you: String(p.kids.length), them: String(r.kids), ahead: cmp(p.kids.length, r.kids) },
  ];
}
const behindCount = (p: Player) => rivalCompare(p).filter((x) => x.ahead === false).length;
const aheadCount = (p: Player) => rivalCompare(p).filter((x) => x.ahead === true).length;

export function rivalYear(p: Player, lines: string[], pending: Pending[]) {
  ensureRival(p);
  const r = rivalOf(p);
  const n = rivalNpc(p);
  if (!r || !n) return;
  const age = p.age + n.ageDelta;
  const noteLine = (en: string, pcm: string, big = false) => { if (big || chance(0.6)) lines.push(T(en, pcm)); };
  // Wealth: slow before work, then compounding with luck and drive.
  const grow = age < 20 ? 0.03 : rand(-0.04, 0.2) * r.drive;
  r.wealth = Math.max(50_000, r.wealth * (1 + grow) + (age >= 22 ? rand(80_000, 600_000) * r.drive : 0));
  if (chance(0.03)) { const win = chance(0.55); r.wealth *= win ? rand(1.6, 3) : rand(0.4, 0.7); noteLine(win ? `${first(n)} closed a big deal and is 'doing very well'.` : `${first(n)} lost money in a bad business. You hear it from three different people.`, win ? `${first(n)} close big deal and dey 'do well well'.` : `${first(n)} lose money for bad business. Three people tell you.`, true); }
  if (r.edu === 0 && age >= 18) { r.edu = chance(0.7) ? 2 : 1; noteLine(r.edu === 2 ? `${first(n)} got into university. The whole family celebrates.` : `${first(n)} starts working early.`, r.edu === 2 ? `${first(n)} enter university. Family dey celebrate.` : `${first(n)} start work early.`, true); }
  if (!r.car && age >= 24 && r.wealth > 3_000_000 && chance(0.4)) { r.car = true; noteLine(`${first(n)} just bought a car. Photos everywhere.`, `${first(n)} just buy motor. Photo everywhere.`, true); }
  if (!r.house && age >= 28 && r.wealth > 30_000_000 && chance(0.3)) { r.house = true; noteLine(`${first(n)} has built a house. The family goes to see it.`, `${first(n)} don build house. Family go see am.`, true); }
  if (!r.married && age >= 25 && chance(0.14)) { r.married = age; noteLine(`${first(n)}'s wedding was the talk of the town. Aso-ebi everywhere.`, `${first(n)} wedding be gist for town. Aso-ebi everywhere.`, true); }
  if (r.married && r.kids < 4 && chance(0.2)) { r.kids += 1; noteLine(`${first(n)} welcomes a baby.`, `${first(n)} don born pikin.`, true); }
  saveRival(p, r);
  // A comparison every few years, and a taste of victory.
  if (p.age >= 18 && p.age % 5 === 0 && behindCount(p) >= 2 && chance(0.7)) pending.push({ kind: "event", id: "rival_mama", data: { month: randInt(1, 12) } });
  if (p.age >= 24 && netWorthReal(p) > r.wealth * 1.3 && aheadCount(p) >= 3 && p.age - Number(p.flags.rivalWinAge ?? 0) >= 8) { p.flags.rivalWinAge = p.age; r.beaten += 1; saveRival(p, r); pending.push({ kind: "event", id: "rival_beaten", data: { month: randInt(1, 12) } }); }
  if (p.age >= 20 && chance(0.1)) pending.push({ kind: "event", id: "rival_meets", data: { month: randInt(1, 12) } });
}

// ---------------------------------------------------------------------------
// Old classmates and friends rise and fall
// ---------------------------------------------------------------------------
const TITLES: { t: [string, string]; power: number; income: number; rise: boolean }[] = [
  { t: ["Senator", "Senator"], power: 3, income: 80e6, rise: true }, { t: ["Commissioner", "Commissioner"], power: 3, income: 40e6, rise: true },
  { t: ["Bank MD", "Bank MD"], power: 2, income: 60e6, rise: true }, { t: ["Pastor of a big church", "Pastor of big church"], power: 2, income: 35e6, rise: true },
  { t: ["Billionaire", "Billionaire"], power: 3, income: 200e6, rise: true }, { t: ["Lawyer (SAN)", "Lawyer (SAN)"], power: 2, income: 50e6, rise: true },
  { t: ["Contractor", "Contractor"], power: 2, income: 30e6, rise: true }, { t: ["Doctor", "Doctor"], power: 1, income: 12e6, rise: true },
  { t: ["Broke and hustling", "Broke and hustling"], power: 0, income: 0.3e6, rise: false }, { t: ["Jobless", "Jobless"], power: 0, income: 0.1e6, rise: false },
];

export function npcFortunes(p: Player, lines: string[], pending: Pending[]) {
  const rv = rivalOf(p);
  for (const n of Object.values(p.npcs)) {
    if (!n.alive || !["friend", "classmate", "cousin", "sibling"].includes(n.role) || n.id === rv?.npcId) continue;
    const age = p.age + n.ageDelta;
    if (age < 26 || n.title) continue;
    if (!chance(0.025)) continue;
    const up = chance(0.65);
    const opts = TITLES.filter((x) => x.rise === up);
    const tt = pick(opts);
    n.title = T(tt.t[0], tt.t[1]);
    n.adultJob = n.title;
    n.occupation = n.title;
    n.income = tt.income;
    if (tt.power >= 2) n.generosity = clamp(n.generosity + 10);
    if (n.closeness >= 25 || n.role === "friend") lines.push(up ? T(`Your old ${n.role === "classmate" ? "classmate" : n.role} ${n.name} is now: ${n.title}.`, `Your old ${n.role === "classmate" ? "classmate" : n.role} ${n.name} don become: ${n.title}.`) : T(`You hear that ${n.name} has fallen on hard times.`, `You hear say ${n.name} don enter hard times.`));
  }
  // Someone you once helped remembers you.
  const debtors = Object.values(p.npcs).filter((n) => n.alive && n.title && (n.owes ?? 0) > 0 && (TITLES.find((x) => x.t[0] === n.title || x.t[1] === n.title)?.power ?? 0) >= 1);
  if (debtors.length && chance(0.12)) pending.push({ kind: "event", id: "favour_payback", data: { npcId: pick(debtors).id, month: randInt(1, 12) } });
}

export const powerOf = (n: Npc) => TITLES.find((x) => x.t[0] === n.title || x.t[1] === n.title)?.power ?? 0;

export type FavourKind = "contract" | "job" | "legal" | "intro";
export function favourBlock(p: Player, n: Npc, kind: FavourKind): string | null {
  if (!n.alive || (n.owes ?? 0) <= 0) return T("They owe you nothing yet", "Dem no owe you anything yet");
  if (p.prison > 0 && kind !== "legal") return T("Not from prison", "No fit from prison");
  if (kind === "legal" && p.prison <= 0) return T("Nothing to fix right now", "Nothing to fix for now");
  if (kind === "job" && p.job) return T("You already have a job", "You don get job");
  if (kind === "contract" && p.age < 18) return T("Adults only", "Na only adult");
  if (powerOf(n) <= 0 && kind !== "intro") return T("They cannot help right now", "Dem no fit help now");
  return null;
}
export function callFavour(p: Player, npcId: string, kind: FavourKind): string {
  const n = p.npcs[npcId];
  if (!n) return "";
  const b = favourBlock(p, n, kind);
  if (b) return b;
  n.owes = Math.max(0, (n.owes ?? 0) - 1);
  const pw = Math.max(1, powerOf(n));
  const f = n.name.split(" ")[0];
  if (kind === "contract") { const a = Math.round(I(p, rand(400_000, 1_500_000) * pw)); transact(p, { amount: a, reason: T(`A contract from ${f}`, `Contract from ${f}`), category: "business" }); return T(`${f} awards you a contract: ${naira(a)}.`, `${f} give you contract: ${naira(a)}.`); }
  if (kind === "job") {
    const best = eligibleJobs(p).filter((j) => !j.selfEmployed && j.group !== "crime").sort((a, c) => c.ladder[0].pay - a.ladder[0].pay)[0];
    if (!best) { n.owes = (n.owes ?? 0) + 1; return T("Nothing fits your qualifications right now.", "Nothing fit your qualification now."); }
    p.job = { id: best.id, rank: Math.min(pw - 1, best.ladder.length - 1), years: 0 };
    return T(`${f} makes a call, and you start work as: ${best.title}.`, `${f} make call, and you start work as: ${best.title}.`);
  }
  if (kind === "legal") { const before = p.prison; p.prison = Math.max(1, Math.ceil(p.prison * (pw >= 3 ? 0.4 : 0.6))); return T(`${f} pulls strings. Your sentence drops from ${before} to ${p.prison} year(s).`, `${f} pull string. Your sentence drop from ${before} to ${p.prison} year(s).`); }
  bump(p, "connections", 5 + pw * 3); bump(p, "reputation", 1);
  return T(`${f} introduces you to the right people. Doors open.`, `${f} introduce you to correct people. Doors open.`);
}

export const RIVAL_EVENTS: EventDef[] = [
  {
    id: "rival_mama", title: dual("\"See your mates\"", "\"See your mates\""),
    weight: () => 0,
    text: (p) => { const n = rivalNpc(p); const r = rivalCompare(p).filter((x) => x.ahead === false)[0]; return T(`Your mother says over dinner: "${n ? first(n) : "Your cousin"} ${r?.key === "house" ? "has built a house" : r?.key === "married" ? "is married with children" : r?.key === "edu" ? "has a degree" : r?.key === "car" ? "bought a car" : "is doing very well"}. And you?" Everybody looks at their plate.`, `Your mama talk for dinner: "${n ? first(n) : "Your cousin"} ${r?.key === "house" ? "don build house" : r?.key === "married" ? "don marry and get pikin" : r?.key === "edu" ? "get degree" : r?.key === "car" ? "buy motor" : "dey do well"}. And you?" Everybody dey look their plate.`); },
    choices: (p) => [
      { label: T("Promise to catch up", "Promise say you go catch up"), sub: T("Stress, but you get a push", "Stress, but you go get push"), run: (q) => { bump(q, "stress", 6); bump(q, "smarts", 1); q.family.happy = clamp(q.family.happy + 3); q.flags.rivalPush = Number(q.flags.rivalPush ?? 0) + 1; return T("You go to bed with a plan and a knot in your stomach.", "You go bed with plan and knot for belle."); } },
      { label: T("Flex a little", "Flex small"), sub: naira(I(p, 250_000)), disabled: p.money < I(p, 250_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -Math.round(I(q, 250_000)), reason: T("Showing off to keep up", "Show off to keep up"), category: "social" }); bump(q, "reputation", 2); q.flags.status = Math.min(100, Number(q.flags.status ?? 20) + 6); return T("You turn up in fresh clothes and a new phone. The room changes tone.", "You show up with fresh cloth and new phone. The room change tone."); } },
      { label: T("Laugh it off", "Laugh am off"), run: (q) => { q.family.happy = clamp(q.family.happy - 3); bump(q, "happiness", 1); return T("Your mother sighs. The jollof is excellent, though.", "Mama sigh. The jollof sweet anyway."); } },
    ],
  },
  {
    id: "rival_beaten", title: dual("You pulled ahead", "You pass am"),
    weight: () => 0,
    text: (p) => { const n = rivalNpc(p); return T(`At the family gathering, nobody says it out loud, but everyone notices: you are doing better than ${n ? first(n) : "your cousin"}. Your mother is smiling at everyone.`, `For family gathering, nobody talk am out loud, but everybody notice: you dey do better pass ${n ? first(n) : "your cousin"}. Mama dey smile at everybody.`); },
    choices: () => [
      { label: T("Stay humble", "Stay humble"), run: (q) => { bump(q, "happiness", 8); bump(q, "reputation", 3); const n = rivalNpc(q); if (n) n.closeness = clamp(n.closeness + 6); return T("You hug your cousin and say nothing. It means more.", "You hug your cousin and say nothing. E mean pass."); } },
      { label: T("Enjoy the moment", "Enjoy the moment"), run: (q) => { bump(q, "happiness", 12); bump(q, "reputation", 1); const n = rivalNpc(q); if (n) n.closeness = clamp(n.closeness - 4); return T("You let the compliments land. They feel very good.", "You let the compliment land. E sweet well well."); } },
    ],
  },
  {
    id: "rival_meets", title: dual("Running into your rival", "You meet your rival"),
    weight: () => 0,
    text: (p) => { const n = rivalNpc(p); return T(`You bump into ${n ? first(n) : "your cousin"} at a wedding. Smiles, hugs, and a lot of measuring each other up.`, `You meet ${n ? first(n) : "your cousin"} for wedding. Smile, hug, and plenty measuring of each other.`); },
    choices: () => [
      { label: T("Be gracious", "Be gracious"), run: (q) => { const n = rivalNpc(q); if (n) { n.closeness = clamp(n.closeness + 8); n.owes = Math.min(5, (n.owes ?? 0) + (chance(0.3) ? 1 : 0)); } bump(q, "connections", 2); return T("An honest, warm conversation. You part as family.", "Honest, warm talk. Una part as family."); } },
      { label: T("Brag about your wins", "Brag about your wins"), run: (q) => { const n = rivalNpc(q); if (n) n.closeness = clamp(n.closeness - 8); bump(q, "happiness", 3); bump(q, "reputation", -1); return T("You feel great for ten minutes, then a little silly.", "You feel great for ten minutes, then you feel small silly."); } },
      { label: T("Ask how he is really doing", "Ask how he dey really"), run: (q) => { const n = rivalNpc(q); if (n) { n.closeness = clamp(n.closeness + 12); n.trust = clamp(n.trust + 8); } bump(q, "happiness", 2); return T("It turns out the 'perfect life' is expensive. You both laugh.", "E show say the 'perfect life' dey expensive. You both laugh."); } },
    ],
  },
  {
    id: "favour_payback", title: dual("Someone remembers", "Person remember you"),
    weight: () => 0,
    init: (p) => ({ npcId: Object.values(p.npcs).find((n) => (n.owes ?? 0) > 0 && n.title)?.id ?? "" }),
    text: (p, d) => { const n = p.npcs[String(d.npcId)]; return n ? T(`${n.name}, now ${n.title}, calls: "I have not forgotten what you did for me when I had nothing. Let me return the favour."`, `${n.name}, now ${n.title}, call: "I never forget wetin you do for me when I get nothing. Make I return the favour."`) : ""; },
    choices: (p, d) => {
      const n = p.npcs[String(d.npcId)];
      const f = n ? n.name.split(" ")[0] : "";
      return [
        { label: T("Accept a contract", "Accept contract"), run: (q) => { const x = q.npcs[String(d.npcId)]; if (!x) return ""; x.owes = Math.max(0, (x.owes ?? 1) - 1); const a = Math.round(I(q, rand(600_000, 2_500_000) * Math.max(1, powerOf(x)))); transact(q, { amount: a, reason: T(`A contract from ${f}`, `Contract from ${f}`), category: "business" }); return T(`A contract worth ${naira(a)} comes through.`, `Contract worth ${naira(a)} come through.`); } },
        { label: T("Ask for an introduction", "Ask for introduction"), run: (q) => { const x = q.npcs[String(d.npcId)]; if (!x) return ""; x.owes = Math.max(0, (x.owes ?? 1) - 1); bump(q, "connections", 8); return T(`${f} puts in a good word. Doors open.`, `${f} put good word. Doors open.`); } },
        { label: T("Say it was nothing", "Say na nothing"), run: (q) => { bump(q, "reputation", 2); const x = q.npcs[String(d.npcId)]; if (x) x.closeness = clamp(x.closeness + 6); return T("They insist: 'My door is always open.' Keep that in mind.", "Dem insist: 'My door dey open always.' Remember am."); } },
      ];
    },
  },
];
void luckBonus;
