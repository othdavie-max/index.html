import { I, bump } from "./helpers";
import { transact } from "./ledger";
import { netWorth } from "./kidnap";
import { OFFICES } from "./data";
import { modelOf } from "./vehicles";
import type { EventDef, Goal, Moment, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, rng } from "./util";

// ---------------------------------------------------------------------------
// Shareable moments: funny highlights worth posting
// ---------------------------------------------------------------------------
interface MomentDef {
  id: string;
  emoji: string;
  title: [string, string];
  check: (p: Player) => boolean;
  en: (p: Player) => string;
  pcm: (p: Player) => string;
}
const high = (p: Player) => p.politics?.highest ?? -1;
const real = (p: Player) => netWorth(p) / p.index;
const ownsCat = (p: Player, cat: string) => p.vehicles.some((v) => modelOf(v.modelId)?.cat === cat);

export const MOMENT_DEFS: MomentDef[] = [
  { id: "president", emoji: "🇳🇬", title: ["President!", "President!"], check: (p) => p.achievements.includes("Became President"), en: (p) => `I became President at ${p.age}. My landlord now calls me "Your Excellency" and still wants the rent.`, pcm: (p) => `Dem make me President at ${p.age}. My landlord dey call me "Your Excellency" but e still dey wait for him rent.` },
  { id: "governor", emoji: "🏛️", title: ["Governor", "Governor"], check: (p) => high(p) >= 4 && !p.achievements.includes("Became President"), en: (p) => `Governor at ${p.age}. Even the boys who sold me pure water now say "sir".`, pcm: (p) => `Governor at ${p.age}. Even the boys wey sell me pure water dey call me "sir" now.` },
  { id: "senator", emoji: "🪑", title: ["Senator", "Senator"], check: (p) => high(p) >= 3, en: (p) => `Senator at ${p.age}. I have a green chair, a big salary and nobody remembers what I promised.`, pcm: (p) => `Senator at ${p.age}. I get green chair, big salary, and nobody remember wetin I promise.` },
  { id: "sug_senator", emoji: "🎓", title: ["SUG to Senate", "SUG to Senate"], check: (p) => p.campus?.sug === "won" && high(p) >= 3, en: (p) => `SUG president to Senator. I went from sharing handouts to sharing "constituency projects". Same energy.`, pcm: (p) => `SUG president to Senator. I comot from share handout go share "constituency project". Same energy.` },
  { id: "kid_escaped", emoji: "🏃", title: ["Escaped!", "I run o!"], check: (p) => typeof p.flags.kidEscaped === "number", en: (p) => `Kidnapped at ${p.flags.kidEscaped}, escaped. I have survived NEPA, fuel scarcity and bush camp. Nothing can do me.`, pcm: (p) => `Dem kidnap me at ${p.flags.kidEscaped}, I escape. I don survive NEPA, fuel scarcity and bush camp. Nothing fit do me again.` },
  { id: "kid_paid", emoji: "📞", title: ["Ransom paid", "Ransom paid"], check: (p) => p.kidnaps > 0 && typeof p.flags.kidEscaped !== "number", en: (p) => `Kidnapped at ${p.flags.kidAge ?? p.age}. My family sold two plots and one goat to bring me back. My bus fare was not that expensive.`, pcm: (p) => `Dem kidnap me at ${p.flags.kidAge ?? p.age}. My family sell two plot and one goat bring me back. My bus fare no cost reach that one.` },
  { id: "first_class", emoji: "🥇", title: ["First Class", "First Class"], check: (p) => p.campus?.cls === "First Class", en: () => "First Class! My mother has told the church, the market and her WhatsApp status. The neighbours are tired.", pcm: () => "First Class! My mama don tell church, market and her WhatsApp status. Neighbours don tire." },
  { id: "third_class", emoji: "📜", title: ["Third Class", "Third Class"], check: (p) => p.campus?.cls === "Third Class" || p.campus?.cls === "Pass", en: () => "Third class and I'm still employed. God is a Nigerian.", pcm: () => "Third class and I still get job. God na Nigerian." },
  { id: "billionaire", emoji: "💰", title: ["Billionaire", "Billionaire"], check: (p) => p.peakWorth / p.index >= 1_000_000_000, en: (p) => `Billionaire at ${p.age}. A relative I have never met now says we are "very close".`, pcm: (p) => `Billionaire at ${p.age}. Relative wey I never meet before dey talk say we "very close".` },
  { id: "jet", emoji: "🛩️", title: ["Private jet", "Private jet"], check: (p) => ownsCat(p, "jet"), en: () => "I bought a private jet. Third Mainland Bridge traffic can now hold my coat.", pcm: () => "I buy private jet. Third Mainland Bridge traffic fit hold my coat now." },
  { id: "yacht", emoji: "🛥️", title: ["Yacht life", "Yacht life"], check: (p) => ownsCat(p, "yacht"), en: () => "I own a yacht. Lekki flooding is now a lifestyle choice.", pcm: () => "I get yacht. Lekki flood don turn lifestyle." },
  { id: "japa", emoji: "✈️", title: ["JAPA!", "JAPA!"], check: (p) => p.achievements.includes("Japa success"), en: () => "JAPA don land. Please do not call me for \"small something\" this month.", pcm: () => "JAPA don land. Abeg no call me for \"small something\" this month." },
  { id: "viral", emoji: "📈", title: ["Went viral", "I blow!"], check: (p) => p.achievements.includes("Went viral"), en: () => "I went viral. My cousins who never replied my messages now call me \"brand\".", pcm: () => "I go viral. Cousins wey no dey reply my message dey call me \"brand\" now." },
  { id: "arrested", emoji: "🚔", title: ["Arrested", "Dem arrest me"], check: (p) => p.crime.record.length > 0, en: (p) => `Arrested at ${p.age}. The policeman asked "what have you brought for me?" and I had nothing. Pray for me.`, pcm: (p) => `Dem arrest me at ${p.age}. Policeman ask "wetin you bring for me?" and I get nothing. Pray for me.` },
  { id: "married", emoji: "💍", title: ["Married", "I don marry"], check: (p) => Boolean(p.spouse), en: (p) => `Married at ${p.age}. The aso-ebi money has finished me, but love is sweet.`, pcm: (p) => `I marry at ${p.age}. Aso-ebi money don finish me, but love sweet.` },
  { id: "three_kids", emoji: "👨‍👩‍👧‍👦", title: ["Three kids", "Three pikin"], check: (p) => p.kids.length >= 3, en: () => "Three kids. My light bill and my blood pressure are both competing.", pcm: () => "Three pikin. My light bill and my blood pressure dey fight." },
  { id: "biz_boss", emoji: "🏪", title: ["Business boss", "Business oga"], check: (p) => p.businesses.length >= 3, en: () => "Three businesses. I now answer \"I'm in a meeting\" to people I owe money.", pcm: () => "Three business. I dey tell people I owe money say \"I dey meeting\"." },
  { id: "landlord", emoji: "🏘️", title: ["Landlord", "Landlord"], check: (p) => p.houses.length >= 3, en: () => "Three properties and I still pay rent in my dreams.", pcm: () => "Three property and I still dey pay rent for my dream." },
  { id: "lapo_rich", emoji: "🚀", title: ["Lapo to boss", "Lapo to boss"], check: (p) => p.classAtBirth === "struggling" && real(p) >= 100_000_000, en: () => "Born in lapo, now I own the lapo. Never tell a child he cannot.", pcm: () => "I born for lapo, now I own the lapo. No tell any pikin say e no fit." },
  { id: "eighty", emoji: "👴", title: ["Still here", "I still dey"], check: (p) => p.age >= 80, en: (p) => `${p.age} years old. NEPA could not take me. Fuel scarcity could not take me. I am the final boss.`, pcm: (p) => `${p.age} years old. NEPA no fit carry me. Fuel scarcity no fit carry me. Na me be final boss.` },
];

