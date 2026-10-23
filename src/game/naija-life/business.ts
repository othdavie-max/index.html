import { JOB_BY_ID, STATE_BY_ID } from "./data";
import { monthIndex, transact } from "./ledger";
import { businessMultiplier } from "./news";
import type { BizOffer, Business, EventDef, Player, Worker, BizReport } from "./types";
import { EXTRA_BIZ } from "./bizKinds2";
import { profileOf, type LeverOpt } from "./bizProfiles";
import { T, chance, clamp, dual, naira, rand, uid } from "./util";
import { I, bump, randomName, stateOf } from "./helpers";

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
  emoji?: string;
}

export const BIZ_KINDS: BizKind[] = [
  { id: "akara", get label() { return T("Akara and pap stand", "Akara and pap stand"); }, get blurb() { return T("Fry in the morning, sell by 10. Start with a pot and a pan.", "Fry for morning, sell finish by 10. Start with pot and frying pan."); }, startCost: 80_000, baseRevenue: 200_000, stockPct: 0.55, rent: 12_000, wage: 25_000, minOpp: 1 },
  { id: "pos", get label() { return T("POS agent kiosk", "POS agent kiosk"); }, get blurb() { return T("Cash-out and transfers. Thin margins, steady crowds.", "Cash-out and transfer. Profit small, but people plenty."); }, startCost: 250_000, baseRevenue: 500_000, stockPct: 0.6, rent: 40_000, wage: 30_000, minOpp: 1 },
  { id: "carwash", get label() { return T("Car wash", "Car wash"); }, get blurb() { return T("Water, soap and patience.", "Water, soap and patience."); }, startCost: 600_000, baseRevenue: 700_000, stockPct: 0.2, rent: 80_000, wage: 35_000, minOpp: 1 },
  { id: "barbing", get label() { return T("Barbing salon", "Barbing salon"); }, get blurb() { return T("Clippers, a generator and loyal regulars.", "Clippers, generator and regular customers."); }, startCost: 400_000, baseRevenue: 330_000, stockPct: 0.2, rent: 90_000, wage: 40_000, minOpp: 1 },
  { id: "bukka", get label() { return T("Bukka (mama put)", "Bukka (mama put)"); }, get blurb() { return T("Rice, stew and a queue at lunch.", "Rice, stew and queue for lunch."); }, startCost: 700_000, baseRevenue: 600_000, stockPct: 0.5, rent: 140_000, wage: 40_000, minOpp: 1 },
  { id: "phoneshop", get label() { return T("Phone and gadget shop", "Phone and gadget shop"); }, get blurb() { return T("Accessories, repairs and the odd fake charger.", "Accessories, repair and one or two fake charger."); }, startCost: 1_000_000, baseRevenue: 1_100_000, stockPct: 0.7, rent: 180_000, wage: 45_000, minOpp: 2 },
  { id: "water", get label() { return T("Pure water factory", "Pure water factory"); }, get blurb() { return T("Sachet water for the whole street.", "Sachet water for the whole street."); }, startCost: 1_500_000, baseRevenue: 1_600_000, stockPct: 0.4, rent: 100_000, wage: 45_000, minOpp: 1 },
  { id: "bakery", get label() { return T("Bakery", "Bakery"); }, get blurb() { return T("Bread, chin chin and early mornings.", "Bread, chin chin and early morning."); }, startCost: 2_000_000, baseRevenue: 1_900_000, stockPct: 0.5, rent: 250_000, wage: 50_000, minOpp: 2 },
  { id: "provisions", get label() { return T("Provision store", "Provision store"); }, get blurb() { return T("Daily necessities. Steady and modest.", "Daily daily things wey people need. E steady but e no big."); }, startCost: 1_200_000, baseRevenue: 480_000, stockPct: 0.62, rent: 240_000, wage: 55_000, minOpp: 1 },
  { id: "salon", get label() { return T("Hair & beauty salon", "Hair & beauty salon"); }, get blurb() { return T("Weekend rush, loyal customers.", "Weekend dey full, and customers dey stick to you."); }, startCost: 1_800_000, baseRevenue: 620_000, stockPct: 0.26, rent: 420_000, wage: 60_000, minOpp: 2 },
  { id: "fashion", get label() { return T("Fashion label", "Fashion label"); }, get blurb() { return T("Aso-ebi season can make or break you.", "Aso-ebi season fit make you or finish you."); }, startCost: 2_500_000, baseRevenue: 800_000, stockPct: 0.4, rent: 360_000, wage: 65_000, minOpp: 3 },
  { id: "restaurant", get label() { return T("Restaurant", "Restaurant"); }, get blurb() { return T("Lunch crowd, hungry offices, and generator diesel.", "Lunch crowd, hungry office people, and diesel for generator."); }, startCost: 3_500_000, baseRevenue: 1_150_000, stockPct: 0.46, rent: 900_000, wage: 70_000, minOpp: 3 },
  { id: "techstart", get label() { return T("Tech startup", "Tech startup"); }, get blurb() { return T("Costs are people and cloud. Revenue starts small, then explodes or dies.", "Your cost na people and cloud. Money start small, then e go blow or e go die."); }, startCost: 4_000_000, baseRevenue: 650_000, stockPct: 0.16, rent: 600_000, wage: 190_000, minOpp: 6 },
  { id: "farm", get label() { return T("Commercial farm", "Commercial farm"); }, get blurb() { return T("Big harvest months, thin months in between.", "Harvest months dey sweet, but other months dey dry."); }, startCost: 6_000_000, baseRevenue: 1_700_000, stockPct: 0.32, rent: 200_000, wage: 50_000, minOpp: 2, seasonal: true },
  { id: "logistics", get label() { return T("Logistics & delivery company", "Logistics & delivery company"); }, get blurb() { return T("Bikes, vans and angry customers.", "Bikes, vans and customers wey dey vex."); }, startCost: 9_000_000, baseRevenue: 2_600_000, stockPct: 0.36, rent: 700_000, wage: 80_000, minOpp: 5 },
  { id: "pharmacy", get label() { return T("Pharmacy", "Pharmacy"); }, get blurb() { return T("Always needed. Watch the fakes.", "People always need am. Just watch out for fake drugs."); }, startCost: 12_000_000, baseRevenue: 4_000_000, stockPct: 0.72, rent: 1_200_000, wage: 90_000, minOpp: 4 },
  { id: "supermarket", get label() { return T("Supermarket", "Supermarket"); }, get blurb() { return T("Big volumes, tiny margins.", "Plenty goods dey move, but profit small."); }, startCost: 14_000_000, baseRevenue: 9_000_000, stockPct: 0.8, rent: 4_000_000, wage: 70_000, minOpp: 5 },
  { id: "hotel", get label() { return T("Hotel", "Hotel"); }, get blurb() { return T("Weddings, travellers and constant maintenance.", "Wedding, travellers, and repair no dey end."); }, startCost: 40_000_000, baseRevenue: 14_000_000, stockPct: 0.34, rent: 6_000_000, wage: 75_000, minOpp: 5 },
];
BIZ_KINDS.push(...EXTRA_BIZ);
export const BIZ_BY_ID = Object.fromEntries(BIZ_KINDS.map((b) => [b.id, b])) as Record<string, BizKind>;

