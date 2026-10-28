/**
 * Naija X: the country's loudest room. Persistent accounts with moods and memories, threads and replies, trending hashtags,
 * reactions to everything you do, posts of your own, a bot army (and its exposure), and the option to switch the whole thing off.
 * State lives in one JSON flag (`flags.x`) so saves need no migration.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, monthLabel, powerRatio, pushNews, removeMods } from "./util";
import { earnPc, payPc } from "./meta";
import { createEvent } from "./spawn";

export type AcctKind = "citizen" | "journalist" | "activist" | "loyalist" | "troll" | "official" | "bot";
export type Topic = "food" | "fuel" | "power" | "jobs" | "fx" | "security" | "corruption" | "freedom" | "general";
export interface XAcct { id: string; name: string; handle: string; bio: string; kind: AcctKind; topic: Topic; followers: number; bias: number; mood: number; mem: { m: number; t: string; good: boolean }[]; blocked?: boolean; silentUntil?: number; verified?: boolean }
export interface XPost { id: string; month: number; by: string; text: string; likes: number; reposts: number; tone: "good" | "bad" | "neutral"; tag?: string; parent?: string; player?: boolean; bot?: boolean; vpn?: boolean; recall?: boolean }
export interface XTag { tag: string; heat: number; tone: "good" | "bad" | "neutral"; why: string; born: number }
export interface XPromise { topic: Topic; due: number; base: number; text: string }
export interface XState {
  accts: XAcct[]; posts: XPost[]; tags: XTag[]; mood: number; bots: 0 | 1 | 2 | 3; botSince: number; banned: number | null; seq: number;
  seen: string[]; promises: XPromise[]; hostileUntil: number; lastPost: number; exposed: number;
}

export const ME = "me";
const SEED: Omit<XAcct, "mood" | "mem">[] = [
  { id: "mama", name: "Mama Nkechi POS", handle: "@mamanke_shop", bio: "POS agent and rice seller. Yaba market. I see everything.", kind: "citizen", topic: "food", followers: 210_000, bias: 0 },
  { id: "danfo", name: "Danfo Chronicles", handle: "@danfo_gist", bio: "Lagos transport gist. Fare depends on your face.", kind: "citizen", topic: "fuel", followers: 640_000, bias: -4 },
  { id: "tolu", name: "Tolu Codes", handle: "@tolu_ships", bio: "Developer. Generator is my co-founder.", kind: "citizen", topic: "power", followers: 380_000, bias: -2 },
  { id: "aisha", name: "Aisha (grad, 2021)", handle: "@aisha_hustles", bio: "First class. Currently selling shawarma.", kind: "citizen", topic: "jobs", followers: 290_000, bias: -6 },
  { id: "femi", name: "Femi (importer)", handle: "@femi_imports", bio: "Containers, customs and cold coffee.", kind: "citizen", topic: "fx", followers: 150_000, bias: 0 },
  { id: "terver", name: "Terver (farmer)", handle: "@terver_farms", bio: "Benue. Yam, soya, prayers.", kind: "citizen", topic: "security", followers: 90_000, bias: 0 },
  { id: "leaks", name: "Naija Leaks", handle: "@naija_leaks", bio: "We have receipts. DMs open.", kind: "journalist", topic: "corruption", followers: 1_200_000, bias: -8, verified: true },
  { id: "gist", name: "Political Gist", handle: "@gist_politico", bio: "Who is meeting who, and why.", kind: "journalist", topic: "general", followers: 900_000, bias: 0, verified: true },
  { id: "insider", name: "Abuja Insider", handle: "@abuja_insider", bio: "Aso Rock whispers. Sometimes right.", kind: "journalist", topic: "general", followers: 520_000, bias: 4 },
  { id: "voice", name: "Citizens' Voice", handle: "@endbadgov", bio: "Enough is enough. Organise. Show up.", kind: "activist", topic: "general", followers: 2_100_000, bias: -22 },
  { id: "free", name: "Free Speech NG", handle: "@freespeech_ng", bio: "A country that cannot be criticised cannot be fixed.", kind: "activist", topic: "freedom", followers: 700_000, bias: -10 },
  { id: "patriot", name: "Oga Patriot", handle: "@patriot_ng", bio: "Support your president. Haters will hate.", kind: "loyalist", topic: "general", followers: 800_000, bias: 45 },
  { id: "troll", name: "Wahala Dey", handle: "@wahala_dey", bio: "Here for the quarrel.", kind: "troll", topic: "general", followers: 500_000, bias: -28 },
  { id: "stats", name: "NigeriaStats", handle: "@ngstats", bio: "Numbers, no wahala.", kind: "official", topic: "general", followers: 1_500_000, bias: 0, verified: true },
];
const BOT_NAMES = ["Proud Nigerian", "True Patriot", "Concerned Citizen", "Naija First", "Real Voice", "Progress Now"];

// ------------------------------------------------------------------------------------------------ state
export function X(s: FixState): XState {
  try { const raw = s.flags.x; if (typeof raw === "string") return JSON.parse(raw) as XState; } catch { /* fall through */ }
  const x: XState = { accts: SEED.map((a) => ({ ...a, mood: clamp(a.bias, -60, 60), mem: [] })), posts: [], tags: [], mood: 0, bots: 0, botSince: 0, banned: null, seq: 0, seen: [], promises: [], hostileUntil: 0, lastPost: -9, exposed: 0 };
  x.seen = [...s.news.map((n) => n.id), ...s.reports.map((r) => r.id)].slice(-80);
  save(s, x); return x;
}
const save = (s: FixState, x: XState) => { x.posts = x.posts.slice(-160); x.seen = x.seen.slice(-80); s.flags.x = JSON.stringify(x); };
export const acctOf = (x: XState, id: string): XAcct => x.accts.find((a) => a.id === id) ?? { id, name: id === ME ? "The President" : "Anonymous", handle: id === ME ? "@PresidentNG" : "@anon", bio: "", kind: "citizen", topic: "general", followers: 1000, bias: 0, mood: 0, mem: [] };
export const meAcct = (s: FixState): XAcct => ({ id: ME, name: s.meta.president, handle: "@PresidentNG", bio: "President of the Federal Republic of Nigeria. Posts are my own, and my staff's.", kind: "official", topic: "general", followers: 4_200_000, bias: 0, mood: 0, mem: [], verified: true });
export const isBanned = (s: FixState) => X(s).banned !== null;

