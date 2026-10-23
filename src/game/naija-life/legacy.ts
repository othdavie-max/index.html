import { I, bump, eligibleJobs } from "./helpers";
import { transact } from "./ledger";
import { ribbonsOf } from "./ribbons";
import type { EventDef, FamilyArchetype, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, randInt } from "./util";

// ---------------------------------------------------------------------------
// Family name, compound and heirlooms: what carries across generations
// ---------------------------------------------------------------------------
const START_NAME: Record<FamilyArchetype, number> = { nepo: 72, upperMiddle: 58, strictRich: 62, newlyRich: 42, middle: 46, fallenRich: 40, struggling: 34, lapo: 30 };
export function famNameOf(p: Player): number {
  if (typeof p.flags.famName !== "number") p.flags.famName = START_NAME[p.fam?.archetype ?? "middle"] ?? 45;
  return Math.round(Number(p.flags.famName));
}
export const famNameWord = (n: number) => (n >= 80 ? T("Respected name", "Respected name") : n >= 62 ? T("Good name", "Good name") : n >= 40 ? T("Ordinary name", "Ordinary name") : n >= 22 ? T("Shaky name", "Shaky name") : T("Name in disgrace", "Name for disgrace"));

export interface Heirloom { id: string; emoji: string; en: string; pcm: string; perk: "name" | "faith" | "family" | "rep" }
export const HEIRLOOMS: Heirloom[] = [
  { id: "watch", emoji: "⌚", en: "Grandfather's gold wristwatch", pcm: "Grandpa gold wristwatch", perk: "rep" },
  { id: "agbada", emoji: "👘", en: "The family's ceremonial agbada", pcm: "Family ceremonial agbada", perk: "name" },
  { id: "book", emoji: "📖", en: "A worn family Bible or Quran", pcm: "Old family Bible or Quran", perk: "faith" },
  { id: "deeds", emoji: "📜", en: "Land title deeds from the village", pcm: "Land title deeds from village", perk: "family" },
  { id: "wrapper", emoji: "🧣", en: "Grandmother's wrapper chest", pcm: "Grandmother wrapper chest", perk: "family" },
  { id: "pen", emoji: "🖋️", en: "A pen from a head of state", pcm: "Pen from head of state", perk: "name" },
  { id: "horn", emoji: "🎺", en: "The chieftaincy horn", pcm: "Chieftaincy horn", perk: "rep" },
];
export const heirloomsOf = (p: Player): Heirloom[] => { try { const ids = JSON.parse(String(p.flags.heirlooms ?? "[]")) as string[]; return ids.map((i) => HEIRLOOMS.find((h) => h.id === i)).filter(Boolean) as Heirloom[]; } catch { return []; } };
const saveHeirlooms = (p: Player, ids: string[]) => { p.flags.heirlooms = JSON.stringify(Array.from(new Set(ids))); };

/** How the world will remember the one who just died. */
export function legacyScore(old: Player): number {
  const rib = ribbonsOf(old).length;
  const wealth = Math.log10(1 + old.peakWorth / Math.max(1, old.index) / 1_000_000);
  let s = 38 + old.stats.reputation * 0.28 + rib * 2.5 + wealth * 5 + old.goodDeeds * 2 + (old.politics?.highest ?? -1) * 2;
  s -= old.crime.record.length * 6 + (old.loot > old.goodDeeds * 5e9 ? 8 : 0);
  return clamp(Math.round(s), 5, 98);
}
export function inheritLegacy(old: Player, p: Player) {
  p.flags.famName = clamp(Math.round(famNameOf(old) * 0.5 + legacyScore(old) * 0.5));
  const ids: string[] = heirloomsOf(old).map((h) => h.id);
  const worth = old.peakWorth / Math.max(1, old.index);
  const add = worth >= 1e9 ? 2 : worth >= 5e7 ? 1 : chance(0.5) ? 1 : 0;
  for (let i = 0; i < add; i++) ids.push(pick(HEIRLOOMS.filter((h) => !ids.includes(h.id) && (h.id !== "pen" || (old.politics?.highest ?? -1) >= 3)).map((h) => h.id)));
  saveHeirlooms(p, ids.filter(Boolean));
  const best = [...p.houses].sort((a, b) => b.value - a.value)[0];
  if (best) best.compound = true;
}

