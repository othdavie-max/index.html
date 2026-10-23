import { addCousin } from "./events6";
import { ALL_TRIBES } from "./data";
import { I, bump, enterPrison, luckBonus } from "./helpers";
import { transact } from "./ledger";
import type { Pending, Player } from "./types";
import { T, chance, clamp, naira, pick, rand, randInt, uid } from "./util";

const num = (p: Player, k: string, d = 0) => Number(p.flags[k] ?? d);
const yearly = (p: Player, key: string, per: number): number => (num(p, `${key}Age`, -1) === p.age ? num(p, `${key}Left`, per) : per);
const takeOne = (p: Player, key: string, per: number) => { const left = yearly(p, key, per); p.flags[`${key}Age`] = p.age; p.flags[`${key}Left`] = left - 1; };
const spend = (p: Player, amt: number, reason: string, cat: "personal" | "betting" | "other" = "personal") => { transact(p, { amount: -Math.round(amt), reason, category: cat }); };

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------
export interface Pet { id: string; kind: string; name: string; age: number; bond: number; health: number }
export const PET_KINDS: { id: string; emoji: string; en: string; pcm: string; cost: number; life: number; note: [string, string] }[] = [
  { id: "dog", emoji: "🐕", en: "Dog", pcm: "Dog", cost: 60_000, life: 13, note: ["Guards the compound. Loyal.", "E dey guard compound. Loyal."] },
  { id: "cat", emoji: "🐈", en: "Cat", pcm: "Cat", cost: 30_000, life: 15, note: ["Independent. Catches rats.", "E dey do as e like. E dey catch rat."] },
  { id: "parrot", emoji: "🦜", en: "Grey parrot", pcm: "Grey parrot", cost: 250_000, life: 40, note: ["Talks. Repeats gossip.", "E dey talk. E dey repeat gist."] },
  { id: "goat", emoji: "🐐", en: "Goat", pcm: "Goat", cost: 90_000, life: 12, note: ["Raised for Sallah and Christmas, but you may grow fond of it.", "Dem dey raise am for Sallah and Christmas, but you fit love am."] },
  { id: "rooster", emoji: "🐓", en: "Rooster", pcm: "Cock", cost: 15_000, life: 6, note: ["Your alarm clock, every morning at 4am.", "Your alarm clock, every morning 4am."] },
  { id: "rabbit", emoji: "🐇", en: "Rabbit", pcm: "Rabbit", cost: 25_000, life: 8, note: ["Gentle and cheap to keep.", "E gentle and cheap to keep."] },
];
export const PET_NAMES = ["Bingo", "Jollof", "Suya", "Shaki", "Rex", "Mama Put", "Oga", "Biggie", "Pepper", "Zobo", "Kilode", "Lagos", "Tiwa", "Naira", "Boma", "Kobo"];

export function petsOf(p: Player): Pet[] {
  try { return JSON.parse(String(p.flags.pets ?? "[]")) as Pet[]; } catch { return []; }
}
const savePets = (p: Player, a: Pet[]) => { p.flags.pets = JSON.stringify(a); };
export const petPrice = (p: Player, kind: string) => Math.round(I(p, PET_KINDS.find((k) => k.id === kind)?.cost ?? 30_000));