export function scanMoments(p: Player, lines: string[]) {
  p.moments ??= [];
  for (const d of MOMENT_DEFS) {
    if (p.moments.some((m) => m.id === d.id) || !d.check(p)) continue;
    const m: Moment = { id: d.id, age: p.age, emoji: d.emoji, title: T(d.title[0], d.title[1]), en: d.en(p), pcm: d.pcm(p) };
    p.moments.push(m);
    lines.push(T(`${d.emoji} New shareable moment: ${d.title[0]}. Check Legacy.`, `${d.emoji} New moment to share: ${d.title[1]}. Check Legacy.`));
  }
}

// ---------------------------------------------------------------------------
// Bucket list: three goals per life, cosmetics for finishing them
// ---------------------------------------------------------------------------
export type UnlockKind = "hair" | "wear" | "outfit";
export interface GoalDef {
  id: string;
  en: string;
  pcm: string;
  check: (p: Player) => boolean;
  unlock?: { kind: UnlockKind; id: string; en: string; pcm: string };
}
export const GOAL_DEFS: GoalDef[] = [
  { id: "firstclass", en: "Graduate with First Class", pcm: "Graduate with First Class", check: (p) => p.campus?.cls === "First Class", unlock: { kind: "hair", id: "beads", en: "Beaded braids", pcm: "Beaded braids" } },
  { id: "jet", en: "Own a private jet", pcm: "Own private jet", check: (p) => ownsCat(p, "jet"), unlock: { kind: "wear", id: "turban", en: "Head wrap", pcm: "Head wrap" } },
  { id: "sug", en: "Become SUG president", pcm: "Become SUG president", check: (p) => p.campus?.sug === "won", unlock: { kind: "wear", id: "redcap", en: "Red cap", pcm: "Red cap" } },
  { id: "wealth", en: "Reach ₦500M net worth", pcm: "Reach ₦500M net worth", check: (p) => real(p) >= 500_000_000, unlock: { kind: "outfit", id: "blazer", en: "Blazer", pcm: "Blazer" } },
  { id: "governor", en: "Become Governor", pcm: "Become Governor", check: (p) => high(p) >= 4, unlock: { kind: "hair", id: "bun", en: "Top bun", pcm: "Top bun" } },
  { id: "japa", en: "Japa successfully", pcm: "Japa well well", check: (p) => p.achievements.includes("Japa success"), unlock: { kind: "hair", id: "puffs", en: "Twin puffs", pcm: "Twin puffs" } },
  { id: "kids3", en: "Raise three children", pcm: "Raise three pikin", check: (p) => p.kids.length >= 3, unlock: { kind: "wear", id: "band", en: "Headband", pcm: "Headband" } },
  { id: "biz3", en: "Run three businesses", pcm: "Run three business", check: (p) => p.businesses.length >= 3, unlock: { kind: "hair", id: "bob", en: "Bob cut", pcm: "Bob cut" } },
  { id: "viral", en: "Go viral online", pcm: "Go viral online", check: (p) => p.achievements.includes("Went viral"), unlock: { kind: "outfit", id: "hoodie", en: "Hoodie", pcm: "Hoodie" } },
  { id: "degree", en: "Earn a university degree", pcm: "Get university degree", check: (p) => p.edu === "tertiary" },
  { id: "marry", en: "Get married", pcm: "Marry", check: (p) => Boolean(p.spouse) },
  { id: "houses3", en: "Own three properties", pcm: "Own three property", check: (p) => p.houses.length >= 3 },
  { id: "survive", en: "Survive a kidnapping", pcm: "Survive kidnapping", check: (p) => p.achievements.includes("Survived kidnapping") },
  { id: "sixty", en: "Live to 60", pcm: "Reach 60 years", check: (p) => p.age >= 60 },
];
export const GOAL_BY_ID = Object.fromEntries(GOAL_DEFS.map((g) => [g.id, g])) as Record<string, GoalDef>;
/** Which goal opens which cosmetic, for lock hints in the look picker. */
export const UNLOCK_GOAL: Record<string, GoalDef> = Object.fromEntries(GOAL_DEFS.filter((g) => g.unlock).map((g) => [`${g.unlock!.kind}:${g.unlock!.id}`, g]));