const PERKS: Record<Heirloom["perk"], (p: Player) => void> = {
  name: (p) => { p.flags.famName = clamp(famNameOf(p) + 0.5); },
  faith: (p) => bump(p, "stress", -1),
  family: (p) => { p.family.happy = clamp(p.family.happy + 1); },
  rep: (p) => bump(p, "reputation", 1),
};

export function legacyYear(p: Player, lines: string[], pending: Pending[]) {
  if (p.age < 12) return;
  for (const h of heirloomsOf(p)) PERKS[h.perk](p);
  const fn = famNameOf(p);
  const drift = (p.stats.reputation - 50) / 80 + (p.crime.record.length ? -0.8 : 0);
  p.flags.famName = clamp(fn + drift, 0, 100);
  if (fn >= 70 && p.age >= 18) bump(p, "connections", 1);
  if (fn <= 25 && p.age >= 18) bump(p, "reputation", -1);
  if (p.houses.some((h) => h.compound)) { p.family.happy = clamp(p.family.happy + 1); if (p.age >= 20 && chance(0.2)) pending.push({ kind: "event", id: "compound_reunion", data: { month: randInt(1, 12) } }); }
  if (heirloomsOf(p).length && p.age >= 25 && chance(0.04)) pending.push({ kind: "event", id: "heirloom_offer", data: { month: randInt(1, 12) } });
  if (p.age >= 18 && p.age <= 30 && fn >= 70 && !p.flags.nameDoor && chance(0.35)) { p.flags.nameDoor = true; pending.push({ kind: "event", id: "name_opens_door", data: { month: randInt(1, 12) } }); }
  if (p.age >= 18 && p.age <= 30 && fn <= 25 && !p.flags.nameStigma && chance(0.35)) { p.flags.nameStigma = true; pending.push({ kind: "event", id: "name_stigma", data: { month: randInt(1, 12) } }); }
  void lines;
}

