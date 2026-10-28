/**
 * The desk: every month the president's desk gets a few short, human cards (a governor begging, a minister wanting
 * money, a letter from a market woman). Cards remember promises. When things go well, success creates new problems.
 * Expectations rise every year, and each term has its own big crisis. All people are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, nb, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";
import { relate } from "./society";
import { ripple } from "./ripples";

const sname = (id: string) => STATE_BY_ID[id]?.name ?? id;
const W = (s: FixState, k: string, m: number) => { void m; return typeof s.flags[`cdt:${k}`] === "number" && s.month - (s.flags[`cdt:${k}`] as number) < 10; };

interface Card { tpl: string; w: (s: FixState) => number; place: (s: FixState, rng: Rng) => string }
const pickState = (rng: Rng, ids: string[]) => rng.pick(ids);
const ANY = ["NG-KN", "NG-KD", "NG-LA", "NG-OY", "NG-EN", "NG-AN", "NG-PL", "NG-BE", "NG-SO", "NG-AB", "NG-OG", "NG-ED"];

export const DESK_DECK: Card[] = [
  { tpl: "villageRoad", w: () => 1.2, place: (_s, r) => pickState(r, ANY) },
  { tpl: "governorBegs", w: (s) => (s.fin.treasury > 100 ? 1 : 0.5), place: (_s, r) => pickState(r, ANY) },
  { tpl: "ministerPet", w: (s) => (Object.keys(s.cabinet.members).length > 2 ? 1 : 0), place: () => "NG-FC" },
  { tpl: "marketLetter", w: (s) => (s.eco.foodInflation > 18 ? 1.4 : 0.6), place: (_s, r) => pickState(r, ["NG-AN", "NG-KN", "NG-LA", "NG-AB"]) },
  { tpl: "pressQuestion", w: () => 0.9, place: () => "NG-FC" },
  { tpl: "relatives", w: (s) => (s.month >= 4 ? 0.9 : 0), place: () => "NG-FC" },
  { tpl: "pastorInvite", w: () => 0.7, place: (_s, r) => pickState(r, ["NG-LA", "NG-OG", "NG-AB", "NG-KD"]) },
  { tpl: "unionWage", w: (s) => (s.eco.inflation > 15 ? 1.2 : 0.4), place: () => "NG-FC" },
  { tpl: "areaBoys", w: () => 0.6, place: (_s, r) => pickState(r, ["NG-LA", "NG-RI", "NG-AB"]) },
  // when things go well, success creates new problems
  { tpl: "trafficBoom", w: (s) => (s.gov.happiness > 55 && s.eco.growth > 3 ? 2 : 0), place: () => "NG-LA" },
  { tpl: "wantMore", w: (s) => (s.gov.happiness > 58 ? 2 : 0), place: () => "NG-FC" },
  { tpl: "poaching", w: (s) => (s.eco.investor > 55 ? 1.6 : 0), place: () => "NG-LA" },
  { tpl: "richGetRicher", w: (s) => (s.eco.growth > 3.5 && s.jobs.unemployment < 18 ? 1.6 : 0), place: () => "NG-FC" },
  { tpl: "creditCrunch", w: (s) => (s.eco.fx < 1000 ? 1.4 : 0), place: () => "NG-FC" },
];

/** monthly: make sure there is always something to do */
export function deskMonthly(s: FixState, rng: Rng) {
  checkPromises(s);
  updateExpectations(s, rng);
  termCrisis(s);
  const open = s.events.filter((e) => e.status === "open").length;
  const want = open === 0 ? 2 : open <= 1 ? 1 : 0;
  let made = 0;
  const bag = DESK_DECK.map((c) => ({ c, w: c.w(s) })).filter((x) => x.w > 0 && !W(s, x.c.tpl, 10) && !s.events.some((e) => e.tpl === x.c.tpl && e.status === "open"));
  while (made < want && bag.length) {
    const tot = bag.reduce((a, b) => a + b.w, 0);
    let x = rng.next() * tot, i = 0;
    for (; i < bag.length - 1; i++) { x -= bag[i].w; if (x <= 0) break; }
    const [{ c }] = bag.splice(i, 1);
    const ev = createEvent(s, c.tpl, c.place(s, rng));
    if (ev) made++;
  }
}

