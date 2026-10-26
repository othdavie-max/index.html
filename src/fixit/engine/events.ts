/**
 * National events (protests, strikes, attacks, floods, grid failures, opportunities, temptations). They are not
 * scripted: each month the simulation computes a probability from the actual state, picks a place on the map and
 * builds a short cause from the numbers behind it. Each event offers a few responses with a cost, a trade-off and an
 * honest uncertainty; the outcome is rolled from the live situation, then explained.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Effects, EventKind, EventOption, FixState, GameEvent } from "./types";
import { addMod, clamp, clamp100, delivery, foodAffordIdx, lever, pushNews, pushReport, realWage, round, isFloodSeason, uid, nb } from "./util";

const sname = (id: string) => STATE_BY_ID[id]?.name ?? id;

interface Fx {
  mods?: Effects; dur?: number | null; unrest?: number; trust?: number; wealth?: number; evidence?: number; humanRights?: number;
  insecurity?: number; coverage?: number; treasury?: number; reserves?: number; opposition?: number; foreign?: number; corruption?: number;
}
interface Opt {
  id: string; label: string; explain: string; cost: number | ((s: FixState) => number); tradeoff: string; unc: "low" | "medium" | "high";
  chance: (s: FixState, e: GameEvent) => number; win: Fx; lose: Fx; winText: string; loseText: string;
}
interface Tpl {
  id: string; kind: EventKind; urgency: number;
  title: (s: FixState, st: string) => string;
  cause: (s: FixState, st: string) => string;
  options: Opt[];
  expire: Fx; expireText: (st: string) => string;
}

const trustP = (s: FixState) => s.gov.trust / 100;
const dlv = (s: FixState) => delivery(s);

const PROTEST_OPTS = (relief: string, reliefCost: number): Opt[] => [
  { id: "negotiate", label: "Meet the protest leaders", explain: "Hear demands and agree a package. Works better when people trust you.", cost: 20, tradeoff: "Leaders may ask for more later.", unc: "medium",
    chance: (s) => 0.35 + 0.4 * trustP(s), win: { unrest: -14, trust: 1.5, mods: { happiness: 1.2 }, dur: 3 }, lose: { unrest: 4, trust: -1 }, winText: "The talks calmed the streets.", loseText: "Talks collapsed because trust was too low." },
  { id: "relief", label: relief, explain: "Targeted help reaches the worst-hit households. Leakage risk if government is weak.", cost: reliefCost, tradeoff: "Costs money now; help ends when funding ends.", unc: "low",
    chance: (s) => 0.5 + 0.35 * dlv(s), win: { unrest: -10, mods: { happiness: 2.2, foodPrice: -1.5 }, dur: 3 }, lose: { unrest: -2, trust: -2, corruption: 1 }, winText: "The relief reached families and eased anger.", loseText: "Much of the relief was diverted before reaching families." },
  { id: "communicate", label: "Address the nation and explain the plan", explain: "A candid broadcast with a clear plan and dates.", cost: 4, tradeoff: "Words only work if people believe you.", unc: "high",
    chance: (s) => 0.2 + 0.55 * trustP(s), win: { unrest: -6, trust: 2 }, lose: { unrest: 2, trust: -1.5 }, winText: "People accepted the explanation, for now.", loseText: "The speech was received as empty promises." },
  { id: "lawful", label: "Policing within the law", explain: "Keep order, protect property, allow peaceful protest.", cost: 12, tradeoff: "Does not address the cause; harsh handling backfires.", unc: "medium",
    chance: (s) => 0.5 + 0.2 * (s.sec.humanRights / 100), win: { unrest: -7, trust: -0.5 }, lose: { unrest: 8, trust: -4, humanRights: -6 }, winText: "Order was kept and the protest wound down.", loseText: "Clashes turned violent, with deaths and anger at the response." },
];

const TEMPLATES: Tpl[] = [
  {
    id: "foodProtest", kind: "protest", urgency: 2,
    title: (_s, st) => `Food price protests in ${st}`,
    cause: (s, st) => `Food prices are rising ${round(s.eco.foodInflation)}% a year and food affordability has fallen to ${foodAffordIdx(s)} (start of term = 100). ${st} is among the worst hit.`,
    options: PROTEST_OPTS("Targeted food relief for the area", 60),
    expire: { unrest: 12, trust: -2.5, mods: { happiness: -1.5 }, dur: 3 }, expireText: (st) => `Protests in ${st} grew and spread because nobody answered.`,
  },
  {
    id: "fuelProtest", kind: "protest", urgency: 2,
    title: (_s, st) => `Fuel price protests in ${st}`,
    cause: (s, st) => `Petrol has gone from ₦${Math.round(s.fuel.history[0])} to ₦${Math.round(s.fuel.pump)} a litre in a few months, and transport fares and food are following. ${st} is leading the protests.`,
    options: [
      PROTEST_OPTS("", 0)[0],
      { id: "allowance", label: "Emergency transport allowance for commuters", explain: "Cash to commuters and traders while prices settle.", cost: 70, tradeoff: "Costly; the price stays high.", unc: "low", chance: (s) => 0.55 + 0.35 * dlv(s), win: { unrest: -10, mods: { happiness: 3 }, dur: 3 }, lose: { unrest: -3, trust: -2 }, winText: "The allowance cushioned the shock.", loseText: "The allowance reached too few people." },
      { id: "partial", label: "Soften the price: restore some subsidy", explain: "Bring pump prices back partly. This costs the treasury every month.", cost: 10, tradeoff: "Undoes some of your savings and worsens the budget.", unc: "low", chance: () => 0.95, win: { unrest: -16, coverage: 0.12, trust: 1 }, lose: { unrest: -16, coverage: 0.12 }, winText: "Prices eased and the protest ended; the bill returned to the budget.", loseText: "" },
      PROTEST_OPTS("", 0)[2],
    ],
    expire: { unrest: 14, trust: -3, mods: { happiness: -2 }, dur: 3 }, expireText: (st) => `Fuel protests in ${st} turned into a general strike over transport costs.`,
  },
  {
    id: "labourStrike", kind: "strike", urgency: 2,
    title: (_s, st) => `Workers' strike in ${st}`,
    cause: (s) => `Real pay has fallen to ${round(realWage(s))} (start of term = 100) and ${s.fin.arrears > 0 ? "contractors and workers are owed arrears" : "prices keep outrunning salaries"}.`,
    options: [
      { id: "deal", label: "Pay deal with the unions", explain: "Settle arrears and agree a modest raise.", cost: 90, tradeoff: "Raises the pay bill permanently; other groups will ask.", unc: "low", chance: (s) => 0.8 + 0.1 * trustP(s), win: { unrest: -16, mods: { wage: 3, happiness: 1.5, inflation: 0.4 }, dur: 8, trust: 1.5 }, lose: { unrest: -6 }, winText: "Unions accepted and returned to work.", loseText: "A partial deal calmed things." },
      PROTEST_OPTS("", 0)[0],
      { id: "court", label: "Go to court to end the strike", explain: "Use the labour court to order workers back.", cost: 5, tradeoff: "Cheap, but poisons relations and trust.", unc: "high", chance: () => 0.4, win: { unrest: -8, trust: -2 }, lose: { unrest: 8, trust: -3 }, winText: "The court order held.", loseText: "Workers ignored the order and the strike spread." },
      PROTEST_OPTS("", 0)[2],
    ],
    expire: { unrest: 10, mods: { happiness: -1.2, manuf: -2 }, dur: 3, trust: -1.5 }, expireText: (st) => `The strike in ${st} dragged on, hitting services and factories.`,
  },
  {
    id: "youthProtest", kind: "protest", urgency: 3,
    title: (_s, st) => `Youth protests over jobs in ${st}`,
    cause: (s, st) => `Youth unemployment is ${round(s.jobs.youth)}%. Graduates in ${st} have taken to the streets demanding work and a say.`,
    options: [
      PROTEST_OPTS("", 0)[0],
      { id: "jobs", label: "Announce a youth jobs blitz", explain: "Fast-track hiring for public works, tech and farm placements.", cost: 70, tradeoff: "Temporary jobs; disappointment when they end.", unc: "medium", chance: (s) => 0.5 + 0.35 * dlv(s), win: { unrest: -12, mods: { jobs: -0.5, happiness: 1.5 }, dur: 6, trust: 1 }, lose: { unrest: -2, trust: -1.5 }, winText: "Thousands of young people started work.", loseText: "The programme was slow to start and anger remained." },
      PROTEST_OPTS("", 0)[2],
      PROTEST_OPTS("", 0)[3],
    ],
    expire: { unrest: 11, trust: -2, mods: { happiness: -1.2 }, dur: 3 }, expireText: (st) => `Youth anger in ${st} hardened into a movement.`,
  },
  {
    id: "banditry", kind: "insecurity", urgency: 2,
    title: (_s, st) => `Armed attacks in ${st}`,
    cause: (s, st) => `Security index ${round(s.sec.index)} (higher is worse). Armed groups attacked villages in ${st}, killing and displacing residents; troops are stretched (capacity ${round(s.sec.forces + lever(s, "forces"))}).`,
    options: [
      { id: "surge", label: "Rapid deployment to the area", explain: "Move units and drones for a few months.", cost: 70, tradeoff: "Does not fix root causes; abuses are possible without oversight.", unc: "high", chance: (s) => 0.4 + 0.004 * (s.sec.forces + lever(s, "forces")) + 0.1 * dlv(s), win: { insecurity: -14, mods: { security: 3 }, dur: 4, unrest: -6 }, lose: { insecurity: 2, trust: -2, humanRights: -4 }, winText: "Attackers were pushed back and some leaders captured.", loseText: "The attackers moved to nearby villages; some civilians were mistreated." },
      { id: "police", label: "Community policing and early warning", explain: "Train local police and tip-off networks.", cost: 40, tradeoff: "Slow to work.", unc: "medium", chance: (s) => 0.45 + 0.3 * dlv(s), win: { insecurity: -9, mods: { security: 2, trust: 0.5 }, dur: 8, humanRights: 2 }, lose: { insecurity: -2 }, winText: "Local tip-offs prevented further attacks.", loseText: "The network was too new to stop attacks." },
      { id: "talks", label: "Negotiate and offer amnesty to fighters", explain: "Dialogue through elders; controversial.", cost: 15, tradeoff: "Can be seen as rewarding violence.", unc: "high", chance: () => 0.4, win: { insecurity: -12, trust: -1, opposition: 2 }, lose: { insecurity: 4, trust: -2.5 }, winText: "Some fighters laid down arms.", loseText: "The talks were exploited and attacks resumed." },
      { id: "relief", label: "Relief for displaced families only", explain: "Camps, food and schooling for those who fled.", cost: 35, tradeoff: "Eases suffering but does not stop the attackers.", unc: "low", chance: (s) => 0.7 + 0.2 * dlv(s), win: { unrest: -5, trust: 1.5 }, lose: { trust: -0.5 }, winText: "Families were fed and sheltered.", loseText: "Aid was thin." },
    ],
    expire: { insecurity: 8, trust: -2, mods: { security: -3, happiness: -1 }, dur: 3 }, expireText: (st) => `Attacks in ${st} continued unchecked and more people fled.`,
  },
  {
    id: "pipelineAttack", kind: "oilattack", urgency: 2,
    title: (_s, st) => `Pipeline attacks in ${st}`,
    cause: (s, st) => `Crude theft has reached ${round(s.oil.theft)}% of output. Saboteurs hit pipelines in ${st}, cutting exports.`,
    options: [
      { id: "guard", label: "Military protection of the lines", explain: "Soldiers and patrol boats on the pipeline.", cost: 60, tradeoff: "Expensive; communities may resent it.", unc: "medium", chance: (s) => 0.55 + 0.25 * dlv(s), win: { mods: { oilTheft: -5, crude: 40 }, dur: 6, insecurity: -4 }, lose: { trust: -1 }, winText: "Theft dropped and flows recovered.", loseText: "Saboteurs moved to unguarded sections." },
      { id: "contracts", label: "Local pipeline-watch contracts", explain: "Pay communities to protect the line.", cost: 35, tradeoff: "Contracts can be captured by connected people.", unc: "high", chance: (s) => 0.35 + 0.4 * (1 - s.gov.corruption / 100), win: { mods: { oilTheft: -7 }, dur: 10, unrest: -5 }, lose: { corruption: 1, trust: -1.5 }, winText: "Communities guarded the lines and attacks fell.", loseText: "Contracts went to cronies and attacks continued." },
      { id: "repair", label: "Repair quickly and do nothing else", explain: "Patch the damage and resume pumping.", cost: 20, tradeoff: "Leaves theft and sabotage unchanged.", unc: "low", chance: () => 0.9, win: { mods: { crude: 20 }, dur: 2 }, lose: {}, winText: "Exports resumed.", loseText: "" },
    ],
    expire: { mods: { crude: -80 }, dur: 3, trust: -1 }, expireText: (st) => `The ${st} pipeline stayed shut for weeks and crude output fell.`,
  },
  {
    id: "flood", kind: "flood", urgency: 2,
    title: (_s, st) => `Floods in ${st}`,
    cause: (s, st) => `Seasonal rivers have burst their banks in ${st} (flood exposure ${Math.round(s.regions[Object.keys(s.regions).find((k) => sname(k) === st) ?? ""]?.flood ?? 0)} out of 100). Farms and roads are under water.`,
    options: [
      { id: "relief", label: "Emergency relief and evacuation", explain: "Boats, camps, food and medicine.", cost: 80, tradeoff: "A big one-off bill.", unc: "low", chance: (s) => 0.7 + 0.2 * dlv(s), win: { unrest: -6, trust: 2, mods: { foodSupply: 2 }, dur: 3 }, lose: { trust: -1 }, winText: "People were rescued and sheltered.", loseText: "Relief reached some areas too late." },
      { id: "drains", label: "Repair embankments and drains", explain: "Fix the defences and clear drains before more rain.", cost: 55, tradeoff: "Less visible than relief.", unc: "medium", chance: (s) => 0.5 + 0.3 * dlv(s), win: { mods: { roads: 2, maint: 2, postHarvest: 1 }, dur: 10, trust: 1 }, lose: { trust: -0.5 }, winText: "Defences were repaired and later rains caused less damage.", loseText: "Work was too slow to matter this season." },
      { id: "appeal", label: "Appeal for international help", explain: "Ask partners and agencies for funds.", cost: 3, tradeoff: "Uncertain and slow.", unc: "high", chance: (s) => 0.3 + 0.3 * s.eco.investor / 100, win: { treasury: 120, trust: 1 }, lose: { trust: -0.5 }, winText: "Partners pledged support.", loseText: "The appeal got little response." },
    ],
    expire: { mods: { foodSupply: -4, roads: -3 }, dur: 4, trust: -2, unrest: 6 }, expireText: (st) => `Without help, flood damage in ${st} destroyed crops and cut roads.`,
  },
  {
    id: "foodCrisis", kind: "foodcrisis", urgency: 2,
    title: (_s, st) => `Food shortages in ${st}`,
    cause: (s, st) => `Markets in ${st} are short of staples. Supply is ${round(s.agri.supply)} against demand of ${round(s.agri.demand)}; ${round(s.agri.loss)}% of harvested food is lost to poor storage and roads.`,
    options: [
      { id: "reserves", label: "Release grain reserves", explain: "Sell stored grain at lower prices.", cost: 80, tradeoff: "Uses stored grain you may need later.", unc: "low", chance: () => 0.85, win: { mods: { foodPrice: -5, foodSupply: 3 }, dur: 4, unrest: -8 }, lose: {}, winText: "Grain reached markets and prices eased.", loseText: "" },
      { id: "imports", label: "Emergency food imports", explain: "Buy staples abroad.", cost: 40, tradeoff: "Uses dollars and hurts farmers.", unc: "medium", chance: (s) => 0.55 + 0.25 * (s.eco.reserves > 20 ? 1 : 0), win: { mods: { foodPrice: -6, foodSupply: 5, fxDemand: 0.3 }, dur: 4, unrest: -8 }, lose: { mods: { fxDemand: 0.3 }, dur: 3, unrest: -1 }, winText: "Imports arrived and eased shortages.", loseText: "Shipments were late and customs delays hurt." },
      { id: "cash", label: "Cash support to hungry households", explain: "Direct transfers to registered poor households.", cost: 65, tradeoff: "Does not add food supply; may push prices up locally.", unc: "medium", chance: (s) => 0.5 + 0.35 * dlv(s), win: { mods: { happiness: 2.5, welfare: 3 }, dur: 3, unrest: -6 }, lose: { trust: -2 }, winText: "Households received cash.", loseText: "Payments were delayed and some went astray." },
    ],
    expire: { unrest: 14, trust: -3, mods: { happiness: -2.5 }, dur: 4 }, expireText: (st) => `Hunger in ${st} deepened and food riots broke out.`,
  },
  {
    id: "gridCollapse", kind: "grid", urgency: 1,
    title: () => "National grid collapse",
    cause: (s) => `The grid collapsed. Only ${Math.round(s.power.available)} MW is being delivered against demand of ${Math.round(s.power.demand)} MW. The grid is ${round(s.power.grid + lever(s, "grid"))} out of 100 and gas supply is weak.`,
    options: [
      { id: "repair", label: "Emergency repairs", explain: "Overtime crews restore the lines.", cost: 55, tradeoff: "A short-term fix.", unc: "medium", chance: (s) => 0.6 + 0.3 * dlv(s), win: { mods: { power: 420, grid: 3 }, dur: 5, trust: 1 }, lose: { trust: -1.5 }, winText: "Power returned within days.", loseText: "Repairs were slow; many places stayed dark." },
      { id: "gas", label: "Pay gas suppliers what is owed", explain: "Clear arrears so power plants get gas.", cost: 110, tradeoff: "A big bill that mostly fixes a symptom.", unc: "low", chance: (s) => 0.7 + 0.15 * dlv(s), win: { mods: { power: 350, gas: 6 }, dur: 8, investor: 0 } as Fx, lose: {}, winText: "Gas flowed and plants restarted.", loseText: "" },
      { id: "statement", label: "Apologise and set out a repair plan", explain: "Be honest and give dates.", cost: 3, tradeoff: "Does not bring power back.", unc: "high", chance: (s) => 0.2 + 0.4 * trustP(s), win: { trust: 1.5 }, lose: { trust: -1.5 }, winText: "The candour was appreciated.", loseText: "Public patience ran out." },
    ],
    expire: { mods: { power: -380 }, dur: 3, trust: -1.5 }, expireText: () => "The blackout dragged on for days, hitting factories and hospitals.",
  },
  {
    id: "investorOffer", kind: "opportunity", urgency: 3,
    title: (_s, st) => `A manufacturer wants to build in ${st}`,
    cause: (s, st) => `A foreign firm will invest about $1.2 billion in ${st} if you guarantee reliable power and a tax holiday. Investor confidence stands at ${round(s.eco.investor)}.`,
    options: [
      { id: "accept", label: "Accept the terms", explain: "Guarantee power and give a tax holiday.", cost: 80, tradeoff: "Less revenue now; you must deliver the power.", unc: "medium", chance: (s) => 0.4 + 0.3 * (s.power.available / s.power.demand) * 2 + 0.2 * dlv(s), win: { mods: { manuf: 6, jobs: -0.4, exports: 0.15, fxSupply: 0.2, revenue: -20 }, dur: null, trust: 1 }, lose: { mods: { manuf: 1.5 }, trust: -1 }, winText: "A factory opened and hired thousands.", loseText: "Power failures led the firm to scale down." },
      { id: "counter", label: "Negotiate better terms", explain: "Ask for local hiring and a smaller tax break.", cost: 10, tradeoff: "The firm may walk away.", unc: "high", chance: (s) => 0.4 + 0.3 * trustP(s), win: { mods: { manuf: 5, jobs: -0.45, exports: 0.15, fxSupply: 0.2 }, dur: null, trust: 1 }, lose: {}, winText: "A better deal was agreed.", loseText: "The firm walked away." },
      { id: "decline", label: "Decline", explain: "Keep the incentive for other uses.", cost: 0, tradeoff: "Jobs and dollars forgone.", unc: "low", chance: () => 1, win: {}, lose: {}, winText: "The offer lapsed.", loseText: "" },
    ],
    expire: {}, expireText: () => "The investor walked away while you were deciding.",
  },
  {
    id: "loanOffer", kind: "opportunity", urgency: 3,
    title: () => "Development lenders offer a cheap loan",
    cause: (s) => `A development bank offers $2 billion at about 3% for infrastructure. You already owe $${round(s.fin.foreignDebt)}bn abroad, repaid in dollars, so a weaker naira makes it costlier.`,
    options: [
      { id: "accept", label: "Accept the loan", explain: "Cash now; repay in dollars later.", cost: 0, tradeoff: "More foreign debt; naira weakness raises your repayments.", unc: "medium", chance: () => 0.95, win: { foreign: 2, reserves: 1.4, treasury: 1500, trust: 0 }, lose: { foreign: 2, reserves: 1.4, treasury: 1500 }, winText: "The loan was drawn.", loseText: "" },
      { id: "smaller", label: "Take half", explain: "Borrow less to limit currency risk.", cost: 0, tradeoff: "Less to spend.", unc: "low", chance: () => 0.95, win: { foreign: 1, reserves: 0.7, treasury: 750 }, lose: { foreign: 1, reserves: 0.7, treasury: 750 }, winText: "Half the loan was drawn.", loseText: "" },
      { id: "decline", label: "Decline", explain: "Avoid adding debt.", cost: 0, tradeoff: "A cheap loan forgone.", unc: "low", chance: () => 1, win: {}, lose: {}, winText: "You declined.", loseText: "" },
    ],
    expire: {}, expireText: () => "The offer lapsed.",
  },
  {
    id: "oilWindfall", kind: "opportunity", urgency: 3,
    title: () => "Oil price windfall",
    cause: (s) => `Crude has jumped to $${round(s.eco.oilPrice)} a barrel. Extra revenue is arriving; what you do with it matters.`,
    options: [
      { id: "save", label: "Save in reserves", explain: "Build a cushion for the next downturn.", cost: 0, tradeoff: "Nothing to spend on voters now.", unc: "low", chance: () => 1, win: { reserves: 3, trust: 0.5, mods: { investor: 3 }, dur: 8 }, lose: {}, winText: "Reserves rose and markets approved.", loseText: "" },
      { id: "spend", label: "Spend on programmes", explain: "Boost the treasury for projects and relief.", cost: 0, tradeoff: "No cushion if prices fall.", unc: "low", chance: () => 1, win: { treasury: 900 }, lose: {}, winText: "The treasury gained extra cash.", loseText: "" },
      { id: "debt", label: "Repay expensive debt", explain: "Cut the interest bill.", cost: 0, tradeoff: "Less cash today.", unc: "low", chance: () => 1, win: { treasury: -300, mods: { revenue: 25 }, dur: 12 }, lose: {}, winText: "Interest costs fell.", loseText: "" },
    ],
    expire: {}, expireText: () => "The windfall was absorbed into routine spending.",
  },
  {
    id: "kickback", kind: "scandal", urgency: 3,
    title: () => "A contractor offers you a private payment",
    cause: () => "A well-connected contractor wants an upcoming tender fixed in his favour and offers you ₦250 million, quietly. Nobody else needs to know.",
    options: [
      { id: "accept", label: "Take the money", explain: "Personal gain, hidden from the public.", cost: 0, tradeoff: "Leaves evidence; delivery suffers; scandal risk.", unc: "high", chance: () => 1, win: { wealth: 250, evidence: 14, corruption: 2.5, mods: { procurement: -6, corruption: 3 }, dur: 12 }, lose: {}, winText: "The money was paid through a front company; the tender was rigged.", loseText: "" },
      { id: "refuse", label: "Refuse and move on", explain: "Say no quietly.", cost: 0, tradeoff: "Nothing gained or lost except your conscience.", unc: "low", chance: () => 1, win: { trust: 0.3 }, lose: {}, winText: "You refused. The tender went ahead fairly.", loseText: "" },
      { id: "report", label: "Refuse and expose the approach", explain: "Pass it to the anti-corruption agency.", cost: 5, tradeoff: "Contractor allies turn against you.", unc: "medium", chance: (s) => 0.4 + 0.4 * (s.gov.transparency / 100), win: { trust: 3, opposition: -1, mods: { corruption: -1.5, transparency: 3 }, dur: 8 }, lose: { trust: 0.5, opposition: 3 }, winText: "The contractor was prosecuted and agencies took note.", loseText: "Powerful friends of the contractor pushed back." },
    ],
    expire: {}, expireText: () => "The contractor took his offer to someone else.",
  },
  {
    id: "investigation", kind: "scandal", urgency: 2,
    title: () => "Journalists and auditors are asking questions",
    cause: (s) => `Reports link contract awards to your circle. There is documentary evidence on file (exposure ${round(s.me.evidence)} out of 100).`,
    options: [
      { id: "cooperate", label: "Open the files and cooperate", explain: "Hand over documents; cancel tainted contracts.", cost: 20, tradeoff: "Costs you ill-gotten wealth and invites penalties.", unc: "low", chance: () => 0.9, win: { wealth: -150, evidence: -25, trust: 3, mods: { transparency: 4 }, dur: 10 }, lose: { wealth: -150, evidence: -10, trust: 1 }, winText: "Cooperation limited the damage.", loseText: "" },
      { id: "obstruct", label: "Obstruct and discredit the accusers", explain: "Use allies and pressure.", cost: 15, tradeoff: "If it fails, the scandal is far worse.", unc: "high", chance: (s) => 0.2 + 0.3 * (1 - s.gov.transparency / 100), win: { evidence: -8, trust: -1 }, lose: { evidence: 18, trust: -9, opposition: 5, wealth: -250 }, winText: "The story faded.", loseText: "The cover-up was exposed; the public was furious." },
      { id: "scapegoat", label: "Sack the officials involved", explain: "Show decisive action.", cost: 10, tradeoff: "Weakens delivery capacity for a while.", unc: "medium", chance: () => 0.55, win: { evidence: -12, trust: 0.5, mods: { capacity: -3 }, dur: 6 }, lose: { evidence: 6, trust: -4 }, winText: "The reshuffle satisfied critics for now.", loseText: "Critics said you were protecting the real culprits." },
    ],
    expire: { evidence: 10, trust: -6, opposition: 4 }, expireText: () => "Silence was read as guilt and the allegations grew.",
  },
];
export const TEMPLATE_BY_ID: Record<string, Tpl> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

export function eventOptions(t: Tpl, s: FixState): EventOption[] {
  return t.options.map((o) => ({
    id: o.id, label: o.label, explain: o.explain, cost: typeof o.cost === "function" ? o.cost(s) : o.cost, tradeoff: o.tradeoff, uncertainty: o.unc,
  }));
}

function openOf(s: FixState, tpl: string, stateId?: string) { return s.events.some((e) => e.status === "open" && e.tpl === tpl && (!stateId || e.stateId === stateId)); }
function cooling(s: FixState, tpl: string, stateId: string, months = 4) { const last = s.flags[`cd:${tpl}:${stateId}`]; return typeof last === "number" && s.month - last < months; }

/** pick the place where the underlying stress is worst, with a little randomness */
function pickPlace(s: FixState, rng: Rng, key: "food" | "insecurity" | "jobless" | "power" | "flood" | "unrest", tpl: string): string | null {
  const ids = Object.keys(s.regions).filter((id) => !openOf(s, tpl, id) && !cooling(s, tpl, id));
  if (!ids.length) return null;
  return rng.weighted(ids, (id) => Math.max(1, s.regions[id][key] ** 2.2 / 40));
}

