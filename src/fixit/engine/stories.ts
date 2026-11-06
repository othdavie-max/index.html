/**
 * Story arcs: rare, multi-stage national dramas. Each stage is an ordinary event; what follows depends on the choice
 * and whether it worked. Each arc can happen at most once per game. All fictional.
 */
import type { Tpl } from "./events";
import type { FixState } from "./types";
import { delivery } from "./util";

const cap = (s: FixState) => delivery(s);
const H = (s: FixState) => s.soc.health / 100;

export const STORY_TEMPLATES: Tpl[] = [
  // ---------------------------------------------------------------- outbreak
  {
    id: "outbreak1", kind: "story", urgency: 1,
    title: (_s, st) => `Mysterious fever spreading in ${st}`,
    cause: (s, st) => `Doctors in ${st} report dozens of cases of an unknown fever. The health system is rated ${Math.round(s.soc.health)}/100, so how you respond in the first weeks matters.`,
    options: [
      { id: "quarantine", label: "Quarantine the area and test everyone", explain: "Contain it early, at a cost to local trade.", cost: 40, tradeoff: "Local anger at the restrictions.", unc: "medium", chance: (s) => 0.35 + 0.6 * H(s), win: { trust: 1.5, mods: { happiness: -0.5 }, dur: 2 }, lose: { trust: -1 }, winText: "The outbreak was contained in the area.", loseText: "Cases slipped out of the quarantine zone." },
      { id: "teams", label: "Send medical teams and supplies", explain: "Treat patients and trace contacts.", cost: 70, tradeoff: "Expensive; depends on a working health system.", unc: "medium", chance: (s) => 0.45 + 0.5 * H(s), win: { trust: 2, health: 2 }, lose: { trust: -0.5 }, winText: "Medical teams brought the outbreak under control.", loseText: "There were too few staff and drugs to stop it." },
      { id: "downplay", label: "Downplay it to avoid panic", explain: "Keep markets calm and wait.", cost: 0, tradeoff: "If it spreads, you will be blamed.", unc: "high", chance: () => 0.2, win: {}, lose: { trust: -3 }, winText: "The fever burned out on its own.", loseText: "The fever spread while officials said there was nothing to fear." },
    ],
    expire: { trust: -3 }, expireText: (st) => `With no response, the fever spread beyond ${st}.`,
    next: (_s, opt, ok) => (ok && opt !== "downplay" ? { tpl: "outbreak3", delay: 4 } : ok ? null : { tpl: "outbreak2", delay: 2 }),
  },
  {
    id: "outbreak2", kind: "story", urgency: 1,
    title: () => "The fever reaches the big cities",
    cause: (s) => `Cases are rising in Lagos, Kano and Abuja. Hospitals are filling up. Government capacity is ${Math.round(s.gov.capacity)}/100.`,
    options: [
      { id: "lockdown", label: "National lockdown for six weeks", explain: "Stop the spread, freeze the economy.", cost: 100, tradeoff: "Millions of daily earners lose income.", unc: "low", chance: () => 0.85, win: { mods: { jobs: 0.8, sme: -6, manuf: -4, happiness: -2 }, dur: 3, trust: 1, groups: { traders: -10, workers: -6 } }, lose: { mods: { jobs: 0.8, happiness: -3 }, dur: 3, trust: -2 }, winText: "The lockdown broke the chain of infection, at a heavy economic cost.", loseText: "The lockdown was widely ignored and hurt the economy anyway." },
      { id: "targeted", label: "Targeted restrictions and mass testing", explain: "Close hotspots, test widely, keep markets open.", cost: 120, tradeoff: "Needs a capable government to work.", unc: "medium", chance: (s) => 0.35 + 0.5 * cap(s), win: { mods: { jobs: 0.3, happiness: -0.8 }, dur: 3, trust: 2 }, lose: { health: -5, mods: { happiness: -2, jobs: 0.4 }, dur: 4, trust: -2 }, winText: "Targeted measures slowed the virus without shutting the country.", loseText: "Testing could not keep up; the virus spread." },
      { id: "open", label: "Keep the economy open", explain: "Protect livelihoods and hope for the best.", cost: 0, tradeoff: "Many more deaths if it spreads.", unc: "high", chance: () => 0.25, win: { trust: -1 }, lose: { health: -6, mods: { happiness: -3, jobs: 0.3 }, dur: 4, trust: -4, groups: { faith: -8 } }, winText: "The wave passed faster than feared.", loseText: "Hospitals were overwhelmed and deaths soared." },
    ],
    expire: { health: -6, trust: -5 }, expireText: () => "The government froze while the virus spread through the cities.",
    next: () => ({ tpl: "outbreak3", delay: 3 }),
  },
  {
    id: "outbreak3", kind: "story", urgency: 2,
    title: () => "A vaccine for the fever is available",
    cause: () => "International makers have a vaccine. Supplies are limited and rich countries are buying first.",
    options: [
      { id: "buy", label: "Buy vaccines for everyone", explain: "Pay up front for priority doses.", cost: 150, tradeoff: "A big bill.", unc: "low", chance: () => 0.9, win: { health: 3, trust: 2, mods: { happiness: 1.5 }, dur: 4 }, lose: { health: 1 }, winText: "Millions were vaccinated within months.", loseText: "Deliveries were slow." },
      { id: "local", label: "Partner to make vaccines locally", explain: "Slower, but builds an industry.", cost: 90, tradeoff: "Takes longer; needs capable institutions.", unc: "medium", chance: (s) => 0.45 + 0.4 * cap(s), win: { health: 2, trust: 2, mods: { manuf: 3, jobs: -0.2 }, dur: null }, lose: { trust: -1 }, winText: "A local plant now makes vaccines, and exports them.", loseText: "The local plant ran into delays." },
      { id: "wait", label: "Wait for donated doses", explain: "Save money and rely on partners.", cost: 0, tradeoff: "People wait and some die waiting.", unc: "high", chance: () => 0.5, win: { health: 1 }, lose: { health: -2, trust: -2 }, winText: "Donations arrived in time.", loseText: "Donations came late and in small numbers." },
    ],
    expire: { trust: -2 }, expireText: () => "Other countries bought the doses while you hesitated.",
  },
  // ---------------------------------------------------------------- oil crash
  {
    id: "oilcrash1", kind: "story", urgency: 1,
    onCreate: (s) => { s.eco.oilPrice = Math.max(38, s.eco.oilPrice - 30); s.eco.oilTrend = -3; },
    title: () => "World oil prices crash",
    cause: (s) => `Oil has collapsed to about $${Math.round(s.eco.oilPrice)} a barrel. Oil revenue and dollar earnings will shrink by about a third.`,
    options: [
      { id: "cut", label: "Cut spending across government", explain: "Live within the new means.", cost: 0, tradeoff: "Services and salaries suffer.", unc: "low", chance: () => 0.9, win: { mods: { revenue: 60, happiness: -1.5, maint: -2 }, dur: 8, groups: { workers: -6 } }, lose: { mods: { revenue: 30 }, dur: 6 }, winText: "Spending was cut and the budget steadied.", loseText: "Cuts were resisted and only partly made." },
      { id: "borrow", label: "Borrow to cushion the shock", explain: "Keep spending steady and borrow abroad.", cost: 0, tradeoff: "More dollar debt.", unc: "low", chance: () => 0.9, win: { treasury: 1500, foreign: 1, trust: 0.5 }, lose: { treasury: 700, foreign: 0.5 }, winText: "Borrowing kept salaries paid.", loseText: "Lenders offered less than hoped." },
      { id: "float", label: "Let the naira adjust", explain: "A weaker naira makes exports cheaper.", cost: 0, tradeoff: "Imports and prices jump.", unc: "medium", chance: () => 0.8, win: { mods: { fxSupply: 0.3, inflation: 2 }, dur: 6 }, lose: { mods: { inflation: 3 }, dur: 4 }, winText: "The naira found a new level and exporters gained.", loseText: "The naira overshot and prices spiked." },
    ],
    expire: { trust: -2 }, expireText: () => "No plan was announced and markets panicked.",
    next: () => ({ tpl: "oilcrash2", delay: 4 }),
  },
  {
    id: "oilcrash2", kind: "story", urgency: 2,
    title: () => "The oil revenue hole deepens",
    cause: (s) => `Oil is at $${Math.round(s.eco.oilPrice)}. The treasury holds ${Math.round(s.fin.treasury).toLocaleString()} billion naira and the deficit is growing.`,
    options: [
      { id: "tax", label: "Emergency revenue measures", explain: "Raise taxes on luxury goods and big firms.", cost: 0, tradeoff: "Business is angry.", unc: "medium", chance: () => 0.6, win: { mods: { revenue: 90, sme: -3 }, dur: 10, groups: { business: -6 } }, lose: { trust: -1 }, winText: "New revenue started flowing.", loseText: "Collection was poor and firms protested." },
      { id: "sell", label: "Sell stakes in state companies", explain: "Raise cash fast.", cost: 0, tradeoff: "Risk of sweetheart deals for insiders.", unc: "high", chance: (s) => 0.5 + 0.3 * (1 - s.gov.corruption / 100), win: { treasury: 2000 }, lose: { treasury: 900, corruption: 2, trust: -2 }, winText: "The sales raised good money transparently.", loseText: "The sales went cheaply to connected buyers." },
      { id: "diversify", label: "Fast-track non-oil exports", explain: "Help farmers and factories sell abroad.", cost: 60, tradeoff: "Slow to pay off.", unc: "medium", chance: () => 0.55, win: { mods: { exports: 0.15, manuf: 3 }, dur: null }, lose: {}, winText: "Non-oil exports started to grow.", loseText: "Red tape slowed the export drive." },
    ],
    expire: { trust: -2, mods: { investor: -3 }, dur: 6 }, expireText: () => "Drift made investors nervous.",
  },
  // ---------------------------------------------------------------- coup rumour
  {
    id: "coup1", kind: "story", urgency: 1,
    title: () => "Intelligence warns of a plot in the barracks",
    cause: (s) => `Officers are said to be discussing "rescuing the nation". Military morale is ${s.groups.military}/100.`,
    options: [
      { id: "pay", label: "Raise military pay and equipment", explain: "Address the grievances directly.", cost: 90, tradeoff: "Costly; other groups notice.", unc: "low", chance: () => 0.85, win: { groups: { military: 15 }, mods: { forces: 3 }, dur: 12 }, lose: { groups: { military: 5 } }, winText: "Morale in the barracks improved.", loseText: "The raise was seen as too little." },
      { id: "purge", label: "Retire the suspected officers", explain: "Remove the threat before it grows.", cost: 10, tradeoff: "Could provoke the very thing you fear.", unc: "high", chance: () => 0.55, win: { groups: { military: -6 }, humanRights: -3, trust: 1 }, lose: { groups: { military: -12 }, trust: -2 }, winText: "The plotters were quietly retired.", loseText: "The retirements angered the ranks." },
      { id: "ignore", label: "Publicly dismiss it as a rumour", explain: "Show confidence.", cost: 0, tradeoff: "If it is real, you are exposed.", unc: "high", chance: (s) => 0.4 + 0.004 * s.groups.military, win: {}, lose: {}, winText: "It was only talk.", loseText: "The talk was real." },
    ],
    expire: { groups: { military: -5 } }, expireText: () => "Silence from the President unsettled the barracks.",
    next: (_s, opt, ok) => (!ok && opt !== "pay" ? { tpl: "coup2", delay: 2 } : null),
  },
  {
    id: "coup2", kind: "story", urgency: 1,
    title: () => "Soldiers mutiny at a northern barracks",
    cause: () => "A group of soldiers has seized an armoury and is demanding unpaid allowances and \"a change of direction\". The country is watching.",
    options: [
      { id: "negotiate", label: "Negotiate their grievances", explain: "Meet the demands on pay; refuse political ones.", cost: 40, tradeoff: "May encourage future mutinies.", unc: "medium", chance: () => 0.7, win: { trust: 1, groups: { military: 6 } }, lose: { trust: -3 }, winText: "The mutineers stood down after talks.", loseText: "Talks dragged on and the standoff hurt your image." },
      { id: "loyal", label: "Send loyal units to restore order", explain: "End it quickly by force.", cost: 20, tradeoff: "Bloodshed would shock the world.", unc: "high", chance: () => 0.6, win: { trust: 2 }, lose: { trust: -5, humanRights: -5, mods: { investor: -6 }, dur: 6 }, winText: "Order was restored with little violence.", loseText: "Clashes left soldiers and civilians dead." },
      { id: "address", label: "Address the nation live", explain: "Rally the public behind democracy.", cost: 0, tradeoff: "Only works if people trust you.", unc: "high", chance: (s) => 0.3 + 0.6 * s.gov.trust / 100, win: { trust: 4 }, lose: { trust: -4 }, winText: "Crowds came out for democracy and the mutiny collapsed.", loseText: "The speech fell flat; the crisis dragged on." },
    ],
    expire: { trust: -6, mods: { investor: -8 }, dur: 6 }, expireText: () => "The government's paralysis during the mutiny alarmed everyone.",
  },
  // ---------------------------------------------------------------- refugees
  {
    id: "refugees1", kind: "story", urgency: 2,
    title: (_s, st) => `Refugees pour into ${st}`,
    cause: (_s, st) => `War in a neighbouring country has sent tens of thousands of families across the border into ${st}.`,
    options: [
      { id: "camps", label: "Open camps with UN agencies", explain: "Shelter, food and registration.", cost: 50, tradeoff: "Costly; local communities may resent it.", unc: "low", chance: () => 0.8, win: { trust: 1, mods: { investor: 1 }, dur: 6, unrest: 3 }, lose: { unrest: 6 }, winText: "Camps were set up and partners praised Nigeria.", loseText: "Camps were overcrowded." },
      { id: "close", label: "Close the border", explain: "Stop the flow.", cost: 15, tradeoff: "Families stranded; a human-rights outcry.", unc: "medium", chance: () => 0.7, win: { humanRights: -6, insecurity: -3, groups: { military: 3 } }, lose: { humanRights: -6, trust: -2 }, winText: "The border was sealed.", loseText: "Families crossed anyway through the bush, and images of stranded children shocked the world." },
      { id: "settle", label: "Let them settle in local communities", explain: "No camps; trust local hospitality.", cost: 0, tradeoff: "Strain on land, water and schools.", unc: "high", chance: () => 0.5, win: { mods: { inputs: 2 }, dur: 6 }, lose: { unrest: 10 }, winText: "Many refugees found farm work and settled peacefully.", loseText: "Tensions over land and water flared." },
    ],
    expire: { unrest: 10, humanRights: -4 }, expireText: (st) => `Chaos at the border in ${st} as no help arrived.`,
    next: (_s, opt, ok) => (opt === "close" && ok ? null : { tpl: "refugees2", delay: 5 }),
  },
  {
    id: "refugees2", kind: "story", urgency: 2,
    title: (_s, st) => `Host communities in ${st} say they are overwhelmed`,
    cause: () => "Months on, schools, clinics and water points near the refugees are stretched. Local leaders demand action.",
    options: [
      { id: "invest", label: "Invest in host towns", explain: "Schools, clinics and boreholes for everyone.", cost: 60, tradeoff: "Money spent here is not spent elsewhere.", unc: "low", chance: () => 0.8, win: { unrest: -10, trust: 1.5 }, lose: { unrest: -3 }, winText: "Locals and refugees both benefited.", loseText: "Projects were slow." },
      { id: "relocate", label: "Relocate the camps", explain: "Move refugees further from towns.", cost: 30, tradeoff: "Disruptive and controversial.", unc: "medium", chance: () => 0.5, win: { unrest: -5 }, lose: { humanRights: -4, unrest: 4 }, winText: "The move eased local pressure.", loseText: "The relocation was chaotic." },
      { id: "donors", label: "Ask donors to pay", explain: "International funding conference.", cost: 0, tradeoff: "Uncertain and slow.", unc: "high", chance: () => 0.45, win: { treasury: 200 }, lose: { unrest: 6 }, winText: "Donors pledged funds.", loseText: "Pledges were small." },
    ],
    expire: { unrest: 8 }, expireText: (st) => `Anger in ${st} boiled over.`,
  },
  // ---------------------------------------------------------------- discovery
  {
    id: "discovery1", kind: "story", urgency: 3,
    title: (_s, st) => `Large lithium deposits found in ${st}`,
    cause: (_s, st) => `Geologists confirm one of Africa's largest lithium finds in ${st}. Battery makers worldwide want it. How you develop it will shape the next decade.`,
    options: [
      { id: "state", label: "Develop it through a state company", explain: "Keep control and the profits at home.", cost: 80, tradeoff: "Slow; needs a capable, honest government.", unc: "high", chance: (s) => 0.3 + 0.5 * cap(s), win: { mods: { revenue: 70, exports: 0.1 }, dur: null }, lose: { corruption: 2, trust: -1 }, winText: "The state miner started production and exports.", loseText: "The state company became a patronage machine." },
      { id: "auction", label: "Auction licences to foreign miners", explain: "Fast money and investment.", cost: 0, tradeoff: "Rigged auctions are a real risk.", unc: "medium", chance: (s) => 0.5 + 0.4 * s.gov.procurement / 100, win: { treasury: 1500, mods: { fxSupply: 0.25, investor: 3 }, dur: null }, lose: { treasury: 600, corruption: 3 }, winText: "A transparent auction raised big money.", loseText: "The licences went cheaply to insiders." },
      { id: "community", label: "Give host communities a share", explain: "A fixed share of royalties to local people.", cost: 20, tradeoff: "Less money for the federal budget.", unc: "low", chance: () => 0.8, win: { unrest: -10, trust: 2, mods: { revenue: 30 }, dur: null }, lose: { trust: 0.5 }, winText: "Communities welcomed the mines.", loseText: "Disputes over who counts as local." },
    ],
    expire: { trust: -1 }, expireText: () => "Illegal miners moved in while the government dithered.",
    next: () => ({ tpl: "discovery2", delay: 6 }),
  },
  {
    id: "discovery2", kind: "story", urgency: 3,
    title: () => "Who gets the mining money?",
    cause: () => "Lithium revenue is starting to arrive. Governors, lawmakers and economists all have opinions.",
    options: [
      { id: "fund", label: "Put it in a sovereign wealth fund", explain: "Save for future generations.", cost: 0, tradeoff: "Nothing to show voters now.", unc: "low", chance: () => 0.85, win: { reserves: 1.5, mods: { investor: 3 }, dur: null }, lose: { reserves: 0.5 }, winText: "The fund was set up with independent managers.", loseText: "The fund started small." },
      { id: "budget", label: "Spend it through the budget", explain: "More money for projects now.", cost: 0, tradeoff: "Gone if prices fall.", unc: "low", chance: () => 0.95, win: { treasury: 800 }, lose: { treasury: 400 }, winText: "The treasury got a boost.", loseText: "" },
      { id: "states", label: "Share it with the states", explain: "Governors get a bigger slice.", cost: 0, tradeoff: "Less control over how it is spent.", unc: "medium", chance: () => 0.9, win: { governors: 8, trust: 1 }, lose: { governors: 4 }, winText: "Governors across the country praised the deal.", loseText: "" },
    ],
    expire: {}, expireText: () => "The money sat idle while politicians argued.",
  },
  // ---------------------------------------------------------------- summit
  {
    id: "summit1", kind: "story", urgency: 3,
    title: () => "Nigeria asked to host an African Union summit",
    cause: (s) => `Leaders from across the continent could come to Abuja. Investor confidence is ${Math.round(s.eco.investor)}/100; a good summit could lift it.`,
    options: [
      { id: "grand", label: "Host a grand summit", explain: "Impress the world.", cost: 90, tradeoff: "Critics will call it waste.", unc: "medium", chance: () => 0.7, win: { mods: { investor: 4 }, dur: 8, trust: 1 }, lose: { trust: -2, corruption: 1 }, winText: "The summit was a triumph; deals were signed.", loseText: "Over-budget contracts became a scandal." },
      { id: "modest", label: "Host a modest, efficient summit", explain: "Do it well, not lavishly.", cost: 35, tradeoff: "Less spectacle.", unc: "low", chance: () => 0.85, win: { mods: { investor: 2 }, dur: 6, trust: 0.5 }, lose: {}, winText: "A well-run summit won quiet praise.", loseText: "" },
      { id: "decline", label: "Decline politely", explain: "Focus on problems at home.", cost: 0, tradeoff: "A missed opportunity.", unc: "low", chance: () => 1, win: {}, lose: {}, winText: "Another country hosted.", loseText: "" },
    ],
    expire: {}, expireText: () => "The invitation went to another country.",
  },
  // ---------------------------------------------------------------- governor requests
  {
    id: "govRequest", kind: "request", urgency: 2,
    title: (s, st) => `${s.governors.find((g) => g.zone === zoneOfName(st))?.name ?? "A governor"} asks for federal help`,
    cause: (s, st) => { const g = s.governors.find((x) => x.zone === zoneOfName(st)); return `The governor wants federal money for a flyover and flood drains in ${st}. Your relationship: ${Math.round(g?.relation ?? 50)}/100${g?.party === "PRA" ? " (opposition governor)" : ""}.`; },
    options: [
      { id: "fund", label: "Fund it in full", explain: "Win a friend in the zone.", cost: 60, tradeoff: "Other governors will ask too.", unc: "low", chance: () => 0.95, win: { govRel: 15, mods: { maint: 1 }, dur: 12 }, lose: { govRel: 8 }, winText: "The governor praised your leadership.", loseText: "" },
      { id: "half", label: "Fund half", explain: "Meet them halfway.", cost: 25, tradeoff: "May satisfy no one.", unc: "low", chance: () => 0.9, win: { govRel: 5 }, lose: {}, winText: "The governor accepted, grudgingly.", loseText: "" },
      { id: "decline", label: "Decline", explain: "Save the money.", cost: 0, tradeoff: "The governor may turn against you.", unc: "low", chance: () => 1, win: { govRel: -10 }, lose: {}, winText: "The governor complained publicly.", loseText: "" },
    ],
    expire: { govRel: -6 }, expireText: () => "The governor took ignoring the request as an insult.",
  },
];