// ------------------------------------------------------------------------------------------------ the mood of each topic
export function topicScore(s: FixState, t: Topic): number {
  switch (t) {
    case "food": return clamp(40 - (s.eco.foodInflation - 15) * 3, -100, 100);
    case "fuel": return clamp((750 - s.fuel.pump) / 5, -100, 100);
    case "power": return clamp((powerRatio(s) - 0.3) * 300, -100, 100);
    case "jobs": return clamp((30 - s.jobs.youth) * 4, -100, 100);
    case "fx": return clamp((1500 - s.eco.fx) / 8, -100, 100);
    case "security": return clamp((50 - s.sec.index) * 2, -100, 100);
    case "corruption": return clamp((45 - s.me.evidence) * 2, -100, 100);
    case "freedom": return clamp((s.rule.democracy - 55) * 2, -100, 100);
    default: { const avg = (topicScore(s, "food") + topicScore(s, "fuel") + topicScore(s, "power") + topicScore(s, "jobs") + topicScore(s, "fx")) / 5; return clamp(0.55 * avg + 0.45 * ((s.gov.happiness - 50) * 2 - (s.rule.streetAnger - 30)), -100, 100); }
  }
}
const TOPIC_RE: [Topic, RegExp][] = [
  ["fuel", /petrol|fuel|diesel|refiner|pump|subsid/i], ["food", /rice|food|harvest|garri|farm|hunger|market women/i], ["power", /light|power|grid|nepa|megawatt|electric/i],
  ["jobs", /\bjobs?\b|unemploy|graduate|youth|hiring|factory/i], ["fx", /naira|dollar|forex|exchange|peg|import|export/i], ["security", /bandit|boko|attack|kidnap|terror|army|military|security/i],
  ["corruption", /steal|stole|loot|corrupt|scandal|bribe|kickback|probe|inquiry|contract|ghost/i], ["freedom", /press|journalist|protest|democracy|arrest|ban|censor|curfew/i],
];
export const topicOf = (text: string): Topic => TOPIC_RE.find(([, r]) => r.test(text))?.[0] ?? "general";
const TAGS: Record<Topic, { bad: string; good: string }> = {
  food: { bad: "#RiceWatch", good: "#FoodOnTheTable" }, fuel: { bad: "#FuelQueue", good: "#PetrolPriceDrops" }, power: { bad: "#NEPATookLight", good: "#LightUpNigeria" },
  jobs: { bad: "#WhereAreTheJobs", good: "#JobsForNaija" }, fx: { bad: "#NairaWatch", good: "#NairaRising" }, security: { bad: "#SecureNigeria", good: "#PeaceReturns" },
  corruption: { bad: "#ShowTheReceipts", good: "#CleanHands" }, freedom: { bad: "#LetUsTalk", good: "#FreeNaija" }, general: { bad: "#EndBadGovernance", good: "#NigeriaIsWorking" },
};
const bump = (x: XState, tag: string, heat: number, tone: XTag["tone"], why: string, month: number) => {
  const t = x.tags.find((y) => y.tag === tag);
  if (t) { t.heat = clamp(t.heat + heat, 0, 100); t.why = why; t.tone = tone; } else x.tags.push({ tag, heat: clamp(heat, 0, 100), tone, why, born: month });
};
export const trending = (x: XState): XTag[] => [...x.tags].sort((a, b) => b.heat - a.heat).slice(0, 6);