interface Cand { tpl: string; p: number; place: () => string | null }
function candidates(s: FixState, rng: Rng): Cand[] {
  const c: Cand[] = [];
  const fu = s.fuel;
  const rise = fu.history.length >= 4 ? fu.pump / fu.history[fu.history.length - 4] - 1 : 0;
  const aff = foodAffordIdx(s), rw = realWage(s);
  c.push({ tpl: "foodProtest", p: clamp((s.eco.foodInflation - 30) / 90 + Math.max(0, 100 - aff) / 250, 0, 0.4) * (1.1 - 0.4 * trustP(s)), place: () => pickPlace(s, rng, "unrest", "foodProtest") });
  c.push({ tpl: "fuelProtest", p: rise > 0.1 ? clamp(rise / 0.5, 0, 0.7) * (1.3 - trustP(s)) * (fu.transfers ? 0.55 : 1) : 0, place: () => pickPlace(s, rng, "unrest", "fuelProtest") });
  c.push({ tpl: "labourStrike", p: (rw < 92 ? (92 - rw) / 120 : 0) + (s.fin.arrears > 200 ? 0.06 : 0), place: () => pickPlace(s, rng, "unrest", "labourStrike") });
  c.push({ tpl: "youthProtest", p: s.jobs.youth > 38 ? (s.jobs.youth - 38) / 90 : 0, place: () => pickPlace(s, rng, "jobless", "youthProtest") });
  c.push({ tpl: "banditry", p: s.sec.index > 50 ? (s.sec.index - 50) / 100 : 0, place: () => pickPlace(s, rng, "insecurity", "banditry") });
  c.push({ tpl: "pipelineAttack", p: s.oil.theft > 16 ? (s.oil.theft - 15) / 90 : 0, place: () => { const ids = ["NG-RI", "NG-BY", "NG-DE", "NG-AK"].filter((id) => !openOf(s, "pipelineAttack", id) && !cooling(s, "pipelineAttack", id)); return ids.length ? rng.pick(ids) : null; } });
  const wetMonth = isFloodSeason(s.month);
  c.push({ tpl: "flood", p: wetMonth ? clamp(0.12 + 0.25 * Math.max(0, s.agri.weather) + 0.002 * (60 - (s.infra.maint + lever(s, "maint"))), 0.03, 0.4) : 0, place: () => pickPlace(s, rng, "flood", "flood") });
  c.push({ tpl: "foodCrisis", p: s.eco.foodInflation > 40 || s.agri.demand - s.agri.supply > 8 ? clamp((s.eco.foodInflation - 36) / 90 + (s.agri.demand - s.agri.supply) / 80, 0, 0.35) : 0, place: () => pickPlace(s, rng, "food", "foodCrisis") });
  const gridEff = clamp100(s.power.grid + lever(s, "grid"));
  c.push({ tpl: "gridCollapse", p: clamp(0.02 + (45 - gridEff) / 400, 0.008, 0.12), place: () => (openOf(s, "gridCollapse") || cooling(s, "gridCollapse", "NG-FC", 6) ? null : "NG-FC") });
  c.push({ tpl: "investorOffer", p: s.eco.investor >= 44 ? 0.05 : 0.01, place: () => { const ids = ["NG-LA", "NG-OG", "NG-KN", "NG-KD", "NG-RI", "NG-FC"].filter((id) => !cooling(s, "investorOffer", id, 10)); return openOf(s, "investorOffer") || !ids.length ? null : rng.pick(ids); } });
  c.push({ tpl: "loanOffer", p: s.fin.creditRating > 30 ? 0.03 : 0, place: () => (openOf(s, "loanOffer") || cooling(s, "loanOffer", "NG-FC", 12) ? null : "NG-FC") });
  c.push({ tpl: "oilWindfall", p: s.eco.oilPrice > 95 ? 0.4 : 0, place: () => (openOf(s, "oilWindfall") || cooling(s, "oilWindfall", "NG-FC", 8) ? null : "NG-FC") });
  c.push({ tpl: "kickback", p: s.month >= 3 ? 0.05 : 0, place: () => (openOf(s, "kickback") || cooling(s, "kickback", "NG-FC", 5) ? null : "NG-FC") });
  const ev = s.me.evidence;
  c.push({ tpl: "investigation", p: ev > 12 ? clamp((ev / 100) * (0.1 + 0.55 * (s.gov.transparency + lever(s, "transparency")) / 100), 0, 0.3) : 0, place: () => (openOf(s, "investigation") || cooling(s, "investigation", "NG-FC", 5) ? null : "NG-FC") });
  return c;
}

