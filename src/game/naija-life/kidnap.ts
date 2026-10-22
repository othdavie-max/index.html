import { STATE_BY_ID } from "./data";
import type { KidnapState, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";

const CAPTORS = [
  "armed men in military camo stopped your vehicle",
  "gunmen blocked the expressway and dragged you into the bush",
  "men on motorbikes ambushed you near a petrol station",
  "a fake police checkpoint turned out to be a gang",
  "armed men broke into your compound at night",
  "bandits swarmed the bus you were travelling in",
];
const PHONE_LINES = [
  "\"Una think this one na joke? Bring the money.\"",
  "\"Oga, we no dey play. Every day wey you delay, e go cost you more.\"",
  "\"Your person dey hungry o. Make you hurry.\"",
  "\"Na everybody dey feel the pain. Pay and we go release am.\"",
];

export function netWorth(p: Player): number {
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const hold = p.holdings.reduce((s, h) => s + h.value, 0);
  return p.money + houses + hold - p.debt;
}

export function kidnapRisk(p: Player): number {
  if (p.age < 8 || p.prison > 0) return 0;
  const st = STATE_BY_ID[p.state];
  let r = 0.0006 + st.risk * 0.0006;
  const worth = netWorth(p) / p.index;
  if (worth > 200_000_000) r *= 2.2;
  else if (worth > 20_000_000) r *= 1.6;
  else if (worth > 2_000_000) r *= 1.2;
  if (p.traveled) r *= 2.2;
  if (p.flags.own_bodyguards) r *= 0.55;
  if (p.flags.own_convoy) r *= 0.6;
  if (p.flags.own_jet) r *= 0.4;
  if (p.job?.id === "kidnapper") r = 0;
  // A sitting president is hard to get, but not impossible: those become legends.
  if (p.politics && p.politics.office === 5) r = Math.min(r * 0.15, 0.004);
  if (st.abroad) r *= 0.1;
  return r;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function makeKidnap(p: Player): KidnapState {
  const captors = pick(CAPTORS);
  const worth = Math.max(0, netWorth(p));
  const base = clamp(worth * 0.3, 2_000_000 * p.index, 900_000_000 * p.index);
  const demand = Math.round(base * rand(0.7, 1.4));
  const floor = Math.round(demand * rand(0.35, 0.7));
  const familyShare = p.classAtBirth === "rich" ? 0.18 : p.classAtBirth === "middle" ? 0.07 : 0.02;
  const poolBase = Math.round(demand * (familyShare + (p.stats.connections / 100) * 0.08) * rand(0.7, 1.3));
  return {
    demand,
    floor,
    patience: 3,
    round: 0,
    pool: poolBase,
    poolBase,
    borrowed: 0,
    savingsPut: 0,
    sold: 0,
    usedSavings: false,
    fundraised: false,
    borrowedOnce: false,
    stage: "raise",
    history: [`${cap(captors)}. The call to your family came the next morning: ${pick(PHONE_LINES)} They want ${naira(demand)}.`, `Your family and church scraped together ${naira(poolBase)} so far.`],
    captors,
  };
}

export type KidnapAction =
  | { type: "savings" }
  | { type: "sell"; houseId: string }
  | { type: "borrow" }
  | { type: "fundraise" }
  | { type: "start" }
  | { type: "offer"; pct: number }
  | { type: "police" }
  | { type: "payfull" };

function endVictim(p: Player, k: KidnapState, outcome: NonNullable<KidnapState["outcome"]>, paid: number) {
  k.stage = "over";
  k.outcome = outcome;
  p.kidnaps += 1;
  const weeks = randInt(1, 14);
  if (outcome === "dead") {
    p.alive = false;
    p.cause = "Killed by kidnappers";
    k.summary = `You never came home. Your family mourned a long time. ${paid > 0 ? `They had paid ${naira(paid)}, but it was not enough.` : ""}`;
  } else {
    const leftover = Math.max(0, k.pool - paid);
    p.money += leftover;
    p.stats.stress = clamp(p.stats.stress + 30);
    p.stats.happiness = clamp(p.stats.happiness - 15);
    p.stats.health = clamp(p.stats.health - (outcome === "freed" ? 10 : 6));
    p.stats.reputation = clamp(p.stats.reputation + 3);
    const labels = { freed: `Ransom of ${naira(paid)} was paid. After ${weeks} weeks in the bush, you were dropped by the roadside.`, rescued: `Soldiers stormed the camp after ${weeks} weeks and rescued you. Nobody paid a kobo.`, escaped: `After ${weeks} weeks you found a gap, ran through the night and flagged down a farmer.` } as const;
    k.summary = labels[outcome];
    if (!p.achievements.includes("Survived kidnapping")) p.achievements.push("Survived kidnapping");
  }
}

/** Pure-ish: mutates the passed clone of the player and kidnap state. */
export function kidnapStep(p: Player, k: KidnapState, a: KidnapAction): void {
  if (k.stage === "over") return;
  switch (a.type) {
    case "savings": {
      if (k.usedSavings || p.money <= 0) return;
      k.usedSavings = true;
      k.savingsPut = p.money;
      k.pool += p.money;
      p.money = 0;
      k.history.push(`Your family emptied your accounts: ${naira(k.savingsPut)}.`);
      return;
    }
    case "sell": {
      const i = p.houses.findIndex((h) => h.id === a.houseId);
      if (i < 0) return;
      const h = p.houses[i];
      const got = Math.round(h.value * 0.65);
      p.houses.splice(i, 1);
      k.sold += got;
      k.pool += got;
      k.history.push(`A ${h.kind} in ${STATE_BY_ID[h.state].name} was sold in a hurry for ${naira(got)} (distress sale).`);
      return;
    }
    case "borrow": {
      if (k.borrowedOnce) return;
      k.borrowedOnce = true;
      const amt = Math.round(k.demand * rand(0.15, 0.4));
      k.borrowed += amt;
      k.pool += amt;
      p.debt += Math.round(amt * 1.25);
      k.history.push(`Your people borrowed ${naira(amt)} from friends, cooperative and loan apps. Interest will bite.`);
      return;
    }
    case "fundraise": {
      if (k.fundraised) return;
      k.fundraised = true;
      const amt = Math.round(k.demand * rand(0.03, 0.12) * (0.6 + p.stats.reputation / 100));
      k.pool += amt;
      k.history.push(`Church and community fundraiser ("Save ${p.name}") brought in ${naira(amt)}.`);
      return;
    }
    case "start": {
      k.stage = "negotiate";
      k.history.push(`The negotiation begins. They want ${naira(k.demand)}. You have ${naira(k.pool)} ready.`);
      return;
    }
    case "police": {
      if (chance(0.4)) {
        k.history.push("The police and soldiers traced the phone and hit the camp at dawn.");
        endVictim(p, k, "rescued", 0);
      } else {
        k.patience -= 2;
        k.history.push("The kidnappers noticed the police. \"You called them? Now the price go change.\"");
        k.demand = Math.round(k.demand * 1.15);
        checkOver(p, k);
      }
      return;
    }
    case "payfull": {
      if (k.pool < k.demand) return;
      payRansom(p, k, k.demand);
      return;
    }
    case "offer": {
      const amt = Math.round(k.demand * a.pct);
      if (amt > k.pool) return;
      k.round += 1;
      if (amt >= k.floor) {
        k.history.push(`You offered ${naira(amt)}. "Fine. Bring am."`);
        payRansom(p, k, amt);
        return;
      }
      const ratio = amt / k.floor;
      if (ratio >= 0.6) {
        k.demand = Math.round(Math.max(k.floor * 1.05, k.demand * 0.85));
        k.history.push(`You offered ${naira(amt)}. "Add small. Last price: ${naira(k.demand)}."`);
      } else {
        k.patience -= 1;
        k.demand = Math.round(k.demand * 1.06);
        k.history.push(`You offered ${naira(amt)}. They shouted, slapped the phone and raised the price to ${naira(k.demand)}. Their patience is running out.`);
      }
      checkOver(p, k);
      return;
    }
  }
}

function payRansom(p: Player, k: KidnapState, amount: number) {
  k.history.push(`${naira(amount)} was dropped at a bush path at night.`);
  if (chance(0.8)) endVictim(p, k, "freed", amount);
  else endVictim(p, k, "dead", amount);
}

function checkOver(p: Player, k: KidnapState) {
  if (k.stage === "over") return;
  if (k.patience <= 0 || k.round >= 7) {
    k.history.push("The line went dead. For days, nobody heard anything...");
    if (chance(0.5)) endVictim(p, k, "dead", 0);
    else endVictim(p, k, chance(0.5) ? "rescued" : "escaped", 0);
  }
}

export function kidnapShareText(p: Player, k: KidnapState): string {
  const where = STATE_BY_ID[p.state].name;
  const base = `🇳🇬 Naija Life: I was kidnapped in ${where} at age ${p.age}. They demanded ${naira(k.demand)}.`;
  switch (k.outcome) {
    case "freed": return `${base} My family paid and I came home alive. Wahala be like bicycle! 😮‍💨`;
    case "rescued": return `${base} Soldiers rescued me with no ransom! 🙏`;
    case "escaped": return `${base} I escaped through the bush at night. 🏃‍♂️`;
    default: return `${base} I did not survive. RIP. 🕯️`;
  }
}
