import { OFFICES } from "./data";
import { I, addLoot, bump, enterPrison, moveTo, stateOf } from "./helpers";
import type { EventDef, Nation, Pending, Player, Politics } from "./types";
import { rng, chance, clamp, naira, rand, randInt, T, dual } from "./util";

export const freshNation = (): Nation => ({ economy: 50, security: 50, welfare: 45, approval: 55, heat: 0, projects: [] });

const evt = (id: string, data: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data });

export function newPolitics(): Politics {
  return {
    office: -1, yearsLeft: 0, terms: 0, godfather: false, highest: -1,
    machine: 5, umpire: 0, courts: 0, military: 0, kingmaker: 0, vp: false, vpYears: 0,
    anointed: false, hero: false, militaryRuler: false, defected: false,
  };
}

/** Old saves may lack the newer political fields. */
export function migratePolitics(p: Player) {
  if (p.politics) p.politics = { ...newPolitics(), ...p.politics };
}

export function officeTitle(p: Player): string | null {
  const pol = p.politics;
  if (!pol) return null;
  if (pol.office >= 0) return pol.militaryRuler && pol.office === 5 ? T("Military Head of State", "Military Head of State") : OFFICES[pol.office].title;
  if (pol.vp) return T("Vice President", "Vice President");
  return null;
}
const scaleOf = (p: Player) => (p.politics && p.politics.office >= 0 ? OFFICES[p.politics.office].scale * Math.pow(p.index, 0.9) : 0);
const campaignCost = (p: Player, office: number) => Math.round(OFFICES[office].cost * Math.pow(p.index, 0.9));
const powerCost = (p: Player, base: number) => Math.round(base * Math.pow(p.index, 0.9));

// ---------------------------------------------------------------------------
// Zoning: power rotates between North and South every two terms.
// ---------------------------------------------------------------------------
export function currentZone(p: Player): "North" | "South" {
  const years = Math.max(0, p.birthYear + p.age - new Date().getFullYear());
  return Math.floor(years / 8) % 2 === 0 ? "North" : "South";
}
export function playerZone(p: Player): "North" | "South" {
  const r = stateOf(p).region;
  return r === "North West" || r === "North East" || r === "North Central" ? "North" : "South";
}
const zoningBonus = (p: Player) => (currentZone(p) === playerZone(p) ? 0.08 : -0.07);

function swayFor(p: Player): number {
  const pol = p.politics;
  if (!pol) return 0;
  return 0.2 + p.stats.connections / 250 + p.stats.reputation / 500 + (pol.godfather ? 0.15 : 0) + pol.machine / 400 + pol.umpire / 300 + (pol.anointed ? 0.25 : 0) + (pol.hero ? 0.08 : 0) + zoningBonus(p);
}

export function canJoinPolitics(p: Player): string | null {
  if (p.politics) return T("Already in politics", "You don already dey politics");
  if (p.age < 25) return T("Must be at least 25", "You must reach 25 at least");
  if (p.stats.connections < 15) return T("Need more connections (15+)", "You need more connections (15+)");
  if (p.money < I(p, 2_000_000)) return T(`Need ${naira(I(p, 2_000_000))} for party forms`, `You need ${naira(I(p, 2_000_000))} for party forms`);
  if (p.prison > 0) return T("You are in prison", "You dey prison");
  return null;
}

export function joinPolitics(p: Player): string {
  p.money -= I(p, 2_000_000);
  p.politics = newPolitics();
  return T("You buy the party forms and join politics. The ward chairman shakes your hand with both of his. The real struggle has begun!", "You buy the party forms and join politics. The ward chairman use two hand shake you. Wahala don start!");
}

export function nextTarget(p: Player): number | null {
  if (!p.politics) return null;
  const t = p.politics.highest + 1;
  if (t >= OFFICES.length) return null;
  return t;
}

export function canContest(p: Player): string | null {
  const pol = p.politics;
  if (!pol) return T("Join politics first", "Join politics first");
  if (pol.militaryRuler && pol.office >= 0) return T("You rule by decree. There are no elections", "You dey rule by decree. No election dey");
  const t = nextTarget(p);
  if (t === null) return T("You have reached the top", "You don reach the top");
  if (pol.office >= 0 && pol.yearsLeft > 1) return T("Wait for election year", "Wait for election year");
  const need = OFFICES[t].minConnections - (pol.anointed ? 25 : 0);
  if (p.stats.connections < need) return T(`Need ${need}+ connections`, `You need ${need}+ connections`);
  if (p.age < (t === 5 ? 35 : 25)) return T("You are too young for this one", "You still too small for this one");
  if (p.prison > 0) return T("In prison", "You dey prison");
  return null;
}

export function contestPending(p: Player): Pending | null {
  const t = nextTarget(p);
  if (t === null) return null;
  return t >= 4 ? evt("primary", { target: t }) : evt("contest", { target: t });
}

// ---------------------------------------------------------------------------
// Power bases: how people really get to the Villa
// ---------------------------------------------------------------------------
export interface PowerMove {
  id: string;
  label: string;
  desc: string;
  base: number;
  block?: (p: Player) => string | null;
}

export const POWER_MOVES: PowerMove[] = [
  { id: "machine", label: "Build the party machine", desc: "Ward by ward, local government by local government. Party structure na everything.", base: 80_000_000 },
  { id: "kingmaker", label: "Bankroll loyalists in other states", desc: "Sponsor your boys to win elsewhere. Today their governor, tomorrow your votes.", base: 400_000_000, block: (p) => ((p.politics?.highest ?? -1) < 2 ? "Need to have held national office (Rep or above)" : null) },
  { id: "umpire", label: "Capture the electoral umpire (INEC)", desc: "Friendly officials, smooth logistics, 'technical hitches' in the other camp's areas.", base: 600_000_000 },
  { id: "courts", label: "Court the judiciary", desc: "Judges, registrars and senior lawyers. Tribunals favour a good friend.", base: 500_000_000 },
  { id: "military", label: "Win over the security chiefs", desc: "Generals dey chop too. They decide how the barracks see you.", base: 450_000_000 },
];

export function powerMoveBlock(p: Player, id: string): string | null {
  const m = POWER_MOVES.find((x) => x.id === id);
  if (!m) return T("Unknown", "Unknown");
  if (!p.politics) return T("Join politics first", "Join politics first");
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (m.block) {
    const b = m.block(p);
    if (b) return b;
  }
  if (p.money < powerCost(p, m.base)) return T(`Need ${naira(powerCost(p, m.base))}`, `You need ${naira(powerCost(p, m.base))}`);
  return null;
}
export const powerMoveCost = (p: Player, id: string) => powerCost(p, POWER_MOVES.find((x) => x.id === id)?.base ?? 0);