export function assignGoals(p: Player) {
  const pool = [...GOAL_DEFS].sort(() => rng() - 0.5);
  const withPrize = pool.filter((g) => g.unlock);
  const first = withPrize[0];
  const rest = pool.filter((g) => g !== first).slice(0, 2);
  p.goals = [first, ...rest].map((g) => ({ id: g.id, done: false }));
}

export function checkGoals(p: Player, lines: string[]) {
  for (const g of p.goals ?? []) {
    const d = GOAL_BY_ID[g.id];
    if (g.done || !d || !d.check(p)) continue;
    g.done = true;
    g.doneAge = p.age;
    bump(p, "happiness", 6);
    lines.push(T(`🎯 Goal complete: ${d.en}.${d.unlock ? ` You unlocked: ${d.unlock.en}.` : ""}`, `🎯 Goal don complete: ${d.pcm}.${d.unlock ? ` You unlock: ${d.unlock.pcm}.` : ""}`));
    if (d.unlock) p.flags[`unlock:${d.unlock.kind}:${d.unlock.id}`] = 1;
  }
}

export function engageYear(p: Player, lines: string[]) {
  checkGoals(p, lines);
  scanMoments(p, lines);
  if (p.challenge && p.challenge.score === undefined && p.age >= 40) {
    p.challenge.score = Math.round(real(p));
    lines.push(T(`🏆 Challenge score locked in at 40: ${naira(p.challenge.score)}.`, `🏆 Challenge score don lock for 40: ${naira(p.challenge.score)}.`));
  }
}