const sc = (p: Player, n: number) => n * Math.pow(p.index, 0.92);
export const scaleCost = sc;

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
    id: uid(), kind: k.id, name: name.trim() || `${p.surname} ${k.label}`, stateId: p.state, level: 1, quality: 55, staff: 0,
    invested: cost, manager: false, startedAt: monthIndex(p), profit: 0, lastMonthProfit: 0, status: "open", debt: 0, lossStreak: 0, price: 1, ads: 0, stock: 1, fame: 20, hist: [],
  };
  const prof = profileOf(k.id);
  b.set = {};
  const startRoles = k.startCost >= 1_500_000 ? prof.start.slice(0, 2) : [];
  b.crew = startRoles.map((r) => newWorker(p, 45, r));
  b.staff = b.crew.length;
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

export const PRICE_LABEL = [() => T("Cheap", "Cheap"), () => T("Fair", "Fair"), () => T("Premium", "Premium")];
export const STOCK_LABEL = [() => T("Cheap stock", "Cheap stock"), () => T("Standard stock", "Standard stock"), () => T("Premium stock", "Premium stock")];

function newWorker(p: Player, skillBase: number, role?: string): Worker {
  const male = chance(0.5);
  const skill = Math.round(clamp(skillBase + rand(-22, 28), 10, 95));
  return { id: uid(), name: randomName(p.tribe, male ? "male" : "female"), skill, loyalty: Math.round(rand(55, 80)), wage: Math.round((0.7 + skill / 100 * 0.8 + rand(-0.1, 0.15)) * 100) / 100, since: monthIndex(p), role };
}