export function runPowerMove(p: Player, id: string): string {
  const pol = p.politics;
  const m = POWER_MOVES.find((x) => x.id === id);
  if (!pol || !m) return "";
  p.money -= powerCost(p, m.base);
  const up = (k: "machine" | "umpire" | "courts" | "military", n: number) => { pol[k] = clamp(pol[k] + n); };
  switch (id) {
    case "machine": up("machine", 10); bump(p, "connections", 2); return T("Your party structure is growing. Ward chairmen now call you 'Oga'.", "Your party structure dey grow. Ward chairmen don dey call you 'Oga' now.");
    case "kingmaker": up("machine", 6); pol.kingmaker += 1; bump(p, "connections", 4); return T("Your boys win elections in other states. People now say: 'Nothing happens here without his blessing.'", "Your boys win election for other states. Now people dey talk say: 'Nothing dey happen here without his blessing.'");
    case "umpire":
      up("umpire", 12);
      p.nation.heat = clamp(p.nation.heat + 8);
      if (chance(0.12)) { up("umpire", -10); bump(p, "reputation", -12); return T("Somebody leaks your arrangement with the electoral officials. Big scandal. You lose some ground.", "Somebody leak your arrangement with the electoral officials. Big scandal. You don lose some ground."); }
      return T("Some friendly officials move into the right offices. The umpire is starting to 'understand' you better.", "Some friendly officials enter the right offices. The umpire don start to 'understand' you well well.");
    case "courts": up("courts", 12); p.nation.heat = clamp(p.nation.heat + 5); return T("Your lawyers walk into judges' chambers like it is their own home.", "Your lawyers dey enter judges' chambers like say na their own house.");
    case "military": up("military", 12); return T("The service chiefs already greet you as 'Your Excellency' before you even win.", "The service chiefs don dey greet you 'Your Excellency' even before you win.");
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Coup route (soldier)
// ---------------------------------------------------------------------------
export function canPlotCoup(p: Player): string | null {
  if (p.job?.id !== "soldier") return T("Only a serving soldier can plot a coup", "Only serving soldier fit plot coup");
  if (p.job.rank < 2) return T("You must be at least a Captain", "You must reach Captain at least");
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (p.politics?.militaryRuler && p.politics.office >= 0) return T("You already rule", "You don already dey rule");
  return null;
}

export function plotCoup(p: Player): { text: string; spawn?: Pending[] } {
  if (!p.politics) p.politics = newPolitics();
  const pol = p.politics;
  const rank = p.job?.rank ?? 0;
  const pr = clamp(0.1 + rank * 0.12 + pol.military / 300 + p.stats.connections / 400, 0.08, 0.7);
  p.flags.coupPlot = true;
  if (chance(pr)) {
    pol.office = 5;
    pol.highest = 5;
    pol.yearsLeft = 99;
    pol.terms = 1;
    pol.militaryRuler = true;
    p.nation = freshNation();
    p.nation.security = 60;
    p.job = null;
    p.prestige += 6;
    bump(p, "reputation", -5);
    if (!p.achievements.includes("Seized power")) p.achievements.push("Seized power");
    return { text: T("At dawn, martial music plays on every radio station. A voice announces: 'Fellow Nigerians...' You are now Military Head of State.", "For dawn, martial music dey every radio station. One voice announce: 'Fellow Nigerians...' You don become Military Head of State.") };
  }
  const r = rng();
  if (r < 0.5) {
    p.job = null;
    return { text: ((__r0) => T(`The plot leaks. ${__r0}You were arrested for 'treason'. They call it a coup; you call it a lie.`, `The plot leak. ${__r0}Dem arrest you for 'treason'. Dem say na coup, you say na lie.`))(enterPrison(p, randInt(8, 18))) };
  }
  if (r < 0.8) {
    p.alive = false;
    p.cause = "Executed after a failed coup";
    return { text: T("The coup failed. A military tribunal finds you guilty. Firing squad at dawn.", "The coup fail. Military tribunal find you guilty. Firing squad for dawn.") };
  }
  p.job = null;
  bump(p, "reputation", -20);
  return { text: T("The plot fizzles out before it even begins. You are forced to retire in disgrace.", "The plot die before e even start. Dem force you retire with shame.") };
}

// ---------------------------------------------------------------------------
// Governance actions
// ---------------------------------------------------------------------------
export interface GovAction {
  id: string;
  label: string;
  desc: string;
  side: "good" | "corrupt" | "neutral";
  minOffice: number;
  disabled?: (p: Player) => string | false;
}

export const GOV_ACTIONS: GovAction[] = [
  { id: "power", label: "Fix electricity supply", desc: "Real investment. E go slow, but light go come.", side: "good", minOffice: 0 },
  { id: "roads", label: "Build roads & bridges", desc: "Visible progress. Contractors go queue to see you.", side: "good", minOffice: 0 },
  { id: "health", label: "Fund hospitals & schools", desc: "Drugs for the clinics. Teachers dey collect salary on time.", side: "good", minOffice: 0 },
  { id: "cash", label: "Conditional cash transfers", desc: "Pay the poorest families direct. Small leakage, big smiles.", side: "good", minOffice: 1 },
  { id: "army", label: "Fund the army & police", desc: "Better equipment, better pay. Insecurity go reduce.", side: "good", minOffice: 1 },
  { id: "diversify", label: "Diversify the economy", desc: "Agriculture, tech and manufacturing, no be only oil.", side: "good", minOffice: 2 },
  { id: "contract", label: "Award an inflated contract to a crony", desc: "Same road, ten times the price.", side: "corrupt", minOffice: 0 },
  { id: "ghost", label: "Put ghost workers on the payroll", desc: "One thousand names wey never show for work.", side: "corrupt", minOffice: 0 },
  { id: "vote", label: "Cash out the security vote", desc: "Nobody dey audit am. Nobody dey ask.", side: "corrupt", minOffice: 1 },
  { id: "oilblock", label: "Sell an oil block to a friend", desc: "Sweet commission for sweet friend.", side: "corrupt", minOffice: 3 },
  { id: "palliative", label: "Warehouse the food palliatives", desc: "Hoard am, sell am when price don rise.", side: "corrupt", minOffice: 2 },
  { id: "gag", label: "Gag the press", desc: "Fewer questions, less approval.", side: "neutral", minOffice: 1 },
  { id: "cover", label: "Pay off investigators / cover tracks", desc: "Lower the EFCC heat. E cost real money.", side: "neutral", minOffice: 0, disabled: (p) => (p.nation.heat < 5 ? "No heat to cool" : false) },
  { id: "appoint", label: "Appoint cronies & pardon a friend", desc: "Loyalty get price. Connections go up.", side: "neutral", minOffice: 1 },
  { id: "trip", label: "Foreign trip with a big delegation", desc: "Photos with world leaders. Allowances in dollars.", side: "neutral", minOffice: 4 },
];

export function runGov(p: Player, id: string): string {
  const o = p.politics?.office ?? -1;
  if (o < 0) return T("You hold no office.", "You no hold any office.");
  const n = p.nation;
  const mag = 4 + o * 1.4;
  const sc = scaleOf(p);
  const ap = (d: number) => { n.approval = clamp(n.approval + d); };
  switch (id) {
    case "power": n.economy = clamp(n.economy + mag * 1.4); ap(3); p.goodDeeds += 1; n.projects.push("Power plant"); return T("Light finally reaches whole communities. People actually clap.", "Light finally reach whole communities. People even clap.");
    case "roads": n.economy = clamp(n.economy + mag); ap(4); p.goodDeeds += 1; n.projects.push("Roads"); return T("Roads get built. Real ones, with road markings. Traders are happy.", "Dem build roads. Real ones, with road marking. Traders dey happy.");
    case "health": n.welfare = clamp(n.welfare + mag * 1.3); ap(4); p.goodDeeds += 1; n.projects.push("Hospitals & schools"); return T("Clinics get drugs and schools get chairs. A rare sight!", "Clinics get drugs and schools get chairs. Wetin we no dey see before!");
    case "cash": n.welfare = clamp(n.welfare + mag * 1.5); ap(5); p.goodDeeds += 1; return T("Cash reaches poor families directly. A little leakage, but it mostly works.", "Cash reach poor families direct. Small leakage, but mostly e work.");
    case "army": n.security = clamp(n.security + mag * 1.6); ap(2); p.goodDeeds += 1; return T("Better kit, better pay. Patrols increase and attacks drop.", "Better kit, better pay. Patrols don increase and attacks don reduce.");
    case "diversify": n.economy = clamp(n.economy + mag * 1.6); ap(3); p.goodDeeds += 2; n.projects.push("Diversification programme"); return T("Farms, factories and startups get funding. The economy now stands on more legs.", "Farms, factories and startups get funding. Economy don get more leg to stand on.");
    case "contract": { const g = sc * rand(0.03, 0.06); addLoot(p, g); n.heat = clamp(n.heat + 10); n.economy = clamp(n.economy - 3); ap(-3); bump(p, "connections", 3); return T(`Your crony collects a contract inflated higher than Third Mainland Bridge. Your cut: ${naira(g)}.`, `Your crony collect contract wey don inflate pass Third Mainland Bridge. Your cut: ${naira(g)}.`); }
    case "ghost": { const g = sc * rand(0.015, 0.03); addLoot(p, g); n.heat = clamp(n.heat + 6); ap(-2); return T(`A thousand ghost workers collect salary. You pocket ${naira(g)}.`, `One thousand ghost workers collect salary. You carry ${naira(g)}.`); }
    case "vote": { const g = sc * rand(0.04, 0.08); addLoot(p, g); n.heat = clamp(n.heat + 12); n.security = clamp(n.security - 4); ap(-4); return T(`You cash out the security vote: ${naira(g)}. Nobody asks questions.`, `You cash out the security vote: ${naira(g)}. Nobody dey ask question.`); }
    case "oilblock": { const g = sc * rand(0.08, 0.14); addLoot(p, g); n.heat = clamp(n.heat + 18); n.economy = clamp(n.economy - 4); ap(-5); return T(`An oil block lands with your friend at a 'special price'. Your thank-you: ${naira(g)}.`, `One oil block land for your friend at 'special price'. Your thank-you: ${naira(g)}.`); }
    case "palliative": { const g = sc * rand(0.03, 0.05); addLoot(p, g); n.welfare = clamp(n.welfare - 7); n.heat = clamp(n.heat + 12); ap(-6); return T(`Warehouses are full while people queue in hunger. You sell the stock for ${naira(g)}. #EndHunger is trending.`, `Warehouse full, people dey queue for hunger. You sell the stock for ${naira(g)}. #EndHunger dey trend.`); }
    case "gag": n.heat = clamp(n.heat - 8); ap(-5); return T("Some journalists get 'invitations for questioning'. Fewer questions about your accounts.", "Some journalists collect 'invitation for questioning'. Dem don reduce question about your accounts.");
    case "cover": { const cost = p.loot * 0.04 + I(p, 5_000_000); p.money -= cost; n.heat = clamp(n.heat - 25); return T(`${naira(cost)} 'settles' the right people. The file just vanishes.`, `${naira(cost)} 'settle' the right people. The file just disappear.`); }
    case "appoint": bump(p, "connections", 5); n.heat = clamp(n.heat + 3); ap(-2); return T("You appoint loyalists and pardon a friend. The elite club loves you.", "You appoint your loyalists and pardon one friend. The elite club dey love you.");
    case "trip": {
      p.money += sc * 0.001;
      p.traveled = true;
      bump(p, "connections", 4); bump(p, "happiness", 4); n.approval = clamp(n.approval - 1);
      return T("Photos at the summit, handshakes with world leaders, and dollar allowances for your bag.", "Photo for the summit, handshake with world leaders, and dollar allowance for your bag.");
    }
    default: return T("Nothing happened.", "Nothing happen.");
  }
}

// ---------------------------------------------------------------------------
// Yearly bookkeeping for people in politics (called by the engine)
// ---------------------------------------------------------------------------
export function yearlyPolitics(p: Player, lines: string[], pending: Pending[]): void {
  const pol = p.politics;
  if (!pol) return;
  for (const k of ["machine", "umpire", "courts", "military"] as const) if (pol[k] > 0 && chance(0.5)) pol[k] -= 1;

  if (pol.vp && pol.office < 0) {
    p.money += OFFICES[3].salary * Math.pow(p.index, 0.9);
    pol.vpYears += 1;
    if (chance(0.07)) pending.push(evt("succession"));
    else if (pol.vpYears > 8) { pol.vp = false; pol.vpYears = 0; lines.push(T("Your time as Vice President has ended.", "Your time as Vice President don end.")); }
  }

  if (pol.office < 0) {
    p.nation.heat = clamp(p.nation.heat - 3);
    return;
  }
  const n = p.nation;
  const office = OFFICES[pol.office];
  p.money += office.salary * Math.pow(p.index, 0.9);

  n.economy = clamp(n.economy + rand(-4, 3));
  n.security = clamp(n.security + rand(-4, 2));
  n.welfare = clamp(n.welfare + rand(-3, 2));
  n.heat = clamp(n.heat - 3);
  const target = n.economy * 0.4 + n.security * 0.3 + n.welfare * 0.3;
  n.approval = clamp(n.approval * 0.6 + target * 0.4 + rand(-3, 3));

  if (pol.militaryRuler && pol.office === 5) {
    const hazard = clamp(0.07 + n.heat / 500 - pol.military / 600, 0.02, 0.4);
    if (chance(hazard)) pending.push(evt("counter_coup"));
    else if (chance(0.22)) pending.push(evt("handover"));
    return;
  }
  pol.yearsLeft -= 1;

  if (pol.godfather && chance(0.5)) pending.push(evt("godfather_demand"));
  if (n.approval < 40 || n.welfare < 30) { if (chance(0.5)) pending.push(evt("protest")); }
  if (pol.office === 5 && n.security < 32 && n.heat > 45 && chance(0.4)) pending.push(evt("coup"));
  if (n.heat > 60 && chance(0.45)) pending.push(evt("efcc", { inOffice: true }));

  if (pol.yearsLeft <= 0) {
    if (pol.terms < 2) pending.push(evt("reelect"));
    else pending.push(evt("termend"));
    lines.push(T(`Your term as ${office.title} has ended.`, `Your term as ${office.title} don end.`));
  }
}

/** Called when a prison term ends; political people come out as heroes. */
export function politicalRelease(p: Player, pending: Pending[]) {
  if (p.politics || p.flags.coupPlot) pending.push(evt("prison_hero"));
}

export function leaveOffice(p: Player, reason: string): string {
  const pol = p.politics;
  if (!pol) return "";
  const title = OFFICES[Math.max(0, pol.office)].title;
  const wasMilitary = pol.militaryRuler;
  pol.highest = Math.max(pol.highest, pol.office);
  pol.office = -1;
  pol.yearsLeft = 0;
  pol.terms = 0;
  bump(p, "connections", 3);
  p.flags[`ex_${title}`] = true;
  if (title === "President") p.flags.ex_president = true;
  if (wasMilitary) {
    // A retired general can still run as a civilian: straight for the top job.
    pol.militaryRuler = false;
    pol.highest = 4;
    p.flags.exMilitaryRuler = true;
  }
  p.nation = freshNation();
  if (p.loot > 0) p.flags.efccWatch = Math.round(p.loot);
  return reason;
}

// ---------------------------------------------------------------------------
// Political events
// ---------------------------------------------------------------------------
function winElection(p: Player, target: number, label: string): string {
  const pol = p.politics;
  if (!pol) return "";
  pol.office = target;
  pol.highest = target;
  pol.yearsLeft = OFFICES[target].term;
  pol.terms = 1;
  pol.anointed = false;
  pol.vp = false;
  p.nation = freshNation();
  p.prestige += target + 1;
  bump(p, "reputation", 4);
  if (target === 5 && !p.achievements.includes("Became President")) p.achievements.push("Became President");
  else if (target >= 4 && !p.achievements.includes("Became Governor")) p.achievements.push("Became Governor");
  return T(`${label} You are now ${OFFICES[target].title}!`, `${label} You don become ${OFFICES[target].title}!`);
}

const inOffice = (p: Player) => (p.politics?.office ?? -1) >= 0;
const civilianOffice = (p: Player) => inOffice(p) && !p.politics?.militaryRuler;

export const POLITICS_EVENTS: EventDef[] = [
  {
    id: "party_elders",
    title: dual("Party elders call", "Party elders dey call you"),
    weight: (p) => (!p.politics && p.age >= 28 && p.stats.connections >= 30 && p.money > I(p, 5_000_000) ? 1.4 : 0),
    text: () => T("Party elders invite you to a closed-door meeting. 'We see potential in you. Politics is the next level.'", "Party elders invite you for one closed-door meeting. 'We don see potential for you. Politics na the next level.'"),
    choices: (p) => [
      { label: T("Join politics", "Join politics"), sub: naira(I(p, 2_000_000)), disabled: p.money < I(p, 2_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => joinPolitics(q) },
      { label: T("Stay out of it", "Stay out of am"), run: () => T("You smile, shake hands, and quietly walk away.", "You smile, shake hand, and carry your body comot.") },
    ],
  },
  {
    id: "primary",
    valid: (p) => Boolean(p.politics),
    title: dual("Party primaries", "Party primaries"),
    weight: () => 0,
    text: (p, d) => {
      const z = currentZone(p);
      const mine = z === playerZone(p);
      return T(
        `Before you face the voters you must win the party ticket for ${OFFICES[Number(d.target)].title}. Delegates are waiting for 'the thing'. Zoning this cycle favours the ${z}${mine ? " (your side!)" : " (not your side)"}.`,
        `Before you face voters, you must win the party ticket for ${OFFICES[Number(d.target)].title}. Delegates dey wait for 'the thing'. Zoning this cycle favour the ${z}${mine ? " (na your side!)" : " (no be your side)"}.`,
      );
    },
    choices: (p, d) => {
      const t = Number(d.target);
      const base = campaignCost(p, t);
      const pol = p.politics;
      const mach = pol?.machine ?? 0;
      const go = (text: string): { text: string; spawn: Pending[] } => ({ text, spawn: [evt("contest", { target: t })] });
      return [
        { label: T("Buy the delegates (dollars, not naira)", "Buy the delegates (dollars, no be naira)"), sub: naira(base * 0.6), disabled: p.money < base * 0.6 ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          q.money -= base * 0.6;
          if (chance(clamp(0.35 + mach / 200 + q.stats.connections / 300 + (q.politics?.anointed ? 0.25 : 0), 0.1, 0.9))) return go(T("The delegates choose you. They call you the 'consensus candidate'.", "The delegates choose you. 'Consensus candidate' dem call am."));
          return T("Another aspirant pays more. You lose the primary.", "Another aspirant pay more. You lose the primary.");
        } },
        { label: T("Use your party machine", "Use your party machine"), sub: mach >= 40 ? T("Free", "Free") : T("Need machine 40+", "Need machine 40+"), disabled: mach < 40 ? T("Build the party machine first", "Build the party machine first") : false, run: () => {
          if (chance(clamp(0.2 + mach / 150, 0.15, 0.9))) return go(T("Your ward chairmen deliver the delegates. The structure works.", "Your ward chairmen deliver the delegates. Structure don work."));
          return T("The machine does not carry enough weight this time. You lose the primary.", "The machine no get enough weight this time. You lose the primary.");
        } },
        { label: T("Elders' consensus (the anointed)", "Elders' consensus (the anointed)"), sub: pol?.anointed || pol?.godfather ? T("Needs godfather's blessing", "E need godfather's blessing") : T("Need a godfather", "You need godfather"), disabled: pol?.anointed || pol?.godfather ? false : T("No godfather/anointing", "No godfather/anointing"), run: () => {
          if (chance(0.82)) return go(T("The elders announce you as the consensus candidate. The other aspirants 'step down'.", "The elders announce you as consensus candidate. The other aspirants 'step down'."));
          return T("A rival group of elders blocks the arrangement. You lose the ticket.", "Another group of elders block the arrangement. You lose the ticket.");
        } },
        { label: T("Defect: take another party's ticket", "Defect: collect another party ticket"), sub: naira(base * 0.2), disabled: p.money < base * 0.2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          q.money -= base * 0.2;
          bump(q, "reputation", -8);
          if (q.politics) q.politics.defected = true;
          if (chance(0.62)) return go(T("You jump ship at midnight and collect the other party's ticket. They welcome you with open arms.", "You jump ship for midnight and collect the other party ticket. Dem welcome you with open arms."));
          return T("You leave your party, but the new one gives the ticket to somebody else. Disaster.", "You leave your party, but the new one give the ticket to somebody else. Disaster.");
        } },
        { label: T("Withdraw", "Withdraw"), run: () => T("You decide to wait for a better season.", "You decide to wait for better season.") },
      ];
    },
  },
  {
    id: "contest",
    valid: (p) => Boolean(p.politics),
    title: dual("Campaign", "Campaign"),
    weight: () => 0,
    text: (_p, d) => T(`You are running for ${OFFICES[Number(d.target)].title}. Posters on every pole, jingles on every radio. How do you want to play it?`, `You dey run for ${OFFICES[Number(d.target)].title}. Poster dey every pole, jingle dey every radio. How you wan play am?`),
    choices: (p, d) => {
      const t = Number(d.target);
      const base = campaignCost(p, t);
      const pol = p.politics;
      const sway = swayFor(p);
      const win = (q: Player, extra: number, label: string): { text: string; spawn?: Pending[] } => {
        if (chance(clamp(sway + extra, 0.05, 0.93))) {
          const text = winElection(q, t, label);
          return t >= 4 ? { text, spawn: [evt("tribunal", { target: t })] } : { text };
        }
        bump(q, "stress", 12); bump(q, "reputation", -5);
        return { text: T(`${label} But you LOSE. The results are announced and the crowd goes quiet.`, `${label} But you LOSE. Dem announce result and the crowd go quiet.`) };
      };
      return [
        { label: T("Run a modest campaign", "Run a small campaign"), sub: naira(base), disabled: p.money < base ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base; return win(q, 0, T("You campaign door to door.", "You campaign from door to door.")); } },
        { label: T("Spend heavily (rice, cash, branded cloth)", "Spend big (rice, cash, branded cloth)"), sub: naira(base * 2), disabled: p.money < base * 2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 2; return win(q, 0.22, T("Vote buying is the whole strategy.", "Vote buying na the whole strategy.")); } },
        { label: T("Rig it (thugs, ballot boxes)", "Rig am (thugs, ballot boxes)"), sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          q.money -= base * 0.5;
          const caught = 0.3 * (1 - (q.politics?.umpire ?? 0) / 120);
          if (chance(caught)) { const r = enterPrison(q, randInt(2, 5)); return { text: T(`${r}Your rigging was exposed on live TV.`, `${r}Dem expose your rigging on live TV.`) }; }
          bump(q, "reputation", -15);
          return win(q, 0.38 + (q.politics?.umpire ?? 0) / 300, T("Ballot boxes appear from nowhere.", "Ballot boxes just appear from nowhere."));
        } },
        { label: T("Let the electoral umpire 'adjust' the results", "Make the electoral umpire 'adjust' the results"), sub: (pol?.umpire ?? 0) >= 40 ? naira(base * 0.3) : T("Need umpire control 40+", "Need umpire control 40+"), disabled: (pol?.umpire ?? 0) < 40 ? T("Capture the umpire first", "Capture the umpire first") : p.money < base * 0.3 ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          q.money -= base * 0.3;
          if (chance(0.08)) { bump(q, "reputation", -25); return { text: T("The 'adjustment' is caught on camera and goes viral. Nobody can believe your face.", "Dem catch the 'adjustment' on camera and e go viral. Nobody fit believe your face.") }; }
          bump(q, "reputation", -6);
          return win(q, 0.45, T("Collation centres deliver numbers like magic.", "Collation centres deliver numbers like magic."));
        } },
        { label: T("Take a godfather's backing", "Take godfather's backing"), sub: naira(base * 0.15), disabled: p.money < base * 0.15 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 0.15; if (q.politics) q.politics.godfather = true; return win(q, 0.3, T("A godfather arranges everything. You will owe him.", "Godfather arrange everything. You go owe am.")); } },
        { label: T("Cancel", "Cancel"), run: () => T("You pull out of the race.", "You pull out of the race.") },
      ];
    },
  },
  {
    id: "tribunal",
    valid: (p) => (p.politics?.office ?? -1) >= 4,
    title: dual("Election petition", "Election petition"),
    weight: () => 0,
    text: () => T("Your rival has gone to the election tribunal. 'The election was a sham!' The case is in court and the whole country is watching.", "Your rival run go election tribunal. 'The election na sham!' The case dey court and the whole country dey watch."),
    choices: (p) => {
      const base = campaignCost(p, p.politics?.office ?? 4);
      const courts = p.politics?.courts ?? 0;
      const verdict = (q: Player, pr: number, win: string): string => {
        if (chance(clamp(pr, 0.1, 0.95))) { bump(q, "reputation", 2); return win; }
        leaveOffice(q, "");
        return T("The tribunal nullifies your election. Your certificate of return is withdrawn. Chai!", "The tribunal nullify your election. Dem don withdraw your certificate of return. Chai!");
      };
      return [
        { label: T("Hire a legion of SANs", "Hire plenty SANs"), sub: naira(base * 0.3), disabled: p.money < base * 0.3 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 0.3; return verdict(q, 0.6 + courts / 250, T("Your lawyers shred the petition. Victory affirmed!", "Your lawyers tear the petition to pieces. Victory affirmed!")); } },
        { label: T("Lean on the judiciary", "Press the judiciary"), sub: courts >= 40 ? T("Heat +10", "Heat +10") : T("Need courts 40+", "Need courts 40+"), disabled: courts < 40 ? T("Court the judiciary first", "Court the judiciary first") : false, run: (q) => { q.nation.heat = clamp(q.nation.heat + 10); return verdict(q, 0.88, T("The panel throws out the petition in ten minutes flat.", "The panel throw out the petition in ten minutes flat.")); } },
        { label: T("Settle the petitioner", "Settle the petitioner"), sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 0.5; return verdict(q, 0.78, T("Your rival suddenly 'withdraws' the petition and joins your cabinet.", "Your rival suddenly 'withdraw' the petition and join your cabinet.")); } },
        { label: T("Trust the process", "Trust the process"), run: (q) => verdict(q, 0.45 + courts / 300, T("The tribunal affirms your victory. Justice is working!", "The tribunal affirm your victory. Justice dey work!")) },
      ];
    },
  },
  {
    id: "reelect",
    valid: civilianOffice,
    title: dual("Re-election", "Re-election"),
    weight: () => 0,
    text: (p) => T(`Your first term as ${officeTitle(p) ?? "official"} is coming to an end. Approval: ${Math.round(p.nation.approval)}%. Do you want a second term?`, `Your first term as ${officeTitle(p) ?? "official"} dey end. Approval: ${Math.round(p.nation.approval)}%. You wan go second term?`),
    choices: (p) => {
      const o = p.politics?.office ?? 0;
      const base = campaignCost(p, o);
      const chanceBase = 0.15 + p.nation.approval / 140 + (p.politics?.godfather ? 0.1 : 0) + (p.politics?.machine ?? 0) / 400 + (p.politics?.umpire ?? 0) / 300;
      const win = (q: Player, extra: number, msg: string) => {
        if (chance(clamp(chanceBase + extra, 0.05, 0.93)) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = OFFICES[o].term; bump(q, "reputation", 3); q.prestige += 1; return T(`${msg} You win a second term!`, `${msg} You win second term!`); }
        leaveOffice(q, "");
        return T(`${msg} You lose. Time to hand over power.`, `${msg} You lose. Na time to hand over power.`);
      };
      return [
        { label: T("Campaign on your record", "Campaign on your record"), sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 0.5; return win(q, 0, T("You run on your record.", "You run on your record.")); } },
        { label: T("Spend heavily", "Spend big"), sub: naira(base * 1.5), disabled: p.money < base * 1.5 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= base * 1.5; return win(q, 0.2, T("Rice and cash flow again.", "Rice and cash dey flow again.")); } },
        { label: T("Rig it", "Rig am"), sub: naira(base * 0.3), disabled: p.money < base * 0.3 ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          q.money -= base * 0.3;
          if (chance(0.25 * (1 - (q.politics?.umpire ?? 0) / 120))) { leaveOffice(q, ""); return ((__r0) => T(`${__r0}Your rigging was exposed. Impeached and arrested.`, `${__r0}Dem expose your rigging. Dem impeach you and arrest you.`))(enterPrison(q, randInt(2, 5))); }
          bump(q, "reputation", -12);
          return win(q, 0.35, T("The results were 'adjusted'.", "Dem 'adjust' the results."));
        } },
        { label: T("Step down with dignity", "Step down with respect"), run: (q) => { bump(q, "reputation", 8); leaveOffice(q, ""); return T("You hand over peacefully. People will remember it.", "You hand over peacefully. People go remember am."); } },
      ];
    },
  },
  {
    id: "termend",
    valid: civilianOffice,
    title: dual("Term limit", "Term limit"),
    weight: () => 0,
    text: () => T("You have reached your constitutional term limit. Some people in your circle whisper 'tenure elongation'.", "You don reach your constitutional term limit. Some people for your circle dey whisper 'tenure elongation'."),
    choices: () => [
      { label: T("Hand over power", "Hand over power"), run: (q) => { bump(q, "reputation", 6); leaveOffice(q, ""); return T("You leave office. They may well build you a statue.", "You leave office. Dem fit build your statue."); } },
      { label: T("Push for tenure elongation", "Push for tenure elongation"), run: (q) => { if (chance(0.4) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = 4; bump(q, "reputation", -15); q.nation.approval = clamp(q.nation.approval - 15); q.nation.heat = clamp(q.nation.heat + 20); return T("The assembly bends the rules. Protests burst out but you remain.", "The assembly bend the rules. Protest burst out but you still dey there."); } leaveOffice(q, ""); bump(q, "reputation", -10); return T("The attempt fails and you leave in disgrace.", "The attempt fail and you comot with shame."); } },
    ],
  },
  {
    id: "protest",
    valid: inOffice,
    title: "#EndBadGovernance",
    weight: () => 0,
    text: () => T("Young people are on the streets with placards. Hashtags are trending worldwide. TV stations are showing it live.", "Young people dey on the streets with placards. Hashtags dey trend worldwide. TV stations dey show am live."),
    choices: () => [
      { label: T("Listen and make concessions", "Listen and give small concession"), run: (q) => { q.nation.approval = clamp(q.nation.approval + 8); q.nation.welfare = clamp(q.nation.welfare + 5); q.goodDeeds += 1; return T("You meet the protesters, announce new measures, and calm returns.", "You meet the protesters, announce new measures, and calm return."); } },
      { label: T("Crack down hard", "Crack down hard"), run: (q) => { q.nation.approval = clamp(q.nation.approval - 12); q.nation.heat = clamp(q.nation.heat + 15); bump(q, "reputation", -12); return T("Tear gas, arrests, and international condemnation.", "Tear gas, arrests, and international condemnation."); } },
      { label: T("Ignore them", "Ignore am"), run: (q) => { q.nation.approval = clamp(q.nation.approval - 5); return T("The crowd thins out after a week, but the anger never goes away.", "The crowd thin out after one week, but the anger no go."); } },
    ],
  },
  {
    id: "coup",
    valid: civilianOffice,
    title: dual("Coup rumour", "Coup rumour"),
    weight: () => 0,
    text: () => T("Military radio is chattering at midnight. Officers are on the move. A trusted aide whispers: 'Sir, tonight could be the night.'", "Military radio dey chat for midnight. Officers dey move. One trusted aide whisper: 'Sir, tonight fit be the night.'"),
    choices: (p) => [
      { label: T("Pay off key generals", "Settle the key generals"), sub: naira(Math.max(I(p, 50_000_000), p.loot * 0.1)), run: (q) => { q.money -= Math.max(I(q, 50_000_000), q.loot * 0.1); q.nation.security = clamp(q.nation.security + 10); q.nation.heat = clamp(q.nation.heat - 10); return T("The generals suddenly remember their loyalty. The coup fizzles out.", "The generals suddenly remember their loyalty. The coup die for there."); } },
      { label: T("Trust your guards", "Trust your guards"), run: (q) => { if (chance(0.5 + (q.politics?.military ?? 0) / 300)) return T("Your guards hold the villa. The plotters are arrested.", "Your guards hold the villa. Dem arrest the plotters."); leaveOffice(q, ""); moveTo(q, "abuja"); if (chance(0.35)) { q.alive = false; q.cause = "Killed in a military coup"; return T("Soldiers storm the villa at dawn.", "Soldiers storm the villa for dawn."); } return T("You are removed from power. Months in detention before release.", "Dem remove you from power. Months for detention before dem release you."); } },
      { label: T("Flee the country", "Run comot from the country"), run: (q) => { leaveOffice(q, ""); moveTo(q, "abroad"); bump(q, "reputation", -10); return T("One jet to nowhere and a new life abroad. Your enemies celebrate.", "One jet to nowhere and new life abroad. Your enemies dey celebrate."); } },
    ],
  },
  {
    id: "counter_coup",
    valid: (p) => Boolean(p.politics?.militaryRuler && p.politics.office >= 0),
    title: dual("Counter-coup!", "Counter-coup!"),
    weight: () => 0,
    text: () => T("Gunshots near the Villa. Another set of officers has decided it is their turn. Your radio goes silent.", "Gunshots near the Villa. Another set of officers don decide say na their turn. Your radio go silent."),
    choices: (p) => [
      { label: T("Pay the guards to fight", "Pay the guards make dem fight"), sub: naira(I(p, 200_000_000)), disabled: p.money < I(p, 200_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 200_000_000); if (chance(0.55)) { q.nation.heat = clamp(q.nation.heat - 10); return T("Loyal troops crush the mutiny. Heads roll the next morning.", "Loyal troops crush the mutiny. Heads roll the next morning."); } leaveOffice(q, ""); return ((__r0) => T(`${__r0}The mutineers win. You are arrested and detained.`, `${__r0}The mutineers win. Dem arrest you and detain you.`))(enterPrison(q, randInt(6, 14))); } },
      { label: T("Surrender quietly", "Surrender quietly"), run: (q) => { leaveOffice(q, ""); return ((__r0) => T(`${__r0}You are removed from office and put in detention.`, `${__r0}Dem remove you from office and put you for detention.`))(enterPrison(q, randInt(5, 12))); } },
      { label: T("Escape through the back gate", "Escape through the back gate"), run: (q) => { if (chance(0.4)) { q.alive = false; q.cause = "Killed in a counter-coup"; return T("They catch you at the barracks gate. That is the end.", "Dem catch you for barracks gate. E end there."); } leaveOffice(q, ""); moveTo(q, "abroad"); return T("You slip out in a borrowed Peugeot and cross the border. Exile awaits.", "You slip out inside borrowed Peugeot and cross the border. Exile dey wait you."); } },
    ],
  },
  {
    id: "handover",
    valid: (p) => Boolean(p.politics?.militaryRuler && p.politics.office >= 0),
    title: dual("Hand over?", "Hand over?"),
    weight: () => 0,
    text: () => T("The international community is pressing for a return to civil rule. Your advisers say: 'Sir, hand over and live as an elder statesman.'", "The international community dey press for return to civil rule. Your advisers talk say: 'Sir, hand over and live as elder statesman.'"),
    choices: () => [
      { label: T("Hand over to civilians", "Hand over to civilians"), run: (q) => { bump(q, "reputation", 12); bump(q, "connections", 10); leaveOffice(q, ""); if (!q.achievements.includes("Handed over power")) q.achievements.push("Handed over power"); return T("You hand over the keys and return to the farm. The nation gets democracy. One day, the elders may call you back.", "You hand over the keys and return to the farm. The nation get democracy. One day, the elders go fit call you back."); } },
      { label: T("Hold on a little longer", "Hold on small more"), run: (q) => { q.nation.heat = clamp(q.nation.heat + 12); q.nation.approval = clamp(q.nation.approval - 6); return T("You postpone the handover again. Pressure builds.", "You postpone the handover again. Pressure dey build."); } },
    ],
  },
  {
    id: "prison_hero",
    valid: (p) => Boolean(p.politics) || Boolean(p.flags.coupPlot),
    title: dual("Free at last", "Free at last"),
    weight: () => 0,
    text: () => T("The gates open after long years. A crowd waits outside: journalists, party men, ordinary people. 'Prisoner of conscience!' they shout.", "The gates open after long years. Crowd dey wait outside: journalists, party men, ordinary people. 'Prisoner of conscience!' dem shout."),
    choices: () => [
      { label: T("Walk out as a symbol of resistance", "Walk out as symbol of resistance"), run: (q) => {
        bump(q, "reputation", 25); bump(q, "connections", 10); bump(q, "happiness", 15);
        if (!q.politics) q.politics = newPolitics();
        q.politics.hero = true;
        q.politics.machine = clamp(q.politics.machine + 8);
        if (!q.achievements.includes("Prisoner turned hero")) q.achievements.push("Prisoner turned hero");
        const spawn: Pending[] = q.stats.connections >= 45 || q.flags.exMilitaryRuler ? [evt("anointed")] : [];
        return { text: T("The country now sees you as a hero. Your suffering has become your biggest political asset.", "The country don dey see you as hero. Your suffering don become your biggest political asset."), spawn };
      } },
      { label: T("Slip out quietly and rebuild", "Slip out quietly and rebuild"), run: (q) => { bump(q, "reputation", 6); return T("You step out at dawn, hug your family, and decide to keep your head down.", "You step out for dawn, hug your family, and decide to keep low profile."); } },
    ],
  },
  {
    id: "anointed",
    valid: (p) => Boolean(p.politics),
    title: dual("The elders' choice", "The elders' choice"),
    weight: () => 0,
    text: () => T("A delegation of retired generals, ex-governors and party chiefs visits you. 'Our country needs a person with your story. We have agreed to back you for the presidency.'", "A delegation of retired generals, ex-governors and party chiefs visit you. 'Our country need person with your story. We don agree to back you for presidency.'"),
    choices: () => [
      { label: T("Accept their blessing", "Accept their blessing"), run: (q) => { if (q.politics) { q.politics.anointed = true; q.politics.godfather = true; q.politics.machine = clamp(q.politics.machine + 12); } bump(q, "connections", 8); return T("You are now the anointed candidate. Some people call you a puppet, but the doors open wide.", "You don become the anointed candidate. Some people dey call you puppet, but doors open wide for you."); } },
      { label: T("Decline. Go on your own", "Decline. Go your own way"), run: (q) => { bump(q, "reputation", 5); return T("You thank them but choose independence. Respect, and a harder road.", "You thank them but you choose to stand alone. Respect, but the road go hard."); } },
    ],
  },
  {
    id: "crackdown",
    valid: (p) => Boolean(p.politics),
    title: dual("Regime crackdown", "Regime crackdown"),
    weight: (p) => (p.politics && p.age >= 30 && p.stats.reputation >= 55 && p.stats.connections >= 40 && !p.flags.exile && p.politics.office < 0 ? 1.1 : 0),
    text: () => T("The ruling regime hates your criticism. Security men are asking questions about you. A friend calls at night: 'Oga, leave this country tonight.'", "The ruling regime hate your criticism. Security men don dey ask questions about you. A friend call at night: 'Oga, comot from this country tonight.'"),
    choices: () => [
      { label: T("Go into exile abroad", "Go exile abroad"), run: (q) => { q.flags.exile = true; moveTo(q, "abroad"); bump(q, "reputation", 10); bump(q, "connections", 5); if (q.politics) q.politics.machine = clamp(q.politics.machine + 8); return T("You escape across the border at night and become a voice from exile. The diaspora loves you.", "You escape cross the border for night and become voice from exile. The diaspora love you."); } },
      { label: T("Stay and speak out", "Stay and speak up"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 8); return T("You keep talking. The regime blinks first and does nothing.", "You con dey talk. The regime blink first and do nothing."); } if (q.politics) q.politics.hero = true; return ((__r0) => T(`${__r0}You are arrested for 'sedition'. Your name becomes a rallying cry.`, `${__r0}Dem arrest you for 'sedition'. Your name become rallying cry.`))(enterPrison(q, randInt(3, 6))); } },
      { label: T("Make peace with the regime", "Make peace with the regime"), run: (q) => { bump(q, "reputation", -12); bump(q, "connections", 3); q.money += I(q, 20_000_000); return T("You accept a 'consultancy' contract. The regime smiles. Your friends stop calling.", "You accept one 'consultancy' contract. The regime smile. Your friends stop to call you."); } },
    ],
  },
  {
    id: "exile_return",
    valid: (p) => Boolean(p.flags.exile) && p.state === "abroad",
    title: dual("The exile returns", "The exile don return"),
    weight: (p) => (p.flags.exile && p.state === "abroad" ? 6 : 0),
    text: () => T("The regime has fallen and democracy is back. Crowds at the airport hold up your poster. 'Welcome home!'", "The regime don fall and democracy don come back. Crowds for airport dey hold your poster. 'Welcome home!'"),
    choices: () => [
      { label: T("Fly home as a hero", "Fly come home as hero"), run: (q) => {
        delete q.flags.exile;
        moveTo(q, "lagos");
        bump(q, "reputation", 15); bump(q, "connections", 10);
        if (q.politics) { q.politics.hero = true; q.politics.machine = clamp(q.politics.machine + 10); }
        if (!q.achievements.includes("Returned from exile")) q.achievements.push("Returned from exile");
        return T("You land to cheering crowds. Banners say: 'The people's champion'. Your political career is reborn.", "You land and crowds dey cheer. Banners talk say: 'The people's champion'. Your political career don born again.");
      } },
      { label: T("Stay abroad, enjoy the good life", "Stay abroad, enjoy life"), run: (q) => { delete q.flags.exile; bump(q, "happiness", 8); return T("You decide you are done with Nigerian politics.", "You decide say you don tire for Nigerian politics."); } },
    ],
  },
  {
    id: "running_mate",
    valid: (p) => Boolean(p.politics) && !p.politics!.vp && (p.politics?.office ?? -1) < 5,
    title: dual("Running mate offer", "Running mate offer"),
    weight: (p) => (p.politics && p.politics.highest >= 4 && !p.politics.vp && p.politics.office < 5 ? 2 : 0),
    text: () => T("A presidential candidate wants you as running mate. 'Together we will win. You will be Vice President.'", "A presidential candidate want you as running mate. 'Together we go win. You go be Vice President.'"),
    choices: () => [
      { label: T("Accept the ticket", "Accept the ticket"), run: (q) => { if (chance(0.55)) { if (q.politics) { q.politics.vp = true; q.politics.vpYears = 0; } bump(q, "reputation", 4); if (!q.achievements.includes("Vice President")) q.achievements.push("Vice President"); return T("The ticket wins! You are the Vice President. Keep your eyes on the principal's health.", "The ticket win! You don be Vice President. Keep eye on the principal's health."); } bump(q, "stress", 6); return T("The ticket loses. You return to your old life.", "The ticket lose. You go back to your old life."); } },
      { label: T("Decline. Chase your own ambition", "Decline. Chase your own ambition"), run: (q) => { bump(q, "reputation", 2); return T("You say no. Your eyes are on the top seat.", "You say no. Your eye dey the top seat."); } },
    ],
  },
  {
    id: "succession",
    valid: (p) => Boolean(p.politics?.vp),
    title: dual("Constitutional moment", "Constitutional moment"),
    weight: () => 0,
    text: () => T("Sad news from the Villa. The President has died (or is too sick to continue). The constitution is clear: you are next.", "Sad news from the Villa. The President don die (or e too sick to continue). The constitution clear: na you be next."),
    choices: () => [
      { label: T("Take the oath of office", "Take the oath of office"), run: (q) => {
        const pol = q.politics!;
        pol.vp = false; pol.vpYears = 0;
        pol.office = 5; pol.highest = 5; pol.yearsLeft = 3; pol.terms = 1;
        q.nation = freshNation();
        q.nation.approval = 65;
        q.prestige += 6;
        bump(q, "reputation", 6);
        if (!q.achievements.includes("Became President")) q.achievements.push("Became President");
        return T("You are sworn in as President. The nation mourns, and watches you closely.", "Dem swear you in as President. The nation dey mourn, and dey watch you closely.");
      } },
    ],
  },
  {
    id: "godfather_demand",
    valid: inOffice,
    title: dual("The godfather calls", "The godfather dey call"),
    weight: () => 0,
    text: () => T("The man who put you in office wants his share. 'Remember who made you.'", "The man wey put you for office want him share. 'Remember who made you.'"),
    choices: (p) => [
      { label: T("Pay him", "Pay am"), sub: naira(Math.max(I(p, 10_000_000), p.money * 0.15)), run: (q) => { q.money -= Math.max(I(q, 10_000_000), q.money * 0.15); bump(q, "connections", 3); return T("Peace has a price. He is content for now.", "Peace get price. E don calm for now."); } },
      { label: T("Tell him no", "Tell am no"), run: (q) => { q.nation.heat = clamp(q.nation.heat + 10); q.nation.approval = clamp(q.nation.approval - 6); if (q.politics) q.politics.godfather = false; return T("He leaks documents to the press. Trouble!", "E leak documents to the press. Wahala dey!"); } },
    ],
  },
  {
    id: "efcc",
    valid: (p) => p.loot > 0,
    title: dual("EFCC invitation", "EFCC don invite you"),
    weight: () => 0,
    text: (p) => T(`EFCC investigators want to see you. They have documents tracing ${naira(p.loot)} in suspicious funds. Plenty of politicians have survived worse. It all depends on what you do next.`, `EFCC investigators wan see you. Dem get documents wey trace ${naira(p.loot)} in suspicious funds. Plenty politicians don survive worse. All na wetin you do next.`),
    choices: (p) => [
      { label: T("Settle quietly", "Settle am quietly"), sub: naira(p.loot * 0.2), disabled: p.money < p.loot * 0.2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= q.loot * 0.2; q.nation.heat = clamp(q.nation.heat - 35); delete q.flags.efccWatch; return T("A deal is made behind closed doors. The matter is 'resolved'.", "Dem make deal behind closed doors. Dem 'resolve' the matter."); } },
      { label: T("Cry persecution (turn it political)", "Cry persecution (make am political)"), run: (q) => { if (chance(0.55)) { bump(q, "reputation", 10); q.nation.heat = clamp(q.nation.heat - 25); if (q.politics) q.politics.machine = clamp(q.politics.machine + 5); return T("'It's a political witch-hunt!' Your supporters storm the streets. The agency blinks and slows down.", "'Na political witch-hunt!' Your supporters storm the streets. The agency blink and slow down."); } bump(q, "reputation", -8); q.nation.heat = clamp(q.nation.heat + 8); return T("Nobody believes the persecution story. The headlines get worse.", "Nobody believe the persecution story. The headlines worse pass before."); } },
      { label: T("Defect to the ruling party", "Cross over to the ruling party"), sub: p.politics ? T("Case goes quiet", "Case go quiet") : T("Need to be in politics", "You must dey politics"), disabled: p.politics ? false : T("Need to be in politics", "You must dey politics"), run: (q) => { q.nation.heat = clamp(q.nation.heat - 40); bump(q, "reputation", -6); if (q.politics) { q.politics.machine = clamp(q.politics.machine + 5); q.politics.defected = true; } delete q.flags.efccWatch; return T("You cross over to the ruling party. Welcome ceremony, new cap, and the case file goes quiet. They say all sins are washed away there.", "You cross over to the ruling party. Welcome ceremony, new cap, and the case file go quiet. Dem say all sins dey wash for there."); } },
      { label: T("Fight them in court", "Fight them for court"), run: (q) => { if (chance(0.55 + (q.politics?.courts ?? 0) / 250)) { q.nation.heat = clamp(q.nation.heat - 20); bump(q, "reputation", -8); return T("The judge adjourns the case to 2038. Typical.", "Judge adjourn the case to 2038. Typical."); } if (q.politics && q.politics.office >= 0) leaveOffice(q, ""); return ((__r0) => T(`${__r0}You were convicted.`, `${__r0}Dem convict you.`))(enterPrison(q, randInt(6, 14))); } },
      { label: T("Flee abroad", "Run go abroad"), run: (q) => { if (q.politics && q.politics.office >= 0) leaveOffice(q, ""); moveTo(q, "abroad"); q.money -= q.money * 0.2; delete q.flags.efccWatch; return T("You escape Nigeria with your assets. You are now a fugitive.", "You escape Nigeria with your assets. You don become fugitive."); } },
    ],
  },
];
