import { kidnapMultiplier } from "./news";
import { STATE_BY_ID } from "./data";
import { bizValue } from "./business";
import { receivables, totalDebt } from "./loans";
import type { KidnapState, Player } from "./types";
import { luckBonus } from "./helpers";
import { T, chance, clamp, naira, pick, rand, randInt, rng } from "./util";

const CAPTORS: readonly (readonly [string, string])[] = [
  ["armed men in military camo stopped your vehicle", "armed men wey wear military camo stop your vehicle"],
  ["gunmen blocked the expressway and dragged you into the bush", "gunmen block the expressway and drag you enter bush"],
  ["men on motorbikes ambushed you near a petrol station", "men on motorbike ambush you near petrol station"],
  ["a fake police checkpoint turned out to be a gang", "fake police checkpoint turn out to be gang"],
  ["armed men broke into your compound at night", "armed men break enter your compound for night"],
  ["bandits swarmed the bus you were travelling in", "bandits surround the bus wey you dey travel inside"],
];
const PHONE_LINES: readonly (readonly [string, string])[] = [
  ["\"Do you think this is a joke? Bring the money.\"", "\"Una think this one na joke? Bring the money.\""],
  ["\"Oga, we are not playing. Every day you delay will cost you more.\"", "\"Oga, we no dey play. Every day wey you delay, e go cost you more.\""],
  ["\"Your person is hungry. Hurry up.\"", "\"Your person dey hungry o. Make you hurry.\""],
  ["\"Everybody is feeling the pain. Pay and we will release him.\"", "\"Na everybody dey feel the pain. Pay and we go release am.\""],
];