export const LEGACY_EVENTS: EventDef[] = [
  {
    id: "compound_reunion", title: dual("Family reunion at the compound", "Family reunion for compound"),
    weight: () => 0,
    text: () => T("It is time for the yearly reunion at the family compound. Cousins you have not seen in years arrive with suitcases and opinions.", "Time reach for yearly reunion for family compound. Cousins wey you never see for years arrive with suitcase and opinion."),
    choices: (p) => [
      { label: T("Host in style", "Host am well"), sub: naira(I(p, 600_000)), disabled: p.money < I(p, 600_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -Math.round(I(q, 600_000)), reason: T("Compound reunion", "Compound reunion"), category: "social" }); q.family.happy = clamp(q.family.happy + 10); bump(q, "reputation", 3); bump(q, "happiness", 6); q.flags.famName = clamp(famNameOf(q) + 2); return T("Three goats, two bands and a photo that goes on the wall.", "Three goat, two band and photo wey go enter wall."); } },
      { label: T("Everyone brings something", "Everybody go bring something"), sub: naira(I(p, 100_000)), run: (q) => { transact(q, { amount: -Math.round(I(q, 100_000)), reason: T("Compound reunion", "Compound reunion"), category: "social" }); q.family.happy = clamp(q.family.happy + 5); bump(q, "happiness", 3); return T("Potluck jollof, loud laughter and old stories.", "Potluck jollof, loud laugh and old stories."); } },
      { label: T("Send regards", "Send regards"), run: (q) => { q.family.happy = clamp(q.family.happy - 5); return T("You send a message and money by transfer. It is not the same.", "You send message and money by transfer. E no be the same."); } },
    ],
  },
  {
    id: "heirloom_offer", title: dual("An offer for the heirloom", "Offer for heirloom"),
    weight: () => 0,
    text: (p) => { const h = heirloomsOf(p)[0]; return T(`A collector offers a fortune for ${h ? h.en.toLowerCase() : "an heirloom"}. "Museums are the future, and so is cash."`, `Collector offer fortune for ${h ? h.pcm.toLowerCase() : "heirloom"}. "Museum na future, and so be cash."`); },
    choices: (p) => [
      { label: T("Sell it", "Sell am"), sub: naira(I(p, 6_000_000)), run: (q) => { const l = heirloomsOf(q); if (!l.length) return ""; saveHeirlooms(q, l.slice(1).map((h) => h.id)); transact(q, { amount: Math.round(I(q, 6_000_000)), reason: T("Sold a family heirloom", "Sell family heirloom"), category: "asset" }); q.family.happy = clamp(q.family.happy - 12); q.flags.famName = clamp(famNameOf(q) - 6); return T("Money in, history out. The elders will not forgive you quickly.", "Money enter, history comot. Elders no go forgive you quick."); } },
      { label: T("Keep it", "Keep am"), run: (q) => { q.family.happy = clamp(q.family.happy + 3); bump(q, "reputation", 1); return T("Some things are not for sale.", "Some things no dey for sale."); } },
    ],
  },
  {
    id: "name_opens_door", title: dual("Your name opens a door", "Your name open door"),
    weight: () => 0,
    text: () => T("A senior man at a bank leans over: \"Your family's name is respected. There is a place for you here, no interview.\"", "Senior man for bank lean come: \"Your family name get respect. Place dey for you here, no interview.\""),
    choices: () => [
      { label: T("Take the position", "Take the position"), run: (q) => { const best = eligibleJobs(q).filter((j) => !j.selfEmployed && j.group === "formal").sort((a, b) => b.ladder[0].pay - a.ladder[0].pay)[0]; if (best && !q.job) { q.job = { id: best.id, rank: Math.min(1, best.ladder.length - 1), years: 0 }; return T(`You start as: ${best.title}. People say 'nepotism', quietly.`, `You start as: ${best.title}. People dey talk 'nepotism', quietly.`); } bump(q, "connections", 5); return T("There is no suitable seat, but the introduction is valuable.", "No suitable seat, but the introduction valuable."); } },
      { label: T("Decline and earn it", "Decline and earn it"), run: (q) => { bump(q, "reputation", 3); bump(q, "smarts", 1); return T("Respect, from people who matter.", "Respect from people wey matter."); } },
    ],
  },
  {
    id: "name_stigma", title: dual("The name follows you", "The name dey follow you"),
    weight: () => 0,
    text: () => T("People go quiet when they hear your surname. \"Is that the family that...?\" You are judged before you open your mouth.", "People dey quiet when dem hear your surname. \"Na that family wey...?\" Dem judge you before you talk."),
    choices: () => [
      { label: T("Prove them wrong", "Prove dem wrong"), run: (q) => { bump(q, "stress", 5); bump(q, "smarts", 1); q.flags.famName = clamp(famNameOf(q) + 6); return T("Longer hours, cleaner record. People slowly notice.", "Longer hours, clean record. People dey slowly notice."); } },
      { label: T("Start under another name", "Start with another name"), run: (q) => { q.flags.famName = clamp(famNameOf(q) + 4); q.family.happy = clamp(q.family.happy - 8); return T("Your family feels abandoned. The doors open a bit easier.", "Your family feel say you leave dem. Door open small easier."); } },
      { label: T("Ignore them", "Ignore dem"), run: (q) => { bump(q, "stress", 2); return T("You keep your head down and keep walking.", "You bow head and keep waka."); } },
    ],
  },
];
