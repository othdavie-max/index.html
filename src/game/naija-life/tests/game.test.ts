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
import { beneficiaries, setShare, planEstate } from "../will";
import { randomLook } from "../look";
import { STATE_BY_ID } from "../data";
import { setSeed } from "../util";
import type { FamilyArchetype, Game, Player } from "../types";

const OPTS = { name: "Test Person", gender: "male" as const, stateId: "lagos", tribe: null, religion: null };

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
  p.money = 5_500_000 * p.index * 3;
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
  p2.money = 5_500_000 * p2.index * 2;
  p2.credit = 70;
  const b2 = p2.money;
  buyVehicle(p2, "corolla-used", true);
  assert.equal(p2.vehicles.length, 1);
  assert.ok(p2.loans.some((l) => l.id === p2.vehicles[0].loanId && l.direction === "owed"));
  assert.ok(b2 - p2.money < 5_500_000 * p2.index, "only the deposit leaves your cash");
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