export const dayIndex = (day: string): number => { let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ---------------------------------------------------------------------------
// Weekly challenge: the same start for everyone this week
// ---------------------------------------------------------------------------
export interface Challenge {
  id: string;
  seed: number;
  stateId: string;
  force: "struggling" | "lapo" | "middle" | "upperMiddle" | "nepo" | "newlyRich" | "fallenRich";
  title: string;
  goal: string;
}
const CHALLENGES: Omit<Challenge, "id" | "seed">[] = [
  { stateId: "borno", force: "lapo", title: "Born poor in Maiduguri", goal: "Richest by 40" },
  { stateId: "lagos", force: "struggling", title: "Born in a Lagos face-me-I-face-you", goal: "Richest by 40" },
  { stateId: "kano", force: "middle", title: "Middle-class in Kano", goal: "Richest by 40" },
  { stateId: "enugu", force: "lapo", title: "Born poor in Enugu", goal: "Richest by 40" },
  { stateId: "abuja", force: "nepo", title: "Born into Abuja money", goal: "Richest by 40 (do not waste it)" },
  { stateId: "rivers", force: "fallenRich", title: "Fallen rich in Port Harcourt", goal: "Rebuild by 40" },
];
export const weekId = (d: Date): string => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
};
export function challengeFor(wk: string): Challenge {
  const h = dayIndex(wk);
  return { id: wk, seed: h, ...CHALLENGES[h % CHALLENGES.length] };
}

