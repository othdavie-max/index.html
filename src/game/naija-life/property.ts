import { HOUSE_KINDS, STATE_BY_ID } from "./data";
import { LOCATIONS, locationOf, marketMid } from "./locations";
import { bump, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { mortgageQuote, takeMortgage } from "./mortgage";
import type { House, HouseKind, Listing, Loan, Player } from "./types";
import { T, chance, naira, pick, rand, uid } from "./util";

/** Log-uniform price inside a range, scaled to today's prices. */
function priceIn(p: Player, range: [number, number]): number {
  const t = rand(0, 1);
  return Math.round(range[0] * Math.pow(range[1] / range[0], t) * Math.pow(p.index, 0.95));
}

/** Houses on the market this year: a spread from cheap northern plots to Banana Island. */
export function refreshListings(p: Player) {
  const list: Listing[] = [];
  const perTier: Record<number, number> = { 5: 2, 4: 3, 3: 4, 2: 4, 1: 3 };
  for (const [tierStr, n] of Object.entries(perTier)) {
    const pool = LOCATIONS.filter((l) => l.tier === Number(tierStr));
    for (let i = 0; i < n; i++) {
      const loc = pick(pool);
      const kind = pick(Object.keys(loc.kinds) as HouseKind[]);
      const range = loc.kinds[kind]!;
      const market = priceIn(p, range);
      const condition = pick(["good", "good", "fair", "rundown"] as const);
      const factor = condition === "good" ? rand(1, 1.12) : condition === "fair" ? rand(0.85, 0.95) : rand(0.58, 0.74);
      const worth = condition === "good" ? 1 : condition === "fair" ? 0.96 : 0.82;
      list.push({ id: uid(), loc: loc.id, stateId: loc.state, kind, condition, price: Math.round(market * factor), value: Math.round(market * worth) });
    }
  }
  p.listings = list;
}

/** Yearly price movement for a property, following its neighbourhood. */
export function houseYear(p: Player, h: House, inflation: number, lines: string[]) {
  const loc = locationOf(h.loc);
  if (!loc) { h.value = Math.round(h.value * (1 + inflation * 0.9)); return; }
  const move = inflation * 0.9 + loc.growth + rand(-1, 1) * loc.vol;
  h.value = Math.round(h.value * Math.max(0.5, 1 + move));
  if (chance(loc.risk * 0.5)) {
    const hit = rand(0.6, 0.88);
    h.value = Math.round(h.value * hit);
    lines.push(T(`Trouble in ${loc.name}: property values there fell sharply. Yours is down ${Math.round((1 - hit) * 100)}%.`, `Wahala for ${loc.name}: property value fall well well. Yours don drop ${Math.round((1 - hit) * 100)}%.`));
  }
}

// ---------------------------------------------------------------------------
// Developing land: build on a plot and sell or rent the finished property.
// ---------------------------------------------------------------------------
export function developOptions(h: House): HouseKind[] {
  const loc = locationOf(h.loc);
  if (!loc || h.kind !== "land" || h.project) return [];
  return (Object.keys(loc.kinds) as HouseKind[]).filter((k) => k !== "land");
}
export function developCost(p: Player, h: House, kind: HouseKind): number {
  const loc = locationOf(h.loc);
  const mid = loc ? marketMid(loc, kind) : null;
  return mid ? Math.round(mid * 0.5 * Math.pow(p.index, 0.95)) : 0;
}
export function developBlock(p: Player, h: House, kind: HouseKind): string | null {
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (!developOptions(h).includes(kind)) return T("Not possible on this plot", "E no fit for this plot");
  const c = developCost(p, h, kind);
  return p.money < c ? T(`You need ${naira(c)}`, `You need ${naira(c)}`) : null;
}
export function developLand(p: Player, id: string, kind: HouseKind): string {
  const h = p.houses.find((x) => x.id === id);
  if (!h) return "";
  const b = developBlock(p, h, kind);
  if (b) return b;
  const cost = developCost(p, h, kind);
  transact(p, { amount: -cost, reason: T(`Construction of a ${HOUSE_KINDS[kind].label.toLowerCase()}`, `Construction of ${HOUSE_KINDS[kind].label.toLowerCase()}`), category: "asset" });
  const big = ["mansion", "plaza", "flats"].includes(kind);
  h.project = { kind, readyAge: p.age + (big ? 2 : 1), cost };
  h.use = "empty";
  return T(`Construction begins. It will take about ${big ? 2 : 1} year${big ? "s" : ""}.`, `Construction don start. E go take like ${big ? 2 : 1} year${big ? "s" : ""}.`);
}
/** Finished projects hand over, sometimes late, sometimes with a cost overrun. */
export function completeProjects(p: Player, lines: string[]) {
  for (const h of p.houses) {
    if (!h.project || h.project.readyAge > p.age) continue;
    const loc = locationOf(h.loc);
    if (chance(0.15)) {
      h.project.readyAge += 1;
      const extra = Math.round(h.project.cost * rand(0.08, 0.2));
      transact(p, { amount: -Math.min(extra, Math.max(0, p.money)), reason: T("Cost overrun on your building project", "Extra cost for your building project"), category: "asset" });
      lines.push(T("Your building project runs late and over budget.", "Your building project late and cost don pass budget."));
      continue;
    }
    const mid = loc ? marketMid(loc, h.project.kind) : null;
    h.kind = h.project.kind;
    h.value = Math.round((mid ?? h.project.cost * 1.3) * Math.pow(p.index, 0.95) * rand(0.95, 1.18));
    lines.push(T(`Your ${HOUSE_KINDS[h.kind].label.toLowerCase()} in ${loc?.name ?? STATE_BY_ID[h.state].name} is finished and worth ${naira(h.value)}.`, `Your ${HOUSE_KINDS[h.kind].label.toLowerCase()} for ${loc?.name ?? STATE_BY_ID[h.state].name} don finish and e worth ${naira(h.value)}.`));
    delete h.project;
    h.use = "empty";
  }
}

export type PurchaseMode = "cash" | "mortgage" | "cosign" | "plan";

const PLAN_RATE = 0.026;
const PLAN_MONTHS = 36;

/** Developer payment plan: a small deposit, 36 monthly instalments, the house is yours at the end. Anyone can sign, but it is expensive. */
export function planQuote(p: Player, l: Listing) {
  const down = Math.round(l.price * 0.15);
  const principal = l.price - down;
  const r = PLAN_RATE;
  const monthly = Math.round((principal * r) / (1 - Math.pow(1 + r, -PLAN_MONTHS)));
  const block = p.age < 18 ? T("Adults only", "Na only adult") : p.money < down ? T(`You need ${naira(down)} deposit`, `You need ${naira(down)} for deposit`) : p.loans.some((x) => x.houseId && x.status === "active" && x.lenderType === "other") ? T("You already have a payment plan", "You don get payment plan already") : null;
  return { down, monthly, total: monthly * PLAN_MONTHS, interest: monthly * PLAN_MONTHS - principal, months: PLAN_MONTHS, block };
}

export function listingBlock(p: Player, l: Listing, mode: PurchaseMode, years = 15): string | null {
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (p.age < 18) return T("Adults only", "Na only adult");
  if (stateOf(p).abroad) return T("Not available abroad", "No dey available abroad");
  if (mode === "cash") return p.money < l.price ? T(`You need ${naira(l.price)}`, `You need ${naira(l.price)} first`) : null;
  if (mode === "plan") return planQuote(p, l).block;
  if (l.kind === "land") return T("Banks do not lend on bare land", "Bank no dey lend for bare land");
  return mortgageQuote(p, l.kind, years, { price: l.price, cosign: mode === "cosign" }).block;
}

export function buyListing(p: Player, id: string, mode: PurchaseMode, years = 15): string {
  const l = p.listings?.find((x) => x.id === id);
  if (!l) return "";
  const block = listingBlock(p, l, mode, years);
  if (block) return block;
  const label = HOUSE_KINDS[l.kind].label.toLowerCase();
  const owns = p.houses.some((h) => h.state === l.stateId && h.use === "owner");
  const move = () => { p.houses.find((h) => h.use === "owner" && h.state === l.stateId); };
  void move;
  let msg: string;
  if (mode === "cash") {
    transact(p, { amount: -l.price, reason: T(`Bought a ${label}`, `Bought ${label}`), category: "asset" });
    const h: House = { id: uid(), state: l.stateId, kind: l.kind, value: l.value, use: owns ? "empty" : "owner", loc: l.loc };
    p.houses.push(h);
    msg = T(`You bought a ${label} in ${STATE_BY_ID[l.stateId].name} for ${naira(l.price)}.`, `You buy ${label} for ${STATE_BY_ID[l.stateId].name} for ${naira(l.price)}.`);
  } else if (mode === "plan") {
    const q = planQuote(p, l);
    transact(p, { amount: -q.down, reason: T(`Deposit on a ${label}`, `Deposit for ${label}`), category: "asset" });
    const h: House = { id: uid(), state: l.stateId, kind: l.kind, value: l.value, use: owns ? "empty" : "owner", loc: l.loc };
    const now = monthIndex(p);
    const loan: Loan = {
      id: uid(), direction: "owed", lenderType: "other", lenderName: T("Developer payment plan", "Developer payment plan"), principal: l.price - q.down, balance: l.price - q.down,
      apr: PLAN_RATE * 12, fee: 0, termMonths: PLAN_MONTHS, monthly: q.monthly, startAge: p.age, startMonth: p.month, informal: false, missed: 0, status: "active",
      lastCharged: now, houseId: h.id, note: T(`Payment plan on a ${label}`, `Payment plan for ${label}`),
    };
    h.loanId = loan.id;
    p.loans.push(loan);
    p.houses.push(h);
    msg = T(`You sign a payment plan: ${naira(q.down)} down, then ${naira(q.monthly)} a month for 3 years. Miss payments and you lose the house and the deposit.`, `You sign payment plan: ${naira(q.down)} down, then ${naira(q.monthly)} every month for 3 years. If you miss payment, you go lose house and deposit.`);
  } else {
    msg = takeMortgage(p, l.kind, years, { price: l.price, value: l.value, cosign: mode === "cosign" });
    const last = p.houses[p.houses.length - 1];
    if (last && last.loanId) { last.state = l.stateId; last.loc = l.loc; }
  }
  if (mode === "cash" || mode === "plan") { p.prestige += l.kind === "flats" ? 2 : 1; bump(p, "happiness", 5); }
  p.listings = p.listings?.filter((x) => x.id !== id);
  void chance;
  return msg;
}
