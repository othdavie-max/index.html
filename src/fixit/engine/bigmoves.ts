/**
 * "When I become president I will…": the beer-parlour promises every Nigerian has made. Here you can actually do them
 * and watch what happens. Some work, some backfire, and some work for a while. Also: more problems Nigerians know too well.
 * All numbers are simulated game values.
 */
import type { Rng } from "../../game/engine/rng";
import { payPc, PC_COST } from "./meta";
import type { Effects, FixState, GroupId } from "./types";
import { addMod, clamp100, nb, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";
import { STATE_BY_ID } from "../../game/data/states";

export interface Move {
  id: string; icon: string; title: string; quote: string; blurb: string; cost: number; risk: string;
  /** can only be done once */
  once?: boolean;
  need?: (s: FixState) => string | null;
  /** text shown after doing it, plus the real effect */
  run: (s: FixState, arg?: number) => string;
  /** ask for a number (the naira peg) */
  ask?: { label: string; min: number; max: number; step: number; def: (s: FixState) => number };
}
const mods = (s: FixState, id: string, label: string, e: Effects, o: { duration?: number | null; ramp?: number; monthly?: number } = {}) => {
  addMod(s, `move:${id}`, label, e, { duration: o.duration ?? null, ramp: o.ramp ?? 2 });
  if (o.monthly) { const m = s.modifiers[s.modifiers.length - 1]; if (m && m.source === `move:${id}`) m.monthly = o.monthly; }
};
const grp = (s: FixState, d: Partial<Record<GroupId, number>>) => { for (const [k, v] of Object.entries(d)) s.groupMood[k as GroupId] = Math.max(-40, Math.min(40, s.groupMood[k as GroupId] + (v as number))); };
const later = (s: FixState, id: string, delay: number) => { const l = JSON.parse(String(s.flags.laters ?? "[]")) as { due: number; id: string }[]; l.push({ due: s.month + delay, id }); s.flags.laters = JSON.stringify(l); };

export const MOVES: Move[] = [
  {
    id: "peg", icon: "💵", title: "Fix the naira by decree", quote: "\"One naira, one dollar. By Monday.\"", blurb: "Order the central bank to hold the official rate at a number you choose. Shops, banks and the black market will have their say.", cost: 0,
    risk: "The central bank must sell dollars to hold the line. When reserves run out the peg breaks, and the naira falls much further.",
    need: (s) => (typeof s.flags.peg === "number" ? "A peg is already in force." : null),
    ask: { label: "Official rate (₦ per $1)", min: 1, max: 1500, step: 1, def: (s) => Math.round(s.eco.fx * 0.6) },
    run: (s, arg) => {
      const rate = Math.max(1, Math.round(arg ?? 800));
      s.flags.shadowFx = s.eco.fx; s.flags.peg = rate; s.flags.pegSince = s.month; s.eco.fx = rate;
      mods(s, "peg:glow", "Peg: cheap imports and a feel-good moment", { happiness: 1.8, trust: 0.5 }, { ramp: 1 });
      mods(s, "peg:strain", "Peg: investors do not believe it", { investor: -9, exports: -2 }, { ramp: 2 });
      grp(s, { traders: 6, workers: 4, business: -4 });
      pushNews(s, { source: `peg:${s.month}`, headline: rate < 100 ? `Naira fixed at ₦${rate}: "the dollar is dead!"` : `Naira fixed at ₦${rate} to the dollar by presidential order`, body: "Bank queues form. Economists warn about the black market.", tone: "neutral" });
      return `The official rate is now ₦${rate}. Imports are suddenly cheap, and the central bank is selling dollars as fast as it can.`;
    },
  },
  {
    id: "jets", icon: "🛩️", title: "Sell the presidential jets", quote: "\"I will fly commercial like everyone else.\"", blurb: "Sell the fleet and hold a public auction. Your chief of staff is not happy about the traffic.", cost: 0, once: true, risk: "A small saving, a big symbol. Your aides will grumble.",
    run: (s) => { s.fin.treasury += 25; s.gov.trust = clamp100(s.gov.trust + 3.5); grp(s, { youth: 4, workers: 3 }); for (const b of s.backers ?? []) b.mood = clamp100(b.mood - 3); pushNews(s, { source: "jets", headline: "President sells the presidential jets", body: "Nigerians on X are suspicious and delighted in equal measure. #JetGate trends.", tone: "good" }); return "The fleet is sold. Trust rises. Your backers wanted that jet."; },
  },
  {
    id: "lawpay", icon: "✂️", title: "Cut lawmakers' pay and allowances", quote: "\"Nobody should earn millions to sit in a chamber.\"", blurb: "Slash salaries, 'running costs' and the constituency allowance.", cost: 0, once: true, risk: "Senators will not forgive you, and they vote on your budget.",
    run: (s) => { s.gov.trust = clamp100(s.gov.trust + 4); s.assembly.support = clamp100(s.assembly.support - 14); for (const l of s.lawmakers ?? []) l.loyalty = clamp100(l.loyalty - 9); grp(s, { youth: 5, workers: 3 }); mods(s, "lawpay", "Lawmakers' pay cut", { revenue: 14 }, { ramp: 1 }); return "Public cheers. The Assembly is furious and every vote just got harder."; },
  },
  {
    id: "treatment", icon: "🏥", title: "Ban government officials from foreign medical trips", quote: "\"If the hospital is good enough for the people, it is good enough for you.\"", blurb: "Officials must use Nigerian hospitals.", cost: 12, once: true, risk: "Elites hate it. The hospitals might actually improve.",
    run: (s) => { s.gov.trust = clamp100(s.gov.trust + 2.5); s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty - 6); mods(s, "treatment", "Officials now use home hospitals", { health: 3, happiness: 0.4 }, { ramp: 6 }); grp(s, { workers: 3, faith: 1 }); return "The first few ministers were seen queueing at a teaching hospital. A new wing is promised."; },
  },
  {
    id: "borders", icon: "🚧", title: "Close the borders", quote: "\"No more smuggled rice. Eat Nigerian.\"", blurb: "Shut land borders to stop smuggling and force Nigerians to buy local.", cost: 10, risk: "Smuggling drops, but prices jump first, and neighbours get angry.",
    need: (s) => (s.flags["move:borders"] ? "The borders are already closed." : null),
    run: (s) => { s.flags["move:borders"] = s.month + 1; mods(s, "borders", "Borders closed", { foodPrice: 4, oilTheft: -3, foodSupply: 1.5, revenue: 20, exports: -1 }, { ramp: 2 }); grp(s, { traders: -7, farmers: 6 }); s.rule.intlPressure = clamp100(s.rule.intlPressure + 3); later(s, "borders", 8); return "Soldiers man the border posts. Rice prices jump this month; local farmers smile."; },
  },
  {
    id: "print", icon: "🖨️", title: "Print money to pay workers and pensioners", quote: "\"Why borrow when we can print?\"", blurb: "A big cash injection: wages, pensions, arrears.", cost: 0, once: false, risk: "Feels wonderful for two months. Then prices notice.",
    need: (s) => (typeof s.flags["move:print"] === "number" && s.month + 1 - Number(s.flags["move:print"]) < 6 ? "Wait a few months before printing again." : null),
    run: (s) => { s.flags["move:print"] = s.month + 1; s.fin.treasury += 400; mods(s, "print", "A cash shower", { wage: 3, happiness: 1.2, demand: 0 } as Effects, { duration: 4, ramp: 1 }); grp(s, { workers: 8, traders: 3 }); later(s, "print", 3); return "Salaries are paid on time and pensioners get arrears. The central bank prints without telling anyone."; },
  },
  {
    id: "school", icon: "🍲", title: "Free school meals for every child", quote: "\"No child will go to school hungry.\"", blurb: "A national school feeding scheme.", cost: 30, risk: "It costs money every month, and the contractors will be creative.", need: (s) => (s.flags["move:school"] ? "Already running." : null),
    run: (s) => { s.flags["move:school"] = s.month + 1; mods(s, "school", "Free school meals", { education: 3, welfare: 3, happiness: 0.8, foodSupply: 0.5 }, { ramp: 4, monthly: 45 }); grp(s, { farmers: 3, youth: 2, faith: 3 }); return "Pots of jollof and beans will soon reach millions of pupils. Caterers are signing contracts."; },
  },
  {
    id: "jollof", icon: "🍛", title: "Declare a National Jollof Day", quote: "\"Ghana, we are coming.\"", blurb: "A public holiday with a big cook-off. The nation needs to smile.", cost: 8, once: true, risk: "Costs a few billion. Zero economic impact, huge mood impact. Ghana has opinions.",
    run: (s) => { s.gov.happiness = clamp100(s.gov.happiness + 4); s.gov.trust = clamp100(s.gov.trust + 1.5); grp(s, { youth: 4, traders: 3 }); pushNews(s, { source: "jollof", headline: "National Jollof Day: Lagos, Abuja and Port Harcourt cook-off draws millions", body: "#JollofWars trends for a record four days. Ghana's president says Ghana's is better.", tone: "good" }); return "Streets smell of party rice. The whole country is smiling, for a day."; },
  },
  {
    id: "importban", icon: "🌾", title: "Ban rice imports", quote: "\"Eat what we grow.\"", blurb: "Protect farmers by banning foreign rice.", cost: 5, risk: "Food prices jump now; supply rises later if farmers get seeds and fertiliser.", need: (s) => (s.flags["move:importban"] ? "Already in force." : null),
    run: (s) => { s.flags["move:importban"] = s.month + 1; mods(s, "importban", "Rice import ban", { foodPrice: 5, foodSupply: 1.5, inputs: 1 }, { ramp: 3 }); grp(s, { farmers: 8, traders: -6, workers: -2 }); later(s, "importban", 10); return "Rice prices jump in the markets. Farmers are cheering and asking for fertiliser."; },
  },
];
export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m])) as Record<string, Move>;
export function moveBlock(s: FixState, m: Move): string | null {
  if (m.once && s.flags[`move:${m.id}`]) return "Already done.";
  const n = m.need?.(s); if (n) return n;
  const c = m.cost * (0.6 + 0.4 * s.eco.priceLevel / 100);
  if (c > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function doMove(s: FixState, id: string, arg?: number): { ok: boolean; message: string } {
  const m = MOVE_BY_ID[id]; if (!m) return { ok: false, message: "Unknown move." };
  const block = moveBlock(s, m); if (block) return { ok: false, message: block };
  const pcE = payPc(s, PC_COST.move, "make that move"); if (pcE) return { ok: false, message: pcE };
  s.fin.treasury -= m.cost * (0.6 + 0.4 * s.eco.priceLevel / 100);
  s.flags[`move:${id}`] = s.month + 1;
  const message = m.run(s, arg);
  s.me.acts.push(`move:${id}`);
  return { ok: true, message };
}
export const pegged = (s: FixState) => typeof s.flags.peg === "number";
export const shadowFx = (s: FixState) => (pegged(s) ? Number(s.flags.shadowFx ?? s.eco.fx) : s.eco.fx);

/** called from phase 3 around the market rate */
export function pegBefore(s: FixState) { if (pegged(s)) s.eco.fx = Number(s.flags.shadowFx ?? s.eco.fx); }
export function pegAfter(s: FixState) { if (pegged(s)) { s.flags.shadowFx = s.eco.fx; s.eco.fx = Number(s.flags.peg); } }

export function breakPeg(s: FixState): string {
  const shadow = Number(s.flags.shadowFx ?? s.eco.fx);
  const was = Number(s.flags.peg);
  delete s.flags.peg; delete s.flags.pegSince;
  removeMods(s, "move:peg:glow"); removeMods(s, "move:peg:strain");
  s.eco.fx = Math.min(6000, Math.max(shadow * 1.35, was * 2));
  s.eco.reserves = Math.max(0, s.eco.reserves);
  mods(s, "peg:crash", "The peg collapsed", { inflation: 4, investor: -8, happiness: -2 }, { duration: 10, ramp: 1 });
  grp(s, { traders: -12, business: -10, workers: -6 });
  s.rule.streetAnger = clamp100(s.rule.streetAnger + 10);
  s.gov.trust = clamp100(s.gov.trust - 8);
  pushNews(s, { source: `pegbreak:${s.month}`, headline: `Peg collapses: naira crashes to ₦${Math.round(s.eco.fx).toLocaleString()}`, body: "Reserves ran dry. Importers cannot get dollars and prices are climbing by the hour.", tone: "bad" });
  return "The peg broke.";
}

/** Monthly: pegs burn reserves, and delayed consequences land. */
export function bigMonthly(s: FixState, rng: Rng) {
  if (pegged(s)) {
    const ratio = Math.max(1, Number(s.flags.shadowFx ?? s.eco.fx) / Math.max(1, Number(s.flags.peg)));
    const burn = Math.min(26, 6 * (ratio - 1));
    s.eco.reserves = Math.max(0, s.eco.reserves - burn);
    s.flags.blackFx = Math.round(Number(s.flags.shadowFx) * (1 + 0.04 * Math.min(4, ratio - 1)));
    if (s.eco.reserves <= 3 || s.month - Number(s.flags.pegSince ?? s.month) > 30) breakPeg(s);
    else if (ratio > 1.3 && rng.chance(0.25)) pushNews(s, { source: `black:${s.month}`, headline: `Black market: dollar at ₦${Math.round(Number(s.flags.blackFx)).toLocaleString()} as banks run out of forex`, body: "Official rate holds. Nobody can get dollars.", tone: "bad" });
  }
  const l = JSON.parse(String(s.flags.laters ?? "[]")) as { due: number; id: string }[];
  if (l.length) {
    const rest = l.filter((x) => x.due > s.month);
    for (const x of l.filter((y) => y.due <= s.month)) {
      if (x.id === "print") { addMod(s, "move:print:bill", "The bill for printing money", { inflation: 3.5, happiness: -1 }, { duration: 10, ramp: 2 }); pushNews(s, { source: `printbill:${s.month}`, headline: "Prices climb as the cash shower works through the markets", body: "Economists: 'we told you so.'", tone: "bad" }); }
      if (x.id === "borders") { pushNews(s, { source: `borders:${s.month}`, headline: s.agri.supply > s.agri.demand * 0.9 ? "Border closure: local rice output rises, smuggling falls" : "Border closure: shortages persist, neighbours retaliate with trade barriers", body: "", tone: s.agri.supply > s.agri.demand * 0.9 ? "good" : "bad" }); if (s.agri.supply <= s.agri.demand * 0.9) addMod(s, "move:borders:bite", "Neighbours retaliate", { exports: -2, foodPrice: 2 }, { duration: 10, ramp: 2 }); }
      if (x.id === "importban") { const ok = s.agri.supply > s.agri.demand * 0.88; pushNews(s, { source: `importban:${s.month}`, headline: ok ? "Local rice farmers hit a bumper harvest after the import ban" : "Rice import ban: farmers lack seeds and fertiliser, prices stay high", body: "", tone: ok ? "good" : "bad" }); if (!ok) addMod(s, "move:importban:bite", "Shortages after the ban", { foodPrice: 3 }, { duration: 8, ramp: 2 }); }
    }
    s.flags.laters = JSON.stringify(rest);
  }
}

// ---------------------------------------------------------------- more Nigerian problems
const sname = (id: string) => STATE_BY_ID[id]?.name ?? id;
export const BIG_TEMPLATES = [
  {
    id: "xmasFuel", kind: "foodcrisis" as const, urgency: 2,
    title: () => "Petrol is scarce and Christmas is coming",
    cause: (s: FixState) => `Queues snake around filling stations from Lagos to Kano. Marketers are hoarding and black-market petrol sells for ${Math.round(s.fuel.pump * 1.6)} a litre. Families want to travel home for Christmas.`,
    options: [
      { id: "import", label: "Order emergency fuel cargoes", explain: "Pay extra to rush ships in.", cost: 60, tradeoff: "Expensive, and importers make a killing.", unc: "low" as const, chance: () => 0.85, win: { unrest: -4, trust: 2 }, lose: { unrest: -1 }, winText: "Ships arrived in time. Queues vanished in five days.", loseText: "Half the cargo arrived late." },
      { id: "task", label: "Task the security forces to arrest hoarders", explain: "Raid depots and name-and-shame.", cost: 5, tradeoff: "Marketers retaliate.", unc: "medium" as const, chance: () => 0.55, win: { unrest: -3, trust: 3, groups: { traders: -2 } }, lose: { unrest: 2, trust: -1 }, winText: "Two tank farms were raided; the queues eased.", loseText: "Marketers closed stations in protest." },
      { id: "appeal", label: "Appeal for calm on TV", explain: "'There is enough fuel. Do not panic buy.'", cost: 0, tradeoff: "Words do not fill tanks.", unc: "high" as const, chance: (s: FixState) => 0.2 + 0.4 * (s.gov.trust / 100), win: { unrest: -2 }, lose: { unrest: 4, trust: -2 }, winText: "People believed you, mostly.", loseText: "Panic buying got worse." },
    ],
    expire: { unrest: 6, trust: -3 }, expireText: () => "Nigerians spent Christmas in queues.",
  },
  {
    id: "japa", kind: "story" as const, urgency: 3,
    title: () => "'Japa': doctors and nurses are leaving by the thousand",
    cause: (s: FixState) => `Hospitals say a third of their nurses have left for the UK and Canada in a year. Young graduates queue outside embassies. ${s.jobs.youth > 30 ? "Youth unemployment is a big part of the story." : ""}`,
    options: [
      { id: "pay", label: "Raise pay and housing for health workers", explain: "Make staying worth it.", cost: 70, tradeoff: "A recurring cost.", unc: "medium" as const, chance: () => 0.7, win: { health: 3, groups: { workers: 4, youth: 2 }, mods: { health: 2 }, dur: 12 }, lose: { health: 1 }, winText: "Resignations slowed and some left abroad came home.", loseText: "Many left anyway." },
      { id: "bond", label: "Force new graduates to serve 5 years", explain: "No leaving after training.", cost: 5, tradeoff: "A youth revolt on social media.", unc: "high" as const, chance: () => 0.4, win: { health: 2, groups: { youth: -6 } }, lose: { groups: { youth: -9 }, trust: -3 }, winText: "Numbers stabilised, resentment grew.", loseText: "#EndBonding trended for a week; courts struck it down." },
      { id: "shrug", label: "Say 'let them go, we train more'", explain: "A bold take.", cost: 0, tradeoff: "Not a great one.", unc: "low" as const, chance: () => 0.9, win: { health: -2, trust: -2, groups: { youth: -3 } }, lose: { health: -3, trust: -3 }, winText: "", loseText: "Hospitals closed wards." },
    ],
    expire: { health: -2, trust: -1 }, expireText: () => "More wards closed.",
  },
  {
    id: "cashScarce", kind: "strike" as const, urgency: 2,
    title: () => "Cash scarcity: ATMs are empty across the country",
    cause: () => "A new bank-note policy has left markets and banks with no cash. Okada riders, market women and POS agents are furious: 'we cannot eat transfers'. Queues stretch round banks.",
    options: [
      { id: "extend", label: "Extend the old notes for 3 months", explain: "Let both old and new notes circulate.", cost: 15, tradeoff: "Weakens the policy.", unc: "low" as const, chance: () => 0.85, win: { unrest: -5, trust: 2 }, lose: { unrest: -2 }, winText: "The queues disappeared in a week.", loseText: "" },
      { id: "hold", label: "Hold firm: 'cashless is the future'", explain: "Stand your ground.", cost: 0, tradeoff: "Real suffering for weeks.", unc: "high" as const, chance: (s: FixState) => 0.35 + 0.3 * (s.gov.trust / 100), win: { trust: 2, mods: { sme: 1 }, dur: 6, groups: { traders: -2 } }, lose: { unrest: 7, trust: -4, groups: { traders: -6 } }, winText: "Transfers took over and the shock passed.", loseText: "Riots broke out in two cities." },
    ],
    expire: { unrest: 7, trust: -4 }, expireText: () => "Riots broke out near banks.",
  },
  {
    id: "kidnapRoad", kind: "insecurity" as const, urgency: 2,
    title: (_s: FixState, st: string) => `Travellers kidnapped on the highway near ${st}`,
    cause: (_s: FixState, st: string) => `Armed men stopped a convoy on the ${st} road and took 30 passengers, including students and a pastor's family. Parents are camped at the governor's office. The kidnappers want ₦300m.`,
    options: [
      { id: "rescue", label: "Order a rescue operation", explain: "Special forces move in.", cost: 25, tradeoff: "Risk to the hostages.", unc: "high" as const, chance: (s: FixState) => 0.35 + 0.3 * (s.groups.military / 100), win: { insecurity: -3, trust: 3, groups: { military: 2 } }, lose: { insecurity: 2, trust: -3, unrest: 3 }, winText: "Hostages came home. The nation exhaled.", loseText: "The operation failed; some hostages were lost." },
      { id: "negotiate", label: "Quietly negotiate", explain: "Back-channel talks.", cost: 40, tradeoff: "Paying invites more kidnapping.", unc: "medium" as const, chance: () => 0.65, win: { insecurity: 1.5, trust: 0, corruption: 0.5 }, lose: { trust: -3, insecurity: 1.5 }, winText: "They were freed. Nobody says how.", loseText: "Talks collapsed." },
      { id: "patrol", label: "Station troops on every highway", explain: "Checkpoints everywhere.", cost: 35, tradeoff: "Soldiers at checkpoints collect bribes too.", unc: "low" as const, chance: () => 0.7, win: { insecurity: -2, mods: { security: 2 }, dur: 8 }, lose: { insecurity: -1 }, winText: "Highways are calmer for now.", loseText: "" },
    ],
    expire: { insecurity: 3, trust: -4, unrest: 3 }, expireText: () => "Parents and the press turned on the government.",
  },
  {
    id: "waec", kind: "scandal" as const, urgency: 3,
    title: () => "Exam leak: millions of students must resit",
    cause: () => "Papers leaked on WhatsApp hours before the national exams. Parents are in tears. A teachers' union says 'everyone knew'. Social media has already named a school.",
    options: [
      { id: "cancel", label: "Cancel and resit", explain: "Cancel the paper and reprint.", cost: 20, tradeoff: "Delays millions of students.", unc: "low" as const, chance: () => 0.9, win: { trust: 2, mods: { education: 1 }, dur: 6 }, lose: {}, winText: "A rebuilt system with tougher security.", loseText: "" },
      { id: "probe", label: "Arrest the chain of leakers", explain: "Go after them hard.", cost: 8, tradeoff: "Politically connected people may be named.", unc: "high" as const, chance: () => 0.45, win: { trust: 4, corruption: -1 }, lose: { trust: -2, scandal: 1 }, winText: "Twelve people were arrested, including an official.", loseText: "The investigation went cold." },
    ],
    expire: { trust: -3 }, expireText: () => "Parents lost faith in the exams.",
  },
  {
    id: "checkpoint", kind: "scandal" as const, urgency: 3,
    title: () => "Viral video: police taking bribes at checkpoints",
    cause: () => "A drivers' union posted a video of police 'collecting' from every bus at five checkpoints on one road. #EndPoliceExtortion is trending. Even policemen's wives are posting.",
    options: [
      { id: "ban", label: "Ban all roadside checkpoints", explain: "Clear every checkpoint nationwide.", cost: 10, tradeoff: "Crime may rise.", unc: "medium" as const, chance: () => 0.6, win: { trust: 4, mods: { transport: 1 }, dur: 6, insecurity: 1 }, lose: { trust: 1, insecurity: 2 }, winText: "Highways flowed freely.", loseText: "Checkpoints reappeared in a week." },
      { id: "sack", label: "Sack the officers in the video", explain: "A quick, visible response.", cost: 0, tradeoff: "Doesn't fix the system.", unc: "low" as const, chance: () => 0.9, win: { trust: 2 }, lose: {}, winText: "Five officers were dismissed.", loseText: "" },
    ],
    expire: { trust: -2 }, expireText: () => "The video became a movement.",
  },
  {
    id: "partyJollof", kind: "opportunity" as const, urgency: 5,
    title: () => "Super Eagles are in the final: the nation is on fire",
    cause: () => "The Super Eagles reached the Africa Cup of Nations final. Streets from Lagos to Maiduguri are painted green. Everyone wants you at the stadium.",
    options: [
      { id: "go", label: "Fly in and watch with the nation", explain: "Be seen with the people.", cost: 5, tradeoff: "If they lose, you are the face of it.", unc: "high" as const, chance: () => 0.5, win: { trust: 5, mods: { happiness: 3 }, dur: 3 }, lose: { trust: -2, mods: { happiness: -1 }, dur: 2 }, winText: "The Eagles won! You lifted the trophy with the team. The country partied for a week.", loseText: "They lost on penalties. The country went silent." },
      { id: "bonus", label: "Announce a ₦100m bonus per player", explain: "Reward the squad whatever happens.", cost: 3, tradeoff: "Cheap goodwill.", unc: "low" as const, chance: () => 0.9, win: { trust: 2, mods: { happiness: 1.5 }, dur: 2 }, lose: {}, winText: "Players, coaches and fans loved it.", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
];

export interface BigTrigger { tpl: string; gap: number; p: (s: FixState) => number; place: (s: FixState, pick: <T>(a: T[]) => T) => string }
const mid = <T,>(a: T[], pick: (a: T[]) => T) => pick(a);
export const BIG_TRIGGERS: BigTrigger[] = [
  { tpl: "xmasFuel", gap: 12, p: (s) => (s.month % 12 === 6 || s.month % 12 === 5 ? (s.fuel.coverage > 0.05 ? 0.4 : 0.15) : 0), place: (_s, pick) => mid(["NG-LA", "NG-KN", "NG-AB", "NG-RI"], pick) },
  { tpl: "japa", gap: 24, p: (s) => (s.month >= 8 ? 0.03 : 0), place: () => "NG-LA" },
  { tpl: "cashScarce", gap: 26, p: (s) => (s.month >= 10 ? 0.02 : 0), place: () => "NG-FC" },
  { tpl: "kidnapRoad", gap: 8, p: (s) => 0.025 + 0.0006 * s.sec.index, place: (_s, pick) => mid(["NG-KD", "NG-ZA", "NG-KT", "NG-NI", "NG-ED", "NG-OG"], pick) },
  { tpl: "waec", gap: 20, p: (s) => (s.month % 12 === 5 ? 0.15 : 0.01), place: () => "NG-FC" },
  { tpl: "checkpoint", gap: 16, p: () => 0.035, place: (_s, pick) => mid(["NG-LA", "NG-OG", "NG-ED"], pick) },
  { tpl: "partyJollof", gap: 36, p: (s) => (s.month >= 12 ? 0.02 : 0), place: () => "NG-LA" },
];
void createEvent; void nb; void sname;
