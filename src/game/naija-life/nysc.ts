import { STATE_BY_ID, TRAVEL_STATES, JOB_BY_ID } from "./data";
import { I, bump, moveTo } from "./helpers";
import { transact } from "./ledger";
import { campusHire } from "./campus";
import { addFriend } from "./family";
import type { EventData, EventDef, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, randInt } from "./util";

/**
 * NYSC is one year, start to finish: posting, a month of camp (a small game, skippable),
 * finding a PPA (Place of Primary Assignment), eleven months of service on the ₦77,000 allowance,
 * then pass-out where the PPA either keeps you or lets you go.
 */
export const NYSC_ALLOWANCE = 77_000;

export const serving = (p: Player) => p.flags.nyscServing === true;

interface Ppa {
  id: string;
  emoji: string;
  name: [string, string];
  /** 1 = easy places, 3 = the glamour employers that mostly take the connected and the rich. */
  tier: 1 | 2 | 3;
  job: string | null;
  place: number;
  keep: number;
}

const PPAS: Ppa[] = [
  { id: "school", emoji: "🏫", name: ["Secondary school", "Secondary school"], tier: 1, job: "teacher", place: 0.92, keep: 0.5 },
  { id: "civil", emoji: "🏛️", name: ["Government ministry", "Government ministry"], tier: 1, job: "civil", place: 0.8, keep: 0.3 },
  { id: "hospital", emoji: "🏥", name: ["Hospital or clinic", "Hospital or clinic"], tier: 2, job: "nurse", place: 0.75, keep: 0.55 },
  { id: "media", emoji: "📰", name: ["Media house", "Media house"], tier: 2, job: "journalist", place: 0.55, keep: 0.4 },
  { id: "law", emoji: "⚖️", name: ["Law chambers", "Law chambers"], tier: 2, job: "lawyer", place: 0.55, keep: 0.5 },
  { id: "eng", emoji: "🏗️", name: ["Engineering firm", "Engineering firm"], tier: 2, job: "engineer", place: 0.5, keep: 0.45 },
  { id: "tech", emoji: "💻", name: ["Telecom or tech company", "Telecom or tech company"], tier: 3, job: "dev", place: 0.42, keep: 0.45 },
  { id: "bank", emoji: "🏦", name: ["Bank", "Bank"], tier: 3, job: "banker", place: 0.42, keep: 0.4 },
  { id: "oil", emoji: "🛢️", name: ["Oil and gas company", "Oil and gas company"], tier: 3, job: "oil", place: 0.28, keep: 0.35 },
  { id: "ngo", emoji: "🤝", name: ["Small NGO or local government", "Small NGO or local government"], tier: 1, job: null, place: 0.9, keep: 0 },
];
export const PPA_BY_ID = Object.fromEntries(PPAS.map((x) => [x.id, x]));

const offered = (p: Player, x: Ppa) => {
  if (!x.job) return true;
  const j = JOB_BY_ID[x.job];
  return !!j && (!j.courses || (!!p.course && j.courses.includes(p.course)));
};

const poor = (p: Player) => p.classAtBirth === "struggling";
const rich = (p: Player) => p.classAtBirth === "rich";

export function placeOdds(p: Player, x: Ppa, bribed = false): number {
  let o = x.place + p.stats.connections / 250 + p.stats.smarts / 500 + campusHire(p);
  const camp = Number(p.flags.nyscCamp ?? -1);
  o += camp < 0 ? -0.04 : camp >= 6 ? 0.06 : 0;
  if (x.tier === 3 && (p.flags.nyscPosted === "abuja" || p.flags.nyscPosted === "lagos")) o += 0.08;
  if (x.tier >= 2) o += poor(p) ? (x.tier === 3 ? -0.3 : -0.15) : rich(p) ? 0.12 : 0;
  if (bribed) o += 0.25;
  return clamp(o, 0.04, 0.95);
}

export function keepOdds(p: Player, x: Ppa): number {
  if (!x.job) return 0;
  let o = x.keep + (Number(p.flags.nyscPerf ?? 50) - 50) / 150 + p.stats.smarts / 600 + p.stats.connections / 500 + campusHire(p);
  if (x.tier === 3) o += poor(p) ? -0.12 : rich(p) ? 0.1 : 0;
  else if (x.tier === 2 && poor(p)) o -= 0.04;
  return clamp(o, 0.03, 0.9);
}

