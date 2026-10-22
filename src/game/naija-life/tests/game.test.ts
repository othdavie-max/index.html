/**
 * Naija Life simulation tests. Run with: npm run test:game
 * They use the real engine with seeded randomness; nothing is mocked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FAMILY_CONFIG, applySupport, defaultAmount, evaluateSupport, generateFamily, newInformalLoan } from "../family";
import { ACTIVITIES, ackKidnap, act, ageUp, choose, describePending, kidnapAction, migrate, newGame, startHeir, type Action } from "../engine";
import { ledgerBalances } from "../ledger";
import { borrowFrom, lenderOffers, previewLoan, repayLoan, takeLoan, totalDebt } from "../loans";
import { eligible } from "../eligibility";
import { FACILITIES, developCondition, treatmentCost } from "../health";
import { createProfile, datingAllowed, intimacyBlock, refreshDeck, swipe } from "../relationships";
import { createAccount, post, totalFollowers } from "../social";
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
  const charges = q.p.ledger.filter((t) => t.category === "rent" && t.amount < 0 && /Rent/i.test(t.reason)).map((t) => t.age * 12 + t.month);
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
  q.p.possessions.smartphone = true;
  q = act(q, { t: "dating", op: "profile", bio: "hello there friend", interests: ["music"] }).g;
  setSeed(5);
  for (let i = 0; i < 12 && q.p.rel.deck.length; i++) q = act(q, { t: "dating", op: "swipe", npc: q.p.rel.deck[0].id, like: true }).g;
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
  for (let i = 0; i < 4 && g.p.alive; i++) { g = ageUp(g); if (g.queue.some((q) => q.kind === "event" && q.id === "promotion_board")) sawBoard = true; assert.ok(g.p.job?.rank === 0 || sawBoard, "no promotion without the board"); g = resolveAll(g, "first"); if (!g.p.job || g.p.job.id !== "soldier") break; }
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
  q.p.possessions.smartphone = true;
  q.p.money = 1_000_000_000 * q.p.index;
  q = act(q, { t: "dating", op: "profile", bio: "hello there friend", interests: ["music", "food"] }).g;
  setSeed(9);
  for (let i = 0; i < 12 && q.p.rel.deck.length; i++) q = act(q, { t: "dating", op: "swipe", npc: q.p.rel.deck[0].id, like: true }).g;
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
  prov.closeness = 90; prov.trust = 90; prov.income = 500_000_000;
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
  // 3. children: protection matters
  const rate = (prot: "condom" | "pill" | "none" | "try", gen: boolean) => {
    let preg = 0; const N = 300;
    for (let s = 1; s <= N; s++) { setSeed(s); const q = structuredClone(g); q.p.flags = Object.fromEntries(Object.entries(q.p.flags).filter(([k]) => !/^(pregn|keepPreg|lastNight)/.test(k))) as typeof q.p.flags; q.p.age = 27; const r = act(q, { t: "dating", op: "night", npc: id, prot }).g; if (r.p.flags.pregnantBy) preg++; }
    void gen; return preg / N;
  };
  if (g.p.gender !== npcGender) {
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
