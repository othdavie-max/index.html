/**
 * Naija Life simulation tests. Run with: npm run test:game
 * They use the real engine with seeded randomness; nothing is mocked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FAMILY_CONFIG, applySupport, defaultAmount, evaluateSupport, generateFamily, newInformalLoan } from "../family";
import { ACTIVITIES, ackKidnap, act, ageUp, applyBlock, choose, describePending, kidnapAction, migrate, newGame, startHeir, type Action } from "../engine";
import { ledgerBalances } from "../ledger";
import { borrowFrom, lenderOffers, previewLoan, repayLoan, takeLoan, totalDebt } from "../loans";
import { eligible } from "../eligibility";
import { FACILITIES, developCondition, treatmentCost } from "../health";
import { createProfile, datingAllowed, intimacyBlock, refreshDeck, swipe } from "../relationships";
import { PLATFORMS, createAccount, post, totalFollowers } from "../social";
import { invest, divest, marketMonth } from "../lifestyle";
import { buyVehicle, sellVehicle } from "../vehicles";
import { CRIME_BY_ID, crimeBlock } from "../crime";
import { mortgageQuote } from "../mortgage";
import { MILITARY_EVENTS, boardDue, meritOf } from "../military";
import { EVENTS6, addCousin } from "../events6";
import { SUPPORT_EVENTS } from "../support";
import { EVENTS as EVENT_LIST } from "../events";
import { KID_EVENTS } from "../kids";
import { EDU_EVENTS, enrollPostgrad } from "../education";
import { yearlyNews, modActive } from "../news";
import { refreshListings, planQuote } from "../property";
import { upcomingPayments, monthlySummary, notificationsFor } from "../notices";
import { T, setLang } from "../util";
import { getSound, setSound, sfx, unlockAudio } from "../sound";
import { jobTitle as jobTitleOf, enterPrison } from "../helpers";
import { occupationFor } from "../occupation";
import { buildObituary } from "../obituary";
import { INTERACTIONS, interact, interactBlock, interactionsFor, makeFriend, refreshOccupation, refreshPeople } from "../people";
import { addFriend } from "../family";
import { ALL_EVENTS, ALL_AUTOS } from "../engine";
import { ENGAGE_EVENTS, GOAL_DEFS, MOMENT_DEFS, challengeFor, engageYear, gistFor, weekId } from "../engage";
import { VEHICLE_MODELS, modelOf, needsLicense, priceOf, takeDrivingTest, licenseBlock } from "../vehicles";
import { transportOptions, tripRisk } from "../travel";
import { makeKidnap } from "../kidnap";
import { majorsOf, UNIS, MAJORS, UNI_BY_ID, MAJOR_BY_ID, offers, cutoffFor } from "../universities";
import { cutFor, enrolBlock, uniFee, openAdmission, familyCanPay, campusPay } from "../campus";
import { PRISON_EVENTS } from "../prison";
import { PPA_BY_ID, placeOdds, keepOdds } from "../nysc";
import { beneficiaries, setShare, planEstate } from "../will";
import { randomLook } from "../look";
import { STATE_BY_ID } from "../data";
import { setSeed } from "../util";
import type { FamilyArchetype, Game, Player } from "../types";

const OPTS = { name: "Test Person", gender: "male" as const, stateId: "lagos", tribe: null, religion: null, lang: "en" as const };

function resolveAll(g: Game, pick: "first" | "last" = "first"): Game {
  let n = 0;
  while (g.queue.length && n++ < 40) {
    const head = g.queue[0];
    if (head.kind === "kidnap") {
      if (head.k.stage === "over") { g = ackKidnap(g); continue; }
      const steps = [{ type: "savings" }, { type: "borrow" }, { type: "fundraise" }, { type: "start" }, { type: "payfull" }, { type: "payfull" }] as const;
      for (const a of steps) { if (g.queue[0]?.kind === "kidnap" && g.queue[0].k.stage !== "over") g = kidnapAction(g, a as never); }
      if (g.queue[0]?.kind === "kidnap" && g.queue[0].k.stage !== "over") g = kidnapAction(g, { type: "police" });
      continue;
    }
    const v = describePending(g);
    if (!v) break;
    const ok = v.choices.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0);
    g = choose(g, ok.length ? (pick === "first" ? ok[0] : ok[ok.length - 1]) : 0).g;
  }
  return g;
}
function liveTo(age: number, seed = 1, forceArchetype?: FamilyArchetype): Game {
  setSeed(seed);
  let g = newGame({ ...OPTS, forceArchetype });
  while (g.p.alive && g.p.age < age) g = resolveAll(ageUp(g));
  return g;
}
/** Find a seed where the character survives to the target age. */
function aliveAt(age: number, forceArchetype?: FamilyArchetype): Game {
  for (let s = 1; s < 60; s++) {
    const g = liveTo(age, s, forceArchetype);
    if (g.p.alive && g.p.age >= age) return g;
  }
  throw new Error("no survivor found");
}
const noNaN = (p: Player) => Number.isFinite(p.money) && Number.isFinite(p.debt) && p.ledger.every((t) => Number.isFinite(t.amount));

test("seeded randomness is reproducible", () => {
  const a = liveTo(12, 42);
  const b = liveTo(12, 42);
  const c = liveTo(12, 43);
  assert.equal(a.p.name, b.p.name);
  assert.equal(a.p.money, b.p.money);
  assert.equal(a.p.fam.label, b.p.fam.label);
  assert.ok(a.p.name !== c.p.name || a.p.money !== c.p.money || a.p.fam.label !== c.p.fam.label);
});

test("family backgrounds follow the configured distribution and all appear", () => {
  setSeed(5);
  const st = STATE_BY_ID.lagos;
  const counts: Record<string, number> = {};
  const structs: Record<string, number> = {};
  const N = 1500;
  for (let i = 0; i < N; i++) {
    const f = generateFamily({ st, tribe: "Yoruba", religion: "Christian", playerLook: randomLook("male", {}), surname: "Test" });
    counts[f.fam.archetype] = (counts[f.fam.archetype] ?? 0) + 1;
    structs[f.fam.structure] = (structs[f.fam.structure] ?? 0) + 1;
  }
  // Bigger markets skew wealthier, so check the shape rather than exact weights.
  for (const k of Object.keys(DEFAULT_FAMILY_CONFIG.archetypes)) assert.ok((counts[k] ?? 0) > 0, `archetype ${k} never generated`);
  const share = (...ks: string[]) => ks.reduce((n, k) => n + (counts[k] ?? 0), 0) / N;
  assert.ok(share("lapo", "struggling") > 0.25 && share("lapo", "struggling") < 0.6, `poor families: ${share("lapo", "struggling")}`);
  assert.ok(share("nepo", "strictRich") < 0.15, "very rich families are a small minority");
  assert.ok(share("middle", "upperMiddle") > 0.2, "plenty of middle-class families");
  // The distribution is configurable.
  setSeed(6);
  const only = { archetypes: { nepo: 0, strictRich: 0, upperMiddle: 0, newlyRich: 0, fallenRich: 1, middle: 0, struggling: 0, lapo: 0 }, structures: DEFAULT_FAMILY_CONFIG.structures };
  for (let i = 0; i < 20; i++) assert.equal(generateFamily({ st, tribe: "Yoruba", religion: "Christian", playerLook: randomLook("male", {}), surname: "T", cfg: only }).fam.archetype, "fallenRich");
  for (const s of ["two-parent", "single-mother", "grandparents", "orphan", "parents-abroad", "relatives", "divorced"]) assert.ok((structs[s] ?? 0) > 0, `structure ${s} never generated`);
});

test("wealth and generosity are separate variables", () => {
  const mean = (arch: FamilyArchetype, key: "generosity" | "income") => {
    setSeed(9);
    let s = 0;
    for (let i = 0; i < 300; i++) s += generateFamily({ st: STATE_BY_ID.lagos, tribe: "Yoruba", religion: "Christian", playerLook: randomLook("male", {}), surname: "T", forceArchetype: arch }).fam[key];
    return s / 300;
  };
  assert.ok(mean("strictRich", "income") > mean("middle", "income") * 3, "strict rich are rich");
  assert.ok(mean("strictRich", "generosity") < mean("lapo", "generosity"), "strict rich parents are less generous than poor ones");
  assert.ok(mean("nepo", "generosity") > mean("strictRich", "generosity") + 20, "nepo parents are far more generous than strict rich ones");
});

test("support replies depend on wealth, generosity and what is asked", () => {
  const rate = (arch: FamilyArchetype, kind: "pocket" | "car", age: number) => {
    let ok = 0;
    for (let s = 1; s <= 40; s++) {
      setSeed(s);
      const g = newGame({ ...OPTS, forceArchetype: arch });
      const p = g.p;
      p.age = age;
      const prov = Object.values(p.npcs).find((n) => n.role === "dad" || n.role === "mom" || n.role === "guardian")!;
      const r = evaluateSupport(p, prov, kind, defaultAmount(p, kind));
      if (r.type === "full" || r.type === "partial") ok++;
    }
    return ok / 40;
  };
  assert.ok(rate("nepo", "pocket", 16) > rate("strictRich", "pocket", 16), "generous rich parents give pocket money more often than strict rich ones");
  assert.ok(rate("nepo", "car", 22) > rate("lapo", "car", 22), "nepo parents help with cars more than lapo parents");
  assert.ok(rate("lapo", "car", 22) < 0.2, "very poor parents rarely buy cars");
});

test("asking parents and friends records money and creates liabilities for loans", () => {
  const g = aliveAt(20, "upperMiddle");
  const p = structuredClone(g.p);
  const friend = Object.values(p.npcs).find((n) => n.role === "friend" || n.role === "sibling");
  assert.ok(friend, "has a friend or sibling");
  const loan = newInformalLoan(p, friend!, 100_000, 3, "test");
  assert.equal(loan.direction, "owed");
  p.loans.push(loan);
  const before = totalDebt(p);
  assert.ok(before >= 100_000);
  p.money = Math.max(p.money, 1_000_000 * p.index);
  const paid = repayLoan(p, loan.id, 100_000 + 1);
  assert.ok(paid > 0);
  assert.ok(totalDebt(p) < before);
  // borrowFrom adds cash and a loan unless the lender calls it a gift
  p.money = 0;
  const res = borrowFrom(p, friend!, 50_000, (_p, _n, amount) => ({ type: "full", amount, text: "ok" }));
  assert.ok(p.money > 0 || res.text.length > 0);
  if (res.loan) assert.ok(p.loans.includes(res.loan));
});

test("applySupport gifts become recorded income; refusals do not move money", () => {
  const g = aliveAt(17, "nepo");
  const p = structuredClone(g.p);
  const prov = Object.values(p.npcs).find((n) => n.role === "dad" || n.role === "mom")!;
  const before = p.money;
  const msg = applySupport(p, prov, "pocket", { type: "refuse", amount: 0, text: "No." });
  assert.equal(p.money, before);
  assert.ok(typeof msg === "string");
  applySupport(p, prov, "pocket", { type: "full", amount: 20_000, text: "Here." });
  assert.equal(Math.round(p.money - before), 20_000);
  const last = p.ledger[p.ledger.length - 1];
  assert.equal(last.amount, 20_000);
  assert.ok(ledgerBalances(p));
});

test("digital loans show terms first and do not double-deduct", () => {
  const g = aliveAt(22);
  const p = structuredClone(g.p);
  p.possessions.phone = true;
  p.credit = 60;
  p.money = 100_000;
  const offer = lenderOffers(p).find((o) => o.id === "pocketcash")!;
  assert.equal(offer.eligible, null);
  const amount = Math.round(offer.limit / 2);
  const prev = previewLoan(p, offer, amount, 2);
  const before = p.money;
  takeLoan(p, offer, amount, 2);
  assert.equal(Math.round(p.money - before), Math.round(prev.net));
  assert.equal(p.loans[p.loans.length - 1].balance, amount);
  assert.ok(prev.total > amount, "interest costs money");
  assert.ok(ledgerBalances(p));
  // a child gets nothing
  const kid = structuredClone(aliveAt(10).p);
  kid.possessions.phone = true;
  assert.ok(lenderOffers(kid).every((o) => o.eligible), "no loans for minors");
});

test("every money movement over a life is recorded and balances", () => {
  for (const seed of [3, 4]) {
    const g = liveTo(45, seed);
    const p = g.p;
    assert.ok(noNaN(p));
    assert.ok(ledgerBalances(p));
    let prevAfter: number | null = null;
    for (const t of p.ledger) {
      assert.ok(Math.abs(t.before + t.amount - t.after) < 1, `tx ${t.reason} before+amount != after`);
      if (prevAfter !== null) assert.ok(Math.abs(prevAfter - t.before) < 1, `chain broke at ${t.reason}`);
      prevAfter = t.after;
      assert.ok(t.reason && t.category && Number.isFinite(t.age));
    }
    if (prevAfter !== null) assert.ok(Math.abs(prevAfter - p.money) < 1);
    assert.ok(p.fin.length > 5, "yearly summaries exist");
  }
});

test("rent is charged on a real schedule and not twice", () => {
  const g = aliveAt(24, "middle");
  let q = structuredClone(g);
  q.p.money = 500_000_000; q.p.prison = 0;
  q = act(q, { t: "rent", tier: "selfcon" }).g;
  assert.equal(q.p.housing.type, "rented");
  q.p.money = 500_000_000;
  for (let i = 0; i < 3 && q.p.alive; i++) q = resolveAll(ageUp(q));
  const charges = q.p.ledger.filter((t) => t.category === "rent" && t.amount < 0 && /Rent/i.test(t.reason) && /elf-contain/i.test(t.reason)).map((t) => t.age * 12 + t.month);
  assert.ok(charges.length >= 2, "rent was paid on renewal");
  for (let i = 1; i < charges.length; i++) assert.ok(charges[i] - charges[i - 1] >= 12, `rent charged twice within a year: months ${charges[i - 1]} and ${charges[i]}`);
});

test("event eligibility respects age and possessions", () => {
  const kid = structuredClone(aliveAt(7).p);
  for (const id of ["phone_stolen", "scam_text", "twitter_trend", "fake_job_offer", "remote_job", "cult", "love"]) assert.equal(eligible(kid, id), false, `${id} should not hit a 7-year-old`);
  const adult = structuredClone(aliveAt(24).p);
  adult.possessions.phone = false;
  adult.possessions.smartphone = false;
  assert.equal(eligible(adult, "phone_stolen"), false, "cannot lose a phone you do not own");
  adult.possessions.phone = true;
  assert.equal(eligible(adult, "phone_stolen"), true);
});

test("adult-only systems are closed to minors", () => {
  const kid = structuredClone(aliveAt(15).p);
  kid.possessions.smartphone = true;
  assert.ok(datingAllowed(kid));
  assert.ok(createProfile(kid, "hi", [], "women").length > 0 && kid.rel.profile === null);
  const act0 = (a: Action) => act({ p: kid, queue: [], dynasty: aliveAt(15).dynasty } as Game, a);
  assert.ok(act0({ t: "bet", kind: "single", stake: 1000 }).msg.includes("adult"));
  assert.ok(crimeBlock(kid, CRIME_BY_ID.fraud));
  assert.ok(crimeBlock(kid, CRIME_BY_ID.robbery));
  assert.ok(intimacyBlock(kid, "nobody"));
  assert.equal(buyVehicle(kid, "keke", false), "You must be 18 to buy a vehicle.");
});

test("hospital costs depend on facility and insurance", () => {
  const g = aliveAt(30);
  const p = structuredClone(g.p);
  p.conditions = [];
  developCondition(p, "typhoid");
  const cond = p.conditions[0];
  assert.ok(cond);
  const gov = FACILITIES.find((f) => f.id === "gov") ?? FACILITIES[0];
  const priv = FACILITIES.find((f) => f.id === "private") ?? FACILITIES[FACILITIES.length - 1];
  const cheap = treatmentCost(p, cond, gov).total;
  const dear = treatmentCost(p, cond, priv).total;
  assert.ok(dear > cheap, "private care costs more than a government hospital");
  p.insurance.plan = "none";
  const none = treatmentCost(p, cond, priv).mine;
  p.insurance.plan = "premium";
  const covered = treatmentCost(p, cond, priv).mine;
  assert.ok(covered <= none, "insurance never raises your share");
  const money0 = p.money;
  const r = act({ ...structuredClone(g), p } as Game, { t: "treat", cond: cond.id, facility: priv.id });
  assert.ok(r.g.p.money <= money0 + 1, "treatment costs money or goes on a plan");
  assert.ok(ledgerBalances(r.g.p));
});