const hardness = (o: number) =>
  o >= 0.7 ? T("Easy to get", "E easy to get") : o >= 0.45 ? T("Medium", "Medium") : o >= 0.2 ? T("Hard to get", "E hard to get") : T("Long shot", "Long shot");

const perf = (q: Player, n: number) => { q.flags.nyscPerf = clamp(Number(q.flags.nyscPerf ?? 50) + n, 0, 100); };
const camp = (q: Player, d: EventData, pts: number): number => Number(d.score ?? 0) + pts;

/** Camp mini-game: three quick rounds, each a small risk. The score decides how the rest of the year goes. */
const ROUNDS: { title: [string, string]; text: [string, string]; opts: (p: Player) => { label: [string, string]; sub?: [string, string]; run: (q: Player) => { pts: number; en: string; pcm: string } }[] }[] = [
  {
    title: ["Camp: 5am parade", "Camp: 5am parade"],
    text: ["The whistle blows at 5am. The soldier at the gate has no mercy and your boots are borrowed.", "Whistle blow 5am. Soldier for gate no get mercy and your boot na borrow-borrow."],
    opts: () => [
      { label: ["Do the full drill", "Do full drill"], run: (q) => { const ok = chance(0.5 + q.stats.fitness / 200); bump(q, "fitness", 3); return ok ? { pts: 3, en: "You march like a general. The commander notes your name.", pcm: "You march like general. Commander write your name." } : { pts: 1, en: "You collapse at lap four but you finish. Respect.", pcm: "You collapse for lap four but you finish. Respect." }; } },
      { label: ["Fake an injury", "Fake injury"], run: (q) => { bump(q, "stress", -3); return chance(0.45) ? { pts: 1, en: "Sick bay for two days. Free paracetamol.", pcm: "Sick bay for two days. Free paracetamol." } : { pts: 0, en: "The nurse sees through you. Extra laps.", pcm: "Nurse see through you. Extra laps." }; } },
      { label: ["Settle the drill sergeant", "Settle drill sergeant"], sub: ["₦5,000", "₦5,000"], run: (q) => { transact(q, { amount: -I(q, 5_000), reason: T("Settling camp officials", "Settle camp officials"), category: "event" }); return { pts: 1, en: "He nods and looks the other way.", pcm: "E nod and look another side." }; } },
    ],
  },
  {
    title: ["Camp: Mammy market", "Camp: Mammy market"],
    text: ["Night falls. Mammy market is loud: jollof, suya, charged phones, and every platoon selling something.", "Night fall. Mammy market loud: jollof, suya, phone charging, every platoon dey sell something."],
    opts: () => [
      { label: ["Open a small stall", "Open small stall"], run: (q) => { const ok = chance(0.45 + q.stats.smarts / 250); transact(q, { amount: ok ? I(q, 20_000) : -I(q, 8_000), reason: T("Mammy market stall", "Mammy market stall"), category: "business" }); return ok ? { pts: 2, en: "Your stall is the talk of the camp.", pcm: "Your stall be camp talk." } : { pts: 1, en: "Half your stock is gone before 9pm. Lesson learned.", pcm: "Half your stock don go before 9pm. Lesson learnt." }; } },
      { label: ["Befriend your platoon", "Make friend for platoon"], run: (q) => { addFriend(q, randInt(-2, 3)); bump(q, "connections", 2); return { pts: 2, en: "You leave with a new friend from another tribe.", pcm: "You leave with new friend from another tribe." }; } },
      { label: ["Sleep early", "Sleep early"], run: (q) => { bump(q, "health", 2); return { pts: 1, en: "Rested. Your bunkmates are not.", pcm: "You rest. Bunkmates no rest." }; } },
    ],
  },
  {
    title: ["Camp: Talent show", "Camp: Talent show"],
    text: ["The last night is the platoon talent show. Judges include the Camp Commandant.", "Last night na platoon talent show. Camp Commandant dey among judges."],
    opts: () => [
      { label: ["Perform", "Perform"], run: (q) => { const ok = chance(0.35 + q.stats.looks / 250 + q.stats.happiness / 300); bump(q, "happiness", 4); return ok ? { pts: 3, en: "Standing ovation. The Commandant remembers your face.", pcm: "Dem stand up clap. Commandant remember your face." } : { pts: 1, en: "You forget your lines, but the crowd cheers anyway.", pcm: "You forget your lines but crowd cheer anyway." }; } },
      { label: ["Organise the platoon", "Organise platoon"], run: (q) => { bump(q, "reputation", 2); return chance(0.6 + q.stats.smarts / 300) ? { pts: 3, en: "Your platoon wins. You become 'Mr/Ms Organiser'.", pcm: "Your platoon win. Dem call you 'Organiser'." } : { pts: 1, en: "Chaos. But fun chaos.", pcm: "Na chaos. But sweet chaos." }; } },
      { label: ["Watch from the back", "Watch from back"], run: () => ({ pts: 0, en: "You eat groundnut and watch. No regrets.", pcm: "You chop groundnut and watch. No regret." }) },
    ],
  },
];