// ------------------------------------------------------------------------------------------------ words
const nums = (s: FixState) => ({ rice: `₦${Math.round(90000 * s.eco.foodPriceIdx / 100).toLocaleString("en-NG")}`, pump: `₦${Math.round(s.fuel.pump)}`, fx: `₦${Math.round(s.eco.fx).toLocaleString("en-NG")}`, youth: `${Math.round(s.jobs.youth)}%`, infl: `${Math.round(s.eco.foodInflation)}%` });
const fill = (s: FixState, t: string) => { const n = nums(s); return t.replace(/\{(rice|pump|fx|youth|infl)\}/g, (_, k: keyof typeof n) => n[k]); };
const AMBIENT: Record<Topic, { bad: string[]; good: string[]; flat: string[] }> = {
  food: { bad: ["Rice is {rice} now. Customers just look and go. Una dey hear?", "Food inflation at {infl}. My customers now buy by the cup, not the bag.", "Told a woman the price of beans. She laughed, then she cried."], good: ["Market has calmed down small. Customers are buying again. God dey!", "Rice at {rice}. First time in a long while I dropped a price.", "Customers smiled at the price of garri today. I smiled back."], flat: ["Market day. Same prices, same prayers.", "Customers are asking if prices will move. I tell them to ask the government."] },
  fuel: { bad: ["Petrol is {pump}. Conductor says fare is now \"depends on your face\".", "Queue at the filling station is longer than my patience. {pump} a litre.", "Fare doubled again. The passengers did not even argue, they are tired."], good: ["Petrol at {pump}. Conductor gave me my change. First time ever.", "Fuel queues are gone. I almost missed them. Almost.", "Fare dropped. Passengers clapped. Danfo drivers are weeping."], flat: ["Petrol is {pump}. Nobody is happy, nobody is protesting. Yet.", "Third Mainland Bridge: moving. Do not celebrate. It is 6 a.m."] },
  power: { bad: ["NEPA took light again. Diesel plus data plus rent. Developer life is a prayer meeting.", "Third day without light. My generator and I are not on speaking terms.", "Pitched investors with the generator on. They said the noise was a nice touch."], good: ["Light has not gone in five days. I almost called the power company to confirm it's not a glitch.", "Shipped a feature with no generator noise in the background. History.", "Electricity bill came with actual electricity. Wonders."], flat: ["Light came, light went. Normal service.", "Charging everything while it lasts."] },
  jobs: { bad: ["{youth} of us have no job. I have a first class and I sell shawarma. Government, wake up.", "Applied to 200 jobs. Heard back from 3. Two were scams.", "Graduate, four years waiting. My CV has more hope than the economy."], good: ["Got the interview call. Actual interview. For an actual job.", "Three friends found work this month. I checked twice that it was real.", "Youth unemployment is falling. My mother says it's her prayers."], flat: ["Job hunt continues. The hustle must hustle.", "CV updated. Hope updated slower."] },
  fx: { bad: ["{fx} to the dollar. Every price tag in my shop is a lie by evening.", "Dollar moved again while I was in the toilet. My landing cost doubled.", "Importer life: you price in the morning and cry in the afternoon."], good: ["Naira at {fx}. My landing costs dropped. Even my accountant smiled.", "Naira is holding. I checked the app four times to be sure.", "Customs paperwork still painful, the exchange rate is not. Progress."], flat: ["{fx}. The naira just sits there, waiting for news.", "Quoted a customer in dollars out of habit. He said fine. Nobody argues anymore."] },
  security: { bad: ["Can't reach my farm again. Prayers please. Government please.", "Another village emptied this week. We are counting what is left.", "They say the army is coming. They said that last month too."], good: ["Went to the farm for the first time in two years. It's still there. I wept.", "Roads are open again. Harvest will be sweet if this holds.", "Soldiers are camped near the village and nobody is afraid. Strange feeling."], flat: ["Quiet week. We do not trust quiet, but we take it.", "Planted what we could. The rest is faith."] },
  corruption: { bad: ["Documents suggest Aso Rock insiders are getting very comfortable. We have receipts. Thread 🧵", "Contract that should cost 4 billion cost 14. We have the invoices.", "Another \"consultancy\" with no consultant. Following the money."], good: ["Procurement files published. We read them. Boring. Beautifully boring.", "A recovered-loot update that actually has numbers in it. Surprised.", "First time we have nothing to leak about this month. Don't jinx it."], flat: ["Researching. Sources are nervous. That is usually the story.", "Public records request filed. Awaiting a no."] },
  freedom: { bad: ["Strange how nobody on TV says anything bad about the government anymore. Strange, strange.", "Journalist detained overnight, released with no explanation. We know the explanation.", "A country that cannot be criticised cannot be fixed."], good: ["Press conference. Real questions. Real answers. Mark the date.", "Court freed the protesters. Judiciary woke up today.", "We still can write what we like. Do not take it for granted."], flat: ["Watching. Writing. Waiting.", "Reminder: free speech is not a favour."] },
  general: { bad: ["#EndBadGovernance trending again. Enough is enough.", "The cost of living is a full-time job and the pay is zero.", "Everybody is tired. Nobody is surprised."], good: ["Honestly? First time in years the mood in this country is positive. Don't jinx it.", "Small small, things are moving. I noticed. My neighbour noticed.", "Not clapping yet. But I am not frowning either."], flat: ["Big Brother trended higher than the budget again. Priorities.", "Jollof wars continue. Ghana can talk all they want. Our smoky party jollof is final."] },
};
const BANTER = ["Lagos traffic update: third mainland bridge is moving. Do not celebrate. It is 6 a.m.", "Nigeria will find a way to make a government speech trend below Big Brother.", "Ghana jollof is a rumour. Nigerian jollof is the truth. Sign here.", "Who still has NEPA light? Show of hands.", "Suya spot on the island now charges per stick, per vibe.", "Wedding season: every Saturday, a different traffic jam."];
const REACT: Record<AcctKind, { bad: string[]; good: string[] }> = {
  citizen: { bad: ["Na wa o. {h}", "So this is where we are now. {h}", "{h}. We are the ones who suffer."], good: ["Eh! {h}. Make this one stay.", "Small small, we dey see am. {h}", "{h}. If this is true, I will smile today."] },
  journalist: { bad: ["BREAKING: {h}. We have reached out to the presidency for comment.", "{h}. Our sources confirm. Thread below. 🧵", "{h}. Questions remain, and the answers are not coming."], good: ["Good news is news too: {h}.", "{h}. We checked it twice. It holds up, for now.", "{h}. Credit where it's due, and scrutiny where it isn't."] },
  activist: { bad: ["{h}. Enough is enough. Organise.", "{h}. Where are the consequences? Where is the accountability?", "{h}. They think we are not watching. We are watching."], good: ["{h}. Fine. Now deliver the rest.", "{h}. Noted. The standard is higher, not lower.", "{h}. A start. Not the finish."] },
  loyalist: { bad: ["Fake news from the usual suspects. The president is working.", "They twist everything. Give him time. #Patience", "{h} and you want to blame one man? Be serious."], good: ["{h}. Haters are quiet today. 🇳🇬🔥", "{h}. We told you. We told you!", "{h}. Say thank you, Nigeria."] },
  troll: { bad: ["{h} 😂😂 and they say it is progress", "{h}. Abeg who wan clap?", "{h}. Content for the next four years."], good: ["Even a broken clock... {h}", "{h}. Calm down, one good day does not make a government.", "{h}. I will allow it. Once."] },
  official: { bad: ["Update: {h}. Statistics will follow.", "{h}. Figures are being compiled."], good: ["Update: {h}. Figures attached.", "{h}. Indicators moved in the right direction."] },
  bot: { bad: ["{h}", "{h}"], good: ["Great job Mr President! 🇳🇬👏", "{h}. Proud of our leader! 🇳🇬"] },
};
const REPLY: { agreeBad: string[]; agreeGood: string[]; dunkBad: string[]; dunkGood: string[]; joke: string[]; press: string[] } = {
  agreeBad: ["Exactly. Same story here.", "Na so! And nobody is listening.", "Retweeting so everybody must see this.", "You said what we are all thinking.", "I am tired. This is true."],
  agreeGood: ["Credit where it's due.", "I do not clap easily, but this one is real.", "God dey. Let us keep it going.", "Eh, finally. Do not stop now."],
  dunkBad: ["Fake news. Why are you always complaining?", "Which Nigeria are you living in? We are fine.", "Same people who complain were silent before.", "Give the man time. Rome was not built in a day."],
  dunkGood: ["Which Nigeria are you living in? Abeg.", "Propaganda. Come to my street.", "One good headline and you are dancing? Sit down.", "Tell that to my landlord."],
  joke: ["I am crying and laughing at the same time 😂", "Nigeria will never run out of content.", "Wetin I come read?", "This one na meme material."],
  press: ["We have reached out for comment. None so far.", "Following this. More soon.", "Sources say there is more to this."],
};

