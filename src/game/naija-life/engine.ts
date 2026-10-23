import {
  HOUSE_KINDS, JOB_BY_ID, OFFICES, STATE_BY_ID, TRAVEL_STATES, TRIBES_BY_REGION, birthWeight, defaultReligion, poolFor,
} from "./data";
import { AUTOS, EVENTS } from "./events";
import { AUTOS2, EVENTS2 } from "./events2";
import { AUTOS3, EVENTS3 } from "./events3";
import { EVENTS4 } from "./events4";
import { EVENTS5, graduationData } from "./events5";
import { EVENTS6 } from "./events6";
import { KID_EVENTS } from "./kids";
import { MARKET_EVENTS, fireAdvisor, hireAdvisor } from "./markets";
import { buildObituary } from "./obituary";
import { ENGAGE_EVENTS, assignGoals, engageYear } from "./engage";
import { SKILL_EVENTS } from "./skills2";
import { findClients, realtorYear, showProperty } from "./realtor";
import { SCENARIO_EVENTS } from "./scenariosAll";
import { NYSC_EVENTS, NYSC_MAX_AGE, nyscRelease, nyscYear, serving } from "./nysc";
import { fillClassmates, interact, makeFriend, refreshOccupation, refreshPeople } from "./people";
import { campusDo, campusHire, campusYearEnd, enrol, graduateCampus, writeJamb } from "./campus";
import { transportOptions, type TransportMode } from "./travel";
import { buyListing, completeProjects, developLand, houseYear, refreshListings, type PurchaseMode } from "./property";
import { defaultLocationFor, locationOf } from "./locations";
import { EDU_EVENTS, enrollPostgrad, finishPostgrad } from "./education";
import { yearlyNews } from "./news";
import { SUPPORT_EVENTS, yearlyPromises } from "./support";
import { PRISON_EVENTS, fugitiveYear, prisonBlock, prisonOp } from "./prison";
import { MILITARY_EVENTS, SERVICE_JOBS, boardDue } from "./military";
import { HEALTH_EVENTS, developCondition, yearlyHealth } from "./health";
import { REL_EVENTS, yearlyRelationships } from "./relationships";
import { BIZ_EVENTS, bizValue } from "./business";
import { BET_EVENTS } from "./betting";
import { CRIME_EVENTS, commitCrime, crimeBlock, CRIME_BY_ID, yearlyCrime } from "./crime";
import { LIFE_EVENTS, yearlyGrowth } from "./life";
import { SOCIAL_EVENTS, SOCIAL_JOBS, ensureAccount, fameBonus, yearlySocial } from "./social";
import { eligible } from "./eligibility";
import { annualPay, runMonths } from "./finance";
import { SUPPORT_KINDS, addFriend, applySupport, classOf, evaluateSupport, makeNpc, syncLegacyFamily, type SupportKind } from "./family";
import { auditBalance, coverShortfall, reconcile, snapshot, transact } from "./ledger";
import { lenderOffers, loanBlock, repayLoan, takeLoan, totalDebt, borrowFrom, giftTo, lendTo } from "./loans";
import { planEstate } from "./will";
import { PARENT_EVENTS, willWarning } from "./inherit";
import { BIT_EVENTS } from "./bitEvents";
import { adoptPet, bitYear, dnaTest, doStyle, pickTalent, petCare, playTicket, practice, rehomePet, type Ticket } from "./bitlife";
import { YAHOO_EVENTS, cashOut, dropMark, hunt, launder, layLow, quitYahoo, settleContact, upgradeKit, work as yahooWork, yahooYear, type Approach } from "./yahoo";
import { assignSchoolType, familyHousing, initWorld, migrateWorld, moveHomeToFamily, rentPlace, schoolHousing, yearlyWorld } from "./world";
import { buyVehicle, takeDrivingTest, insureVehicle, setService, repairVehicle, sellVehicle, setRole } from "./vehicles";
import { FACILITY_BY_ID, applyTreatment, payForTreatment, setInsurance, treatmentCost } from "./health";
import { adoptChild, askOnDate, breakUp, chat, divorce, emergencyPill, fertilityTreatment, logMsg, meetSomeone, hookUp, moveIn, createProfile, makeOfficial, marry, partnerOf, refreshDeck, spendTheNight, spendTime, swipe, type ChatTone, type DatePlan, type Protection } from "./relationships";
import { acceptOffer, closeBusiness, declineOffers, dismiss, haggleOffer, ensureCrew, fireStaff, hirePick, hireStaff, raisePay, recruit, listForSale, setPolicy, setLever, setLevers, businessAct, startBusiness, toggleManager, trainWorker, upgradeBusiness } from "./business";
import { placeBet, type BetKind } from "./betting";
import { buyGear, collab, createAccount, post, type ContentKind } from "./social";
import { setShare } from "./will";
import { settleHouseLoan, takeMortgage } from "./mortgage";
import { doGrowth, enlist, enrollTrade, finishTrade, learnSkill, toggleGym } from "./life";
import type { Platform } from "./types";
import { I, bump, expandCostFor, jobDef, jobTitle, luckBonus, moveTo, qualifyBlock, randomName, stateOf } from "./helpers";
import { kidnapRisk, kidnapStep, makeKidnap, netWorth, type KidnapAction } from "./kidnap";
import { buyLuxury, divest, invest, investBlock, luxuryBlock, yearlyHoldings } from "./lifestyle";
import { POLITICS_EVENTS, canContest, canJoinPolitics, canPlotCoup, contestPending, freshNation, joinPolitics, migratePolitics, plotCoup, politicalRelease, powerMoveBlock, runGov, runPowerMove, yearlyPolitics, GOV_ACTIONS } from "./politics";
import type { EventDef, FamilyBg, Game, Gender, HoldingKind, House, HouseKind, HouseUse, Kid, LineageEntry, Pending, Player } from "./types";
import { T, chance, clamp, naira, pick, rand, randInt, setDeflator, setLang, setSeed, tx, uid, weightedPick } from "./util";
import { kidLook, lookToStr, randomLook, type Look } from "./look";
import type { FamilyConfig } from "./family";
import type { FamilyArchetype } from "./types";

const PRISON_EVENT_IDS = new Set(PRISON_EVENTS.map((e) => e.id));
export const ALL_EVENTS: EventDef[] = [...EVENTS, ...EVENTS2, ...EVENTS3, ...EVENTS4, ...EVENTS5, ...EVENTS6, ...MILITARY_EVENTS, ...PRISON_EVENTS, ...SUPPORT_EVENTS, ...EDU_EVENTS, ...KID_EVENTS, ...MARKET_EVENTS, ...ENGAGE_EVENTS, ...NYSC_EVENTS, ...SCENARIO_EVENTS, ...SKILL_EVENTS, ...PARENT_EVENTS, ...YAHOO_EVENTS, ...BIT_EVENTS, ...HEALTH_EVENTS, ...REL_EVENTS, ...BIZ_EVENTS, ...BET_EVENTS, ...SOCIAL_EVENTS, ...CRIME_EVENTS, ...LIFE_EVENTS, ...POLITICS_EVENTS];
export const ALL_AUTOS = [...AUTOS, ...AUTOS2, ...AUTOS3];
export const EVENT_DEFS: Record<string, EventDef> = Object.fromEntries(ALL_EVENTS.map((e) => [e.id, e]));
const START_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function addLog(p: Player, text: string) {
  const last = p.log[p.log.length - 1];
  if (last && last.age === p.age) last.lines.push(text);
  else p.log.push({ age: p.age, year: p.birthYear + p.age, lines: [text] });
  if (p.log.length > 140) p.log.shift();
}

/** The game never shows negative cash: shortfalls become recorded debt. */
function settle(p: Player) {
  // Defensive: never let a bad calculation poison the save.
  if (!Number.isFinite(p.money)) p.money = 0;
  if (!Number.isFinite(p.debt)) p.debt = 0;
  if (p.money < 0) coverShortfall(p, T("Cash ran short: borrowed to cover costs", "Cash no reach: borrow money cover the costs"));
  // Lenders only go so far: beyond this you cut back, sell things and write the rest off.
  const cap = 2_000_000 * Math.pow(p.index, 0.95);
  if (p.debt > cap) {
    p.debt = cap;
    p.stats.stress += 3;
    p.stats.happiness -= 2;
  }
  auditBalance(p);
  p.peakWorth = Math.max(p.peakWorth, netWorth(p));
  for (const k of Object.keys(p.stats) as (keyof Player["stats"])[]) p.stats[k] = clamp(p.stats[k]);
}

/** Fill in fields that older saves do not have. */
export function migrate(g: Game): Game {
  const p = g.p;
  migratePolitics(p);
  const region = stateOf(p).region;
  if (!p.look) p.look = randomLook(p.gender, { region, religion: p.religion });
  if (typeof p.luck !== "number") p.luck = randInt(25, 75);
  if (p.lang !== "en" && p.lang !== "pcm") p.lang = "pcm";
  if (p.spouse && !p.spouse.look) p.spouse.look = randomLook(p.gender === "male" ? "female" : "male", { region });
  for (const k of p.kids) if (!k.look) k.look = kidLook(p.gender === "male" ? p.look : p.spouse?.look, p.gender === "female" ? p.look : p.spouse?.look, k.gender);
  migrateWorld(p);
  for (const b of p.businesses) ensureCrew(p, b);
  for (const n of Object.values(p.npcs)) refreshOccupation(p, n);
  fillClassmates(p);
  if (!p.listings) refreshListings(p);
  syncLegacyFamily(p);
  return g;
}

export function worth(p: Player): number {
  return netWorth(p);
}

// ---------------------------------------------------------------------------
// Starting a life
// ---------------------------------------------------------------------------
export interface NewLifeOptions {
  name: string;
  gender: Gender;
  stateId: string | null;
  tribe: string | null;
  religion: string | null;
  look?: Look;
  /** Optional overrides for testing or custom games. */
  familyConfig?: FamilyConfig;
  forceArchetype?: FamilyArchetype;
  /** Weekly challenge id this life is played for. */
  challenge?: string;
  lang?: "en" | "pcm";
  /** Makes the whole life reproducible for this session. */
  seed?: number | null;
}