/** Old saves only knew a head-count. Give them real people. */
export function ensureCrew(p: Player, b: Business) {
  const prof = profileOf(b.kind);
  if (!b.crew) b.crew = Array.from({ length: b.staff }, () => newWorker(p, 45, prof.roles[0].id));
  for (const w of b.crew) w.role ??= prof.roles[0].id;
  b.set ??= {};
  b.price ??= 1; b.ads ??= 0; b.stock ??= 1; b.fame ??= 30; b.hist ??= [];
}
const find = (p: Player, id: string) => p.businesses.find((x) => x.id === id && x.status === "open");
export const roleOf = (b: Business, w: Worker) => profileOf(b.kind).roles.find((r) => r.id === w.role) ?? profileOf(b.kind).roles[0];
export const workerPay = (p: Player, b: Business, w: Worker) => Math.round(sc(p, BIZ_BY_ID[b.kind].wage) * w.wage * roleOf(b, w).wage);

/** The sum of every lever's chosen option. The middle option of each lever is neutral. */
export interface Mods { rev: number; cost: number; over: number; rent: number; fame: number; q: number; risk: number; pm: number; ads: number }
export function leverIdx(b: Business, id: string, def: number): number {
  const s = b.set?.[id];
  if (s !== undefined) return s;
  if (id === "price" && b.price !== undefined) return b.price;
  if (id === "ads" && b.ads !== undefined) return b.ads;
  if (id === "stock" && b.stock !== undefined) return b.stock;
  return def;
}
export function modsOf(b: Business): Mods {
  const m: Mods = { rev: 1, cost: 1, over: 0, rent: 1, fame: 0, q: 0, risk: 1, pm: 1, ads: 0 };
  for (const l of profileOf(b.kind).levers) {
    const o: LeverOpt = l.opts[Math.min(l.opts.length - 1, Math.max(0, leverIdx(b, l.id, l.def)))];
    m.rev *= o.rev ?? 1; m.cost *= o.cost ?? 1; m.over += o.over ?? 0; m.rent *= o.rent ?? 1; m.fame += o.fame ?? 0; m.q += o.q ?? 0; m.risk *= o.risk ?? 1; m.pm *= o.pm ?? 1; m.ads = Math.max(m.ads, o.ads ?? 0);
  }
  return m;
}

export function setLever(p: Player, id: string, key: string, v: number): string {
  const b = find(p, id);
  if (!b) return "";
  ensureCrew(p, b);
  const l = profileOf(b.kind).levers.find((x) => x.id === key);
  const o = l?.opts[v];
  if (!l || !o) return "";
  const cur = leverIdx(b, key, l.def);
  if (cur === v) return "";
  const fee = o.fee ? Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * o.fee) : 0;
  if (fee > p.money) return T(`Switching to "${o.label[0]}" costs ${naira(fee)}.`, `To switch to "${o.label[1]}" cost ${naira(fee)}.`);
  if (fee > 0) transact(p, { amount: -fee, reason: T(`${b.name}: set up ${o.label[0].toLowerCase()}`, `${b.name}: set up ${o.label[1].toLowerCase()}`), category: "business" });
  b.set![key] = v;
  if (key === "price" || key === "ads" || key === "stock") (b as unknown as Record<string, number>)[key] = v;
  return T(`${b.name}: ${l.label[0].toLowerCase()} set to ${o.label[0].toLowerCase()}.`, `${b.name}: ${l.label[1].toLowerCase()} don change to ${o.label[1].toLowerCase()}.`);
}

/** The set-up cost of a batch of changes. Options you already have cost nothing. */
export function leverFees(p: Player, b: Business, sets: Record<string, number>): number {
  let fee = 0;
  for (const l of profileOf(b.kind).levers) {
    const v = sets[l.id];
    if (v === undefined || v === leverIdx(b, l.id, l.def)) continue;
    const o = l.opts[v];
    if (o?.fee) fee += Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * o.fee);
  }
  return fee;
}

/** Apply several changes together, charging the set-up fees once, only when you confirm. */
export function setLevers(p: Player, id: string, sets: Record<string, number>): string {
  const b = find(p, id);
  if (!b) return "";
  ensureCrew(p, b);
  const prof = profileOf(b.kind);
  const changes = prof.levers.filter((l) => sets[l.id] !== undefined && sets[l.id] !== leverIdx(b, l.id, l.def) && l.opts[sets[l.id]]);
  if (!changes.length) return "";
  const fee = leverFees(p, b, sets);
  if (fee > p.money) return T(`You need ${naira(fee)} to make these changes.`, `You need ${naira(fee)} to make these change.`);
  if (fee > 0) transact(p, { amount: -fee, reason: T(`${b.name}: changes to how it runs`, `${b.name}: changes to how e dey run`), category: "business" });
  for (const l of changes) {
    b.set![l.id] = sets[l.id];
    if (l.id === "price" || l.id === "ads" || l.id === "stock") (b as unknown as Record<string, number>)[l.id] = sets[l.id];
  }
  return T(`${b.name}: ${changes.map((l) => `${l.label[0].toLowerCase()} → ${l.opts[sets[l.id]].label[0].toLowerCase()}`).join(", ")}${fee ? ` (${naira(fee)})` : ""}.`, `${b.name}: ${changes.map((l) => `${l.label[1].toLowerCase()} → ${l.opts[sets[l.id]].label[1].toLowerCase()}`).join(", ")}${fee ? ` (${naira(fee)})` : ""}.`);
}

