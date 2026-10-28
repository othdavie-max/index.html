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

const FIRST = ["Tunde", "Emeka", "Musa", "Segun", "Chinedu", "Bala", "Kelechi", "Yusuf", "Femi", "Ikenna", "Sani", "Dapo", "Uche", "Abba", "Gbolahan", "Nnamdi"];
const LAST = ["Adewale", "Okonkwo", "Garba", "Bakare", "Eze", "Dikko", "Ajayi", "Nwachukwu", "Shehu", "Olaniyan", "Umaru", "Obi", "Lawal", "Ekpo", "Salami", "Anyanwu"];
const HOMETOWN = ["Ikenne", "Otuoke", "Daura", "Abeokuta", "Nsukka", "Bida", "Ogbomosho", "Owerri", "Gusau", "Ilesa"];

export const AIDE_KINDS: Record<AideKind, { tag: string; icon: string; perk: string; flaw: string }> = {
  friend: { tag: "Childhood friend", icon: "🤝", perk: "Would die for you. Nobody knows what else he would do.", flaw: "Cannot say no to you, and you cannot say no to him." },
  technocrat: { tag: "Technocrat", icon: "🎓", perk: "Brilliant and honest. Investors love it. Will quit if you get dirty.", flaw: "No political base: your backers will hate it." },
  chieftain: { tag: "Party chairman's son", icon: "🎩", perk: "Lawmakers pick up his calls. The party will want contracts.", flaw: "The party will want its share." },
  general: { tag: "Retired general", icon: "🎖️", perk: "The barracks stay quiet. Some say he dreams of your chair.", flaw: "Sees every problem as a battle." },
  cleric: { tag: "Your spiritual father's pick", icon: "🙏", perk: "Faith leaders are delighted. Meetings start with long prayers.", flaw: "Young people find the office preachy." },
  regional: { tag: "Regional power-broker", icon: "🗺️", perk: "Balances the ticket: brings his zone's votes and the Assembly's ear.", flaw: "Puts his zone first." },
  loyalist: { tag: "Party loyalist", icon: "🎗️", perk: "Keeps the party faithful. Knows where every body is buried.", flaw: "Knows too much to ever be sacked." },
  defector: { tag: "Opposition defector", icon: "🔄", perk: "Weakens your rival and splits the opposition. Will he stay loyal?", flaw: "Loyal to whoever is winning." },
};

const QUOTES: Record<AideKind, string[]> = {
  friend: ["Oga, no wahala. I go handle am.", "We don come far, my guy. I no go let you fall.", "Who else go carry this load for you? Na me."],
  technocrat: ["The numbers do not lie, Sir, but they are easy to ignore.", "Give me the data and one honest year.", "I can fix the economy. I cannot fix politics."],
  chieftain: ["Mr President, my father sends his greetings. And his list.", "Every senator takes my call. That is not an accident.", "Politics is a relationship business, Sir."],
  general: ["Discipline, Sir. A country runs like a barracks or not at all.", "I will have your desk clean by 6 a.m.", "Give me the order and I will give you the result."],
  cleric: ["Let us pray, then let us work.", "The people trust a clean heart, Sir.", "God has a plan, and I have a schedule."],
  regional: ["My zone voted for you. My zone expects to be remembered.", "I know every chief from here to the creeks.", "Balance, Sir. A ticket without balance falls."],
  loyalist: ["Thirty years, Sir. I have never missed a meeting.", "The party is a family. I am the one who calls the family together.", "I know where things are buried, and I have never dug."],
  defector: ["I know their secrets, Sir. I know their weaknesses.", "I left them for you. Do not make me regret it.", "The opposition is hollow. Let me show you."],
};
function makeAide(rng: Rng, kind: AideKind, i: number): Aide {
  const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
  const town = rng.pick(HOMETOWN);
  const r = (a: number, b: number) => Math.round(rng.range(a, b));
  const base: Record<AideKind, [string, number, number, number]> = {
    friend: [`You grew up together in ${town} and shared one pair of school sandals. He sold phones in Alaba before your campaign.`, r(32, 50), 98, r(15, 70)],
    technocrat: [`Dr ${name.split(" ")[1]}, ex-World Bank economist. Speaks five languages, has never won a ward election.`, r(84, 95), 48, r(78, 95)],
    chieftain: [`Son of the party's national chairman. He has every senator's number and a fleet of SUVs.`, r(45, 60), 62, r(22, 48)],
    general: [`Retired major-general from ${town}. Runs everything like a barracks and starts meetings at 6 a.m.`, r(58, 72), 70, r(42, 70)],
    cleric: [`Recommended by your spiritual father after a long night vigil. Organised, humble, and very well connected.`, r(48, 62), 75, r(55, 85)],
    regional: [`Former governor from ${town}. Eats with the zone's traditional rulers and never loses a ward.`, r(52, 68), 60, r(35, 65)],
    loyalist: [`Thirty years in the party. Has chaired every committee and forgotten nobody's birthday.`, r(45, 60), 85, r(40, 70)],
    defector: [`Crossed the carpet from the opposition after a public quarrel. Brings secrets and a grudge.`, r(55, 75), 40, r(35, 65)],
  };
  const [bio, skill, loyalty, integrity] = base[kind];
  const title = kind === "general" ? "Gen. (rtd)" : kind === "technocrat" ? "Dr" : kind === "chieftain" ? "Hon." : kind === "cleric" ? "Deacon/Mallam" : "";
  const quote = rng.pick(QUOTES[kind]);
  return { id: `aide-${kind}-${i}`, kind, quote, name: title ? `${title} ${name}` : name, bio, skill, loyalty, integrity, portrait: { skin: rng.int(1, 5), hair: rng.int(0, 3), style: rng.int(0, 3), accent: rng.int(0, 4) }, revealed: kind !== "friend" && kind !== "chieftain" && kind !== "defector", since: 0 };
}