export function generateEvents(s: FixState, rng: Rng) {
  const open = s.events.filter((e) => e.status === "open").length;
  if (open >= 6) return;
  let made = 0;
  for (const cand of candidates(s, rng)) {
    if (made >= 2 || open + made >= 6) break;
    if (cand.p <= 0) continue;
    // each candidate gets its own deterministic draw
    const draw = subRng(s.meta.seed, "ev", cand.tpl, s.month).next();
    if (draw >= cand.p) continue;
    const place = cand.place();
    if (!place) continue;
    createEvent(s, cand.tpl, place);
    made++;
  }
}

export function createEvent(s: FixState, tpl: string, stateId: string): GameEvent | null {
  const t = TEMPLATE_BY_ID[tpl];
  if (!t) return null;
  const id = `ev:${tpl}:${stateId}:${s.month}`;
  if (s.events.some((e) => e.id === id)) return null;
  const st = sname(stateId);
  const sev = s.regions[stateId]?.unrest ?? 20;
  const scale = clamp(Math.round(1 + sev / 25 + (t.kind === "insecurity" ? s.sec.index / 60 : 0)), 1, 5) as 1 | 2 | 3 | 4 | 5;
  const ev: GameEvent = {
    id, tpl, kind: t.kind, stateId, title: t.title(s, st), cause: t.cause(s, st), scale, born: s.month, deadline: s.month + t.urgency + 1,
    status: "open", options: eventOptions(t, s),
  };
  s.events.push(ev);
  s.flags[`cd:${tpl}:${stateId}`] = s.month;
  if (s.events.length > 120) s.events = s.events.filter((e, i) => e.status === "open" || i > s.events.length - 80);
  pushNews(s, { source: `event:${id}`, headline: ev.title, body: ev.cause, tone: t.kind === "opportunity" ? "good" : "bad", stateId });
  return ev;
}

