import { STATE_BY_ID } from "./data";
import { monthIndex, transact } from "./ledger";
import { businessMultiplier } from "./news";
import type { Business, EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, rand, uid } from "./util";
import { I, bump, stateOf } from "./helpers";

export interface BizKind {
  id: string;
  label: string;
  blurb: string;
  startCost: number;
  baseRevenue: number;
  stockPct: number;
  rent: number;
  wage: number;
  minOpp: number;
  seasonal?: boolean;
}

export const BIZ_KINDS: BizKind[] = [
  { id: "provisions", get label() { return T("Provision store", "Provision store"); }, get blurb() { return T("Daily necessities. Steady and modest.", "Daily daily things wey people need. E steady but e no big."); }, startCost: 1_200_000, baseRevenue: 480_000, stockPct: 0.62, rent: 240_000, wage: 55_000, minOpp: 1 },
  { id: "salon", get label() { return T("Hair & beauty salon", "Hair & beauty salon"); }, get blurb() { return T("Weekend rush, loyal customers.", "Weekend dey full, and customers dey stick to you."); }, startCost: 1_800_000, baseRevenue: 620_000, stockPct: 0.26, rent: 420_000, wage: 60_000, minOpp: 2 },
  { id: "fashion", get label() { return T("Fashion label", "Fashion label"); }, get blurb() { return T("Aso-ebi season can make or break you.", "Aso-ebi season fit make you or finish you."); }, startCost: 2_500_000, baseRevenue: 800_000, stockPct: 0.4, rent: 360_000, wage: 65_000, minOpp: 3 },
  { id: "restaurant", get label() { return T("Restaurant", "Restaurant"); }, get blurb() { return T("Lunch crowd, hungry offices, and generator diesel.", "Lunch crowd, hungry office people, and diesel for generator."); }, startCost: 3_500_000, baseRevenue: 1_150_000, stockPct: 0.46, rent: 900_000, wage: 70_000, minOpp: 3 },
  { id: "techstart", get label() { return T("Tech startup", "Tech startup"); }, get blurb() { return T("Costs are people and cloud. Revenue starts small, then explodes or dies.", "Your cost na people and cloud. Money start small, then e go blow or e go die."); }, startCost: 4_000_000, baseRevenue: 650_000, stockPct: 0.16, rent: 600_000, wage: 190_000, minOpp: 6 },
  { id: "farm", get label() { return T("Commercial farm", "Commercial farm"); }, get blurb() { return T("Big harvest months, thin months in between.", "Harvest months dey sweet, but other months dey dry."); }, startCost: 6_000_000, baseRevenue: 1_700_000, stockPct: 0.32, rent: 200_000, wage: 50_000, minOpp: 2, seasonal: true },
  { id: "logistics", get label() { return T("Logistics & delivery company", "Logistics & delivery company"); }, get blurb() { return T("Bikes, vans and angry customers.", "Bikes, vans and customers wey dey vex."); }, startCost: 9_000_000, baseRevenue: 2_600_000, stockPct: 0.36, rent: 700_000, wage: 80_000, minOpp: 5 },
  { id: "pharmacy", get label() { return T("Pharmacy", "Pharmacy"); }, get blurb() { return T("Always needed. Watch the fakes.", "People always need am. Just watch out for fake drugs."); }, startCost: 12_000_000, baseRevenue: 4_000_000, stockPct: 0.72, rent: 1_200_000, wage: 90_000, minOpp: 4 },
  { id: "supermarket", get label() { return T("Supermarket", "Supermarket"); }, get blurb() { return T("Big volumes, tiny margins.", "Plenty goods dey move, but profit small."); }, startCost: 14_000_000, baseRevenue: 6_000_000, stockPct: 0.8, rent: 4_000_000, wage: 70_000, minOpp: 5 },
  { id: "hotel", get label() { return T("Hotel", "Hotel"); }, get blurb() { return T("Weddings, travellers and constant maintenance.", "Wedding, travellers, and repair no dey end."); }, startCost: 40_000_000, baseRevenue: 14_000_000, stockPct: 0.34, rent: 6_000_000, wage: 75_000, minOpp: 5 },
];
export const BIZ_BY_ID = Object.fromEntries(BIZ_KINDS.map((b) => [b.id, b])) as Record<string, BizKind>;

const sc = (p: Player, n: number) => n * Math.pow(p.index, 0.92);