function campFinish(q: Player, score: number): string {
  q.flags.nyscCamp = score;
  if (score >= 6) { bump(q, "reputation", 3); bump(q, "connections", 4); return T(`Camp ends. You are named among the best in your platoon (score ${score}/9).`, `Camp end. Dem name you among the best for platoon (score ${score}/9).`); }
  if (score >= 3) { bump(q, "connections", 2); return T(`Camp ends. You survived with your pride mostly intact (score ${score}/9).`, `Camp end. You survive with your pride (score ${score}/9).`); }
  bump(q, "reputation", -1);
  return T(`Camp ends. Nobody will remember you. That is also a strategy (score ${score}/9).`, `Camp end. Nobody go remember you. Na strategy too (score ${score}/9).`);
}

const convicted = (p: Player) => (p.crime?.record ?? []).some((r) => r.outcome === "convicted");

function ppaEvent(): Pending { return { kind: "event", id: "nysc_ppa", data: {} }; }

export const NYSC_EVENTS: EventDef[] = [
  {
    id: "nysc",
    title: dual("NYSC posting", "NYSC posting"),
    weight: () => 0,
    init: () => ({ posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id }),
    text: (_p, d) => T(`You are a graduate! NYSC has posted you to ${STATE_BY_ID[String(d.posted)].name} State. It is one year of service: a month of camp, then your PPA, then pass-out.`, `You don graduate! NYSC don post you go ${STATE_BY_ID[String(d.posted)].name} State. Na one year: one month camp, then your PPA, then pass-out.`),
    choices: (p, d) => [
      { label: T("Go and serve", "Go serve"), sub: T(`${STATE_BY_ID[String(d.posted)].name} State`, `${STATE_BY_ID[String(d.posted)].name} State`), run: (q) => { const note = moveTo(q, String(d.posted)); q.flags.nyscServing = true; q.flags.nyscStart = q.age; q.flags.nyscPosted = String(d.posted); q.flags.nyscPerf = 50; return { text: T(`You pack your khaki and go. ${note}`, `You pack your khaki and go. ${note}`), spawn: [{ kind: "event", id: "nysc_camp", data: {} }] }; } },
      { label: T("Work your posting to Abuja", "Work your posting go Abuja"), sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 150_000), reason: T("Redeployment to Abuja", "Redeployment go Abuja"), category: "other" }); const note = moveTo(q, "abuja"); q.flags.nyscServing = true; q.flags.nyscStart = q.age; q.flags.nyscPosted = "abuja"; q.flags.nyscPerf = 50; bump(q, "connections", 2); return { text: T(`Your posting changes to Abuja. Big-company PPAs are nearer now. ${note}`, `Your posting change go Abuja. Big company PPA near you now. ${note}`), spawn: [{ kind: "event", id: "nysc_camp", data: {} }] }; } },
      { label: T("Skip NYSC entirely", "Skip NYSC totally"), sub: T("Saves a year, costs you", "Save one year, e go cost you"), run: (q) => { q.flags.nysc = true; q.flags.nyscSkipped = true; bump(q, "reputation", -6); return T("No certificate. You saved a year, but formal employers will ask for it.", "No certificate. You save one year, but formal employers go ask for am."); } },
    ],
  },
  {
    id: "nysc_remobilise",
    title: dual("NYSC after prison", "NYSC after prison"),
    weight: () => 0,
    valid: (p) => p.edu === "tertiary" && !p.flags.nysc && !serving(p),
    text: (p) => p.flags.nyscTerminated
      ? T("You were removed from service when you were jailed, so there is no certificate. The NYSC discipline office says you may apply to be remobilised and start the year again.", "Dem remove you from service when dem jail you, so no certificate. NYSC discipline office talk say you fit apply make dem remobilise you start the year again.")
      : T("You never did your national service. With a prison record, NYSC will still mobilise you, but expect questions.", "You never do your national service. Even with prison record, NYSC go still mobilise you, but expect questions."),
    choices: () => [
      { label: T("Apply to serve again", "Apply to serve again"), run: (q) => {
        if (chance(0.6 + q.stats.connections / 400)) { delete q.flags.nyscTerminated; return { text: T("Approved. A fresh posting letter arrives.", "Dem approve am. Fresh posting letter land."), spawn: [{ kind: "event", id: "nysc", data: { posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id } }] }; }
        bump(q, "stress", 3);
        return T("The officer says the file must go back to Abuja. Come back next year.", "Officer talk say file must go Abuja. Come back next year.");
      } },
      { label: T("Forget NYSC", "Forget NYSC"), run: (q) => { q.flags.nysc = true; q.flags.nyscSkipped = true; return T("No certificate. Formal employers will notice.", "No certificate. Formal employers go notice."); } },
    ],
  },
  {
    id: "nysc_camp",
    title: dual("Orientation camp", "Orientation camp"),
    weight: () => 0,
    valid: serving,
    init: () => ({ round: 0, score: 0 }),
    text: (_p, d) => {
      const r = Number(d.round ?? 0);
      if (!d.began) return T("Camp lasts a month: parade, mammy market, talent show. Go, or get your papers stamped and stay home?", "Camp na one month: parade, mammy market, talent show. You go or you go stamp paper stay house?");
      return T(ROUNDS[r].text[0], ROUNDS[r].text[1]);
    },
    choices: (p, d) => {
      const r = Number(d.round ?? 0);
      if (!d.began) {
        return [
          { label: T("Go to camp", "Go camp"), sub: T("Three quick rounds", "Three quick rounds"), run: () => ({ text: T("You arrive at the camp gate with a bucket and a smile.", "You reach camp gate with bucket and smile."), spawn: [{ kind: "event", id: "nysc_camp", data: { round: 0, score: 0, began: true } }] }) },
          { label: T("Skip camp", "Skip camp"), sub: T("Costs reputation, saves a month", "E cost reputation"), run: (q) => { q.flags.nyscCamp = -1; bump(q, "reputation", -3); bump(q, "stress", -2); return { text: T("You pay to get your camp papers stamped. People side-eye the certificate, but you saved a month.", "You pay stamp your camp papers. People go side-eye, but you save one month."), spawn: [ppaEvent()] }; } },
        ];
      }
      return ROUNDS[r].opts(p).map((o) => ({
        label: T(o.label[0], o.label[1]),
        sub: o.sub ? T(o.sub[0], o.sub[1]) : undefined,
        run: (q: Player) => {
          const res = o.run(q);
          const s = camp(q, d, res.pts);
          const line = T(res.en, res.pcm);
          if (r < ROUNDS.length - 1) return { text: line, spawn: [{ kind: "event", id: "nysc_camp", data: { round: r + 1, score: s, began: true } }] as Pending[] };
          return { text: `${line} ${campFinish(q, s)}`, spawn: [ppaEvent()] };
        },
      }));
    },
  },
  {
    id: "nysc_ppa",
    title: dual("Find your PPA", "Find your PPA"),
    weight: () => 0,
    valid: serving,
    text: (p) => T(`Camp is over. Now the real hustle: your PPA. ${poor(p) ? "The glamour places mostly go to people with a name or a godfather." : "Where you serve decides who might keep you."}`, `Camp don end. Na real hustle remain: your PPA. ${poor(p) ? "Big places dey go to people wey get name or godfather." : "Where you serve go decide who fit keep you."}`),
    choices: (p) => {
      const list = PPAS.filter((x) => offered(p, x)).map((x) => {
        const o = placeOdds(p, x);
        return {
          label: `${x.emoji} ${T(x.name[0], x.name[1])}`,
          sub: `${hardness(o)}${x.tier === 3 ? " · " + T("pays well, may retain", "pay well, fit retain") : ""}`,
          run: (q: Player): string => settlePpa(q, x, false),
        };
      });
      const pull = PPAS.filter((x) => x.tier === 3 && offered(p, x)).slice(0, 1).map((x) => ({
        label: `🤝 ${T("Pull a string for", "Use godfather for")} ${T(x.name[0], x.name[1])}`,
        sub: naira(I(p, 200_000)),
        disabled: p.money < I(p, 200_000) ? T("Not enough cash", "Cash no reach") : false,
        run: (q: Player): string => { transact(q, { amount: -I(q, 200_000), reason: T("Settling a PPA slot", "Settle PPA slot"), category: "other" }); return settlePpa(q, x, true); },
      }));
      return [...list, ...pull];
    },
  },
  {
    id: "nysc_year",
    title: dual("Corper life", "Corper life"),
    weight: () => 0,
    valid: serving,
    init: () => ({ kind: pick(["boss", "cds", "side", "stipend"]) }),
    text: (_p, d) => {
      switch (d.kind) {
        case "boss": return T("Your PPA supervisor dumps a pile of work on you at 4pm on a Friday. 'Corper, you are young. You have strength.'", "Your PPA oga drop pile of work for you 4pm Friday. 'Corper, you young. You get strength.'");
        case "cds": return T("It is CDS day. Your group wants to do a community clean-up and a free health talk. Someone has to lead it.", "E be CDS day. Your group wan do community clean-up and free health talk. Somebody must lead am.");
        case "side": return T("A neighbour offers you evening teaching and a POS corner. Your allowance is not enough for the whole month.", "Neighbour offer you evening lesson and POS corner. Your allowance no reach whole month.");
        default: return T("Allowance is late again. The group chat is mourning.", "Allowance late again. Group chat dey mourn.");
      }
    },
    choices: (_p, d) => {
      switch (d.kind) {
        case "boss": return [
          { label: T("Do it properly", "Do am well"), run: (q) => { perf(q, 12); bump(q, "stress", 3); return T("Your supervisor is quietly impressed.", "Your oga quietly impress."); } },
          { label: T("Do the bare minimum", "Do small small"), run: (q) => { perf(q, -8); bump(q, "stress", -2); return T("Done by 5pm. Nobody is thrilled.", "You finish by 5pm. Nobody happy."); } },
          { label: T("Disappear", "Disappear"), run: (q) => { perf(q, -15); bump(q, "reputation", -2); return T("Your name is now a topic at the staff meeting.", "Your name don enter staff meeting."); } },
        ];
        case "cds": return [
          { label: T("Lead the project", "Lead am"), run: (q) => { perf(q, 6); bump(q, "reputation", 4); bump(q, "connections", 3); bump(q, "happiness", 3); return T("The community loves it. The local government chairman takes a photo with you.", "Community love am. LG chairman snap picture with you."); } },
          { label: T("Show up and clap", "Show up and clap"), run: (q) => { bump(q, "happiness", 1); return T("You attend. You clap. You collect your clearance.", "You attend. You clap. You collect clearance."); } },
          { label: T("Pay for clearance", "Pay for clearance"), sub: naira(I(_p, 3_000)), run: (q) => { transact(q, { amount: -I(q, 3_000), reason: T("CDS clearance fee", "CDS clearance fee"), category: "event" }); bump(q, "reputation", -1); return T("Everyone does it. Nobody admits it.", "Everybody dey do am. Nobody dey confess."); } },
        ];
        case "side": return [
          { label: T("Take both", "Take both"), run: (q) => { transact(q, { amount: I(q, 90_000), reason: T("Corper side hustle", "Corper side hustle"), category: "business" }); bump(q, "stress", 4); perf(q, -4); return T("Extra cash, tired eyes.", "Extra cash, tired eye."); } },
          { label: T("Evening lessons only", "Evening lesson only"), run: (q) => { transact(q, { amount: I(q, 45_000), reason: T("Evening lessons", "Evening lesson"), category: "business" }); bump(q, "smarts", 1); return T("You make a few extra naira and a few fans.", "You make small extra naira and small fans."); } },
          { label: T("Focus on service", "Focus on service"), run: (q) => { perf(q, 6); return T("You protect your reputation at the PPA.", "You protect your name for PPA."); } },
        ];
        default: return [
          { label: T("Borrow from your parents", "Borrow from parents"), run: (q) => { bump(q, "stress", 1); transact(q, { amount: I(q, 20_000), reason: T("Money from home", "Money from house"), category: "family" }); return T("They send it, with a sermon.", "Dem send am, with sermon."); } },
          { label: T("Manage till it comes", "Manage till e come"), run: (q) => { bump(q, "stress", 3); bump(q, "health", -1); return T("Garri, sugar and prayer. It comes, eventually.", "Garri, sugar and prayer. E go come eventually."); } },
        ];
      }
    },
  },
  {
    id: "nysc_passout",
    title: dual("Passing out", "Passing out"),
    weight: () => 0,
    valid: serving,
    text: (p) => {
      const x = PPA_BY_ID[String(p.flags.nyscPpa ?? "ngo")];
      return T(`Twelve months gone. Pass-out day. Your PPA (${T(x.name[0], x.name[1])}) has a letter for you, and the certificate is waiting.`, `Twelve months don go. Pass-out day. Your PPA (${T(x.name[0], x.name[1])}) get letter for you, and certificate dey wait.`);
    },
    choices: () => [
      { label: T("Collect discharge certificate", "Collect discharge certificate"), run: (q) => passOut(q) },
    ],
  },
];