export function netWorth(p: Player): number {
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const hold = p.holdings.reduce((s, h) => s + h.value, 0);
  const cars = (p.vehicles ?? []).reduce((s, v) => s + v.value, 0);
  return p.money + houses + hold + cars + bizValue(p) + receivables(p) - totalDebt(p);
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
  r *= kidnapMultiplier(p);
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
  const captorPair = pick(CAPTORS);
  const captors = T(captorPair[0], captorPair[1]);
  const worth = Math.max(0, netWorth(p));
  const base = clamp(worth * 0.3, 2_000_000 * p.index, 900_000_000 * p.index);
  const demand = Math.round(base * rand(0.7, 1.4));
  const floor = Math.round(demand * rand(0.35, 0.7));
  const familyShare = p.classAtBirth === "rich" ? 0.18 : p.classAtBirth === "middle" ? 0.07 : 0.02;
  const poolBase = Math.round(demand * (familyShare + (p.stats.connections / 100) * 0.08) * rand(0.7, 1.3));
  const phoneLine = pick(PHONE_LINES);
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
    history: [
      T(`${cap(captors)}. The call to your family came the next morning: ${phoneLine[0]} They want ${naira(demand)}.`, `${cap(captors)}. Dem call your family the next morning: ${phoneLine[1]} Dem want ${naira(demand)}.`),
      T(`Your family and church scraped together ${naira(poolBase)} so far.`, `Your family and church don gather ${naira(poolBase)} so far.`),
    ],
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
  | { type: "payfull" }
  | { type: "escapeStart" }
  | { type: "escapeAct"; move: EscapeMove }
  | { type: "escapeStop" };

export type EscapeMove = "befriend" | "allies" | "scout" | "fakeSick" | "run";

function endVictim(p: Player, k: KidnapState, outcome: NonNullable<KidnapState["outcome"]>, paid: number) {
  k.stage = "over";
  k.outcome = outcome;
  p.kidnaps += 1;
  p.flags.kidAge = p.age;
  if (outcome === "escaped") p.flags.kidEscaped = p.age;
  const weeks = randInt(1, 14);
  if (outcome === "dead") {
    p.alive = false;
    p.cause = T("Killed by kidnappers", "Kidnappers kill am");
    k.summary = T(
      `You never came home. Your family mourned a long time. ${paid > 0 ? `They had paid ${naira(paid)}, but it was not enough.` : ""}`,
      `You no come house again. Your family mourn you for long time. ${paid > 0 ? `Dem don pay ${naira(paid)}, but e no reach.` : ""}`,
    );
  } else {
    const leftover = Math.max(0, k.pool - paid);
    p.money += leftover;
    p.stats.stress = clamp(p.stats.stress + 30);
    p.stats.happiness = clamp(p.stats.happiness - 15);
    p.stats.health = clamp(p.stats.health - (outcome === "freed" ? 10 : 6));
    p.stats.reputation = clamp(p.stats.reputation + 3);
    const labels = {
      freed: T(`Ransom of ${naira(paid)} was paid. After ${weeks} weeks in the bush, you were dropped by the roadside.`, `Dem pay ransom of ${naira(paid)}. After ${weeks} weeks for bush, dem drop you for roadside.`),
      rescued: T(`Soldiers stormed the camp after ${weeks} weeks and rescued you. Nobody paid a kobo.`, `After ${weeks} weeks, soldiers storm the camp and rescue you. Nobody pay one kobo.`),
      escaped: T(`After ${weeks} weeks you found a gap, ran through the night and flagged down a farmer.`, `After ${weeks} weeks you see gap, run through the night and stop one farmer for road.`),
    } as const;
    k.summary = labels[outcome];
    if (!p.achievements.includes("Survived kidnapping")) p.achievements.push("Survived kidnapping");
  }
}

/** Pure-ish: mutates the passed clone of the player and kidnap state. */
const CAPTIVE_NAMES = ["Chinedu", "Hauwa", "Bolaji", "Emeka", "Zainab", "Sunday", "Ngozi", "Ibrahim", "Titi", "Femi"];

function escapeMove(p: Player, k: KidnapState, move: EscapeMove) {
  const e = k.escape;
  if (!e) return;
  const roll = (n: number) => chance(clamp(n, 0.05, 0.92));
  switch (move) {
    case "befriend": {
      if (roll(0.55 + p.stats.reputation / 400 + luckBonus(p))) {
        e.guardTrust = clamp(e.guardTrust + randInt(15, 28));
        e.noise = clamp(e.noise + 4);
        e.note = T("One of the younger guards starts chatting with you about football and his village. He lowers his guard a little.", "One young guard start to yarn with you about football and him village. E relax small.");
      } else {
        e.noise = clamp(e.noise + 16);
        e.note = T("The guard turns cold. 'Why you dey ask me questions?' He watches you closely now.", "The guard turn cold. 'Why you dey ask me question?' E dey watch you well now.");
      }
      return;
    }
    case "allies": {
      const cand = e.captives.filter((c) => c.brave >= 0).length;
      if (e.allies >= cand) { e.note = T("Everyone who dares is already with you.", "Everybody wey get mind don join you."); return; }
      if (roll(0.5 + p.stats.connections / 300)) {
        e.allies += 1;
        e.noise = clamp(e.noise + 7);
        const c = e.captives[e.allies - 1];
        e.note = T(`${c?.name ?? "A fellow captive"} whispers: 'If you run, I am coming with you.'`, `${c?.name ?? "One fellow captive"} whisper: 'If you run, I dey follow you.'`);
      } else {
        e.noise = clamp(e.noise + 14);
        e.note = T("A captive panics and shouts for the guards. You pretend it was a nightmare.", "One captive panic and shout for guards. You pretend say na bad dream.");
      }
      return;
    }
    case "scout": {
      e.insight += 1;
      e.noise = clamp(e.noise + 3);
      e.note = e.insight === 1 ? T("You learn that the night guard sleeps near the fire, and the back fence is only wire.", "You learn say night guard dey sleep near fire, and the back fence na only wire.") : T("You count the guards and memorise the path to the stream. You are almost ready.", "You count the guards and memorise the way to the stream. You nearly ready.");
      return;
    }
    case "fakeSick": {
      e.guardTrust = clamp(e.guardTrust + 8);
      p.stats.health = clamp(p.stats.health - 3);
      if (chance(0.4)) { e.insight += 1; e.note = T("They untie you to give water. You see where the keys hang.", "Dem untie you give water. You see where dem dey hang the keys."); }
      else e.note = T("They grumble but give you water and a blanket. They do not suspect a thing.", "Dem complain but dem give you water and blanket. Dem no suspect anything.");
      return;
    }
    case "run": {
      e.attempts += 1;
      const pr = clamp(0.08 + e.insight * 0.17 + e.guardTrust / 260 + e.allies * 0.09 + p.stats.fitness / 330 - e.noise / 220 + luckBonus(p), 0.03, 0.88);
      if (chance(pr)) {
        const buddies = e.allies > 0 ? T(` ${e.allies} fellow captive${e.allies > 1 ? "s" : ""} run with you.`, ` ${e.allies} fellow captive${e.allies > 1 ? "s" : ""} run with you.`) : "";
        k.history.push(T(`You slip away in the dark and run until your lungs burn.${buddies}`, `You slip comot for dark and run until your chest dey pain you.${buddies}`));
        endVictim(p, k, "escaped", 0);
        return;
      }
      const bad = chance(0.12 + e.noise / 400);
      if (bad && e.noise > 55) {
        k.history.push(T("A guard catches you at the fence. This time he is not gentle.", "Guard catch you for the fence. This time e no gentle at all."));
        endVictim(p, k, "dead", 0);
        return;
      }
      p.stats.health = clamp(p.stats.health - 12);
      k.demand = Math.round(k.demand * 1.15);
      k.patience = Math.max(0, k.patience - 1);
      e.guardTrust = 0;
      e.noise = clamp(e.noise + 25);
      e.allies = Math.max(0, e.allies - 1);
      e.note = T("They drag you back, beat you and chain you tighter. The price goes up.", "Dem drag you come back, beat you and chain you tighter. The price don go up.");
      k.history.push(e.note);
      checkOver(p, k);
      return;
    }
  }
}

export function kidnapStep(p: Player, k: KidnapState, a: KidnapAction): void {
  if (k.stage === "over") return;
  switch (a.type) {
    case "escapeStart": {
      if (k.escape) return;
      const n = randInt(2, 4);
      const names = [...CAPTIVE_NAMES].sort(() => rng() - 0.5).slice(0, n);
      k.escape = { captives: names.map((name) => ({ name, brave: randInt(0, 3) })), guardTrust: 0, noise: 5, insight: 0, allies: 0, attempts: 0, note: T(`You are not alone: ${names.join(", ")} are held here too. If you are going to run, plan it carefully.`, `You no dey alone: ${names.join(", ")} dey here too. If you wan run, plan am well.`) };
      return;
    }
    case "escapeStop": {
      k.escape = undefined;
      return;
    }
    case "escapeAct": {
      escapeMove(p, k, a.move);
      return;
    }
    case "savings": {
      if (k.usedSavings || p.money <= 0) return;
      k.usedSavings = true;
      k.savingsPut = p.money;
      k.pool += p.money;
      p.money = 0;
      k.history.push(T(`Your family emptied your accounts: ${naira(k.savingsPut)}.`, `Your family comot all the money for your accounts: ${naira(k.savingsPut)}.`));
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
      k.history.push(T(`A ${h.kind} in ${STATE_BY_ID[h.state].name} was sold in a hurry for ${naira(got)} (distress sale).`, `Dem sell ${h.kind} for ${STATE_BY_ID[h.state].name} in a hurry for ${naira(got)} (distress sale).`));
      return;
    }
    case "borrow": {
      if (k.borrowedOnce) return;
      k.borrowedOnce = true;
      const amt = Math.round(k.demand * rand(0.15, 0.4));
      k.borrowed += amt;
      k.pool += amt;
      p.debt += Math.round(amt * 1.25);
      k.history.push(T(`Your people borrowed ${naira(amt)} from friends, cooperative and loan apps. Interest will bite.`, `Your people borrow ${naira(amt)} from friends, cooperative and loan apps. Interest go bite well.`));
      return;
    }
    case "fundraise": {
      if (k.fundraised) return;
      k.fundraised = true;
      const amt = Math.round(k.demand * rand(0.03, 0.12) * (0.6 + p.stats.reputation / 100));
      k.pool += amt;
      k.history.push(T(`Church and community fundraiser ("Save ${p.name}") brought in ${naira(amt)}.`, `Church and community fundraiser ("Save ${p.name}") bring in ${naira(amt)}.`));
      return;
    }
    case "start": {
      k.stage = "negotiate";
      k.history.push(T(`The negotiation begins. They want ${naira(k.demand)}. You have ${naira(k.pool)} ready.`, `Negotiation don start. Dem want ${naira(k.demand)}. You get ${naira(k.pool)} ready.`));
      return;
    }
    case "police": {
      if (chance(0.4)) {
        k.history.push(T("The police and soldiers traced the phone and hit the camp at dawn.", "Police and soldiers trace the phone and storm the camp for dawn."));
        endVictim(p, k, "rescued", 0);
      } else {
        k.patience -= 2;
        k.history.push(T("The kidnappers noticed the police. \"You called them? Now the price will change.\"", "The kidnappers notice police. \"You call them? Now the price go change.\""));
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
        k.history.push(T(`You offered ${naira(amt)}. "Fine. Bring it."`, `You offer ${naira(amt)}. "Fine. Bring am."`));
        payRansom(p, k, amt);
        return;
      }
      const ratio = amt / k.floor;
      if (ratio >= 0.6) {
        k.demand = Math.round(Math.max(k.floor * 1.05, k.demand * 0.85));
        k.history.push(T(`You offered ${naira(amt)}. "Add a little. Last price: ${naira(k.demand)}."`, `You offer ${naira(amt)}. "Add small. Last price: ${naira(k.demand)}."`));
      } else {
        k.patience -= 1;
        k.demand = Math.round(k.demand * 1.06);
        k.history.push(T(`You offered ${naira(amt)}. They shouted, slapped the phone and raised the price to ${naira(k.demand)}. Their patience is running out.`, `You offer ${naira(amt)}. Dem shout, slap the phone and raise price to ${naira(k.demand)}. Their patience dey finish.`));
      }
      checkOver(p, k);
      return;
    }
  }
}

function payRansom(p: Player, k: KidnapState, amount: number) {
  k.history.push(T(`${naira(amount)} was dropped at a bush path at night.`, `Dem drop ${naira(amount)} for bush path for night.`));
  if (chance(0.8)) endVictim(p, k, "freed", amount);
  else endVictim(p, k, "dead", amount);
}

function checkOver(p: Player, k: KidnapState) {
  if (k.stage === "over") return;
  if (k.patience <= 0 || k.round >= 7) {
    k.history.push(T("The line went dead. For days, nobody heard anything...", "The line go dead. For days, nobody hear anything..."));
    if (chance(0.5)) endVictim(p, k, "dead", 0);
    else endVictim(p, k, chance(0.5) ? "rescued" : "escaped", 0);
  }
}

export function kidnapShareText(p: Player, k: KidnapState): string {
  const where = STATE_BY_ID[p.state].name;
  const base = T(`🇳🇬 Naija Life: I was kidnapped in ${where} at age ${p.age}. They demanded ${naira(k.demand)}.`, `🇳🇬 Naija Life: Dem kidnap me for ${where} at age ${p.age}. Dem demand ${naira(k.demand)}.`);
  switch (k.outcome) {
    case "freed": return `${base} ${T("My family paid and I came home alive. Trouble comes in many forms! 😮‍💨", "My family pay and I reach house alive. Wahala be like bicycle! 😮‍💨")}`;
    case "rescued": return `${base} ${T("Soldiers rescued me with no ransom! 🙏", "Soldiers rescue me and nobody pay ransom! 🙏")}`;
    case "escaped": return `${base} ${T("I escaped through the bush at night. 🏃‍♂️", "I run comot through bush for night. 🏃‍♂️")}`;
    default: return `${base} ${T("I did not survive. RIP. 🕯️", "I no survive. RIP. 🕯️")}`;
  }
}