export function adoptPet(p: Player, kind: string): string {
  if (p.age < 8) return T("Ask your parents first.", "Ask your parents first.");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  const pets = petsOf(p);
  if (pets.length >= 3) return T("Three pets is enough for one compound.", "Three pet don enough for one compound.");
  const k = PET_KINDS.find((x) => x.id === kind);
  if (!k) return "";
  const price = p.age < 18 ? 0 : petPrice(p, kind);
  if (p.money < price) return T(`${k.en} costs ${naira(price)}.`, `${k.pcm} cost ${naira(price)}.`);
  if (price) transact(p, { amount: -price, reason: T(`Bought a ${k.en.toLowerCase()}`, `Buy ${k.pcm.toLowerCase()}`), category: "personal" });
  const name = pick(PET_NAMES);
  savePets(p, [...pets, { id: uid(), kind, name, age: 0, bond: 55, health: 90 }]);
  bump(p, "happiness", 5);
  return T(`You bring home a ${k.en.toLowerCase()} and name it ${name}.`, `You carry ${k.pcm.toLowerCase()} come house and name am ${name}.`);
}
export function petCare(p: Player, id: string, op: "play" | "feed" | "vet"): string {
  const pets = petsOf(p);
  const x = pets.find((q) => q.id === id);
  if (!x) return "";
  if (op === "vet") {
    const c = Math.round(I(p, 40_000));
    if (p.money < c) return T(`The vet charges ${naira(c)}.`, `Vet charge ${naira(c)}.`);
    spend(p, c, T(`Vet for ${x.name}`, `Vet for ${x.name}`));
    x.health = clamp(x.health + 35);
  } else if (op === "feed") {
    const c = Math.round(I(p, 6_000));
    if (p.money < c) return T("You cannot afford good food for it.", "You no fit buy good food for am.");
    spend(p, c, T(`Food for ${x.name}`, `Food for ${x.name}`));
    x.health = clamp(x.health + 8); x.bond = clamp(x.bond + 6);
  } else {
    x.bond = clamp(x.bond + 10);
    bump(p, "happiness", 2); bump(p, "stress", -2);
  }
  x.id = x.id;
  savePets(p, pets);
  return op === "vet" ? T(`${x.name} is looking better.`, `${x.name} don dey better.`) : op === "feed" ? T(`${x.name} eats like a king.`, `${x.name} chop like king.`) : T(`You and ${x.name} have a good time.`, `You and ${x.name} enjoy well.`);
}
export function rehomePet(p: Player, id: string): string {
  const pets = petsOf(p);
  const x = pets.find((q) => q.id === id);
  if (!x) return "";
  savePets(p, pets.filter((q) => q.id !== id));
  bump(p, "happiness", -4);
  return T(`You give ${x.name} to a neighbour who promises to treat it well.`, `You give ${x.name} to neighbour wey promise to treat am well.`);
}

function petYear(p: Player, lines: string[]) {
  const pets = petsOf(p);
  if (!pets.length) return;
  const keep: Pet[] = [];
  for (const x of pets) {
    x.age += 1;
    x.bond = clamp(x.bond - 6);
    x.health = clamp(x.health - randInt(2, 10));
    const k = PET_KINDS.find((q) => q.id === x.kind);
    const old = x.age / (k?.life ?? 12);
    if (p.age >= 18) spend(p, I(p, 25_000), T(`Feeding ${x.name}`, `Feeding ${x.name}`));
    if (chance(clamp(Math.pow(old, 4) * 0.5 + (x.health < 25 ? 0.25 : 0), 0, 0.9))) {
      bump(p, "happiness", -8);
      lines.push(T(`${x.name} has died. The house is quiet.`, `${x.name} don die. The house quiet.`));
      continue;
    }
    if (x.bond > 60) bump(p, "happiness", 2);
    if (x.bond < 15 && chance(0.4)) { lines.push(T(`${x.name} wandered off and never came back.`, `${x.name} waka go and no come back.`)); continue; }
    keep.push(x);
  }
  savePets(p, keep);
}

// ---------------------------------------------------------------------------
// Lottery and scratch cards (Baba Ijebu, jackpots)
// ---------------------------------------------------------------------------
export type Ticket = "scratch" | "baba" | "jackpot";
export const TICKETS: { id: Ticket; emoji: string; en: string; pcm: string; cost: number; blurb: [string, string] }[] = [
  { id: "scratch", emoji: "🎫", en: "Scratch card", pcm: "Scratch card", cost: 500, blurb: ["Quick scratch, small prizes.", "Quick scratch, small prize."] },
  { id: "baba", emoji: "🔢", en: "Baba Ijebu", pcm: "Baba Ijebu", cost: 2_000, blurb: ["Pick your lucky numbers. 'Number two' hits sometimes.", "Pick your lucky number. 'Number two' dey hit sometimes."] },
  { id: "jackpot", emoji: "💰", en: "Mega jackpot", pcm: "Mega jackpot", cost: 10_000, blurb: ["Almost never. But it pays life-changing money.", "E hardly hit. But the money na life-changing."] },
];
export const ticketsLeft = (p: Player) => yearly(p, "lotto", 12);