function applyFx(s: FixState, e: GameEvent, fx: Fx, tag: string) {
  const r = s.regions[e.stateId];
  if (fx.mods) addMod(s, `event:${e.id}:${tag}`, e.title, fx.mods, { duration: fx.dur === undefined ? 3 : fx.dur, ramp: 1 });
  if (fx.unrest && r) r.unrest = clamp100(r.unrest + fx.unrest);
  if (fx.insecurity && r) r.insecurity = clamp100(r.insecurity + fx.insecurity);
  if (fx.insecurity) s.sec.banditry = clamp100(s.sec.banditry + fx.insecurity * 0.1);
  if (fx.trust) s.gov.trust = clamp100(s.gov.trust + fx.trust);
  if (fx.wealth) s.me.wealth = Math.max(0, s.me.wealth + fx.wealth);
  if (fx.evidence) s.me.evidence = clamp100(s.me.evidence + fx.evidence);
  if (fx.humanRights) s.sec.humanRights = clamp100(s.sec.humanRights + fx.humanRights);
  if (fx.coverage) s.fuel.coverage = clamp(s.fuel.coverage + fx.coverage, 0, 1);
  if (fx.treasury) s.fin.treasury += fx.treasury;
  if (fx.reserves) s.eco.reserves += fx.reserves;
  if (fx.foreign) s.fin.foreignDebt += fx.foreign;
  if (fx.opposition) s.gov.opposition = clamp100(s.gov.opposition + fx.opposition);
  if (fx.corruption) s.gov.corruption = clamp100(s.gov.corruption + fx.corruption);
}