// ---------------------------------------------------------------- promises that come back
interface Mem { kind: "road" | "backerJobs"; stateId: string; due: number; asked: number }
const mems = (s: FixState) => JSON.parse(String(s.flags.mems ?? "[]")) as Mem[];
const saveMems = (s: FixState, m: Mem[]) => { s.flags.mems = JSON.stringify(m); };
function checkPromises(s: FixState) {
  const m = mems(s);
  if (!m.length) return;
  const rest: Mem[] = [];
  for (const x of m) {
    if (s.month < x.due) { rest.push(x); continue; }
    if (x.kind === "backerJobs") {
      const own = Object.values(s.cabinet.members).filter((m) => m && (m.faction === "crony" || m.faction === "loyalist")).length;
      if (own >= 2 || s.flags.deputies !== undefined) { for (const b of s.backers) b.mood = clamp100(b.mood + 6); pushNews(s, { source: `memjobs:${s.month}`, headline: "Backers say the president kept his word to them", body: "Their people got seats at the table.", tone: "neutral" }); }
      else { for (const b of s.backers) b.mood = clamp100(b.mood - 22 * b.power); s.assembly.support = clamp100(s.assembly.support - 5); ripple(s, "snub"); pushNews(s, { source: `memjobsX:${s.month}`, headline: "Backers: 'he promised us, and he lied'", body: "The eight months are up. Nothing was done.", tone: "bad" }); }
      continue;
    }
    const kept = s.projects.some((p) => p.stateId === x.stateId && p.status === "done" && (p.done ?? 0) >= x.asked - 2);
    if (kept) { relate(s, x.stateId, 6); s.gov.trust = clamp100(s.gov.trust + 2.5); pushNews(s, { source: `memroad:${x.stateId}:${s.month}`, headline: `${sname(x.stateId)}: "the president kept his word"`, body: "A road promised more than a year ago was opened. Villagers danced at the ribbon cutting.", tone: "good", stateId: x.stateId }); }
    else { relate(s, x.stateId, -8); s.gov.trust = clamp100(s.gov.trust - 3); const r = s.regions[x.stateId]; if (r) r.unrest = clamp100(r.unrest + 6); pushNews(s, { source: `memroadX:${x.stateId}:${s.month}`, headline: `${sname(x.stateId)}: "you promised us a road"`, body: "Residents blocked the highway with a banner reading 'Mr President, remember us.'", tone: "bad", stateId: x.stateId }); }
  }
  saveMems(s, rest);
}

// ---------------------------------------------------------------- rising expectations
function updateExpectations(s: FixState, rng: Rng) {
  const years = Math.floor(s.month / 12);
  const wins = s.achievements.length + s.projects.filter((p) => p.status === "done").length;
  const level = clamp(0.35 * years + 0.1 * wins, 0, 7);
  s.flags.expect = Math.round(level * 10) / 10;
  removeMods(s, "expectations");
  addMod(s, "expectations", "Rising expectations: people want more every year", { happiness: -0.3 * level }, { duration: null, ramp: 1 });
  if (s.month > 0 && s.month % 12 === 0 && s.flags.expYear !== years) {
    s.flags.expYear = years;
    const wants = ["jobs for young people", "cheaper food", "a working hospital in every local government", "stable electricity", "a strong naira", "safe roads"];
    pushNews(s, { source: `expect:${years}`, headline: `New poll: after year ${years}, Nigerians now say they want ${rng.pick(wants)}`, body: "What impressed people last year is now the minimum. Expectations rise every year you are in office.", tone: "neutral" });
  }
}

// ---------------------------------------------------------------- each term has its own crisis
function termCrisis(s: FixState) {
  const into = s.month - s.termStart;
  if (into !== 8 || s.flags[`tc:${s.term}`]) return;
  s.flags[`tc:${s.term}`] = 1;
  if (s.term === 2) createEvent(s, "oilCrash", "NG-RI");
  else if (s.term === 3) createEvent(s, "elitePlot", "NG-FC");
  else if (s.term >= 4) createEvent(s, "succession", "NG-FC");
}