export function playTicket(p: Player, id: Ticket): string {
  if (p.age < 18) return T("Adults only.", "Na only adult.");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  const tk = TICKETS.find((x) => x.id === id);
  if (!tk) return "";
  if (ticketsLeft(p) <= 0) return T("You have played enough this year. The money is not magic.", "You don play enough this year. The money no be magic.");
  const price = Math.round(I(p, tk.cost));
  if (p.money < price) return T(`You need ${naira(price)}.`, `You need ${naira(price)}.`);
  takeOne(p, "lotto", 12);
  spend(p, price, T(`${tk.en} ticket`, `${tk.pcm} ticket`), "betting");
  const r = rand(0, 1) - luckBonus(p) * 0.2;
  let win = 0;
  if (id === "scratch") win = r < 0.005 ? 2_000_000 : r < 0.03 ? 50_000 : r < 0.1 ? 5_000 : r < 0.3 ? 1_000 : 0;
  else if (id === "baba") win = r < 0.02 ? 60_000 : r < 0.12 ? 4_000 : 0;
  else win = r < 0.0004 ? 150_000_000 : r < 0.003 ? 1_000_000 : r < 0.05 ? 20_000 : 0;
  if (win <= 0) return pick([T("Not this time. Number never show.", "Not this time. Your number no show."), T("Nothing. 'Next time,' you tell yourself.", "Nothing. 'Next time,' you tell yourself."), T("So close. So very far.", "E near. E far.")]);
  const amt = Math.round(I(p, win));
  transact(p, { amount: amt, reason: T(`${tk.en} win`, `${tk.pcm} win`), category: "betting" });
  bump(p, "happiness", win >= 1_000_000 ? 15 : 4);
  if (win >= 150_000_000) { p.flags.jackpotAge = p.age; return T(`JACKPOT! ${naira(amt)}! Relatives you have never met are already calling.`, `JACKPOT! ${naira(amt)}! Relatives wey you never see don start to call.`); }
  return T(`You win ${naira(amt)}!`, `You win ${naira(amt)}!`);
}

// ---------------------------------------------------------------------------
// Style and body
// ---------------------------------------------------------------------------
export interface StyleItem { id: string; emoji: string; en: string; pcm: string; cost: number; looks: [number, number]; risk: number; minAge: number; note: [string, string] }
export const STYLE_ITEMS: StyleItem[] = [
  { id: "hair", emoji: "💇🏾", en: "Hair: braids, fade or Brazilian", pcm: "Hair: braids, fade or Brazilian", cost: 15_000, looks: [1, 3], risk: 0, minAge: 6, note: ["A proper trip to the salon or barber.", "Correct trip to salon or barber."] },
  { id: "nails", emoji: "💅🏾", en: "Nails and grooming", pcm: "Nails and grooming", cost: 12_000, looks: [1, 2], risk: 0, minAge: 12, note: ["Small things make a difference.", "Small things dey make difference."] },
  { id: "tattoo", emoji: "🖋️", en: "Tattoo", pcm: "Tattoo", cost: 60_000, looks: [-2, 5], risk: 0.04, minAge: 18, note: ["Permanent. Your mother will hear about it.", "E permanent. Your mama go hear."] },
  { id: "teeth", emoji: "😁", en: "Teeth and veneers", pcm: "Teeth and veneers", cost: 400_000, looks: [3, 7], risk: 0.03, minAge: 18, note: ["A bright smile.", "Bright smile."] },
  { id: "hairline", emoji: "🧑🏾‍🦲", en: "Hair transplant", pcm: "Hair transplant", cost: 900_000, looks: [4, 8], risk: 0.05, minAge: 22, note: ["For the receding hairline.", "For hair wey don commot for front."] },
  { id: "nose", emoji: "👃🏾", en: "Nose job", pcm: "Nose job", cost: 1_500_000, looks: [5, 11], risk: 0.07, minAge: 18, note: ["Fixes what bothered you. Or what you think does.", "Fix wetin dey worry you. Or wetin you think dey worry you."] },
  { id: "body", emoji: "🏋🏾", en: "Body contouring (BBL, lipo)", pcm: "Body contouring (BBL, lipo)", cost: 3_500_000, looks: [6, 14], risk: 0.1, minAge: 20, note: ["Big results, big risks. Choose your surgeon carefully.", "Big result, big risk. Choose your doctor well."] },
];
export const styleLeft = (p: Player) => yearly(p, "style", 4);