/** A short story of the family you were born into. */
export function describeFamily(p: Player): string {
  const dad = p.fam.dadId ? p.npcs[p.fam.dadId] : undefined;
  const mom = p.fam.momId ? p.npcs[p.fam.momId] : undefined;
  const bits: string[] = [T(`You were born into a ${p.fam.label.toLowerCase()}.`, `Dem born you inside ${p.fam.label.toLowerCase()}.`)];
  if (p.fam.structure === "two-parent" && dad && mom) bits.push(T(`Your father is a ${dad.occupation.toLowerCase()} and your mother is a ${mom.occupation.toLowerCase()}.`, `Your papa na ${dad.occupation.toLowerCase()} and your mama na ${mom.occupation.toLowerCase()}.`));
  else if (p.fam.structure === "single-mother" && mom) bits.push(T(`Your mother, a ${mom.occupation.toLowerCase()}, raised you alone.`, `Your mama, wey be ${mom.occupation.toLowerCase()}, raise you alone.`));
  else if (p.fam.structure === "single-father" && dad) bits.push(T(`Your father, a ${dad.occupation.toLowerCase()}, raised you alone.`, `Your papa, wey be ${dad.occupation.toLowerCase()}, raise you alone.`));
  else if (p.fam.structure === "grandparents") bits.push(T("Your grandparents are raising you.", "Your grandparents dey raise you."));
  else if (p.fam.structure === "relatives") bits.push(T("Relatives are raising you.", "Your relatives dey raise you."));
  else if (p.fam.structure === "divorced" && dad && mom) bits.push(T(`Your parents (a ${dad.occupation.toLowerCase()} and a ${mom.occupation.toLowerCase()}) have separated.`, `Your parents (${dad.occupation.toLowerCase()} and ${mom.occupation.toLowerCase()}) don separate.`));
  else if (p.fam.structure === "parents-abroad") bits.push(T("Your parents live abroad and send money home.", "Your parents dey abroad and dem dey send money come house."));
  else if (p.fam.structure === "orphan") bits.push(T("You lost your parents early. An aunt takes care of you.", "You lose your parents early. One aunty dey take care of you."));
  if (p.fam.siblings > 0) bits.push(T(`You have ${p.fam.siblings} sibling${p.fam.siblings > 1 ? "s" : ""}.`, `You get ${p.fam.siblings} ${p.fam.siblings > 1 ? "brothers and sisters" : "brother or sister"}.`));
  return bits.join(" ");
}

function pickBirthState(): string {
  const items = TRAVEL_STATES.map((s) => ({ item: s.id, w: birthWeight(s.id) }));
  return weightedPick(items) ?? "niger";
}

function enrollByAge(p: Player) {
  p.edu = "none";
  p.school = null;
  if (p.age >= 18) p.edu = "secondary";
  else if (p.age >= 12) { p.edu = "primary"; p.school = { stage: "secondary", yearsLeft: 18 - p.age, type: "school" }; }
  else if (p.age >= 6) p.school = { stage: "primary", yearsLeft: 12 - p.age, type: "school" };
}

export function newGame(opts: NewLifeOptions): Game {
  if (opts.seed !== undefined && opts.seed !== null) setSeed(opts.seed);
  setLang(opts.lang);
  const stateId = opts.stateId ?? pickBirthState();
  const st = STATE_BY_ID[stateId];
  const tribe = opts.tribe ?? pick(TRIBES_BY_REGION[st.region]);
  const religion = opts.religion ?? defaultReligion(st.region);
  const surnamePool = poolFor(tribe).surnames;
  const raw = opts.name.trim();
  const [first, ...rest] = raw.split(/\s+/);
  const given = first || randomName(tribe, opts.gender);
  const surname = rest.join(" ") || pick(surnamePool);
  const look = opts.look ?? randomLook(opts.gender, { region: st.region, religion });
  const p = {
    lang: (opts.lang ?? "pcm") as "en" | "pcm",
    id: uid(),
    name: given,
    surname,
    gender: opts.gender,
    tribe,
    religion,
    birthState: stateId,
    state: stateId,
    age: 0,
    birthYear: START_YEAR,
    generation: 1,
    alive: true,
    cause: "",
    classAtBirth: "middle",
    stats: { health: randInt(70, 100), happiness: randInt(70, 95), smarts: randInt(20, 80), looks: randInt(20, 90), stress: 5, connections: 5, reputation: 50, fitness: 45 },
    money: 0,
    debt: 0,
    index: 1,
    edu: "none",
    course: null,
    school: null,
    job: null,
    houses: [],
    holdings: [],
    look,
    luck: randInt(20, 80),
    family: { state: stateId, happy: 70, parentsAlive: true },
    spouse: null,
    kids: [],
    traveled: false,
    actionsLeft: 3,
    prison: 0,
    politics: null,
    nation: freshNation(),
    loot: 0,
    goodDeeds: 0,
    prestige: 0,
    kidnaps: 0,
    flags: {},
    achievements: [],
    peakWorth: 0,
    log: [],
  } as unknown as Player;
  initWorld(p, st, opts.familyConfig, opts.forceArchetype);
  assignGoals(p);
  if (opts.challenge) p.challenge = { id: opts.challenge };
  setDeflator(1);
  addLog(p, T(`You were born in ${st.capital}, ${st.name} State. You are ${tribe}, ${religion}.`, `Dem born you for ${st.capital}, ${st.name} State. You be ${tribe}, ${religion}.`));
  addLog(p, describeFamily(p));
  if (st.opp <= 3) addLog(p, T("Opportunities are few in your area. Many people here dream of moving to Abuja or Lagos.", "Opportunity no plenty for your area. Plenty people here dey dream to move go Abuja or Lagos."));
  return { p, queue: [], dynasty: { surname, lineage: [] } };
}

// ---------------------------------------------------------------------------
// Death and legacy
// ---------------------------------------------------------------------------
function epitaphFor(p: Player): string {
  const high = p.politics?.highest ?? -1;
  if (high >= 4) {
    if (p.goodDeeds >= 6 && p.loot < p.goodDeeds * 5_000_000_000) return high === 5 ? T("The Reformer President", "President wey Reform Naija") : T("The Reformer Governor", "Governor wey Reform the State");
    if (p.loot > 0 && p.goodDeeds <= 2) return high === 5 ? T("The Looter-in-Chief", "Chief Looter") : T("The Looter Governor", "Governor wey Loot Well Well");
    return T("The Typical Big Man", "Typical Oga at the Top");
  }
  if (p.job?.id === "kidnapper" || p.cause.includes("kidnap")) return T("A Dangerous Name", "Name wey Dey Dangerous");
  if (p.peakWorth / p.index > 1_000_000_000) return T("Self-Made Billionaire", "Billionaire wey Build Himself");
  if (p.peakWorth / p.index > 50_000_000) return T("A Successful Hustler", "Hustler wey Make It");
  if (p.kids.length >= 3) return T("A Family Man/Woman", "Person wey Love Im Family");
  return T("A Survivor", "Survivor");
}

function ensureRecorded(g: Game) {
  const p = g.p;
  if (p.alive || p.flags.recorded) return;
  p.flags.recorded = true;
  if (p.challenge && p.challenge.score === undefined) p.challenge.score = Math.round(netWorth(p) / p.index);
  p.obit = buildObituary(p);
  g.queue = [];
  const high = p.politics?.highest ?? -1;
  const entry: LineageEntry = {
    name: `${p.name} ${p.surname}`,
    generation: p.generation,
    born: p.birthYear,
    died: p.birthYear + p.age,
    ageAtDeath: p.age,
    cause: p.cause || T("Natural causes", "Natural cause"),
    worth: netWorth(p),
    peakWorth: p.peakWorth,
    highestOffice: high >= 0 ? OFFICES[high].title : jobTitle(p),
    state: stateOf(p).name,
    prestige: p.prestige,
    loot: p.loot,
    goodDeeds: p.goodDeeds,
    epitaph: epitaphFor(p),
  };
  g.dynasty.lineage.push(entry);
  addLog(p, T(`You died at ${p.age}: ${entry.cause}.`, `You die at ${p.age}: ${entry.cause}.`));
}

/** Builds the heir's family from who is left: the surviving spouse, siblings, grandparents and relatives. */
function buildHeirWorld(old: Player, kid: Kid, p: Player, estateReal: number) {
  const archetype: FamilyArchetype = estateReal > 250e6 ? "nepo" : estateReal > 60e6 ? "upperMiddle" : estateReal > 6e6 ? "middle" : estateReal > 1.5e6 ? "struggling" : "lapo";
  const income = Math.round(clamp(estateReal * 0.05, 600_000, 500_000_000));
  const ageShift = old.age - kid.age;
  const oldSelf = makeNpc({ role: old.gender === "male" ? "dad" : "mom", gender: old.gender, ageDelta: ageShift, tribe: old.tribe, surname: old.surname, name: `${old.name} ${old.surname}`, look: old.look, income: 0, stateId: old.state });
  oldSelf.alive = false;
  const npcs: Record<string, ReturnType<typeof makeNpc>> = { [oldSelf.id]: oldSelf };
  const providers: string[] = [];
  let spouseNpc: ReturnType<typeof makeNpc> | undefined;
  if (old.spouse) {
    spouseNpc = makeNpc({ role: old.gender === "male" ? "mom" : "dad", gender: old.gender === "male" ? "female" : "male", ageDelta: ageShift, tribe: old.tribe, name: old.spouse.name, look: old.spouse.look, income, generosity: randInt(35, 80), strictness: randInt(25, 75), responsibility: randInt(40, 85), closeness: randInt(60, 95), stateId: old.state });
    npcs[spouseNpc.id] = spouseNpc;
    providers.push(spouseNpc.id);
  }
  for (const k of old.kids) {
    if (k === kid) continue;
    const s = makeNpc({ role: "sibling", gender: k.gender, ageDelta: k.age - kid.age || 1, tribe: old.tribe, name: `${k.name} ${old.surname}`, look: k.look, income: 0, closeness: randInt(50, 90) });
    npcs[s.id] = s;
  }
  for (const n of Object.values(old.npcs)) {
    if (["dad", "mom", "guardian", "grandparent"].includes(n.role) && n.alive) {
      const g = { ...n, role: "grandparent" as const, ageDelta: old.age + n.ageDelta - kid.age };
      npcs[g.id] = g;
      if (!spouseNpc && kid.age < 18 && providers.length === 0) providers.push(g.id);
    } else if (n.role === "sibling" && n.alive) {
      const u = { ...n, role: n.gender === "male" ? ("uncle" as const) : ("aunt" as const), ageDelta: old.age + n.ageDelta - kid.age, income: Math.max(n.income, 1_500_000) };
      npcs[u.id] = u;
      if (!spouseNpc && kid.age < 18 && providers.length === 0) providers.push(u.id);
    } else if (n.role === "uncle" || n.role === "aunt") {
      if (n.alive) npcs[n.id] = { ...n, ageDelta: old.age + n.ageDelta - kid.age };
    }
  }
  if (providers.length === 0 && kid.age < 18) {
    const aunt = makeNpc({ role: "guardian", gender: "female", ageDelta: randInt(28, 42), tribe: old.tribe, income: Math.max(income, 2_000_000), stateId: old.state, surname: old.surname, look: randomLook("female", { region: stateOf(old).region }) });
    npcs[aunt.id] = aunt;
    providers.push(aunt.id);
  }
  const fam: FamilyBg = {
    archetype, label: T("Family carrying on after a loss", "Family wey dey continue after dem lose person"), structure: spouseNpc ? (old.gender === "male" ? "single-mother" : "single-father") : kid.age < 18 ? "relatives" : "orphan",
    income: providers.length ? income : Math.round(income * 0.3), generosity: randInt(35, 80), strictness: randInt(25, 75), responsibility: randInt(40, 85), closeness: randInt(55, 90),
    trend: "steady", debts: 0, connections: old.stats.connections > 40, siblings: old.kids.length - 1, tags: [T(`Heir to ${old.name} ${old.surname}`, `Heir of ${old.name} ${old.surname}`)], cutOff: [], given: [], providers,
    dadId: spouseNpc?.role === "dad" ? spouseNpc.id : oldSelf.role === "dad" ? oldSelf.id : undefined,
    momId: spouseNpc?.role === "mom" ? spouseNpc.id : oldSelf.role === "mom" ? oldSelf.id : undefined, expectContribution: false,
  };
  p.fam = fam;
  p.npcs = npcs;
  p.month = 1;
  p.ledger = [];
  p.txCount = 0;
  p.fin = [];
  p.loans = [];
  p.credit = clamp(old.credit - 5, 30, 75);
  p.subs = [];
  p.skills = { ...old.skills };
  p.possessions = { phone: kid.age >= 10, smartphone: kid.age >= 13 && estateReal > 4e6, laptop: kid.age >= 16 && estateReal > 4e6 };
  p.vehicles = old.vehicles.map((v) => ({ ...v, loanId: undefined }));
  p.conditions = [];
  p.insurance = { plan: "none" };
  p.rel = { profile: null, deck: [], partners: [], swipesLeft: 12, chatsLeft: 10 };
  p.social = null;
  p.businesses = [];
  p.market = { ...old.market };
  p.bets = { staked: 0, won: 0, count: 0, slotsLeft: 8, compulsion: 0 };
  p.crime = { record: [], heat: 0, skill: 10, violence: 0, cases: [] };
  p.will = null;
  p.housing = kid.age >= 18 && p.houses.some((h) => h.state === p.state && h.use === "owner") ? { type: "owned", stateId: p.state, annualRent: 0, paidUntil: 0, arrears: 0, landlord: "" } : familyHousing(p.state);
  for (let i = 0; i < 2; i++) addFriend(p);
  syncLegacyFamily(p);
}