export interface EventResult { ok: boolean; text: string; chance: number }

/** Resolve an open event with a chosen response. Cost is paid from the treasury; the outcome is rolled from the live situation. */
export function resolveEvent(s: FixState, eventId: string, optionId: string): EventResult | { error: string } {
  const e = s.events.find((x) => x.id === eventId);
  if (!e) return { error: "That event no longer exists." };
  if (e.status !== "open") return { error: "That situation has already been dealt with." };
  const t = TEMPLATE_BY_ID[e.tpl];
  const o = t.options.find((x) => x.id === optionId);
  if (!o) return { error: "Unknown response." };
  const cost = typeof o.cost === "function" ? o.cost(s) : o.cost;
  const mult = 0.6 + 0.4 * (s.eco.priceLevel / 100);
  const pay = cost * mult;
  if (pay > s.fin.treasury) return { error: `The treasury has ${nb(s.fin.treasury)}; this response needs ${nb(pay)}.` };
  s.fin.treasury -= pay;
  const chance = clamp(o.chance(s, e), 0.05, 0.97);
  const roll = subRng(s.meta.seed, "resolve", e.id, o.id).next();
  const ok = roll < chance;
  const fx = ok ? o.win : o.lose;
  applyFx(s, e, fx, o.id);
  e.status = "resolved";
  e.chosen = o.id;
  e.outcome = ok ? o.winText : o.loseText || o.winText;
  s.me.acts = s.me.acts.slice(-30);
  if (e.tpl === "kickback" && o.id === "accept") s.me.acts.push("kickback");
  if (e.tpl === "kickback" && o.id === "report") s.me.acts.push("reported");
  if (e.tpl === "investigation" && o.id === "obstruct") s.me.acts.push("obstructed");
  pushReport(s, {
    title: `${e.title}: ${o.label}`, tone: ok ? "good" : "bad",
    lines: [
      `You chose: ${o.label}${pay > 0 ? ` (cost ${nb(pay)})` : ""}.`,
      `${ok ? "It worked" : "It did not work as hoped"}: ${ok ? o.winText : o.loseText || o.winText}`,
      `Chance of success was about ${Math.round(chance * 100)}%, based on trust (${Math.round(s.gov.trust)}), government capacity and the situation on the ground.`,
    ],
  });
  pushNews(s, { source: `event-res:${e.id}`, headline: ok ? `${e.title}: ${o.winText}` : `${e.title}: response falls short`, body: ok ? o.winText : o.loseText || o.winText, tone: ok ? "good" : "bad", stateId: e.stateId });
  return { ok, text: e.outcome, chance };
}

/** Unanswered situations past their deadline escalate; open ones keep stressing the area. */
export function resolveExpired(s: FixState) {
  for (const e of s.events) {
    if (e.status !== "open") continue;
    const t = TEMPLATE_BY_ID[e.tpl];
    const r = s.regions[e.stateId];
    if (r && (t.kind === "protest" || t.kind === "strike")) r.unrest = clamp100(r.unrest + 1.5);
    if (s.month >= e.deadline) {
      e.status = "expired";
      e.outcome = t.expireText(sname(e.stateId));
      applyFx(s, e, t.expire, "expire");
      pushNews(s, { source: `event-exp:${e.id}`, headline: `${e.title}: unanswered`, body: e.outcome, tone: t.kind === "opportunity" ? "neutral" : "bad", stateId: e.stateId });
    }
  }
}

export const openEvents = (s: FixState) => s.events.filter((e) => e.status === "open").sort((a, b) => a.deadline - b.deadline || b.scale - a.scale);
export { uid };