export function styleBlock(p: Player, id: string): string | null {
  const it = STYLE_ITEMS.find((x) => x.id === id);
  if (!it) return "";
  if (p.age < it.minAge) return T(`From age ${it.minAge}`, `From age ${it.minAge}`);
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (styleLeft(p) <= 0) return T("Enough pampering this year", "Enough pampering this year");
  if (p.money < Math.round(I(p, it.cost))) return T(`${naira(Math.round(I(p, it.cost)))} needed`, `Need ${naira(Math.round(I(p, it.cost)))}`);
  return null;
}
export function doStyle(p: Player, id: string): string {
  const b = styleBlock(p, id);
  if (b) return b;
  const it = STYLE_ITEMS.find((x) => x.id === id)!;
  takeOne(p, "style", 4);
  spend(p, I(p, it.cost), T(it.en, it.pcm));
  if (chance(it.risk)) {
    const severe = it.risk >= 0.05 && chance(0.25);
    bump(p, "looks", -randInt(3, 8));
    if (it.id === "tattoo") return T("The tattoo artist's hand slips. You will be covering it up for years.", "Tattoo man hand slip. You go dey cover am for years.");
    bump(p, "health", severe ? -30 : -8);
    if (severe && chance(0.1) && p.age > 20) { p.alive = false; p.cause = T("Complications after cosmetic surgery", "Complication after cosmetic surgery"); return T("The surgery goes terribly wrong.", "The surgery go wrong well well."); }
    return severe ? T("A botched job and weeks in hospital. The mirror is not kind.", "Doctor scatter am. Weeks for hospital. Mirror no gentle.") : T("Complications. You need a second procedure to fix it.", "Complication. You need another procedure to fix am.");
  }
  const g = randInt(it.looks[0], it.looks[1]);
  bump(p, "looks", g);
  bump(p, "happiness", Math.max(1, Math.round(g / 2)));
  if (it.id === "tattoo") p.flags.tattoos = num(p, "tattoos") + 1;
  return T(`You love the result. Looks ${g >= 0 ? "+" : ""}${g}.`, `You like the result. Looks ${g >= 0 ? "+" : ""}${g}.`);
}

// ---------------------------------------------------------------------------
// Talents
// ---------------------------------------------------------------------------
export const TALENTS: { id: string; emoji: string; en: string; pcm: string; blurb: [string, string] }[] = [
  { id: "music", emoji: "🎤", en: "Afrobeats and music", pcm: "Afrobeats and music", blurb: ["Write songs, record in a small studio, chase the big break.", "Write song, record for small studio, chase big break."] },
  { id: "acting", emoji: "🎬", en: "Nollywood acting", pcm: "Nollywood acting", blurb: ["Auditions, extras, then maybe a lead role.", "Audition, extra, then maybe lead role."] },
  { id: "football", emoji: "⚽", en: "Football", pcm: "Football", blurb: ["Street pitch to academy to the Super Eagles.", "Street pitch to academy to Super Eagles."] },
  { id: "comedy", emoji: "🎭", en: "Stand-up comedy", pcm: "Stand-up comedy", blurb: ["Open mics, skits, then a special.", "Open mic, skit, then special."] },
  { id: "dance", emoji: "💃🏾", en: "Dance", pcm: "Dance", blurb: ["Challenges, music videos, and the tours.", "Challenge, music video, and tour."] },
];
export const talentOf = (p: Player) => ({ kind: String(p.flags.talentKind ?? ""), level: num(p, "talentLvl") });
export const practiceLeft = (p: Player) => yearly(p, "practice", 5);