export function startHeir(g0: Game, kidIndex: number): Game {
  const g = structuredClone(g0);
  const old = g.p;
  const kid = old.kids[kidIndex];
  if (!kid) return g;
  const deathYear = old.birthYear + old.age;
  const plan = planEstate(old, kidIndex);
  const f = plan.heirFraction;
  // Debts are paid out of the estate first: cash, then investments.
  let owed = totalDebt(old);
  let cash = old.money;
  const fromCash = Math.min(cash, owed);
  cash -= fromCash;
  owed -= fromCash;
  const holdTotal = old.holdings.reduce((s, h) => s + h.value, 0);
  const holdScale = holdTotal > 0 ? Math.max(0, holdTotal - Math.min(holdTotal, owed)) / holdTotal : 0;
  const houses = [...old.houses].sort((a, b) => b.value - a.value);
  const nHouses = f >= 0.99 ? houses.length : Math.max(f > 0.3 && houses.length ? 1 : 0, Math.round(houses.length * f));
  const cars = [...old.vehicles].sort((a, b) => b.value - a.value);
  const nCars = f >= 0.99 ? cars.length : Math.round(cars.length * f);
  const estateReal = (cash * f + holdTotal * holdScale * f + houses.slice(0, nHouses).reduce((s, h) => s + h.value, 0)) / old.index;
  const p: Player = {
    ...structuredClone(old),
    id: uid(),
    name: kid.name,
    gender: kid.gender,
    age: kid.age,
    birthYear: deathYear - kid.age,
    generation: old.generation + 1,
    alive: true,
    cause: "",
    birthState: old.state,
    classAtBirth: classOf(estateReal * 0.1),
    stats: {
      health: randInt(65, 100), happiness: randInt(55, 90), smarts: clamp(old.stats.smarts + randInt(-20, 20), 15, 95), looks: randInt(25, 90),
      stress: 10, connections: Math.round(old.stats.connections * 0.6), reputation: Math.round(30 + old.stats.reputation * 0.5), fitness: randInt(35, 65),
    },
    money: 0,
    debt: 0,
    edu: "none",
    course: null,
    school: null,
    job: null,
    houses: houses.slice(0, nHouses).map((h) => ({ ...h })),
    holdings: old.holdings.map((h) => ({ ...h, invested: Math.round(h.invested * holdScale * f), value: Math.round(h.value * holdScale * f), units: h.units !== undefined ? h.units * holdScale * f : undefined })).filter((h) => h.value > 0),
    look: kid.look ?? randomLook(kid.gender, { region: stateOf(old).region, religion: old.religion }),
    luck: clamp(old.luck + randInt(-20, 20), 10, 90),
    family: { state: old.state, happy: 60, parentsAlive: false },
    spouse: null,
    kids: [],
    traveled: false,
    actionsLeft: 3,
    prison: 0,
    politics: null,
    nation: freshNation(),
    loot: 0,
    goodDeeds: 0,
    prestige: Math.round(old.prestige * 0.5),
    kidnaps: 0,
    flags: Object.fromEntries(Object.entries(old.flags).filter(([k]) => k.startsWith("own_"))) as Player["flags"],
    achievements: [],
    peakWorth: 0,
    log: [],
  };
  setDeflator(p.index); setLang(p.lang);
  old.vehicles = cars.slice(0, nCars);
  buildHeirWorld(old, kid, p, estateReal);
  assignGoals(p);
  enrollByAge(p);
  assignSchoolType(p);
  if (p.age >= 18 && estateReal > 30e6 && chance(0.6)) {
    p.edu = "tertiary";
    p.course = pick(["Law", "Medicine", "Engineering", "Accounting"]);
  }
  p.houses = p.houses.map((h) => ({ ...h, use: h.state === p.state ? "owner" : "empty" }));
  p.flags.dynasty = old.generation;
  const inherit = Math.round((cash + bizValue(old)) * f);
  if (inherit > 0) transact(p, { amount: inherit, reason: T(`Inheritance from ${old.name} ${old.surname}${plan.hasWill ? " (as set out in the will)" : " (no will)"}`, `Inheritance from ${old.name} ${old.surname}${plan.hasWill ? " (as the will talk)" : " (no will)"}`), category: "inheritance" });
  if (nHouses > 0) transact(p, { amount: 0, memo: true, reason: T(`Inherited ${nHouses} propert${nHouses > 1 ? "ies" : "y"} from ${old.name}`, `You inherit ${nHouses} propert${nHouses > 1 ? "ies" : "y"} from ${old.name}`), category: "inheritance" });
  if (plan.charityPct > 0) p.stats.reputation = clamp(p.stats.reputation + Math.round(plan.charityPct / 5));
  settle(p);
  const parts: string[] = [T(`You are ${p.name} ${p.surname}, the ${old.gender === "male" ? "son" : "daughter"} of ${old.name}.`, `You be ${p.name} ${p.surname}, ${old.name} im ${old.gender === "male" ? "son" : "daughter"}.`)];
  parts.push(plan.hasWill
    ? T(`Under the will, you inherit ${Math.round(f * 100)}% of the estate: ${naira(p.money)} in cash${p.houses.length ? `, ${p.houses.length} propert${p.houses.length > 1 ? "ies" : "y"}` : ""}${p.holdings.length ? " and investments" : ""}.`, `Based on the will, you inherit ${Math.round(f * 100)}% of the estate: ${naira(p.money)} cash${p.houses.length ? `, ${p.houses.length} propert${p.houses.length > 1 ? "ies" : "y"}` : ""}${p.holdings.length ? " and investments" : ""}.`)
    : T(`${old.name} left no will, so the law divided the estate. You receive ${naira(p.money)}${p.houses.length ? ` and ${p.houses.length} propert${p.houses.length > 1 ? "ies" : "y"}` : ""}.`, `${old.name} no leave will, so the law share the estate. You collect ${naira(p.money)}${p.houses.length ? ` and ${p.houses.length} propert${p.houses.length > 1 ? "ies" : "y"}` : ""}.`));
  if (plan.others.length) parts.push(T(`Others named: ${plan.others.map((o) => `${o.label} ${o.pct}%`).join(", ")}.`, `Other people wey dem name: ${plan.others.map((o) => `${o.label} ${o.pct}%`).join(", ")}.`));
  addLog(p, parts.join(" "));
  const queue: Pending[] = [];
  if (chance(plan.disputeChance) && estateReal > 2e6) queue.push({ kind: "event", id: "inheritance_dispute", data: { month: randInt(1, 12), claim: Math.round(p.money * 0.25 + p.houses.reduce((s, h) => s + h.value, 0) * 0.1) } });
  return { p, queue, dynasty: g.dynasty };
}

export function startNewFamily(g: Game, opts: NewLifeOptions): Game {
  const ng = newGame(opts);
  ng.dynasty.lineage = [];
  return ng;
}

// ---------------------------------------------------------------------------
// The year tick
// ---------------------------------------------------------------------------
function deathChance(p: Player): number {
  const a = p.age;
  let d = Math.pow(a / 98, 7);
  d += ((100 - p.stats.health) / 100) * (a > 30 ? 0.006 : 0.002);
  if (p.stats.health < 15) d += 0.1;
  if (a < 5) d += 0.008;
  return clamp(d, 0, 0.95);
}
const causes = () => [T("Heart attack", "Heart attack"), T("Stroke", "Stroke"), T("Complications of malaria", "Malaria complications"), T("A short illness", "Short sickness"), T("Kidney failure", "Kidney failure"), T("Typhoid complications", "Typhoid complications"), T("Hypertension", "High blood pressure")];

