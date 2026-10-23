import { STATE_BY_ID } from "./data";
import { monthIndex, transact } from "./ledger";
import { adjustCredit, previewLoan, takeLoan, type LoanOffer } from "./loans";
import { I, bump, luckBonus, stateOf } from "./helpers";
import type { Player, Vehicle } from "./types";
import { T, chance, clamp, naira, rand, uid } from "./util";

export type VehicleCat = "taxi" | "car" | "suv" | "luxury" | "supercar" | "hypercar" | "helicopter" | "jet" | "boat" | "yacht";

export interface VehicleModel {
  id: string;
  name: string;
  kind: "used" | "new";
  cat: VehicleCat;
  /** Drawing used in the dealership and garage. */
  art: string;
  /** Body colour for the drawing. */
  color: string;
  /** Price in base-year naira. */
  price: number;
  role: "personal" | "taxi" | "ridehail";
  /** Monthly gross for taxi-type vehicles, base-year naira. */
  revenue?: number;
  luxury?: boolean;
  /** Share of the price spent each month on fuel, crew, insurance and servicing. */
  upkeep?: number;
  /** Yearly change in value as a multiplier (1 = holds value). */
  holds?: number;
  /** Share of the price earned each month when rented out or chartered. */
  rentYield?: number;
}

const M = (m: Omit<VehicleModel, "name"> & { en: string; pcm?: string }): VehicleModel => ({ ...m, get name() { return T(m.en, m.pcm ?? m.en); } }) as VehicleModel;

