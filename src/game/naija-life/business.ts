import { STATE_BY_ID } from "./data";
import { monthIndex, transact } from "./ledger";
import type { Business, EventDef, Player } from "./types";
import { chance, clamp, naira, rand, uid } from "./util";
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
  { id: "provisions", label: "Provision store", blurb: "Daily necessities. Steady and modest.", startCost: 1_200_000, baseRevenue: 480_000, stockPct: 0.62, rent: 240_000, wage: 55_000, minOpp: 1 },
  { id: "salon", label: "Hair & beauty salon", blurb: "Weekend rush, loyal customers.", startCost: 1_800_000, baseRevenue: 620_000, stockPct: 0.26, rent: 420_000, wage: 60_000, minOpp: 2 },
  { id: "fashion", label: "Fashion label", blurb: "Aso-ebi season can make or break you.", startCost: 2_500_000, baseRevenue: 800_000, stockPct: 0.4, rent: 360_000, wage: 65_000, minOpp: 3 },
  { id: "restaurant", label: "Restaurant", blurb: "Lunch crowd, hungry offices, and generator diesel.", startCost: 3_500_000, baseRevenue: 1_150_000, stockPct: 0.46, rent: 900_000, wage: 70_000, minOpp: 3 },
  { id: "techstart", label: "Tech startup", blurb: "Costs are people and cloud. Revenue starts small, then explodes or dies.", startCost: 4_000_000, baseRevenue: 650_000, stockPct: 0.16, rent: 600_000, wage: 190_000, minOpp: 6 },
  { id: "farm", label: "Commercial farm", blurb: "Big harvest months, thin months in between.", startCost: 6_000_000, baseRevenue: 1_700_000, stockPct: 0.32, rent: 200_000, wage: 50_000, minOpp: 2, seasonal: true },
  { id: "logistics", label: "Logistics & delivery company", blurb: "Bikes, vans and angry customers.", startCost: 9_000_000, baseRevenue: 2_600_000, stockPct: 0.36, rent: 700_000, wage: 80_000, minOpp: 5 },
  { id: "pharmacy", label: "Pharmacy", blurb: "Always needed. Watch the fakes.", startCost: 12_000_000, baseRevenue: 4_000_000, stockPct: 0.72, rent: 1_200_000, wage: 90_000, minOpp: 4 },
  { id: "supermarket", label: "Supermarket", blurb: "Big volumes, tiny margins.", startCost: 14_000_000, baseRevenue: 6_000_000, stockPct: 0.8, rent: 4_000_000, wage: 70_000, minOpp: 5 },
  { id: "hotel", label: "Hotel", blurb: "Weddings, travellers and constant maintenance.", startCost: 40_000_000, baseRevenue: 14_000_000, stockPct: 0.34, rent: 6_000_000, wage: 75_000, minOpp: 5 },
];
export const BIZ_BY_ID = Object.fromEntries(BIZ_KINDS.map((b) => [b.id, b])) as Record<string, BizKind>;

const sc = (p: Player, n: number) => n * Math.pow(p.index, 0.92);

export function startCostFor(p: Player, kind: BizKind) {
  return Math.round(sc(p, kind.startCost) * (0.7 + stateOf(p).cost * 0.3));
}

export function startBlock(p: Player, kindId: string): string | null {
  const k = BIZ_BY_ID[kindId];
  if (!k) return "Unknown";
  if (p.age < 18) return "You must be 18 to register a business";
  if (p.prison > 0) return "In prison";
  if (stateOf(p).opp < k.minOpp) return `This market is too small (needs opportunity ${k.minOpp}+)`;
  if (p.businesses.filter((b) => b.status === "open").length >= 4) return "Too many businesses to manage";
  const cost = startCostFor(p, k);
  if (p.money < cost) return `Needs ${naira(cost)}`;
  return null;
}

export function startBusiness(p: Player, kindId: string, name: string): string {
  const block = startBlock(p, kindId);
  if (block) return block;
  const k = BIZ_BY_ID[kindId];
  const cost = startCostFor(p, k);
  transact(p, { amount: -cost, reason: `Started ${k.label.toLowerCase()}: ${name || k.label}`, category: "business" });
  const b: Business = {
    id: uid(), kind: k.id, name: name.trim() || `${p.surname} ${k.label}`, stateId: p.state, level: 1, quality: 55, staff: k.id === "techstart" ? 2 : 1,
    invested: cost, manager: false, startedAt: monthIndex(p), profit: 0, lastMonthProfit: 0, status: "open", debt: 0, lossStreak: 0,
  };
  p.businesses.push(b);
  return `${b.name} is open for business in ${STATE_BY_ID[b.stateId].name}.`;
}