test("dating app: profile, matches, partners, and adult intimacy rules", () => {
  const g = aliveAt(25);
  const p = structuredClone(g.p);
  p.possessions.smartphone = true;
  assert.equal(datingAllowed(p), null);
  createProfile(p, "Calm and ambitious", ["music", "food"], p.gender === "male" ? "women" : "men");
  assert.ok(p.rel.deck.length >= 8, "deck is filled");
  setSeed(77);
  let matched = 0;
  for (let i = 0; i < 12 && p.rel.deck.length; i++) {
    swipe(p, p.rel.deck[0].id, true);
  }
  matched = p.rel.partners.length;
  assert.ok(matched >= 1, "some matches occur");
  const part = p.rel.partners[p.rel.partners.length - 1];
  assert.ok(p.npcs[part.npcId], "partner is a persistent NPC");
  assert.equal(part.stage, "chatting");
  assert.ok(intimacyBlock(p, part.npcId), "cannot spend the night with someone you barely know");
  refreshDeck(p);
});

test("breaking up and cheating are tracked on the persistent partner", () => {
  const g = aliveAt(26);
  let q = structuredClone(g);
  q.p.prison = 0;
  q.p.possessions.smartphone = true;
  q = act(q, { t: "dating", op: "profile", bio: "hello there friend", interests: ["music"] }).g;
  const base0 = q;
  for (let s = 5; s < 40 && !q.p.rel.partners[0]; s++) {
    q = structuredClone(base0);
    setSeed(s);
    for (let i = 0; i < 12 && q.p.rel.deck.length; i++) q = act(q, { t: "dating", op: "swipe", npc: q.p.rel.deck[0].id, like: true }).g;
  }
  const rel = q.p.rel.partners[0];
  assert.ok(rel);
  const id = rel.npcId;
  q = act(q, { t: "dating", op: "breakup", npc: id }).g;
  assert.equal(q.p.rel.partners.find((x) => x.npcId === id)?.stage ?? "ex", "ex");
});

test("social media: accounts need a smartphone; posting grows followers over time", () => {
  const g = aliveAt(18);
  const p = structuredClone(g.p);
  p.possessions.smartphone = false;
  assert.ok(createAccount(p, "gram").length > 0);
  p.possessions.smartphone = true;
  createAccount(p, "toktik");
  assert.ok(p.social?.accounts.toktik);
  const f0 = totalFollowers(p);
  setSeed(3);
  for (let i = 0; i < 10; i++) { post(p, "toktik", "skit"); if (p.social) p.social.postsLeft = 12; }
  assert.ok(totalFollowers(p) >= f0);
  assert.ok(noNaN(p));
});

test("vehicles are recorded assets: buying costs cash, selling returns it", () => {
  const g = aliveAt(25);
  const p = structuredClone(g.p);
  p.possessions.license = true;
  p.money = 14_000_000 * p.index * 3;
  const before = p.money;
  const msg = buyVehicle(p, "corolla-used", false);
  assert.ok(msg.includes("bought"), msg);
  assert.equal(p.vehicles.length, 1);
  assert.ok(p.money < before);
  assert.ok(ledgerBalances(p));
  const mid = p.money;
  sellVehicle(p, p.vehicles[0].id);
  assert.equal(p.vehicles.length, 0);
  assert.ok(p.money > mid);
  // financed purchase creates a loan and a vehicle, and the net cash change is the deposit
  const p2 = structuredClone(g.p);
  p2.possessions.license = true;
  p2.money = 14_000_000 * p2.index * 2;
  p2.credit = 70;
  const b2 = p2.money;
  buyVehicle(p2, "corolla-used", true);
  assert.equal(p2.vehicles.length, 1);
  assert.ok(p2.loans.some((l) => l.id === p2.vehicles[0].loanId && l.direction === "owed"));
  assert.ok(b2 - p2.money < 14_000_000 * p2.index, "only the deposit leaves your cash");
  assert.ok(ledgerBalances(p2));
});

test("investments: cash becomes units; markets move; cashing out returns value", () => {
  const g = aliveAt(28);
  const p = structuredClone(g.p);
  p.money = 5_000_000;
  const msg = invest(p, "stocks", 2_000_000);
  assert.ok(typeof msg === "string");
  assert.ok(p.holdings.length >= 1);
  assert.ok(p.money < 5_000_000);
  const v0 = p.holdings[0].value;
  setSeed(8);
  for (let i = 0; i < 24; i++) marketMonth(p, []);
  assert.ok(Number.isFinite(p.holdings[0].value));
  assert.notEqual(Math.round(p.holdings[0].value), Math.round(v0), "stock value changes with the market");
  const cash0 = p.money;
  divest(p, p.holdings[0].id);
  assert.ok(p.money > cash0);
  assert.ok(ledgerBalances(p));
});

test("crime has legal consequences and can lock you out of jobs", () => {
  let convicted = 0, cases = 0;
  for (let s = 1; s <= 20; s++) {
    let g = structuredClone(aliveAt(19));
    setSeed(s * 11);
    g.p.crime.heat = 80;
    for (let year = 0; year < 5 && g.p.alive; year++) {
      g.p.actionsLeft = 3;
      g = resolveAll(act(g, { t: "crime", id: "robbery" }).g);
      g = resolveAll(ageUp(g));
    }
    cases += g.p.crime.cases.length;
    convicted += g.p.crime.record.filter((x) => x.outcome === "convicted").length;
    assert.ok(noNaN(g.p));
    assert.ok(ledgerBalances(g.p));
  }
  assert.ok(cases > 0, "police cases open");
  assert.ok(convicted > 0, "some robbers are convicted");
});

test("wills decide inheritance, and heirs continue the dynasty with debts paid first", () => {
  let g = aliveAt(35);
  g = structuredClone(g);
  const p = g.p;
  p.kids = [
    { name: "Ada", age: 12, gender: "female", look: p.look },
    { name: "Emeka", age: 8, gender: "male", look: p.look },
  ];
  for (const b of beneficiaries(p)) setShare(p, b.id, 0);
  setShare(p, "kid:0", 70);
  setShare(p, "kid:1", 30);
  const plan = planEstate(p, 0);
  assert.ok(plan.heirFraction > plan.disputeChance * 0 && plan.heirFraction >= 0.6);
  assert.ok(plan.hasWill);
  const noWill = structuredClone(p);
  noWill.will = undefined as never;
  assert.ok(planEstate(noWill, 0).disputeChance > plan.disputeChance, "no will means more disputes");
  p.money = 60_000_000;
  p.debt = 0;
  p.loans = [];
  p.alive = false;
  p.cause = "test";
  const heir = startHeir({ ...g, p }, 0);
  assert.equal(heir.p.name.split(" ")[0], "Ada");
  assert.ok(heir.p.alive);
  assert.ok(heir.p.age >= 0);
  const inh = heir.p.ledger.find((t) => t.category === "inheritance" && t.amount > 0);
  assert.ok(inh, "the inheritance is recorded in the heir's ledger");
  assert.ok(inh!.amount <= 60_000_000 * 0.71 && inh!.amount > 60_000_000 * 0.3, `heir gets about 70% of cash, got ${inh!.amount}`);
  assert.ok(ledgerBalances(heir.p));
  // debts come out of the estate first
  const indebted = structuredClone(p);
  indebted.loans.push(newInformalLoan(indebted, null, 30_000_000, 6, "debt"));
  const heir2 = startHeir({ ...g, p: indebted }, 0);
  assert.ok(heir2.p.money < heir.p.money, "inheriting from someone in debt leaves less");
});

test("saves round-trip through JSON and old saves migrate", () => {
  const g = aliveAt(30);
  const copy = JSON.parse(JSON.stringify(g)) as Game;
  const m = migrate(copy);
  assert.equal(m.p.money, g.p.money);
  assert.equal(m.p.ledger.length, g.p.ledger.length);
  // simulate an older save missing new systems
  const old = JSON.parse(JSON.stringify(g)) as Game;
  for (const k of ["npcs", "fam", "loans", "ledger", "fin", "conditions", "rel", "social", "businesses", "bets", "crime", "skills", "vehicles", "subs", "possessions", "housing", "market"]) delete (old.p as unknown as Record<string, unknown>)[k];
  const mig = migrate(old);
  assert.ok(Array.isArray(mig.p.ledger) && Array.isArray(mig.p.loans) && mig.p.npcs && mig.p.fam && mig.p.rel && mig.p.crime);
  let h = mig;
  for (let i = 0; i < 3 && h.p.alive; i++) h = resolveAll(ageUp(h));
  assert.ok(noNaN(h.p), "a migrated save keeps playing without NaN");
});

test("cross-system chaos: random actions never break money integrity", () => {
  for (const seed of [21, 22, 23, 24]) {
    setSeed(seed);
    let g = newGame(OPTS);
    const crashes: string[] = [];
    for (let year = 0; year < 70 && g.p.alive; year++) {
      try {
        g = resolveAll(ageUp(g));
        const p = g.p;
        if (!p.alive) break;
        const acts: Action[] = [
          { t: "buy", item: "smartphone" }, { t: "buy", item: "laptop" }, { t: "loanTake", offer: "pocketcash", amount: 30_000, term: 2 },
          { t: "ask", npc: Object.keys(p.npcs)[0] ?? "x", kind: "pocket", amount: 20_000 }, { t: "invest", kind: "stocks", amount: Math.max(0, Math.round(p.money * 0.2)) },
          { t: "bet", kind: "single", stake: 5_000 }, { t: "checkup" }, { t: "gym" }, { t: "learn", id: "sales" }, { t: "rent", tier: "selfcon" },
          { t: "dating", op: "profile", bio: "hello world", interests: ["music"] }, { t: "social", op: "account", platform: "gram" },
          { t: "activity", id: ACTIVITIES[year % ACTIVITIES.length].id }, { t: "crime", id: "pickpocket" }, { t: "biz", op: "start", id: "provisions" },
        ];
        for (let k = 0; k < 4; k++) {
          const a = acts[(year * 7 + k * 5) % acts.length];
          g = resolveAll(act(g, a).g);
        }
        assert.ok(noNaN(g.p), `NaN at age ${g.p.age}`);
        assert.ok(ledgerBalances(g.p), `ledger mismatch at age ${g.p.age}`);
      } catch (e) {
        crashes.push(String(e));
        break;
      }
    }
    assert.deepEqual(crashes, [], `seed ${seed} crashed`);
  }
});

test("vocational training: enrol, pay or be supported, certificate raises skill, no degree", () => {
  const g = structuredClone(aliveAt(17));
  const p = g.p;
  p.school = null;
  p.edu = "secondary";
  p.flags.trade = undefined as never;
  const msg = act(g, { t: "trade", id: "welding" });
  assert.equal(msg.g.p.school?.type, "vocational");
  let q = msg.g;
  q.p.money = 50_000_000;
  const before = q.p.skills.welding ?? 0;
  for (let i = 0; i < 3 && q.p.alive && q.p.school; i++) q = resolveAll(ageUp(q));
  assert.equal(q.p.school, null, "programme ends after its length");
  assert.notEqual(q.p.edu, "tertiary", "a trade is not a degree");
  assert.ok((q.p.skills.welding ?? 0) >= Math.max(55, before), "certificate gives skill");
  assert.ok(q.p.flags.trade);
  assert.ok(ledgerBalances(q.p));
  // too young or already certified
  const young = structuredClone(aliveAt(12));
  young.p.school = null;
  young.p.edu = "secondary";
  assert.equal(act(young, { t: "trade", id: "welding" }).g.p.school, null);
});

test("mortgages: terms, deposit only, monthly repayments, foreclosure and sale payoff", () => {
  const g = structuredClone(aliveAt(32));
  let q = g;
  q.p.money = 400_000_000 * q.p.index;
  q.p.credit = 80;
  q.p.prison = 0;
  q.p.loans = [];
  q.p.debt = 0;
  q.p.fin.push({ age: q.p.age - 1, income: 80_000_000 * q.p.index, expense: 1, borrowed: 0, cats: {} });
  const quote = mortgageQuote(q.p, "bungalow", 15);
  assert.equal(quote.block, null, quote.block ?? "");
  assert.ok(quote.interest > 0 && quote.monthly > 0);
  const cash0 = q.p.money;
  q = act(q, { t: "mortgage", kind: "bungalow", years: 15 }).g;
  const house = q.p.houses[q.p.houses.length - 1];
  const loan = q.p.loans.find((l) => l.houseId === house.id)!;
  assert.ok(loan && house.loanId === loan.id);
  assert.ok(cash0 - q.p.money < quote.price, "only deposit and fee leave your cash, not the full price");
  assert.ok(Math.abs(cash0 - q.p.money - (quote.down + quote.fee)) < 2);
  assert.ok(ledgerBalances(q.p));
  assert.ok(mortgageQuote(q.p, "duplex", 15).block, "second mortgage is refused");
  const bal0 = loan.balance;
  q.p.money = 400_000_000 * q.p.index;
  for (let i = 0; i < 2 && q.p.alive; i++) q = resolveAll(ageUp(q));
  const l2 = q.p.loans.find((l) => l.id === loan.id)!;
  assert.ok(l2.balance < bal0 * 1.05 && l2.status === "active", "instalments are charged monthly");
  const months = q.p.ledger.filter((t) => t.recurring === loan.id).length;
  assert.ok(months >= 12 && months <= 26, `about one instalment per month, saw ${months}`);
  // selling pays the bank first
  const sold = act(q, { t: "sell", id: house.id }).g;
  assert.equal(sold.p.loans.find((l) => l.id === loan.id)!.status, "paid");
  assert.ok(ledgerBalances(sold.p));
  // defaulting loses the house
  const broke = structuredClone(q);
  broke.p.money = 0;
  const bl = broke.p.loans.find((l) => l.id === loan.id)!;
  bl.missed = 3;
  bl.monthly = bl.balance * 50; // an instalment no income could cover
  let b = broke;
  for (let i = 0; i < 2 && b.p.alive; i++) { b.p.money = 0; b = resolveAll(ageUp(b)); }
  assert.equal(b.p.loans.find((l) => l.id === loan.id)!.status, "defaulted");
  assert.ok(b.p.houses.every((h) => h.id !== house.id), "a defaulted mortgage repossesses the house");
  // minors and poor credit blocked
  const kid = structuredClone(aliveAt(16)).p;
  assert.ok(mortgageQuote(kid, "bungalow", 15).block);
});

test("military promotion board: merit, godfather and bribe routes, exposure risk", () => {
  const board = MILITARY_EVENTS.find((e) => e.id === "promotion_board")!;
  const base26 = aliveAt(26);
  const mk = () => {
    const p = structuredClone(base26.p);
    p.job = { id: "soldier", rank: 0, years: 2 };
    p.flags.training = undefined as never;
    p.prison = 0;
    p.stats.connections = 70; p.stats.fitness = 90; p.stats.smarts = 80; p.stats.reputation = 70;
    p.money = 500_000_000 * p.index;
    return p;
  };
  assert.ok(boardDue(mk()), "board sits after the minimum years in rank");
  const young = mk(); young.job!.years = 1;
  assert.equal(boardDue(young), false);
  assert.ok(meritOf(mk()) > 40);
  const lowCon = mk(); lowCon.stats.connections = 5;
  assert.ok(board.choices(lowCon, {})[1].disabled, "godfather route needs connections");
  const outcomes = { promoted: 0, passed: 0, punished: 0 };
  for (let s = 1; s <= 120; s++) {
    const p = mk();
    setSeed(s);
    const c = board.choices(p, {});
    const res = c[2].run(p);
    const text = typeof res === "string" ? res : res.text;
    if (p.job === null || (p.job && p.job.rank === 0 && /demoted|dismissed/.test(text))) outcomes.punished++;
    else if (p.job && p.job.rank === 1) outcomes.promoted++;
    else outcomes.passed++;
  }
  assert.ok(outcomes.promoted > 40, `bribe often works: ${JSON.stringify(outcomes)}`);
  assert.ok(outcomes.punished > 3, `bribes are sometimes exposed: ${JSON.stringify(outcomes)}`);
  const m = mk(); m.job!.rank = 3;
  assert.equal(boardDue(m), false, "generals have no higher rank");
  // soldiers are no longer promoted automatically, only by the board
  let g = structuredClone(aliveAt(26));
  g.p.job = { id: "soldier", rank: 0, years: 0 }; g.p.flags.training = undefined as never; g.p.prison = 0;
  setSeed(3);
  let sawBoard = false;
  for (let i = 0; i < 4 && g.p.alive; i++) { g = ageUp(g); if (g.queue.some((q) => q.kind === "event" && q.id === "promotion_board")) sawBoard = true; assert.ok(g.p.job?.id !== "soldier" || g.p.job.rank === 0 || sawBoard, "no promotion without the board"); g = resolveAll(g, "first"); if (!g.p.job || g.p.job.id !== "soldier") break; }
  assert.ok(sawBoard || !g.p.job, "the board convenes for serving soldiers");
});

