/**
 * Monthly turn. Order (as specified): (1) scheduled policy/project progress, (2) production/supply/demand/fiscal flows,
 * (3) economy/prices/FX, (4) employment/welfare/security, (5) resolve events, (6) generate new events,
 * (7) update news/indicators/map. Every random draw uses a sub-stream keyed by (seed, system, month) so a month can
 * never double-roll and results do not depend on call order.
 */
import { Rng, subRng } from "../../game/engine/rng";
import { STATES } from "../../game/data/states";
import { PROJECT_BY_ID } from "../data/catalogue";
import { TERM_MONTHS, type FixState, type Project } from "./types";
import { addMod, calMonth, clamp, clamp100, debtServiceRatio, delivery, foodAffordIdx, infraScore, isFloodSeason, isHarvest, isLeanSeason, lever, powerRatio, pushNews, pushReport, realWage, round, snap, debtTotalNgn, nb, annualGdpNgn } from "./util";
import { generateEvents, resolveExpired } from "./events";
import { resolveEchoes } from "./echoes";
import { checkAchievements, midtermCheck } from "./promises";
import { cabinetMonthly } from "./cabinet";
import { rivalMonthly } from "./rival";
import { governorSpeed, relate, societyMonthly } from "./society";
import { assemblyMonthly } from "./politics";
import { powerMonthly } from "./power";
import { createEvent } from "./events";
import { makeNews } from "./news";
import { evaluateTermEnd } from "./legacy";

/** USD bn per month of imports that are not fuel/food/debt: calibrated so the starting balance is roughly neutral */
const OTHER_IMPORTS = 2.95;

type RegionKey = "food" | "insecurity" | "jobless" | "power" | "flood";
const SS_OIL = ["NG-RI", "NG-BY", "NG-DE", "NG-AK"];

export function advanceMonth(s: FixState): boolean {
  if (s.done || s.ended) return false;
  if (s.processed >= s.month) return false; // this month was already processed: never apply twice
  const m = s.month;
  phase1(s);
  phase2(s, subRng(s.meta.seed, "flows", m));
  phase3(s, subRng(s.meta.seed, "prices", m));
  phase4(s, subRng(s.meta.seed, "people", m));
  cabinetMonthly(s, subRng(s.meta.seed, "cabinet", m), (p) => { s.flags.scandalMinister = p; createEvent(s, "ministerScandal", "NG-FC"); });
  rivalMonthly(s, subRng(s.meta.seed, "rival", m));
  societyMonthly(s, subRng(s.meta.seed, "society", m));
  assemblyMonthly(s);
  powerMonthly(s, subRng(s.meta.seed, "power", m));
  resolveEchoes(s);
  resolveExpired(s);
  generateEvents(s, subRng(s.meta.seed, "events", m));
  phase7(s);
  s.processed = m;
  s.month = m + 1;
  midtermCheck(s);
  checkAchievements(s);
  evaluateTermEnd(s);
  return true;
}

export function advanceMonths(s: FixState, n: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) { if (!advanceMonth(s)) break; k++; }
  return k;
}

// ------------------------------------------------------------------ 1. scheduled progress
function phase1(s: FixState) {
  s.modifiers = s.modifiers.filter((x) => x.end === null || x.end >= s.month - 1);
  for (const p of s.projects) if (p.status === "active" || p.status === "stalled") stepProject(s, p);
}

export function projectSpeed(s: FixState, p: Project): number {
  return clamp((0.5 + 0.5 * p.quality) * governorSpeed(s, p.stateId) * (s.reputation?.builder >= 12 ? 1.05 : 1), 0.4, 1.2);
}