export const VEHICLE_MODELS: VehicleModel[] = [
  M({ id: "okada", en: "Okada motorbike", pcm: "Okada bike", kind: "used", cat: "taxi", art: "bike", color: "#d97706", price: 1_400_000, role: "taxi", revenue: 150_000 }),
  M({ id: "keke", en: "Keke NAPEP tricycle", kind: "used", cat: "taxi", art: "keke", color: "#facc15", price: 3_500_000, role: "taxi", revenue: 280_000 }),
  M({ id: "bus", en: "Used commercial bus", pcm: "Tokunbo commercial bus", kind: "used", cat: "taxi", art: "bus", color: "#f59e0b", price: 14_000_000, role: "taxi", revenue: 680_000 }),
  M({ id: "accord-used", en: "Used Honda Accord", pcm: "Tokunbo Honda Accord", kind: "used", cat: "car", art: "sedan", color: "#94a3b8", price: 11_000_000, role: "personal", rentYield: 0.022 }),
  M({ id: "corolla-used", en: "Tokunbo Toyota Corolla", kind: "used", cat: "car", art: "sedan", color: "#e2e8f0", price: 14_000_000, role: "personal", rentYield: 0.024 }),
  M({ id: "camry-new", en: "Brand-new Toyota Camry", kind: "new", cat: "car", art: "sedan", color: "#1e3a8a", price: 65_000_000, role: "personal", rentYield: 0.02, holds: 0.86 }),
  M({ id: "lexus-used", en: "Used Lexus RX 350", pcm: "Tokunbo Lexus RX 350", kind: "used", cat: "suv", art: "suv", color: "#475569", price: 38_000_000, role: "personal", luxury: true, rentYield: 0.02 }),
  M({ id: "hilux", en: "Toyota Hilux", kind: "new", cat: "suv", art: "pickup", color: "#b91c1c", price: 95_000_000, role: "personal", rentYield: 0.02, holds: 0.88 }),
  M({ id: "lexus-new", en: "Brand-new Lexus RX", kind: "new", cat: "suv", art: "suv", color: "#0f172a", price: 140_000_000, role: "personal", luxury: true, rentYield: 0.018, holds: 0.86 }),
  M({ id: "rangerover", en: "Range Rover Autobiography", kind: "new", cat: "luxury", art: "suv", color: "#14532d", price: 320_000_000, role: "personal", luxury: true, rentYield: 0.016, holds: 0.86 }),
  M({ id: "gwagon", en: "Mercedes G-Wagon", kind: "new", cat: "luxury", art: "gwagon", color: "#111827", price: 380_000_000, role: "personal", luxury: true, rentYield: 0.016, holds: 0.88 }),
  M({ id: "benz-s", en: "Mercedes S-Class", kind: "new", cat: "luxury", art: "sedan", color: "#1f2937", price: 280_000_000, role: "personal", luxury: true, rentYield: 0.016, holds: 0.84 }),
  M({ id: "bentley", en: "Bentley Continental GT", kind: "new", cat: "luxury", art: "coupe", color: "#0e7490", price: 950_000_000, role: "personal", luxury: true, rentYield: 0.012, holds: 0.88 }),
  M({ id: "rolls", en: "Rolls-Royce Cullinan", kind: "new", cat: "luxury", art: "suv", color: "#e5e7eb", price: 1_300_000_000, role: "personal", luxury: true, rentYield: 0.012, holds: 0.9 }),
  M({ id: "urus", en: "Lamborghini Urus", kind: "new", cat: "supercar", art: "suv", color: "#eab308", price: 900_000_000, role: "personal", luxury: true, rentYield: 0.012, holds: 0.92 }),
  M({ id: "huracan", en: "Lamborghini Huracán", pcm: "Lamborghini Huracán", kind: "new", cat: "supercar", art: "supercar", color: "#f59e0b", price: 850_000_000, role: "personal", luxury: true, rentYield: 0.012, holds: 0.93 }),
  M({ id: "ferrari", en: "Ferrari Roma", kind: "new", cat: "supercar", art: "supercar", color: "#dc2626", price: 1_100_000_000, role: "personal", luxury: true, rentYield: 0.012, holds: 0.96 }),
  M({ id: "mclaren", en: "McLaren 720S", kind: "new", cat: "supercar", art: "supercar", color: "#f97316", price: 1_200_000_000, role: "personal", luxury: true, rentYield: 0.011, holds: 0.95 }),
  M({ id: "bugatti", en: "Bugatti Chiron", kind: "new", cat: "hypercar", art: "hypercar", color: "#1d4ed8", price: 6_000_000_000, role: "personal", luxury: true, upkeep: 0.0025, holds: 1.04 }),
  M({ id: "r44", en: "Robinson R44 helicopter", pcm: "Robinson R44 helicopter", kind: "new", cat: "helicopter", art: "heli", color: "#f8fafc", price: 900_000_000, role: "personal", luxury: true, upkeep: 0.008, rentYield: 0.02, holds: 0.93 }),
  M({ id: "bell407", en: "Bell 407 helicopter", pcm: "Bell 407 helicopter", kind: "new", cat: "helicopter", art: "heli", color: "#1e293b", price: 4_200_000_000, role: "personal", luxury: true, upkeep: 0.008, rentYield: 0.02, holds: 0.94 }),
  M({ id: "citation", en: "Cessna Citation light jet", pcm: "Cessna Citation small jet", kind: "new", cat: "jet", art: "jet", color: "#f8fafc", price: 6_500_000_000, role: "personal", luxury: true, upkeep: 0.007, rentYield: 0.02, holds: 0.93 }),
  M({ id: "challenger", en: "Bombardier Challenger jet", pcm: "Bombardier Challenger jet", kind: "new", cat: "jet", art: "jet", color: "#e2e8f0", price: 45_000_000_000, role: "personal", luxury: true, upkeep: 0.006, rentYield: 0.018, holds: 0.94 }),
  M({ id: "g650", en: "Gulfstream G650 jet", pcm: "Gulfstream G650 jet", kind: "new", cat: "jet", art: "jet", color: "#0f172a", price: 130_000_000_000, role: "personal", luxury: true, upkeep: 0.005, rentYield: 0.016, holds: 0.95 }),
  M({ id: "speedboat", en: "Speedboat", pcm: "Speedboat", kind: "new", cat: "boat", art: "boat", color: "#0ea5e9", price: 150_000_000, role: "personal", luxury: true, upkeep: 0.005, rentYield: 0.025, holds: 0.92 }),
  M({ id: "cruiser", en: "Cabin cruiser", pcm: "Cabin cruiser", kind: "new", cat: "boat", art: "boat", color: "#f1f5f9", price: 800_000_000, role: "personal", luxury: true, upkeep: 0.005, rentYield: 0.022, holds: 0.93 }),
  M({ id: "yacht", en: "Luxury yacht", pcm: "Luxury yacht", kind: "new", cat: "yacht", art: "yacht", color: "#ffffff", price: 3_000_000_000, role: "personal", luxury: true, upkeep: 0.006, rentYield: 0.02, holds: 0.94 }),
  M({ id: "superyacht", en: "Superyacht", pcm: "Superyacht", kind: "new", cat: "yacht", art: "yacht", color: "#f8fafc", price: 25_000_000_000, role: "personal", luxury: true, upkeep: 0.006, rentYield: 0.018, holds: 0.95 }),
];

