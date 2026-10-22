import { STATE_BY_ID } from "./data";
import { monthIndex, transact } from "./ledger";
import { adjustCredit, previewLoan, takeLoan, type LoanOffer } from "./loans";
import { stateOf } from "./helpers";
import type { Player, Vehicle } from "./types";
import { chance, clamp, naira, rand, uid } from "./util";

export interface VehicleModel {
  id: string;
  name: string;
  kind: "used" | "new";
  /** Price in base-year naira. */
  price: number;
  role: "personal" | "taxi" | "ridehail";
  /** Monthly gross for taxi-type vehicles, base-year naira. */
  revenue?: number;
  luxury?: boolean;
}

export const VEHICLE_MODELS: VehicleModel[] = [
  { id: "keke", name: "Keke NAPEP tricycle", kind: "used", price: 2_800_000, role: "taxi", revenue: 260_000 },
  { id: "bus", name: "Used commercial bus", kind: "used", price: 9_500_000, role: "taxi", revenue: 620_000 },
  { id: "corolla-used", name: "Tokunbo Toyota Corolla", kind: "used", price: 5_500_000, role: "personal" },
  { id: "accord-used", name: "Used Honda Accord", kind: "used", price: 4_600_000, role: "personal" },
  { id: "lexus-used", name: "Used Lexus RX 350", kind: "used", price: 14_000_000, role: "personal", luxury: true },
  { id: "camry-new", name: "Brand-new Toyota Camry", kind: "new", price: 38_000_000, role: "personal" },
  { id: "lexus-new", name: "Brand-new Lexus RX", kind: "new", price: 95_000_000, role: "personal", luxury: true },
  { id: "gwagon", name: "Mercedes G-Wagon", kind: "new", price: 260_000_000, role: "personal", luxury: true },
];

export const priceOf = (p: Player, m: VehicleModel) => Math.round(m.price * Math.pow(p.index, 0.95));

export function addVehicle(p: Player, m: VehicleModel, opts: { value?: number; role?: Vehicle["role"] } = {}): Vehicle {
  const v: Vehicle = {
    id: uid(), modelId: m.id, name: m.name, kind: m.kind, value: opts.value ?? priceOf(p, m), condition: m.kind === "new" ? 98 : Math.round(rand(55, 80)),
    role: opts.role ?? m.role, insuredUntil: 0, bought: monthIndex(p), luxury: Boolean(m.luxury),
  };
  p.vehicles.push(v);
  return v;
}

/** The player's transport costs fall when they drive. */
export const ownsPersonalCar = (p: Player) => p.vehicles.some((v) => v.role === "personal" && v.condition > 10);

export function buyVehicle(p: Player, modelId: string, financed: boolean): string {
  const m = VEHICLE_MODELS.find((x) => x.id === modelId);
  if (!m) return "";
  if (p.age < 18) return "You must be 18 to buy a vehicle.";
  const price = priceOf(p, m);
  if (!financed) {
    if (p.money < price) return `You need ${naira(price)}.`;
    transact(p, { amount: -price, reason: `Bought a ${m.name}`, category: "vehicle" });
    addVehicle(p, m);
    return `You bought a ${m.name} for ${naira(price)}.`;
  }
  const down = Math.round(price * 0.3);
  if (p.money < down) return `You need a 30% deposit of ${naira(down)}.`;
  const principal = price - down;
  const offer: LoanOffer = { id: "autoloan", name: "Unity Bank auto loan", type: "bank", blurb: "", monthlyRate: 0.022, feePct: 0.01, minTerm: 12, maxTerm: 36, limit: principal, lateFeePct: 0.03, eligible: null };
  if (p.credit < 45) return "The bank declined your auto loan (credit score too low).";
  transact(p, { amount: -down, reason: `Deposit on a ${m.name}`, category: "vehicle" });
  const msg = takeLoan(p, offer, principal, 24);
  // The loan proceeds go straight to the dealer, not to your wallet.
  transact(p, { amount: -principal, reason: `Dealer paid by the bank for your ${m.name}`, category: "vehicle" });
  const loan = p.loans[p.loans.length - 1];
  const v = addVehicle(p, m);
  v.loanId = loan.id;
  return `${msg} You drove home in your ${m.name}.`;
}

export function previewAutoLoan(p: Player, modelId: string) {
  const m = VEHICLE_MODELS.find((x) => x.id === modelId);
  if (!m) return null;
  const price = priceOf(p, m);
  const down = Math.round(price * 0.3);
  const offer: LoanOffer = { id: "autoloan", name: "Unity Bank auto loan", type: "bank", blurb: "", monthlyRate: 0.022, feePct: 0.01, minTerm: 12, maxTerm: 36, limit: price - down, lateFeePct: 0.03, eligible: null };
  return { down, ...previewLoan(p, offer, price - down, 24) };
}