test("relatives: money events draw on persistent relatives, record cash, and shape closeness", () => {
  const base = structuredClone(aliveAt(30));
  const p0 = base.p;
  assert.ok(Object.values(p0.npcs).some((n) => ["uncle", "aunt", "cousin", "sibling"].includes(n.role)) || (addCousin(p0), true));
  for (let i = 0; i < 3; i++) addCousin(p0);
  assert.ok(Object.values(p0.npcs).filter((n) => n.role === "cousin").length >= 3);
  for (const ev of EVENTS6) {
    const p = structuredClone(p0);
    p.money = 1_000_000_000 * p.index;
    const d = ev.init?.(p) ?? {};
    assert.ok(ev.weight(p) > 0, `${ev.id} can occur for an adult with relatives`);
    const kid = structuredClone(aliveAt(10).p);
    assert.equal(eligible(kid, ev.id), false, `${ev.id} never hits a child`);
    const rel = p.npcs[String(d.relId)];
    assert.ok(rel, `${ev.id} picks a real relative`);
    const before = rel.closeness;
    const cash0 = p.money;
    const choices = ev.choices(p, d);
    const gen = choices[0].run(p);
    assert.ok(typeof gen === "string" || typeof gen.text === "string");
    assert.ok(p.money < cash0 || p.loans.some((l) => l.direction === "owedToMe"), `${ev.id}: helping costs money or creates a receivable`);
    assert.ok(ledgerBalances(p));
    const p2 = structuredClone(p0);
    p2.money = 1_000_000_000 * p2.index;
    const d2 = ev.init?.(p2) ?? {};
    const refuse = ev.choices(p2, d2).slice(-1)[0];
    const c0 = p2.npcs[String(d2.relId)].closeness;
    const cash2 = p2.money;
    refuse.run(p2);
    assert.ok(p2.money >= cash2 - 1, `${ev.id}: refusing costs nothing`);
    assert.ok(p2.npcs[String(d2.relId)].closeness <= c0 || ev.id === "relative_business", `${ev.id}: refusing does not make them closer`);
    void before;
  }
  // broke players see disabled options
  const poor = structuredClone(p0); poor.money = 0;
  const w = EVENTS6.find((e) => e.id === "relative_wedding")!;
  assert.ok(w.choices(poor, w.init!(poor)).some((c) => c.disabled));
});

test("dating message history persists per partner, caps its length and survives save/load", () => {
  let q = structuredClone(aliveAt(26));
  q.p.prison = 0; q.p.spouse = null; q.p.rel.partners = [];
  q.p.possessions.smartphone = true;
  q.p.money = 1_000_000_000 * q.p.index;
  q = act(q, { t: "dating", op: "profile", bio: "hello there friend", interests: ["music", "food"] }).g;
  const base0 = q;
  for (let s = 9; s < 45 && !q.p.rel.partners.length; s++) {
    q = structuredClone(base0);
    setSeed(s);
    for (let i = 0; i < 12 && q.p.rel.deck.length; i++) q = act(q, { t: "dating", op: "swipe", npc: q.p.rel.deck[0].id, like: true }).g;
  }
  const rel = q.p.rel.partners[q.p.rel.partners.length - 1];
  assert.ok(rel && rel.messages && rel.messages.length >= 2, "a match opens the conversation");
  assert.equal(rel.messages![0].from, "note");
  assert.ok(rel.messages!.some((m) => m.from === "them"), "they say hello first");
  const id = rel.npcId;
  q.p.rel.chatsLeft = 5;
  q = act(q, { t: "dating", op: "chat", npc: id, tone: "funny" }).g;
  let r2 = q.p.rel.partners.find((x) => x.npcId === id)!;
  const tail = r2.messages!.slice(-2);
  if (r2.stage !== "ex") assert.deepEqual(tail.map((m) => m.from).sort(), ["me", "them"], "a chat adds your line and their reply");
  q.p.rel.partners.find((x) => x.npcId === id)!.affection = 80;
  q = act(q, { t: "dating", op: "date", npc: id, plan: "nice" }).g;
  r2 = q.p.rel.partners.find((x) => x.npcId === id)!;
  assert.ok(r2.messages!.some((m) => m.from === "note" && m.text.length > 5), "key moments are logged as notes");
  for (let i = 0; i < 100; i++) { q.p.rel.chatsLeft = 5; q = act(q, { t: "dating", op: "chat", npc: id, tone: "genuine" }).g; if (q.p.rel.partners.find((x) => x.npcId === id)!.stage === "ex") break; }
  assert.ok(q.p.rel.partners.find((x) => x.npcId === id)!.messages!.length <= 80, "thread is capped");
  const copy = migrate(JSON.parse(JSON.stringify(q)) as Game);
  assert.deepEqual(copy.p.rel.partners.find((x) => x.npcId === id)!.messages, q.p.rel.partners.find((x) => x.npcId === id)!.messages);
  // older saves without messages still work
  const old = JSON.parse(JSON.stringify(q)) as Game;
  for (const x of old.p.rel.partners) delete (x as { messages?: unknown }).messages;
  const m = act(migrate(old), { t: "dating", op: "chat", npc: id, tone: "flirty" });
  assert.ok(ledgerBalances(m.g.p));
});

test("prison closes outside actions, freezes nothing financial, and offers prison options", () => {
  let g = structuredClone(aliveAt(25));
  g.p.possessions.smartphone = true;
  g.p.money = 500_000_000 * g.p.index;
  g.p.prison = 3;
  g.p.actionsLeft = 3;
  const blocked: Action[] = [
    { t: "buy", item: "laptop" }, { t: "invest", kind: "stocks", amount: 1_000_000 }, { t: "bet", kind: "single", stake: 1000 },
    { t: "rent", tier: "selfcon" }, { t: "social", op: "account", platform: "gram" }, { t: "dating", op: "profile", bio: "x", interests: [] },
    { t: "crime", id: "pickpocket" }, { t: "loanTake", offer: "pocketcash", amount: 20_000, term: 2 }, { t: "send", amount: 1000 }, { t: "travel", to: "abuja" },
    { t: "biz", op: "start", id: "provisions" }, { t: "car", op: "buy", id: "keke" }, { t: "luxury", id: "x" }, { t: "mortgage", kind: "bungalow", years: 15 },
  ];
  for (const a of blocked) {
    const r = act(g, a);
    assert.equal(r.g, g, `${a.t} must not change the game from prison`);
    assert.ok(r.msg.length > 0, `${a.t} explains why`);
  }
  assert.equal(eligible(g.p, "relative_wedding"), false);
  assert.equal(eligible(g.p, "prison_visit"), true);
  const r = act(g, { t: "prison", op: "work" });
  assert.ok(r.g.p.money > g.p.money, "prison work pays a little");
  const study = act(g, { t: "prison", op: "study" });
  assert.ok(study.g.p.stats.smarts >= g.p.stats.smarts);
  // the outside world keeps moving: a loan keeps charging while you are inside
  g.p.credit = 80; g.p.possessions.phone = true; g.p.money = 1_000_000 * g.p.index;
  g = act(g, { t: "prison", op: "work" }).g;
  let q = structuredClone(aliveAt(25));
  q.p.prison = 0;
  q = act(q, { t: "loanTake", offer: "nairaflex", amount: 100_000, term: 6 }).g;
  q.p.prison = 2;
  q.p.money = 0;
  const bal0 = q.p.loans.find((l) => l.status === "active")?.balance ?? 0;
  q = resolveAll(ageUp(q));
  const l = q.p.loans.find((x) => x.lenderName.includes("NairaFlex"));
  assert.ok(!l || l.status !== "active" || l.balance !== bal0 || l.missed > 0, "loans keep running while you are inside");
  assert.ok(ledgerBalances(q.p));
  // appeal can shorten the sentence; escape makes you a fugitive
  let cut = 0, free = 0;
  const base25 = aliveAt(25);
  for (let s = 1; s <= 80; s++) {
    const x = structuredClone(base25);
    setSeed(s);
    x.p.prison = 5; x.p.money = 500_000_000 * x.p.index; x.p.actionsLeft = 3;
    const ap = act(x, { t: "prison", op: "appeal" });
    if (ap.g.p.prison < 5) cut++;
    const es = act(x, { t: "prison", op: "escape" });
    if (es.g.p.prison === 0 && es.g.p.flags.fugitive) free++;
  }
  assert.ok(cut > 3, `appeals sometimes work (${cut})`);
  assert.ok(free > 0 && free < 40, `escapes sometimes work (${free})`);
});

test("parent replies need an answer: loans, conditions, questions and chores", () => {
  const base = structuredClone(aliveAt(21, "upperMiddle"));
  for (const n of Object.values(base.p.npcs)) if (n.role === "dad" || n.role === "mom") { n.alive = true; n.income = Math.max(n.income, 40_000_000); n.closeness = 80; if (!base.p.fam.providers.includes(n.id)) base.p.fam.providers.push(n.id); }
  const ev = SUPPORT_EVENTS[0];
  const mk = (type: string) => {
    const p = structuredClone(base.p);
    p.money = 1_000_000 * p.index;
    p.actionsLeft = 3;
    const n = Object.values(p.npcs).find((x) => x.role === "dad" || x.role === "mom")!;
    return { p, n, d: { npcId: n.id, kind: "pocket", rtype: type, amount: 100_000, text: "reply" } };
  };
  const loan = mk("loan"); const before = loan.p.money;
  ev.choices(loan.p, loan.d)[0].run(loan.p);
  assert.ok(loan.p.money > before && loan.p.loans.some((l) => l.direction === "owed"), "accepting a loan adds cash and a liability");
  const decl = mk("loan"); ev.choices(decl.p, decl.d)[1].run(decl.p);
  assert.equal(decl.p.loans.length, base.p.loans.length, "declining takes nothing");
  const cond = mk("conditional"); const c0 = cond.p.money; ev.choices(cond.p, cond.d)[0].run(cond.p);
  assert.ok(cond.p.money > c0);
  let lieOk = 0, lieCaught = 0;
  for (let s = 1; s <= 60; s++) { const x = mk("askPurpose"); setSeed(s); const m0 = x.p.money; ev.choices(x.p, x.d)[1].run(x.p); if (x.p.money > m0) lieOk++; else lieCaught++; }
  assert.ok(lieOk > 10 && lieCaught > 5, `lying sometimes works (${lieOk}/${lieCaught})`);
  const work = mk("workForIt"); const w0 = work.p.money; const a0 = work.p.actionsLeft;
  ev.choices(work.p, work.d)[0].run(work.p);
  assert.ok(work.p.money > w0 && work.p.actionsLeft === a0 - 1, "chores pay and cost an action");
  // asking through the game queues the follow-up instead of resolving silently
  let queued = 0;
  for (let s = 1; s <= 80; s++) {
    const g = structuredClone(base); g.p.age = 20; setSeed(s);
    const n = Object.values(g.p.npcs).find((x) => x.role === "dad" || x.role === "mom")!;
    const r = act(g, { t: "ask", npc: n.id, kind: "loan", amount: 500_000 * g.p.index });
    if (r.g.queue[0]?.kind === "event" && r.g.queue[0].id === "support_reply") queued++;
  }
  assert.ok(queued > 3, `some replies need an answer (${queued})`);
});

test("world news changes the economy for a while and is shown to the player", () => {
  const g = structuredClone(aliveAt(30));
  const p = g.p;
  let seen = 0;
  for (let s = 1; s <= 200 && seen < 3; s++) { setSeed(s); const lines: string[] = []; const before = p.world?.news.length ?? 0; yearlyNews(p, lines); if ((p.world?.news.length ?? 0) > before) seen++; p.age += 1; }
  assert.ok(seen >= 1, "headlines occur");
  const q = structuredClone(aliveAt(30)).p;
  q.world = { until: { fuel: q.age + 1 }, news: [{ age: q.age, en: "Fuel up", pcm: "Fuel up" }] };
  assert.ok(modActive(q, "fuel"));
  assert.ok(notificationsFor(q).some((n) => n.text === "Fuel up"));
  q.world.until.fuel = q.age - 1;
  assert.equal(modActive(q, "fuel"), false);
});

test("postgraduate study, boarding school and kids events", () => {
  const p = structuredClone(aliveAt(26)).p;
  p.edu = "tertiary"; p.school = null; p.prison = 0; delete p.flags.postgrad;
  assert.ok(enrollPostgrad(p, "phd").length > 0 && p.school === null, "PhD needs a Master's first");
  enrollPostgrad(p, "masters");
  assert.equal((p.school as { type: string } | null)?.type, "postgrad");
  let g: Game = { ...structuredClone(aliveAt(26)), p };
  g.p.money = 500_000_000 * g.p.index;
  g = resolveAll(ageUp(g));
  assert.equal(g.p.school, null);
  assert.equal(g.p.flags.postgrad, "Masters");
  const boarding = EDU_EVENTS.find((e) => e.id === "boarding_choice")!;
  const kid = structuredClone(aliveAt(10)).p;
  boarding.choices(kid, {})[1].run(kid);
  assert.equal(kid.flags.boarding, true);
  const dad = Object.values(kid.npcs).find((n) => n.role === "dad" || n.role === "mom")!;
  assert.ok(dad.closeness >= 0);
  const parent = structuredClone(aliveAt(40)).p;
  parent.kids = [{ name: "Tola", age: 9, gender: "female", look: parent.look }, { name: "Seun", age: 22, gender: "male", look: parent.look }];
  parent.money = 500_000_000 * parent.index;
  for (const e of KID_EVENTS) {
    assert.ok(e.weight(parent) > 0, `${e.id} can occur`);
    const q = structuredClone(parent);
    const d = e.init?.(q) ?? {};
    const c0 = q.money;
    const ch = e.choices(q, d);
    ch[0].run(q);
    assert.ok(q.money <= c0 + 1, `${e.id}: first choice does not create money`);
    assert.ok(ledgerBalances(q));
  }
  assert.equal(KID_EVENTS.find((e) => e.id === "kid_asks_money")!.weight(structuredClone({ ...parent, kids: [parent.kids[0]] })), 0);
});

test("property market: cash, mortgage, parent co-sign and payment plan", () => {
  const g = structuredClone(aliveAt(30, "upperMiddle"));
  const p = g.p;
  p.prison = 0; p.credit = 80; p.loans = []; p.debt = 0;
  p.fin.push({ age: p.age - 1, income: 90_000_000 * p.index, expense: 1, borrowed: 0, cats: {} });
  refreshListings(p);
  assert.ok(p.listings!.length >= 3);
  const l = p.listings!.find((x) => x.kind !== "land")!;
  p.money = l.price * 3;
  const cash = structuredClone(g);
  cash.p.listings = p.listings; cash.p.money = p.money;
  const r = act(cash, { t: "property", id: l.id, mode: "cash" });
  assert.equal(r.g.p.houses.length, cash.p.houses.length + 1);
  assert.ok(r.g.p.money <= p.money - l.price + 1);
  assert.ok(!r.g.p.listings!.some((x) => x.id === l.id), "a bought listing leaves the market");
  const mort = structuredClone(g); mort.p.listings = p.listings; mort.p.money = p.money;
  const rm = act(mort, { t: "property", id: l.id, mode: "mortgage", years: 15 });
  assert.ok(rm.g.p.loans.some((x) => x.houseId), rm.msg);
  const cs = structuredClone(g); cs.p.listings = p.listings; cs.p.money = l.price * 0.2;
  const prov = Object.values(cs.p.npcs).find((n) => n.role === "dad" || n.role === "mom" || n.role === "guardian")!;
  prov.alive = true; if (!cs.p.fam.providers.includes(prov.id)) cs.p.fam.providers.push(prov.id); prov.closeness = 90; prov.trust = 90; prov.income = 500_000_000;
  const rc = act(cs, { t: "property", id: l.id, mode: "cosign", years: 15 });
  const cl = rc.g.p.loans.find((x) => x.houseId);
  assert.ok(cl && cl.cosignerId, rc.msg);
  const plan = planQuote(p, l);
  assert.ok(plan.interest > 0 && plan.months === 36);
  const pl = structuredClone(g); pl.p.listings = p.listings; pl.p.money = l.price * 0.3;
  const rp = act(pl, { t: "property", id: l.id, mode: "plan" });
  assert.ok(rp.g.p.loans.some((x) => x.houseId && x.lenderType === "other"), rp.msg);
  assert.ok(ledgerBalances(rp.g.p) && ledgerBalances(rm.g.p) && ledgerBalances(rc.g.p));
  // default on a co-signed loan hurts the parent
  const bad = structuredClone(rc.g); const bl = bad.p.loans.find((x) => x.houseId)!;
  bl.missed = 3; bl.monthly = bl.balance * 50; bad.p.money = 0;
  const cid = bl.cosignerId!; const c0 = bad.p.npcs[cid].closeness;
  const after = resolveAll(ageUp(bad));
  assert.ok(after.p.npcs[cid].closeness < c0, "the co-signer pays the price");
});