// ------------------------------------------------------------------------------------------------ posting and replying
const id = (x: XState) => `x${++x.seq}`;
function add(s: FixState, x: XState, by: string, text: string, tone: XPost["tone"], rng: Rng, o: Partial<XPost> = {}): XPost {
  const a = by === ME ? meAcct(s) : acctOf(x, by);
  const virality = 0.003 + 0.02 * Math.pow(rng.next(), 3) + (tone === "neutral" ? 0 : 0.006);
  const heat = 1 + (o.tag ? (x.tags.find((t) => t.tag === o.tag)?.heat ?? 0) / 100 : 0);
  const likes = Math.round(a.followers * virality * heat * (by === ME ? 0.5 : 1));
  const p: XPost = { id: id(x), month: s.month, by, text, likes, reposts: Math.round(likes * (0.2 + 0.3 * rng.next())), tone, ...o };
  x.posts.push(p); return p;
}
const live = (x: XState, s: FixState) => x.accts.filter((a) => a.kind !== "bot" && !(a.silentUntil && a.silentUntil > s.month));
function replies(s: FixState, x: XState, parent: XPost, rng: Rng, n: number) {
  const poster = acctOf(x, parent.by);
  const others = live(x, s).filter((a) => a.id !== parent.by);
  for (let i = 0; i < n && others.length; i++) {
    const a = others.splice(rng.int(0, others.length - 1), 1)[0];
    const likes = a.mood > 10, hates = a.mood < -10;
    let text: string, tone: XPost["tone"];
    if (a.kind === "journalist" && parent.tone !== "neutral") { text = rng.pick(REPLY.press); tone = "neutral"; }
    else if (a.kind === "troll") { text = rng.pick(parent.tone === "good" ? REPLY.dunkGood : REPLY.joke); tone = "bad"; }
    else if (parent.tone === "bad") { if (likes && a.kind !== "citizen") { text = rng.pick(REPLY.dunkBad); tone = "good"; } else { text = rng.pick(REPLY.agreeBad); tone = "bad"; } }
    else if (parent.tone === "good") { if (hates) { text = rng.pick(REPLY.dunkGood); tone = "bad"; } else { text = rng.pick(REPLY.agreeGood); tone = "good"; } }
    else { text = rng.pick(REPLY.joke); tone = "neutral"; }
    void poster;
    add(s, x, a.id, text, tone, rng, { parent: parent.id, vpn: parent.vpn });
  }
}
const short = (h: string, n = 96) => (h.length > n ? h.slice(0, n - 1).trimEnd() + "…" : h.replace(/[.!]+$/, ""));
const rememberFor = (s: FixState, a: XAcct, rng: Rng): { t: string; good: boolean; m: number } | null => {
  const pool = a.mem.filter((m) => s.month - m.m >= 2); return pool.length ? rng.pick(pool) : null;
};
const remember = (a: XAcct, m: number, t: string, good: boolean) => { a.mem.push({ m, t, good }); a.mem = [...a.mem.filter((x) => x.good !== good).slice(-3), ...a.mem.filter((x) => x.good === good).slice(-3)].sort((p, q) => p.m - q.m); };

// ------------------------------------------------------------------------------------------------ reacting to what you do
export function socialSync(s: FixState) {
  const x = X(s); const items = [...s.news.map((n) => ({ id: n.id, h: n.headline, tone: n.tone, big: /^(event-res|ripple|ach|punish|backer|ladder|pm:|pg:|deal|amend|big)/.test(n.source) || /^event-res/.test(n.id) })), ...s.reports.map((r) => ({ id: r.id, h: r.title, tone: r.tone as "good" | "bad" | "neutral", big: true }))].filter((i) => !x.seen.includes(i.id));
  if (!items.length) return;
  x.seen.push(...items.map((i) => i.id));
  const rng = subRng(s.meta.seed, "xsync", s.month, x.seq);
  let used = 0;
  for (const it of items.filter((i) => i.tone !== "neutral").sort((a, b) => Number(b.big) - Number(a.big)).slice(0, 4)) {
    const topic = topicOf(it.h); const tone = it.tone === "good" ? "good" : "bad"; const tag = TAGS[topic][tone];
    const pool = live(x, s).filter((a) => !(x.banned !== null && !a.verified && rng.chance(0.5)));
    const weights = pool.map((a) => ({ a, w: (a.topic === topic ? 4 : 1) + (a.kind === "journalist" ? 1.5 : 0) + (a.kind === "activist" && tone === "bad" ? 1.5 : 0) + (a.kind === "loyalist" && tone === "good" ? 1.5 : 0) }));
    const picked: XAcct[] = [];
    while (picked.length < (it.big ? 3 : 2) && weights.length) { const tot = weights.reduce((p, q) => p + q.w, 0); let r = rng.next() * tot, i = 0; for (; i < weights.length - 1; i++) { r -= weights[i].w; if (r <= 0) break; } picked.push(weights.splice(i, 1)[0].a); }
    let first: XPost | null = null;
    for (const a of picked) {
      const k = a.kind === "loyalist" ? (tone === "bad" ? "bad" : "good") : tone;
      const text = rng.pick(REACT[a.kind][k]).replace("{h}", short(it.h));
      const p = add(s, x, a.id, a.kind === "activist" || a.kind === "loyalist" ? `${text} ${tag}` : text, a.kind === "loyalist" ? "good" : tone, rng, { tag, vpn: x.banned !== null });
      if (!first) first = p; else p.parent = first.id;
      a.mood = clamp(a.mood + (tone === "good" ? 3 : -3) * (a.topic === topic ? 2 : 1) * (a.kind === "loyalist" ? 0.2 : 1), -90, 90);
      if (a.topic === topic || a.kind === "journalist") remember(a, s.month, short(it.h, 80), tone === "good");
      used++;
    }
    if (first) replies(s, x, first, rng, 2);
    bump(x, tag, it.big ? 22 : 12, tone, short(it.h, 70), s.month);
  }
  if (used) x.mood = computeMood(s, x);
  save(s, x);
}

export function computeMood(s: FixState, x: XState): number {
  const pool = x.accts.filter((a) => a.kind !== "official");
  const tot = pool.reduce((p, a) => p + Math.sqrt(a.followers), 0);
  return Math.round(pool.reduce((p, a) => p + a.mood * Math.sqrt(a.followers), 0) / tot);
}
/** What the feed shows you: blocked voices vanish and bots make noise. The real mood is the one that fills the streets. */
export function shownMood(s: FixState): number {
  const x = X(s);
  const pool = x.accts.filter((a) => a.kind !== "official" && !a.blocked);
  const tot = pool.reduce((p, a) => p + Math.sqrt(a.followers), 0) || 1;
  const m = pool.reduce((p, a) => p + a.mood * Math.sqrt(a.followers), 0) / tot;
  return Math.round(clamp(m + x.bots * 9, -100, 100));
}
export const realMood = (s: FixState) => X(s).mood;