export function sellVehicle(p: Player, id: string): string {
  const i = p.vehicles.findIndex((v) => v.id === id);
  if (i < 0) return "";
  const v = p.vehicles[i];
  const price = Math.round(v.value * (0.7 + (v.condition / 100) * 0.2));
  // Pay off any finance first.
  const loan = v.loanId ? p.loans.find((l) => l.id === v.loanId && l.status !== "paid") : undefined;
  let note = "";
  if (loan) {
    const settle = Math.min(loan.balance, price);
    transact(p, { amount: price, reason: `Sold your ${v.name}`, category: "vehicle" });
    transact(p, { amount: -settle, reason: `Paid off the loan on your ${v.name}`, category: "repayment" });
    loan.balance -= settle;
    if (loan.balance <= 0.5) { loan.balance = 0; loan.status = "paid"; adjustCredit(p, 3); }
    note = ` The remaining loan balance is ${naira(loan.balance)}.`;
  } else {
    transact(p, { amount: price, reason: `Sold your ${v.name}`, category: "vehicle" });
  }
  p.vehicles.splice(i, 1);
  return `You sold your ${v.name} for ${naira(price)}.${note}`;
}

export function repairCost(p: Player, v: Vehicle): number {
  return Math.round(v.value * (0.04 + (100 - v.condition) / 1000));
}

export function repairVehicle(p: Player, id: string): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const cost = repairCost(p, v);
  if (p.money < cost) return `You need ${naira(cost)} for repairs.`;
  transact(p, { amount: -cost, reason: `Repairs on your ${v.name}`, category: "vehicle" });
  v.condition = clamp(v.condition + 25, 0, 98);
  return `Your ${v.name} is back in shape.`;
}

export function insureVehicle(p: Player, id: string): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const premium = Math.round(v.value * 0.04);
  if (p.money < premium) return `Insurance costs ${naira(premium)} a year.`;
  transact(p, { amount: -premium, reason: `Insurance for your ${v.name}`, category: "vehicle" });
  v.insuredUntil = monthIndex(p) + 12;
  return `Your ${v.name} is insured for a year.`;
}

export function setRole(p: Player, id: string, role: Vehicle["role"]): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  if (role !== "personal" && !["keke", "bus", "corolla-used", "accord-used", "camry-new"].includes(v.modelId) ) return "This vehicle cannot be used for transport business.";
  v.role = role;
  return role === "personal" ? `${v.name} is for personal use again.` : role === "taxi" ? `${v.name} now runs as a commercial vehicle.` : `${v.name} is signed up for ride-hailing.`;
}

export const isInsured = (p: Player, v: Vehicle) => v.insuredUntil > monthIndex(p);

/** Monthly running costs and (for taxis) income. */
export function vehicleMonth(p: Player, lines: string[]) {
  const st = stateOf(p);
  for (const v of p.vehicles) {
    const idx = Math.pow(p.index, 0.92);
    if (v.role === "personal") {
      const fuel = (v.luxury ? 120_000 : 45_000) * idx * (0.8 + st.cost / 4);
      transact(p, { amount: -fuel, reason: `Fuel for your ${v.name}`, category: "vehicle", recurring: v.id });
      transact(p, { amount: -(v.luxury ? 60_000 : 18_000) * idx, reason: `Maintenance on your ${v.name}`, category: "vehicle", recurring: v.id });
    } else {
      const model = VEHICLE_MODELS.find((m) => m.id === v.modelId);
      const base = (model?.revenue ?? 420_000) * idx * (0.6 + STATE_BY_ID[p.state].opp / 12) * (v.condition / 100) * rand(0.6, 1.25);
      const share = p.job ? 0.55 : 0.88; // a hired driver keeps part of it if you work elsewhere
      transact(p, { amount: base * share, reason: `${v.role === "ridehail" ? "Ride-hailing" : "Taxi"} income from your ${v.name}`, category: "business", recurring: v.id });
      transact(p, { amount: -base * 0.32, reason: `Fuel and servicing for your ${v.name}`, category: "vehicle", recurring: v.id });
    }
    if (p.month === 1) {
      v.value = Math.round(v.value * (v.kind === "new" ? 0.86 : 0.9));
      v.condition = clamp(v.condition - Math.round(rand(4, 12)), 0, 100);
    }
    if (v.condition < 25 && chance(0.12)) {
      lines.push(`Your ${v.name} is in bad shape and keeps breaking down.`);
      v.condition = clamp(v.condition - 4);
    }
  }
}