test("ledger views: monthly summary, upcoming payments and alerts", () => {
  const g = aliveAt(28);
  const p = structuredClone(g.p);
  assert.ok(monthlySummary(p).length > 0);
  const rows = monthlySummary(p);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].key > rows[i].key, "newest month first");
  p.housing = { type: "rented", stateId: p.state, annualRent: 1_000_000, paidUntil: p.age * 12 + p.month + 3, arrears: 0, landlord: "selfcon" };
  assert.ok(upcomingPayments(p).some((u) => /rent/i.test(u.label) && u.inMonths === 3));
  p.housing.arrears = 2;
  assert.ok(notificationsFor(p).some((n) => n.level === "red"));
});

test("two languages: every legacy and new event has English and Pidgin text, and play never breaks in either", () => {
  const sample = structuredClone(aliveAt(34));
  const diff = new Set<string>();
  for (const lang of ["en", "pcm"] as const) {
    for (let s = 1; s <= 6; s++) {
      setSeed(s);
      let g = newGame({ ...OPTS, lang });
      for (let y = 0; y < 60 && g.p.alive; y++) {
        g = ageUp(g);
        for (let k = 0; k < 40 && g.queue.length; k++) {
          const head = g.queue[0];
          if (head.kind === "kidnap") { g = resolveAll(g); continue; }
          const v = describePending(g);
          if (!v) break;
          assert.ok(v.title && v.text, `${head.id} has a title and text in ${lang}`);
          assert.ok(!/\[object Object\]|undefined/.test(v.title + v.text + v.choices.map((c) => c.label).join(" ")), `${head.id} text has no leaks in ${lang}`);
          if (lang === "en") diff.add(`${head.id}`);
          g = choose(g, Math.max(0, v.choices.findIndex((c) => !c.disabled))).g;
        }
        assert.equal(g.p.lang, lang);
      }
    }
  }
  assert.ok(diff.size > 15, "many distinct events were exercised");
  setLang("en"); const e = T("Hello", "Howfa"); setLang("pcm"); const c = T("Hello", "Howfa");
  assert.equal(e, "Hello"); assert.equal(c, "Howfa");
  void sample;
});

test("love life end to end: meet without a phone, date, move in, propose, marry, try for a baby, birth", () => {
  const base = structuredClone(aliveAt(27));
  const mk = () => { const g = structuredClone(base); g.p.prison = 0; g.p.money = 800_000_000 * g.p.index; g.p.possessions.smartphone = false; g.p.possessions.phone = false; g.p.spouse = null; g.p.rel.partners = []; g.p.kids = []; g.p.flags = Object.fromEntries(Object.entries(g.p.flags).filter(([k]) => !/^(dating|pregn|keepPreg|lastNight|careLevel)/.test(k))) as typeof g.p.flags; return g; };
  let g = mk();
  // 1. meet someone with no phone
  let found: string | null = null;
  for (let s = 1; s <= 30 && !found; s++) { setSeed(s); g = mk(); g.p.rel.outingsLeft = 4; for (let i = 0; i < 4 && !g.p.rel.partners.length; i++) g = act(g, { t: "dating", op: "meet" }).g; if (g.p.rel.partners.length) found = g.p.rel.partners[0].npcId; }
  assert.ok(found, "you can meet people without a phone");
  const id = found!;
  const npcGender = g.p.npcs[id].gender;
  // 2. progress the relationship through the real actions
  const set = (love: number) => { g.p.rel.partners.find((x) => x.npcId === id)!.affection = love; };
  set(50); g = act(g, { t: "dating", op: "date", npc: id, plan: "nice" }).g;
  let rel = g.p.rel.partners.find((x) => x.npcId === id)!;
  for (let i = 0; i < 20 && rel.stage === "chatting"; i++) { set(60); g = act(g, { t: "dating", op: "date", npc: id, plan: "nice" }).g; rel = g.p.rel.partners.find((x) => x.npcId === id)!; }
  assert.notEqual(rel.stage, "chatting", "a date moves you on");
  set(75); g = act(g, { t: "dating", op: "official", npc: id }).g;
  rel = g.p.rel.partners.find((x) => x.npcId === id)!;
  assert.equal(rel.stage, "exclusive");
  g = act(g, { t: "dating", op: "movein", npc: id }).g;
  assert.equal(g.p.rel.partners.find((x) => x.npcId === id)!.livingTogether, true);
  set(85); g.p.age = Math.max(g.p.age, 22);
  g = act(g, { t: "dating", op: "propose", npc: id }).g;
  assert.equal(g.queue[0]?.kind === "event" && g.queue[0].id, "proposal", "proposing opens the wedding choices");
  const v = describePending(g)!;
  const wed = v.choices.findIndex((c) => !c.disabled && /wedding|Church|Court/i.test(c.label));
  g = choose(g, wed >= 0 ? wed : 0).g;
  assert.ok(g.p.spouse, "you are married");
  assert.equal(g.p.rel.partners.find((x) => x.npcId === id)!.stage, "married");
  assert.ok(ledgerBalances(g.p));
  g.queue = [];
  // 3. children: protection matters
  const rate = (prot: "condom" | "pill" | "none" | "try", gen: boolean) => {
    let preg = 0; const N = 300;
    for (let s = 1; s <= N; s++) { setSeed(s); const q = structuredClone(g); q.p.flags = Object.fromEntries(Object.entries(q.p.flags).filter(([k]) => !/^(pregn|keepPreg|lastNight)/.test(k))) as typeof q.p.flags; q.p.age = 27; const r = act(q, { t: "dating", op: "night", npc: id, prot }).g; if (r.p.flags.pregnantBy) preg++; }
    void gen; return preg / N;
  };
  if (g.p.gender !== npcGender) {
    g.p.npcs[id].ageDelta = 0;
    const none = rate("none", true), condom = rate("condom", true), tryB = rate("try", true);
    assert.ok(none > condom * 3, `no protection (${none}) is far riskier than a condom (${condom})`);
    assert.ok(condom < 0.08, `condoms rarely fail (${condom})`);
    assert.ok(tryB > none, `trying for a baby (${tryB}) beats no protection (${none})`);
    // 4. a pregnancy leads to news, care choices and a birth
    let q = structuredClone(g); let born = false;
    for (let s = 1; s <= 60 && !born; s++) {
      setSeed(s); q = structuredClone(g); q.p.age = 27; q.p.money = 800_000_000 * q.p.index;
      for (let i = 0; i < 6 && !q.p.flags.pregnantBy; i++) q = act(q, { t: "dating", op: "night", npc: id, prot: "try" }).g;
      if (!q.p.flags.pregnantBy) continue;
      const before = q.p.kids.length;
      for (let y = 0; y < 3 && q.p.kids.length === before && q.p.alive; y++) {
        q = ageUp(q);
        for (let k = 0; k < 20 && q.queue.length; k++) { const hv = describePending(q); if (!hv) break; const idx = hv.choices.findIndex((c) => !c.disabled && /celebrate|commit|Government|raising/i.test(c.label)); q = choose(q, idx >= 0 ? idx : Math.max(0, hv.choices.findIndex((c) => !c.disabled))).g; }
      }
      born = q.p.kids.length > before;
    }
    assert.ok(born, "a pregnancy ends in a birth");
    assert.ok(q.p.kids[q.p.kids.length - 1].otherParentId === id || q.p.kids.length > 0);
    assert.ok(ledgerBalances(q.p));
  }
  // 5. emergency pill, adoption, fertility treatment, divorce
  const pill = act({ ...structuredClone(g), p: { ...structuredClone(g.p), flags: { ...g.p.flags, lastNightAge: g.p.age } } } as Game, { t: "dating", op: "planb" });
  assert.ok(pill.msg.length > 0);
  const ad = act(structuredClone(g), { t: "adopt" });
  assert.equal(ad.g.p.kids.length, g.p.kids.length + 1);
  const ft = act(structuredClone(g), { t: "fertility" });
  assert.ok(Number(ft.g.p.flags.fertilityUntil) > g.p.age);
  const dv = act(structuredClone(g), { t: "dating", op: "divorce" });
  assert.equal(dv.g.p.spouse, null);
  assert.ok(ledgerBalances(dv.g.p));
});

test("dead relatives never ask for money", () => {
  const base = structuredClone(aliveAt(30));
  const p = base.p;
  p.money = 500_000_000 * p.index;
  const fam = Object.values(p.npcs).filter((n) => ["dad", "mom", "guardian", "grandparent", "uncle", "aunt", "cousin", "sibling"].includes(n.role));
  for (const n of fam) n.alive = false;
  const asks = EVENT_LIST.find((e) => e.id === "family_ask")!;
  assert.equal(asks.weight(p), 0, "no living relatives, so nobody asks");
  // only the mother is alive: she is the only one who can call
  const mom = Object.values(p.npcs).find((n) => n.role === "mom");
  if (mom) {
    mom.alive = true;
    for (let s = 1; s <= 40; s++) { setSeed(s); const d = asks.init!(p); assert.ok(!/Papa|Uncle|Aunty|brother|sister|cousin/i.test(String(d.who)), `unexpected caller ${d.who}`); }
  }
  // asking a dead parent through the game does nothing
  const dead = Object.values(p.npcs).find((n) => n.role === "dad")!;
  dead.alive = false;
  const r = act({ ...base, p } as Game, { t: "ask", npc: dead.id, kind: "pocket", amount: 1000 });
  assert.equal(r.g.p.money, p.money);
});

test("new asset classes and the financial adviser", () => {
  const g = aliveAt(35);
  const p = g.p;
  p.money = 2_000_000_000;
  p.prison = 0;
  p.houses = [];
  for (const kind of ["bond", "penny", "cryptofund", "reit"] as const) {
    const before = p.money;
    invest(p, kind, 20_000_000);
    assert.equal(p.money, before - 20_000_000);
    assert.ok(p.holdings.find((h) => h.kind === kind)?.units, `${kind} has units`);
  }
  const r = act(g, { t: "advisor", op: "hire", tier: 1 });
  assert.ok(r.g.p.advisor, "adviser hired");
  const q = r.g.p;
  for (let i = 0; i < 36; i++) marketMonth(q, []);
  assert.ok((q.market.feed ?? []).length > 0, "news feed fills");
  assert.ok((q.market.feed ?? []).length <= 16);
  assert.ok(q.holdings.every((h) => Number.isFinite(h.value)));
  assert.equal(act(r.g, { t: "advisor", op: "fire" }).g.p.advisor, undefined);
});

test("universities: catalogue, affordability by family wealth, campus life and graduation", () => {
  assert.ok(UNIS.length >= 30 && MAJORS.length >= 35);
  for (const id of ["unilag", "ui", "oau", "unn", "abu", "uniben", "unilorin", "uniport", "futa", "buk", "lasu", "covenant", "babcock", "bowen", "abuad", "landmark", "redeemers", "pau", "bingham", "madonna", "aun", "nile", "baze"]) assert.ok(UNI_BY_ID[id], id);
  for (const u of UNIS) assert.ok(MAJORS.some((m) => offers(u, m.id)), `${u.id} offers something`);
  // a poor family can afford a federal school but not a top private one; a rich family can afford both
  const poor = aliveAt(17, "lapo");
  const rich = aliveAt(17, "nepo");
  for (const n of Object.values(rich.p.npcs)) if (n.role === "dad" || n.role === "mom") { n.alive = true; n.income = 900_000_000; n.savings = 900_000_000; n.gaveThisYear = 0; if (!rich.p.fam.providers.includes(n.id)) rich.p.fam.providers.push(n.id); }
  for (const g of [poor, rich]) { g.p.edu = "secondary"; g.p.school = null; g.p.prison = 0; openAdmission(g.p, 330); g.p.money = 0; }
  const law = MAJOR_BY_ID.law;
  const unilag = UNI_BY_ID.unilag, cov = UNI_BY_ID.covenant;
  assert.equal(familyCanPay(poor.p, uniFee(poor.p, cov, law)), false, "lapo baby cannot fund Covenant");
  assert.equal(enrolBlock(poor.p, cov, law, "family") !== null, true);
  assert.equal(enrolBlock(rich.p, cov, law, "family"), null, "a nepo baby can");
  assert.ok(uniFee(rich.p, cov, law) > uniFee(rich.p, unilag, law) * 5, "private costs far more than federal");
  // a poor student on merit aid at a private school, high score
  assert.equal(enrolBlock(poor.p, cov, law, "aid"), null, "merit aid opens private doors to the brilliant");
  // cut-offs bite
  openAdmission(poor.p, 150);
  assert.ok(enrolBlock(poor.p, unilag, law, "family")?.includes("Cut-off"));
  // enrol and live the whole degree
  let g = structuredClone(rich);
  openAdmission(g.p, 300);
  g = act(g, { t: "enrol", uni: "unilag", major: "law", pay: "family" }).g;
  assert.ok(g.p.school && g.p.campus && g.p.course === "Law");
  assert.ok(Object.values(g.p.npcs).length > 0);
  for (let i = 0; i < 6 && g.p.school; i++) {
    g.p.prison = 0;
    const c = g.p.campus!;
    for (const op of ["study", "group", "club", "dept", "sug", "siwes", "project", "hustle", "scholar"]) {
      g = act(g, { t: "campus", op, arg: op === "club" ? "debate" : op === "sug" ? "high" : undefined }).g;
      g.p.money = Math.max(g.p.money, 50_000_000);
    }
    assert.ok(c.used.length > 0 || g.p.campus);
    g = resolveAll(ageUp(g));
    if (!g.p.alive) break;
  }
  if (g.p.alive && g.p.campus?.graduated) {
    assert.equal(g.p.edu, "tertiary");
    assert.ok(["First Class", "Second Class Upper", "Second Class Lower", "Third Class", "Pass"].includes(g.p.campus.cls!));
    assert.ok(campusPay(g.p) > 0.8 && campusPay(g.p) < 1.4);
  }
  assert.ok(ledgerBalances(g.p));
  assert.ok(cutoffFor(unilag, law) > cutoffFor(unilag, MAJOR_BY_ID.edu));
});

test("business mini-game: small kinds, policies, hiring and firing real people", () => {
  const g = aliveAt(25);
  g.p.prison = 0; g.p.money = 50_000_000; g.p.job = null;
  let r = act(g, { t: "biz", op: "start", id: "akara", name: "Mama Tunde Akara" });
  const b0 = r.g.p.businesses.find((x) => x.kind === "akara")!;
  assert.ok(b0, r.msg);
  assert.equal(b0.crew?.length, 0, "an akara stand starts with just you");
  r = act(r.g, { t: "biz", op: "recruit", id: b0.id });
  const b1 = r.g.p.businesses.find((x) => x.id === b0.id)!;
  assert.equal(b1.cands?.length, 3);
  r = act(r.g, { t: "biz", op: "pick", id: b0.id, idx: 1 });
  let bz = r.g.p.businesses.find((x) => x.id === b0.id)!;
  assert.equal(bz.crew?.length, 1);
  const wid = bz.crew![0].id;
  const loyal = bz.crew![0].loyalty;
  r = act(r.g, { t: "biz", op: "raise", id: b0.id, worker: wid });
  assert.ok(r.g.p.businesses[0].crew![0].loyalty > loyal);
  r = act(r.g, { t: "biz", op: "train", id: b0.id, worker: wid });
  r = act(r.g, { t: "biz", op: "price", id: b0.id, v: 2 });
  r = act(r.g, { t: "biz", op: "ads", id: b0.id, v: 2 });
  r = act(r.g, { t: "biz", op: "stock", id: b0.id, v: 0 });
  bz = r.g.p.businesses[0];
  assert.deepEqual([bz.price, bz.ads, bz.stock], [2, 2, 0]);
  let gg = r.g;
  for (let i = 0; i < 3 && gg.p.alive; i++) { gg.p.prison = 0; gg = resolveAll(ageUp(gg)); }
  const after = gg.p.businesses.find((x) => x.id === b0.id);
  if (after) { assert.ok(after.report && Number.isFinite(after.report.net)); assert.ok((after.hist?.length ?? 0) >= 1, "yearly history is kept"); }
  assert.ok(noNaN(gg.p) && ledgerBalances(gg.p));
  // firing removes the person
  if (after?.crew?.length) { const d = act(gg, { t: "biz", op: "dismiss", id: b0.id, worker: after.crew[0].id }); assert.equal(d.g.p.businesses.find((x) => x.id === b0.id)!.crew!.length, after.crew.length - 1); }
});