// ---------------------------------------------------------------------------
// Naija Gist: world gossip, generated from the day and your own life
// ---------------------------------------------------------------------------
const GIST_STATES = ["Lagos", "Kano", "Enugu", "Abuja", "Rivers", "Ogun", "Oyo", "Kaduna", "Delta", "Anambra", "Borno", "Plateau"];
const GIST: ((s: string, a: number) => [string, string])[] = [
  (s, a) => [`Someone in ${s} just became governor at ${a + 30}.`, `Person for ${s} just become governor at ${a + 30}.`],
  (s, a) => [`A ${a + 18}-year-old in ${s} went viral with a skit about NEPA.`, `${a + 18}-year-old for ${s} go viral with skit about NEPA.`],
  (s) => [`A bukka in ${s} sold out of jollof before 1pm.`, `One bukka for ${s} finish jollof before 1pm.`],
  (s, a) => [`Someone in ${s} made First Class at ${a + 20} and her mother has told everybody.`, `Person for ${s} make First Class at ${a + 20} and her mama don tell everybody.`],
  (s) => [`A man in ${s} survived a kidnapping and escaped through the bush.`, `One man for ${s} survive kidnap and run pass bush.`],
  (s) => [`A landlord in ${s} just raised rent again. Tenants are "praying".`, `Landlord for ${s} raise rent again. Tenants dey "pray".`],
  (s, a) => [`Someone in ${s} bought a private jet at ${a + 35}. The traffic cried.`, `Person for ${s} buy private jet at ${a + 35}. Traffic cry.`],
  (s) => [`A student in ${s} became SUG president and promised free Wi-Fi.`, `One student for ${s} become SUG president and promise free Wi-Fi.`],
  (s, a) => [`Someone from ${s} japa'd at ${a + 24} and posted snow on day one.`, `Person from ${s} japa at ${a + 24} and post snow for day one.`],
  (s) => [`Ponzi alert in ${s}: "40% monthly" has vanished again.`, `Ponzi alert for ${s}: "40% monthly" don vanish again.`],
  (s, a) => [`A trader in ${s} turned ₦${(a + 2) * 20}K into three shops.`, `Trader for ${s} turn ₦${(a + 2) * 20}K to three shop.`],
  (s) => [`Fuel queue in ${s} stretches three kilometres. Someone is selling pure water.`, `Fuel queue for ${s} reach three kilometres. Person dey sell pure water.`],
];
export function gistFor(day: string, p: Player): { en: string; pcm: string; you?: boolean }[] {
  const h = dayIndex(day);
  const out: { en: string; pcm: string; you?: boolean }[] = [];
  for (let i = 0; i < 8; i++) {
    const s = GIST_STATES[(h + i * 7) % GIST_STATES.length];
    const [en, pcm] = GIST[(h + i * 5) % GIST.length](s, (h >> i) % 10);
    out.push({ en, pcm });
  }
  for (const m of [...(p.moments ?? [])].reverse().slice(0, 2)) out.unshift({ en: `You: ${m.en}`, pcm: `You: ${m.pcm}`, you: true });
  return out;
}

// ---------------------------------------------------------------------------
// Chain events and Nigerian moments
// ---------------------------------------------------------------------------
const cash = (p: Player, n: number, why: [string, string]) => transact(p, { amount: n, reason: T(why[0], why[1]), category: "event" });
const adult = (p: Player) => p.age >= 18;
const evId = (p: Player) => p.flags.stranger;