function stepProject(s: FixState, p: Project) {
  const def = PROJECT_BY_ID[p.defId];
  const rng = subRng(s.meta.seed, "proj", p.id, s.month);
  const plannedMonths = p.months + p.delay;
  const remainingCostShare = 1 / Math.max(1, plannedMonths);
  const fxMult = 1 - def.fxShare + def.fxShare * (s.eco.fx / (s.flags[`fx0:${p.id}`] as number || s.eco.fx));
  const pay = Math.min(p.cost - p.spent, p.cost * remainingCostShare * fxMult);
  const treasuryShare = p.funding === "treasury" ? 1 : p.funding === "concessional" ? 0.15 : p.funding === "ppp" ? 0.3 : 0;
  const due = pay * treasuryShare;
  if (p.funding === "ppp" && s.eco.investor < 30) {
    p.status = "stalled";
    if (!p.notes.includes("Private partner waiting for investor confidence")) p.notes.push("Private partner waiting for investor confidence");
    return;
  }
  if (due > s.fin.treasury + 1) {
    // cannot pay: work stops and arrears build
    p.status = "stalled";
    p.delay += 0.25;
    s.fin.arrears += due;
    if (!p.notes.some((n) => n.startsWith("Stalled: no cash"))) p.notes.push("Stalled: no cash in the treasury to pay the contractor");
    return;
  }
  p.status = "active";
  s.fin.treasury -= due;
  if (p.funding === "domestic") s.fin.domesticDebt += pay;
  if (p.funding === "concessional") s.fin.foreignDebt += (pay * 0.85) / s.eco.fx;
  if (p.funding === "concessional") s.eco.reserves += (pay * 0.85) / s.eco.fx * 0.35; // part of the loan lands as dollars
  const corr = clamp100(s.gov.corruption + lever(s, "corruption")), proc = clamp100(s.gov.procurement + lever(s, "procurement"));
  const leakRate = clamp(0.03 + 0.3 * (corr / 100) * (1 - 0.6 * proc / 100) + (p.favour ? 0.07 : 0), 0.02, 0.4);
  const leaked = pay * leakRate;
  p.spent += pay;
  p.leaked += leaked;
  // incident risk
  const cap = clamp100(s.gov.capacity + lever(s, "capacity"));
  const risk = def.risk * 0.07 * (1.35 - cap / 100) * (1 + Math.max(0, def.capacityNeed - cap) / 50);
  if (rng.chance(risk)) {
    if (rng.chance(0.5)) {
      const add = rng.range(0.08, 0.2);
      p.cost += p.baseCost * add;
      p.notes.push(`Cost overrun of ${Math.round(add * 100)}% (contractor claims and price rises)`);
      pushNews(s, { source: `proj:${p.id}:over:${s.month}`, headline: `${p.name}: costs overrun`, body: `The ${p.name.toLowerCase()} in ${STATES.find((x) => x.id === p.stateId)?.name} now needs about ${nb(p.cost)}.`, tone: "bad", stateId: p.stateId });
    } else {
      const d = rng.int(1, 3);
      p.delay += d;
      p.notes.push(`Delay of ${d} months (contractor dispute or site problem)`);
      pushNews(s, { source: `proj:${p.id}:delay:${s.month}`, headline: `${p.name} delayed by ${d} months`, body: "Contractor disputes and site problems slowed work.", tone: "bad", stateId: p.stateId });
    }
  }
  const speed = projectSpeed(s, p) * (p.funding === "concessional" ? 0.9 : 1);
  p.progress = Math.min(1, p.progress + (1 / Math.max(1, p.months + p.delay)) * speed * (1 - leakRate * 0.6));
  if (p.progress >= 0.999 && p.spent >= p.cost * 0.97) completeProject(s, p);
  else if (p.progress >= 0.999) p.progress = 0.999; // waiting for final payments
}

function completeProject(s: FixState, p: Project) {
  const def = PROJECT_BY_ID[p.defId];
  const leakShare = p.leaked / Math.max(1, p.spent);
  const scale = clamp(0.5 + 0.55 * p.quality - 0.8 * leakShare + (p.delay === 0 ? 0.05 : 0), 0.4, 1.05);
  p.status = "done";
  p.progress = 1;
  p.done = s.month;
  p.benefitScale = round(scale, 2);
  relate(s, p.stateId, 6);
  addMod(s, `project:${p.id}`, `${p.name} (completed)`, def.benefit, { ramp: 6, scale });
  const pctOfPromise = Math.round(scale * 100);
  pushReport(s, { title: `${p.name} completed`, tone: scale >= 0.85 ? "good" : "neutral", lines: [`Built in ${s.month - p.start + 1} months against ${p.months} planned.`, `Cost ${nb(p.cost)} (budget ${nb(p.baseCost)}); about ${nb(p.leaked)} was lost to leakage.`, `Delivering about ${pctOfPromise}% of the promised benefit: ${def.benefitText}.`] });
  pushNews(s, { source: `proj:${p.id}:done`, headline: `${p.name} opens in ${STATES.find((x) => x.id === p.stateId)?.name}`, body: `Delivering about ${pctOfPromise}% of what was promised.`, tone: "good", stateId: p.stateId });
}