function schoolTick(p: Player, lines: string[], pending: Pending[]) {
  if (p.prison > 0) return;
  if (p.age === 6 && !p.school && p.edu === "none" && p.flags.schoolStart === undefined) {
    // Some children, mostly from poorer homes, start school late.
    p.flags.schoolStart = p.classAtBirth === "struggling" && chance(0.3) ? 6 + randInt(1, 2) : 6;
  }
  if (!p.school && p.edu === "none" && p.age >= Number(p.flags.schoolStart ?? 6) && p.age <= 9) {
    p.school = { stage: "primary", yearsLeft: 6, type: "school" };
    assignSchoolType(p);
    const t = p.flags.schoolType;
    lines.push(t === "elite" ? T("You start primary school at an expensive international school.", "You start primary school for expensive international school.") : t === "private" ? T("You start primary school at a private school with a school bus.", "You start primary school for private school wey get school bus.") : T("You start primary school at the local public school.", "You start primary school for the local public school."));
    return;
  }
  if (p.flags.admOpen && !p.school && p.age > Number(p.flags.admAge ?? 0) + 1) {
    delete p.flags.admOpen;
    lines.push(T("Your admission window closes. You will need to write JAMB again.", "Your admission window don close. You go write JAMB again."));
  }
  if (!p.school) return;
  if (p.school.stage !== "tertiary") bump(p, "smarts", chance(0.5) ? 1 : 0);
  if (p.school.stage !== "tertiary" && p.school.yearsLeft > 1 && p.stats.smarts < 35 && chance(0.1)) {
    p.school.yearsLeft += 1;
    lines.push(T("You fail the end-of-year exams and repeat the class.", "You fail end-of-year exam and you repeat class."));
  }
  if (p.school.stage === "tertiary" && p.school.type === "university") campusYearEnd(p, lines);
  if (!p.school) return;
  p.school.yearsLeft -= 1;
  if (p.school.yearsLeft > 0) return;
  const stage = p.school.stage;
  const prevType = p.school.type;
  p.school = null;
  if (stage === "primary") {
    p.edu = "primary";
    p.school = { stage: "secondary", yearsLeft: 6, type: "school" };
    assignSchoolType(p);
    lines.push(T("You pass Common Entrance and start secondary school.", "You pass Common Entrance and start secondary school."));
    pending.push({ kind: "event", id: "boarding_choice", data: {} });
  } else if (stage === "secondary") {
    p.edu = "secondary";
    lines.push(T("You finish secondary school. Your WAEC results are out.", "You finish secondary school. WAEC result don come out."));
    pending.push({ kind: "event", id: "jamb", data: {} });
  } else if (stage === "tertiary" && prevType === "vocational") {
    lines.push(finishTrade(p));
  } else if (stage === "tertiary" && prevType === "postgrad") {
    lines.push(finishPostgrad(p));
  } else {
    p.edu = "tertiary";
    if (p.campus) graduateCampus(p, lines);
    else lines.push(T(`You graduate${p.course ? ` with a degree in ${p.course}` : ""}. Your family throws a small party.`, `You graduate${p.course ? ` with degree for ${p.course}` : ""}. Your family throw small party.`));
    bump(p, "smarts", 3);
    schoolHousing(p, false);
    const grad = graduationData(p, true);
    if (grad) pending.push({ kind: "event", id: "graduation_support", data: grad });
    if (!p.flags.nysc && p.age >= NYSC_MAX_AGE) { p.flags.nysc = true; p.flags.nyscExempt = true; lines.push(T("You are over 30, so NYSC will not mobilise you. You get an exemption letter instead.", "You don pass 30, so NYSC no go mobilise you. Dem go give you exemption letter.")); }
    else if (!p.flags.nysc) pending.push({ kind: "event", id: "nysc", data: { posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id } });
  }
}

export function ageUp(g0: Game): Game {
  const g = structuredClone(g0);
  const p = g.p;
  setLang(p.lang);
  if (!p.alive || g.queue.length > 0) return g;
  const wasInside = p.prison > 0;
  p.age += 1;
  p.actionsLeft = 3 + (p.politics && p.politics.office >= 2 ? 1 : 0);
  const lines: string[] = [];
  const pending: Pending[] = [];

  // Inflation
  let rate = rand(0.03, 0.13);
  if (chance(0.06)) {
    const shock = rand(0.08, 0.2);
    rate += shock;
    lines.push(T(`Economic shock: prices jump ${Math.round(rate * 100)}% this year.`, `Economic shock: prices jump ${Math.round(rate * 100)}% this year o.`));
  }
  p.index *= 1 + rate;
  setDeflator(p.index); setLang(p.lang);
  for (const h of p.houses) houseYear(p, h, rate, lines);
  for (const k of p.kids) k.age += 1;

  schoolTick(p, lines, pending);

  if (p.prison > 0) {
    p.prison -= 1;
    bump(p, "health", -3);
    bump(p, "happiness", -4);
    lines.push(p.prison > 0 ? T("Another year in Kuje prison.", "Another year for Kuje prison.") : T("You are released from prison.", "Dem don release you from prison."));
    if (p.prison === 0) { politicalRelease(p, pending); nyscRelease(p, pending); }
    runMonths(p, { lines, pending, yearPay: 0, rate });
    settle(p);
  } else {
    let yearPay = 0;
    const j = jobDef(p);
    if (p.age >= 16 && p.job && j) {
      yearPay = annualPay(p);
      p.job.years += 1;
      if (!j.selfEmployed && !SERVICE_JOBS.includes(j.id) && !SOCIAL_JOBS.includes(j.id) && p.job.rank < j.ladder.length - 1 && p.job.years >= 2) {
        const base = j.group === "creative" ? 0.05 + (p.stats.looks + p.stats.smarts) / 1800 + fameBonus(p) : 0.07 + p.stats.connections / 500 + p.stats.smarts / 700;
        if (chance(base + p.stats.connections / 800 + luckBonus(p) / 3)) {
          p.job.rank += 1;
          p.job.years = 0;
          lines.push(T(`Promotion! You have become: ${j.ladder[p.job.rank].title}.`, `Promotion! You don become: ${j.ladder[p.job.rank].title}.`));
          if (j.id === "kidnapper" || j.id === "yahoo") bump(p, "reputation", -2);
        }
      }
      if (boardDue(p)) pending.push({ kind: "event", id: "promotion_board", data: { month: randInt(1, 12) } });
      if (j.id === "kidnapper" && chance(0.1 + p.job.rank * 0.04)) pending.push({ kind: "event", id: "arrested", data: { ...(EVENT_DEFS.arrested.init?.(p) ?? {}), month: randInt(1, 12) } });
    }
    runMonths(p, { lines, pending, yearPay, rate });
    settle(p);
    yearlyHoldings(p, rate, lines);
    const fy = p.fin.find((f) => f.age === p.age);
    if (p.age >= 14 && fy && (fy.income > 0 || fy.expense > 0)) lines.push(T(`Money this year: ${naira(fy.income)} in, ${naira(fy.expense)} out.`, `Money for this year: ${naira(fy.income)} enter, ${naira(fy.expense)} comot.`));
  }
  yearlyWorld(p, lines, pending);
  yearlyPromises(p, lines);
  completeProjects(p, lines);
  yearlyNews(p, lines);
  refreshListings(p);
  yearlyHealth(p, lines, pending);
  yearlyRelationships(p, lines, pending);
  yearlyCrime(p, lines, pending);
  yahooYear(p, lines, pending);
  bitYear(p, lines, pending);
  fugitiveYear(p, lines);
  yearlyGrowth(p);
  yearlySocial(p, lines, (id, data) => pending.push({ kind: "event", id, data: { month: randInt(1, 12), ...(data ?? {}) } }));
  p.bets.slotsLeft = 8;
  p.bets.compulsion = clamp(p.bets.compulsion - 4);
  if (p.age === 22 && p.edu === "secondary" && !p.fam.given.includes("graduationGift")) {
    const grad = graduationData(p, false);
    if (grad) pending.push({ kind: "event", id: "graduation_support", data: grad });
  }
  p.credit = clamp(p.credit + (p.loans.some((l) => l.direction === "owed" && l.missed > 0) ? 0 : 1));

  { const snap = snapshot(p); yearlyPolitics(p, lines, pending); reconcile(p, snap, T("Government pay and allowances", "Government pay and allowances"), "salary"); }
  if (p.flags.efccWatch && (p.politics?.office ?? -1) < 0 && p.loot > 0 && chance(0.12)) pending.push({ kind: "event", id: "efcc", data: {} });

  // Body and mind
  if (p.age > 45) p.stats.health -= (p.age - 45) * 0.03 + rand(0, 0.8);
  else p.stats.health += rand(-1, 1.8);
  if (p.stats.health < 60 && p.age < 60) p.stats.health += 1.5;
  if (p.stats.stress > 70) p.stats.health -= 2;
  p.stats.stress *= 0.85;
  p.stats.happiness += (65 - p.stats.stress * 0.3 - p.stats.happiness) * 0.15 + rand(-3, 3);
  p.stats.looks -= p.age > 35 ? rand(0, 1.2) : 0;
  if (p.spouse) p.spouse.happy = clamp(p.spouse.happy + rand(-6, 5));

  // Kidnapping is rare and random.
  if (chance(kidnapRisk(p))) pending.unshift({ kind: "kidnap", k: makeKidnap(p) });

  // Random life events
  const used = new Set<string>(pending.flatMap((x) => (x.kind === "event" ? [x.id] : [])));
  if (p.age >= 6 && p.prison >= 0) {
    const inside = p.prison > 0;
    const tries = inside ? 1 : chance(p.age < 13 ? 0.28 : 0.7) ? 1 : 0;
    for (let i = 0; i < tries; i++) {
      const ev = weightedPick(ALL_EVENTS.filter((e) => !used.has(e.id) && eligible(p, e.id) && (!inside || PRISON_EVENT_IDS.has(e.id))).map((e) => ({ item: e, w: e.weight(p) })));
      if (ev) {
        used.add(ev.id);
        pending.push({ kind: "event", id: ev.id, data: { ...(ev.init ? ev.init(p) : {}), month: randInt(1, 12) } });
      }
    }
    const autos = inside ? 0 : chance(0.55) ? 2 : 1;
    const taken = new Set<string>();
    for (let i = 0; i < autos; i++) {
      const au = weightedPick(ALL_AUTOS.filter((a) => !taken.has(a.id) && eligible(p, a.id)).map((a) => ({ item: a, w: a.weight(p) })));
      if (au) {
        taken.add(au.id);
        p.month = randInt(1, 12);
        const snap = snapshot(p);
        const msg = au.run(p);
        reconcile(p, snap, msg.length > 70 ? `${msg.slice(0, 67)}...` : msg, "event");
        lines.push(msg);
      }
    }
  }

  if (typeof p.flags.spawnCondition === "string") {
    const r = developCondition(p, p.flags.spawnCondition);
    lines.push(...r.lines);
    pending.push(...r.pending);
    delete p.flags.spawnCondition;
  }

  // Debt, tax and illness interplay with death
  settle(p);
  if (chance(deathChance(p))) {
    p.alive = false;
    p.cause = p.age >= 66 ? T("Old age", "Old age") : pick(causes());
  }

  if (p.prison > 0) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const x = pending[i];
      if (x.kind === "event" && !PRISON_EVENT_IDS.has(x.id)) pending.splice(i, 1);
    }
  }
  nyscYear(p, lines, pending, wasInside);
  realtorYear(p, lines);
  refreshPeople(p);
  engageYear(p, lines);
  p.traveled = false;
  p.month = 12;
  for (const l of lines) addLog(p, l);
  if (lines.length === 0 && pending.length === 0) addLog(p, T("A quiet year. No wahala.", "Quiet year. No wahala."));
  g.queue = p.alive ? pending : [];
  prune(g);
  ensureRecorded(g);
  return g;
}