// ------------------------------------------------------------------------------------------------ the month
export function socialMonthly(s: FixState, rng: Rng) {
  const x = X(s);
  // topic moods drift toward reality, with each account's temperament
  for (const a of x.accts) {
    if (a.kind === "bot" || a.kind === "official") continue;
    const target = clamp(topicScore(s, a.topic) * 0.7 + topicScore(s, "general") * 0.3 + a.bias, -95, 95);
    a.mood = Math.round(a.mood + (target - a.mood) * 0.28);
    if (a.silentUntil && a.silentUntil <= s.month) delete a.silentUntil;
  }
  for (const t of x.tags) t.heat = Math.round(t.heat * 0.68);
  x.tags = x.tags.filter((t) => t.heat >= 6);
  save(s, x);
  socialSync(s);
  const x2 = X(s);
  // everyday posts from people who have something to say
  const pool = live(x2, s); const count = x2.banned !== null ? 2 : 5;
  for (let i = 0; i < count; i++) {
    const a = pool[rng.int(0, pool.length - 1)];
    let text: string; let tone: XPost["tone"]; let recall = false; let tag: string | undefined;
    const mem = rng.chance(0.28) ? rememberFor(s, a, rng) : null;
    if (mem) {
      recall = true; tone = mem.good ? "good" : "bad";
      text = mem.good ? `Credit where it is due: "${mem.t}" (${monthLabel(mem.m)}). Do not make me regret saying so.` : `Remember "${mem.t}" (${monthLabel(mem.m)})? Because we do.`;
    } else if (a.kind === "loyalist" || a.kind === "troll" || a.kind === "official") {
      if (a.kind === "official") { text = `Monthly figures: food inflation ${Math.round(s.eco.foodInflation)}%, naira ${Math.round(s.eco.fx).toLocaleString("en-NG")}, youth unemployment ${Math.round(s.jobs.youth)}%.`; tone = "neutral"; }
      else { const T = AMBIENT.general; const mood = topicScore(s, "general"); tone = a.kind === "loyalist" ? "good" : "bad"; text = a.kind === "loyalist" ? (mood > -10 ? rng.pick(T.good) : "The president is working. Give him time. Stop the wailing.") : rng.pick(mood > 10 ? T.flat : T.bad); }
    } else {
      const T = AMBIENT[a.topic]; const band = a.mood > 12 ? "good" : a.mood < -12 ? "bad" : "flat";
      if (band === "flat" && rng.chance(0.4)) { text = rng.pick(BANTER); tone = "neutral"; } else { text = fill(s, rng.pick(T[band])); tone = band === "flat" ? "neutral" : band; }
      if (tone !== "neutral" && rng.chance(0.5)) { tag = TAGS[a.topic][tone]; bump(x2, tag, 4, tone, "people keep talking about it", s.month); }
    }
    const p = add(s, x2, a.id, text, tone, rng, { vpn: x2.banned !== null, recall, tag });
    if (rng.chance(0.65)) replies(s, x2, p, rng, rng.int(1, 3));
  }
  // loud topics earn their hashtag
  for (const t of Object.keys(TAGS) as Topic[]) { const sc = topicScore(s, t); if (sc < -35) bump(x2, TAGS[t].bad, 5 + (-sc - 35) / 8, "bad", "it is still bad", s.month); else if (sc > 40) bump(x2, TAGS[t].good, 4, "good", "things are looking up", s.month); }
  if (s.rule.streetAnger > 55) bump(x2, TAGS.general.bad, 8, "bad", "the streets are angry", s.month);
  // the bot armies
  botsMonthly(s, x2, rng);
  // player promises come due
  for (const p of [...x2.promises]) if (s.month >= p.due) {
    x2.promises.splice(x2.promises.indexOf(p), 1);
    const kept = topicScore(s, p.topic) >= p.base + 10;
    if (kept) { s.gov.trust = clamp100(s.gov.trust + 3); earnPc(s, 2); for (const a of x2.accts) a.mood = clamp(a.mood + 4, -95, 95); pushNews(s, { source: `xprom:${p.due}:${p.topic}`, headline: `You promised on Naija X: "${p.text}". It happened.`, body: "Nigerians screenshot posts. This time the screenshot is flattering.", tone: "good" }); bump(x2, "#PromiseKept", 40, "good", p.text, s.month); }
    else { s.gov.trust = clamp100(s.gov.trust - 3.5); for (const a of x2.accts) { a.mood = clamp(a.mood - 7, -95, 95); remember(a, s.month, `the president promised "${p.text}" on Naija X`, false); } pushNews(s, { source: `xprom:${p.due}:${p.topic}`, headline: `Screenshots surface: "${p.text}". Nine months later, nothing.`, body: "The president's own post, quoted back to him a thousand times.", tone: "bad" }); bump(x2, "#PromiseBroken", 60, "bad", p.text, s.month); }
  }
  x2.mood = computeMood(s, x2);
  // online anger spills into the streets
  const banMonths = x2.banned !== null ? s.month - x2.banned : 0;
  let push = clamp((-x2.mood - 28) * 0.05, 0, 2.2) * (1 - 0.22 * x2.bots);
  if (x2.banned !== null) push = banMonths <= 3 ? push * 0.35 : push + clamp((banMonths - 3) * 0.14, 0, 1.6);
  if (push > 0) s.rule.streetAnger = clamp100(s.rule.streetAnger + push);
  else if (x2.mood > 30) s.rule.streetAnger = clamp100(s.rule.streetAnger - 0.3);
  s.gov.trust = clamp100(s.gov.trust + clamp(x2.mood / 100, -1, 1) * 0.1);
  if (x2.banned !== null && banMonths > 0) { s.rule.intlPressure = clamp100(s.rule.intlPressure + 0.6); }
  const cd = Number(s.flags.xProtest ?? -99);
  if (x2.mood < -42 && s.rule.streetAnger > 40 && s.month - cd > 9 && x2.tags.some((t) => t.tone === "bad" && t.heat > 35)) {
    const st = Object.entries(s.regions).sort((a, b) => b[1].unrest - a[1].unrest)[0]?.[0];
    const e = st ? createEvent(s, "youthProtest", st) : null;
    if (e) { s.flags.xProtest = s.month; const t = [...x2.tags].filter((y) => y.tone === "bad").sort((a, b) => b.heat - a.heat)[0]; pushNews(s, { source: `xprotest:${s.month}`, headline: `${t.tag} moves from Naija X to the streets`, body: "What started as a hashtag is now a crowd. Organisers say it will not be the last.", tone: "bad", stateId: st }); bump(x2, t.tag, 30, "bad", "the crowd is out", s.month); }
  }
  save(s, x2);
}