// ------------------------------------------------------------------ 2. production, supply, demand, fiscal flows
function avgRegion(s: FixState, ids: string[], k: RegionKey) { return ids.reduce((a, id) => a + s.regions[id][k], 0) / ids.length; }

function phase2(s: FixState, rng: Rng) {
  const L = (n: Parameters<typeof lever>[1]) => lever(s, n);
  const e = s.eco;
  // --- oil: crude price (mean-reverting random walk with scenario shocks)
  e.oilTrend = e.oilTrend * 0.85 + rng.normal(0, 2.2);
  e.oilPrice = clamp(e.oilPrice + 0.06 * (76 - e.oilPrice) + e.oilTrend * 0.5 + L("fxSupply") * 0, 38, 135);
  // --- oil: production, theft, refining
  const corr = clamp100(s.gov.corruption + L("corruption"));
  const theftTarget = clamp(2 + 0.17 * corr + 0.12 * avgRegion(s, SS_OIL, "insecurity") + L("oilTheft"), 3, 45);
  s.oil.theft += 0.12 * (theftTarget - s.oil.theft);
  s.oil.production = (s.oil.crude + L("crude")) * (1 - s.oil.theft / 100);
  const refined = clamp(s.oil.refinery + L("refinery"), 0, s.oil.refineryNameplate);
  s.fuel.importShare = clamp(1 - refined / s.oil.demand, 0, 1);
  const exportK = Math.max(0, s.oil.production - refined);
  const exportUsd = (exportK * 30 * e.oilPrice) / 1e6; // $bn per month
  s.oil.revenueUsd = exportUsd * 0.21;

  // --- electricity: what can actually be delivered
  const gasEff = clamp100(s.power.gas + L("gas")), gridEff = clamp100(s.power.grid + L("grid")), maintEff = clamp100(s.infra.maint + L("maint"));
  const avail = s.power.installed * (0.21 + 0.0016 * gasEff + 0.0014 * gridEff + 0.0006 * maintEff) + L("power");
  s.power.available = clamp(avail, 800, s.power.installed * 0.85 + L("power"));
  s.power.demand = 18000 * (1 + 0.0015 * s.month);
  // grid and infrastructure wear unless maintained
  s.infra.maint = clamp100(s.infra.maint + 0.0 * L("maint"));
  const wear = 0.18 - 0.0016 * maintEff;
  s.infra.roads = clamp100(s.infra.roads - Math.max(0, wear));
  s.infra.ports = clamp100(s.infra.ports - Math.max(0, wear) * 0.5);
  s.infra.rail = clamp100(s.infra.rail - Math.max(0, wear) * 0.6);
  s.power.grid = clamp100(s.power.grid - Math.max(0, wear) * 0.7);

  // --- food: weather draws once a year, supply, losses
  if ((s.month % 12 === 0 && s.flags.weatherYear !== Math.floor(s.month / 12)) || s.flags.weatherYear === undefined) {
    const w = subRng(s.meta.seed, "weather", Math.floor(s.month / 12));
    s.agri.weather = round(clamp(w.normal(0, 0.55), -1, 1), 2);
    s.flags.weatherYear = Math.floor(s.month / 12);
    if (s.agri.weather <= -0.6) pushNews(s, { source: `weather:${s.flags.weatherYear}`, headline: "Forecasters warn of a poor rainy season", body: "Late rains threaten harvests across the north.", tone: "bad" });
    if (s.agri.weather >= 0.6) pushNews(s, { source: `weather:${s.flags.weatherYear}`, headline: "Heavy rains expected: good for crops, risky for floods", body: "Farmers expect strong harvests; flood warnings issued for river states.", tone: "neutral" });
  }
  const inputs = clamp100(s.agri.inputs + L("inputs")), irr = clamp100(s.agri.irrigation + L("irrigation")), storage = clamp100(s.agri.storage + L("storage"));
  const loss = clamp(32 - 0.22 * storage - L("postHarvest") - 0.04 * (infraScore(s) - 30), 9, 40);
  s.agri.loss = loss;
  const insLoss = 0.0011 * Math.max(0, s.sec.index - 30);
  const prod = 100 * (1.18 + 0.0035 * inputs + 0.0028 * irr) * (1 + 0.09 * s.agri.weather) * (1 - insLoss) * (1 + 0.0011 * s.month);
  const domestic = prod * (1 - loss / 100);
  s.agri.demand = 100 * (1 + 0.0012) ** s.month;
  const shortage = s.agri.demand - domestic;
  const wantImports = clamp(shortage * 0.7, 0, 14);
  s.agri.imports = wantImports + Math.max(0, L("foodSupply"));
  s.agri.supply = domestic + s.agri.imports;

  // --- dollar flows ($bn / month)
  const nonOilExp = (s.jobs.exports + L("exports")) * (1 - 0.0008 * Math.max(0, e.fx / 1500 - 1) * 0);
  const remit = 1.7;
  const capIn = 1.1 * (e.investor / 50 - 0.7);
  const supply = exportUsd + nonOilExp + remit + capIn + Math.max(0, L("fxSupply")) * 1 + Math.min(0, L("fxSupply"));
  const fuelImportUsd = (Math.max(0, s.oil.demand - refined) * 30 * e.oilPrice * 1.04) / 1e6;
  const foodImportUsd = 0.75 + 0.075 * s.agri.imports;
  const otherImports = OTHER_IMPORTS * (1 + (s.eco.gdpIdx / 100 - 1) * 1.2);
  const debtFx = (s.fin.foreignDebt * s.fin.forRate) / 1200;
  const flight = 0.25 * clamp(1 - e.investor / 55, -0.5, 1);
  const demand = fuelImportUsd + foodImportUsd + otherImports + debtFx + flight + L("fxDemand");
  const gap = demand - supply;
  e.fxGap = gap;
  const sold = gap > 0 ? Math.min(e.fxDefence * gap * 0.8, e.reserves * 0.12) : 0;
  s.flags.fxSoldNow = sold;
  s.flags.fxSupplyUsd = supply; s.flags.fxDemandUsd = demand;
  s.flags.fxParts = JSON.stringify({ exports: round(exportUsd, 2), nonOil: round(nonOilExp, 2), remit, capIn: round(capIn, 2), fuel: round(fuelImportUsd, 2), food: round(foodImportUsd, 2), other: round(otherImports, 2), debt: round(debtFx, 2), flight: round(flight, 2) });
  // reserves
  const fxSaleMod = s.modifiers.filter((x) => x.source === "measure:fxSale" && s.month >= x.start && (x.end === null || s.month <= x.end)).reduce((a, x) => a + (x.effects.fxSupply ?? 0) * x.scale, 0);
  e.reserves = Math.max(0, e.reserves + (gap < 0 ? -gap * 0.5 : -sold) - fxSaleMod);

  // --- fiscal flows
  const f = s.fin;
  const pl = e.priceLevel / 100;
  f.taxCompl = clamp(f.taxCompl, 20, 80);
  const taxEff = clamp(f.taxCompl + L("taxCompl"), 20, 85);
  f.nonOilRev = 1350 * (e.gdpIdx / 100) * pl ** 0.9 * (taxEff / 38) ** 0.7 + L("revenue");
  f.oilRev = s.oil.revenueUsd * e.fx;
  f.revenue = f.nonOilRev + f.oilRev;
  // fuel subsidy bill (see subsidy.ts for the explanation of these terms)
  const fu = s.fuel;
  fu.parity = (e.oilPrice * e.fx) / 159 * 1.35;
  const litresM = 1500 * (1 + 0.15 * fu.coverage);
  fu.leak = clamp(0.06 + 0.3 * (corr / 100) * (1 - 0.6 * fu.targeting), 0.04, 0.4);
  const transfersCost = fu.transfers ? 150 * pl * (0.6 + 0.4 * delivery(s)) : 0;
  fu.costMonthly = (litresM / 1000) * Math.max(0, fu.parity - fu.pump) * (1 + fu.leak) + transfersCost;
  // running costs of policies and measures (savings are negative)
  let running = 0;
  for (const mod of s.modifiers) if (mod.monthly && s.month >= mod.start && (mod.end === null || s.month <= mod.end)) running += mod.monthly * (0.6 + 0.4 * pl);
  const recurrent = 950 * (1 + 0.95 * (pl - 1));
  const capitalBase = 250 * pl;
  const dom = (f.domesticDebt * f.domRate) / 1200;
  const forn = (f.foreignDebt * f.forRate / 1200) * e.fx;
  f.debtService = dom + forn;
  f.spend = recurrent + capitalBase + fu.costMonthly + running + f.debtService;
  f.treasury += f.revenue - f.spend;
  f.deficit = f.spend - f.revenue;
  // financing: the market lends to keep a minimum cash buffer; when the debt burden is too heavy the central bank prints money
  const buffer = 350 * pl;
  f.lastBorrowed = 0; f.waysAndMeans = 0;
  if (f.treasury < buffer) {
    const need = buffer - f.treasury;
    if (debtServiceRatio(s) < 0.85) { f.domesticDebt += need; f.lastBorrowed = need; }
    else { f.domesticDebt += need; f.waysAndMeans = need; }
    f.treasury += need;
  }
  const marketDom = clamp(14 + 0.35 * (e.inflation - 15) + 14 * Math.max(0, debtServiceRatio(s) - 0.35) + 8 * Math.max(0, f.deficit) / Math.max(1, f.revenue), 10, 34);
  f.domRate += 0.04 * (marketDom - f.domRate);
  const ratingTarget = clamp100(62 - 55 * Math.max(0, debtServiceRatio(s) - 0.25) - 0.4 * Math.max(0, e.inflation - 12) + 0.3 * (e.investor - 40) + 0.12 * (s.gov.transparency + L("transparency") - 38));
  f.creditRating += 0.05 * (ratingTarget - f.creditRating);
  s.why.fiscal = [
    `Revenue ${nb(f.revenue)} (oil ${nb(f.oilRev)}, other ${nb(f.nonOilRev)})`,
    `Spending ${nb(f.spend)}: debt service ${nb(f.debtService)}, fuel subsidy ${nb(fu.costMonthly)}, running costs and projects the rest`,
    f.waysAndMeans > 0 ? `Debt burden too heavy: ${nb(f.waysAndMeans)} printed by the central bank` : f.lastBorrowed > 0 ? `Borrowed ${nb(f.lastBorrowed)} to keep cash on hand` : "No new borrowing needed this month",
  ];
}

