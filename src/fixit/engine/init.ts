import { initFamilies } from "./families";
import { initBackers } from "./backers";
import { STATES } from "../../game/data/states";
import { hashString, subRng } from "../../game/engine/rng";
import { REGION_OVERRIDES, ZONE_PRIORS } from "../data/catalogue";
import { FIX_VERSION, type FixState, type Region } from "./types";
import { clamp100, snap } from "./util";
import { initCabinet } from "./cabinet";
import { initRival } from "./rival";
import { initAssembly, initBudget, initSpeech } from "./politics";
import { computeGroups, initSociety } from "./society";
import { initPower } from "./power";
import { initGovs, startPrimary } from "./govs";
import { applySetup, issuesOf, type SetupOptions } from "./setup";
import { applyRunOptions, checkUnlocks, newCap, offerAgenda } from "./meta";

export const START = {
  fx: 1500, reserves: 36, inflation: 25, foodInflation: 31, oil: 78, pump: 750, treasury: 1500,
};

export function newGame(seed = 2027, president = "Madam/Mr President", setup: SetupOptions = {}): FixState {
  const rng = subRng(seed, "init");
  const regions: Record<string, Region> = {};
  for (const st of STATES) {
    const z = ZONE_PRIORS[st.zone];
    const o = REGION_OVERRIDES[st.id] ?? {};
    const j = () => rng.range(-5, 5);
    const off = {
      food: clamp100((o.food ?? z.food) + j()), insecurity: clamp100((o.insecurity ?? z.insecurity) + j()), jobless: clamp100((o.jobless ?? z.jobless) + j()),
      power: clamp100((o.power ?? z.power) + j()), flood: clamp100((o.flood ?? z.flood) + j()),
    };
    regions[st.id] = { food: off.food, insecurity: off.insecurity, jobless: off.jobless, power: off.power, flood: off.flood, unrest: Math.round(15 + rng.range(0, 10)), off };
  }
  const s: FixState = {
    version: FIX_VERSION,
    meta: { seed, id: `f${seed.toString(36)}-${hashString(president).toString(36).slice(0, 4)}`, president, hard: false, scenario: "standard", difficulty: "normal", portrait: { skin: 2, hair: 0, style: 0, accent: 0 } },
    month: 0, processed: -1, term: 1, termStart: 0, ended: null, done: false,
    eco: {
      fx: START.fx, reserves: START.reserves, inflation: START.inflation, foodInflation: START.foodInflation, emaDrift: 0.45, priceLevel: 100, foodPriceIdx: 100,
      wageIdx: 100, growth: 2.4, gdpIdx: 100, investor: 42, oilPrice: START.oil, oilTrend: 0, fxGap: 0, fxDefence: 0.3,
    },
    oil: { crude: 1650, theft: 20, production: 1320, refinery: 60, refineryNameplate: 650, demand: 470, revenueUsd: 0, uptime: 70, refined: 60, scarcity: 45 },
    fuel: { coverage: 0.5, targeting: 0, transfers: false, pump: START.pump, parity: 995, costMonthly: 0, leak: 0.2, importShare: 0.87, history: [START.pump, START.pump, START.pump] },
    agri: { inputs: 30, irrigation: 15, storage: 12, processing: 20, weather: 0, supply: 100, demand: 100, loss: 29, imports: 4 },
    power: { installed: 13000, available: 4600, demand: 18000, grid: 40, gas: 45, losses: 35, renew: 4 },
    infra: { roads: 38, rail: 14, ports: 40, maint: 30 },
    jobs: { unemployment: 19, youth: 33, sme: 38, manuf: 32, skills: 38, exports: 0.55, productivity: 100 },
    fin: {
      treasury: START.treasury, domesticDebt: 45000, foreignDebt: 42, domRate: 15, forRate: 6.5, revenue: 2300, oilRev: 950, nonOilRev: 1350,
      spend: 2500, debtService: 900, deficit: 200, waysAndMeans: 0, arrears: 0, taxCompl: 38, creditRating: 45, lastBorrowed: 0,
    },
    sec: { banditry: 62, terror: 52, communal: 48, forces: 45, displaced: 2400, humanRights: 55, index: 55 },
    soc: { education: 42, health: 40, welfare: 30 },
    gov: { corruption: 65, procurement: 38, capacity: 42, transparency: 38, trust: 40, approval: 52, opposition: 45, happiness: 48 },
    me: { wealth: 250, evidence: 0, scandals: 0, acts: [] },
    why: {},
    regions, policies: {}, modifiers: [], projects: [], events: [], news: [], reports: [], history: [], terms: [], echoes: [], promises: [], achievements: [], cabinet: { members: {}, pool: [], reshuffles: 0 }, rival: { name: "", party: "", zone: "", popularity: 45 }, campaign: { rallies: {}, debateShift: 0, mobilise: 0, attacks: 0, actionsThisMonth: 0, month: -1 }, election: null, lawmakers: [], rule: {} as never, assembly: { support: 55, lobby: {}, passed: 0, defeats: 0 }, governors: [], govs: [], groups: {} as never, groupMood: {} as never, reputation: {} as never, budget: {} as never, speech: { last: -9, moment: null },
    baseline: undefined as never,
    flags: {}, staff: { cos: null, picked: false }, backers: [], deals: [], enemies: [], timeline: [], gone: [], families: [], foreign: { rel: { imf: 45, china: 50, usa: 50, ecowas: 55 }, imf: null, china: null, usaAid: null, log: [] }, party: { north: 55, south: 55, youth: 50, oldguard: 55, vpAmbition: 20, vpStage: 0 }, home: { spouse: { name: "First Lady/Gentleman", portrait: { skin: 3, hair: 1, style: 1, accent: 2 } }, kids: 3, health: 85, illness: null, abroad: 0 }, mil: { strength: 38, peace: 0, neighbours: [{ id: "sahelia", name: "Sahelia", strength: 34, mood: 55, stability: 45 }, { id: "dahoma", name: "Dahoma", strength: 28, mood: 60, stability: 55 }, { id: "gulfland", name: "Gulfland", strength: 42, mood: 50, stability: 62 }, { id: "kamura", name: "Kamura", strength: 31, mood: 58, stability: 40 }, { id: "atlantia", name: "Atlantia", strength: 36, mood: 62, stability: 70 }] }, lend: { loans: [], fund: 0 }, ledger: { stolen: 0, recovered: 0, pending: 0, used: {}, log: [] }, settings: { autosave: true, reducedMotion: false }, cap: newCap({ quick: setup.quick, legacy: setup.legacy, perks: setup.perks, inherit: setup.inherit }),
  };
  initCabinet(s);
  initRival(s);
  initAssembly(s);
  initBudget(s);
  initSpeech(s);
  initSociety(s);
  initGovs(s);
  initPower(s);
  initBackers(s);
  initFamilies(s);
  s.staff = { cos: null, picked: false };
  applySetup(s, { ...setup, president: setup.president ?? president });
  applyRunOptions(s, { quick: setup.quick, legacy: setup.legacy, perks: setup.perks, inherit: setup.inherit });
  computeGroups(s);
  // initial fuel numbers so the dashboard is truthful on day one
  s.fuel.parity = (s.eco.oilPrice * s.eco.fx) / 159 * 1.35;
  s.fuel.pump = s.fuel.parity * (1 - 0.5 * s.fuel.coverage);
  s.fuel.history = [s.fuel.pump, s.fuel.pump, s.fuel.pump];
  s.fuel.costMonthly = (1500 * (1 + 0.15 * s.fuel.coverage) / 1000) * (s.fuel.parity - s.fuel.pump) * (1 + s.fuel.leak);
  s.baseline = snap(s);
  for (const r of Object.values(s.regions)) r.start = { food: r.food, insecurity: r.insecurity, jobless: r.jobless, power: r.power };
  s.history.push(s.baseline);
  offerAgenda(s);
  checkUnlocks(s, false);
  startPrimary(s);
  const bad = issuesOf(s).filter((x) => !x.good);
  s.news.push({ id: "start", month: 0, headline: bad.length >= 2 ? `New president takes office amid ${bad[0].name.toLowerCase()} and ${bad[1].name.toLowerCase()}` : "A new president takes the oath of office", body: issuesOf(s).map((x) => x.brief).join(" "), tone: "neutral", source: "start" });
  return s;
}