export function startCostFor(p: Player, kind: BizKind) {
  return Math.round(sc(p, kind.startCost) * (0.7 + stateOf(p).cost * 0.3));
}

export function startBlock(p: Player, kindId: string): string | null {
  const k = BIZ_BY_ID[kindId];
  if (!k) return T("Unknown", "I no know am");
  if (p.age < 18) return T("You must be 18 to register a business", "You must reach 18 before you fit register business");
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (stateOf(p).opp < k.minOpp) return T(`This market is too small (needs opportunity ${k.minOpp}+)`, `This market too small (e need opportunity ${k.minOpp}+)`);
  if (p.businesses.filter((b) => b.status === "open").length >= 4) return T("Too many businesses to manage", "Business too many for you to manage");
  const cost = startCostFor(p, k);
  if (p.money < cost) return T(`Needs ${naira(cost)}`, `E need ${naira(cost)}`);
  return null;
}

export function startBusiness(p: Player, kindId: string, name: string): string {
  const block = startBlock(p, kindId);
  if (block) return block;
  const k = BIZ_BY_ID[kindId];
  const cost = startCostFor(p, k);
  transact(p, { amount: -cost, reason: T(`Started ${k.label.toLowerCase()}: ${name || k.label}`, `Start ${k.label.toLowerCase()}: ${name || k.label}`), category: "business" });
  const b: Business = {
    id: uid(), kind: k.id, name: name.trim() || `${p.surname} ${k.label}`, stateId: p.state, level: 1, quality: 55, staff: k.id === "techstart" ? 2 : 1,
    invested: cost, manager: false, startedAt: monthIndex(p), profit: 0, lastMonthProfit: 0, status: "open", debt: 0, lossStreak: 0,
  };
  p.businesses.push(b);
  return T(`${b.name} is open for business in ${STATE_BY_ID[b.stateId].name}.`, `${b.name} don open for ${STATE_BY_ID[b.stateId].name}. Business don start.`);
}

export const upgradeCost = (p: Player, b: Business) => Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * 0.8 * b.level);
export const hireCost = (p: Player, b: Business) => Math.round(sc(p, BIZ_BY_ID[b.kind].wage) * 1.5);

export function upgradeBusiness(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  if (b.level >= 5) return T("Already at the top level.", "E don reach the top level.");
  const c = upgradeCost(p, b);
  if (p.money < c) return T(`Needs ${naira(c)}.`, `E need ${naira(c)}.`);
  transact(p, { amount: -c, reason: T(`Expanded ${b.name}`, `Expand ${b.name}`), category: "business" });
  b.level += 1;
  b.invested += c;
  b.quality = clamp(b.quality + 8);
  return T(`${b.name} grows to level ${b.level}.`, `${b.name} don grow reach level ${b.level}.`);
}

export function hireStaff(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  if (b.staff >= b.level * 4 + 2) return T("You need to expand first to hold more staff.", "You must expand first before you fit carry more staff.");
  const c = hireCost(p, b);
  if (p.money < c) return T(`Needs ${naira(c)} for recruitment and training.`, `E need ${naira(c)} for recruitment and training.`);
  transact(p, { amount: -c, reason: T(`Hired new staff for ${b.name}`, `Hire new staff for ${b.name}`), category: "business" });
  b.staff += 1;
  return T(`A new staff member joins ${b.name}.`, `New staff don join ${b.name}.`);
}

export function fireStaff(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b || b.staff <= 0) return "";
  const sev = Math.round(sc(p, BIZ_BY_ID[b.kind].wage));
  if (p.money >= sev) transact(p, { amount: -sev, reason: T(`Severance for staff at ${b.name}`, `Severance for staff for ${b.name}`), category: "business" });
  b.staff -= 1;
  b.quality = clamp(b.quality - 3);
  return T(`You let one person go from ${b.name}.`, `You don let one person go from ${b.name}.`);
}

export function toggleManager(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  b.manager = !b.manager;
  return b.manager ? T(`You hired a manager for ${b.name}. They take a cut and quality may drift.`, `You don hire manager for ${b.name}. Him go collect him share, and quality fit slide.`) : T(`You are running ${b.name} yourself again.`, `You don take over ${b.name} yourself again.`);
}

export function valuation(p: Player, b: Business): number {
  const k = BIZ_BY_ID[b.kind];
  return Math.round(Math.max(sc(p, k.startCost) * 0.25 * b.level, b.lastMonthProfit * 12 * 2.2));
}