function botsMonthly(s: FixState, x: XState, rng: Rng) {
  if (x.bots > 0) {
    const cost = [0, 4, 9, 16][x.bots] * (0.6 + 0.4 * s.eco.priceLevel / 100);
    if (cost > s.fin.treasury) { x.bots = 0; pushNews(s, { source: `xbotstop:${s.month}`, headline: "Bot farm goes quiet after payments stop", body: "The accounts that loved the president yesterday have stopped posting.", tone: "neutral" }); }
    else {
      s.fin.treasury -= cost;
      for (let i = 0; i < 1 + x.bots; i++) { const h = `@${rng.pick(BOT_NAMES).replace(" ", "_").toLowerCase()}_${rng.int(1000, 9999)}`; const name = `${rng.pick(BOT_NAMES)} ${rng.int(100, 999)}`; const bot: XAcct = { id: `bot${x.seq}`, name, handle: h, bio: "", kind: "bot", topic: "general", followers: 600, bias: 60, mood: 60, mem: [] }; x.accts.push(bot); add(s, x, bot.id, rng.pick(REACT.bot.good).replace("{h}", rng.pick(["Our president is delivering", "More jobs are coming", "The critics are paid by the opposition"])), "good", rng, { bot: true, tag: TAGS.general.good, likes: rng.int(40, 900) }); }
      bump(x, TAGS.general.good, 3 + x.bots * 3, "good", "a lot of very enthusiastic accounts", s.month);
      const risk = x.bots * (0.015 + (s.rule.pressFreedom / 100) * 0.03) + (s.month - x.botSince > 12 ? 0.01 : 0);
      if (rng.chance(risk)) exposeBots(s, x, rng);
    }
  }
  x.accts = [...x.accts.filter((a) => a.kind !== "bot"), ...x.accts.filter((a) => a.kind === "bot").slice(-6)];
  if (s.rule.streetAnger > 52 && x.hostileUntil < s.month && rng.chance(0.15)) x.hostileUntil = s.month + 4;
  if (x.hostileUntil >= s.month) {
    for (let i = 0; i < 2; i++) { const bot: XAcct = { id: `bot${x.seq}`, name: `${rng.pick(BOT_NAMES)} ${rng.int(100, 999)}`, handle: `@real_${rng.int(1000, 9999)}`, bio: "", kind: "bot", topic: "general", followers: 500, bias: -60, mood: -60, mem: [] }; x.accts.push(bot); add(s, x, bot.id, rng.pick(["The president must go. Share before they delete.", "Same government, same suffering. #EndBadGovernance", "Why is nobody talking about this? RT."]), "bad", rng, { bot: true, tag: TAGS.general.bad, likes: rng.int(30, 500) }); }
    bump(x, TAGS.general.bad, 6, "bad", "opposition accounts are posting in bulk", s.month);
  }
}
function exposeBots(s: FixState, x: XState, rng: Rng) {
  x.exposed++; x.bots = 0;
  s.gov.trust = clamp100(s.gov.trust - rng.int(4, 8)); s.rule.democracy = clamp100(s.rule.democracy - 1.5);
  for (const a of x.accts) a.mood = clamp(a.mood - 5, -95, 95);
  const j = x.accts.find((a) => a.id === "leaks"); if (j) remember(j, s.month, "the president ran a bot farm", false);
  pushNews(s, { source: `botgate:${s.month}`, headline: "BOTGATE: investigators trace thousands of pro-government accounts to a state-funded bot farm", body: "Screenshots, payment records and a very awkward press conference.", tone: "bad" });
  bump(x, "#BotGate", 85, "bad", "state-funded bot farm exposed", s.month);
  const p = add(s, x, "leaks", "BotGate: we traced the 'grassroots' accounts to a government payroll. Thread. 🧵", "bad", rng, { tag: "#BotGate", likes: 40000 }); replies(s, x, p, rng, 3);
}