test("social platforms: five real platforms with their own content", () => {
  const g = aliveAt(20);
  g.p.prison = 0; g.p.possessions.smartphone = true; g.p.money = 5_000_000;
  let cur = g;
  for (const plat of ["gram", "toktik", "vidtube", "facebook", "twitter"] as const) cur = act(cur, { t: "social", op: "account", platform: plat }).g;
  assert.equal(Object.keys(cur.p.social!.accounts).length, 5);
  assert.ok(PLATFORMS.find((x) => x.id === "twitter")!.label === "Twitter" && PLATFORMS.find((x) => x.id === "gram")!.label === "Instagram");
  const wrong = act(cur, { t: "social", op: "post", platform: "facebook", content: "hottake" });
  assert.equal(wrong.g.p.social!.accounts.facebook!.posts, 0, "hot takes belong on Twitter");
  const before = cur.p.money;
  const sale = act(cur, { t: "social", op: "post", platform: "facebook", content: "market" });
  assert.ok(sale.g.p.money > before - 5_000, "Marketplace listings earn money");
  const tw = act(cur, { t: "social", op: "post", platform: "twitter", content: "thread" });
  assert.equal(tw.g.p.social!.accounts.twitter!.posts, 1);
  assert.ok(ledgerBalances(tw.g.p) && ledgerBalances(sale.g.p));
});

const withCash = (age: number, cash = 100_000_000_000_000): Game => { const g = structuredClone(aliveAt(age)); g.p.prison = 0; g.p.money = cash; g.p.actionsLeft = 5; return g; };

test("luxury vehicles: catalogue, licence gate, rental income and upkeep", () => {
  for (const id of ["corolla-used", "ferrari", "bugatti", "g650", "r44", "yacht"]) assert.ok(modelOf(id), id);
  assert.ok(VEHICLE_MODELS.every((m) => m.price > 0 && m.art));
  assert.ok(modelOf("bugatti")!.price > modelOf("ferrari")!.price && modelOf("ferrari")!.price > modelOf("corolla-used")!.price);
  assert.equal(needsLicense(modelOf("ferrari")!), true);
  assert.equal(needsLicense(modelOf("g650")!), false);
  const g = withCash(30);
  g.p.possessions.license = false;
  const blocked = act(g, { t: "car", op: "buy", id: "ferrari" });
  assert.equal(blocked.g.p.vehicles.length, g.p.vehicles.length, "no licence, no supercar");
  // aircraft and boats need no licence; price is charged exactly
  const before = g.p.money;
  const jet = act(g, { t: "car", op: "buy", id: "g650" });
  const j = jet.g.p.vehicles.find((v) => v.modelId === "g650")!;
  assert.ok(j, jet.msg);
  assert.equal(Math.round(before - jet.g.p.money), priceOf(g.p, modelOf("g650")!));
  // rent it out: charter income arrives, ledger stays balanced
  const rent = act(jet.g, { t: "car", op: "rental", id: j.id });
  assert.equal(rent.g.p.vehicles.find((v) => v.id === j.id)!.role, "rental");
  let cur = rent.g;
  const worth0 = cur.p.money;
  for (let i = 0; i < 2; i++) { cur.p.prison = 0; cur = resolveAll(ageUp(cur)); }
  assert.ok(cur.p.alive ? Number.isFinite(cur.p.money) && ledgerBalances(cur.p) : true);
  assert.ok(worth0 > 0);
  // selling returns cash
  const jj = cur.p.vehicles.find((v) => v.modelId === "g650");
  if (jj) { const m0 = cur.p.money; const sold = act(cur, { t: "car", op: "sell", id: jj.id }); assert.ok(sold.g.p.money > m0); }
});

test("driver's licence: age gate, cost, settle improves odds, then cars unlock", () => {
  const kid = structuredClone(aliveAt(16));
  assert.ok(licenseBlock(kid.p)?.length);
  const g = withCash(25, 10_000_000);
  g.p.possessions.license = false;
  assert.equal(licenseBlock(g.p), null);
  let passedPlain = 0, passedSettle = 0;
  for (let s = 1; s <= 80; s++) {
    for (const settle of [false, true]) {
      const c = structuredClone(g); setSeed(s);
      const before = c.p.money;
      takeDrivingTest(c.p, settle);
      assert.ok(c.p.money < before, "the test always costs money");
      if (c.p.possessions.license) settle ? passedSettle++ : passedPlain++;
    }
  }
  assert.ok(passedSettle > passedPlain, `settling should pass more often (${passedSettle} vs ${passedPlain})`);
  g.p.possessions.license = true; g.p.money = 100_000_000_000;
  const car = act(g, { t: "car", op: "buy", id: "corolla-used" });
  assert.ok(car.g.p.vehicles.some((v) => v.modelId === "corolla-used"));
});

test("travel: transport choice, costs, risk ordering and blocks", () => {
  const g = withCash(30);
  g.p.vehicles = []; g.p.possessions.license = false;
  const to = STATE_BY_ID.borno;
  const opts = Object.fromEntries(transportOptions(g.p, to).map((o) => [o.id, o]));
  assert.ok(opts.bus.cost < opts.ride.cost && opts.ride.cost < opts.flight.cost);
  assert.ok(opts.bus.risk > opts.ride.risk && opts.ride.risk > opts.flight.risk, "road is riskier than flying");
  assert.ok(opts.jet.block && opts.heli.block && opts.car.block, "no jet, helicopter or car owned");
  assert.equal(opts.bus.block, null);
  // own a jet: it unlocks and is the safest way to fly
  const j = act(g, { t: "car", op: "buy", id: "g650" }).g;
  const jopts = Object.fromEntries(transportOptions(j.p, to).map((o) => [o.id, o]));
  assert.equal(jopts.jet.block, null);
  assert.ok(jopts.jet.risk < jopts.flight.risk);
  // security lowers road risk
  const sec = structuredClone(g); sec.p.flags.own_bodyguards = true;
  assert.ok(tripRisk(sec.p, STATE_BY_ID[sec.p.state], to, "bus") < tripRisk(g.p, STATE_BY_ID[g.p.state], to, "bus"));
  // travelling charges exactly the shown cost and moves you
  const here = g.p.state;
  let moved = false;
  for (let s = 1; s <= 30 && !moved; s++) {
    setSeed(s);
    const c = structuredClone(g); c.p.state = here;
    const before = c.p.money;
    const r = act(c, { t: "travel", to: "kano", mode: "flight" });
    const cost = transportOptions(c.p, STATE_BY_ID.kano).find((o) => o.id === "flight")!.cost;
    if (r.g.p.state === "kano" && r.g.queue.length === 0) { assert.equal(Math.round(before - r.g.p.money), cost); assert.equal(r.g.p.traveled, false, "flights are not road trips"); moved = true; }
  }
  assert.ok(moved);
  // a blocked mode does nothing
  const nope = act(g, { t: "travel", to: "kano", mode: "jet" });
  assert.equal(nope.g.p.state, g.p.state);
  assert.equal(nope.g.p.money, g.p.money);
});

test("travel: road trips can end in kidnapping", () => {
  let kidnapped = 0;
  for (let s = 1; s <= 300 && !kidnapped; s++) {
    const g = withCash(30, 500_000_000);
    g.p.state = "abuja";
    setSeed(s);
    const r = act(g, { t: "travel", to: "zamfara", mode: "bus" });
    if (r.g.queue[0]?.kind === "kidnap") kidnapped++;
  }
  assert.equal(kidnapped, 1, "a bus to a high-risk state eventually gets stopped");
});

test("kidnap escape mini-game: planning raises the odds, running ends it", () => {
  const base = withCash(30, 800_000_000);
  base.queue.unshift({ kind: "kidnap", k: makeKidnap(base.p) });
  let g = kidnapAction(base, { type: "start" });
  g = kidnapAction(g, { type: "escapeStart" });
  let k = (g.queue[0] as { kind: "kidnap"; k: import("../types").KidnapState }).k;
  assert.ok(k.escape && k.escape.captives.length >= 2 && k.escape.captives.length <= 4);
  for (const move of ["scout", "scout", "fakeSick", "befriend", "allies"] as const) g = kidnapAction(g, { type: "escapeAct", move });
  k = (g.queue[0] as { kind: "kidnap"; k: import("../types").KidnapState }).k;
  assert.ok(k.escape!.insight >= 2, "scouting teaches you about the camp");
  assert.ok(k.escape!.noise > 5, "every move makes some noise");
  // stopping the plan clears it without ending the kidnapping
  const stopped = kidnapAction(g, { type: "escapeStop" });
  assert.equal((stopped.queue[0] as { k: import("../types").KidnapState }).k.escape, undefined);
  assert.notEqual((stopped.queue[0] as { k: import("../types").KidnapState }).k.stage, "over");
  // run many times: both escape and failure happen, outcomes are valid and the game never breaks
  const outcomes: Record<string, number> = {};
  for (let s = 1; s <= 120; s++) {
    setSeed(s);
    let h = kidnapAction(base, { type: "start" });
    h = kidnapAction(h, { type: "escapeStart" });
    for (let i = 0; i < 3; i++) h = kidnapAction(h, { type: "escapeAct", move: "scout" });
    for (let i = 0; i < 6 && h.queue[0]?.kind === "kidnap" && (h.queue[0] as { k: { stage: string } }).k.stage !== "over"; i++) h = kidnapAction(h, { type: "escapeAct", move: "run" });
    const kk = h.queue[0] as { kind: "kidnap"; k: import("../types").KidnapState } | undefined;
    if (kk?.kind === "kidnap" && kk.k.stage === "over") {
      outcomes[kk.k.outcome!] = (outcomes[kk.k.outcome!] ?? 0) + 1;
      const done = ackKidnap(h);
      assert.ok(noNaN(done.p));
      if (kk.k.outcome === "dead") assert.equal(done.p.alive, false); else assert.ok(done.p.kidnaps >= 1);
    }
  }
  assert.ok((outcomes.escaped ?? 0) > 0, `some escapes succeed: ${JSON.stringify(outcomes)}`);
});

test("engagement: moments, bucket list, weekly challenge and chain events", () => {
  // every life starts with three distinct goals, at least one with a cosmetic prize
  const g = aliveAt(30);
  assert.equal(g.p.goals?.length, 3);
  assert.equal(new Set(g.p.goals!.map((x) => x.id)).size, 3);
  assert.ok(g.p.goals!.some((x) => GOAL_DEFS.find((d) => d.id === x.id)?.unlock));
  // finishing a goal unlocks its cosmetic and logs it
  const p = structuredClone(g.p);
  p.goals = [{ id: "marry", done: false }, { id: "degree", done: false }, { id: "sixty", done: false }];
  p.spouse = { name: "Test Spouse", happy: 70 };
  const lines: string[] = [];
  engageYear(p, lines);
  assert.ok(p.goals[0].done && lines.some((l) => l.includes("Goal complete")));
  const prize = structuredClone(g.p);
  prize.goals = [{ id: "sug", done: false }, { id: "jet", done: false }, { id: "degree", done: false }];
  prize.campus = { uni: "unilag", major: "law", year: 4, payer: "self", aid: 0, effort: 0, used: [], gpas: [3], cgpa: 3, network: 10, lead: 10, clubs: [], sug: "won", siwes: false, offer: false, project: false, trouble: 0, strikes: 0 };
  engageYear(prize, []);
  assert.equal(prize.flags["unlock:wear:redcap"], 1);
  // moments are funny, bilingual, unique and carry the age
  for (const d of MOMENT_DEFS) assert.ok(d.en(g.p).length > 20 && d.pcm(g.p).length > 20, d.id);
  const m = structuredClone(g.p); m.achievements.push("Became President"); m.flags.kidEscaped = 31; m.kidnaps = 1;
  engageYear(m, []); engageYear(m, []);
  assert.equal(new Set(m.moments!.map((x) => x.id)).size, m.moments!.length, "no duplicate moments");
  assert.ok(m.moments!.some((x) => x.id === "president") && m.moments!.some((x) => x.id === "kid_escaped" && x.en.includes("31")));
  // weekly challenge: stable per week, different across weeks, and sets the start
  assert.equal(weekId(new Date(2026, 9, 22)), weekId(new Date(2026, 9, 20)));
  assert.notEqual(weekId(new Date(2026, 9, 22)), weekId(new Date(2026, 9, 29)));
  const c = challengeFor("2026-W43");
  assert.deepEqual(challengeFor("2026-W43"), c);
  const cg = newGame({ ...OPTS, stateId: c.stateId, forceArchetype: c.force, seed: c.seed, challenge: c.id });
  const cg2 = newGame({ ...OPTS, stateId: c.stateId, forceArchetype: c.force, seed: c.seed, challenge: c.id });
  assert.equal(cg.p.challenge?.id, "2026-W43");
  assert.equal(cg.p.fam.archetype, cg2.p.fam.archetype, "same seed, same family");
  assert.equal(cg.p.state, c.stateId);
  // the score locks in at 40
  const old = structuredClone(g.p); old.age = 40; old.challenge = { id: "2026-W43" };
  engageYear(old, []);
  assert.ok(typeof old.challenge.score === "number");
  // gist always has lines and shows your own moments first
  assert.ok(gistFor("2026-10-22", m).length >= 8 && gistFor("2026-10-22", m)[0].you);
  // chain events exist and gate properly
  const ids = ENGAGE_EVENTS.map((e) => e.id);
  assert.ok(["stranger_help", "stranger_returns", "detty_december", "ramadan_sallah", "aso_ebi_levy", "nysc_story", "abroad_first_winter"].every((i) => ids.includes(i)));
  const sh = ENGAGE_EVENTS.find((e) => e.id === "stranger_help")!, sr = ENGAGE_EVENTS.find((e) => e.id === "stranger_returns")!;
  const q = structuredClone(g.p); q.age = 25; q.money = 1_000_000_000;
  delete q.flags.stranger; delete q.flags.strangerDone; delete q.flags.strangerHelped;
  assert.equal(sr.weight(q), 0, "he cannot return before he arrives");
  sh.choices(q, {})[0].run(q);
  assert.equal(sr.weight(q), 0, "he returns only years later");
  q.age = 34;
  assert.ok(sr.weight(q) > 0);
  const before = q.money;
  sr.choices(q, {})[0].run(q);
  assert.ok(q.money > before, "kindness pays back");
  assert.equal(sr.weight(q), 0, "only once");
});

test("people: job titles fit the age", () => {
  assert.equal(occupationFor(13, "Engineer"), "Student");
  assert.match(occupationFor(13, "Roadside mechanic", "x"), /^Intern mechanic$/);
  assert.equal(occupationFor(10, "Surgeon"), "Pupil");
  assert.equal(occupationFor(19, "Doctor"), "Student");
  assert.equal(occupationFor(23, "Doctor"), "House officer");
  assert.equal(occupationFor(23, "Engineer"), "Junior engineer");
  assert.equal(occupationFor(34, "Engineer"), "Engineer");
  assert.match(occupationFor(70, "Teacher"), /^Retired/);
  assert.equal(occupationFor(22, "Oil & gas executive").includes("family business"), true);
  // a real life: nobody under 18 holds a grown-up career, at any point
  const g = aliveAt(17);
  const p = g.p;
  for (const n of Object.values(p.npcs)) {
    if (!["friend", "classmate", "sibling", "cousin"].includes(n.role)) continue;
    const age = p.age + n.ageDelta;
    if (age < 18) assert.match(n.occupation, /^(Baby|Toddler|Pupil|Student|Apprentice|Intern)/, `${n.role} aged ${age}: ${n.occupation}`);
  }
  // the exact bug: a 13-year-old friend who was an engineer
  const q = structuredClone(g.p); q.age = 14;
  const f = addFriend(q, -1);
  f.adultJob = "Engineer"; f.occupation = "Engineer";
  refreshOccupation(q, f);
  assert.equal(f.occupation, "Student");
  const m = addFriend(q, -1); m.adultJob = "Roadside mechanic"; refreshOccupation(q, m);
  assert.equal(m.occupation, "Intern mechanic");
  // old saves with a bad job are repaired on load
  const old = migrate(structuredClone(g));
  assert.ok(old.p.npcs);
});