// governors are stored by zone; story titles get a state name
import { STATES } from "../../game/data/states";
function zoneOfName(st: string): string { return STATES.find((x) => x.name === st)?.zone ?? ""; }

export interface ArcTrigger { tpl: string; p: (s: FixState) => number; place: (s: FixState, pick: <T>(a: T[]) => T) => string }
const BIG = ["NG-LA", "NG-KN", "NG-RI", "NG-OY", "NG-KD"];
export const STORY_TRIGGERS: ArcTrigger[] = [
  { tpl: "outbreak1", p: (s) => 0.012 + 0.002 * Math.max(0, 45 - s.soc.health), place: (_s, pick) => pick(BIG) },
  { tpl: "oilcrash1", p: (s) => (s.eco.oilPrice > 65 ? 0.009 : 0), place: () => "NG-FC" },
  { tpl: "coup1", p: (s) => (s.groups.military < 30 ? 0.05 : s.groups.military < 40 ? 0.012 : 0.003), place: () => "NG-FC" },
  { tpl: "refugees1", p: () => 0.008, place: (_s, pick) => pick(["NG-BO", "NG-AD", "NG-YO", "NG-SO"]) },
  { tpl: "discovery1", p: () => 0.01, place: (_s, pick) => pick(["NG-NA", "NG-KO", "NG-KW", "NG-EK", "NG-PL"]) },
  { tpl: "summit1", p: (s) => (s.eco.investor >= 40 ? 0.01 : 0.003), place: () => "NG-FC" },
];