// ---------------------------------------------------------------------------
// Resolving events
// ---------------------------------------------------------------------------
/** Drop queued events that no longer make sense (e.g. re-election after you were ousted). */
function prune(g: Game) {
  g.queue = g.queue.filter((pe) => {
    if (pe.kind !== "event") return true;
    if (g.p.prison > 0 && !PRISON_EVENT_IDS.has(pe.id)) return false;
    const def = EVENT_DEFS[pe.id];
    return Boolean(def) && (!def.valid || def.valid(g.p));
  });
}

export interface PendingView {
  title: string;
  text: string;
  choices: { label: string; sub?: string; disabled?: string }[];
}

export function describePending(g: Game): PendingView | null {
  setDeflator(g.p.index); setLang(g.p.lang);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "event") return null;
  const def = EVENT_DEFS[pe.id];
  if (!def) return null;
  return {
    title: tx(def.title),
    text: def.text(g.p, pe.data),
    choices: def.choices(g.p, pe.data).map((c) => ({ label: c.label, sub: c.sub, disabled: c.disabled ? c.disabled : undefined })),
  };
}

export function choose(g0: Game, idx: number): { g: Game; text: string } {
  const g = structuredClone(g0);
  setDeflator(g.p.index); setLang(g.p.lang);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "event") return { g: g0, text: "" };
  const def = EVENT_DEFS[pe.id];
  const choice = def.choices(g.p, pe.data)[idx];
  if (!choice || choice.disabled) return { g: g0, text: "" };
  g.queue.shift();
  g.p.month = Number(pe.data.month ?? 12) || 12;
  const snap = snapshot(g.p);
  const res = choice.run(g.p);
  reconcile(g.p, snap, `${tx(def.title)}: ${choice.label}`, "event", pe.id);
  g.p.month = 12;
  const text = typeof res === "string" ? res : res.text;
  if (typeof res !== "string" && res.spawn) g.queue.unshift(...res.spawn);
  addLog(g.p, text);
  settle(g.p);
  prune(g);
  ensureRecorded(g);
  return { g, text };
}

export function kidnapAction(g0: Game, a: KidnapAction): Game {
  const g = structuredClone(g0);
  setDeflator(g.p.index); setLang(g.p.lang);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "kidnap") return g0;
  const snap = snapshot(g.p);
  kidnapStep(g.p, pe.k, a);
  reconcile(g.p, snap, T("Kidnap emergency: ransom arrangements", "Kidnap emergency: ransom arrangement"), "emergency");
  settle(g.p);
  return g;
}

/** Called once the player has read the kidnap outcome. */
export function ackKidnap(g0: Game): Game {
  const g = structuredClone(g0);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "kidnap" || pe.k.stage !== "over") return g0;
  g.queue.shift();
  addLog(g.p, T(`KIDNAPPED: ${pe.k.summary ?? ""}`, `DEM KIDNAP YOU: ${pe.k.summary ?? ""}`));
  settle(g.p);
  ensureRecorded(g);
  return g;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------
export type Action =
  | { t: "apply"; job: string; bribe?: boolean }
  | { t: "quit" }
  | { t: "expand" }
  | { t: "travel"; to: string; mode?: TransportMode }
  | { t: "build"; kind: HouseKind }
  | { t: "sell"; id: string }
  | { t: "use"; id: string; use: HouseUse }
  | { t: "send"; amount: number }
  | { t: "activity"; id: string }
  | { t: "japa" }
  | { t: "luxury"; id: string }
  | { t: "invest"; kind: HoldingKind; amount: number }
  | { t: "divest"; id: string }
  | { t: "joinPolitics" }
  | { t: "contest" }
  | { t: "gov"; id: string }
  | { t: "power"; id: string }
  | { t: "coup" }
  | { t: "loanTake"; offer: string; amount: number; term: number }
  | { t: "loanRepay"; id: string; amount: number }
  | { t: "ask"; npc: string; kind: SupportKind; amount: number }
  | { t: "borrow"; npc: string; amount: number }
  | { t: "give"; npc: string; amount: number; mode: "gift" | "loan" }
  | { t: "rent"; tier: string }
  | { t: "moveHome" }
  | { t: "car"; op: "service0" | "service1" | "service2" | "buy" | "buyLoan" | "sell" | "repair" | "insure" | "taxi" | "ridehail" | "personal" | "rental"; id: string }
  | { t: "insure"; plan: "none" | "basic" | "premium" }
  | { t: "checkup" }
  | { t: "treat"; cond: string; facility: string }
  | { t: "yahoo"; op: "hunt" | "work" | "cash" | "drop" | "kit" | "low" | "launder" | "settle" | "quit"; id?: string; how?: Approach }
  | { t: "bl"; op: "pet" | "petcare" | "rehome" | "lotto" | "style" | "talent" | "practice" | "dna"; id?: string; care?: "play" | "feed" | "vet" }
  | { t: "dating"; op: "profile" | "swipe" | "chat" | "date" | "spend" | "official" | "breakup" | "night" | "marry" | "propose" | "meet" | "hookup" | "movein" | "planb" | "divorce"; npc?: string; like?: boolean; tone?: ChatTone; plan?: DatePlan; prot?: Protection; bio?: string; interests?: string[]; looking?: "men" | "women" | "everyone" }
  | { t: "realtor"; op: "show" | "find"; client?: string; listing?: string }
  | { t: "biz"; op: "start" | "upgrade" | "hire" | "fire" | "manager" | "sell" | "close" | "recruit" | "pick" | "dismiss" | "raise" | "train" | "price" | "ads" | "stock" | "accept" | "haggle" | "decline" | "lever" | "levers" | "act"; id: string; sets?: Record<string, number>; key?: string; role?: string; name?: string; offer?: string; worker?: string; idx?: number; v?: number }
  | { t: "bet"; kind: BetKind; stake: number }
  | { t: "social"; op: "account" | "post" | "collab" | "gear"; platform?: Platform; content?: ContentKind }
  | { t: "crime"; id: string }
  | { t: "will"; id: string; pct: number }
  | { t: "learn"; id: string; mode?: "course" | "practice" | "mentor" }
  | { t: "growth"; id: string }
  | { t: "gym" }
  | { t: "prison"; op: "work" | "study" | "appeal" | "escape" }
  | { t: "enlist"; branch?: "army" | "navy" | "airforce" }
  | { t: "mortgage"; kind: HouseKind; years: number }
  | { t: "trade"; id: string }
  | { t: "postgrad"; id: string }
  | { t: "adopt" }
  | { t: "interact"; npc: string; id: string }
  | { t: "friend" }
  | { t: "jamb"; cheat?: boolean }
  | { t: "enrol"; uni: string; major: string; pay: "family" | "self" | "aid" }
  | { t: "campus"; op: string; arg?: string }
  | { t: "advisor"; op: "hire" | "fire"; tier?: 1 | 2 | 3 }
  | { t: "develop"; id: string; kind: HouseKind }
  | { t: "surrender" }
  | { t: "license"; settle?: boolean }
  | { t: "fertility" }
  | { t: "property"; id: string; mode: PurchaseMode; years?: number }
  | { t: "buy"; item: "phone" | "smartphone" | "laptop" };

export interface ActivityDef {
  id: string;
  label: string;
  desc: string;
  cost: number;
  minAge: number;
}
export const ACTIVITIES: ActivityDef[] = [
  { id: "study", get label() { return T("Study hard", "Read book well well"); }, get desc() { return T("Boost your smarts.", "Make your brain sharp."); }, cost: 0, minAge: 6 },
  { id: "gym", get label() { return T("Exercise / play football", "Exercise / play football"); }, get desc() { return T("Health and a little happiness.", "Body strong small, mind sweet small."); }, cost: 0, minAge: 6 },
  { id: "worship", get label() { return T("Go to church / mosque", "Go church / mosque"); }, get desc() { return T("Peace of mind and good reputation.", "Peace of mind and good name."); }, cost: 20_000, minAge: 8 },
  { id: "hawk", get label() { return T("Hawk after school", "Hawk after school"); }, get desc() { return T("Small money, small stress.", "Small money, small stress."); }, cost: 0, minAge: 10 },
  { id: "network", get label() { return T("Network at an owambe", "Do network for owambe"); }, get desc() { return T("Meet useful people.", "Meet people wey go help you."); }, cost: 80_000, minAge: 16 },
  { id: "gig", get label() { return T("Do a side gig", "Do side gig"); }, get desc() { return T("Quick cash from odd jobs.", "Quick cash from small small jobs."); }, cost: 0, minAge: 16 },
  { id: "date", get label() { return T("Look for love", "Go find love"); }, get desc() { return T("Meet someone special.", "Meet person wey special."); }, cost: 0, minAge: 18 },
  { id: "godfather", get label() { return T("Look for a godfather", "Go find godfather"); }, get desc() { return T("Powerful backing, but scammers lurk.", "Strong backing, but scammers dey around."); }, cost: 500_000, minAge: 20 },
];

export function activityBlock(p: Player, a: ActivityDef): string | null {
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (p.age < a.minAge) return T(`From age ${a.minAge}`, `Start from age ${a.minAge}`);
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain this year");
  if (a.cost && p.money < I(p, a.cost)) return T("Not enough cash", "Cash no reach");
  if (a.id === "date" && (p.spouse || p.flags.dating)) return T("Already with someone", "You don get person already");
  return null;
}

export function applyBlock(p: Player, jobId: string): string | null {
  const j = JOB_BY_ID[jobId];
  if (!j) return T("Unknown job", "Job no dey");
  const need = qualifyBlock(p, j);
  if (need) return need;
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain this year");
  if (serving(p) && j.group === "formal") return T("Finish your NYSC year first", "Finish your NYSC year first");
  if (j.selfEmployed && p.money < j.startCost * Math.pow(p.index, 0.9)) return T(`Needs ${naira(j.startCost * Math.pow(p.index, 0.9))} to start`, `You need ${naira(j.startCost * Math.pow(p.index, 0.9))} to start`);
  return null;
}