// ------------------------------------------------------------------ 3. economy, prices, FX
function phase3(s: FixState, rng: Rng) {
  const L = (n: Parameters<typeof lever>[1]) => lever(s, n);
  const e = s.eco, fu = s.fuel;
  const supply = s.flags.fxSupplyUsd as number, gap = e.fxGap, sold = s.flags.fxSoldNow as number;
  const structural = 0.02 * (e.inflation - 5);
  const pressure = (4.5 * (gap - sold)) / Math.max(1, supply);
  const sentiment = -0.03 * (e.investor - 42);
  const panic = e.reserves < 12 ? 0.5 : 0;
  const noise = rng.normal(0, 0.3);
  let drift = clamp(structural + pressure + sentiment + panic + noise, -7, 9);
  if (gap < 0) drift = clamp(structural * 0.3 + pressure * 0.7 + sentiment + noise, -7, 9);
  e.fx = clamp(e.fx * (1 + drift / 100), 250, 6000);
  e.emaDrift = 0.7 * e.emaDrift + 0.3 * drift;
  s.flags.fxDrift = round(drift, 2);
  s.why.fx = [
    gap > 0.15 ? `Dollar demand ($${round(s.flags.fxDemandUsd as number, 1)}bn) is above supply ($${round(supply, 1)}bn), pushing the naira weaker` : gap < -0.15 ? `Dollar supply ($${round(supply, 1)}bn) is above demand, so the naira gains` : `Dollar supply and demand are roughly balanced ($${round(supply, 1)}bn each way)`,
    `Underlying inflation steadily weakens the naira (${round(structural, 2)}% a month)`,
    sold > 0.01 ? `The central bank sold $${round(sold, 2)}bn of reserves to slow the fall` : "No reserves were used to defend the naira",
    e.investor >= 50 ? "Investor confidence is helping the naira" : "Low investor confidence is weighing on the naira",
  ];

  // fuel price
  const old = fu.pump;
  fu.parity = (e.oilPrice * e.fx) / 159 * 1.35;
  const target = fu.parity * (1 - 0.5 * fu.coverage);
  fu.pump = old + 0.55 * (target - old);
  fu.history.push(fu.pump); if (fu.history.length > 6) fu.history.shift();
  s.why.fuel = [
    `Import-parity price is ${Math.round(fu.parity)} per litre (oil $${round(e.oilPrice)}, naira ${Math.round(e.fx)} per dollar)`,
    fu.coverage > 0.02 ? `Subsidy covers about ${Math.round(fu.coverage * 50)}% of that price, so pumps charge ${Math.round(fu.pump)}` : "No subsidy: pumps charge close to the full market price",
    `The subsidy costs ${nb(fu.costMonthly)} a month (${Math.round((fu.leak) * 100)}% of the spending leaks)`,
  ];

  // food prices
  const season = isLeanSeason(s.month) ? 4 : isHarvest(s.month) ? -4 : 0;
  const gapF = s.agri.demand - s.agri.supply;
  const pumpChg = (fu.pump / START_PUMP - 1) * 100;
  const transportPush = 0.12 * pumpChg - 0.3 * L("transport") * 0 + L("transport") * 0.4;
  const foodTarget = 23 + 2.5 * gapF + 14 * Math.max(e.emaDrift, -0.15) + transportPush + season + L("foodPrice");
  e.foodInflation = clamp(e.foodInflation + 0.3 * (Math.max(1.5, foodTarget) - e.foodInflation), 0, 90);
  s.why.food = [
    gapF > 1 ? "Not enough food is reaching markets for demand" : "Food supply is roughly meeting demand",
    `About ${Math.round(s.agri.loss)}% of harvested food is lost before it is eaten`,
    season > 0 ? "It is the lean season, which pushes prices up" : season < 0 ? "Harvest season is easing prices" : "Prices are not seasonal this month",
    pumpChg > 5 ? "Dearer fuel makes it costlier to move food" : "Fuel prices are not adding much to transport costs",
  ];

  // headline inflation
  const monet = 25 * (s.fin.waysAndMeans / Math.max(1, s.fin.revenue));
  const coreTarget = 8.5 + 18 * Math.max(e.emaDrift, -0.15) + 0.025 * (fu.pump - 600) + L("inflation") + monet;
  // prices rarely fall outright: very low readings settle around a few percent
  const target2 = Math.max(3, 0.45 * e.foodInflation + 0.55 * coreTarget);
  e.inflation = clamp(e.inflation + 0.22 * (target2 - e.inflation), -2, 80);
  e.priceLevel *= 1 + e.inflation / 1200;
  e.foodPriceIdx *= 1 + e.foodInflation / 1200;
  s.why.inflation = [
    `Food prices are rising ${round(e.foodInflation)}% a year`,
    e.emaDrift > 0.2 ? "A weaker naira makes imports dearer" : "The naira is steady, so imports are not adding much",
    monet > 0.3 ? "Printing money to pay bills adds to prices" : "No money printing this month",
    L("inflation") > 0.3 ? "Some of your policies add price pressure" : "Policies are not adding price pressure",
  ];

  // productivity and growth
  const powerPct = (powerRatio(s)) * 100;
  const log = (s.infra.roads + L("roads") + s.infra.ports + L("ports") + (s.infra.rail + L("rail")) * 0.5) / 2.5;
  const skills = clamp100(s.jobs.skills + L("skills"));
  const edu = clamp100(s.soc.education + L("education")), health = clamp100(s.soc.health + L("health"));
  const sme = clamp100(s.jobs.sme + L("sme")), manuf = clamp100(s.jobs.manuf + L("manuf"));
  s.jobs.productivity = round(100 + 0.3 * (edu - 42) + 0.3 * (health - 40) + 0.25 * (skills - 38) + 0.35 * (powerPct - 25) + 0.12 * (log - 40), 1);
  const g = 2.4 + 0.06 * (powerPct - 25) + 0.02 * (log - 40) + 0.015 * (e.investor - 42) + 0.014 * (skills - 38) + 0.012 * (edu - 42) + 0.008 * (health - 40)
    + 0.012 * (sme - 38) + 0.012 * (manuf - 32) - 0.05 * Math.max(0, e.inflation - 22) - 0.012 * (s.sec.index - 55) + 0.012 * (e.oilPrice - 76) + 0.4 * rng.normal(0, 0.3);
  e.growth += 0.2 * (g - e.growth);
  e.gdpIdx *= 1 + e.growth / 1200;

  // wages follow prices with a lag
  const emaInfl = (typeof s.flags.emaInfl === "number" ? s.flags.emaInfl : e.inflation) * 0.92 + e.inflation * 0.08;
  s.flags.emaInfl = emaInfl;
  e.wageIdx *= 1 + (0.8 * emaInfl / 12 + 0.04 * (s.jobs.productivity - 100) * 0.1 + 0.05 * e.growth) / 100;

  // investor confidence and borrowing costs reflect the whole picture
  const invTarget = clamp100(42 + 0.5 * (s.fin.creditRating - 45) - 0.18 * (e.inflation - 25) - 0.12 * (s.sec.index - 55) + 0.12 * (powerPct - 25)
    + 0.15 * (s.gov.transparency + L("transparency") - 38) + L("investor") + 0.1 * (s.gov.procurement + L("procurement") - 38) - 3 * Math.abs(drift - 0.45) - (s.me.evidence > 40 ? 4 : 0));
  e.investor = clamp100(e.investor + 0.12 * (invTarget - e.investor));
}
const START_PUMP = 750;