export const ENGAGE_EVENTS: EventDef[] = [
  {
    id: "stranger_help",
    title: dual("A stranger in trouble", "Stranger dey wahala"),
    weight: (p) => (p.age >= 16 && p.age <= 42 && evId(p) === undefined ? 1.1 : 0),
    text: () => T("A well-dressed stranger's car breaks down near you. He has no cash on him and his phone is dead. He asks if you can help.", "One well-dressed stranger car spoil near you. E no get cash and him phone don die. E ask if you fit help."),
    choices: (p) => [
      { label: T("Give him transport money", "Give am transport money"), sub: naira(I(p, 5_000)), disabled: p.money < I(p, 5_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 5_000), ["Helped a stranger", "Help stranger"]); q.flags.stranger = q.age; q.flags.strangerHelped = 1; bump(q, "reputation", 2); return T("He writes your name in a small notebook and promises to remember. You wonder if he will.", "E write your name for small notebook and promise to remember. You dey wonder if e go remember."); } },
      { label: T("Offer a ride", "Give am ride"), disabled: p.possessions.license && p.vehicles.length > 0 ? false : T("You have no car to drive", "You no get car"), run: (q) => { q.flags.stranger = q.age; q.flags.strangerHelped = 1; bump(q, "stress", 2); bump(q, "reputation", 1); return T("You drop him at his gate. He says 'God will reward you'. Many people say that.", "You drop am for him gate. E say 'God go reward you'. Plenty people dey talk that one."); } },
      { label: T("Walk on", "Waka go"), run: (q) => { q.flags.stranger = q.age; return T("Not your problem. You keep walking.", "No be your problem. You continue waka."); } },
    ],
  },
  {
    id: "stranger_returns",
    title: dual("A familiar face", "Face wey you know"),
    weight: (p) => (typeof p.flags.stranger === "number" && p.flags.strangerDone === undefined && p.age >= Number(p.flags.stranger) + 8 ? 3 : 0),
    text: (p) => (p.flags.strangerHelped ? T("Years later, a man in a sharp suit stops you at an event. 'You gave me transport money once. I wrote your name in a notebook. I am now the MD of a company.'", "Years later, man for sharp suit stop you for event. 'You give me transport money once. I write your name for notebook. I be MD of company now.'") : T("Years later, you see the stranger on a magazine cover: MD of a big company. He does not remember you at all.", "Years later, you see the stranger for magazine cover: MD of big company. E no remember you at all.")),
    choices: (p) => (p.flags.strangerHelped ? [
      { label: T("Accept his offer", "Accept him offer"), run: (q) => { q.flags.strangerDone = 1; const g = I(q, rand(2_000_000, 9_000_000)); cash(q, g, ["Reward from the stranger you once helped", "Reward from stranger wey you help"]); bump(q, "connections", 8); bump(q, "reputation", 4); return T(`He gives you ${naira(g)} and a door into his company. Kindness paid.`, `E give you ${naira(g)} and door enter him company. Kindness pay.`); } },
      { label: T("Ask only for a handshake", "Ask only handshake"), run: (q) => { q.flags.strangerDone = 1; bump(q, "reputation", 6); bump(q, "happiness", 6); return T("He insists on a gift anyway. You decline and he tells everyone you are 'a good person'.", "E insist on gift anyway. You refuse and e tell everybody say you be 'good person'."); } },
    ] : [
      { label: T("Introduce yourself", "Introduce yourself"), run: (q) => { q.flags.strangerDone = 1; bump(q, "stress", 3); return T("He nods politely and walks on. You wonder what could have been.", "E nod small and waka go. You dey wonder wetin for happen."); } },
      { label: T("Let it go", "Let am go"), run: (q) => { q.flags.strangerDone = 1; return T("Life is long. You keep going.", "Life long. You continue."); } },
    ]),
  },
  {
    id: "detty_december",
    title: dual("Detty December", "Detty December"),
    weight: (p) => (adult(p) ? 1.3 : 0),
    text: () => T("It is December. Lagos is full, flights are expensive, and everyone you know is posting. Where will you be?", "Na December. Lagos full, flight cost, and everybody you know dey post. Where you go dey?"),
    choices: (p) => [
      { label: T("Go all out in Lagos", "Go Lagos full gas"), sub: naira(I(p, 450_000)), disabled: p.money < I(p, 450_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 450_000), ["Detty December in Lagos", "Detty December for Lagos"]); bump(q, "happiness", 12); bump(q, "connections", 5); bump(q, "health", -3); if (chance(0.2)) { cash(q, -I(q, 100_000), ["Pickpocketed at a concert", "Dem thief for concert"]); return T("The concerts are unreal. Someone also picks your pocket.", "Concerts sweet die. Person also thief your pocket."); } return T("Concerts, beach, owambe and new friends. You return broke and glowing.", "Concert, beach, owambe, new friends. You return broke but you dey glow."); } },
      { label: T("Stay home with family", "Stay house with family"), run: (q) => { q.family.happy = clamp(q.family.happy + 8); bump(q, "happiness", 4); return T("Rice, stories and your mother's unsolicited advice. Peaceful.", "Rice, stories and your mama free advice. Peace."); } },
      { label: T("Hustle through the rush", "Hustle for the rush"), run: (q) => { const g = I(q, rand(120_000, 600_000)); cash(q, g, ["December hustle", "December hustle"]); bump(q, "stress", 5); return T(`Everyone is spending, so you sell. You make ${naira(g)}.`, `Everybody dey spend, so you sell. You make ${naira(g)}.`); } },
    ],
  },
  {
    id: "ramadan_sallah",
    title: dual("Ramadan and Sallah", "Ramadan and Sallah"),
    weight: (p) => (p.religion === "Muslim" && p.age >= 6 ? 2 : 0),
    text: (p) => (p.age < 18 ? T("Ramadan has ended and Sallah is here. New clothes, jollof, and neighbours visiting all day. The ram is the topic of every conversation.", "Ramadan don end and Sallah don reach. New cloth, jollof, and neighbours dey visit the whole day. Ram na the gist everywhere.") : T("Ramadan has ended and Sallah is here. Neighbours exchange food and the ram is the topic of every conversation.", "Ramadan don end and Sallah don reach. Neighbours dey exchange food and ram na the gist.")),
    choices: (p) => p.age < 18 ? [
      { label: T("Wear your new clothes and visit neighbours", "Wear your new cloth and visit neighbours"), run: (q) => { const gift = I(q, 3_000); transact(q, { amount: gift, reason: T("Sallah money from relatives and neighbours", "Sallah money from relatives and neighbours"), category: "gift" }); bump(q, "happiness", 6); q.family.happy = clamp(q.family.happy + 3); return T(`Every house gives you rice and a little Sallah money: ${naira(gift)}. Best day of the year.`, `Every house give you rice and small Sallah money: ${naira(gift)}. Best day of the year.`); } },
      { label: T("Help your mother in the kitchen", "Help your mama for kitchen"), run: (q) => { bump(q, "happiness", 3); bump(q, "smarts", 1); q.family.happy = clamp(q.family.happy + 4); return T("You stir, wash and carry plates. Your mother says you are a blessing.", "You stir, wash and carry plate. Your mama say you be blessing."); } },
      { label: T("Share food with children on your street", "Share food with pikin for your street"), run: (q) => { bump(q, "reputation", 1); bump(q, "happiness", 4); return T("You and the other children eat together on the veranda. Nobody wants the day to end.", "You and other pikin chop together for veranda. Nobody wan make the day end."); } },
    ] : [
      { label: T("Buy a ram and feed the street", "Buy ram feed the street"), sub: naira(I(p, 250_000)), disabled: p.money < I(p, 250_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 250_000), ["Sallah ram for the community", "Sallah ram for community"]); bump(q, "reputation", 5); bump(q, "happiness", 6); return T("The whole street prays for you. Your phone is full of greetings.", "Whole street dey pray for you. Your phone full with greeting."); } },
      { label: T("Celebrate simply with family", "Celebrate small with family"), run: (q) => { q.family.happy = clamp(q.family.happy + 6); bump(q, "happiness", 4); return T("New clothes, rice and visits. Warm and simple.", "New cloth, rice and visit. Warm and simple."); } },
      { label: T("Give to the needy", "Give to people wey need"), sub: naira(I(p, 80_000)), disabled: p.money < I(p, 80_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 80_000), ["Zakat and gifts", "Zakat and gifts"]); bump(q, "reputation", 3); bump(q, "stress", -3); return T("You give quietly. It feels right.", "You give quietly. E sweet for heart."); } },
    ],
  },
  {
    id: "aso_ebi_levy",
    title: dual("Aso-ebi wahala", "Aso-ebi wahala"),
    weight: (p) => (p.age >= 20 ? 1.6 : 0),
    text: () => T("A friend's wedding is in three weeks. The aso-ebi committee has sent a 'small' levy plus the colour you must wear.", "Your friend wedding don near. Aso-ebi committee send 'small' levy and the colour wey you must wear."),
    choices: (p) => [
      { label: T("Pay for the aso-ebi", "Pay aso-ebi"), sub: naira(I(p, 90_000)), disabled: p.money < I(p, 90_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 90_000), ["Aso-ebi and gift", "Aso-ebi and gift"]); bump(q, "happiness", 4); bump(q, "connections", 2); return T("You look fine in the photos. The tailor delivers on the morning of the wedding.", "You fine for the photo. Tailor deliver for the morning of wedding."); } },
      { label: T("Wear something you own", "Wear wetin you get"), run: (q) => { bump(q, "reputation", -1); return T("You wear a similar colour. Two aunties comment on it.", "You wear similar colour. Two aunty comment."); } },
      { label: T("Send a gift and skip", "Send gift and skip"), sub: naira(I(p, 30_000)), disabled: p.money < I(p, 30_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { cash(q, -I(q, 30_000), ["Wedding gift", "Wedding gift"]); bump(q, "connections", -1); return T("Your friend understands. Mostly.", "Your friend understand. Mostly."); } },
    ],
  },
  {
    id: "nysc_story",
    title: dual("NYSC camp stories", "NYSC camp gist"),
    weight: (p) => (p.edu === "tertiary" && p.age >= 21 && p.age <= 28 && p.flags.nyscStory === undefined ? 2.5 : 0),
    text: () => T("Orientation camp: 5am parades, mammy market and a platoon full of strangers from every tribe. What is your camp life like?", "Orientation camp: 5am parade, mammy market and platoon full of strangers from every tribe. How your camp life be?"),
    choices: () => [
      { label: T("Join the camp talent show", "Join camp talent show"), run: (q) => { q.flags.nyscStory = 1; bump(q, "happiness", 6); bump(q, "connections", 4); return T("You become 'the guy from platoon 7'. You make friends for life.", "You turn 'the guy from platoon 7'. You make friends for life."); } },
      { label: T("Do the parades properly", "Do parade well"), run: (q) => { q.flags.nyscStory = 1; bump(q, "fitness", 4); bump(q, "reputation", 2); return T("Your platoon commander notices. You get a good CDS post.", "Platoon commander notice you. You get good CDS post."); } },
      { label: T("Dodge as much as you can", "Dodge as much as you fit"), run: (q) => { q.flags.nyscStory = 1; bump(q, "stress", -2); return chance(0.3) ? (bump(q, "reputation", -2), T("You get caught and have to run extra laps.", "Dem catch you and you run extra lap.")) : T("You sleep through half the programme. Nobody notices.", "You sleep through half the programme. Nobody notice."); } },
    ],
  },
  {
    id: "abroad_first_winter",
    title: dual("First winter abroad", "First winter abroad"),
    weight: (p) => (p.state === "abroad" && p.flags.abroadStory === undefined ? 4 : 0),
    text: () => T("You have been abroad a few months. It is freezing, your jollof tastes different and you miss home in a way you did not expect.", "You don stay abroad few months. Cold dey freeze you, your jollof taste different and you dey miss house pass wetin you think."),
    choices: (p) => [
      { label: T("Find the Nigerian community", "Find Nigerian community"), run: (q) => { q.flags.abroadStory = 1; bump(q, "happiness", 6); bump(q, "connections", 4); return T("A church hall, suya and people who speak your Pidgin. You feel at home.", "Church hall, suya and people wey dey speak your Pidgin. You feel at home."); } },
      { label: T("Work extra shifts", "Work extra shift"), run: (q) => { q.flags.abroadStory = 1; const g = I(q, rand(300_000, 900_000)); cash(q, g, ["Extra shifts abroad", "Extra shift abroad"]); bump(q, "stress", 6); return T(`Tiring, but ${naira(g)} richer.`, `You tire, but ${naira(g)} richer.`); } },
      { label: T("Call home every night", "Call house every night"), sub: naira(I(p, 20_000)), run: (q) => { q.flags.abroadStory = 1; cash(q, -I(q, 20_000), ["International calls", "International call"]); q.family.happy = clamp(q.family.happy + 8); return T("Your mother cries, then asks if you have sent anything.", "Your mama cry, then ask if you don send anything."); } },
    ],
  },
];
void pick; void OFFICES;