export function sellBusiness(p: Player, id: string): string {
  const i = p.businesses.findIndex((x) => x.id === id && x.status === "open");
  if (i < 0) return "";
  const b = p.businesses[i];
  const v = valuation(p, b);
  transact(p, { amount: v, reason: T(`Sold ${b.name}`, `Sell ${b.name}`), category: "business" });
  p.businesses.splice(i, 1);
  p.prestige += 0;
  return T(`You sold ${b.name} for ${naira(v)}.`, `You sell ${b.name} for ${naira(v)}.`);
}

export function closeBusiness(p: Player, id: string): string {
  const i = p.businesses.findIndex((x) => x.id === id && x.status === "open");
  if (i < 0) return "";
  const b = p.businesses[i];
  const scrap = Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * 0.06 * b.level);
  transact(p, { amount: scrap, reason: T(`Closed ${b.name} (sold equipment)`, `Close ${b.name} (sell equipment)`), category: "business" });
  p.businesses.splice(i, 1);
  return T(`${b.name} is closed.`, `${b.name} don close.`);
}

/** Monthly revenue, costs and owner draw for every business. */
export function businessMonth(p: Player, lines: string[]) {
  for (const b of p.businesses) {
    if (b.status !== "open") continue;
    const k = BIZ_BY_ID[b.kind];
    const st = STATE_BY_ID[b.stateId];
    const season = k.seasonal ? ([6, 7, 8, 9, 10].includes(p.month) ? 1.9 : 0.45) : p.month === 12 ? 1.25 : p.month === 1 ? 0.85 : 1;
    const demand = 0.55 + st.opp / 9;
    const mgmt = businessMultiplier(p) * (b.manager ? 0.88 : 1) * (p.prison > 0 && !b.manager ? 0.3 : 1); // unattended while you are locked up
    const staffLift = 1 + 0.11 * Math.min(b.staff, b.level * 4);
    const rev = sc(p, k.baseRevenue) * Math.pow(b.level, 1.38) * demand * (b.quality / 60) * staffLift * season * rand(0.62, 1.38) * mgmt;
    const stock = rev * k.stockPct;
    const wages = b.staff * sc(p, k.wage);
    const overheads = rev * 0.07;
    const tax = rev * 0.01;
    let net = rev - stock - wages - overheads - tax;
    if (p.month === 1) net -= (sc(p, k.rent) * st.cost) * Math.max(1, b.level * 0.8);
    if (b.manager) net -= Math.max(0, net) * 0.15;
    transact(p, { amount: net, reason: T(`${b.name}: ${net >= 0 ? "profit" : "loss"} for the month`, `${b.name}: ${net >= 0 ? "profit" : "loss"} for the month`), category: "business", recurring: b.id });
    b.profit += net;
    b.lastMonthProfit = net;
    b.lossStreak = net < 0 ? b.lossStreak + 1 : 0;
    b.quality = clamp(b.quality + (b.manager ? -0.4 : -0.1) + (net > 0 ? 0.15 : -0.2));
    if (b.lossStreak >= 9) {
      b.status = "closed";
      lines.push(T(`${b.name} shut down after months of losses.`, `${b.name} don shut after months of loss.`));
      bump(p, "stress", 10);
      bump(p, "happiness", -8);
    }
  }
  p.businesses = p.businesses.filter((b) => b.status === "open");
}

export const bizValue = (p: Player) => p.businesses.reduce((s, b) => s + valuation(p, b), 0);

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const hasBiz = (p: Player) => p.businesses.some((b) => b.status === "open");
const firstBiz = (p: Player) => p.businesses.find((b) => b.status === "open");