export const modelOf = (id: string) => VEHICLE_MODELS.find((m) => m.id === id);
/** Cars, boats and aircraft need a licence only when you are the one driving. */
export const needsLicense = (m: VehicleModel) => ["taxi", "car", "suv", "luxury", "supercar", "hypercar"].includes(m.cat);
export const isAircraft = (m: VehicleModel | undefined) => m?.cat === "jet" || m?.cat === "helicopter";
export const isBoat = (m: VehicleModel | undefined) => m?.cat === "boat" || m?.cat === "yacht";

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
export const ownsPersonalCar = (p: Player) => Boolean(p.possessions.license) && p.vehicles.some((v) => v.role === "personal" && v.condition > 10 && needsLicense(modelOf(v.modelId) ?? VEHICLE_MODELS[3]));

export function buyVehicle(p: Player, modelId: string, financed: boolean): string {
  const m = VEHICLE_MODELS.find((x) => x.id === modelId);
  if (!m) return "";
  if (p.age < 18) return T("You must be 18 to buy a vehicle.", "You must reach 18 before you fit buy motor.");
  if (needsLicense(m) && !p.possessions.license) return T("You need a driver's licence first. Take the test in the Garage.", "You need driver's licence first. Go do the test for Garage.");
  const price = priceOf(p, m);
  if (!financed) {
    if (p.money < price) return T(`You need ${naira(price)}.`, `You need ${naira(price)}.`);
    transact(p, { amount: -price, reason: T(`Bought a ${m.name}`, `Buy ${m.name}`), category: "vehicle" });
    addVehicle(p, m);
    return T(`You bought a ${m.name} for ${naira(price)}.`, `You buy ${m.name} for ${naira(price)}.`);
  }
  const down = Math.round(price * 0.3);
  if (p.money < down) return T(`You need a 30% deposit of ${naira(down)}.`, `You need 30% deposit of ${naira(down)}.`);
  const principal = price - down;
  const offer: LoanOffer = { id: "autoloan", name: T("Unity Bank auto loan", "Unity Bank auto loan"), type: "bank", blurb: "", monthlyRate: 0.022, feePct: 0.01, minTerm: 12, maxTerm: 36, limit: principal, lateFeePct: 0.03, eligible: null };
  if (p.credit < 45) return T("The bank declined your auto loan (credit score too low).", "Bank reject your auto loan (your credit score too low).");
  transact(p, { amount: -down, reason: T(`Deposit on a ${m.name}`, `Deposit for ${m.name}`), category: "vehicle" });
  const msg = takeLoan(p, offer, principal, 24);
  // The loan proceeds go straight to the dealer, not to your wallet.
  transact(p, { amount: -principal, reason: T(`Dealer paid by the bank for your ${m.name}`, `Bank pay dealer for your ${m.name}`), category: "vehicle" });
  const loan = p.loans[p.loans.length - 1];
  const v = addVehicle(p, m);
  v.loanId = loan.id;
  return T(`${msg} You drove home in your ${m.name}.`, `${msg} You drive your ${m.name} go house.`);
}