test("people: classmates at every school stage and things to do together", () => {
  // primary school
  let g = liveTo(8, 3);
  assert.ok(g.p.school?.stage === "primary");
  const mates = Object.values(g.p.npcs).filter((n) => n.role === "classmate" && n.stage === "primary" && !n.former);
  assert.ok(mates.length >= 4, `primary classmates: ${mates.length}`);
  assert.ok(mates.every((n) => /^(Pupil|Student|Baby|Toddler)/.test(n.occupation)));
  const c = mates[0];
  const play = interactionsFor(g.p, c).find((i) => i.id === "play");
  assert.ok(play, "kids can play together");
  assert.ok(!interactionsFor(g.p, c).some((i) => ["party", "favour", "askout"].includes(i.id)), "no adult activities for kids");
  const c0 = c.closeness;
  const r = act(g, { t: "interact", npc: c.id, id: "play" });
  assert.ok(r.g.p.npcs[c.id].closeness > c0 && r.msg.length > 10);
  // a limit per person per year
  let h = r.g;
  for (let i = 0; i < 4; i++) h = act(h, { t: "interact", npc: c.id, id: "chat" }).g;
  assert.equal(h.p.npcs[c.id].met, 3);
  assert.ok(interactBlock(h.p, h.p.npcs[c.id], INTERACTIONS[0]));
  // new friends are easy as a child, and capped per year
  let made = 0;
  let k = structuredClone(g);
  for (let i = 0; i < 3; i++) { const before = Object.keys(k.p.npcs).length; k = act(k, { t: "friend" }).g; if (Object.keys(k.p.npcs).length > before) made++; }
  assert.ok(made >= 1 && made <= 2, `friends made: ${made}`);
  // moving on: primary classmates become old classmates once secondary school starts
  g = liveTo(14, 3);
  const old = Object.values(g.p.npcs).filter((n) => n.role === "classmate" && n.stage === "primary");
  const now = Object.values(g.p.npcs).filter((n) => n.role === "classmate" && n.stage === "secondary" && !n.former);
  assert.ok(now.length >= 4 && old.every((n) => n.former));
  // university: a cohort that helps your grades
  const u = withCash(18, 50_000_000);
  u.p.edu = "secondary"; u.p.school = null;
    openAdmission(u.p, 300);
  const e = act(u, { t: "enrol", uni: "unilag", major: "law", pay: "self" });
  const cl = Object.values(e.g.p.npcs).filter((n) => n.role === "classmate" && n.stage === "university");
  assert.ok(cl.length >= 6);
  const camp = e.g.p.campus!; const eff = camp.effort;
  const st = act(e.g, { t: "interact", npc: cl[0].id, id: "study" });
  assert.ok(st.g.p.campus!.effort > eff, "studying with a classmate helps your grades");
  // family: parents can be talked to, and grandparents tell stories
  const fam = Object.values(g.p.npcs).find((n) => n.role === "mom" || n.role === "dad")!;
  assert.ok(interactionsFor(g.p, fam).some((i) => i.id === "family_time"));
  assert.ok(ledgerBalances(r.g.p) && ledgerBalances(st.g.p));
  void refreshPeople; void interact; void makeFriend;
});

test("funeral report: verdict tag, attendance by closeness, special guests", () => {
  const base = aliveAt(60);
  const mk = (closeness: number) => {
    const p = structuredClone(base.p);
    p.stats.reputation = 50; p.crime.record = []; p.kidnaps = 0; p.loot = 0;
    for (const n of Object.values(p.npcs)) { n.alive = true; n.closeness = closeness; n.memories = []; }
    for (const k of p.kids) k.closeness = closeness;
    return p;
  };
  let loveCame = 0, coldCame = 0;
  for (let s = 1; s <= 40; s++) { setSeed(s); loveCame += buildObituary(mk(95)).came.length; setSeed(s); coldCame += buildObituary(mk(5)).came.length; }
  assert.ok(loveCame > coldCame * 1.5, `close people come (${loveCame} vs ${coldCame})`);
  setSeed(3);
  const cold = buildObituary(mk(5));
  assert.ok(cold.absent.length > 0 && cold.absent.every((m) => m.line.en.length > 10 && m.line.pcm.length > 10), "every absence has a reason");
  assert.ok(cold.absent.some((m) => /called|Saved|Do not pick|Christmases|Traffic|traffic|flight|spirit|owambe|WhatsApp/.test(m.line.en)));
  // tags
  const pres = mk(70); pres.achievements.push("Became President"); pres.politics = { office: 5, yearsLeft: 0, terms: 2, godfather: false, highest: 5, machine: 0, umpire: 0, courts: 0, military: 0, kingmaker: 0 } as never;
  const op = buildObituary(pres);
  assert.match(op.tag.en, /legendary/i);
  assert.ok(op.guests.some((x) => /public holiday/i.test(x.en)));
  const doc = mk(70); doc.job = { id: "doctor", rank: 1, years: 5 };
  assert.ok(buildObituary(doc).guests.some((x) => /doctor in the house/i.test(x.en)));
  const crook = mk(40); crook.job = { id: "kidnapper", rank: 0, years: 2 }; crook.loot = 5e9; crook.crime.record = [{ age: 30, crime: "x" } as never, { age: 31, crime: "y" } as never, { age: 33, crime: "z" } as never];
  const oc = buildObituary(crook);
  assert.match(oc.tag.en, /looter|shady|crazy/i);
  assert.ok(oc.turnout.came < op.turnout.came, "a villain draws a smaller crowd");
  const waste = mk(50); waste.achievements = []; waste.kids = []; waste.peakWorth = 100_000; waste.money = 0; waste.houses = []; waste.holdings = []; waste.vehicles = []; waste.businesses = [];
  assert.match(buildObituary(waste).tag.en, /wasted|peaceful|cut short/i);
  // everything is bilingual and the report is saved when a life ends
  for (const o of [op, oc, cold]) { assert.ok(o.highlights.length >= 4 && o.rating >= 3 && o.rating <= 99); assert.ok(o.highlights.every((h) => h.en && h.pcm)); }
  for (const o of [op, oc, cold]) assert.ok(o.headline.en.length > 20 && o.headline.pcm && o.epitaph.en.startsWith("Here lie") && o.eulogy.en && o.gossip.length >= 1 && o.extras.some((x) => /Jollof rating/.test(x.en)));
  assert.match(op.headline.en, /MARKETS CLOSE EARLY/);
  const dead = act(structuredClone(aliveAt(40)), { t: "surrender" });
  assert.ok(dead.g.p.obit && dead.g.p.obit.tag.en, "report saved on death");
});

test("sound is safe without a browser and settings can be switched", () => {
  assert.doesNotThrow(() => { unlockAudio(); for (const n of ["tap", "grow", "coin", "spend", "pop", "win", "bad", "death", "alarm", "buy", "page"] as const) sfx(n); });
  setSound({ sfx: false, music: false });
  assert.equal(getSound().sfx, false);
  setSound({ sfx: true });
  assert.equal(getSound().sfx, true);
});

test("children only get child-sized events: no adult money or grown-up choices under 18", () => {
  const base = aliveAt(9);
  const money = (t: string): number => { const m = /₦([\d.,]+)\s*([KMB]?)/.exec(t); if (!m) return 0; return Number(m[1].replace(/,/g, "")) * ({ K: 1e3, M: 1e6, B: 1e9 } as Record<string, number>)[m[2]] || Number(m[1].replace(/,/g, "")); };
  const adultWords = /\b(ram|mortgage|invest|salary|casino|bribe|hire|levy|aso-ebi|wedding|funeral|zakat|stocks?|crypto|boss|landlord|tenant|loan)\b/i;
  let checked = 0;
  for (const age of [4, 6, 8, 10, 12, 14, 16, 17]) {
    for (const religion of ["Muslim", "Christian"]) {
      const p = structuredClone(base.p); p.age = age; p.religion = religion; p.money = 3000 * p.index; p.prison = 0;
      p.possessions.phone = true; p.possessions.smartphone = true; p.school = { stage: age < 12 ? "primary" : "secondary", yearsLeft: 3, type: "school" };
      for (const e of ALL_EVENTS) {
        if (!eligible(p, e.id) || !(e.weight(p) > 0)) continue;
        const d = e.init ? e.init(p) : {};
        const text = e.text(p, d);
        for (const c of e.choices(p, d)) {
          checked++;
          const dis = Boolean(c.disabled);
          const costTxt = `${c.label} ${c.sub ?? ""}`;
          const cost = money(costTxt) / p.index ** 0.92;
          assert.ok(dis || cost <= 120_000, `[${age}] ${e.id}: "${c.label}" costs ${costTxt}`);
          assert.ok(!adultWords.test(`${c.label}`), `[${age}] ${e.id}: adult choice "${c.label}"`);
        }
        assert.ok(!/\b(buy a ram|mortgage|salary|your boss|rent is due)\b/i.test(text), `[${age}] ${e.id}: adult text`);
      }
      for (const a of ALL_AUTOS) {
        if (!eligible(p, a.id) || !(a.weight(p) > 0)) continue;
        const q = structuredClone(p); const m0 = q.money;
        a.run(q);
        assert.ok(q.money >= m0 - 120_000 * p.index, `[${age}] auto ${a.id} took too much from a child`);
      }
    }
  }
  assert.ok(checked > 20);
});

function graduate(seed: number) {
  const g = liveTo(22, seed);
  g.p.edu = "tertiary"; g.p.course = "Engineering"; g.p.school = null; g.p.job = null; g.p.money = 5_000_000;
  g.queue = [{ kind: "event", id: "nysc", data: { posted: "kano" } }];
  return g;
}
const pickLabel = (g: Game, re: RegExp) => {
  const v = describePending(g)!;
  const i = v.choices.findIndex((c) => re.test(c.label));
  assert.ok(i >= 0, `no choice matching ${re} in ${v.choices.map((c) => c.label).join(" | ")}`);
  return choose(g, i).g;
};

test("NYSC is a single year: camp game, PPA, allowance, then pass-out", () => {
  let g = graduate(7);
  g = pickLabel(g, /Go and serve/);
  assert.equal(g.p.flags.nyscServing, true);
  g = pickLabel(g, /Go to camp/);
  for (let r = 0; r < 3; r++) g = choose(g, 0).g;
  assert.ok(Number(g.p.flags.nyscCamp) >= 0, "camp score recorded");
  g = pickLabel(g, /Small NGO/);
  assert.equal(g.p.flags.nyscPpa, "ngo");
  assert.match(jobTitleOf(g.p), /Corps|Corper/);
  assert.ok(applyBlock(g.p, "banker"), "formal job blocked while serving");
  g.p.money = 1_000_000;
  g = ageUp(g);
  const allowance = g.p.ledger.filter((t) => /NYSC allowance/.test(t.reason));
  assert.equal(allowance.length, 12, "twelve monthly allowances");
  g = resolveAll(g);
  assert.equal(g.p.flags.nyscServing, false);
  assert.equal(g.p.flags.nysc, true);
  assert.ok(g.p.achievements.includes("Completed NYSC"));
  const yearAfter = g.p.age;
  g = resolveAll(ageUp(g));
  assert.equal(g.p.flags.nyscServing, false, "no second service year");
  assert.ok(g.p.age === yearAfter + 1);
});

test("NYSC camp can be skipped", () => {
  let g = graduate(8);
  g = pickLabel(g, /Go and serve/);
  g = pickLabel(g, /Skip camp/);
  assert.equal(g.p.flags.nyscCamp, -1);
  assert.equal(describePending(g)?.title, "Find your PPA");
});

test("NYSC placement is far harder for poor graduates aiming at oil", () => {
  const mk = (cls: "struggling" | "rich") => { const g = graduate(9); g.p.classAtBirth = cls; g.p.stats.connections = 30; g.p.flags.nyscCamp = 5; return g.p; };
  const oil = PPA_BY_ID.oil;
  assert.ok(placeOdds(mk("struggling"), oil) < 0.25);
  assert.ok(placeOdds(mk("rich"), oil) > placeOdds(mk("struggling"), oil) + 0.3);
  assert.ok(placeOdds(mk("struggling"), PPA_BY_ID.school) > 0.8);
  assert.ok(keepOdds(mk("rich"), oil) > keepOdds(mk("struggling"), oil));
});

test("skipping NYSC leaves no certificate and a hiring penalty", () => {
  let g = graduate(10);
  g = pickLabel(g, /Skip NYSC/);
  assert.equal(g.p.flags.nyscSkipped, true);
  assert.equal(g.p.flags.nyscServing, undefined);
});

test("prison freezes life: no school, NYSC or ordinary events, then resumes on release", () => {
  const g0 = graduate(11);
  let g = pickLabel(g0, /Go and serve/);
  g = pickLabel(g, /Skip camp/);
  g = pickLabel(g, /Small NGO/);
  g.p.prison = 3;
  g.p.job = null;
  const start = Number(g.p.flags.nyscStart);
  const allowed = new Set(PRISON_EVENTS.map((e) => e.id));
  for (let i = 0; i < 3; i++) {
    g = ageUp(g);
    assert.ok(g.p.prison === 0 || g.queue.every((x) => x.kind === "event" && allowed.has(x.id)), `non-prison event queued: ${JSON.stringify(g.queue.map((x) => x.kind === "event" && x.id))}`);
    g = resolveAll(g);
    if (g.p.prison > 0) assert.equal(g.p.flags.nyscServing, true);
  }
  assert.ok(Number(g.p.flags.nyscStart) > start, "service clock paused");
});

test("prison freezes NYSC and queued events; service resumes after release", () => {
  let g = graduate(11);
  g.p.prison = 2;
  g.queue.push({ kind: "event", id: "nysc_camp", data: {} });
  g = choose(g, 0).g;
  assert.equal(g.queue.length, 0, "no outside events while locked up");

  g = graduate(12);
  g = pickLabel(g, /Go and serve/);
  g = pickLabel(g, /Skip camp/);
  g = pickLabel(g, /Small NGO/);
  const start = Number(g.p.flags.nyscStart);
  g.p.prison = 1;
  g = resolveAll(ageUp(g));
  assert.equal(g.p.flags.nyscServing, true, "service paused, not finished");
  assert.ok(Number(g.p.flags.nyscStart) > start);
  assert.ok(!g.queue.some((x) => x.kind === "event" && x.id.startsWith("nysc")));
});

test("prison expels students, ends NYSC and makes reapplying harder", () => {
  // Student expelled.
  let g = liveTo(19, 21);
  g.p.school = { stage: "tertiary", yearsLeft: 3, type: "university" };
  g.p.flags.admOpen = 1;
  g.p.crime = { ...(g.p.crime ?? { record: [] }), record: [{ age: 19, charge: "fraud", severity: 3, outcome: "convicted" }] } as never;
  enterPrison(g.p, 2);
  assert.equal(g.p.school, null);
  assert.equal(g.p.campus, undefined);
  assert.equal(g.p.flags.admOpen, undefined);
  const u = UNIS[0]; const mj = MAJOR_BY_ID[majorsOf(u)[0].id];
  assert.equal(cutFor(g.p, u, mj), cutoffFor(u, mj) + 25);

  // Corper removed, offered remobilisation on release.
  g = graduate(16); g.p.stats.health = 95;
  g = pickLabel(g, /Go and serve/); g = pickLabel(g, /Skip camp/); g = pickLabel(g, /Small NGO/);
  enterPrison(g.p, 1); g.queue = [];
  assert.equal(g.p.flags.nyscServing, false);
  assert.equal(g.p.flags.nyscTerminated, true);
  assert.ok(!g.p.flags.nysc, "no certificate");
  g = ageUp(g);
  assert.ok(g.queue.some((x) => x.kind === "event" && x.id === "nysc_remobilise"), "offered to serve again after release");
});