export function actCost(p: Player, b: Business, a: { cost: number }) { return Math.round(sc(p, BIZ_BY_ID[b.kind].startCost) * a.cost * (0.8 + b.level * 0.2)); }
export function actBlock(p: Player, b: Business, actId: string): string | null {
  const a = profileOf(b.kind).actions.find((x) => x.id === actId);
  if (!a) return T("Unknown", "I no know am");
  if (b.acts?.[actId] === p.age) return T("Already done this year", "You don do am this year");
  if (a.minLevel && b.level < a.minLevel) return T(`Needs level ${a.minLevel}`, `E need level ${a.minLevel}`);
  if (p.money < actCost(p, b, a)) return T(`Needs ${naira(actCost(p, b, a))}`, `E need ${naira(actCost(p, b, a))}`);
  return null;
}
export function businessAct(p: Player, id: string, actId: string): string {
  const b = find(p, id);
  if (!b) return "";
  ensureCrew(p, b);
  const a = profileOf(b.kind).actions.find((x) => x.id === actId);
  const block = actBlock(p, b, actId);
  if (!a || block) return block ?? "";
  const cost = actCost(p, b, a);
  transact(p, { amount: -cost, reason: T(`${b.name}: ${a.label[0].toLowerCase()}`, `${b.name}: ${a.label[1].toLowerCase()}`), category: "business" });
  (b.acts ??= {})[actId] = p.age;
  if (a.q) b.quality = clamp(b.quality + a.q);
  if (a.fame) b.fame = clamp((b.fame ?? 20) + a.fame);
  if (a.loyalty) for (const w of b.crew ?? []) w.loyalty = clamp(w.loyalty + a.loyalty);
  if (a.rev) b.boost = Math.min(0.4, (b.boost ?? 0) + a.rev);
  let tail = "";
  if (a.gamble) {
    if (chance(a.gamble.p + (b.fame ?? 20) / 500)) { const back = Math.round(cost * a.gamble.back); transact(p, { amount: back, reason: T(`${b.name}: ${a.label[0].toLowerCase()} paid off`, `${b.name}: ${a.label[1].toLowerCase()} pay`), category: "business" }); tail = T(` It pays off: ${naira(back)} comes back.`, ` E pay: ${naira(back)} come back.`); }
    else tail = T(" It does not work out this time.", " E no work this time.");
  }
  return T(`${b.name}: ${a.label[0]} done.${tail}`, `${b.name}: ${a.label[1]} done.${tail}`);
}

export function recruit(p: Player, id: string, roleId?: string): string {
  const b = find(p, id);
  if (!b) return "";
  ensureCrew(p, b);
  const prof = profileOf(b.kind);
  const role = prof.roles.find((r) => r.id === roleId) ?? prof.roles.find((r) => r.need) ?? prof.roles[0];
  if (b.crew!.length >= b.level * 4 + 2) return T("You need to expand first to hold more staff.", "You must expand first before you fit carry more staff.");
  if (b.crew!.filter((w) => w.role === role.id).length >= role.per * b.level + 1) return T(`You have enough ${role.label[0].toLowerCase()}s for this size. Expand first.`, `You don get enough ${role.label[1].toLowerCase()} for this size. Expand first.`);
  const c = Math.round(hireCost(p, b) * 0.4);
  if (p.money < c) return T(`Needs ${naira(c)} to advertise the job and interview.`, `E need ${naira(c)} to advertise the job and interview.`);
  transact(p, { amount: -c, reason: T(`Recruiting a ${role.label[0].toLowerCase()} for ${b.name}`, `Recruiting ${role.label[1].toLowerCase()} for ${b.name}`), category: "business" });
  const base = 40 + b.level * 6;
  b.cands = [newWorker(p, base, role.id), newWorker(p, base, role.id), newWorker(p, base, role.id)];
  return T(`Three ${role.label[0].toLowerCase()} candidates turn up for the interview. Pick one.`, `Three ${role.label[1].toLowerCase()} candidate show for interview. Pick one.`);
}