export function previewAutoLoan(p: Player, modelId: string) {
  const m = VEHICLE_MODELS.find((x) => x.id === modelId);
  if (!m) return null;
  const price = priceOf(p, m);
  const down = Math.round(price * 0.3);
  const offer: LoanOffer = { id: "autoloan", name: T("Unity Bank auto loan", "Unity Bank auto loan"), type: "bank", blurb: "", monthlyRate: 0.022, feePct: 0.01, minTerm: 12, maxTerm: 36, limit: price - down, lateFeePct: 0.03, eligible: null };
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
    transact(p, { amount: price, reason: T(`Sold your ${v.name}`, `Sell your ${v.name}`), category: "vehicle" });
    transact(p, { amount: -settle, reason: T(`Paid off the loan on your ${v.name}`, `Finish to pay loan for your ${v.name}`), category: "repayment" });
    loan.balance -= settle;
    if (loan.balance <= 0.5) { loan.balance = 0; loan.status = "paid"; adjustCredit(p, 3); }
    note = T(` The remaining loan balance is ${naira(loan.balance)}.`, ` The loan balance wey remain na ${naira(loan.balance)}.`);
  } else {
    transact(p, { amount: price, reason: T(`Sold your ${v.name}`, `Sell your ${v.name}`), category: "vehicle" });
  }
  p.vehicles.splice(i, 1);
  return T(`You sold your ${v.name} for ${naira(price)}.${note}`, `You sell your ${v.name} for ${naira(price)}.${note}`);
}

export function repairCost(p: Player, v: Vehicle): number {
  return Math.round(v.value * (0.04 + (100 - v.condition) / 1000));
}

export function repairVehicle(p: Player, id: string): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const cost = repairCost(p, v);
  if (p.money < cost) return T(`You need ${naira(cost)} for repairs.`, `You need ${naira(cost)} for repairs.`);
  transact(p, { amount: -cost, reason: T(`Repairs on your ${v.name}`, `Repair for your ${v.name}`), category: "vehicle" });
  v.condition = clamp(v.condition + 25, 0, 98);
  return T(`Your ${v.name} is back in shape.`, `Your ${v.name} don come back to shape.`);
}

export const servicePlan = (v: Vehicle): 0 | 1 | 2 => v.service ?? 1;

export function setService(p: Player, id: string, level: 0 | 1 | 2): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  v.service = level;
  return level === 0
    ? T(`No servicing for your ${v.name}. It will wear out faster.`, `No service for your ${v.name}. E go spoil fast.`)
    : level === 1
      ? T(`Basic servicing for your ${v.name}.`, `Basic service for your ${v.name}.`)
      : T(`Full servicing for your ${v.name}: costlier, but it lasts.`, `Full service for your ${v.name}: e cost more, but e go last.`);
}

/** Condition label shown in the garage. */
export function conditionLabel(c: number): string {
  return c >= 85 ? T("Like new", "Like new") : c >= 65 ? T("Good", "Good") : c >= 40 ? T("Worn", "E don tire") : c >= 20 ? T("Poor", "E don bad") : T("Wreck", "E don scatter");
}

export function insureVehicle(p: Player, id: string): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const premium = Math.round(v.value * 0.04);
  if (p.money < premium) return T(`Insurance costs ${naira(premium)} a year.`, `Insurance cost ${naira(premium)} per year.`);
  transact(p, { amount: -premium, reason: T(`Insurance for your ${v.name}`, `Insurance for your ${v.name}`), category: "vehicle" });
  v.insuredUntil = monthIndex(p) + 12;
  return T(`Your ${v.name} is insured for a year.`, `Your ${v.name} don get insurance for one year.`);
}