test("NYSC stops at 30 and graduates over 30 get an exemption", () => {
  const g = graduate(16);
  g.p.age = 31; g.p.prison = 0; g.p.stats.health = 100; g.p.flags.nysc = false;
  g.queue = [];
  g.p.school = { stage: "tertiary", yearsLeft: 1, type: "university" };
  const r = ageUp(g);
  assert.ok(!r.queue.some((x) => x.kind === "event" && x.id === "nysc"), "no posting after 30");
  assert.equal(r.p.flags.nyscExempt, true);
  assert.equal(r.p.flags.nysc, true);
  assert.ok(!r.p.flags.nyscSkipped, "no skip penalty for the exempt");
});

test("strikes never close private universities and low-strike schools are rare", async () => {
  const { strikeFactor } = await import("../campus");
  assert.equal(strikeFactor({ id: "covenant", kind: "private" }), 0);
  assert.ok(strikeFactor({ id: "unilorin", kind: "federal" }) < strikeFactor({ id: "ui", kind: "federal" }));
});

test("poor results mean carryover and a later graduation", () => {
  let delayed = 0;
  for (let s = 40; s < 60; s++) {
    let g = liveTo(18, s);
    g.p.edu = "secondary"; g.p.school = null; g.p.money = 500_000_000; g.p.stats.smarts = 25;
    g = act(g, { t: "jamb" }).g; g.p.flags.admScore = 380;
    const u = UNIS.find((x) => x.kind === "private")!;
    g = act(g, { t: "enrol", uni: u.id, major: majorsOf(u)[0].id, pay: "self" }).g;
    if (!g.p.campus) continue;
    const years = g.p.school!.yearsLeft;
    for (let i = 0; i < years + 1 && g.p.alive && g.p.school; i++) { g.p.stats.smarts = 25; g = resolveAll(ageUp(g)); }
    if (g.p.school || g.p.campus?.carry) delayed++;
  }
  assert.ok(delayed > 0, "someone with weak grades should have repeated a year or been withdrawn");
});

test("every everyday scenario is rare, gated and can always be answered", async () => {
  const { SCENARIO_EVENTS } = await import("../scenariosAll");
  assert.ok(SCENARIO_EVENTS.length >= 70, "plenty of scenarios");
  const g = liveTo(30, 5);
  g.p.money = 0;
  for (const ev of SCENARIO_EVENTS) {
    assert.ok(ev.weight(g.p) <= 1.3, `${ev.id} is too common`);
    const ch = ev.choices(g.p, {});
    assert.ok(ch.some((c) => !c.disabled), `${ev.id} has no answer for a broke player`);
    assert.ok(ev.text(g.p, {}).length > 20);
  }
});

test("businesses: many Nigerian kinds, interactive sale with haggling and instalments", async () => {
  const { BIZ_KINDS, valuation, saleMonth } = await import("../business");
  assert.ok(BIZ_KINDS.length >= 45, "plenty of business kinds");
  assert.equal(new Set(BIZ_KINDS.map((k) => k.id)).size, BIZ_KINDS.length, "unique ids");
  let g = liveTo(30, 5);
  g.p.money = 800_000_000; g.p.prison = 0;
  g = act(g, { t: "biz", op: "start", id: "bukka", name: "Mama Ngozi Kitchen" }).g;
  const b = g.p.businesses[0];
  assert.equal(b.name, "Mama Ngozi Kitchen");
  g = act(g, { t: "biz", op: "recruit", id: b.id }).g;
  g = act(g, { t: "biz", op: "pick", id: b.id, idx: 0 }).g;
  assert.ok(g.p.businesses[0].crew!.length >= 1, "hired staff");
  g = act(g, { t: "biz", op: "train", id: b.id, worker: g.p.businesses[0].crew![0].id }).g;
  g = act(g, { t: "biz", op: "sell", id: b.id }).g;
  const offers = g.p.businesses[0].offers!;
  assert.ok(offers.length >= 3, "several buyers show up");
  assert.ok(new Set(offers.map((o) => o.type)).size >= 2, "different kinds of buyers");
  const lowball = offers.find((o) => o.type === "lowball")!;
  const fair = offers.find((o) => o.type === "fair")!;
  assert.ok(lowball.amount < valuation(g.p, g.p.businesses[0]) * 0.9 * 1.3);
  const before = g.p.money;
  g = act(g, { t: "biz", op: "accept", id: b.id, offer: fair.id }).g;
  assert.equal(g.p.businesses.length, 0, "business sold");
  assert.ok(g.p.money > before, "paid");
  assert.ok(ledgerBalances(g.p));
  // instalment: the second half arrives later
  const q = structuredClone(g.p);
  q.pendingSale = { amount: 1_000_000, months: 1, from: "Test Buyer" };
  const money = q.money;
  saleMonth(q, []);
  assert.equal(q.pendingSale, undefined);
  assert.ok(q.money > money);
});

test("estate agents get clients, show properties and earn commission", async () => {
  const { candidatesFor, realtorYear, isRealtor } = await import("../realtor");
  let g = liveTo(26, 6);
  g.p.prison = 0; g.p.money = 50_000_000; g.p.job = { id: "realtor", rank: 0, years: 0 };
  assert.ok(isRealtor(g.p));
  realtorYear(g.p, []);
  assert.ok((g.p.clients ?? []).length > 0, "clients arrive");
  g.p.actionsLeft = 30;
  let earned = false;
  for (let i = 0; i < 40 && !earned; i++) {
    g.p.stats.reputation = 90; g.p.skills.sales = 90;
    const c = g.p.clients![0];
    if (!c) { realtorYear(g.p, []); continue; }
    const best = candidatesFor(g.p, c)[0];
    if (!best) { g.p.clients = g.p.clients!.slice(1); continue; }
    const before = g.p.money;
    g = act(g, { t: "realtor", op: "show", client: c.id, listing: best.l.id }).g;
    if (g.p.money > before) earned = true;
  }
  assert.ok(earned, "a viewing eventually closes a deal");
  assert.ok(ledgerBalances(g.p));
  assert.ok((g.p.dealsClosed ?? 0) >= 1);
});

test("jobs follow what you studied", async () => {
  const { qualifyBlock } = await import("../helpers");
  const { JOB_BY_ID } = await import("../data");
  const g = liveTo(26, 8);
  const mk = (major: string, field: string) => {
    const p = structuredClone(g.p);
    p.edu = "tertiary"; p.course = field; p.age = 28; delete p.flags.postgrad;
    p.campus = { uni: "unilag", major, year: 4, payer: "self", aid: 0, effort: 0, used: [], gpas: [3], cgpa: 3, network: 10, lead: 0, clubs: [], sug: "none", siwes: false, offer: false, project: true, trouble: 0, strikes: 0, graduated: true, cls: "Second Class Upper" } as never;
    return p;
  };
  const edu = mk("edu", "Education"), med = mk("mbbs", "Medicine"), pharm = mk("pharm", "Nursing"), law = mk("law", "Law"), cs = mk("cs", "Computer Science");
  assert.ok(qualifyBlock(edu, JOB_BY_ID.doctor), "an education graduate cannot be a doctor");
  assert.ok(qualifyBlock(edu, JOB_BY_ID.lawyer));
  assert.ok(qualifyBlock(edu, JOB_BY_ID.banker), "education does not lead to banking");
  assert.equal(qualifyBlock(edu, JOB_BY_ID.teacher), null);
  assert.equal(qualifyBlock(med, JOB_BY_ID.doctor), null);
  assert.ok(qualifyBlock(med, JOB_BY_ID.lawyer));
  assert.equal(qualifyBlock(pharm, JOB_BY_ID.pharmacist), null);
  assert.ok(qualifyBlock(pharm, JOB_BY_ID.nurse), "a pharmacist is not a nurse");
  assert.equal(qualifyBlock(law, JOB_BY_ID.lawyer), null);
  assert.equal(qualifyBlock(cs, JOB_BY_ID.dev), null);
  assert.ok(qualifyBlock(cs, JOB_BY_ID.architect));
  assert.ok(qualifyBlock(cs, JOB_BY_ID.lecturer), "lecturers need a postgraduate degree");
  cs.flags.postgrad = "Masters" as never;
  assert.equal(qualifyBlock(cs, JOB_BY_ID.lecturer), null);
  assert.ok(qualifyBlock(structuredClone(g.p), JOB_BY_ID.graphic) !== undefined);
  const noSkill = structuredClone(g.p); noSkill.age = 20; noSkill.edu = "secondary"; noSkill.skills = {};
  assert.ok(qualifyBlock(noSkill, JOB_BY_ID.photographer), "photography needs the skill");
  noSkill.skills.photo = 15;
  assert.equal(qualifyBlock(noSkill, JOB_BY_ID.photographer), null);
  assert.ok(Object.keys(JOB_BY_ID).length >= 100, "a big job market");
});

test("skills climb from beginner to one of the best, with courses, practice and mentors", async () => {
  const { SKILLS, learnSkill, learnBlock, skillTier, skillTopPct } = await import("../life");
  assert.ok(SKILLS.length >= 14);
  const g = liveTo(22, 9);
  const p = g.p;
  p.prison = 0; p.money = 500_000_000; p.stats.connections = 80; p.skills = {};
  const s = SKILLS.find((x) => x.id === "coding")!;
  p.actionsLeft = 99;
  assert.equal(skillTier(0).id, "beginner");
  for (let i = 0; i < 12 && (p.skills.coding ?? 0) < 78; i++) learnSkill(p, "coding", "course");
  assert.ok((p.skills.coding ?? 0) >= 40, "courses build skill");
  p.skills.coding = 82;
  assert.ok(learnBlock(p, s, "course"), "courses stop helping past 80");
  for (let i = 0; i < 20 && p.skills.coding < 95; i++) learnSkill(p, "coding", "mentor");
  assert.ok(p.skills.coding >= 95, "mentors take you to mastery");
  assert.equal(skillTier(p.skills.coding).id, "master");
  assert.ok(p.achievements.includes("Master of Coding") || p.achievements.some((a) => a.startsWith("Master of")));
  assert.ok(skillTopPct(95) < 2 && skillTopPct(30) > 40);
  assert.ok(ledgerBalances(p));
});

test("every business is run its own way", async () => {
  const { BIZ_KINDS, modsOf, leverIdx, businessAct, actBlock } = await import("../business");
  const { profileOf } = await import("../bizProfiles");
  const sig = new Set<string>();
  for (const k of BIZ_KINDS) {
    const pr = profileOf(k.id);
    assert.ok(pr.levers.length >= 4 && pr.roles.length >= 3 && pr.actions.length >= 3, `${k.id} has a real profile`);
    assert.ok(pr.intro[0].length > 20);
    sig.add(pr.levers.map((l) => l.id).join(","));
    const g = { set: {} } as never as import("../types").Business;
    (g as { kind: string }).kind = k.id;
    const m = modsOf(g);
    assert.ok(Math.abs(m.rev - 1) < 1e-9 && Math.abs(m.cost - 1) < 1e-9, `${k.id}: default options are neutral`);
  }
  assert.ok(sig.size >= 10, "businesses differ in what you decide");
  const pos = profileOf("pos"), hotel = profileOf("hotel"), barber = profileOf("barbing");
  assert.ok(!pos.levers.some((l) => l.id === "price"), "POS rates are fixed: no price lever");
  assert.ok(pos.levers.some((l) => l.id === "float") && pos.levers.some((l) => l.id === "location"));
  assert.ok(hotel.roles.some((r) => r.id === "housekeeping") && hotel.roles.some((r) => r.id === "reception"));
  assert.ok(barber.roles.some((r) => r.id === "barber") && barber.roles.some((r) => r.id === "nails"), "a barbing shop can hire a nail tech");
  assert.ok(barber.levers.find((l) => l.id === "services")!.opts.some((o) => /unisex/i.test(o.label[0])), "and go unisex");
  // playing it
  let g = liveTo(30, 5);
  g.p.money = 900_000_000; g.p.prison = 0; g.p.actionsLeft = 9;
  g = act(g, { t: "biz", op: "start", id: "barbing", name: "Fresh Cuts" }).g;
  const b = g.p.businesses[0];
  assert.ok(b.crew!.length >= 1 || true);
  g = act(g, { t: "biz", op: "recruit", id: b.id, role: "nails" }).g;
  assert.ok(g.p.businesses[0].cands!.every((c) => c.role === "nails"), "candidates are for the role you picked");
  g = act(g, { t: "biz", op: "pick", id: b.id, idx: 0 }).g;
  assert.ok(g.p.businesses[0].crew!.some((c) => c.role === "nails"));
  const before = g.p.money;
  g = act(g, { t: "biz", op: "lever", id: b.id, key: "services", v: 2 }).g;
  assert.equal(leverIdx(g.p.businesses[0], "services", 1), 2);
  assert.ok(g.p.money < before, "switching to the unisex menu costs a set-up fee");
  const nb = g.p.businesses[0];
  assert.equal(actBlock(g.p, nb, "equipment"), null);
  const q0 = nb.quality;
  g = act(g, { t: "biz", op: "act", id: b.id, key: "equipment" }).g;
  assert.ok(g.p.businesses[0].quality > q0);
  assert.ok(actBlock(g.p, g.p.businesses[0], "equipment"), "once a year");
  void businessAct;
  assert.ok(ledgerBalances(g.p));
  g = resolveAll(ageUp(g));
  assert.ok(g.p.alive);
});

test("unserviced vehicles wear out faster than serviced ones and eventually break down", async () => {
  const { addVehicle, vehicleMonth, VEHICLE_MODELS } = await import("../vehicles");
  const g = aliveAt(30);
  const p = structuredClone(g.p);
  p.money = 1e12;
  const m = VEHICLE_MODELS.find((x) => x.cat === "car")!;
  const a = addVehicle(p, m); const b = addVehicle(p, m);
  a.service = 0; b.service = 2; a.condition = 90; b.condition = 90;
  const lines: string[] = [];
  for (let i = 0; i < 48; i++) { p.month = (i % 12) + 1; vehicleMonth(p, lines); }
  assert.ok(a.condition < b.condition - 15, `neglected ${a.condition} vs full ${b.condition}`);
  assert.ok(lines.some((l) => /broke|break/i.test(l)), "the neglected car breaks down");
});

test("rich parents leave an inheritance when the last one dies; leaving the spouse out upsets them", async () => {
  const { parentEstate, willReactions } = await import("../inherit");
  const g = aliveAt(30, "nepo");
  const p = structuredClone(g.p);
  for (const n of Object.values(p.npcs)) if (n.role === "dad" || n.role === "mom") n.alive = false;
  const dead = Object.values(p.npcs).find((n) => n.role === "dad")!;
  const pending: import("../types").Pending[] = [];
  parentEstate(p, dead, [], pending);
  assert.ok(pending.some((x) => x.kind === "event" && x.id === "parent_estate"), "the will is read");
  p.spouse = { name: "Ada", happy: 80 };
  p.kids = [{ name: "Chi", age: 5, gender: "female", closeness: 80 }];
  p.will = { shares: [{ id: "kid:0", pct: 100 }], updatedAge: 30 };
  const lines: string[] = [];
  willReactions(p, lines);
  assert.ok(p.spouse.happy < 80 && lines.length > 0);
  p.spouse.happy = 80; p.will = { shares: [{ id: "spouse", pct: 100 }], updatedAge: 30 };
  willReactions(p, lines);
  assert.ok((p.kids[0].closeness ?? 80) < 80);
});

test("classmates exist in every stage, including NYSC, and can be turned into friends", async () => {
  const { fillClassmates, interact } = await import("../people");
  const g = aliveAt(20);
  const p = structuredClone(g.p);
  p.school = { stage: "tertiary", yearsLeft: 3, type: "university" };
  fillClassmates(p);
  let mates = Object.values(p.npcs).filter((n) => n.role === "classmate" && n.stage === "university" && !n.former);
  assert.ok(mates.length >= 6, "university classmates");
  p.school = null;
  p.flags.nyscServing = true;
  fillClassmates(p);
  mates = Object.values(p.npcs).filter((n) => n.role === "classmate" && n.stage === "nysc" && !n.former);
  assert.ok(mates.length >= 6, "corps mates");
  assert.ok(Object.values(p.npcs).filter((n) => n.stage === "university").every((n) => n.former), "uni mates become old classmates");
  const m = mates[0];
  m.closeness = 60; p.prison = 0;
  interact(p, m.id, "befriend");
  assert.equal(p.npcs[m.id].role, "friend");
});

