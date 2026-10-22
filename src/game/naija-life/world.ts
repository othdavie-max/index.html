import { HOME_TIERS, STATE_BY_ID } from "./data";
import { addCousin } from "./events6";
import { DEFAULT_FAMILY_CONFIG, FAMILY_DEBT_TAGS, addFriend, capacityOf, generateFamily, npcAge, npcsByRole, primaryProvider, remember, syncLegacyFamily, type FamilyConfig } from "./family";
import { allowanceCutoffAge, allowanceMonthly } from "./finance";
import { stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import type { FamilyArchetype, Housing, Npc, Pending, Player, StateInfo } from "./types";
import { T, chance, clamp, naira, randInt } from "./util";

export function familyHousing(stateId: string): Housing {
  return { type: "family", stateId, annualRent: 0, paidUntil: 0, arrears: 0, landlord: "" };
}

/** Sets up every new-world field for a brand-new player. */
export function initWorld(p: Player, st: StateInfo, cfg: FamilyConfig = DEFAULT_FAMILY_CONFIG, forceArchetype?: FamilyArchetype) {
  const gen = generateFamily({ st, tribe: p.tribe, religion: p.religion, playerLook: p.look, surname: p.surname, cfg, forceArchetype });
  p.fam = gen.fam;
  p.npcs = Object.fromEntries(gen.npcs.map((n) => [n.id, n]));
  p.month = 1;
  p.ledger = [];
  p.txCount = 0;
  p.fin = [];
  p.loans = [];
  p.credit = 50;
  p.housing = familyHousing(p.state);
  p.subs = [];
  p.possessions = { phone: false, smartphone: false, laptop: false };
  p.skills = {};
  p.vehicles = [];
  p.conditions = [];
  p.insurance = { plan: "none" };
  p.rel = { profile: null, deck: [], partners: [], swipesLeft: 12, chatsLeft: 10 };
  p.social = null;
  p.businesses = [];
  p.market = { ngx: 100, fund: 100, crypto: 100, penny: 100, cfund: 100, reit: 100, bond: 100, regime: "normal", regimeLeft: 12, feed: [], pending: [], tbill: 0.15, savings: 0.08 };
  p.bets = { staked: 0, won: 0, count: 0, slotsLeft: 8, compulsion: 0 };
  p.crime = { record: [], heat: 0, skill: 10, violence: 0, cases: [] };
  p.will = null;
  p.stats.fitness = randInt(30, 60);
  p.family.parentsAlive = gen.fam.structure !== "orphan";
  syncLegacyFamily(p);
  // Wealthier families give you more connections to start with.
  p.stats.connections = clamp(Math.round(2 + Math.log10(Math.max(gen.fam.income, 3e5) / 3e5) * 14 + (gen.fam.connections ? 10 : 0) + randInt(0, 6)), 1, 70);
}

/** Old saves had no NPCs or ledger. Fill everything in without losing progress. */
export function migrateWorld(p: Player) {
  if (!p.world) p.world = { until: {}, news: [] };
  if (typeof p.month !== "number") p.month = 12;
  if (!p.ledger) p.ledger = [];
  if (typeof p.txCount !== "number") p.txCount = p.ledger.length;
  if (!p.fin) p.fin = [];
  if (!p.loans) p.loans = [];
  if (typeof p.credit !== "number") p.credit = 50;
  if (!p.subs) p.subs = [];
  if (!p.skills) p.skills = {};
  if (!p.vehicles) p.vehicles = [];
  if (!p.conditions) p.conditions = [];
  if (!p.insurance) p.insurance = { plan: "none" };
  if (!p.rel) p.rel = { profile: null, deck: [], partners: [], swipesLeft: 12, chatsLeft: 10 };
  if (p.social === undefined) p.social = null;
  if (!p.businesses) p.businesses = [];
  if (!p.market) p.market = { ngx: 100, fund: 100, crypto: 100, penny: 100, cfund: 100, reit: 100, bond: 100, regime: "normal", regimeLeft: 12, feed: [], pending: [], tbill: 0.15, savings: 0.08 };
  if (!p.bets) p.bets = { staked: 0, won: 0, count: 0, slotsLeft: 8, compulsion: 0 };
  if (!p.crime) p.crime = { record: [], heat: 0, skill: 10, violence: 0, cases: [] };
  if (p.will === undefined) p.will = null;
  for (const h of p.holdings) {
    if ((h.kind === "stocks" || h.kind === "crypto" || h.kind === "fund") && h.units === undefined) {
      const price = h.kind === "stocks" ? p.market.ngx : h.kind === "crypto" ? p.market.crypto : p.market.fund;
      h.units = h.value / price;
    }
    if (h.since === undefined) h.since = p.age * 12;
  }
  if (typeof p.stats.fitness !== "number") p.stats.fitness = 45;
  if (!p.possessions) p.possessions = { phone: p.age >= 16, smartphone: p.age >= 16, laptop: p.edu === "tertiary" };
  if (!p.housing) p.housing = p.houses.some((h) => h.state === p.state && h.use === "owner") ? { type: "owned", stateId: p.state, annualRent: 0, paidUntil: 0, arrears: 0, landlord: "" } : p.age < 24 || p.family.state === p.state ? familyHousing(p.state) : { type: "rented", stateId: p.state, annualRent: Math.round(HOME_TIERS[1].rent * stateOf(p).cost * Math.pow(p.index, 0.95)), paidUntil: p.age * 12 + 12, arrears: 0, landlord: "selfcon" };
  if (!p.npcs || !p.fam) {
    const arch: FamilyArchetype = p.classAtBirth === "rich" ? (chance(0.5) ? "nepo" : "upperMiddle") : p.classAtBirth === "middle" ? "middle" : chance(0.5) ? "lapo" : "struggling";
    const gen = generateFamily({ st: STATE_BY_ID[p.birthState] ?? stateOf(p), tribe: p.tribe, religion: p.religion, playerLook: p.look, surname: p.surname, forceArchetype: arch });
    p.fam = gen.fam;
    p.npcs = Object.fromEntries(gen.npcs.map((n) => [n.id, n]));
    if (!p.family.parentsAlive) for (const n of Object.values(p.npcs)) if (n.role === "dad" || n.role === "mom") n.alive = false;
    p.fam.expectContribution = p.fam.expectContribution && p.age < 40;
    for (let i = 0; i < 2; i++) addFriend(p);
    syncLegacyFamily(p);
  }
}

// ---------------------------------------------------------------------------
// School type is decided by what the family can afford.
// ---------------------------------------------------------------------------
export function assignSchoolType(p: Player) {
  const a = p.fam.archetype;
  const r = Math.random();
  let t: "public" | "private" | "elite" = "public";
  if (a === "nepo") t = r < 0.55 ? "elite" : "private";
  else if (a === "strictRich" || a === "newlyRich") t = r < 0.2 ? "elite" : "private";
  else if (a === "upperMiddle") t = r < 0.1 ? "elite" : r < 0.85 ? "private" : "public";
  else if (a === "middle" || a === "fallenRich") t = r < 0.5 ? "private" : "public";
  else if (a === "struggling") t = r < 0.12 ? "private" : "public";
  else t = "public";
  p.flags.schoolType = t;
}

// ---------------------------------------------------------------------------
// Yearly family and world changes
// ---------------------------------------------------------------------------
function rescaleFamily(p: Player, f: number) {
  p.fam.income = Math.round(p.fam.income * f);
  for (const id of p.fam.providers) if (p.npcs[id]) p.npcs[id].income = Math.round(p.npcs[id].income * f);
}

function deathHazard(age: number): number {
  return clamp(Math.pow(age / 96, 7.5) + (age > 70 ? 0.01 : 0), 0, 0.9);
}

export function yearlyWorld(p: Player, lines: string[], pending: Pending[]) {
  const month = () => randInt(1, 12);
  // 1. Family fortunes
  const trendFactor = p.fam.trend === "rising" ? 1.06 : p.fam.trend === "falling" ? 0.9 : 1.0;
  rescaleFamily(p, trendFactor);
  if (chance(0.035)) {
    const up = chance(0.5);
    p.fam.trend = up ? "rising" : "falling";
    if (up && p.fam.income < 30e6) { rescaleFamily(p, 1.5); lines.push(T("Your family's fortunes improved. A good business year.", "Your family money don improve. Business do well this year.")); p.fam.tags = p.fam.tags.filter((t) => !FAMILY_DEBT_TAGS.includes(t)); }
    else if (!up) { rescaleFamily(p, 0.65); p.fam.debts += Math.round(p.fam.income * 0.4); lines.push(T("Money problems hit your family. A business deal went badly and debts piled up.", "Money wahala catch your family. One business deal spoil and debts pile up.")); }
  }
  p.fam.income = clamp(p.fam.income, 300_000, 3e9);

  // 2. NPC upkeep and deaths
  for (const n of Object.values(p.npcs)) {
    n.asks = Math.max(0, n.asks - (chance(0.5) ? 1 : 0));
    n.gaveThisYear = 0;
    if (n.savings < n.income * 0.2) n.savings += n.income * 0.15;
    if (!n.alive) continue;
    const age = npcAge(p, n);
    if (["dad", "mom", "guardian", "grandparent", "uncle", "aunt"].includes(n.role) && chance(deathHazard(age))) {
      n.alive = false;
      if (n.role === "grandparent" || n.role === "uncle" || n.role === "aunt") {
        lines.push(T(`${n.name} has passed away.`, `${n.name} don die.`));
        p.stats.happiness = clamp(p.stats.happiness - 8);
        pending.push({ kind: "event", id: "funeral", data: { who: n.name, month: month(), role: n.role } });
      } else {
        lines.push(T(`Your ${n.role === "dad" ? "father" : n.role === "mom" ? "mother" : "guardian"}, ${n.name.split(" ")[0]}, has died.`, `Your ${n.role === "dad" ? "papa" : n.role === "mom" ? "mama" : "guardian"}, ${n.name.split(" ")[0]}, don die.`));
        p.stats.happiness = clamp(p.stats.happiness - 15);
        pending.push({ kind: "event", id: "funeral", data: { who: n.name, month: month(), role: n.role } });
        p.fam.providers = p.fam.providers.filter((id) => id !== n.id);
        p.fam.income = Math.round(p.fam.income * 0.6);
        if (p.fam.providers.length === 0 && p.age < 18) {
          const relative = Object.values(p.npcs).find((x) => x.alive && ["uncle", "aunt", "grandparent", "dad", "mom"].includes(x.role));
          if (relative) {
            relative.role = relative.role === "dad" || relative.role === "mom" ? relative.role : "guardian";
            p.fam.providers = [relative.id];
            lines.push(T(`${relative.name} took you in.`, `${relative.name} take you in.`));
          }
        }
      }
    }
    // Friends drift apart if you neglect them.
    if (n.role === "friend") {
      n.closeness = clamp(n.closeness - randInt(0, 4));
      if (n.closeness < 8 && chance(0.4)) {
        lines.push(T(`You and ${n.name.split(" ")[0]} lost touch.`, `You and ${n.name.split(" ")[0]} don lose touch.`));
        delete p.npcs[n.id];
      }
    }
  }
  syncLegacyFamily(p);

  // 3. New friends over a lifetime
  if ([6, 11, 16, 21, 26, 33].includes(p.age)) {
    const f = addFriend(p, p.age < 18 ? randInt(-1, 1) : randInt(-3, 4));
    lines.push(T(`You made a new friend: ${f.name.split(" ")[0]}.`, `You get new padi: ${f.name.split(" ")[0]}.`));
    if (chance(0.4)) addFriend(p, randInt(-2, 2));
  }

  // 3b. The extended family grows
  if ([9, 15, 20, 26, 32].includes(p.age) && Object.values(p.npcs).filter((n) => n.role === "cousin").length < 4) addCousin(p);

  // 4. Phones and laptops are earned through family support, not handed out automatically
  const provider = primaryProvider(p);
  if (provider && p.age >= 10 && !p.possessions.phone && p.fam.income > 1_800_000 && chance(0.4 + provider.generosity / 250)) {
    p.possessions.phone = true;
    transact(p, { amount: 0, memo: true, reason: T(`${provider.name.split(" ")[0]} bought you a basic phone`, `${provider.name.split(" ")[0]} buy basic phone for you`), category: "gift" });
    lines.push(T("Your parents got you a basic phone.", "Your parents buy basic phone for you."));
  }
  if (provider && p.age >= 13 && p.age <= 22 && p.possessions.phone && !p.possessions.smartphone && p.fam.income > 5e6 && capacityOf(p, provider) > 180_000 * p.index && chance(0.25 + provider.generosity / 300)) {
    p.possessions.smartphone = true;
    transact(p, { amount: 0, memo: true, reason: T(`${provider.name.split(" ")[0]} bought you a smartphone`, `${provider.name.split(" ")[0]} buy smartphone for you`), category: "gift" });
    lines.push(T("You received a smartphone from your family.", "Your family give you smartphone."));
  }
  if (provider && p.age >= 16 && p.age <= 24 && p.school?.stage === "tertiary" && !p.possessions.laptop && capacityOf(p, provider) > 450_000 * p.index && chance(0.3 + provider.generosity / 300 - provider.strictness / 400)) {
    p.possessions.laptop = true;
    transact(p, { amount: 0, memo: true, reason: T(`${provider.name.split(" ")[0]} bought you a laptop for school`, `${provider.name.split(" ")[0]} buy laptop for you for school`), category: "gift" });
    lines.push(T("Your parents bought you a laptop for university.", "Your parents buy laptop for you for university."));
  }

  // 5. Unprompted money from family
  if (provider && p.age >= 7 && p.age <= 30 && !p.fam.cutOff.includes("allowance")) {
    if (chance(0.1 + provider.generosity / 400)) {
      const amt = Math.round(Math.min(capacityOf(p, provider) * 0.08, 60_000 * p.index * (p.age < 14 ? 0.4 : 1)));
      if (amt > 500 * p.index) {
        p.month = month();
        transact(p, { amount: amt, reason: T(`${provider.name.split(" ")[0]} sent you ${naira(amt)} ${p.age < 18 ? "for the week" : "for food"}`, `${provider.name.split(" ")[0]} send ${naira(amt)} give you ${p.age < 18 ? "for the week" : "for chop"}`), category: "gift" });
        provider.gaveThisYear += amt / p.index;
        lines.push(T(`${provider.name.split(" ")[0]} sent you ${naira(amt)}.`, `${provider.name.split(" ")[0]} send ${naira(amt)} give you.`));
      }
    }
    if (p.housing.type === "rented" && p.age <= 28 && !p.fam.cutOff.includes("rent") && p.fam.income > 12e6 && chance(0.15 + provider.generosity / 400 - provider.strictness / 500)) {
      const amt = Math.min(p.housing.annualRent * 0.7, capacityOf(p, provider) * 0.5);
      if (amt > 50_000 * p.index) {
        p.month = month();
        transact(p, { amount: amt, reason: T(`${provider.name.split(" ")[0]} transferred ${naira(amt)} to help with your accommodation`, `${provider.name.split(" ")[0]} transfer ${naira(amt)} to help your accommodation`), category: "gift" });
        provider.gaveThisYear += amt / p.index;
        lines.push(T(`${provider.name.split(" ")[0]} transferred ${naira(amt)} to help with your accommodation.`, `${provider.name.split(" ")[0]} transfer ${naira(amt)} to help your accommodation.`));
      }
    }
  }

  // 6. Parents decide you are old enough to manage on your own
  if (!p.fam.cutOff.includes("allowance") && allowanceMonthly(p) > 0 && p.age >= allowanceCutoffAge(p) && (p.job || !p.school)) {
    p.fam.cutOff.push("allowance", "rent");
    lines.push(
      provider && provider.strictness > 60
        ? T("Your parents have stopped sending you pocket money. \"You are old enough to manage your own finances.\"", "Your parents don stop to send you pocket money. \"You don big reach to manage your own money.\"")
        : T("Your family has decided to stop the regular pocket money now that you are grown.", "Your family don decide to stop the regular pocket money since you don grow."),
    );
    if (provider) remember(p, provider, T("Told you it was time to be financially independent.", "Tell you say na time to stand on your own feet with money."), "good");
  }

  // 7. Moving out
  if (p.age >= 22 && p.housing.type === "family" && p.job && !p.flags.movedOutOffered && chance(0.28)) {
    p.flags.movedOutOffered = true;
    pending.push({ kind: "event", id: "move_out", data: { month: month() } });
  }
}

/** When a student's school starts or ends, housing changes. */
export function schoolHousing(p: Player, starting: boolean) {
  if (starting && p.school?.stage === "tertiary" && chance(0.65) && p.age >= 17) {
    const fee = Math.round(HOME_TIERS[0].rent * 1.6 * stateOf(p).cost * Math.pow(p.index, 0.95));
    p.housing = { type: "hostel", stateId: p.state, annualRent: fee, paidUntil: monthIndex(p), arrears: 0, landlord: "room" };
  } else if (!starting && p.housing.type === "hostel") {
    p.housing = familyHousing(p.family.state);
  }
}

export function rentPlace(p: Player, tierId: string): string {
  const tier = HOME_TIERS.find((t) => t.id === tierId);
  if (!tier) return "";
  const annual = Math.round(tier.rent * stateOf(p).cost * Math.pow(p.index, 0.95));
  const deposit = annual + Math.round(annual * 0.1);
  if (p.money < deposit) return T(`You need ${naira(deposit)} (a year's rent plus agent fee).`, `You need ${naira(deposit)} (one year rent plus agent fee).`);
  transact(p, { amount: -annual, reason: T(`Rent for a ${tier.label.toLowerCase()} in ${stateOf(p).name}`, `Rent for ${tier.label.toLowerCase()} for ${stateOf(p).name}`), category: "rent" });
  transact(p, { amount: -Math.round(annual * 0.1), reason: T("Agent and legal fees", "Agent and legal fees"), category: "rent" });
  p.housing = { type: "rented", stateId: p.state, annualRent: annual, paidUntil: monthIndex(p) + 12, arrears: 0, landlord: tier.id };
  return T(`You moved into a ${tier.label.toLowerCase()}. Rent is ${naira(annual)} a year.`, `You move enter ${tier.label.toLowerCase()}. Rent na ${naira(annual)} for one year.`);
}

export function moveHomeToFamily(p: Player): string {
  p.housing = familyHousing(p.family.state);
  if (p.state !== p.family.state) p.state = p.family.state;
  return T("You moved back in with your family.", "You move go back live with your family.");
}

export function siblingsOf(p: Player): Npc[] {
  return npcsByRole(p, "sibling");
}