export function setRole(p: Player, id: string, role: Vehicle["role"]): string {
  const v = p.vehicles.find((x) => x.id === id);
  if (!v) return "";
  const m = modelOf(v.modelId);
  if (role === "taxi" || role === "ridehail") {
    if (!m || !["taxi", "car"].includes(m.cat)) return T("This vehicle cannot be used for transport business.", "You no fit use this vehicle do transport business.");
    if (!p.possessions.license && m.cat === "car") return T("You need a driver's licence to drive it yourself.", "You need driver's licence to drive am yourself.");
  }
  if (role === "rental" && !(m?.rentYield)) return T("This cannot be rented out.", "You no fit rent this one out.");
  v.role = role;
  if (role === "personal") return T(`${v.name} is for personal use again.`, `${v.name} don return to personal use.`);
  if (role === "taxi") return T(`${v.name} now runs as a commercial vehicle.`, `${v.name} don dey run as commercial vehicle now.`);
  if (role === "rental") return isAircraft(m) ? T(`${v.name} is now on charter. A crew and an operator handle the flights.`, `${v.name} don dey charter. Crew and operator go handle the flights.`) : isBoat(m) ? T(`${v.name} is now available for charter and hire.`, `${v.name} don dey for charter and hire.`) : T(`${v.name} is now in your rental fleet.`, `${v.name} don join your rental fleet.`);
  return T(`${v.name} is signed up for ride-hailing.`, `${v.name} don register for ride-hailing.`);
}

/** Driving test: cost, a chance to fail, and an optional 'settle' at the testing centre. */
export const licenseCost = (p: Player) => Math.round(I(p, 55_000));
export function licenseBlock(p: Player): string | null {
  if (p.possessions.license) return T("You already hold a licence", "You don get licence");
  if (p.age < 18) return T("From age 18", "From age 18");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain this year");
  if (p.money < licenseCost(p)) return T(`The test costs ${naira(licenseCost(p))}`, `The test go cost ${naira(licenseCost(p))}`);
  return null;
}
export function takeDrivingTest(p: Player, settle: boolean): string {
  const b = licenseBlock(p);
  if (b) return b;
  p.actionsLeft -= 1;
  const cost = licenseCost(p) + (settle ? Math.round(I(p, 120_000)) : 0);
  transact(p, { amount: -Math.min(cost, Math.max(0, p.money)), reason: settle ? T("Driving test and 'settlement' at the testing centre", "Driving test and 'settlement' for testing centre") : T("Driving test and licence fees", "Driving test and licence fees"), category: "personal" });
  const tries = Number(p.flags.testTries) || 0;
  const pr = settle ? 0.93 : Math.min(0.9, 0.38 + p.stats.smarts / 260 + tries * 0.1 + luckBonus(p));
  if (chance(pr)) {
    p.possessions.license = true;
    bump(p, "happiness", 6);
    return T("You pass the road test and receive your driver's licence.", "You pass the road test and collect your driver's licence.");
  }
  p.flags.testTries = tries + 1;
  bump(p, "stress", 3);
  return T("You fail the test: you rolled through a stop sign. Try again.", "You fail the test: you pass stop sign. Try again.");
}

export const isInsured = (p: Player, v: Vehicle) => v.insuredUntil > monthIndex(p);