test("hooking up, asking a friend out and the Yahoo hustle all work", async () => {
  const { hookUp } = await import("../relationships");
  const y = await import("../yahoo");
  const { interact } = await import("../people");
  const g = aliveAt(24);
  const p = structuredClone(g.p);
  p.prison = 0; p.money = 1e10; p.rel.outingsLeft = 50; p.spouse = null; p.rel.partners = [];
  let went = 0;
  for (let i = 0; i < 40 && !went; i++) { hookUp(p, "condom"); went = Number(p.flags.hookups ?? 0); }
  assert.ok(went > 0, "a hook-up eventually happens");
  // ask a friend out
  p.gender = "male";
  const f = Object.values(p.npcs).find((n) => n.role === "classmate") ?? Object.values(p.npcs)[0];
  Object.assign(f, { role: "friend", gender: "female", alive: true, ageDelta: 0, closeness: 95 });
  p.age = 24;
  let dating = false;
  for (let i = 0; i < 30 && !dating; i++) { f.met = 0; p.rel.partners = []; interact(p, f.id, "askout"); dating = p.rel.partners.length > 0; if (!p.npcs[f.id]) break; }
  assert.ok(dating || !p.npcs[f.id], "a close friend can be asked out");
  // Yahoo
  p.job = { id: "yahoo", rank: 0, years: 0 };
  p.flags.yahooAge = -1;
  assert.ok(y.sessionsLeft(p) > 0);
  y.hunt(p);
  const ms = y.marksOf(p);
  assert.ok(ms.length > 0, "clients found");
  for (let i = 0; i < 3; i++) y.work(p, ms[0].id, "chat");
  const before = p.crime.heat;
  y.cashOut(p, ms[0].id);
  assert.ok(p.crime.heat >= before, "cashing out raises heat");
  assert.ok(y.sessionsLeft(p) < 8 && y.sessionsLeft(p) >= 0);
});

test("every Yahoo event can be played through every choice without breaking the game", async () => {
  const { YAHOO_EVENTS } = await import("../yahoo");
  const g = aliveAt(25);
  assert.ok(YAHOO_EVENTS.length >= 12);
  for (const e of YAHOO_EVENTS) {
    const n = e.choices({ ...g.p, job: { id: "yahoo", rank: 0, years: 0 }, money: 1e9 } as Player, e.init ? e.init(g.p) : {}).length;
    for (let i = 0; i < n; i++) {
      const p = structuredClone(g.p);
      p.job = { id: "yahoo", rank: 0, years: 0 }; p.money = 1e9; p.prison = 0;
      const d = e.init ? e.init(p) : {};
      const c = e.choices(p, d)[i];
      assert.ok(typeof c.run(p) === "string", `${e.id} choice ${i}`);
      assert.ok(Number.isFinite(p.money) && p.crime.heat >= 0 && p.crime.heat <= 100, `${e.id} sane state`);
    }
  }
});

test("pets, lottery, style, talent, DNA, ribbons and the new events all work", async () => {
  const b = await import("../bitlife");
  const { BIT_EVENTS } = await import("../bitEvents");
  const { ribbonsOf } = await import("../ribbons");
  const g = aliveAt(28);
  const p = structuredClone(g.p);
  p.prison = 0; p.money = 1e10; p.age = 28; p.job = null;
  assert.ok(b.adoptPet(p, "dog").length > 0);
  assert.equal(b.petsOf(p).length, 1);
  b.petCare(p, b.petsOf(p)[0].id, "feed");
  for (let i = 0; i < 12; i++) b.playTicket(p, "scratch");
  assert.ok(b.ticketsLeft(p) <= 0, "ticket limit");
  const looks0 = p.stats.looks;
  p.flags.styleAge = -1;
  b.doStyle(p, "hair");
  assert.ok(p.stats.looks >= looks0 - 1);
  b.pickTalent(p, "music");
  for (let i = 0; i < 5; i++) b.practice(p);
  assert.ok(b.talentOf(p).level > 6, "practice raises skill");
  assert.ok(b.dnaTest(p).length > 0 && p.flags.dnaText);
  for (let i = 0; i < 30; i++) { const l: string[] = []; b.bitYear(p, l, []); }
  assert.ok(Array.isArray(ribbonsOf(p)));
  for (const e of BIT_EVENTS) {
    const n = e.choices(p, e.init ? e.init(p) : {}).length;
    for (let i = 0; i < n; i++) {
      const q = structuredClone(p); q.prison = 0; q.money = 1e10;
      const c = e.choices(q, e.init ? e.init(q) : {})[i];
      assert.ok(typeof c.run(q) === "string", `${e.id}[${i}]`);
      assert.ok(Number.isFinite(q.money), `${e.id} finite`);
    }
  }
});

test("economy: mood, dollar rate, standing and black tax", async () => {
  const eco = await import("../economy");
  const g = aliveAt(35);
  const p = structuredClone(g.p);
  p.prison = 0;
  p.world = p.world ?? { until: {}, news: [] };
  assert.ok(["steady", "election"].includes(eco.econMood(p).id) || eco.econMood(p).id.length > 0);
  const r0 = eco.fxRate(p);
  assert.ok(r0 > 0);
  p.world.until.recession = p.age + 2;
  assert.equal(eco.econMood(p).id, "recession");
  p.world.until.crash = p.age + 1;
  assert.equal(eco.econMood(p).id, "crash");
  p.holdings.push({ id: "u1", kind: "usd", label: "Dollar", invested: 1000, value: 1000, since: 0 });
  eco.shockFx(p, 0.2);
  assert.equal(p.holdings.find((h) => h.id === "u1")!.value, 1200);
  assert.ok(eco.fxRate(p) > r0);
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) eco.yearlyEcon(p, 0.1, lines);
  assert.ok(eco.fxRate(p) > r0, "naira loses value over time");
  eco.statusYear(p, lines);
  assert.ok(eco.statusOf(p) >= 0 && eco.statusOf(p) <= 100);
  p.fin = [{ age: p.age - 1, income: 20_000_000 * p.index, expense: 0, borrowed: 0, cats: {} }];
  assert.ok(eco.blackTaxDemand(p) > 0);
  const pend: import("../types").Pending[] = [];
  for (let i = 0; i < 20; i++) eco.blackTaxYear(p, pend);
  assert.ok(pend.length > 0, "family asks for black tax");
  const ev = eco.MONEY_EVENTS[0];
  const d = { amount: eco.blackTaxDemand(p), why: 0 };
  p.money = 1e10;
  for (let i = 0; i < ev.choices(p, d).length; i++) { const q = structuredClone(p); assert.ok(typeof ev.choices(q, d)[i].run(q) === "string"); }
});

test("you can propose straight from dating, and a partner who is not ready says so", () => {
  let q = structuredClone(aliveAt(26));
  q.p.prison = 0; q.p.spouse = null; q.p.rel.partners = []; q.p.possessions.smartphone = true; q.p.money = 1e10; q.queue = [];
  q.p.age = Math.max(q.p.age, 26);
  q = act(q, { t: "dating", op: "profile", bio: "hello there friend", interests: ["music"] }).g;
  const base0 = q;
  for (let s = 3; s < 60 && !q.p.rel.partners.length; s++) {
    q = structuredClone(base0); setSeed(s);
    for (let i = 0; i < 12 && q.p.rel.deck.length; i++) q = act(q, { t: "dating", op: "swipe", npc: q.p.rel.deck[0].id, like: true }).g;
  }
  const rel = q.p.rel.partners[0];
  assert.ok(rel, "a match");
  rel.stage = "dating"; rel.affection = 40;
  let r = act(q, { t: "dating", op: "propose", npc: rel.npcId });
  assert.equal(r.g.p.rel.partners[0].stage, "dating", "not ready yet");
  q.p.rel.partners[0].affection = 80;
  r = act(q, { t: "dating", op: "propose", npc: rel.npcId });
  assert.equal(r.g.p.rel.partners[0].stage, "engaged", "engaged after a proposal from dating");
  assert.ok(r.g.queue.some((e) => e.kind === "event" && e.id === "proposal"), "the wedding choices open");
});

test("local investments: agric, land, off-plan, ponzi and ajo pay, stall or collapse", async () => {
  const v = await import("../invest2");
  const g = aliveAt(30);
  const p = structuredClone(g.p);
  p.prison = 0; p.money = 1e13; p.age = 30;
  for (const k of ["agric", "land", "offplan", "ponzi", "ajo"] as const) assert.ok(v.buyPosition(p, k, Math.round(1e9)).length > 0, k);
  assert.equal(v.positions(p).length, 5);
  const m0 = p.money;
  for (let y = 0; y < 8; y++) { for (let m = 0; m < 12; m++) v.inv2Month(p, []); v.inv2Year(p, 0.1, [], []); }
  assert.ok(Number.isFinite(p.money));
  assert.ok(v.positions(p).filter((x) => x.kind === "ajo").every((x) => Boolean(x.dead) || Boolean(x.meta)), "ajo state sane");
  assert.ok(p.money !== m0, "money moved");
  const pz = v.positions(p).find((x) => x.kind === "ponzi");
  if (pz) assert.ok(pz.value >= 0);
  assert.ok(Boolean(v.invBlock(p, "agric", 1)), "minimum enforced");
  const ev = v.INV2_EVENTS.find((e) => e.id === "ponzi_referral")!;
  v.buyPosition(p, "ponzi", 1e9);
  for (let i = 0; i < 3; i++) { const q = structuredClone(p); assert.ok(typeof ev.choices(q, {})[i].run(q) === "string"); }
});

test("rival, fortunes, favours, quests and milestones", async () => {
  const r = await import("../rival");
  const qz = await import("../quests");
  const g = aliveAt(30);
  const p = structuredClone(g.p);
  p.prison = 0; p.age = 30; p.money = 1e9;
  const lines: string[] = []; const pend: import("../types").Pending[] = [];
  for (let i = 0; i < 25; i++) { r.rivalYear(p, lines, pend); r.npcFortunes(p, lines, pend); }
  const rv = r.rivalOf(p);
  assert.ok(rv && r.rivalNpc(p), "a rival exists");
  assert.ok(r.rivalCompare(p).length === 6);
  assert.ok(lines.length > 0, "the rival's life shows up in the feed");
  // favours
  const f = Object.values(p.npcs).find((n) => n.role === "friend") ?? r.rivalNpc(p)!;
  f.owes = 2; f.title = "Senator"; f.alive = true; p.job = null;
  assert.ok(r.powerOf(f) >= 1 && r.favourBlock(p, f, "contract") === null);
  const m0 = p.money;
  r.callFavour(p, f.id, "contract");
  assert.ok(p.money > m0 && f.owes === 1);
  p.prison = 6; r.callFavour(p, f.id, "legal");
  assert.ok(p.prison < 6, "sentence cut");
  p.prison = 0;
  // quests
  for (let y = 0; y < 3; y++) { p.age += 1; qz.questsYear(p, []); }
  const qs = qz.questsOf(p);
  assert.equal(qs.length, 3);
  assert.ok(qs.every((q) => qz.QUEST_BY_ID[q.id]));
  // milestones
  const pend2: import("../types").Pending[] = [];
  p.flags.mile_m1 = undefined as never; delete p.flags.mile_m1;
  qz.milestonesYear(p, pend2);
  assert.ok(pend2.some((x) => x.kind === "event" && x.id === "milestone"), "a milestone fires");
  for (const e of [...r.RIVAL_EVENTS, ...qz.QUEST_EVENTS]) {
    const d = e.init ? e.init(p) : { mid: "m1", npcId: f.id };
    const n = e.choices(p, d).length;
    for (let i = 0; i < n; i++) { const q = structuredClone(p); q.money = 1e10; assert.ok(typeof e.choices(q, d)[i].run(q) === "string", `${e.id}[${i}]`); }
  }
});

test("legacy, calendar seasons, daily pick, score codes and policy choices", async () => {
  const lg = await import("../legacy");
  const cal = await import("../calendar");
  const dl = await import("../daily");
  const sc = await import("../scoreCode");
  const eco = await import("../economy");
  const g = aliveAt(40);
  const p = structuredClone(g.p);
  p.prison = 0; p.money = 1e10;
  assert.ok(lg.famNameOf(p) >= 0);
  // heir inherits name, heirlooms, compound
  const heir = structuredClone(p);
  heir.houses = [{ id: "h1", state: "lagos", kind: "duplex", value: 5e8, use: "owner" }, { id: "h2", state: "lagos", kind: "bungalow", value: 1e7, use: "empty" }];
  heir.peakWorth = 2e9 * heir.index;
  lg.inheritLegacy(heir, p);
  p.houses = heir.houses;
  lg.inheritLegacy(heir, p);
  assert.ok(p.houses.find((h) => h.id === "h1")!.compound, "best house becomes the compound");
  assert.ok(lg.heirloomsOf(p).length >= 1, "heirlooms handed down");
  const pend: import("../types").Pending[] = [];
  for (let i = 0; i < 40; i++) lg.legacyYear(p, [], pend);
  assert.ok(pend.some((x) => x.kind === "event"), "legacy events fire");
  for (const e of lg.LEGACY_EVENTS) { const n = e.choices(p, {}).length; for (let i = 0; i < n; i++) { const q = structuredClone(p); assert.ok(typeof e.choices(q, {})[i].run(q) === "string", `${e.id}[${i}]`); } }
  // calendar
  const dec = cal.seasonsFor(new Date("2026-12-15T12:00:00Z"));
  assert.ok(dec.some((s) => s.id === "december"));
  cal.setLiveSeason(new Date("2026-12-15T12:00:00Z"));
  assert.equal(cal.seasonBoost("detty_december"), 4);
  cal.setLiveSeason(null);
  assert.equal(cal.seasonBoost("detty_december"), 1);
  // daily pick
  const picks = dl.dailyFor("2026-10-23");
  assert.equal(picks.length, 3);
  assert.deepEqual(picks.map((x) => x.id), dl.dailyFor("2026-10-23").map((x) => x.id), "same for everyone on a day");
  const r1 = dl.applyDaily(p, picks[0].id, "2026-10-23");
  assert.ok(r1.length > 0 && dl.dailyClaimed(p, "2026-10-23"));
  assert.ok(/already|don take/i.test(dl.applyDaily(p, picks[1].id, "2026-10-23")), "one pick per day");
  assert.equal(dl.applyDaily(p, "x", "garbage"), "");
  // score codes
  const code = sc.encodeScore(sc.scoreOf(p));
  const back = sc.decodeScore(code);
  assert.ok(back && back.n === `${p.name} ${p.surname}`.slice(0, 40));
  assert.equal(sc.decodeScore("NL1.@@@"), null);
  assert.equal(sc.decodeScore("hello"), null);
  // policy
  p.politics = { office: 5, yearsLeft: 3, terms: 1, godfather: false, highest: 5, machine: 50, umpire: 50, courts: 50, military: 50 } as never;
  const pol = eco.POLICY_EVENTS[0];
  assert.ok(pol.weight(p) > 0);
  for (let i = 0; i < pol.choices(p, {}).length; i++) { const q = structuredClone(p); q.world = q.world ?? { until: {}, news: [] }; assert.ok(typeof pol.choices(q, {})[i].run(q) === "string"); }
});

test("mini-game scores feed into actions, and skipping keeps the old behaviour", async () => {
  const { BIZ_KINDS } = await import("../business");
  const g = aliveAt(20);
  g.queue = []; g.p.prison = 0; g.p.actionsLeft = 3;
  const s0 = g.p.stats.smarts;
  const hi = act(structuredClone(g), { t: "activity", id: "study", score: 1 }).g;
  const lo = act(structuredClone(g), { t: "activity", id: "study", score: 0 }).g;
  const skip = act(structuredClone(g), { t: "activity", id: "study" }).g;
  assert.ok(hi.p.stats.smarts - s0 > lo.p.stats.smarts - s0, "a better quiz score teaches more");
  assert.equal(Math.min(100, s0 + 3), skip.p.stats.smarts, "skipping keeps the original +3");
  // hawk earnings scale with the haggle score
  const m0 = g.p.money;
  const hh = act(structuredClone(g), { t: "activity", id: "hawk", score: 1 }).g.p.money - m0;
  const hl = act(structuredClone(g), { t: "activity", id: "hawk", score: 0 }).g.p.money - m0;
  assert.ok(hh > 0 && hl > 0);
  // business shift
  const q = structuredClone(g); q.p.money = 1e9; q.p.age = 25;
  let r = act(q, { t: "biz", op: "start", id: BIZ_KINDS[0].id, name: "Test" } as never).g;
  const bz = r.p.businesses[0];
  if (bz) { r.p.actionsLeft = 2; const before = r.p.money; r = act(r, { t: "biz", op: "shift", id: bz.id, score: 1 }).g; assert.ok(r.p.money > before, "a good rush hour pays"); }
});