function settlePpa(q: Player, x: Ppa, bribed: boolean): string {
  const got = chance(placeOdds(q, x, bribed));
  const fallback = PPAS.find((y) => y.id === (offered(q, PPA_BY_ID.school) ? "school" : "ngo"))!;
  const final = got ? x : fallback;
  q.flags.nyscPpa = final.id;
  perf(q, 0);
  const name = T(final.name[0], final.name[1]);
  if (got) {
    if (x.tier === 3) { bump(q, "reputation", 3); bump(q, "happiness", 5); }
    return T(`You land a PPA at the ${name.toLowerCase()}. ${x.tier === 3 ? "Your friends are jealous." : "Not glamorous, but it is yours."}`, `You land PPA for ${name.toLowerCase()}. ${x.tier === 3 ? "Your friends dey jealous." : "E no glamorous, but na your own."}`);
  }
  bump(q, "stress", 3);
  const why = poor(q) && x.tier === 3 ? T("They asked who sent you. Nobody did.", "Dem ask who send you. Nobody send you.") : T("The slot was 'already filled'.", "Dem say slot 'don fill'.");
  return T(`${why} You end up at the ${name.toLowerCase()} instead.`, `${why} You end up for ${name.toLowerCase()} instead.`);
}

function passOut(q: Player): string {
  const x = PPA_BY_ID[String(q.flags.nyscPpa ?? "ngo")];
  q.flags.nyscServing = false;
  q.flags.nysc = true;
  q.flags.nyscDone = q.age;
  q.achievements.push("Completed NYSC");
  bump(q, "connections", 4);
  bump(q, "smarts", 1);
  const cert = T("You collect your discharge certificate.", "You collect your discharge certificate.");
  if (x.job && !q.job && chance(keepOdds(q, x))) {
    q.job = { id: x.job, rank: 0, years: 0 };
    q.flags.nyscRetained = true;
    bump(q, "happiness", 8);
    return T(`${cert} The ${T(x.name[0], x.name[1]).toLowerCase()} offers you a permanent job: ${JOB_BY_ID[x.job].ladder[0].title}. You are retained!`, `${cert} ${T(x.name[0], x.name[1])} offer you permanent work: ${JOB_BY_ID[x.job].ladder[0].title}. Dem retain you!`);
  }
  bump(q, "stress", 2);
  return T(`${cert} The ${T(x.name[0], x.name[1]).toLowerCase()} thanks you and shows you the door. Time to start job hunting.`, `${cert} ${T(x.name[0], x.name[1])} thank you and show you door. Make you start to find job.`);
}