const eraKey = (s: FixState): number[] => ((s.cap?.era ?? 1) > 1 ? [s.cap.era] : []);
/** The Chief of Staff candidates are fixed by the world seed (and which president you are). */
export function cosCandidates(s: FixState): Aide[] {
  const rng = subRng(s.meta.seed, "cos", ...(eraKey(s)));
  const kinds: AideKind[] = ["friend", "technocrat", "chieftain", rng.chance(0.5) ? "general" : "cleric"];
  return kinds.map((k, i) => makeAide(rng, k, i));
}

export function vpCandidates(s: FixState): Aide[] {
  const rng = subRng(s.meta.seed, "vp", ...(eraKey(s)));
  const kinds: AideKind[] = ["regional", "technocrat", "defector", rng.chance(0.5) ? "loyalist" : "cleric"];
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
    const m: Minister = { id: `m-${p}-crony`, name: makeName(), portfolio: p, skill: Math.round(rng.range(30, 58)), integrity: Math.round(rng.range(10, 75)), faction: "crony", trait: "Loyal", zone: "", since: 0, mood: 85, hidden: true, bio: CRONY_BIO[(i + rng.int(0, 5)) % CRONY_BIO.length] };
    s.cabinet.pool.push(m);
  });
}

export function applyStaff(s: FixState) {
  removeMods(s, "cos");
  const a = s.staff.cos;
  if (!a) { addMod(s, "cos", "No Chief of Staff", { capacity: -3 }, { duration: null }); return; }
  const k = (a.skill - 55) / 10;
  const dirt = Math.max(0, (50 - a.integrity) / 50);
  addMod(s, "cos", `Chief of Staff: ${a.name}`, { capacity: 1.5 * k, procurement: 1.2 * k - 3 * dirt, corruption: 3 * dirt, investor: a.kind === "technocrat" ? 3 : 0, trust: a.kind === "technocrat" ? 1 : 0 }, { duration: null, ramp: 2 });
}
/** extra Assembly support from your Chief of Staff */
export const staffAssembly = (s: FixState) => (s.staff?.cos?.kind === "chieftain" ? 7 : 0);
/** coup pressure from your Chief of Staff (negative = calmer barracks) */
export const staffCoup = (s: FixState) => { const a = s.staff?.cos; if (a?.kind !== "general") return 0; return a.loyalty < 40 ? 10 : -7; };