export function pickTalent(p: Player, kind: string): string {
  if (p.age < 6) return T("You are still too small.", "You still small.");
  if (p.flags.talentKind) return T("You already chose your craft.", "You don choose your craft.");
  const t = TALENTS.find((x) => x.id === kind);
  if (!t) return "";
  p.flags.talentKind = kind; p.flags.talentLvl = 6;
  return T(`You decide to chase ${t.en.toLowerCase()}.`, `You decide to chase ${t.pcm.toLowerCase()}.`);
}
export function practice(p: Player): string {
  const { kind, level } = talentOf(p);
  if (!kind) return "";
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (practiceLeft(p) <= 0) return T("You have practised enough this year.", "You don practice enough this year.");
  const cost = p.age >= 16 ? Math.round(I(p, 20_000)) : 0;
  if (p.money < cost) return T("You cannot afford studio time.", "You no get money for studio time.");
  takeOne(p, "practice", 5);
  if (cost) spend(p, cost, T("Practice and studio time", "Practice and studio time"));
  const g = clamp(Math.round(rand(2, 6) + p.stats.smarts / 40 + p.stats.fitness / 60 + luckBonus(p)), 1, 9);
  p.flags.talentLvl = Math.min(100, level + g);
  bump(p, "stress", 1);
  return T(`Hours of work pay off: skill +${g}.`, `Hours of work pay: skill +${g}.`);
}
const PAYOFF: Record<string, [string, string]> = {
  music: ["a record deal", "record deal"], acting: ["a lead role", "lead role"], football: ["a club contract", "club contract"], comedy: ["a comedy special", "comedy special"], dance: ["a music video tour", "music video tour"],
};
export function bigBreak(p: Player): string {
  const { kind, level } = talentOf(p);
  if (!kind || level < 70 || p.flags.bigBreak) return "";
  p.flags.bigBreak = true;
  const amt = Math.round(I(p, rand(5_000_000, 40_000_000)));
  transact(p, { amount: amt, reason: T("Your big break", "Your big break"), category: "business" });
  bump(p, "reputation", 12); bump(p, "happiness", 12); bump(p, "connections", 10);
  p.achievements.push("Big break");
  const w = PAYOFF[kind] ?? ["a big break", "big break"];
  return T(`You land ${w[0]}: ${naira(amt)} and a new level of fame.`, `You land ${w[1]}: ${naira(amt)} and new level of fame.`);
}

// ---------------------------------------------------------------------------
// DNA and ancestry
// ---------------------------------------------------------------------------
export const DNA_COST = 45_000;
export function dnaTest(p: Player): string {
  if (p.flags.dnaText) return T("You already have your results.", "You don get your result.");
  if (p.age < 16) return T("From age 16", "From age 16");
  const c = Math.round(I(p, DNA_COST));
  if (p.money < c) return T(`The kit costs ${naira(c)}.`, `The kit cost ${naira(c)}.`);
  spend(p, c, T("DNA ancestry test", "DNA ancestry test"));
  const main = clamp(Math.round(rand(66, 94)), 0, 100);
  let rest = 100 - main;
  const others = ALL_TRIBES.filter((t) => t !== p.tribe).sort(() => rand(0, 1) - 0.5).slice(0, 3);
  const parts: string[] = [`${p.tribe} ${main}%`];
  others.forEach((t, i) => { const v = i === others.length - 1 ? rest : Math.min(rest, randInt(2, Math.max(2, Math.round(rest / 1.5)))); rest -= v; if (v > 0) parts.push(`${t} ${v}%`); });
  p.flags.dnaText = parts.join(" · ");
  let extra = "";
  if (chance(0.25)) {
    const cousin = addCousin(p);
    extra = " " + T(`The match list also shows ${cousin.name.split(" ")[0]}, a cousin you never knew.`, `The match list show ${cousin.name.split(" ")[0]}, cousin wey you no know.`);
    p.flags.dnaCousin = cousin.id;
  } else if (chance(0.3)) {
    extra = " " + T("A great-grandparent came from across the border. Elders go quiet when you ask.", "One great-grandparent come from across the border. Elders go quiet when you ask.");
  }
  bump(p, "happiness", 2);
  return T(`Your results: ${p.flags.dnaText}.${extra}`, `Your result: ${p.flags.dnaText}.${extra}`);
}