export function hirePick(p: Player, id: string, idx: number): string {
  const b = find(p, id);
  if (!b?.cands?.[idx]) return "";
  ensureCrew(p, b);
  if (b.crew!.length >= b.level * 4 + 2) return T("You need to expand first to hold more staff.", "You must expand first before you fit carry more staff.");
  const w = b.cands[idx];
  b.crew!.push({ ...w, since: monthIndex(p) });
  b.cands = undefined;
  b.staff = b.crew!.length;
  return T(`${w.name} joins ${b.name}. Pay ${naira(workerPay(p, b, w))} a month.`, `${w.name} don join ${b.name}. Salary na ${naira(workerPay(p, b, w))} every month.`);
}

export function hireStaff(p: Player, id: string): string {
  const b = find(p, id);
  if (!b) return "";
  const r = recruit(p, id);
  if (!b.cands) return r;
  const best = b.cands.reduce((bi, w, i) => (w.skill > b.cands![bi].skill ? i : bi), 0);
  return hirePick(p, id, best);
}

export function dismiss(p: Player, id: string, workerId?: string): string {
  const b = find(p, id);
  if (!b) return "";
  ensureCrew(p, b);
  if (!b.crew!.length) return "";
  const i = workerId ? b.crew!.findIndex((w) => w.id === workerId) : b.crew!.reduce((bi, w, j, a) => (w.skill < a[bi].skill ? j : bi), 0);
  if (i < 0) return "";
  const w = b.crew![i];
  const tenure = Math.max(0, monthIndex(p) - w.since);
  const sev = Math.round(workerPay(p, b, w) * Math.min(2, tenure / 12));
  if (sev > 0 && p.money >= sev) transact(p, { amount: -sev, reason: T(`Severance for ${w.name} at ${b.name}`, `Severance for ${w.name} for ${b.name}`), category: "business" });
  b.crew!.splice(i, 1);
  b.staff = b.crew!.length;
  for (const o of b.crew!) o.loyalty = clamp(o.loyalty - (w.skill > 65 ? 5 : 2));
  b.quality = clamp(b.quality - 3);
  return T(`You let ${w.name} go from ${b.name}.`, `You don let ${w.name} go from ${b.name}.`);
}
export const fireStaff = (p: Player, id: string): string => dismiss(p, id);

export function raisePay(p: Player, id: string, workerId: string): string {
  const b = find(p, id);
  const w = b?.crew?.find((x) => x.id === workerId);
  if (!b || !w) return "";
  if (w.wage >= 2) return T("They are already very well paid.", "Dem don pay am well well.");
  w.wage = Math.round((w.wage + 0.15) * 100) / 100;
  w.loyalty = clamp(w.loyalty + 12);
  return T(`${w.name} gets a raise and works with a smile.`, `${w.name} collect raise and dey work with joy.`);
}

export function trainWorker(p: Player, id: string, workerId: string): string {
  const b = find(p, id);
  const w = b?.crew?.find((x) => x.id === workerId);
  if (!b || !w) return "";
  if (w.skill >= 92) return T("Nothing more to teach.", "Nothing remain to teach am.");
  const c = Math.round(sc(p, BIZ_BY_ID[b.kind].wage) * 2);
  if (p.money < c) return T(`Training costs ${naira(c)}.`, `Training cost ${naira(c)}.`);
  transact(p, { amount: -c, reason: T(`Training for ${w.name}`, `Training for ${w.name}`), category: "business" });
  w.skill = Math.min(95, w.skill + 8);
  w.loyalty = clamp(w.loyalty + 4);
  return T(`${w.name} comes back from training sharper.`, `${w.name} come back from training sharp pass before.`);
}