export function pickChiefOfStaff(s: FixState, id: string): { ok: boolean; message: string } {
  const a = cosCandidates(s).find((x) => x.id === id);
  if (!a) return { ok: false, message: "That person is not available." };
  s.staff.cos = { ...a, since: s.month };
  if (a.kind === "cleric") s.groupMood.faith = Math.min(40, s.groupMood.faith + 8);
  if (a.kind === "general") s.groupMood.military = Math.min(40, s.groupMood.military + 6);
  if (a.kind === "technocrat") s.groupMood.business = Math.min(40, s.groupMood.business + 5);
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
  if (a.kind === "technocrat" && (s.me.evidence > 25 || s.rule.democracy < 55) && !open("cosQuit") && rng.chance(0.12)) createEvent(s, "cosQuit", "NG-FC");
  if (a.kind === "general" && s.rule.coupRisk > 30 && !open("cosGeneral") && rng.chance(0.08)) createEvent(s, "cosGeneral", "NG-FC");
  if (a.kind === "chieftain" && !open("cosParty") && !s.flags[`cosParty:${Math.floor(s.month / 12)}`] && rng.chance(0.06)) { s.flags[`cosParty:${Math.floor(s.month / 12)}`] = 1; createEvent(s, "cosParty", "NG-FC"); }
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
    title: (s: FixState) => `${cosName(s)} threatens to resign: "I did not leave the World Bank for this"`,
    cause: (s: FixState) => `Your technocrat Chief of Staff says the government is ${s.rule.democracy < 55 ? "sliding into strongman rule" : "drowning in corruption"}. He has drafted a resignation letter and the foreign press has his number.`,
    options: [
      { id: "promise", label: "Promise a clean-up", explain: "Convince him to stay.", cost: 0, tradeoff: "He will be watching. So will investors.", unc: "medium" as const, chance: (s: FixState) => (s.me.evidence < 40 ? 0.7 : 0.35), win: { trust: 2, run: () => "He stays, for now. 'I am giving you six months, Mr President.'" }, lose: { run: (s: FixState) => { const n = cosName(s); s.staff.cos = null; applyStaff(s); s.eco.investor -= 5; return `${n} resigned anyway and told the Financial Times why. Investors are spooked.`; } }, winText: "", loseText: "" },
      { id: "goodbye", label: "Let him go", explain: "You need people who understand Nigeria.", cost: 0, tradeoff: "Investors and the World Bank notice.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.eco.investor -= 4; return "He left with a polite statement and a sharp interview. You will need a new Chief of Staff."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.eco.investor -= 5; return "He resigned and went straight to CNN."; } }, expireText: () => "He resigned.",
  },
  {
    id: "cosGeneral", kind: "power" as const, urgency: 1,
    title: (s: FixState) => `${cosName(s)} has been meeting generals at night`,
    cause: (s: FixState) => `Your Chief of Staff, a retired general, has hosted three late-night dinners for serving commanders. Your security people are worried. Coup risk is ${Math.round(s.rule.coupRisk)}/100.`,
    options: [
      { id: "sack", label: "Sack him and retire his friends", explain: "Strike first.", cost: 10, tradeoff: "If you are wrong, you have insulted the army.", unc: "high" as const, chance: () => 0.6, win: { coup: -12, run: (s: FixState) => { s.staff.cos = null; applyStaff(s); return "He is gone, and four generals with him. The barracks are tense but quiet."; } }, lose: { coup: 10, run: (s: FixState) => { s.staff.cos = null; applyStaff(s); s.groupMood.military -= 8; return "The army took it as an insult. Officers are grumbling."; } }, winText: "", loseText: "" },
      { id: "promote", label: "Make him Minister of Defence too", explain: "Keep him close and happy.", cost: 0, tradeoff: "He gets even more power.", unc: "medium" as const, chance: () => 0.65, win: { coup: -6, democracy: -3, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = clamp100(s.staff.cos.loyalty + 25); return "He is flattered. The dinners stop."; } }, lose: { coup: 8, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = 25; return "More power only made him hungrier."; } }, winText: "", loseText: "" },
      { id: "ignore", label: "He is loyal. Ignore the gossip", explain: "Trust your man.", cost: 0, tradeoff: "If the gossip is true…", unc: "high" as const, chance: (s: FixState) => ((s.staff.cos?.loyalty ?? 50) >= 60 ? 0.8 : 0.35), win: { run: () => "It was only dinner. He laughed when you told him." }, lose: { coup: 15, run: (s: FixState) => { if (s.staff.cos) s.staff.cos.loyalty = 20; return "The gossip was true. The barracks are restless."; } }, winText: "", loseText: "" },
    ],
    expire: { coup: 8 }, expireText: () => "The dinners continue.",
  },
  {
    id: "cosParty", kind: "request" as const, urgency: 3,
    title: () => "The party chairman wants contracts for 'our people'",
    cause: (s: FixState) => `${cosName(s)}, your Chief of Staff and the chairman's son, brings a list: road contracts, oil-lifting slots and board seats for party men. "Papa says this is how the party survives."`,
    options: [
      { id: "give", label: "Give them some", explain: "Keep the party machine oiled.", cost: 30, tradeoff: "More waste and corruption.", unc: "low" as const, chance: () => 0.95, win: { assembly: 6, corruption: 1.5, evidence: 3 }, lose: { assembly: 3 }, winText: "Lawmakers are suddenly very supportive.", loseText: "" },
      { id: "refuse", label: "Refuse: contracts go to the best bid", explain: "Open contracting for everyone.", cost: 0, tradeoff: "The party sulks.", unc: "low" as const, chance: () => 0.95, win: { assembly: -6, trust: 2, mods: { procurement: 2 }, dur: 12 }, lose: { assembly: -8 }, winText: "The chairman is livid; the public is impressed.", loseText: "" },
    ],
    expire: { assembly: -3 }, expireText: () => "The party took your silence as a no.",
  },
];