/** Monthly running costs, rental income and slow changes in value. */
export function vehicleMonth(p: Player, lines: string[]) {
  const st = stateOf(p);
  for (const v of p.vehicles) {
    const idx = Math.pow(p.index, 0.92);
    const model = modelOf(v.modelId);
    const upkeepPct = model?.upkeep ?? (v.luxury ? 0.0012 : 0);
    if (v.role === "personal") {
      const fuel = (v.luxury ? 120_000 : 45_000) * idx * (0.8 + st.cost / 4) * (model && !needsLicense(model) ? 0 : 1);
      if (fuel > 0) transact(p, { amount: -fuel, reason: T(`Fuel for your ${v.name}`, `Fuel for your ${v.name}`), category: "vehicle", recurring: v.id });
      const plan = servicePlan(v);
      const maint = ((v.luxury ? 60_000 : 18_000) * idx * (model && !needsLicense(model) ? 0 : 1) + v.value * upkeepPct) * (plan === 0 ? 0 : plan === 2 ? 1.8 : 1);
      if (maint > 0) transact(p, { amount: -maint, reason: isAircraft(model) ? T(`Crew, hangar and servicing for your ${v.name}`, `Crew, hangar and servicing for your ${v.name}`) : T(`Maintenance on your ${v.name}`, `Maintenance for your ${v.name}`), category: "vehicle", recurring: v.id });
      if (model && needsLicense(model) && !p.possessions.license) {
        transact(p, { amount: -I(p, 120_000), reason: T(`Chauffeur for your ${v.name}`, `Driver for your ${v.name}`), category: "vehicle", recurring: v.id });
      }
    } else if (v.role === "rental") {
      const yieldPct = model?.rentYield ?? 0.015;
      const demand = (0.55 + STATE_BY_ID[p.state].opp / 12) * rand(0.45, 1.25) * (v.condition / 100);
      const gross = v.value * yieldPct * demand;
      transact(p, { amount: gross, reason: isAircraft(model) ? T(`Charter income from your ${v.name}`, `Charter money from your ${v.name}`) : isBoat(model) ? T(`Boat hire income from your ${v.name}`, `Boat hire money from your ${v.name}`) : T(`Rental income from your ${v.name}`, `Rental money from your ${v.name}`), category: "business", recurring: v.id });
      transact(p, { amount: -(v.value * (upkeepPct + yieldPct * 0.32)), reason: T(`Servicing, crew and insurance for your ${v.name}`, `Servicing, crew and insurance for your ${v.name}`), category: "vehicle", recurring: v.id });
      if (chance(0.02) && v.condition > 20) {
        v.condition = clamp(v.condition - 25);
        const loss = (isInsured(p, v) ? 0.04 : 0.18) * v.value;
        transact(p, { amount: -loss, reason: T(`Damage claim on your ${v.name}`, `Damage on your ${v.name}`), category: "vehicle" });
        lines.push(T(`A renter damaged your ${v.name}.`, `Person wey rent your ${v.name} spoil am.`));
      }
    } else {
      const base = (model?.revenue ?? 420_000) * idx * (0.6 + STATE_BY_ID[p.state].opp / 12) * (v.condition / 100) * rand(0.6, 1.25);
      const share = p.job ? 0.55 : 0.88; // a hired driver keeps part of it if you work elsewhere
      transact(p, { amount: base * share, reason: T(`${v.role === "ridehail" ? "Ride-hailing" : "Taxi"} income from your ${v.name}`, `${v.role === "ridehail" ? "Ride-hailing" : "Taxi"} money from your ${v.name}`), category: "business", recurring: v.id });
      transact(p, { amount: -base * 0.32, reason: T(`Fuel and servicing for your ${v.name}`, `Fuel and servicing for your ${v.name}`), category: "vehicle", recurring: v.id });
    }
    // Wear and tear: servicing slows it, a hard-working vehicle ages faster.
    const plan = servicePlan(v);
    if (plan === 2 && v.role !== "personal") {
      transact(p, { amount: -(v.value * (upkeepPct + 0.002)), reason: T(`Full servicing for your ${v.name}`, `Full service for your ${v.name}`), category: "vehicle", recurring: v.id });
    }
    const hard = v.role === "personal" ? 1 : 1.5;
    v.condition = clamp(v.condition - (plan === 0 ? rand(0.9, 2.2) : plan === 1 ? rand(0.2, 0.7) : rand(0, 0.2)) * hard, 0, 100);
    if (p.month === 1) {
      v.value = Math.round(v.value * (model?.holds ?? (v.kind === "new" ? 0.86 : 0.9)));
    }
    if (v.condition < 40 && chance(v.condition < 20 ? 0.3 : 0.12)) {
      const fix = Math.round(v.value * 0.03 * rand(0.5, 1.5));
      lines.push(T(`Your ${v.name} broke down on the road. Towing and quick fix: ${naira(fix)}.`, `Your ${v.name} break down for road. Tow and quick fix cost ${naira(fix)}.`));
      transact(p, { amount: -Math.min(fix, Math.max(0, p.money)), reason: T(`Breakdown on your ${v.name}`, `Breakdown for your ${v.name}`), category: "vehicle" });
      v.condition = clamp(v.condition - 3, 0, 100);
      if (v.condition < 20 && v.role === "personal" && chance(0.08)) {
        bump(p, "health", -6);
        lines.push(T(`A brake failure in your ${v.name} landed you in hospital.`, `Brake fail for your ${v.name} carry you go hospital.`));
      }
    }
  }
}