// ------------------------------------------------------------------------------------------------ the president posts
export interface PostKind { id: string; icon: string; title: string; blurb: string; pc: number; choices?: { id: string; label: string }[]; need?: (s: FixState) => string | null; run: (s: FixState, x: XState, arg: string | undefined, rng: Rng) => { ok: boolean; text: string; message: string } }
const recentBad = (s: FixState) => [...s.news].reverse().find((n) => n.tone === "bad" && s.month - n.month <= 3);
const PROMISE_TEXT: Record<string, string> = { food: "food prices will be lower", fuel: "petrol will be cheaper", power: "the light will stay on", jobs: "young people will find work", fx: "the naira will be stronger" };
const lift = (x: XState, amt: number, filter?: (a: XAcct) => boolean) => { for (const a of x.accts) if (a.kind !== "bot" && (!filter || filter(a))) a.mood = clamp(a.mood + amt, -95, 95); };
export const POST_KINDS: PostKind[] = [
  { id: "thank", icon: "🙏", title: "Thank Nigerians", blurb: "Short, warm, safe. Works best when people are not angry.", pc: 0, run: (s, x, _a, rng) => { const ok = rng.chance(clamp(0.62 + x.mood / 220, 0.2, 0.9)); if (ok) { lift(x, 3); s.gov.trust = clamp100(s.gov.trust + 1); return { ok, text: "Thank you, Nigeria. I hear you, and I am still working. Bear with us.", message: "It lands softly. People retweet it without arguing." }; } lift(x, -2); return { ok, text: "Thank you, Nigeria. I hear you, and I am still working. Bear with us.", message: "\"Thank us by lowering petrol,\" says the top reply. You get ratioed." }; } },
  { id: "promise", icon: "🤞", title: "Make a public promise", blurb: "Big bounce now. In nine months it is quoted back to you, kept or not.", pc: 2, choices: Object.entries(PROMISE_TEXT).map(([id, label]) => ({ id, label: `Promise: ${label}` })), need: (s) => (X(s).promises.length >= 2 ? "You already have two public promises waiting." : null), run: (s, x, arg) => { const topic = (arg ?? "food") as Topic; const text = PROMISE_TEXT[topic]; x.promises.push({ topic, due: s.month + 9, base: topicScore(s, topic), text }); lift(x, 5); s.gov.trust = clamp100(s.gov.trust + 1.5); bump(x, "#MrPresidentPromised", 45, "neutral", `${text}, in nine months`, s.month); return { ok: true, text: `I promise you: ${text}, within nine months. Hold me to it.`, message: "They will. Screenshots are already being taken." }; } },
  { id: "explain", icon: "🧠", title: "Explain a hard decision", blurb: "Honest, a bit long. Needs something recent to explain.", pc: 1, need: (s) => (recentBad(s) ? null : "There is nothing hard to explain at the moment."), run: (s, x, _a, rng) => { const n = recentBad(s)!; const ok = rng.chance(clamp(0.55 + x.mood / 260, 0.25, 0.85)); if (ok) { lift(x, 3); s.gov.trust = clamp100(s.gov.trust + 1.5); } else lift(x, -2); return { ok, text: `Let me be straight with you about this: "${short(n.headline, 70)}". Here is what happened, and what comes next.`, message: ok ? "A calm, clear thread. Even a few critics admit it was fair." : "Too long, too late, say the replies. It looks defensive." }; } },
  { id: "celebrate", icon: "🎉", title: "Celebrate a win", blurb: "Fine when people feel it. Dangerous when they do not.", pc: 0, run: (s, x, _a, rng) => { const ok = x.mood > -15 && rng.chance(clamp(0.6 + x.mood / 200, 0.2, 0.9)); if (ok) { lift(x, 4, (a) => a.kind !== "troll"); return { ok, text: "Proud of what we have done together. Small steps, real progress. More to come.", message: "A proud post at the right moment. Loyalists dance." }; } lift(x, -6); s.gov.trust = clamp100(s.gov.trust - 1); bump(x, "#TheyAreNotListening", 40, "bad", "a victory lap while people are hurting", s.month); return { ok, text: "Proud of what we have done together. Small steps, real progress. More to come.", message: "Tone deaf, says everybody. #TheyAreNotListening trends." }; } },
  { id: "apologise", icon: "🙇", title: "Apologise", blurb: "Rare for a politician, which is why it works.", pc: 0, need: (s) => (recentBad(s) ? null : "There is nothing to apologise for right now."), run: (s, x, _a, rng) => { const ok = rng.chance(clamp(0.6 + x.mood / 300, 0.3, 0.85)); if (ok) { lift(x, 5, (a) => a.kind !== "loyalist"); s.gov.trust = clamp100(s.gov.trust + 2); } else lift(x, -1); return { ok, text: "I got this wrong, and I am sorry. We will fix it, and I will report back.", message: ok ? "Shock, then respect. 'A president who says sorry? Nigeria wonders.'" : "Some say it is too little. A few loyalists cringe. It moves nobody." }; } },
  { id: "meme", icon: "😂", title: "Post a joke", blurb: "A coin toss. Funny presidents are loved; unfunny ones are memed.", pc: 0, run: (s, x, _a, rng) => { const ok = rng.chance(0.5 + x.mood / 400); if (ok) { lift(x, 4); s.gov.trust = clamp100(s.gov.trust + 0.5); } else { lift(x, -4); } return { ok, text: rng.pick(["Jollof rice is the real unity project. Party jollof or nothing.", "To the person who asked if I sleep: yes. To the person who asked if the generator sleeps: no.", "Monday motivation: if NEPA gives you light, do not question it."]), message: ok ? "It goes viral for the right reasons." : "Cringe. The replies are merciless." }; } },
  { id: "press", icon: "📣", title: "Attack the media", blurb: "Loyalists cheer. Journalists and activists remember.", pc: 0, run: (s, x) => { lift(x, 3, (a) => a.kind === "loyalist"); lift(x, -14, (a) => a.kind === "journalist" || a.kind === "activist"); for (const a of x.accts) if (a.kind === "journalist") remember(a, s.month, "the president called the press enemies of progress", false); s.rule.democracy = clamp100(s.rule.democracy - 1); s.rule.pressFreedom = clamp100(s.rule.pressFreedom - 2); bump(x, "#PressFreedom", 40, "bad", "the president attacked the press", s.month); return { ok: false, text: "Some media houses are not reporting. They are campaigning. Nigerians can tell the difference.", message: "The base cheers. The press does not forget." }; } },
];
export const POST_BY_ID = Object.fromEntries(POST_KINDS.map((p) => [p.id, p])) as Record<string, PostKind>;
export function postBlock(s: FixState, p: PostKind): string | null {
  const x = X(s);
  if (x.banned !== null) return "Naija X is switched off. Unblock it before you post.";
  if (s.month - x.lastPost < 2) return `Wait ${2 - (s.month - x.lastPost)} more month(s); a president who posts every hour is mocked.`;
  return p.need?.(s) ?? null;
}
export function playerPost(s: FixState, kind: string, arg?: string): { ok: boolean; message: string } {
  const p = POST_BY_ID[kind]; if (!p) return { ok: false, message: "Unknown post." };
  const b = postBlock(s, p); if (b) return { ok: false, message: b };
  if (p.choices && !p.choices.some((c) => c.id === arg)) return { ok: false, message: "Choose one." };
  const err = payPc(s, p.pc, "post that"); if (err) return { ok: false, message: err };
  const x = X(s); const rng = subRng(s.meta.seed, "xplayer", s.month, x.seq);
  const r = p.run(s, x, arg, rng);
  const post = add(s, x, ME, r.text, r.ok ? "good" : "bad", rng, { player: true });
  post.likes = Math.round(post.likes * (r.ok ? 1.4 : 0.7));
  replies(s, x, post, rng, 3);
  x.lastPost = s.month; x.mood = computeMood(s, x); save(s, x);
  return { ok: true, message: r.message };
}