export const expandCost = expandCostFor;

export function buildCost(p: Player, kind: HouseKind): number {
  return Math.round(HOUSE_KINDS[kind].build * stateOf(p).cost * Math.pow(p.index, 0.95));
}

function actionMeta(a: Action): { reason: string; category: import("./types").TxCategory } {
  switch (a.t) {
    case "apply": return a.bribe ? { reason: T("Bribe to get a job", "Bribe to get job"), category: "other" } : { reason: T("Started a business", "Start business"), category: "business" };
    case "quit": return { reason: T("Left your job", "Quit job"), category: "other" };
    case "expand": return { reason: T("Business expansion", "Business expansion"), category: "business" };
    case "travel": return { reason: T("Travel costs", "Travel cost"), category: "transport" };
    case "build": return { reason: T("Property purchase", "Property purchase"), category: "asset" };
    case "prison": return { reason: T("Prison", "Prison"), category: "other" };
    case "mortgage": return { reason: T("Mortgage", "Mortgage"), category: "asset" };
    case "trade": return { reason: T("Vocational training", "Vocational training"), category: "education" };
    case "postgrad": return { reason: T("Postgraduate study", "Postgraduate study"), category: "education" };
    case "adopt": return { reason: T("Adoption", "Adoption"), category: "family" };
    case "advisor": return { reason: T("Financial adviser", "Financial adviser"), category: "investment" };
    case "interact": case "friend": return { reason: T("Time with people", "Time with people"), category: "personal" };
    case "jamb": return { reason: T("JAMB registration", "JAMB registration"), category: "education" };
    case "enrol": return { reason: T("University admission", "University admission"), category: "education" };
    case "campus": return { reason: T("Campus life", "Campus life"), category: "education" };
    case "develop": return { reason: T("Property development", "Property development"), category: "asset" };
    case "license": return { reason: T("Driving test", "Driving test"), category: "personal" };
    case "surrender": return { reason: T("Surrendered to life", "Surrender for life"), category: "other" };
    case "fertility": return { reason: T("Fertility treatment", "Fertility treatment"), category: "health" };
    case "property": return { reason: T("Property purchase", "Property purchase"), category: "asset" };
    case "sell": return { reason: T("Sold property", "Sell property"), category: "asset" };
    case "use": return { reason: T("Property change", "Property change"), category: "asset" };
    case "send": return { reason: T("Money sent home", "Money wey you send house"), category: "family" };
    case "activity": return { reason: T(`Activity: ${a.id}`, `Activity: ${a.id}`), category: "personal" };
    case "japa": return { reason: T("Japa application costs", "Japa application cost"), category: "other" };
    case "luxury": return { reason: T("Luxury spending", "Luxury spending"), category: "personal" };
    case "invest": return { reason: T("Investment purchase", "Investment purchase"), category: "investment" };
    case "divest": return { reason: T("Investment sold", "Investment sold"), category: "investment" };
    case "joinPolitics": return { reason: T("Party membership and forms", "Party membership and forms"), category: "other" };
    case "contest": return { reason: T("Campaign", "Campaign"), category: "other" };
    case "gov": return { reason: T("Public office proceeds", "Public office proceeds"), category: "crime" };
    case "power": return { reason: T("Political power-building", "Build political power"), category: "other" };
    case "coup": return { reason: T("Coup", "Coup"), category: "crime" };
    case "loanTake": case "loanRepay": return { reason: T("Loan", "Loan"), category: "loan" };
    case "ask": case "borrow": case "give": return { reason: T("Family and friends", "Family and friends"), category: "family" };
    case "rent": case "moveHome": return { reason: T("Housing", "Housing"), category: "rent" };
    case "car": return { reason: T("Vehicle", "Vehicle"), category: "vehicle" };
    case "insure": case "checkup": case "treat": return { reason: T("Healthcare", "Health care"), category: "health" };
    case "dating": return { reason: T("Dating", "Dating"), category: "dating" };
    case "biz": return { reason: T("Business", "Business"), category: "business" };
    case "realtor": return { reason: T("Estate agency", "Estate agency"), category: "business" };
    case "bet": return { reason: T("Betting", "Betting"), category: "betting" };
    case "social": return { reason: T("Social media", "Social media"), category: "social" };
    case "bl": return { reason: T("Lifestyle", "Lifestyle"), category: "personal" };
    case "crime": case "yahoo": return { reason: T("Crime", "Crime"), category: "crime" };
    case "will": case "gym": return { reason: T("Personal", "Personal"), category: "personal" };
    case "learn": return { reason: T("Learning", "Learning"), category: "education" };
    case "growth": return { reason: T("Activity", "Activity"), category: "personal" };
    case "enlist": return { reason: T("Enlistment", "Enlistment"), category: "other" };
    case "buy": return { reason: T("Purchase", "Purchase"), category: "personal" };
  }
}

