/**
 * Day One. You have just been sworn in and everyone wants a job: your childhood friend, the party chairman's son,
 * a World Bank economist, a retired general, the man your pastor or imam recommended. Who you pick runs the villa,
 * and their hidden side comes out later. All people are fictional.
 */
import { subRng, type Rng } from "../../game/engine/rng";
import { autoFillRest } from "./cabinet";
import type { Aide, AideKind, FixState, Minister, Portfolio } from "./types";
import { addMod, clamp100, nb, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";
import { portraitFor, type Zone } from "./people";
import { faithFor } from "./identity";

const FIRST_M = ["Tunde", "Emeka", "Musa", "Segun", "Chinedu", "Bala", "Kelechi", "Yusuf", "Femi", "Ikenna", "Sani", "Dapo", "Uche", "Abba", "Gbolahan", "Nnamdi", "Ibrahim", "Obinna", "Kunle", "Ahmed", "Tamuno", "Ebuka", "Babatunde", "Aminu"];
const FIRST_F = ["Ngozi", "Amina", "Funke", "Zainab", "Chioma", "Hauwa", "Bisi", "Adaeze", "Halima", "Yetunde", "Ifeoma", "Fatima", "Kemi", "Nneka", "Aisha", "Tari", "Folake", "Ebere"];
const LAST = ["Adewale", "Okonkwo", "Garba", "Bakare", "Eze", "Dikko", "Ajayi", "Nwachukwu", "Shehu", "Olaniyan", "Umaru", "Obi", "Lawal", "Ekpo", "Salami", "Anyanwu", "Danjuma", "Okafor", "Bello", "Adeyemi", "Ibekwe", "Tanko", "Briggs", "Oyelaran", "Mohammed", "Ugwu"];
const HOMETOWN = ["Ikenne", "Otuoke", "Daura", "Abeokuta", "Nsukka", "Bida", "Ogbomosho", "Owerri", "Gusau", "Ilesa", "Calabar", "Jos", "Yenagoa", "Zaria", "Onitsha", "Ilorin", "Makurdi", "Warri"];

export const AIDE_KINDS: Record<AideKind, { tag: string; icon: string; perk: string; flaw: string }> = {
  friend: { tag: "Childhood friend", icon: "🤝", perk: "Would die for you. Nobody knows what else they would do.", flaw: "Cannot say no to you, and you cannot say no to them." },
  technocrat: { tag: "Technocrat", icon: "🎓", perk: "Brilliant and honest. Investors love it. Will quit if you get dirty.", flaw: "No political base: your backers will hate it." },
  chieftain: { tag: "Party chairman's child", icon: "🎩", perk: "Lawmakers pick up the phone. +Assembly support.", flaw: "The party will want contracts." },
  general: { tag: "Retired general", icon: "🎖️", perk: "The barracks stay quiet. Some say they dream of your chair.", flaw: "Sees every problem as a battle." },
  cleric: { tag: "Your spiritual father's pick", icon: "🙏", perk: "Faith leaders are delighted. Meetings start with long prayers.", flaw: "Young people find the office preachy." },
  regional: { tag: "Regional power-broker", icon: "🗺️", perk: "Balances the ticket: brings a zone's votes and the Assembly's ear.", flaw: "Puts their zone first." },
  loyalist: { tag: "Party loyalist", icon: "🎗️", perk: "Keeps the party faithful. Knows where every body is buried.", flaw: "Knows too much to ever be sacked." },
  defector: { tag: "Opposition defector", icon: "🔄", perk: "Weakens your rival and splits the opposition.", flaw: "Loyal to whoever is winning." },
  tycoon: { tag: "Business tycoon", icon: "💼", perk: "Investors and big business trust you more. Gets things built fast.", flaw: "Their companies keep winning contracts." },
  activist: { tag: "Civil-society activist", icon: "📣", perk: "The young and the press give you the benefit of the doubt.", flaw: "Lawmakers and godfathers cannot stand them." },
  spymaster: { tag: "Former spy chief", icon: "🕵️", perk: "Coup plotters are found early, and rumours are sorted faster.", flaw: "Keeps files on everyone. Including you." },
  diaspora: { tag: "Diaspora returnee", icon: "✈️", perk: "World-class skills and contacts abroad. Investors take calls.", flaw: "Has never run anything in Nigeria. Grumbles about NEPA." },
  royal: { tag: "Royal heir", icon: "👑", perk: "Traditional rulers and faith leaders open every door.", flaw: "Expects to be treated like royalty, because they are." },
};

const QUOTES: Record<AideKind, string[]> = {
  friend: ["Oga, no wahala. I go handle am.", "We don come far. I no go let you fall.", "Who else go carry this load for you? Na me.", "Remember Form Two? I covered for you then. I'll cover for you now."],
  technocrat: ["The numbers do not lie, but they are easy to ignore.", "Give me the data and one honest year.", "I can fix the economy. I cannot fix politics.", "Every naira has to be accounted for. Every single one."],
  chieftain: ["My father sends greetings. And his list.", "Every senator takes my call. That is not an accident.", "Politics is a relationship business.", "The party built this house. Let us keep the family happy."],
  general: ["Discipline. A country runs like a barracks or not at all.", "I will have your desk clean by 6 a.m.", "Give me the order and I will give you the result.", "I have buried men for this country. I will not see it fall."],
  cleric: ["Let us pray, then let us work.", "The people trust a clean heart.", "God has a plan, and I have a schedule.", "Humility first. Results will follow."],
  regional: ["My zone voted for you. My zone expects to be remembered.", "I know every chief from here to the creeks.", "Balance. A ticket without balance falls.", "Give my people one road and they will give you two elections."],
  loyalist: ["Thirty years. I have never missed a meeting.", "The party is a family. I call the family together.", "I know where things are buried, and I have never dug.", "Loyalty is cheaper than talent, and rarer."],
  defector: ["I know their secrets. I know their weaknesses.", "I left them for you. Do not make me regret it.", "The opposition is hollow. Let me show you.", "They will call me a traitor. Let them."],
  tycoon: ["Time is money, and Nigeria is wasting both.", "I built a company from one kiosk. I can build a country.", "Give me the permits and get out of my way.", "Everybody has a price. The trick is knowing it."],
  activist: ["I marched against the last government. I will march against you if I must.", "Transparency is not a slogan. It is a spreadsheet.", "The youth are watching. So am I.", "Power should be uncomfortable. That is my job."],
  spymaster: ["I already know what you are going to ask.", "Every phone in Abuja has two listeners. One of them is mine.", "Trust is good. Files are better.", "Nothing happens in this country without someone telling me first."],
  diaspora: ["In London we would have fixed this in a week. Here, give me a month.", "I left a big salary to come home. Let me be useful.", "Why is there no light in the Villa? Never mind. Let's work.", "The world is ready to invest. We just have to answer the phone."],
  royal: ["My father's palace has seen twelve governments. Yours will be remembered.", "The rulers will listen if I ask them to.", "Patience is the oldest kind of power.", "A crown is a responsibility, not a decoration."],
};
const QUIRKS = ["Never sleeps more than four hours", "Answers every message with a voice note", "Has a WhatsApp group for everything", "Collects vintage Peugeot 504s", "Quotes Chinua Achebe in every memo", "Cannot stand journalists", "Owns a suspicious number of houses in Abuja", "Plays chess with the Senate President", "Fasts every Monday and Thursday", "Is famous for never smiling", "Has a cousin in every ministry", "Writes everything in red ink", "Supports Arsenal with frightening passion", "Was once arrested at a protest", "Brings jollof to every meeting", "Has never been seen without a fila or gele", "Speaks Hausa, Igbo, Yoruba and Pidgin fluently", "Keeps a diary nobody is allowed to read"];

/** a short life story per kind; several variants so no two games feel the same. {he} {his} {him} {town} {surname} get filled in */
const BIOS: Record<AideKind, string[]> = {
  friend: ["You grew up together in {town} and shared one pair of school sandals. {He} sold phones in Alaba before your campaign.", "Your secondary-school best friend from {town}. {He} drove you to every rally in a borrowed Corolla.", "{He} lent you money for your first campaign when nobody else would. {He} has never asked for it back. Yet."],
  technocrat: ["Ex-World Bank economist. Speaks five languages and has never won a ward election.", "Former central bank director who resigned rather than print money for the last government.", "Harvard-trained, ran the most efficient state finance ministry in the country, then walked away from politics."],
  chieftain: ["Child of the party's national chairman. Has every senator's number and a fleet of SUVs.", "Grew up in the party's corridors. Knows which senator owes which favour, going back twenty years.", "The party chairman's eldest. Charming, well connected, and nobody has ever seen {him} read a budget."],
  general: ["Retired major-general from {town}. Runs everything like a barracks and starts meetings at 6 a.m.", "Led the peacekeeping mission in Liberia. Decorated, feared, and still trusted by the junior officers.", "Former commander of the Guards Brigade. Knows every officer by name, and their weaknesses."],
  cleric: ["Recommended by your spiritual father after a long night vigil. Organised, humble and well connected.", "Runs a hospital and three schools through {his} faith mission in {town}. Has never taken a bribe, they say.", "Mediated a peace deal between two communities in {town} that nobody thought possible."],
  regional: ["Former governor from {town}. Eats with the zone's traditional rulers and never loses a ward.", "Commands the loyalty of five states' worth of delegates. Without {him}, the ticket is lopsided.", "Ran the zone's biggest political machine for a decade. Every chief in {town} owes {him} a favour."],
  loyalist: ["Thirty years in the party. Has chaired every committee and forgotten nobody's birthday.", "Was party secretary when the party had one office and no money. Has never switched sides.", "Organised your primary victory ward by ward. Knows every delegate, and what each of them was paid."],
  defector: ["Crossed the carpet from the opposition after a public quarrel. Brings secrets and a grudge.", "Was the opposition's campaign director until last month. Nobody quite knows why {he} left.", "Former opposition senator who says {he} 'found the light'. The opposition says {he} found a contract."],
  tycoon: ["Built a cement and logistics empire from one kiosk in {town}. Owns half the trucks on the Lagos–Kano road.", "Founder of a fintech worth a billion dollars. Wears sneakers to state banquets.", "Runs the country's biggest agro-business. Has more workers than some states have civil servants."],
  activist: ["Led the #EndBadGovernance protests and was tear-gassed twice. Now {he} wants to fix things from inside.", "Founded a budget-tracking group that exposed ₦300bn in padded contracts.", "Human-rights lawyer from {town} who has sued three governments. Won twice."],
  spymaster: ["Former deputy director of the secret service. Has files on everyone in this room.", "Thirty years in intelligence. Ran operations in the Sahel nobody will ever read about.", "Quietly foiled two coup plots under previous presidents. Nobody knows what {he} looks like on TV."],
  diaspora: ["Left {town} at eighteen, became a partner at a London bank, and came home for this job.", "Built logistics systems for a giant American tech company. Thinks in spreadsheets and deadlines.", "A celebrated surgeon in Houston who turned down a fortune to serve. Has never queued for petrol."],
  royal: ["Heir to an ancient throne in {town}. Educated at Oxford, fluent in palace politics.", "Child of a first-class traditional ruler. Every emir, oba and obi takes {his} calls.", "Royal blood, a law degree and a reputation for settling disputes that courts could not."],
};
const TITLE: Partial<Record<AideKind, (f: boolean) => string>> = {
  general: () => "Gen. (rtd)", technocrat: () => "Dr", chieftain: () => "Hon.", cleric: (f) => (f ? "Rev. Mother" : "Mallam"), royal: (f) => (f ? "Princess" : "Prince"), tycoon: (f) => (f ? "Mrs" : "Chief"), spymaster: () => "", diaspora: () => "Dr", activist: () => "Barr.",
};
function makeAide(rng: Rng, kind: AideKind, i: number): Aide {
  const female = kind === "general" ? rng.chance(0.15) : rng.chance(0.4);
  const surname = rng.pick(LAST);
  const plain = `${rng.pick(female ? FIRST_F : FIRST_M)} ${surname}`;
  const town = rng.pick(HOMETOWN);
  const r = (a: number, b: number) => Math.round(rng.range(a, b));
  const stats: Record<AideKind, [number, number, number]> = {
    friend: [r(30, 55), r(90, 99), r(15, 70)], technocrat: [r(80, 96), r(40, 60), r(75, 96)], chieftain: [r(42, 62), r(55, 70), r(20, 50)],
    general: [r(55, 75), r(55, 80), r(40, 72)], cleric: [r(45, 65), r(65, 85), r(55, 88)], regional: [r(50, 70), r(50, 70), r(32, 66)],
    loyalist: [r(42, 62), r(80, 95), r(38, 72)], defector: [r(55, 78), r(30, 50), r(30, 66)], tycoon: [r(70, 88), r(45, 65), r(25, 60)],
    activist: [r(55, 78), r(45, 70), r(80, 97)], spymaster: [r(68, 86), r(45, 75), r(35, 70)], diaspora: [r(78, 94), r(45, 65), r(65, 90)], royal: [r(50, 70), r(55, 80), r(45, 80)],
  };
  const [skill, loyalty, integrity] = stats[kind];
  const P = female ? { He: "She", he: "she", his: "her", him: "her" } : { He: "He", he: "he", his: "his", him: "him" };
  const bio = rng.pick(BIOS[kind]).replace(/\{(He|he|his|him|town|surname)\}/g, (_, k: string) => (k === "town" ? town : k === "surname" ? surname : P[k as keyof typeof P]));
  const t = TITLE[kind]?.(female) ?? "";
  const name = t ? `${t} ${plain}` : plain;
  const quote = rng.pick(QUOTES[kind]);
  const zone = rng.pick(["NW", "NE", "NC", "SW", "SE", "SS"]); const faith = faithFor(rng, zone);
  const portrait = portraitFor(rng, female, zone as Zone);
  if (kind === "general" || kind === "spymaster") { portrait.outfit = 2; portrait.wear = 0; }
  if (kind === "royal") { portrait.outfit = 1; portrait.wear = female ? 2 : 1; }
  if (kind === "technocrat" || kind === "diaspora") portrait.outfit = 2;
  return { id: `aide-${kind}-${i}`, kind, quote, name, bio, skill, loyalty, integrity, portrait, female, zone, faith, quirk: rng.pick(QUIRKS), revealed: !["friend", "chieftain", "defector", "tycoon", "spymaster"].includes(kind), since: 0 };
}
/** draw a varied line-up: one dependable political pick, one clean pick, and two surprises */
function lineup(rng: Rng, political: AideKind[], clean: AideKind[], wild: AideKind[]): AideKind[] {
  const out: AideKind[] = [rng.pick(political), rng.pick(clean)];
  const rest = [...political, ...clean, ...wild].filter((k) => !out.includes(k));
  while (out.length < 4) { const k = rest.splice(rng.int(0, rest.length - 1), 1)[0]; out.push(k); }
  return [out[0], out[2], out[1], out[3]];
}

const eraKey = (s: FixState): number[] => ((s.cap?.era ?? 1) > 1 ? [s.cap.era] : []);
/** The Chief of Staff candidates are fixed by the world seed (and which president you are). */
export function cosCandidates(s: FixState): Aide[] {
  const rng = subRng(s.meta.seed, "cos", ...(eraKey(s)));
  const kinds = lineup(rng, ["friend", "chieftain", "tycoon"], ["technocrat", "activist", "diaspora"], ["general", "cleric", "spymaster"]);
  return kinds.map((k, i) => makeAide(rng, k, i));
}

export function vpCandidates(s: FixState): Aide[] {
  const rng = subRng(s.meta.seed, "vp", ...(eraKey(s)));
  const kinds = lineup(rng, ["regional", "loyalist", "royal"], ["technocrat", "activist", "diaspora"], ["defector", "cleric", "tycoon"]);
  return kinds.map((k, i) => makeAide(rng, k, i + 10));
}
export function pickVice(s: FixState, id: string): { ok: boolean; message: string } {
  const a = vpCandidates(s).find((x) => x.id === id);
  if (!a) return { ok: false, message: "That person is not available." };
  s.staff.vp = { ...a, since: s.month };
  if (a.kind === "regional") s.assembly.support = Math.min(100, s.assembly.support + 4);
  if (a.kind === "defector") s.rival.popularity = Math.max(0, s.rival.popularity - 4);
  if (a.kind === "cleric") s.groupMood.faith = Math.min(40, s.groupMood.faith + 6);
  if (a.kind === "technocrat") s.groupMood.business = Math.min(40, s.groupMood.business + 4);
  if (a.kind === "loyalist") for (const b of s.backers ?? []) b.mood = Math.min(100, b.mood + 3);
  pushNews(s, { source: `vp:${s.month}`, headline: `${a.name} named Vice President`, body: `${AIDE_KINDS[a.kind].tag}. ${AIDE_KINDS[a.kind].perk}`, tone: "neutral" });
  return { ok: true, message: `${a.name} is your Vice President.` };
}
/** Cronies: for every ministry, someone close to you wants the job. Their honesty stays hidden. */
const CRONY_BIO = [
  "Your childhood friend from primary school. Once sold you groundnuts on credit.",
  "Your in-law. Your spouse says he is 'very capable'.",
  "Your biggest campaign donor. He paid for the posters in all 36 states.",
  "Your former driver. He knows everything and has never told anyone. Yet.",
  "Your university roommate. Sharp, funny, and permanently broke.",
  "Your cousin from the village. The whole family is counting on him.",
];
export function addCronies(s: FixState, rng: Rng, portfolios: Portfolio[], makeName: () => string) {
  portfolios.forEach((p, i) => {
    const m: Minister = { id: `m-${p}-crony`, name: makeName(), portfolio: p, skill: Math.round(rng.range(30, 58)), integrity: Math.round(rng.range(10, 75)), faction: "crony", trait: "Loyal", zone: "", since: 0, mood: 85, hidden: true, portrait: portraitFor(rng, false), quirk: "Has known you for twenty years", bio: CRONY_BIO[(i + rng.int(0, 5)) % CRONY_BIO.length] };
    s.cabinet.pool.push(m);
  });
}

export function applyStaff(s: FixState) {
  removeMods(s, "cos");
  const a = s.staff.cos;
  if (!a) { addMod(s, "cos", "No Chief of Staff", { capacity: -3 }, { duration: null }); return; }
  const k = (a.skill - 55) / 10;
  const dirt = Math.max(0, (50 - a.integrity) / 50);
  addMod(s, "cos", `Chief of Staff: ${a.name}`, { capacity: 1.5 * k, procurement: 1.2 * k - 3 * dirt, corruption: 3 * dirt, investor: a.kind === "technocrat" ? 3 : a.kind === "tycoon" || a.kind === "diaspora" ? 2 : 0, trust: a.kind === "technocrat" || a.kind === "activist" ? 1 : 0, ...(a.kind === "tycoon" ? { roads: 1 } : {}), ...(a.kind === "activist" ? { transparency: 2 } : {}) }, { duration: null, ramp: 2 });
}
/** extra Assembly support from your Chief of Staff */
export const staffAssembly = (s: FixState) => { const k = s.staff?.cos?.kind; return k === "chieftain" ? 7 : k === "royal" ? 3 : k === "activist" ? -4 : 0; };
/** coup pressure from your Chief of Staff (negative = calmer barracks) */
export const staffCoup = (s: FixState) => { const a = s.staff?.cos; if (a?.kind === "spymaster") return -5; if (a?.kind !== "general") return 0; return a.loyalty < 40 ? 10 : -7; };

export function pickChiefOfStaff(s: FixState, id: string): { ok: boolean; message: string } {
  const a = cosCandidates(s).find((x) => x.id === id);
  if (!a) return { ok: false, message: "That person is not available." };
  s.staff.cos = { ...a, since: s.month };
  if (a.kind === "cleric") s.groupMood.faith = Math.min(40, s.groupMood.faith + 8);
  if (a.kind === "general") s.groupMood.military = Math.min(40, s.groupMood.military + 6);
  if (a.kind === "technocrat" || a.kind === "tycoon" || a.kind === "diaspora") s.groupMood.business = Math.min(40, s.groupMood.business + 5);
  if (a.kind === "activist") s.groupMood.youth = Math.min(40, s.groupMood.youth + 6);
  if (a.kind === "royal") s.groupMood.faith = Math.min(40, s.groupMood.faith + 4);
  applyStaff(s);
  pushNews(s, { source: `cos:${s.month}`, headline: `${a.name} named Chief of Staff`, body: `${AIDE_KINDS[a.kind].tag}. ${AIDE_KINDS[a.kind].perk}`, tone: "neutral" });
  return { ok: true, message: `${a.name} is your Chief of Staff.` };
}
export function finishDayOne(s: FixState) { autoFillRest(s); s.staff.picked = true; if (s.flags.coach === undefined) s.flags.coach = 0; if (!s.staff.cos) applyStaff(s); }
export const advisers = (s: FixState): Aide[] => [s.staff?.cos, s.staff?.vp].filter(Boolean) as Aide[];

/** Monthly: your people show their true colours. */
export function staffMonthly(s: FixState, rng: Rng) {
  const a = s.staff?.cos;
  if (!a || s.month - a.since < 3) return;
  const open = (tpl: string) => s.events.some((e) => e.tpl === tpl && e.status === "open");
  if (a.kind === "friend" && a.integrity < 50 && !open("cosFriend") && !s.flags.cosFriendDone && rng.chance(0.07)) { s.flags.cosFriendDone = s.month; createEvent(s, "cosFriend", "NG-FC"); }
  if ((a.kind === "technocrat" || a.kind === "activist" || a.kind === "diaspora") && (s.me.evidence > 25 || s.rule.democracy < 55) && !open("cosQuit") && rng.chance(0.12)) createEvent(s, "cosQuit", "NG-FC");
  if ((a.kind === "general" || a.kind === "spymaster") && s.rule.coupRisk > 30 && !open("cosGeneral") && rng.chance(0.08)) createEvent(s, "cosGeneral", "NG-FC");
  if ((a.kind === "chieftain" || a.kind === "tycoon") && !open("cosParty") && !s.flags[`cosParty:${Math.floor(s.month / 12)}`] && rng.chance(0.06)) { s.flags[`cosParty:${Math.floor(s.month / 12)}`] = 1; createEvent(s, "cosParty", "NG-FC"); }
}

const cosName = (s: FixState) => s.staff?.cos?.name ?? "Your Chief of Staff";
export const STAFF_TEMPLATES = [
  {
    id: "cosFriend", kind: "scandal" as const, urgency: 2,
    title: (s: FixState) => `Your childhood friend ${cosName(s)} built a 40-room mansion`,
    cause: (s: FixState) => `Photos are everywhere: ${cosName(s)}, your Chief of Staff and oldest friend, has a new mansion with a helipad in his hometown and three new cars. Journalists say ${nb(45)} of contracts passed through his office. He swears it was "gifts from well-wishers".`,
    options: [
      { id: "sack", label: "Sack him, publicly", explain: "Friendship ends where the country begins.", cost: 0, tradeoff: "He knows your secrets, and he is hurt.", unc: "medium" as const, chance: () => 0.7,
        win: { trust: 5, mods: { corruption: -1.5 }, dur: 8, run: (s: FixState) => { const n = cosName(s); s.staff.cos = null; applyStaff(s); return `${n} is out. Nigerians are shocked you did it. You will need a new Chief of Staff.`; } },
        lose: { trust: 3, evidence: 10, run: (s: FixState) => { const n = cosName(s); s.staff.cos = null; applyStaff(s); return `${n} is out, and furious. He gave an interview hinting at "what I know about Oga".`; } }, winText: "", loseText: "" },
      { id: "refund", label: "Make him pay it back quietly", explain: "Keep your friend, recover the money.", cost: 0, tradeoff: "If it leaks, it looks like a cover-up.", unc: "high" as const, chance: () => 0.55,
        win: { treasury: 40, trust: 1, run: (s: FixState) => { if (s.staff.cos) { s.staff.cos.integrity = clamp100(s.staff.cos.integrity + 25); s.staff.cos.revealed = true; } return "He sold two cars and returned the money. He is grateful, and more careful now."; } },
        lose: { trust: -4, evidence: 8, scandal: 1 }, winText: "", loseText: "A whistle-blower leaked the 'refund'. The press calls it a cover-up." },
      { id: "defend", label: "Defend him: 'he is a hard-working man'", explain: "Loyalty first.", cost: 0, tradeoff: "Everyone will see what they think they see.", unc: "low" as const, chance: () => 0.9,
        win: { trust: -5, evidence: 6, corruption: 1, run: (s: FixState) => { if (s.staff.cos) { s.staff.cos.loyalty = 100; s.staff.cos.revealed = true; } return "Your friend is safe and more loyal than ever. Twitter has turned the mansion into a meme."; } },
        lose: { trust: -7, evidence: 8, scandal: 1 }, winText: "", loseText: "" },
    ],
    expire: { trust: -4, evidence: 5 }, expireText: () => "You said nothing. Silence was read as approval.",
  },
  {
    id: "cosQuit", kind: "story" as const, urgency: 2,
    title: (s: FixState) => `${cosName(s)} threatens to resign: "${s.staff?.cos?.kind === "activist" ? "I did not march for this" : s.staff?.cos?.kind === "diaspora" ? "I did not leave London for this" : "I did not leave the World Bank for this"}"`,
    cause: (s: FixState) => `Your Chief of Staff says the government is ${s.rule.democracy < 55 ? "sliding into strongman rule" : "drowning in corruption"}. ${s.staff?.cos?.female ? "She" : "He"} has drafted a resignation letter, and the foreign press has the number.`,
    options: [
      { id: "promise", label: "Promise a clean-up", explain: "Convince him to stay.", cost: 0, tradeoff: "He will be watching. So will investors.", unc: "medium" as const, chance: (s: FixState) => (s.me.evidence < 40 ? 0.7 : 0.35), win: { trust: 2, run: () => "He stays, for now. 'I am giving you six months, Mr President.'" }, lose: { run: (s: FixState) => { const n = cosName(s); s.staff.cos = null; applyStaff(s); s.eco.investor -= 5; return `${n} resigned anyway and told the Financial Times why. Investors are spooked.`; } }, winText: "", loseText: "" },
      { id: "goodbye", label: "Let him go", explain: "You need people who understand Nigeria.", cost: 0, tradeoff: "Investors and the World Bank notice.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.eco.investor -= 4; return "He left with a polite statement and a sharp interview. You will need a new Chief of Staff."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.eco.investor -= 5; return "He resigned and went straight to CNN."; } }, expireText: () => "He resigned.",
  },
  {
    id: "cosGeneral", kind: "power" as const, urgency: 1,
    title: (s: FixState) => `${cosName(s)} has been meeting generals at night`,
    cause: (s: FixState) => `Your Chief of Staff, ${s.staff?.cos?.kind === "spymaster" ? "a former spy chief with files on all of them" : "a retired general"}, has hosted three late-night dinners for serving commanders. Your security people are worried. Coup risk is ${Math.round(s.rule.coupRisk)}/100.`,
    options: [
      { id: "sack", label: "Sack him and retire his friends", explain: "Strike first.", cost: 10, tradeoff: "If you are wrong, you have insulted the army.", unc: "high" as const, chance: () => 0.6, win: { coup: -12, run: (s: FixState) => { s.staff.cos = null; applyStaff(s); return "He is gone, and four generals with him. The barracks are tense but quiet."; } }, lose: { coup: 10, run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.groupMood.military -= 8; return "The army took it as an insult. Officers are grumbling."; } }, winText: "", loseText: "" },
      { id: "promote", label: "Make him Minister of Defence too", explain: "Keep him close and happy.", cost: 0, tradeoff: "He gets even more power.", unc: "medium" as const, chance: () => 0.65, win: { coup: -6, democracy: -3, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = clamp100(s.staff.cos.loyalty + 25); return "He is flattered. The dinners stop."; } }, lose: { coup: 8, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = 25; return "More power only made him hungrier."; } }, winText: "", loseText: "" },
      { id: "ignore", label: "He is loyal. Ignore the gossip", explain: "Trust your man.", cost: 0, tradeoff: "If the gossip is true…", unc: "high" as const, chance: (s: FixState) => ((s.staff.cos?.loyalty ?? 50) >= 60 ? 0.8 : 0.35), win: { run: () => "It was only dinner. He laughed when you told him." }, lose: { coup: 15, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = 20; return "The gossip was true. The barracks are restless."; } }, winText: "", loseText: "" },
    ],
    expire: { coup: 8 }, expireText: () => "The dinners continue.",
  },
  {
    id: "cosParty", kind: "request" as const, urgency: 3,
    title: (s: FixState) => (s.staff?.cos?.kind === "tycoon" ? "Your Chief of Staff's companies want the contracts" : "The party chairman wants contracts for 'our people'"),
    cause: (s: FixState) => s.staff?.cos?.kind === "tycoon" ? `${cosName(s)} brings a list: road contracts, port concessions and a power plant, all for firms that happen to belong to the family. "Who else can deliver this fast?"` : `${cosName(s)}, your Chief of Staff and the chairman's child, brings a list: road contracts, oil-lifting slots and board seats for party men. "Papa says this is how the party survives."`,
    options: [
      { id: "give", label: "Give them some", explain: "Keep the party machine oiled.", cost: 30, tradeoff: "More waste and corruption.", unc: "low" as const, chance: () => 0.95, win: { assembly: 6, corruption: 1.5, evidence: 3 }, lose: { assembly: 3 }, winText: "Lawmakers are suddenly very supportive.", loseText: "" },
      { id: "refuse", label: "Refuse: contracts go to the best bid", explain: "Open contracting for everyone.", cost: 0, tradeoff: "The party sulks.", unc: "low" as const, chance: () => 0.95, win: { assembly: -6, trust: 2, mods: { procurement: 2 }, dur: 12 }, lose: { assembly: -8 }, winText: "The chairman is livid; the public is impressed.", loseText: "" },
    ],
    expire: { assembly: -3 }, expireText: () => "The party took your silence as a no.",
  },
];