/** Called each ageUp: queues the year's stories and the pass-out, or cancels service if the year was lost. */
export function nyscYear(p: Player, lines: string[], pending: Pending[], wasInside = false) {
  if (!serving(p)) return;
  if (wasInside || p.prison > 0) {
    // Service is paused while locked up and resumes after release.
    p.flags.nyscStart = Number(p.flags.nyscStart ?? p.age) + 1;
    return;
  }
  if (p.age <= Number(p.flags.nyscStart ?? p.age)) return;
  if (!p.flags.nyscPpa) p.flags.nyscPpa = "ngo";
  pending.push({ kind: "event", id: "nysc_year", data: { kind: "boss" } });
  pending.push({ kind: "event", id: "nysc_year", data: { kind: pick(["cds", "side", "stipend"]) } });
  pending.push({ kind: "event", id: "nysc_passout", data: {} });
}

export function nyscAllowance(p: Player): number {
  return serving(p) && p.flags.nyscPpa ? NYSC_ALLOWANCE * p.index : 0;
}

/** Called the year a prison term ends: graduates who never finished NYSC get another chance to apply. */
export function nyscRelease(p: Player, pending: Pending[]) {
  if (p.edu === "tertiary" && !p.flags.nysc && p.age <= 40) pending.push({ kind: "event", id: "nysc_remobilise", data: {} });
}