export const upgradeCost = (p: Player, b: Business) => Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * 0.8 * b.level);
export const hireCost = (p: Player, b: Business) => Math.round(sc(p, BIZ_BY_ID[b.kind].wage) * 1.5);

export function upgradeBusiness(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  if (b.level >= 5) return "Already at the top level.";
  const c = upgradeCost(p, b);
  if (p.money < c) return `Needs ${naira(c)}.`;
  transact(p, { amount: -c, reason: `Expanded ${b.name}`, category: "business" });
  b.level += 1;
  b.invested += c;
  b.quality = clamp(b.quality + 8);
  return `${b.name} grows to level ${b.level}.`;
}

export function hireStaff(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  if (b.staff >= b.level * 4 + 2) return "You need to expand first to hold more staff.";
  const c = hireCost(p, b);
  if (p.money < c) return `Needs ${naira(c)} for recruitment and training.`;
  transact(p, { amount: -c, reason: `Hired new staff for ${b.name}`, category: "business" });
  b.staff += 1;
  return `A new staff member joins ${b.name}.`;
}

export function fireStaff(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b || b.staff <= 0) return "";
  const sev = Math.round(sc(p, BIZ_BY_ID[b.kind].wage));
  if (p.money >= sev) transact(p, { amount: -sev, reason: `Severance for staff at ${b.name}`, category: "business" });
  b.staff -= 1;
  b.quality = clamp(b.quality - 3);
  return `You let one person go from ${b.name}.`;
}

export function toggleManager(p: Player, id: string): string {
  const b = p.businesses.find((x) => x.id === id && x.status === "open");
  if (!b) return "";
  b.manager = !b.manager;
  return b.manager ? `You hired a manager for ${b.name}. They take a cut and quality may drift.` : `You are running ${b.name} yourself again.`;
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
  transact(p, { amount: v, reason: `Sold ${b.name}`, category: "business" });
  p.businesses.splice(i, 1);
  p.prestige += 0;
  return `You sold ${b.name} for ${naira(v)}.`;
}

export function closeBusiness(p: Player, id: string): string {
  const i = p.businesses.findIndex((x) => x.id === id && x.status === "open");
  if (i < 0) return "";
  const b = p.businesses[i];
  const scrap = Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * 0.06 * b.level);
  transact(p, { amount: scrap, reason: `Closed ${b.name} (sold equipment)`, category: "business" });
  p.businesses.splice(i, 1);
  return `${b.name} is closed.`;
}