// ------------------------------------------------------------------ 4. employment, welfare, security, politics
function phase4(s: FixState, rng: Rng) {
  const L = (n: Parameters<typeof lever>[1]) => lever(s, n);
  const e = s.eco, j = s.jobs, sc = s.sec;
  const sme = clamp100(j.sme + L("sme")), manuf = clamp100(j.manuf + L("manuf")), skills = clamp100(j.skills + L("skills"));
  const uTarget = clamp(20 - 1.1 * (e.growth - 2.4) + L("jobs") - 0.03 * (sme - 38) - 0.02 * (manuf - 32) - 0.02 * (skills - 38) + 0.02 * Math.max(0, s.fin.domRate - 15), 6, 45);
  j.unemployment = clamp(j.unemployment + 0.1 * (uTarget - j.unemployment), 5, 45);
  j.youth = clamp(j.unemployment * 1.74, 8, 70);

  // security
  const trust = clamp100(s.gov.trust + L("trust"));
  const forces = clamp100(sc.forces + L("forces"));
  const pressure = 0.2 * (j.youth - 33) + 0.08 * (60 - trust) * 0.5 + 0.12 * (e.foodInflation - 31);
  const secL = L("security");
  const tB = clamp100(62 + pressure - 0.4 * (forces - 45) - 1.0 * secL);
  const tT = clamp100(52 + 0.6 * pressure - 0.35 * (forces - 45) - 0.8 * secL);
  const tC = clamp100(48 + 0.8 * pressure + 6 * Math.max(0, s.agri.weather * -1) - 0.2 * (forces - 45) - 0.5 * secL);
  sc.banditry += 0.07 * (tB - sc.banditry); sc.terror += 0.07 * (tT - sc.terror); sc.communal += 0.07 * (tC - sc.communal);
  sc.index = 0.4 * sc.banditry + 0.35 * sc.terror + 0.25 * sc.communal;
  sc.displaced = clamp(sc.displaced * 0.985 + (sc.index - 50) * 6, 300, 9000);
  // lawful limits: surges without supervision wear down rights; community policing and transparency repair them
  const surge = s.policies.troopSurge?.active ? 1 : 0;
  sc.humanRights = clamp100(sc.humanRights + (s.policies.communityPolicing?.active ? 0.2 : 0) - surge * 0.15 * (1.2 - s.gov.capacity / 100) + 0.002 * (s.gov.transparency - 40));

  // slowly banked social stocks: spending (or cuts) leaves a lasting mark
  for (const k of ["education", "health", "welfare"] as const) {
    s.soc[k] = clamp100(s.soc[k] + 0.012 * L(k) * 0.9);
  }

  // corruption drifts with institutions
  s.gov.corruption = clamp100(s.gov.corruption + 0.02 * (65 - s.gov.corruption) * 0 + 0.0 + (L("corruption") < 0 ? 0.01 * L("corruption") : 0) + 0.002 * (s.me.evidence));
  s.gov.procurement = clamp100(s.gov.procurement + 0.01 * L("procurement") * 0.3);

  // happiness: transparent weighted drivers
  const pumpTerm = clamp(-0.02 * (s.fuel.pump - 750), -10, 10);
  const rw = realWage(s);
  const d: [string, number][] = [
    ["Everyday costs and wages", clamp(0.3 * (rw - 100), -25, 20)],
    ["Food prices", clamp(-0.25 * (e.foodInflation - 25), -14, 8)],
    ["Fuel and transport", pumpTerm + clamp(-L("transport") * -0.5, -3, 3)],
    ["Jobs", clamp(-0.5 * (j.unemployment - 19), -12, 8)],
    ["Security", clamp(-0.18 * (sc.index - 55), -12, 8)],
    ["Electricity", clamp(0.35 * (powerRatio(s) * 100 - 25), -6, 8)],
    ["Health and schools", clamp(0.1 * (s.soc.health + L("health") - 40) + 0.08 * (s.soc.education + L("education") - 42), -6, 6)],
    ["Support from government", clamp(0.1 * (s.soc.welfare + L("welfare") - 30), -2, 4) + L("happiness")],
  ];
  const hTarget = clamp100(52 + d.reduce((a, [, v]) => a + v, 0));
  s.gov.happiness = clamp100(s.gov.happiness + 0.35 * (hTarget - s.gov.happiness));
  s.why.happiness = d.filter(([, v]) => Math.abs(v) >= 1).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5).map(([k, v]) => `${k}: ${v >= 0 ? "helping" : "hurting"} (${v >= 0 ? "+" : "−"}${Math.abs(round(v, 1))})`);

  const corrPerceived = clamp100(s.gov.corruption + L("corruption") + s.me.evidence * 0.3);
  const trustTarget = clamp100(45 + 0.2 * (s.gov.happiness - 50) - 0.25 * (corrPerceived - 60) + 0.25 * (s.gov.transparency + L("transparency") - 40) + L("trust") * 1.0 - (s.me.scandals > 0 ? 5 * s.me.scandals : 0));
  s.gov.trust = clamp100(s.gov.trust + 0.1 * (trustTarget - s.gov.trust));
  s.gov.transparency = clamp100(s.gov.transparency + 0.004 * (L("transparency")));
  s.gov.capacity = clamp100(s.gov.capacity + 0.01 * L("capacity") * 0.5);
  s.gov.approval = clamp100(0.7 * s.gov.happiness + 0.3 * s.gov.trust + rng.normal(0, 0.4));
  // tax administration improves compliance slowly
  s.fin.taxCompl = clamp(s.fin.taxCompl + 0.01 * L("taxCompl") * 0.4, 20, 80);

  // regions follow the national picture but keep their own character; completed local projects help locally
  const nat = {
    food: e.foodInflation - 31, insecurity: sc.index - 55, jobless: j.unemployment - 19, power: (0.255 - powerRatio(s)) * 120,
  };
  for (const st of STATES) {
    const r = s.regions[st.id];
    r.food = clamp100(r.food + 0.35 * (clamp100(r.off.food + nat.food * 1.0 + (isLeanSeason(s.month) ? 3 : 0)) - r.food));
    r.insecurity = clamp100(r.insecurity + 0.35 * (clamp100(r.off.insecurity + nat.insecurity * 1.2) - r.insecurity));
    r.jobless = clamp100(r.jobless + 0.35 * (clamp100(r.off.jobless + nat.jobless * 1.8) - r.jobless));
    r.power = clamp100(r.power + 0.35 * (clamp100(r.off.power + nat.power) - r.power));
    const wet = isFloodSeason(s.month) ? 8 * Math.max(0, s.agri.weather + 0.3) : 0;
    r.flood = clamp100(r.flood + 0.4 * (clamp100(r.off.flood + wet) - r.flood));
    const local = 0.3 * r.food + 0.25 * r.jobless + 0.2 * r.insecurity + 0.25 * (60 - s.gov.happiness);
    r.unrest = clamp100(r.unrest + 0.25 * (local * 0.9 - 18 - r.unrest));
  }
  for (const p of s.projects) {
    if (p.status !== "done") continue;
    const r = s.regions[p.stateId];
    if (!r) continue;
    const k = (p.benefitScale ?? 0.8) * Math.min(1, (s.month - (p.done ?? s.month) + 1) / 6);
    const key = LOCAL_EFFECT[p.defId];
    if (key) {
      r.off[key] = clamp100(r.off[key] - 0.12 * k * 10 / 10);
      r[key] = clamp100(r[key] - 0.12 * k);
    }
  }
}
const LOCAL_EFFECT: Record<string, RegionKey> = {
  storage: "food", irrigation: "food", farmRoads: "food", foodProcessing: "jobless", transmission: "power", solar: "power", gasPlant: "power",
  securityInfra: "insecurity", industrial: "jobless", highway: "jobless", port: "jobless", transit: "jobless",
};

// ------------------------------------------------------------------ 7. news, snapshot, autosave hook point
function phase7(s: FixState) {
  const prev = s.history[s.history.length - 1];
  const now = snap({ ...s, month: s.month + 1 } as typeof s);
  makeNews(s, prev, now);
  // keep the last 60 months of history for charts
  s.history.push(now);
  if (s.history.length > 240) s.history.shift();
  s.flags.lastFxDrift = s.flags.fxDrift ?? 0;
  void debtTotalNgn; void annualGdpNgn; void foodAffordIdx; void pushReport; void addMod; void calMonth; void TERM_MONTHS;
}