export function setPolicy(p: Player, id: string, key: "price" | "ads" | "stock", v: number): string {
  return setLever(p, id, key, v);
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

const BUYER_NOTES = {
  lowball: [{ en: "'Business is slow these days. This is my best.'", pcm: "'Business slow these days. Na my best be this.'" }, { en: "'I will take it off your hands today. Cash.'", pcm: "'I go carry am today. Cash.'" }],
  fair: [{ en: "'I have looked at your books. This is a fair price.'", pcm: "'I don check your book. Na fair price be this.'" }, { en: "'My accountant says this is reasonable.'", pcm: "'My accountant talk say e reasonable.'" }],
  keen: [{ en: "'I love the location and the name. I am prepared to pay well.'", pcm: "'I love the location and the name. I fit pay well.'" }, { en: "'A friend told me about you. I want it.'", pcm: "'Friend tell me about you. I want am.'" }],
  instalment: [{ en: "'Half now, half in six months. I am good for it.'", pcm: "'Half now, half after six months. I go pay.'" }, { en: "'My uncle is sending money from abroad. Give me time.'", pcm: "'My uncle dey send money from abroad. Give me time.'" }],
} as const;

/** Look for buyers. What they offer depends on profit, fame and quality, and not every buyer is honest. */
export function listForSale(p: Player, id: string): string {
  const b = find(p, id);
  if (!b) return "";
  if (b.offers?.length) return T("Buyers are already waiting. Look at their offers.", "Buyers don dey wait. Look their offer.");
  const fee = Math.round(valuation(p, b) * 0.01);
  if (p.money < fee) return T(`A broker's fee of ${naira(fee)} is due first.`, `Broker fee ${naira(fee)} must enter first.`);
  transact(p, { amount: -fee, reason: T(`Broker fee for selling ${b.name}`, `Broker fee for selling ${b.name}`), category: "business" });
  const v = valuation(p, b);
  const appeal = 0.85 + b.quality / 300 + (b.fame ?? 20) / 400 + (b.lastMonthProfit > 0 ? 0.08 : -0.08);
  const types: BizOffer["type"][] = ["lowball", "fair", chance(0.5 + (b.fame ?? 20) / 200) ? "keen" : "instalment"];
  if (chance(0.35)) types.push("lowball");
  b.offers = types.map((type) => {
    const mult = type === "lowball" ? rand(0.45, 0.72) : type === "fair" ? rand(0.82, 1.02) : type === "keen" ? rand(1.02, 1.32) : rand(0.95, 1.2);
    const notes = BUYER_NOTES[type];
    return { id: uid(), buyer: randomName(p.tribe, chance(0.5) ? "male" : "female"), type, amount: Math.round(v * mult * appeal), patience: type === "keen" ? 1 : 2, note: notes[Math.floor(rand(0, notes.length))] };
  });
  return T("Word gets around. Buyers come to look at the business.", "Word don waka. Buyers come look the business.");
}

export function haggleOffer(p: Player, id: string, offerId: string): string {
  const b = find(p, id);
  const o = b?.offers?.find((x) => x.id === offerId);
  if (!b || !o) return "";
  if (o.patience <= 0 || chance(0.22)) {
    b.offers = b.offers!.filter((x) => x.id !== offerId);
    return T(`${o.buyer} walks away: 'I do not have time for this.'`, `${o.buyer} waka comot: 'I no get time for this one.'`);
  }
  o.patience -= 1;
  if (chance(o.type === "keen" ? 0.75 : 0.55)) { o.amount = Math.round(o.amount * rand(1.06, 1.16)); return T(`${o.buyer} raises the offer to ${naira(o.amount)}.`, `${o.buyer} raise offer reach ${naira(o.amount)}.`); }
  return T(`${o.buyer} will not move: 'That is my price.'`, `${o.buyer} no move: 'Na my price be that.'`);
}

export function acceptOffer(p: Player, id: string, offerId: string): string {
  const i = p.businesses.findIndex((x) => x.id === id && x.status === "open");
  if (i < 0) return "";
  const b = p.businesses[i];
  const o = b.offers?.find((x) => x.id === offerId);
  if (!o) return "";
  let paid = o.amount;
  let extra = "";
  if (o.type === "instalment") {
    paid = Math.round(o.amount * 0.5);
    if (chance(0.7)) { p.pendingSale = { amount: o.amount - paid, months: 6, from: o.buyer }; extra = T(` The rest (${naira(o.amount - paid)}) is due in six months.`, ` The rest (${naira(o.amount - paid)}) go land after six months.`); }
    else extra = T(" The second half never arrives. You have lost it.", " The second half no come. E don loss.");
  }
  transact(p, { amount: paid, reason: T(`Sold ${b.name} to ${o.buyer}`, `Sell ${b.name} to ${o.buyer}`), category: "business" });
  p.businesses.splice(i, 1);
  return T(`You sell ${b.name} to ${o.buyer} for ${naira(paid)} up front.${extra}`, `You sell ${b.name} to ${o.buyer} for ${naira(paid)} first.${extra}`);
}

export function declineOffers(p: Player, id: string): string {
  const b = find(p, id);
  if (!b) return "";
  b.offers = undefined;
  return T("You turn the buyers away.", "You send the buyers go.");
}

/** Pays the second half of an instalment sale. Called once a month. */
export function saleMonth(p: Player, lines: string[]) {
  const s = p.pendingSale;
  if (!s) return;
  s.months -= 1;
  if (s.months > 0) return;
  transact(p, { amount: s.amount, reason: T(`Balance of the sale from ${s.from}`, `Balance of sale from ${s.from}`), category: "business" });
  lines.push(T(`${s.from} pays the balance: ${naira(s.amount)}.`, `${s.from} pay the balance: ${naira(s.amount)}.`));
  p.pendingSale = undefined;
}

export function sellBusiness(p: Player, id: string): string {
  return listForSale(p, id);
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

const NEED_TIPS: { en: string; pcm: string }[] = [
  { en: "Quality is slipping. Buy better stock or expand.", pcm: "Quality dey fall. Buy better stock or expand." },
  { en: "Customers queue and walk away. Hire another worker.", pcm: "Customers dey queue and dey waka go. Hire another worker." },
  { en: "Few people know your business. Try advertising.", pcm: "Small people know your business. Try advert." },
  { en: "Staff are unhappy and may quit or steal. Raise their pay.", pcm: "Staff no happy and fit quit or thief. Raise their pay." },
  { en: "Losing money for months. Fix pricing and cut costs before it closes.", pcm: "You dey lose money for months. Fix price and cut cost before e close." },
  { en: "Premium prices need premium quality. Improve stock or lower prices.", pcm: "Premium price need premium quality. Improve stock or reduce price." },
];

/** Monthly revenue, costs and owner draw for every business. */
export function businessMonth(p: Player, lines: string[]) {
  for (const b of p.businesses) {
    if (b.status !== "open") continue;
    ensureCrew(p, b);
    const k = BIZ_BY_ID[b.kind];
    const st = STATE_BY_ID[b.stateId];
    const crew = b.crew!;
    const notes: BizReport["notes"] = [];
    const season = k.seasonal ? ([6, 7, 8, 9, 10].includes(p.month) ? 1.9 : 0.45) : p.month === 12 ? 1.25 : p.month === 1 ? 0.85 : 1;
    const demand = 0.55 + st.opp / 9;
    const away = !b.manager && p.job && !jobIsSelf(p) ? 0.88 : 1; // a full-time job elsewhere leaves less time for the shop
    const mgmt = businessMultiplier(p) * (b.manager ? 0.88 : 1) * away * (p.prison > 0 && !b.manager ? 0.3 : 1);
    const mods = modsOf(b);
    const prof = profileOf(b.kind);
    // Each role lifts sales in its own way. A missing essential role hurts.
    let lift = 1;
    let missing: string | null = null;
    for (const r of prof.roles) {
      const mine = crew.filter((w) => (w.role ?? prof.roles[0].id) === r.id).sort((a, c) => c.skill - a.skill).slice(0, r.per * b.level);
      lift += r.weight * mine.reduce((s, w) => s + 0.5 + w.skill / 100, 0);
      if (r.need && prof.start.includes(r.id) && mine.length === 0 && (b.crew?.length ?? 0) + (b.staff ?? 0) > 0 && !missing) missing = T(r.label[0], r.label[1]);
    }
    const pm = mods.pm;
    const volume = Math.pow(pm, -1.3);
    const ads = mods.ads;
    const fameF = 0.7 + (b.fame ?? 20) / 160;
    let rev = sc(p, k.baseRevenue) * Math.pow(b.level, 1.12) * demand * (b.quality / 60) * lift * season * rand(0.62, 1.38) * mgmt * 0.42 * volume * pm * (1 + 0.1 * ads) * fameF * mods.rev * (1 + (b.boost ?? 0)) * (missing ? 0.8 : 1);
    let stockMult = mods.cost;
    if (missing) notes.push({ en: `You have no ${missing.toLowerCase()}. Sales are suffering.`, pcm: `You no get ${missing.toLowerCase()}. Sales dey suffer.` });
    let extra = 0;
    // Something happens most months.
    const r = rand(0, 1);
    if (r < 0.06) { rev *= 1.3; notes.push({ en: "A rush of customers: a good month.", pcm: "Customers plenty: good month." }); b.fame = clamp((b.fame ?? 20) + 2); }
    else if (r < 0.1) { extra += rev * 0.05; notes.push({ en: "Power cuts: diesel ate into the takings.", pcm: "Light go: diesel chop your money." }); }
    else if (r < 0.14) { stockMult *= 1.18; notes.push({ en: "Suppliers raised prices.", pcm: "Suppliers raise price." }); }
    else if (r < 0.17) { b.fame = clamp((b.fame ?? 20) - 5); notes.push({ en: "A rival opened nearby and took some customers.", pcm: "Rival open near you and carry some customers." }); }
    else if (r < 0.2 && ads > 0) { b.fame = clamp((b.fame ?? 20) + 9); rev *= 1.15; notes.push({ en: "A post about you went viral.", pcm: "Post about you blow for social media." }); }
    else if (r < 0.2 + 0.025 * mods.risk && !b.manager) { extra += rev * 0.18; notes.push({ en: "Thieves broke in at night.", pcm: "Thieves enter at night." }); }
    const stock = (rev / pm) * k.stockPct * stockMult;
    const wages = crew.reduce((s, w) => s + workerPay(p, b, w), 0);
    const adSpend = ads * rev * 0.035;
    const overheads = rev * Math.max(0.04, 0.12 + mods.over);
    const tax = rev * 0.01;
    let net = rev - stock - wages - overheads - tax - extra - adSpend;
    if (p.month === 1) net -= (sc(p, k.rent) * st.cost) * Math.max(1, b.level * 0.8) * mods.rent;
    if (b.manager) net -= Math.max(0, net) * 0.15;
    // People problems
    for (const w of crew) {
      w.loyalty = clamp(w.loyalty + (w.wage - 1) * 3 - 0.45 + (net < 0 ? -0.6 : 0.1));
    }
    const quitter = crew.find((w) => w.loyalty < 22 && chance(0.18));
    if (quitter) { crew.splice(crew.indexOf(quitter), 1); b.staff = crew.length; b.quality = clamp(b.quality - 4); notes.push({ en: `${quitter.name} quit.`, pcm: `${quitter.name} don quit.` }); }
    const thief = crew.find((w) => w.loyalty < 38 && chance(0.1 * mods.risk));
    if (thief && !b.manager) { const lost = rev * 0.07; net -= lost; thief.loyalty = clamp(thief.loyalty - 5); notes.push({ en: `Stock is missing. ${thief.name} may be the cause.`, pcm: `Stock don miss. ${thief.name} fit be the cause.` }); }
    transact(p, { amount: net, reason: T(`${b.name}: ${net >= 0 ? "profit" : "loss"} for the month`, `${b.name}: ${net >= 0 ? "profit" : "loss"} for the month`), category: "business", recurring: b.id });
    b.profit += net;
    b.lastMonthProfit = net;
    b.lossStreak = net < 0 ? b.lossStreak + 1 : 0;
    const drift = mods.q - (missing ? 0.4 : 0);
    b.quality = clamp(b.quality + (b.manager ? -0.4 : -0.1) + (net > 0 ? 0.15 : -0.2) + drift);
    // Fame grows with quality and advertising, and fades.
    let fame = (b.fame ?? 20) + (b.quality - 50) / 40 + ads * 0.6 - 0.35 + (pm < 1 ? 0.5 : 0) + mods.fame;
    if (pm > 1.1 && b.quality < 62) fame -= 1.2;
    b.fame = clamp(fame);
    // Report and a hint for next time
    let tip: BizReport["tip"] = null;
    if (b.quality < 48) tip = NEED_TIPS[0];
    else if (pm > 1.1 && b.quality < 62) tip = NEED_TIPS[5];
    else if (b.lossStreak >= 3) tip = NEED_TIPS[4];
    else if (crew.some((w) => w.loyalty < 35)) tip = NEED_TIPS[3];
    else if ((b.fame ?? 0) > 55 && crew.length < b.level * 2) tip = NEED_TIPS[1];
    else if (ads === 0 && (b.fame ?? 0) < 30) tip = NEED_TIPS[2];
    b.report = { rev: Math.round(rev), stock: Math.round(stock), wages: Math.round(wages), ads: Math.round(adSpend), other: Math.round(overheads + tax + extra), net: Math.round(net), notes, tip };
    b.yr = { rev: (b.yr?.rev ?? 0) + rev, net: (b.yr?.net ?? 0) + net };
    if (p.month === 12) { (b.hist ??= []).push({ age: p.age, rev: Math.round(b.yr.rev), net: Math.round(b.yr.net) }); if (b.hist.length > 8) b.hist.shift(); b.yr = { rev: 0, net: 0 }; }
    if (b.lossStreak >= 9) {
      b.status = "closed";
      lines.push(T(`${b.name} shut down after months of losses.`, `${b.name} don shut after months of loss.`));
      bump(p, "stress", 10);
      bump(p, "happiness", -8);
    }
  }
  p.businesses = p.businesses.filter((b) => b.status === "open");
}

const jobIsSelf = (p: Player) => Boolean(p.job && JOB_BY_ID[p.job.id]?.selfEmployed);

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