/** Monthly revenue, costs and owner draw for every business. */
export function businessMonth(p: Player, lines: string[]) {
  for (const b of p.businesses) {
    if (b.status !== "open") continue;
    const k = BIZ_BY_ID[b.kind];
    const st = STATE_BY_ID[b.stateId];
    const season = k.seasonal ? ([6, 7, 8, 9, 10].includes(p.month) ? 1.9 : 0.45) : p.month === 12 ? 1.25 : p.month === 1 ? 0.85 : 1;
    const demand = 0.55 + st.opp / 9;
    const mgmt = (b.manager ? 0.88 : 1) * (p.prison > 0 && !b.manager ? 0.3 : 1); // unattended while you are locked up
    const staffLift = 1 + 0.11 * Math.min(b.staff, b.level * 4);
    const rev = sc(p, k.baseRevenue) * Math.pow(b.level, 1.38) * demand * (b.quality / 60) * staffLift * season * rand(0.62, 1.38) * mgmt;
    const stock = rev * k.stockPct;
    const wages = b.staff * sc(p, k.wage);
    const overheads = rev * 0.07;
    const tax = rev * 0.01;
    let net = rev - stock - wages - overheads - tax;
    if (p.month === 1) net -= (sc(p, k.rent) * st.cost) * Math.max(1, b.level * 0.8);
    if (b.manager) net -= Math.max(0, net) * 0.15;
    transact(p, { amount: net, reason: `${b.name}: ${net >= 0 ? "profit" : "loss"} for the month`, category: "business", recurring: b.id });
    b.profit += net;
    b.lastMonthProfit = net;
    b.lossStreak = net < 0 ? b.lossStreak + 1 : 0;
    b.quality = clamp(b.quality + (b.manager ? -0.4 : -0.1) + (net > 0 ? 0.15 : -0.2));
    if (b.lossStreak >= 9) {
      b.status = "closed";
      lines.push(`${b.name} shut down after months of losses.`);
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
    title: "Staff theft",
    weight: (p) => (hasBiz(p) ? 2 : 0),
    text: () => "The stock does not match the sales book. One of your staff has been quietly selling goods on the side.",
    choices: (p) => [
      { label: "Fire the thief and report", run: (q) => { const b = firstBiz(q); if (b && b.staff > 0) b.staff -= 1; transact(q, { amount: -I(q, 120_000), reason: "Losses from staff theft", category: "business" }); bump(q, "reputation", 1); return "You let the person go. Trust takes a while to rebuild."; } },
      { label: "Warn and install cameras", sub: naira(I(p, 90_000)), disabled: p.money < I(p, 90_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 90_000), reason: "CCTV and stock control", category: "business" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 3); return "The cameras go in. Losses stop."; } },
      { label: "Let it slide", run: (q) => { transact(q, { amount: -I(q, 200_000), reason: "Further theft at the business", category: "business" }); return "It continues. You lose more."; } },
    ],
  },
  {
    id: "biz_inspection",
    title: "Officials visit your business",
    weight: (p) => (hasBiz(p) ? 2 : 0),
    text: () => "Officials from the local government, health and fire services turn up one after another, each with a demand.",
    choices: (p) => [
      { label: "Comply with the fees", sub: naira(I(p, 180_000)), run: (q) => { transact(q, { amount: -I(q, 180_000), reason: "Business permits and inspection fees", category: "tax" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 2); return "You collect your receipts and permits."; } },
      { label: "Settle them quietly", sub: naira(I(p, 60_000)), run: (q) => { transact(q, { amount: -I(q, 60_000), reason: "Unofficial payments to inspectors", category: "tax" }); bump(q, "reputation", -2); return "They leave happy. They will be back."; } },
      { label: "Argue your case", run: (q) => { if (chance(0.4)) return "You show your papers and they back off."; transact(q, { amount: -I(q, 350_000), reason: "Fines after an argument with inspectors", category: "tax" }); return "They shut you for a week and fine you."; } },
    ],
  },
  {
    id: "biz_bulk_order",
    title: "A huge order",
    weight: (p) => (hasBiz(p) ? 1.6 : 0),
    text: () => "A company wants a large order delivered in two weeks. It could double this month's income, if you can deliver.",
    choices: (p) => [
      { label: "Take it and hire temporary staff", sub: naira(I(p, 200_000)), disabled: p.money < I(p, 200_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 200_000), reason: "Temporary staff for a big order", category: "business" }); if (chance(0.7)) { const g = I(q, rand(600_000, 2_500_000)); transact(q, { amount: g, reason: "Big order delivered on time", category: "business" }); const b = firstBiz(q); if (b) b.quality = clamp(b.quality + 4); return `You deliver on time and earn ${naira(g)}.`; } bump(q, "stress", 8); return "You miss the deadline and the client refuses to pay for the late delivery."; } },
      { label: "Decline politely", run: () => "You protect your regular customers." },
    ],
  },
  {
    id: "biz_staff_quits",
    title: "Your best staff resigns",
    weight: (p) => (hasBiz(p) && (firstBiz(p)?.staff ?? 0) > 0 ? 1.5 : 0),
    text: () => "Your most reliable staff member got a better offer abroad. 'Boss, I have to go.'",
    choices: (p) => [
      { label: "Counter-offer with a raise", sub: naira(I(p, 100_000)), disabled: p.money < I(p, 100_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 100_000), reason: "Retention bonus", category: "business" }); return "They stay, and so does the quality."; } },
      { label: "Wish them well", run: (q) => { const b = firstBiz(q); if (b && b.staff > 0) { b.staff -= 1; b.quality = clamp(b.quality - 5); } return "You hug and say goodbye. Hiring will be hard."; } },
    ],
  },
];