export function act(g0: Game, a: Action): { g: Game; msg: string } {
  const g = structuredClone(g0);
  const p = g.p;
  setDeflator(p.index); setLang(p.lang);
  const snap = snapshot(p);
  const out = (msg: string) => {
    const meta = actionMeta(a);
    reconcile(p, snap, meta.reason, meta.category);
    addLog(p, msg);
    settle(p);
    ensureRecorded(g);
    return { g, msg };
  };
  if (!p.alive || g.queue.length > 0) return { g: g0, msg: "" };
  const locked = prisonBlock(p, a);
  if (locked) return { g: g0, msg: locked };
  const st = stateOf(p);
  switch (a.t) {
    case "apply": {
      const j = JOB_BY_ID[a.job];
      const block = applyBlock(p, a.job);
      if (!j || block) return { g: g0, msg: block ?? "" };
      p.actionsLeft -= 1;
      if (j.selfEmployed) {
        p.money -= j.startCost * Math.pow(p.index, 0.9);
        p.job = { id: j.id, rank: 0, years: 0 };
        return out(T(`You started your own business: ${j.title}. ${j.ladder[0].title}.`, `You start your own business: ${j.title}. ${j.ladder[0].title}.`));
      }
      let pr = j.group === "creative" ? 0.4 + Math.max(0, ...(j.skillAny ?? []).map(([sk]) => (p.skills[sk] ?? 0) / 250)) : j.group === "crime" ? 0.9 : 0.35 + p.stats.smarts / 250 + p.stats.connections / 150 + st.opp * 0.02 + campusHire(p) - (p.flags.nyscSkipped && j.group === "formal" ? 0.12 : 0);
      if (j.group === "petty") pr = Math.max(pr, 0.75);
      if (a.bribe) {
        const fee = I(p, 300_000);
        if (p.money < fee) return { g: g0, msg: T("Not enough cash to bribe.", "Cash no reach to bribe.") };
        p.money -= fee;
        pr += 0.3;
        if (chance(0.15)) bump(p, "reputation", -10);
      }
      if (SOCIAL_JOBS.includes(j.id)) {
        if (!p.possessions.smartphone) return { g: g0, msg: T("You need a smartphone to start a creator career.", "You need smartphone to start creator career.") };
        p.job = { id: j.id, rank: 0, years: 0 };
        ensureAccount(p, j.id === "youtuber" || j.id === "streamer" ? "vidtube" : j.id === "influencer" ? "gram" : "toktik");
        return out(T(`You start your ${j.title.toLowerCase()} journey as ${p.social?.handle}.`, `You don start your ${j.title.toLowerCase()} journey as ${p.social?.handle}.`));
      }
      if (chance(clamp(pr + luckBonus(p), 0.05, 0.97))) {
        p.job = { id: j.id, rank: 0, years: 0 };
        return out(T(`You got the job: ${j.ladder[0].title}.`, `You get the job: ${j.ladder[0].title}.`));
      }
      return out(T(`You applied for ${j.title} but did not get it.`, `You apply for ${j.title} but dem no give you.`));
    }
    case "quit": {
      if (!p.job) return { g: g0, msg: "" };
      const j = jobDef(p);
      p.job = null;
      return out(T(`You quit your ${j?.title ?? "job"}.`, `You quit your ${j?.title ?? "job"}.`));
    }
    case "expand": {
      const cost = expandCost(p);
      const j = jobDef(p);
      if (cost === null || !p.job || !j || p.money < cost) return { g: g0, msg: T("Cannot expand now.", "You no fit expand now.") };
      p.money -= cost;
      p.job.rank += 1;
      p.job.years = 0;
      const title = j.ladder[p.job.rank].title;
      if (p.job.rank === j.ladder.length - 1 && !p.achievements.includes(`Top of ${j.title}`)) p.achievements.push(`Top of ${j.title}`);
      return out(T(`You invested ${naira(cost)} and expanded: ${title}.`, `You put ${naira(cost)} inside the business and expand: ${title}.`));
    }
    case "travel": {
      const to = STATE_BY_ID[a.to];
      if (!to || a.to === p.state || p.prison > 0 || p.age < 16) return { g: g0, msg: "" };
      const opts = transportOptions(p, to);
      const mode = a.mode ?? opts.find((o) => !o.block)?.id ?? "flight";
      const o = opts.find((x) => x.id === mode);
      if (!o || o.block) return { g: g0, msg: o?.block ?? "" };
      if (p.money < o.cost) return { g: g0, msg: T(`Need ${naira(o.cost)} for the trip.`, `You need ${naira(o.cost)} for this trip.`) };
      transact(p, { amount: -o.cost, reason: T(`Travel to ${to.name} (${o.label})`, `Travel go ${to.name} (${o.label})`), category: "transport" });
      p.traveled = o.road;
      const note = moveTo(p, a.to);
      const oppNote = to.opp > st.opp ? T("More opportunities here.", "More opportunity dey here.") : to.opp < st.opp ? T("Fewer opportunities here.", "Opportunity no plenty here.") : "";
      bump(p, "stress", o.road ? 3 : 0);
      if (chance(o.risk)) {
        g.queue.unshift({ kind: "kidnap", k: makeKidnap(p) });
        return out(T(`On the way to ${to.name} your ${o.road ? "vehicle is stopped by armed men" : "trip is cut short"}...`, `For road go ${to.name}, armed men stop your ${o.road ? "vehicle" : "trip"}...`));
      }
      return out(T(`You travelled to ${to.name} (${to.capital}) by ${o.label.toLowerCase()}. ${oppNote}${note}`, `You travel go ${to.name} (${to.capital}) by ${o.label.toLowerCase()}. ${oppNote}${note}`));
    }
    case "build": {
      if (p.prison > 0 || st.abroad) return { g: g0, msg: "" };
      const cost = buildCost(p, a.kind);
      if (p.money < cost) return { g: g0, msg: T(`Need ${naira(cost)}.`, `You need ${naira(cost)}.`) };
      p.money -= cost;
      const hasOwner = p.houses.some((h) => h.state === p.state && h.use === "owner");
      const h: House = { id: uid(), state: p.state, kind: a.kind, value: Math.round(cost * 1.1), use: hasOwner ? "empty" : "owner", loc: defaultLocationFor(p.state)?.id };
      p.houses.push(h);
      p.prestige += a.kind === "flats" ? 2 : 1;
      bump(p, "happiness", 6);
      return out(T(`You built a ${HOUSE_KINDS[a.kind].label.toLowerCase()} in ${st.name} for ${naira(cost)}.`, `You build ${HOUSE_KINDS[a.kind].label.toLowerCase()} for ${st.name} for ${naira(cost)}.`));
    }
    case "prison": return out(prisonOp(p, a.op));
    case "mortgage": { if (p.prison > 0) return { g: g0, msg: "" }; const m = takeMortgage(p, a.kind, a.years); return out(m); }
    case "trade": return out(enrollTrade(p, a.id));
    case "postgrad": return out(enrollPostgrad(p, a.id));
    case "adopt": return out(adoptChild(p));
    case "interact": return out(interact(p, a.npc, a.id));
    case "friend": return out(makeFriend(p));
    case "jamb": return out(writeJamb(p, Boolean(a.cheat)));
    case "enrol": { const m = enrol(p, a.uni, a.major, a.pay); if (p.campus) fillClassmates(p); return out(m); }
    case "campus": return out(campusDo(p, a.op, a.arg));
    case "advisor": return out(a.op === "hire" ? hireAdvisor(p, a.tier ?? 1) : fireAdvisor(p));
    case "develop": return out(developLand(p, a.id, a.kind));
    case "license": return out(takeDrivingTest(p, Boolean(a.settle)));
    case "surrender": {
      p.alive = false;
      p.cause = T("Surrendered to life", "Surrender for life");
      return out(T("You let go of this life. Someone new will carry the family name.", "You release this life. Another person go carry the family name."));
    }
    case "fertility": return out(fertilityTreatment(p));
    case "property": { const m = buyListing(p, a.id, a.mode, a.years ?? 15); return out(m); }
    case "sell": {
      const i = p.houses.findIndex((h) => h.id === a.id);
      if (i < 0) return { g: g0, msg: "" };
      const h = p.houses[i];
      if (h.project) return { g: g0, msg: T("You cannot sell while it is under construction.", "You no fit sell am while dem still dey build.") };
      const fees = h.loc && h.value > 50_000_000 * p.index ? 0.94 : 1; // agent and legal fees on big sales
      const note = settleHouseLoan(p, h, Math.round(h.value * fees));
      p.houses.splice(i, 1);
      return out(T(`You sold your ${HOUSE_KINDS[h.kind].label.toLowerCase()} in ${locationOf(h.loc)?.name ?? STATE_BY_ID[h.state].name} for ${naira(h.value * fees)}.${note}`, `You sell your ${HOUSE_KINDS[h.kind].label.toLowerCase()} for ${STATE_BY_ID[h.state].name} for ${naira(h.value)}.${note}`));
    }
    case "use": {
      const h = p.houses.find((x) => x.id === a.id);
      if (!h) return { g: g0, msg: "" };
      if (a.use === "family") {
        for (const o of p.houses) if (o.use === "family") o.use = "empty";
        p.family.state = h.state;
        p.family.happy = clamp(p.family.happy + 18);
        h.use = "family";
        return out(T(`Your family moved into your house in ${STATE_BY_ID[h.state].name}. They are overjoyed. More opportunities for them.`, `Your family move enter your house for ${STATE_BY_ID[h.state].name}. Dem happy well well. More opportunity dey for dem.`));
      }
      if (a.use === "owner") for (const o of p.houses) if (o.use === "owner" && o.state === h.state) o.use = "empty";
      h.use = a.use;
      return out(a.use === "rent" ? T(`You listed your house in ${STATE_BY_ID[h.state].name} for rent.`, `You put your house for ${STATE_BY_ID[h.state].name} for rent.`) : a.use === "owner" ? T(`You moved into your house in ${STATE_BY_ID[h.state].name}.`, `You move enter your house for ${STATE_BY_ID[h.state].name}.`) : T("You left the house empty.", "You leave the house empty."));
    }
    case "send": {
      if (a.amount <= 0 || p.money < a.amount) return { g: g0, msg: "" };
      p.money -= a.amount;
      const gain = clamp((a.amount / I(p, 200_000)) * 4, 1, 22);
      p.family.happy = clamp(p.family.happy + gain);
      bump(p, "reputation", 1);
      return out(T(`You sent ${naira(a.amount)} home to ${STATE_BY_ID[p.family.state].name}.`, `You send ${naira(a.amount)} go house for ${STATE_BY_ID[p.family.state].name}.`));
    }
    case "activity": {
      const def = ACTIVITIES.find((x) => x.id === a.id);
      if (!def || activityBlock(p, def)) return { g: g0, msg: activityBlock(p, def ?? ACTIVITIES[0]) ?? "" };
      p.actionsLeft -= 1;
      p.money -= I(p, def.cost);
      switch (def.id) {
        case "study": bump(p, "smarts", 3); bump(p, "stress", 2); return out(T("You studied hard. Knowledge is power.", "You read book well well. Knowledge na power."));
        case "gym": bump(p, "health", 5); bump(p, "happiness", 2); return out(T("You worked out. You feel stronger.", "You do exercise. Your body don strong."));
        case "worship": bump(p, "happiness", 3); bump(p, "reputation", 2); return out(T(`You went to ${p.religion === "Muslim" ? "the mosque" : "church"}. Peace of mind.`, `You go ${p.religion === "Muslim" ? "mosque" : "church"}. Your mind don calm.`));
        case "hawk": { const g2 = I(p, rand(3_000, 9_000)) * (0.5 + st.opp / 10); p.money += g2; bump(p, "stress", 3); bump(p, "health", -1); return out(T(`You hawked on the street and made ${naira(g2)}.`, `You hawk for street and make ${naira(g2)}.`)); }
        case "network": bump(p, "connections", 4); return out(T("You networked at an owambe and exchanged numbers.", "You do network for owambe and swap numbers."));
        case "gig": { const g2 = I(p, rand(8_000, 40_000)) * (0.5 + st.opp / 10); p.money += g2; bump(p, "stress", 2); return out(T(`You did odd jobs and earned ${naira(g2)}.`, `You do some small small jobs and collect ${naira(g2)}.`)); }
        case "date": g.queue.unshift({ kind: "event", id: "love", data: EVENT_DEFS.love.init ? EVENT_DEFS.love.init(p) : {} }); return out(T("You went out looking for love...", "You go out go find love..."));
        case "godfather":
          if (chance(0.25)) return out(T("A 'godfather' collected your money and disappeared. You were scammed.", "One 'godfather' collect your money and disappear. Dem don scam you."));
          bump(p, "connections", 8);
          return out(T("A powerful man took a liking to you. Doors are starting to open.", "One powerful man like you. Doors don start to open."));
      }
      return { g: g0, msg: "" };
    }
    case "japa": return { g: g0, msg: "" };
    case "luxury": {
      const block = luxuryBlock(p, a.id);
      if (block) return { g: g0, msg: block };
      return out(buyLuxury(p, a.id));
    }
    case "invest": {
      const block = investBlock(p, a.kind, a.amount);
      if (block) return { g: g0, msg: block };
      return out(invest(p, a.kind, a.amount));
    }
    case "divest": return out(divest(p, a.id));
    case "joinPolitics": {
      if (canJoinPolitics(p)) return { g: g0, msg: canJoinPolitics(p) ?? "" };
      return out(joinPolitics(p));
    }
    case "contest": {
      if (canContest(p)) return { g: g0, msg: canContest(p) ?? "" };
      const pe = contestPending(p);
      if (!pe) return { g: g0, msg: "" };
      g.queue.unshift(pe);
      return { g, msg: "" };
    }
    case "power": {
      const block = powerMoveBlock(p, a.id);
      if (block) return { g: g0, msg: block };
      return out(runPowerMove(p, a.id));
    }
    case "coup": {
      const block = canPlotCoup(p);
      if (block) return { g: g0, msg: block };
      p.actionsLeft = Math.max(0, p.actionsLeft - 1);
      const res = plotCoup(p);
      if (res.spawn) g.queue.unshift(...res.spawn);
      return out(res.text);
    }
    case "loanTake": {
          const offer = lenderOffers(p).find((o) => o.id === a.offer);
          if (!offer) return { g: g0, msg: "" };
          const block = loanBlock(p, offer, a.amount);
          if (block) return { g: g0, msg: block };
          return out(takeLoan(p, offer, a.amount, clamp(a.term, offer.minTerm, offer.maxTerm)));
        }
        case "loanRepay": {
          const paid = repayLoan(p, a.id, a.amount);
          if (paid <= 0) return { g: g0, msg: T("Nothing to repay, or you are short of cash.", "Nothing to repay, or your cash no reach.") };
          return out(T(`You repaid ${naira(paid)}.`, `You don repay ${naira(paid)}.`));
        }
        case "ask": {
          const n = p.npcs[a.npc];
          if (!n || !n.alive) return { g: g0, msg: "" };
          const spec = SUPPORT_KINDS[a.kind];
          if (!spec || p.age < spec.minAge) return { g: g0, msg: T("You are too young to ask for that.", "You too small to ask for that.") };
          const reply = evaluateSupport(p, n, a.kind, a.amount);
          if (reply.type === "full" || reply.type === "partial" || reply.type === "refuse") return out(applySupport(p, n, a.kind, reply));
          n.asks += 1;
          if (reply.type === "later") {
            if (chance(0.6)) p.flags[`promise_${n.id}_${a.kind}`] = reply.amount > 0 ? reply.amount : a.amount;
            return out(reply.text);
          }
          g.queue.unshift({ kind: "event", id: "support_reply", data: { npcId: n.id, kind: a.kind, rtype: reply.type, amount: Math.round(reply.amount), text: reply.text, month: p.month } });
          return out(reply.text);
        }
        case "borrow": {
          const n = p.npcs[a.npc];
          if (!n || !n.alive || a.amount <= 0) return { g: g0, msg: "" };
          const r = borrowFrom(p, n, a.amount, (pp, nn, aa) => evaluateSupport(pp, nn, "loan", aa));
          return out(r.text);
        }
        case "give": {
          const n = p.npcs[a.npc];
          if (!n || !n.alive || a.amount <= 0) return { g: g0, msg: "" };
          return out(a.mode === "gift" ? giftTo(p, n, a.amount) : lendTo(p, n, a.amount));
        }
        case "rent": return out(rentPlace(p, a.tier));
        case "moveHome": return out(moveHomeToFamily(p));
        case "car": {
          if (a.op === "buy" || a.op === "buyLoan") return out(buyVehicle(p, a.id, a.op === "buyLoan"));
          if (a.op === "sell") return out(sellVehicle(p, a.id));
          if (a.op === "repair") return out(repairVehicle(p, a.id));
          if (a.op === "insure") return out(insureVehicle(p, a.id));
          if (a.op === "service0" || a.op === "service1" || a.op === "service2") return out(setService(p, a.id, Number(a.op.slice(7)) as 0 | 1 | 2));
          return out(setRole(p, a.id, a.op === "taxi" ? "taxi" : a.op === "ridehail" ? "ridehail" : a.op === "rental" ? "rental" : "personal"));
        }
        case "insure": return out(setInsurance(p, a.plan));
        case "checkup": {
          const cost = Math.round(I(p, 35_000));
          if (p.money < cost) return { g: g0, msg: T(`A check-up costs ${naira(cost)}.`, `Check-up go cost ${naira(cost)}.`) };
          transact(p, { amount: -cost, reason: T("Health check-up", "Health check-up"), category: "health" });
          p.flags.checkupAge = p.age;
          bump(p, "health", 2);
          return out(T("A thorough check-up. Your doctor says you are doing well, and advises more exercise.", "Full check-up. Doctor say you dey fine, but e advise make you exercise more."));
        }
        case "treat": {
          const cond = p.conditions.find((c) => c.id === a.cond);
          const fac = FACILITY_BY_ID[a.facility as keyof typeof FACILITY_BY_ID];
          if (!cond || !fac) return { g: g0, msg: "" };
          const { mine } = treatmentCost(p, cond, fac);
          const pay = payForTreatment(p, cond, fac, p.money >= mine ? "cash" : "plan");
          if (!pay.ok) return { g: g0, msg: pay.note };
          return out(`${applyTreatment(p, cond, fac)}${pay.note}`);
        }
        case "dating": {
          const dm = (text: string) => { if (a.npc) logMsg(p, a.npc, "note", text); return out(text); };
          switch (a.op) {
            case "profile": return out(createProfile(p, a.bio ?? "", a.interests ?? [], a.looking ?? (p.gender === "male" ? "women" : "men")));
            case "swipe": if (!a.npc) { refreshDeck(p); return out(""); } return out(swipe(p, a.npc, Boolean(a.like)));
            case "chat": return out(chat(p, a.npc ?? "", a.tone ?? "genuine"));
            case "date": return dm(askOnDate(p, a.npc ?? "", a.plan ?? "cheap"));
            case "spend": return dm(spendTime(p, a.npc ?? ""));
            case "official": return dm(makeOfficial(p, a.npc ?? ""));
            case "meet": return out(meetSomeone(p));
            case "hookup": return out(hookUp(p, a.prot ?? "condom"));
            case "movein": return dm(moveIn(p, a.npc ?? ""));
            case "planb": return out(emergencyPill(p));
            case "divorce": return out(divorce(p));
            case "breakup": return dm(breakUp(p, a.npc ?? ""));
            case "night": return dm(spendTheNight(p, a.npc ?? "", a.prot ?? "condom"));
            case "propose": {
          const r = partnerOf(p, a.npc ?? "");
          const n = p.npcs[a.npc ?? ""];
          if (!r || !n || r.stage !== "exclusive") return { g: g0, msg: T("You need to be exclusive first.", "You must dey exclusive first.") };
          if (r.affection < 70) return { g: g0, msg: T(`${n.name.split(" ")[0]} is not ready yet. Build more affection.`, `${n.name.split(" ")[0]} never ready. Build more love first.`) };
          if (p.age < 20) return { g: g0, msg: T("You need to be at least 20 to marry.", "You must reach at least 20 before you marry.") };
          r.stage = "engaged";
          p.flags.dating = n.name;
          p.flags.datingLook = lookToStr(n.look);
          p.flags.datingNpc = n.id;
          const def = EVENT_DEFS.proposal;
          g.queue.unshift({ kind: "event", id: "proposal", data: { ...(def.init?.(p) ?? {}), month: randInt(1, 12) } });
          if (p.money > 20_000_000 * p.index && !p.flags.prenup && chance(0.6)) g.queue.push({ kind: "event", id: "prenup", data: { month: randInt(1, 12) } });
          return dm(T(`${n.name.split(" ")[0]} says yes. Now the families need to meet.`, `${n.name.split(" ")[0]} say yes. Now the families must meet.`));
        }
        case "marry": { const r = partnerOf(p, a.npc ?? ""); if (!r || r.stage !== "engaged") return { g: g0, msg: T("You need to be engaged first.", "You must engage first.") }; marry(p, a.npc ?? ""); return dm(T("You are married!", "You don marry!")); }
          }
          return { g: g0, msg: "" };
        }
        case "bl": {
          switch (a.op) {
            case "pet": return out(adoptPet(p, a.id ?? ""));
            case "petcare": return out(petCare(p, a.id ?? "", a.care ?? "play"));
            case "rehome": return out(rehomePet(p, a.id ?? ""));
            case "lotto": return out(playTicket(p, (a.id ?? "scratch") as Ticket));
            case "style": return out(doStyle(p, a.id ?? ""));
            case "talent": return out(pickTalent(p, a.id ?? ""));
            case "practice": return out(practice(p));
            case "dna": return out(dnaTest(p));
          }
          return { g: g0, msg: "" };
        }
        case "yahoo": {
          switch (a.op) {
            case "hunt": return out(hunt(p));
            case "work": return out(yahooWork(p, a.id ?? "", a.how ?? "chat"));
            case "cash": return out(cashOut(p, a.id ?? ""));
            case "drop": return out(dropMark(p, a.id ?? ""));
            case "kit": return out(upgradeKit(p));
            case "low": return out(layLow(p));
            case "launder": return out(launder(p));
            case "settle": return out(settleContact(p));
            case "quit": return out(quitYahoo(p));
          }
          return { g: g0, msg: "" };
        }
        case "realtor": return out(a.op === "find" ? findClients(p) : showProperty(p, a.client ?? "", a.listing ?? ""));
        case "biz": {
          switch (a.op) {
            case "start": return out(startBusiness(p, a.id, a.name ?? ""));
            case "upgrade": return out(upgradeBusiness(p, a.id));
            case "hire": return out(hireStaff(p, a.id));
            case "fire": return out(fireStaff(p, a.id));
            case "recruit": return out(recruit(p, a.id, a.role));
            case "lever": return out(setLever(p, a.id, a.key ?? "", a.v ?? 0));
            case "levers": return out(setLevers(p, a.id, a.sets ?? {}));
            case "act": return out(businessAct(p, a.id, a.key ?? ""));
            case "pick": return out(hirePick(p, a.id, a.idx ?? 0));
            case "dismiss": return out(dismiss(p, a.id, a.worker));
            case "raise": return out(raisePay(p, a.id, a.worker ?? ""));
            case "train": return out(trainWorker(p, a.id, a.worker ?? ""));
            case "price": case "ads": case "stock": return out(setPolicy(p, a.id, a.op, a.v ?? 1));
            case "manager": return out(toggleManager(p, a.id));
            case "sell": return out(listForSale(p, a.id));
            case "accept": return out(acceptOffer(p, a.id, a.offer ?? ""));
            case "haggle": return out(haggleOffer(p, a.id, a.offer ?? ""));
            case "decline": return out(declineOffers(p, a.id));
            case "close": return out(closeBusiness(p, a.id));
          }
          return { g: g0, msg: "" };
        }
        case "bet": return out(placeBet(p, a.kind, a.stake));
        case "social": {
          switch (a.op) {
            case "account": return out(createAccount(p, a.platform ?? "gram"));
            case "post": return out(post(p, a.platform ?? "gram", a.content ?? "photo"));
            case "collab": return out(collab(p, a.platform ?? "gram"));
            case "gear": return out(buyGear(p));
          }
          return { g: g0, msg: "" };
        }
        case "crime": {
          const c = CRIME_BY_ID[a.id];
          if (!c) return { g: g0, msg: "" };
          const block = crimeBlock(p, c);
          if (block) return { g: g0, msg: block };
          const res = commitCrime(p, a.id);
          g.queue.unshift(...res.spawn);
          return out(res.text);
        }
        case "will": { setShare(p, a.id, a.pct); const w = willWarning(p); return out(w ?? T("Your will has been updated.", "Dem don update your will.")); }
        case "buy": {
      const price = Math.round(I(p, a.item === "phone" ? 25_000 : a.item === "smartphone" ? 180_000 : 450_000));
      if (p.age < 10) return { g: g0, msg: T("Ask your family.", "Ask your family abeg.") };
      if (p.money < price) return { g: g0, msg: T(`You need ${naira(price)}.`, `You need ${naira(price)}.`) };
      if ((a.item === "phone" && p.possessions.phone) || (a.item === "smartphone" && p.possessions.smartphone) || (a.item === "laptop" && p.possessions.laptop)) return { g: g0, msg: T("You already have one.", "You don get one already.") };
      transact(p, { amount: -price, reason: a.item === "phone" ? T("Basic phone", "Basic phone") : a.item === "smartphone" ? T("Smartphone", "Smartphone") : T("Laptop", "Laptop"), category: "personal" });
      if (a.item === "phone") p.possessions.phone = true;
      if (a.item === "smartphone") { p.possessions.phone = true; p.possessions.smartphone = true; }
      if (a.item === "laptop") p.possessions.laptop = true;
      return out(T(`You bought a ${a.item === "phone" ? "basic phone" : a.item}.`, `You buy ${a.item === "phone" ? "basic phone" : a.item}.`));
    }
    case "learn": return out(learnSkill(p, a.id, a.mode ?? "course"));
        case "growth": return out(doGrowth(p, a.id));
        case "gym": return out(toggleGym(p));
        case "enlist": { const res = enlist(p, a.branch); g.queue.unshift(...res.spawn); return out(res.text); }
    case "gov": {
      const def = GOV_ACTIONS.find((x) => x.id === a.id);
      const office = p.politics?.office ?? -1;
      if (!def || office < def.minOffice || p.actionsLeft <= 0) return { g: g0, msg: "" };
      p.actionsLeft -= 1;
      return out(runGov(p, a.id));
    }
  }
}