export const BIZ_EVENTS: EventDef[] = [
  {
    id: "biz_theft",
    title: dual("Staff theft", "Staff thief"),
    weight: (p) => (hasBiz(p) ? 2 : 0),
    text: () => T("The stock does not match the sales book. One of your staff has been quietly selling goods on the side.", "The stock no match the sales book. One of your staff dey sell goods for side quietly."),
    choices: (p) => [
      { label: T("Fire the thief and report", "Sack the thief, report am"), run: (q) => { const b = firstBiz(q); if (b && b.staff > 0) b.staff -= 1; transact(q, { amount: -I(q, 120_000), reason: T("Losses from staff theft", "Loss from staff thief"), category: "business" }); bump(q, "reputation", 1); return T("You let the person go. Trust takes a while to rebuild.", "You send the person go. Trust go take time before e come back."); } },
      { label: T("Warn and install cameras", "Warn dem, fix cameras"), sub: naira(I(p, 90_000)), disabled: p.money < I(p, 90_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 90_000), reason: T("CCTV and stock control", "CCTV and stock control"), category: "business" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 3); return T("The cameras go in. Losses stop.", "Cameras don enter. Loss don stop."); } },
      { label: T("Let it slide", "Let am pass"), run: (q) => { transact(q, { amount: -I(q, 200_000), reason: T("Further theft at the business", "More thief for the business"), category: "business" }); return T("It continues. You lose more.", "E continue. You dey lose more."); } },
    ],
  },
  {
    id: "biz_inspection",
    title: dual("Officials visit your business", "Officials land for your business"),
    weight: (p) => (hasBiz(p) ? 2 : 0),
    text: () => T("Officials from the local government, health and fire services turn up one after another, each with a demand.", "Local government, health and fire service people dey come one after the other, each one with him own demand."),
    choices: (p) => [
      { label: T("Comply with the fees", "Pay the official fees"), sub: naira(I(p, 180_000)), run: (q) => { transact(q, { amount: -I(q, 180_000), reason: T("Business permits and inspection fees", "Business permit and inspection fees"), category: "tax" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 2); return T("You collect your receipts and permits.", "You collect your receipts and permits."); } },
      { label: T("Settle them quietly", "Settle dem quietly"), sub: naira(I(p, 60_000)), run: (q) => { transact(q, { amount: -I(q, 60_000), reason: T("Unofficial payments to inspectors", "Small something for inspectors"), category: "tax" }); bump(q, "reputation", -2); return T("They leave happy. They will be back.", "Dem go happy. But dem go return."); } },
      { label: T("Argue your case", "Argue your case"), run: (q) => { if (chance(0.4)) return T("You show your papers and they back off.", "You show your papers and dem step back."); transact(q, { amount: -I(q, 350_000), reason: T("Fines after an argument with inspectors", "Fine after you quarrel with inspectors"), category: "tax" }); return T("They shut you for a week and fine you.", "Dem lock your shop for one week and fine you."); } },
    ],
  },
  {
    id: "biz_bulk_order",
    title: dual("A huge order", "Big big order"),
    weight: (p) => (hasBiz(p) ? 1.6 : 0),
    text: () => T("A company wants a large order delivered in two weeks. It could double this month's income, if you can deliver.", "One company want big order for two weeks. E fit double this month income, if you fit deliver."),
    choices: (p) => [
      { label: T("Take it and hire temporary staff", "Take am, hire temp staff"), sub: naira(I(p, 200_000)), disabled: p.money < I(p, 200_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 200_000), reason: T("Temporary staff for a big order", "Temp staff for big order"), category: "business" }); if (chance(0.7)) { const g = I(q, rand(600_000, 2_500_000)); transact(q, { amount: g, reason: T("Big order delivered on time", "Big order delivered for correct time"), category: "business" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 4); return T(`You deliver on time and earn ${naira(g)}.`, `You deliver for time and make ${naira(g)}.`); } bump(q, "stress", 8); return T("You miss the deadline and the client refuses to pay for the late delivery.", "You miss the deadline and the client no gree pay for the late delivery."); } },
      { label: T("Decline politely", "Refuse am nicely"), run: () => T("You protect your regular customers.", "You don protect your regular customers.") },
    ],
  },
  {
    id: "biz_staff_quits",
    title: dual("Your best staff resigns", "Your best staff resign"),
    weight: (p) => (hasBiz(p) && (firstBiz(p)?.staff ?? 0) > 0 ? 1.5 : 0),
    text: () => T("Your most reliable staff member got a better offer abroad. 'Boss, I have to go.'", "Your most reliable staff get better offer abroad. 'Oga, I must go o.'"),
    choices: (p) => [
      { label: T("Counter-offer with a raise", "Counter with salary raise"), sub: naira(I(p, 100_000)), disabled: p.money < I(p, 100_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 100_000), reason: T("Retention bonus", "Bonus to make am stay"), category: "business" }); return T("They stay, and so does the quality.", "Him stay, quality too stay."); } },
      { label: T("Wish them well", "Wish am well"), run: (q) => { const b = firstBiz(q); if (b && b.staff > 0) { b.staff -= 1; b.quality = clamp(b.quality - 5); } return T("You hug and say goodbye. Hiring will be hard.", "You hug am and say bye. To hire person again go hard."); } },
    ],
  },
];