// ---------------------------------------------------------------------------
// Local groups: Area Boys, campus cults, political thugs
// ---------------------------------------------------------------------------
export const GROUPS: Record<string, { en: string; pcm: string; emoji: string }> = {
  areaboys: { en: "Area Boys", pcm: "Area Boys", emoji: "🧢" },
  cult: { en: "Campus confraternity", pcm: "Campus confraternity", emoji: "🕶️" },
  thugs: { en: "Political thugs", pcm: "Political thugs", emoji: "🗳️" },
};
export const groupOf = (p: Player) => String(p.flags.group ?? "");

function groupYear(p: Player, lines: string[], pending: Pending[]) {
  const g = groupOf(p);
  if (!g || p.prison > 0) return;
  if (g === "areaboys") {
    const amt = Math.round(I(p, rand(150_000, 600_000)));
    transact(p, { amount: amt, reason: T("Collections from the area", "Collections from the area"), category: "crime" });
    p.crime.heat = clamp(p.crime.heat + 6); bump(p, "reputation", -2);
  } else if (g === "cult") {
    bump(p, "connections", 2); bump(p, "stress", 3); p.crime.heat = clamp(p.crime.heat + 5);
    if (chance(0.12)) { bump(p, "health", -15); lines.push(T("A rival group attacks you on the road. You survive, barely.", "Rival group attack you for road. You survive, barely.")); }
  } else if (g === "thugs") {
    const amt = Math.round(I(p, rand(100_000, 800_000)));
    transact(p, { amount: amt, reason: T("Money from a politician's men", "Money from politician men"), category: "crime" });
    p.crime.heat = clamp(p.crime.heat + 4); bump(p, "reputation", -3);
  }
  if (chance(0.06 + p.crime.heat / 700)) {
    const r = enterPrison(p, randInt(1, 4));
    lines.push(T(`Police sweep up the group. ${r}`, `Police sweep the group. ${r}`));
    delete p.flags.group;
  }
  void pending;
}

// ---------------------------------------------------------------------------
// Yearly hook
// ---------------------------------------------------------------------------
export function bitYear(p: Player, lines: string[], pending: Pending[]) {
  petYear(p, lines);
  groupYear(p, lines, pending);
  const t = talentOf(p);
  if (t.kind && t.level >= 60 && p.age >= 14) {
    const amt = Math.round(I(p, rand(100_000, 700_000) * (t.level / 60)));
    transact(p, { amount: amt, reason: T("Gigs from your craft", "Gigs from your craft"), category: "business" });
  }
  if (t.kind) p.flags.talentLvl = Math.max(0, t.level - 2);
  const bb = bigBreak(p);
  if (bb) lines.push(bb);
  if (p.flags.wanted && chance(0.35)) {
    delete p.flags.wanted;
    const r = enterPrison(p, randInt(4, 9));
    lines.push(T(`Police track you down after your escape. ${r}`, `Police find you after your escape. ${r}`));
  }
  if (p.flags.jackpotAge === p.age - 1 && !p.flags.jackpotRelatives) { p.flags.jackpotRelatives = true; pending.push({ kind: "event", id: "jackpot_relatives", data: { month: randInt(1, 12) } }); }
}