// ------------------------------------------------------------------------------------------------ dealing with one account
export interface AcctAction { id: "kind" | "sharp" | "block" | "unblock" | "summon"; label: string; pc: number }
export function acctActions(a: XAcct): AcctAction[] {
  if (a.blocked) return [{ id: "unblock", label: "Unblock", pc: 0 }];
  const l: AcctAction[] = [{ id: "kind", label: "Reply kindly", pc: 0 }, { id: "sharp", label: "Reply sharply", pc: 0 }, { id: "block", label: "Block", pc: 1 }];
  if (a.kind === "journalist" || a.kind === "activist" || a.kind === "troll") l.push({ id: "summon", label: "Send the security service", pc: 4 });
  return l;
}
export function actOnAcct(s: FixState, acctId: string, action: AcctAction["id"]): { ok: boolean; message: string } {
  const x = X(s); const a = x.accts.find((y) => y.id === acctId); if (!a) return { ok: false, message: "Account not found." };
  const act = acctActions(a).find((z) => z.id === action); if (!act) return { ok: false, message: "Not possible." };
  if (x.banned !== null) return { ok: false, message: "Naija X is switched off." };
  const err = act.pc ? payPc(s, act.pc, act.label.toLowerCase()) : null; if (err) return { ok: false, message: err };
  const rng = subRng(s.meta.seed, "xacct", s.month, acctId, action, x.seq);
  const last = [...x.posts].reverse().find((p) => p.by === acctId);
  const respond = (text: string, tone: XPost["tone"]) => { const p = add(s, x, ME, text, tone, rng, { player: true, parent: last?.id }); p.likes = Math.round(p.likes * 0.5); };
  let msg = "";
  if (action === "kind") { a.mood = clamp(a.mood + (a.kind === "citizen" ? 14 : 9), -95, 95); remember(a, s.month, "the president replied to me kindly", true); respond(`@${a.handle.slice(1)} Thank you for saying this. We are listening and we are working on it.`, "good"); msg = `${a.name} is surprised. ${a.kind === "citizen" ? "Their followers notice." : "A little of the edge goes."}`; }
  else if (action === "sharp") { a.mood = clamp(a.mood - 12, -95, 95); remember(a, s.month, "the president came for me in the replies", false); respond(`@${a.handle.slice(1)} You have your facts wrong, and you know it.`, "bad"); const ratio = rng.chance(a.kind === "loyalist" || a.kind === "troll" ? 0.3 : 0.6); lift(x, ratio ? -3 : 2, (y) => y.kind === "citizen"); msg = ratio ? "Ratio'd. The replies pile on the president." : "Your base loves it, and the neutrals shrug."; }
  else if (action === "block") { a.blocked = true; a.mood = clamp(a.mood - 25, -95, 95); remember(a, s.month, "the president blocked me", false); const streisand = rng.chance(a.kind === "journalist" || a.kind === "activist" ? 0.7 : 0.35); if (streisand) { bump(x, `#Free${a.handle.slice(1).replace(/_/g, "")}`, 55, "bad", `${a.name} was blocked`, s.month); lift(x, -3, (y) => y.id !== a.id && y.kind !== "loyalist"); } msg = streisand ? `${a.name} posts the block screenshot. It goes viral.` : `${a.name} is gone from your feed. Their followers can still see everything.`; }
  else if (action === "unblock") { a.blocked = false; a.mood = clamp(a.mood + 4, -95, 95); msg = `${a.name} is back on your feed.`; }
  else { a.silentUntil = s.month + 6; a.mood = clamp(a.mood - 20, -95, 95); remember(a, s.month, "the security service came to my door", false); s.rule.democracy = clamp100(s.rule.democracy - (a.kind === "troll" ? 0.5 : 2)); s.rule.pressFreedom = clamp100(s.rule.pressFreedom - (a.kind === "troll" ? 1 : 3)); s.rule.intlPressure = clamp100(s.rule.intlPressure + (a.kind === "troll" ? 0.3 : 1.5)); const streisand = a.kind !== "troll" && rng.chance(0.75); if (streisand) { lift(x, -8, (y) => y.kind === "journalist" || y.kind === "activist"); bump(x, "#Free" + a.handle.slice(1).replace(/_/g, ""), 70, "bad", `${a.name} was visited by the security service`, s.month); pushNews(s, { source: `xsum:${a.id}:${s.month}`, headline: `${a.name} questioned by security agents over posts`, body: "Press groups call it intimidation. The presidency says it knows nothing.", tone: "bad" }); } msg = a.kind === "troll" ? `${a.name} goes quiet for six months. Nobody misses the noise.` : streisand ? `${a.name} goes quiet, and everybody else gets louder.` : `${a.name} goes quiet for six months.`; }
  x.mood = computeMood(s, x); save(s, x);
  return { ok: true, message: msg };
}

// ------------------------------------------------------------------------------------------------ bots and the ban
export const BOT_LEVELS = [{ lvl: 0, label: "No bots", cost: 0 }, { lvl: 1, label: "A few accounts", cost: 4 }, { lvl: 2, label: "A real bot farm", cost: 9 }, { lvl: 3, label: "The full army", cost: 16 }] as const;
export function setBots(s: FixState, lvl: 0 | 1 | 2 | 3): { ok: boolean; message: string } {
  const x = X(s); if (x.bots === lvl) return { ok: false, message: "Already at that level." };
  if (lvl > 0 && x.bots === 0) { const err = payPc(s, 3, "hire a bot farm"); if (err) return { ok: false, message: err }; x.botSince = s.month; }
  x.bots = lvl; save(s, x);
  return { ok: true, message: lvl === 0 ? "The bot farm is shut down. The accounts go silent." : "Thousands of friendly accounts begin to appear. Nobody asks where from. Yet." };
}
export function reportBots(s: FixState): { ok: boolean; message: string } {
  const x = X(s); if (x.hostileUntil < s.month) return { ok: false, message: "No hostile bot campaign is running." };
  const err = payPc(s, 1, "report the bot accounts"); if (err) return { ok: false, message: err };
  x.hostileUntil = s.month - 1; x.accts = x.accts.filter((a) => !(a.kind === "bot" && a.bias < 0)); save(s, x);
  return { ok: true, message: "Naija X removes the accounts. The trend loses its fake fuel." };
}
export function banX(s: FixState): { ok: boolean; message: string } {
  const x = X(s); if (x.banned !== null) return { ok: false, message: "It is already switched off." };
  const err = payPc(s, 8, "switch off Naija X"); if (err) return { ok: false, message: err };
  x.banned = s.month; s.rule.democracy = clamp100(s.rule.democracy - 6); s.rule.pressFreedom = clamp100(s.rule.pressFreedom - 10); s.rule.intlPressure = clamp100(s.rule.intlPressure + 6);
  s.groupMood.youth = clamp(s.groupMood.youth - 6, -40, 40);
  addMod(s, "x:ban", "Naija X switched off", { investor: -2, sme: -1.2 }, { duration: null, ramp: 2 });
  pushNews(s, { source: `xban:${s.month}`, headline: "Government switches off Naija X nationwide", body: "Businesses that sell online say they are losing customers. Millions turn to VPNs.", tone: "bad" });
  bump(x, "#KeepItOn", 90, "bad", "the platform was switched off", s.month); save(s, x);
  return { ok: true, message: "The platform goes dark. Millions download VPNs by evening. Your feed is quiet, and the quiet is not peace." };
}
export function unbanX(s: FixState): { ok: boolean; message: string } {
  const x = X(s); if (x.banned === null) return { ok: false, message: "It is not switched off." };
  const err = payPc(s, 2, "restore Naija X"); if (err) return { ok: false, message: err };
  x.banned = null; removeMods(s, "x:ban"); s.gov.trust = clamp100(s.gov.trust + 1.5); lift(x, 4);
  pushNews(s, { source: `xunban:${s.month}`, headline: "Naija X is back. Nigerians return, loudly", body: "The first trending hashtag is about the ban itself.", tone: "neutral" }); save(s, x);
  return { ok: true, message: "Naija X comes back. The first thing trending is the ban itself." };
}

// ------------------------------------------------------------------------------------------------ for the screen
export interface Thread { post: XPost; replies: XPost[] }
export function threads(s: FixState, n = 14): Thread[] {
  const x = X(s);
  const tops = x.posts.filter((p) => !p.parent).slice(-n).reverse();
  return tops.map((p) => ({ post: p, replies: x.posts.filter((r) => r.parent === p.id) }));
}
export const profileOf = (s: FixState, id: string) => (id === ME ? meAcct(s) : acctOf(X(s), id));

/** the first time you open Naija X the country is already talking */
export function seedFeed(s: FixState): { ok: boolean; message: string } {
  if (X(s).posts.length) return { ok: false, message: "" };
  socialMonthly(s, subRng(s.meta.seed, "xseed", s.month)); socialMonthly(s, subRng(s.meta.seed, "xseed2", s.month));
  return { ok: true, message: "" };
}