// ---------------------------------------------------------------- templates
const cards = [
  {
    id: "villageRoad", kind: "request" as const, urgency: 4,
    title: (_s: FixState, st: string) => `${st}: a village chief asks for a road`,
    cause: (_s: FixState, st: string) => `The chief of a village in ${st} sits outside your office with a tin of palm oil and a very polite letter. The rainy season cuts his people off for months. "We voted for you, Sir."`,
    options: [
      { id: "promise", label: "Promise: 'I will build you a road'", explain: "Make it public. Then build it.", cost: 0, tradeoff: "He will remember in a year and a half.", unc: "low" as const, chance: () => 0.97, win: { trust: 1.5, run: (s: FixState, e: { stateId: string }) => { const m = mems(s); m.push({ kind: "road", stateId: e.stateId, due: s.month + 16, asked: s.month }); saveMems(s, m); return "The whole village cheered. In 16 months he will check on you."; } }, lose: {}, winText: "", loseText: "" },
      { id: "grant", label: "Send a small grant for the worst section", explain: "Quick, local, cheap.", cost: 8, tradeoff: "A patch, not a road.", unc: "low" as const, chance: () => 0.9, win: { govRel: 2, mods: { roads: 0.5 }, dur: 12 }, lose: {}, winText: "A grader and gravel arrived. The track is passable.", loseText: "" },
      { id: "refuse", label: "Politely decline: no money", explain: "Be honest.", cost: 0, tradeoff: "He will go to the governor.", unc: "low" as const, chance: () => 1, win: { govRel: -1.5 }, lose: {}, winText: "He thanked you and left, disappointed.", loseText: "" },
    ],
    expire: { govRel: -1 }, expireText: () => "The chief went home without an answer.",
  },
  {
    id: "governorBegs", kind: "request" as const, urgency: 3,
    title: (_s: FixState, st: string) => `The governor of ${st} asks for a bailout`,
    cause: (_s: FixState, st: string) => `The governor of ${st} says salaries are two months late and teachers are on strike. He wants ${nb(35)} from the federation account.`,
    options: [
      { id: "pay", label: "Release the money", explain: "Keep him friendly.", cost: 35, tradeoff: "He will ask again.", unc: "low" as const, chance: () => 0.95, win: { govRel: 6, trust: 0.5 }, lose: {}, winText: "Teachers were paid within the week.", loseText: "" },
      { id: "half", label: "Give half, with conditions", explain: "Audit the books first.", cost: 17, tradeoff: "He may sulk.", unc: "medium" as const, chance: () => 0.65, win: { govRel: 2, corruption: -0.4 }, lose: { govRel: -3 }, winText: "He grumbled and accepted.", loseText: "He called a press conference to complain." },
      { id: "no", label: "Say no", explain: "States must manage their own money.", cost: 0, tradeoff: "Strikes and anger in his state.", unc: "low" as const, chance: () => 1, win: { govRel: -6, unrest: 4 }, lose: {}, winText: "The governor went home furious. Teachers stayed on strike.", loseText: "" },
    ],
    expire: { govRel: -3 }, expireText: () => "He decided you do not care.",
  },
  {
    id: "ministerPet", kind: "request" as const, urgency: 4,
    title: () => "A minister asks for money for his pet project",
    cause: (s: FixState) => { const m = Object.values(s.cabinet.members)[0]; return `${m?.name ?? "A minister"} wants ${nb(40)} for 'a landmark project' in his hometown: a conference centre. Your technocrats roll their eyes.`; },
    options: [
      { id: "yes", label: "Approve it", explain: "Keep the minister happy.", cost: 40, tradeoff: "Money wasted, but one loyal minister.", unc: "low" as const, chance: () => 0.9, win: { corruption: 0.5, evidence: 1, groups: { workers: -1 } }, lose: {}, winText: "A ribbon was cut. Nothing else happened.", loseText: "" },
      { id: "no", label: "Refuse", explain: "Money goes to real priorities.", cost: 0, tradeoff: "He will sulk and talk.", unc: "low" as const, chance: () => 1, win: { trust: 1, mods: { procurement: 0.5 }, dur: 6 }, lose: {}, winText: "He left muttering about 'loyalty'.", loseText: "" },
    ],
    expire: {}, expireText: () => "He raised it again next month.",
  },
  {
    id: "marketLetter", kind: "request" as const, urgency: 4,
    title: (_s: FixState, st: string) => `Mama Nkechi writes from ${st}: "Rice is killing us"`,
    cause: (s: FixState) => `A market woman wrote on lined paper: "Oga President, a bag of rice is ₦${Math.round(90000 * s.eco.foodPriceIdx / 100).toLocaleString()}. My customers buy half. My children eat once. Please do something." The letter went viral.`,
    options: [
      { id: "relief", label: "Release grain to the market", explain: "Cheap grain from the reserve.", cost: 20, tradeoff: "A small, temporary help.", unc: "low" as const, chance: () => 0.9, win: { mods: { foodPrice: -1.5 }, dur: 3, groups: { traders: 3 } }, lose: {}, winText: "Rice prices fell in her market within two weeks. She sent you a thank-you note.", loseText: "" },
      { id: "visit", label: "Visit her stall", explain: "Cameras, a handshake and a promise.", cost: 2, tradeoff: "Looks like a photo-op if prices do not fall.", unc: "medium" as const, chance: (s: FixState) => 0.4 + 0.4 * (s.gov.trust / 100), win: { trust: 2.5, groups: { traders: 3 } }, lose: { trust: -2 }, winText: "She cried and hugged you. The photo went everywhere.", loseText: "People called it a stunt." },
      { id: "ignore", label: "File it", explain: "You cannot answer every letter.", cost: 0, tradeoff: "She will tell people.", unc: "low" as const, chance: () => 1, win: { trust: -1 }, lose: {}, winText: "The letter stayed in the pile.", loseText: "" },
    ],
    expire: { trust: -1 }, expireText: () => "Her letter was shared 200,000 times with a sad emoji.",
  },
  {
    id: "pressQuestion", kind: "moment" as const, urgency: 3,
    title: () => "A journalist asks a hard question at the press briefing",
    cause: (s: FixState) => `"Mr President, ${s.me.evidence > 30 ? "Nigerians say your people are enriching themselves. What do you say?" : s.eco.inflation > 22 ? "inflation is " + Math.round(s.eco.inflation) + "%. Why should anyone believe your plan?" : "what is your plan for the next six months?"}" Cameras are rolling.`,
    options: [
      { id: "honest", label: "Answer honestly, including the bad parts", explain: "Say what is hard.", cost: 0, tradeoff: "Headlines may be harsh.", unc: "medium" as const, chance: () => 0.7, win: { trust: 3 }, lose: { trust: -1.5 }, winText: "The press room went quiet, then clapped. 'Refreshing.'", loseText: "Some of your honesty became a headline." },
      { id: "deflect", label: "Deflect with a joke", explain: "Smile and move on.", cost: 0, tradeoff: "It will trend, one way or the other.", unc: "high" as const, chance: () => 0.5, win: { trust: 1.5 }, lose: { trust: -3 }, winText: "Your joke became a meme.", loseText: "Your joke became a meme about you not answering." },
      { id: "attack", label: "Attack the press", explain: "'Fake news.'", cost: 0, tradeoff: "Press freedom suffers.", unc: "low" as const, chance: () => 0.9, win: { trust: -2, press: -4, democracy: -1 }, lose: {}, winText: "Your supporters cheered. The press did not.", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "relatives", kind: "request" as const, urgency: 5,
    title: () => "Your relatives want jobs and contracts",
    cause: () => "Your cousin from the village brought three uncles and a goat. 'You are our son, now it is our turn to eat.' Your spouse looks at you from across the room.",
    options: [
      { id: "give", label: "Give them something", explain: "Family is family.", cost: 0, tradeoff: "A paper trail, and resentment from others.", unc: "medium" as const, chance: () => 0.8, win: { evidence: 4, corruption: 0.5, wealth: 12 }, lose: { evidence: 6, trust: -3, scandal: 1 }, winText: "They went home happy.", loseText: "A blog posted a list of your relatives' new contracts." },
      { id: "refuse", label: "Refuse: 'public office is not a family business'", explain: "Hard, but clean.", cost: 0, tradeoff: "You will hear about it at every wedding.", unc: "low" as const, chance: () => 1, win: { trust: 2 }, lose: {}, winText: "The goat left disappointed. The press heard about it and loved it.", loseText: "" },
    ],
    expire: {}, expireText: () => "They waited in the sitting room for days.",
  },
  {
    id: "pastorInvite", kind: "request" as const, urgency: 4,
    title: (_s: FixState, st: string) => `A famous pastor invites you to his crusade in ${st}`,
    cause: () => "Two hundred thousand people will be there. He wants you on stage for a blessing. Your Muslim advisers are polite about it, and the Imam is watching too.",
    options: [
      { id: "go", label: "Attend and receive a blessing", explain: "Be seen with the people.", cost: 2, tradeoff: "Other faiths will notice.", unc: "medium" as const, chance: () => 0.7, win: { groups: { faith: 4 }, trust: 1 }, lose: { groups: { faith: -2 } }, winText: "The crowd roared. Your blessing was long.", loseText: "A video of you checking your watch went viral." },
      { id: "both", label: "Visit the Imam and the pastor in the same week", explain: "Show balance.", cost: 3, tradeoff: "Takes diplomacy.", unc: "medium" as const, chance: () => 0.6, win: { groups: { faith: 3 }, trust: 1.5 }, lose: { groups: { faith: -1 } }, winText: "A photo of the two leaders laughing with you was shared a million times.", loseText: "Both sides said you did not give them enough time." },
      { id: "send", label: "Send a minister", explain: "Be too busy.", cost: 0, tradeoff: "He will say you looked down on him.", unc: "low" as const, chance: () => 1, win: { groups: { faith: -2 } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { groups: { faith: -1 } }, expireText: () => "",
  },
  {
    id: "unionWage", kind: "strike" as const, urgency: 3,
    title: () => "The labour congress wants a higher minimum wage",
    cause: (s: FixState) => `The union leader says inflation of ${Math.round(s.eco.inflation)}% has eaten wages. He wants a big rise, or a strike on Monday.`,
    options: [
      { id: "pay", label: "Agree to the rise", explain: "Wages go up.", cost: 45, tradeoff: "Costs money every year, and may push prices.", unc: "low" as const, chance: () => 0.9, win: { groups: { workers: 6 }, mods: { wage: 2, inflation: 0.4 }, dur: 12 }, lose: {}, winText: "Workers celebrated. Employers warned of layoffs.", loseText: "" },
      { id: "half", label: "Offer a half-rise with a productivity deal", explain: "Meet in the middle.", cost: 20, tradeoff: "He may walk out.", unc: "medium" as const, chance: () => 0.6, win: { groups: { workers: 2 }, mods: { wage: 1 }, dur: 12 }, lose: { groups: { workers: -3 }, unrest: 2 }, winText: "A deal at 2 a.m.", loseText: "He walked out and called a strike." },
      { id: "no", label: "Refuse", explain: "There is no money.", cost: 0, tradeoff: "Strikes.", unc: "low" as const, chance: () => 1, win: { groups: { workers: -5 }, unrest: 3 }, lose: {}, winText: "A strike begins on Monday.", loseText: "" },
    ],
    expire: { groups: { workers: -3 }, unrest: 2 }, expireText: () => "The strike started on Monday.",
  },
  {
    id: "areaBoys", kind: "insecurity" as const, urgency: 4,
    title: (_s: FixState, st: string) => `Area boys have taken over a market in ${st}`,
    cause: () => "Touts with sticks collect 'levy' from every stall. Traders say the police look away. A local politician is rumoured to be behind them.",
    options: [
      { id: "raid", label: "Send the police on a clean-up", explain: "Arrests and a loud message.", cost: 8, tradeoff: "They will be back if nothing changes.", unc: "medium" as const, chance: () => 0.6, win: { insecurity: -1, trust: 1, groups: { traders: 3 } }, lose: { insecurity: 1 }, winText: "The market was cleared. Traders thanked you.", loseText: "They were back in a week." },
      { id: "jobs", label: "Give them jobs in a cleaning and traffic programme", explain: "Turn touts into workers.", cost: 15, tradeoff: "Some will take the money and stay touts.", unc: "high" as const, chance: () => 0.5, win: { insecurity: -2, mods: { jobs: 0.2 }, dur: 8, trust: 1.5 }, lose: { trust: -1 }, winText: "Orange vests, a payslip and a surprising pride.", loseText: "The programme was gamed within a month." },
      { id: "ignore", label: "Ignore it", explain: "Local problem.", cost: 0, tradeoff: "It will spread.", unc: "low" as const, chance: () => 1, win: { insecurity: 1.5, groups: { traders: -2 } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { insecurity: 1.5 }, expireText: () => "The levy grew.",
  },
  {
    id: "trafficBoom", kind: "opportunity" as const, urgency: 5,
    title: () => "Success has a price: Lagos is in gridlock",
    cause: () => "More jobs and more cars mean a three-hour commute. A viral video shows a bus that took four hours to cross one bridge. 'Great economy, shame about the road,' says the caption.",
    options: [
      { id: "brt", label: "Launch a rapid bus lane programme", explain: "A real fix over time.", cost: 60, tradeoff: "Roads get dug up for months.", unc: "medium" as const, chance: () => 0.65, win: { mods: { transport: 2 }, dur: 14, trust: 2 }, lose: { trust: -1 }, winText: "Buses now glide past the jam. People are amazed.", loseText: "Months of diggings and little to show yet." },
      { id: "wfh", label: "Appeal to employers for staggered hours", explain: "A cheap tweak.", cost: 0, tradeoff: "A small effect.", unc: "high" as const, chance: () => 0.5, win: { mods: { transport: 0.6 }, dur: 6 }, lose: {}, winText: "A small improvement.", loseText: "Nobody changed their hours." },
    ],
    expire: { trust: -1 }, expireText: () => "The traffic stayed.",
  },
  {
    id: "wantMore", kind: "opportunity" as const, urgency: 5,
    title: () => "'Light is steady now, but where are the jobs?'",
    cause: () => "Things are better than they were, and the nation has noticed. The mood has become: if you could do that, why not this? Every group has a new demand. This is what success sounds like.",
    options: [
      { id: "speech", label: "Give a speech: 'the work has just begun'", explain: "Manage expectations honestly.", cost: 0, tradeoff: "Not everyone will listen.", unc: "medium" as const, chance: () => 0.6, win: { trust: 2.5 }, lose: { trust: -1 }, winText: "People nodded: 'at least he is honest.'", loseText: "It sounded like an excuse." },
      { id: "program", label: "Launch a youth jobs and skills drive", explain: "Give them something to hope for.", cost: 50, tradeoff: "Takes time and money.", unc: "medium" as const, chance: () => 0.7, win: { mods: { jobs: 0.5, skills: 1 }, dur: 12, groups: { youth: 4 } }, lose: { groups: { youth: 1 } }, winText: "Applications opened to long queues.", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "poaching", kind: "opportunity" as const, urgency: 5,
    title: () => "Neighbouring countries are poaching your investors",
    cause: () => "A rival capital is offering a five-year tax holiday to firms that move their regional head office from Lagos. Three companies are packing.",
    options: [
      { id: "match", label: "Match the incentives", explain: "Keep them.", cost: 25, tradeoff: "Less tax revenue.", unc: "low" as const, chance: () => 0.85, win: { mods: { investor: 1.5 }, dur: 12 }, lose: {}, winText: "They stayed, and told their peers.", loseText: "" },
      { id: "reform", label: "Fix the real problem: power and ports", explain: "Lasting but slow.", cost: 0, tradeoff: "Some will leave first.", unc: "medium" as const, chance: () => 0.5, win: { mods: { investor: 1 }, dur: 12, trust: 1 }, lose: { mods: { investor: -1 }, dur: 6 }, winText: "Your answer impressed the board of one firm.", loseText: "One firm left." },
    ],
    expire: { mods: { investor: -1 }, dur: 6 }, expireText: () => "Two firms moved.",
  },
  {
    id: "richGetRicher", kind: "opportunity" as const, urgency: 5,
    title: () => "Bishops warn: 'the rich are getting richer'",
    cause: () => "Growth is strong, but a bishop's sermon says it is not reaching ordinary families. A poll shows 6 in 10 Nigerians feel left behind.",
    options: [
      { id: "tax", label: "Tax the wealthiest and fund social support", explain: "Share the gains.", cost: 0, tradeoff: "Business will complain.", unc: "medium" as const, chance: () => 0.6, win: { treasury: 40, groups: { workers: 3, faith: 3, business: -4 }, trust: 1.5 }, lose: { groups: { business: -5 } }, winText: "Your new levy raised real money. The bishop thanked you.", loseText: "Capital flight talk filled the news." },
      { id: "wait", label: "Say growth will reach everyone", explain: "Trickle-down.", cost: 0, tradeoff: "Many won't believe you.", unc: "high" as const, chance: () => 0.4, win: { groups: { business: 2 } }, lose: { groups: { workers: -3, faith: -3 }, trust: -1.5 }, winText: "Business applauded.", loseText: "'Eat the growth', said the headline." },
    ],
    expire: { groups: { faith: -2 } }, expireText: () => "",
  },
  {
    id: "creditCrunch", kind: "opportunity" as const, urgency: 5,
    title: () => "A strong naira is hurting exporters",
    cause: () => "Cocoa and sesame farmers say the strong naira makes their goods too expensive to sell abroad. 'We are winning and losing at the same time,' says one exporter.",
    options: [
      { id: "support", label: "Fund an export support scheme", explain: "Subsidise exporters.", cost: 30, tradeoff: "Costs money.", unc: "low" as const, chance: () => 0.85, win: { mods: { exports: 0.5 }, dur: 10, groups: { farmers: 3 } }, lose: {}, winText: "Exporters were relieved.", loseText: "" },
      { id: "tell", label: "Tell them to adapt", explain: "Stay the course.", cost: 0, tradeoff: "Farmers sulk.", unc: "low" as const, chance: () => 1, win: { groups: { farmers: -3 } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  // ------------------------------------------------------------ each term's crisis
  {
    id: "oilCrash", kind: "global" as const, urgency: 1,
    title: () => "Oil prices crash: the budget is blown",
    cause: (s: FixState) => `The world oil price fell sharply to about $${Math.round(s.eco.oilPrice)}. Government revenue will drop by a fifth and the naira is under pressure. Everyone is asking what the president will do.`,
    options: [
      { id: "tighten", label: "Tighten the belt: cut spending, protect the vulnerable", explain: "Painful now, safer later.", cost: 0, tradeoff: "Unpopular and slow.", unc: "medium" as const, chance: () => 0.65, win: { treasury: 60, groups: { workers: -3 }, trust: 1, mods: { revenue: 40 }, dur: 8 }, lose: { groups: { workers: -4 }, trust: -2 }, winText: "Hard months, but the budget held.", loseText: "Cuts hit the poor first." },
      { id: "borrow", label: "Borrow to ride it out", explain: "Kick the can.", cost: 0, tradeoff: "Debt rises.", unc: "low" as const, chance: () => 0.9, win: { treasury: 150, foreign: 2 }, lose: {}, winText: "Dollar bonds sold quickly. The bill comes later.", loseText: "" },
      { id: "diversify", label: "Launch a diversification drive", explain: "Farms, factories, tech.", cost: 80, tradeoff: "Slow to pay off.", unc: "high" as const, chance: () => 0.5, win: { mods: { exports: 0.8, manuf: 2, jobs: 0.5 }, dur: 18, trust: 2 }, lose: { trust: -1 }, winText: "A slow start, but it was the right call.", loseText: "Too slow to help this year." },
    ],
    expire: { treasury: -80, trust: -3 }, expireText: () => "Revenue collapsed while the cabinet argued.",
    onCreate: (s: FixState) => { s.eco.oilPrice = Math.max(38, s.eco.oilPrice - 32); },
  },
  {
    id: "elitePlot", kind: "power" as const, urgency: 1,
    title: (s: FixState) => `${s.staff.vp?.name ?? "Your vice president"} is building his own machine`,
    cause: (s: FixState) => `The party's heavyweights, the ones you made rich, are now meeting at ${s.staff.vp?.name ?? "the VP"}'s house. "He is the future," they say. Your own Chief of Staff warns you: the succession fight has started and you are still in office.`,
    options: [
      { id: "sack", label: "Sideline the VP and his people", explain: "Remind them who is president.", cost: 10, tradeoff: "You make enemies, and they know your secrets.", unc: "high" as const, chance: (s: FixState) => 0.4 + 0.4 * (s.rule.eliteLoyalty / 100), win: { elite: -3, assembly: -3, run: (s: FixState) => { s.flags.vpSidelined = 1; return "The VP was moved to a ceremonial committee. The plotters went quiet."; } }, lose: { elite: -8, coup: 4, run: (s: FixState) => { s.rival.popularity = clamp100(s.rival.popularity + 4); return "He resigned loudly and joined the opposition."; } }, winText: "", loseText: "" },
      { id: "share", label: "Share power: make him your heir", explain: "Bring him in.", cost: 0, tradeoff: "He will want more.", unc: "medium" as const, chance: () => 0.7, win: { elite: 6, assembly: 4, run: () => "A joint press conference. For now they are calm." }, lose: { elite: -3 }, winText: "", loseText: "" },
      { id: "leak", label: "Leak his file to the press", explain: "Destroy his credibility.", cost: 5, tradeoff: "If it fails, he is a victim.", unc: "high" as const, chance: () => 0.5, win: { trust: 1, elite: -4, run: () => "The leak sank his plans. He is now a footnote." }, lose: { trust: -3, elite: -6 }, winText: "", loseText: "The leak was traced to your office." },
    ],
    expire: { elite: -4, coup: 3 }, expireText: () => "The plotters grew bolder.",
  },
  {
    id: "succession", kind: "story" as const, urgency: 1,
    title: () => "Who will take over from you?",
    cause: () => "Your last term is ending. Everyone in the party, the opposition and the barracks is asking who comes next. Your decision will shape how history remembers you.",
    options: [
      { id: "heir", label: "Anoint a loyal heir", explain: "Hand over to your own man.", cost: 0, tradeoff: "He may protect your legacy, or your loot.", unc: "medium" as const, chance: () => 0.7, win: { elite: 4, democracy: -3, run: (s: FixState) => { s.flags.successor = "heir"; return "He is sworn in as the party's candidate. Everyone knows who chose him."; } }, lose: { elite: -2, run: (s: FixState) => { s.flags.successor = "heir"; return "The party grumbled but accepted."; } }, winText: "", loseText: "" },
      { id: "open", label: "Let the party decide in an open primary", explain: "A real contest.", cost: 0, tradeoff: "Messy, but legitimate.", unc: "medium" as const, chance: () => 0.7, win: { democracy: 4, trust: 2, run: (s: FixState) => { s.flags.successor = "open"; return "A messy, loud, democratic primary. Nigerians watched on TV."; } }, lose: { elite: -3, run: (s: FixState) => { s.flags.successor = "open"; return "The primary got ugly but it went ahead."; } }, winText: "", loseText: "" },
      { id: "tech", label: "Back a technocrat outside the party", explain: "Competence over loyalty.", cost: 0, tradeoff: "The party will be furious.", unc: "high" as const, chance: () => 0.5, win: { trust: 3, run: (s: FixState) => { s.flags.successor = "tech"; return "The technocrat is widely respected. Party barons are quietly furious."; } }, lose: { elite: -6, run: (s: FixState) => { s.flags.successor = "tech"; return "The party revolted, but the candidate ran anyway."; } }, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
];
export const DESK_TEMPLATES = cards;
void pushNews;
