import { OFFICES } from "./data";
import { I, addLoot, bump, enterPrison, moveTo, stateOf } from "./helpers";
import type { EventDef, Nation, Pending, Player, Politics } from "./types";
import { chance, clamp, naira, rand, randInt } from "./util";

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
  if (pol.office >= 0) return pol.militaryRuler && pol.office === 5 ? "Military Head of State" : OFFICES[pol.office].title;
  if (pol.vp) return "Vice President";
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
  if (p.politics) return "Already in politics";
  if (p.age < 25) return "Must be at least 25";
  if (p.stats.connections < 15) return "Need more connections (15+)";
  if (p.money < I(p, 2_000_000)) return `Need ${naira(I(p, 2_000_000))} for party forms`;
  if (p.prison > 0) return "You are in prison";
  return null;
}

export function joinPolitics(p: Player): string {
  p.money -= I(p, 2_000_000);
  p.politics = newPolitics();
  return "You buy the party forms and join politics. The ward chairman shake your hand with both hands. Wahala don start!";
}

export function nextTarget(p: Player): number | null {
  if (!p.politics) return null;
  const t = p.politics.highest + 1;
  if (t >= OFFICES.length) return null;
  return t;
}

export function canContest(p: Player): string | null {
  const pol = p.politics;
  if (!pol) return "Join politics first";
  if (pol.militaryRuler && pol.office >= 0) return "You rule by decree. No elections";
  const t = nextTarget(p);
  if (t === null) return "You don reach the top";
  if (pol.office >= 0 && pol.yearsLeft > 1) return "Wait for election year";
  const need = OFFICES[t].minConnections - (pol.anointed ? 25 : 0);
  if (p.stats.connections < need) return `Need ${need}+ connections`;
  if (p.age < (t === 5 ? 35 : 25)) return "You too small for this one";
  if (p.prison > 0) return "In prison";
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
  if (!m) return "Unknown";
  if (!p.politics) return "Join politics first";
  if (p.prison > 0) return "In prison";
  if (m.block) {
    const b = m.block(p);
    if (b) return b;
  }
  if (p.money < powerCost(p, m.base)) return `Need ${naira(powerCost(p, m.base))}`;
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
    case "machine": up("machine", 10); bump(p, "connections", 2); return "Your party structure dey grow. Ward chairmen don dey call you 'Oga' now.";
    case "kingmaker": up("machine", 6); pol.kingmaker += 1; bump(p, "connections", 4); return "Your boys win elections for other states. Now people dey say: 'Nothing happens here without his blessing.'";
    case "umpire":
      up("umpire", 12);
      p.nation.heat = clamp(p.nation.heat + 8);
      if (chance(0.12)) { up("umpire", -10); bump(p, "reputation", -12); return "Somebody leak your arrangement with the electoral officials. Big scandal. You lose some ground."; }
      return "Some friendly officials move into the right offices. The umpire don start to 'understand' you better.";
    case "courts": up("courts", 12); p.nation.heat = clamp(p.nation.heat + 5); return "Your lawyers dey enter judges' chambers like their own house.";
    case "military": up("military", 12); return "The service chiefs don dey greet you 'Your Excellency' even before you win.";
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Coup route (soldier)
// ---------------------------------------------------------------------------
export function canPlotCoup(p: Player): string | null {
  if (p.job?.id !== "soldier") return "Only a serving soldier fit plot coup";
  if (p.job.rank < 2) return "You must be at least a Captain";
  if (p.prison > 0) return "In prison";
  if (p.politics?.militaryRuler && p.politics.office >= 0) return "You already rule";
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
    return { text: "At dawn, martial music on every radio station. A voice announce: 'Fellow Nigerians...' You are now Military Head of State." };
  }
  const r = Math.random();
  if (r < 0.5) {
    p.job = null;
    return { text: `The plot leak. ${enterPrison(p, randInt(8, 18))}You was arrested for 'treason'. Dem say na coup, you say na lie.` };
  }
  if (r < 0.8) {
    p.alive = false;
    p.cause = "Executed after a failed coup";
    return { text: "The coup failed. Military tribunal find you guilty. Firing squad at dawn." };
  }
  p.job = null;
  bump(p, "reputation", -20);
  return { text: "The plot fizzle out before e begin. You was forced to retire in disgrace." };
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
  if (o < 0) return "You hold no office.";
  const n = p.nation;
  const mag = 4 + o * 1.4;
  const sc = scaleOf(p);
  const ap = (d: number) => { n.approval = clamp(n.approval + d); };
  switch (id) {
    case "power": n.economy = clamp(n.economy + mag * 1.4); ap(3); p.goodDeeds += 1; n.projects.push("Power plant"); return "Light finally reach whole communities. People actually clap.";
    case "roads": n.economy = clamp(n.economy + mag); ap(4); p.goodDeeds += 1; n.projects.push("Roads"); return "Roads get built. Real ones, with road marking. Traders dey happy.";
    case "health": n.welfare = clamp(n.welfare + mag * 1.3); ap(4); p.goodDeeds += 1; n.projects.push("Hospitals & schools"); return "Clinics get drugs and schools get chairs. Rare sight!";
    case "cash": n.welfare = clamp(n.welfare + mag * 1.5); ap(5); p.goodDeeds += 1; return "Cash reach poor families direct. Small leakage, but mostly e work.";
    case "army": n.security = clamp(n.security + mag * 1.6); ap(2); p.goodDeeds += 1; return "Better kit, better pay. Patrols increase and attacks reduce.";
    case "diversify": n.economy = clamp(n.economy + mag * 1.6); ap(3); p.goodDeeds += 2; n.projects.push("Diversification programme"); return "Farms, factories and startups get funding. Economy don get more legs.";
    case "contract": { const g = sc * rand(0.03, 0.06); addLoot(p, g); n.heat = clamp(n.heat + 10); n.economy = clamp(n.economy - 3); ap(-3); bump(p, "connections", 3); return `Your crony collect contract wey don inflate pass Third Mainland Bridge. Your cut: ${naira(g)}.`; }
    case "ghost": { const g = sc * rand(0.015, 0.03); addLoot(p, g); n.heat = clamp(n.heat + 6); ap(-2); return `A thousand ghost workers collect salary. You collect ${naira(g)}.`; }
    case "vote": { const g = sc * rand(0.04, 0.08); addLoot(p, g); n.heat = clamp(n.heat + 12); n.security = clamp(n.security - 4); ap(-4); return `You cash out the security vote: ${naira(g)}. Nobody dey ask question.`; }
    case "oilblock": { const g = sc * rand(0.08, 0.14); addLoot(p, g); n.heat = clamp(n.heat + 18); n.economy = clamp(n.economy - 4); ap(-5); return `One oil block land for your friend at 'special price'. Your thank-you: ${naira(g)}.`; }
    case "palliative": { const g = sc * rand(0.03, 0.05); addLoot(p, g); n.welfare = clamp(n.welfare - 7); n.heat = clamp(n.heat + 12); ap(-6); return `Warehouses full, people dey queue for hunger. You sell the stock for ${naira(g)}. #EndHunger dey trend.`; }
    case "gag": n.heat = clamp(n.heat - 8); ap(-5); return "Some journalists get 'invitation for questioning'. Fewer questions about your accounts.";
    case "cover": { const cost = p.loot * 0.04 + I(p, 5_000_000); p.money -= cost; n.heat = clamp(n.heat - 25); return `${naira(cost)} 'settle' the right people. The file just vanish.`; }
    case "appoint": bump(p, "connections", 5); n.heat = clamp(n.heat + 3); ap(-2); return "You appoint loyalists and pardon one friend. The elite club dey love you.";
    case "trip": {
      p.money += sc * 0.001;
      p.traveled = true;
      bump(p, "connections", 4); bump(p, "happiness", 4); n.approval = clamp(n.approval - 1);
      return "Photos at the summit, handshakes with world leaders, and dollar allowances for your bag.";
    }
    default: return "Nothing happened.";
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
    else if (pol.vpYears > 8) { pol.vp = false; pol.vpYears = 0; lines.push("Your time as Vice President don end."); }
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
    lines.push(`Your term as ${office.title} don end.`);
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
  return `${label} You are now ${OFFICES[target].title}!`;
}

const inOffice = (p: Player) => (p.politics?.office ?? -1) >= 0;
const civilianOffice = (p: Player) => inOffice(p) && !p.politics?.militaryRuler;

export const POLITICS_EVENTS: EventDef[] = [
  {
    id: "party_elders",
    title: "Party elders call",
    weight: (p) => (!p.politics && p.age >= 28 && p.stats.connections >= 30 && p.money > I(p, 5_000_000) ? 1.4 : 0),
    text: () => "Party elders invite you for one closed-door meeting. 'We don see potential for you. Politics na the next level.'",
    choices: (p) => [
      { label: "Join politics", sub: naira(I(p, 2_000_000)), disabled: p.money < I(p, 2_000_000) ? "Not enough cash" : false, run: (q) => joinPolitics(q) },
      { label: "Stay out of it", run: () => "You smile, shake hands, and carry your body comot." },
    ],
  },
  {
    id: "primary",
    valid: (p) => Boolean(p.politics),
    title: "Party primaries",
    weight: () => 0,
    text: (p, d) => `Before you face the voters you must win the party ticket for ${OFFICES[Number(d.target)].title}. Delegates dey wait for 'the thing'. Zoning this cycle favours the ${currentZone(p)}${currentZone(p) === playerZone(p) ? " (your side!)" : " (not your side)"}.`,
    choices: (p, d) => {
      const t = Number(d.target);
      const base = campaignCost(p, t);
      const pol = p.politics;
      const mach = pol?.machine ?? 0;
      const go = (text: string): { text: string; spawn: Pending[] } => ({ text, spawn: [evt("contest", { target: t })] });
      return [
        { label: "Buy the delegates (dollars, not naira)", sub: naira(base * 0.6), disabled: p.money < base * 0.6 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.6;
          if (chance(clamp(0.35 + mach / 200 + q.stats.connections / 300 + (q.politics?.anointed ? 0.25 : 0), 0.1, 0.9))) return go("The delegates choose you. 'Consensus candidate' dem call am.");
          return "Another aspirant pay more. You lose the primary.";
        } },
        { label: "Use your party machine", sub: mach >= 40 ? "Free" : "Need machine 40+", disabled: mach < 40 ? "Build the party machine first" : false, run: () => {
          if (chance(clamp(0.2 + mach / 150, 0.15, 0.9))) return go("Your ward chairmen deliver the delegates. Structure don work.");
          return "The machine no carry enough weight this time. You lose the primary.";
        } },
        { label: "Elders' consensus (the anointed)", sub: pol?.anointed || pol?.godfather ? "Needs godfather's blessing" : "Need a godfather", disabled: pol?.anointed || pol?.godfather ? false : "No godfather/anointing", run: () => {
          if (chance(0.82)) return go("The elders announce you as the consensus candidate. The other aspirants 'step down'.");
          return "A rival group of elders block the arrangement. You lose the ticket.";
        } },
        { label: "Defect: take another party's ticket", sub: naira(base * 0.2), disabled: p.money < base * 0.2 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.2;
          bump(q, "reputation", -8);
          if (q.politics) q.politics.defected = true;
          if (chance(0.62)) return go("You jump ship at midnight and collect the other party's ticket. Dem welcome you with open arms.");
          return "You leave your party, but the new one give the ticket to somebody else. Disaster.";
        } },
        { label: "Withdraw", run: () => "You decide to wait for better season." },
      ];
    },
  },
  {
    id: "contest",
    valid: (p) => Boolean(p.politics),
    title: "Campaign",
    weight: () => 0,
    text: (_p, d) => `You dey run for ${OFFICES[Number(d.target)].title}. Posters on every pole, jingles on every radio. How you wan play am?`,
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
        return { text: `${label} But you LOSE. Results announced and the crowd go quiet.` };
      };
      return [
        { label: "Run a modest campaign", sub: naira(base), disabled: p.money < base ? "Not enough cash" : false, run: (q) => { q.money -= base; return win(q, 0, "You campaign door to door."); } },
        { label: "Spend heavily (rice, cash, branded cloth)", sub: naira(base * 2), disabled: p.money < base * 2 ? "Not enough cash" : false, run: (q) => { q.money -= base * 2; return win(q, 0.22, "Vote buying be the whole strategy."); } },
        { label: "Rig it (thugs, ballot boxes)", sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.5;
          const caught = 0.3 * (1 - (q.politics?.umpire ?? 0) / 120);
          if (chance(caught)) { const r = enterPrison(q, randInt(2, 5)); return { text: `${r}Your rigging was exposed on live TV.` }; }
          bump(q, "reputation", -15);
          return win(q, 0.38 + (q.politics?.umpire ?? 0) / 300, "Ballot boxes appear from nowhere.");
        } },
        { label: "Let the electoral umpire 'adjust' the results", sub: (pol?.umpire ?? 0) >= 40 ? naira(base * 0.3) : "Need umpire control 40+", disabled: (pol?.umpire ?? 0) < 40 ? "Capture the umpire first" : p.money < base * 0.3 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.3;
          if (chance(0.08)) { bump(q, "reputation", -25); return { text: "The 'adjustment' catch on camera and go viral. Nobody fit believe your face." }; }
          bump(q, "reputation", -6);
          return win(q, 0.45, "Collation centres deliver numbers like magic.");
        } },
        { label: "Take a godfather's backing", sub: naira(base * 0.15), disabled: p.money < base * 0.15 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.15; if (q.politics) q.politics.godfather = true; return win(q, 0.3, "A godfather arrange everything. You go owe am."); } },
        { label: "Cancel", run: () => "You pull out of the race." },
      ];
    },
  },
  {
    id: "tribunal",
    valid: (p) => (p.politics?.office ?? -1) >= 4,
    title: "Election petition",
    weight: () => 0,
    text: () => "Your rival run go election tribunal. 'The election na sham!' The case dey court and the whole country dey watch.",
    choices: (p) => {
      const base = campaignCost(p, p.politics?.office ?? 4);
      const courts = p.politics?.courts ?? 0;
      const verdict = (q: Player, pr: number, win: string): string => {
        if (chance(clamp(pr, 0.1, 0.95))) { bump(q, "reputation", 2); return win; }
        leaveOffice(q, "");
        return "The tribunal nullify your election. Your certificate of return don withdraw. Chai!";
      };
      return [
        { label: "Hire a legion of SANs", sub: naira(base * 0.3), disabled: p.money < base * 0.3 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.3; return verdict(q, 0.6 + courts / 250, "Your lawyers shred the petition. Victory affirmed!"); } },
        { label: "Lean on the judiciary", sub: courts >= 40 ? "Heat +10" : "Need courts 40+", disabled: courts < 40 ? "Court the judiciary first" : false, run: (q) => { q.nation.heat = clamp(q.nation.heat + 10); return verdict(q, 0.88, "The panel throw out the petition in ten minutes flat."); } },
        { label: "Settle the petitioner", sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.5; return verdict(q, 0.78, "Your rival suddenly 'withdraw' the petition and join your cabinet."); } },
        { label: "Trust the process", run: (q) => verdict(q, 0.45 + courts / 300, "The tribunal affirm your victory. Justice dey work!") },
      ];
    },
  },
  {
    id: "reelect",
    valid: civilianOffice,
    title: "Re-election",
    weight: () => 0,
    text: (p) => `Your first term as ${officeTitle(p) ?? "official"} dey end. Approval: ${Math.round(p.nation.approval)}%. You wan go second term?`,
    choices: (p) => {
      const o = p.politics?.office ?? 0;
      const base = campaignCost(p, o);
      const chanceBase = 0.15 + p.nation.approval / 140 + (p.politics?.godfather ? 0.1 : 0) + (p.politics?.machine ?? 0) / 400 + (p.politics?.umpire ?? 0) / 300;
      const win = (q: Player, extra: number, msg: string) => {
        if (chance(clamp(chanceBase + extra, 0.05, 0.93)) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = OFFICES[o].term; bump(q, "reputation", 3); q.prestige += 1; return `${msg} You win second term!`; }
        leaveOffice(q, "");
        return `${msg} You lose. Time to hand over power.`;
      };
      return [
        { label: "Campaign on your record", sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.5; return win(q, 0, "You run on your record."); } },
        { label: "Spend heavily", sub: naira(base * 1.5), disabled: p.money < base * 1.5 ? "Not enough cash" : false, run: (q) => { q.money -= base * 1.5; return win(q, 0.2, "Rice and cash flow again."); } },
        { label: "Rig it", sub: naira(base * 0.3), disabled: p.money < base * 0.3 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.3;
          if (chance(0.25 * (1 - (q.politics?.umpire ?? 0) / 120))) { leaveOffice(q, ""); return `${enterPrison(q, randInt(2, 5))}Your rigging was exposed. Impeached and arrested.`; }
          bump(q, "reputation", -12);
          return win(q, 0.35, "Results was 'adjusted'.");
        } },
        { label: "Step down with dignity", run: (q) => { bump(q, "reputation", 8); leaveOffice(q, ""); return "You hand over peacefully. People go remember am."; } },
      ];
    },
  },
  {
    id: "termend",
    valid: civilianOffice,
    title: "Term limit",
    weight: () => 0,
    text: () => "You don reach your constitutional term limit. Some people for your circle dey whisper 'tenure elongation'.",
    choices: () => [
      { label: "Hand over power", run: (q) => { bump(q, "reputation", 6); leaveOffice(q, ""); return "You leave office. Dem fit build your statue."; } },
      { label: "Push for tenure elongation", run: (q) => { if (chance(0.4) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = 4; bump(q, "reputation", -15); q.nation.approval = clamp(q.nation.approval - 15); q.nation.heat = clamp(q.nation.heat + 20); return "The assembly bend the rules. Protests burst out but you remain."; } leaveOffice(q, ""); bump(q, "reputation", -10); return "The attempt fail and you leave in disgrace."; } },
    ],
  },
  {
    id: "protest",
    valid: inOffice,
    title: "#EndBadGovernance",
    weight: () => 0,
    text: () => "Young people dey on the streets with placards. Hashtags dey trend worldwide. TV stations dey show am live.",
    choices: () => [
      { label: "Listen and make concessions", run: (q) => { q.nation.approval = clamp(q.nation.approval + 8); q.nation.welfare = clamp(q.nation.welfare + 5); q.goodDeeds += 1; return "You meet the protesters, announce new measures, and calm return."; } },
      { label: "Crack down hard", run: (q) => { q.nation.approval = clamp(q.nation.approval - 12); q.nation.heat = clamp(q.nation.heat + 15); bump(q, "reputation", -12); return "Tear gas, arrests, and international condemnation."; } },
      { label: "Ignore am", run: (q) => { q.nation.approval = clamp(q.nation.approval - 5); return "The crowd thin out after one week, but the anger never go."; } },
    ],
  },
  {
    id: "coup",
    valid: civilianOffice,
    title: "Coup rumour",
    weight: () => 0,
    text: () => "Military radio dey chat for midnight. Officers dey move. One trusted aide whisper: 'Sir, tonight fit be the night.'",
    choices: (p) => [
      { label: "Pay off key generals", sub: naira(Math.max(I(p, 50_000_000), p.loot * 0.1)), run: (q) => { q.money -= Math.max(I(q, 50_000_000), q.loot * 0.1); q.nation.security = clamp(q.nation.security + 10); q.nation.heat = clamp(q.nation.heat - 10); return "The generals suddenly remember their loyalty. The coup fizzle out."; } },
      { label: "Trust your guards", run: (q) => { if (chance(0.5 + (q.politics?.military ?? 0) / 300)) return "Your guards hold the villa. The plotters was arrested."; leaveOffice(q, ""); moveTo(q, "abuja"); if (chance(0.35)) { q.alive = false; q.cause = "Killed in a military coup"; return "Soldiers storm the villa at dawn."; } return "You was removed from power. Months in detention before release."; } },
      { label: "Flee the country", run: (q) => { leaveOffice(q, ""); moveTo(q, "abroad"); bump(q, "reputation", -10); return "One jet to nowhere and new life abroad. Your enemies dey celebrate."; } },
    ],
  },
  {
    id: "counter_coup",
    valid: (p) => Boolean(p.politics?.militaryRuler && p.politics.office >= 0),
    title: "Counter-coup!",
    weight: () => 0,
    text: () => "Gunshots near the Villa. Another set of officers don decide say na their turn. Your radio go silent.",
    choices: (p) => [
      { label: "Pay the guards to fight", sub: naira(I(p, 200_000_000)), disabled: p.money < I(p, 200_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 200_000_000); if (chance(0.55)) { q.nation.heat = clamp(q.nation.heat - 10); return "Loyal troops crush the mutiny. Heads roll the next morning."; } leaveOffice(q, ""); return `${enterPrison(q, randInt(6, 14))}The mutineers win. You was arrested and detained.`; } },
      { label: "Surrender quietly", run: (q) => { leaveOffice(q, ""); return `${enterPrison(q, randInt(5, 12))}You was removed from office and put in detention.`; } },
      { label: "Escape through the back gate", run: (q) => { if (chance(0.4)) { q.alive = false; q.cause = "Killed in a counter-coup"; return "Dem catch you at the barracks gate. E end there."; } leaveOffice(q, ""); moveTo(q, "abroad"); return "You slip out in a borrowed Peugeot and cross the border. Exile dey wait."; } },
    ],
  },
  {
    id: "handover",
    valid: (p) => Boolean(p.politics?.militaryRuler && p.politics.office >= 0),
    title: "Hand over?",
    weight: () => 0,
    text: () => "The international community dey press for return to civil rule. Your advisers talk say: 'Sir, hand over and live as elder statesman.'",
    choices: () => [
      { label: "Hand over to civilians", run: (q) => { bump(q, "reputation", 12); bump(q, "connections", 10); leaveOffice(q, ""); if (!q.achievements.includes("Handed over power")) q.achievements.push("Handed over power"); return "You hand over the keys and return to the farm. The nation get democracy. One day, the elders go fit call you back."; } },
      { label: "Hold on small more", run: (q) => { q.nation.heat = clamp(q.nation.heat + 12); q.nation.approval = clamp(q.nation.approval - 6); return "You postpone the handover again. Pressure dey build."; } },
    ],
  },
  {
    id: "prison_hero",
    valid: (p) => Boolean(p.politics) || Boolean(p.flags.coupPlot),
    title: "Free at last",
    weight: () => 0,
    text: () => "The gates open after long years. Crowd dey wait outside: journalists, party men, ordinary people. 'Prisoner of conscience!' dem shout.",
    choices: () => [
      { label: "Walk out as a symbol of resistance", run: (q) => {
        bump(q, "reputation", 25); bump(q, "connections", 10); bump(q, "happiness", 15);
        if (!q.politics) q.politics = newPolitics();
        q.politics.hero = true;
        q.politics.machine = clamp(q.politics.machine + 8);
        if (!q.achievements.includes("Prisoner turned hero")) q.achievements.push("Prisoner turned hero");
        const spawn: Pending[] = q.stats.connections >= 45 || q.flags.exMilitaryRuler ? [evt("anointed")] : [];
        return { text: "The country now see you as hero. Your suffering don become your biggest political asset.", spawn };
      } },
      { label: "Slip out quietly and rebuild", run: (q) => { bump(q, "reputation", 6); return "You step out at dawn, hug your family, and decide to keep your head down."; } },
    ],
  },
  {
    id: "anointed",
    valid: (p) => Boolean(p.politics),
    title: "The elders' choice",
    weight: () => 0,
    text: () => "A delegation of retired generals, ex-governors and party chiefs visit you. 'Our country need person with your story. We don agree to back you for presidency.'",
    choices: () => [
      { label: "Accept their blessing", run: (q) => { if (q.politics) { q.politics.anointed = true; q.politics.godfather = true; q.politics.machine = clamp(q.politics.machine + 12); } bump(q, "connections", 8); return "You are now the anointed candidate. Some people call you puppet, but the doors open wide."; } },
      { label: "Decline. You go on your own", run: (q) => { bump(q, "reputation", 5); return "You thank them but choose independence. Respect, and harder road."; } },
    ],
  },
  {
    id: "crackdown",
    valid: (p) => Boolean(p.politics),
    title: "Regime crackdown",
    weight: (p) => (p.politics && p.age >= 30 && p.stats.reputation >= 55 && p.stats.connections >= 40 && !p.flags.exile && p.politics.office < 0 ? 1.1 : 0),
    text: () => "The ruling regime hate your criticism. Security men don dey ask questions about you. A friend call at night: 'Oga, comot from this country tonight.'",
    choices: () => [
      { label: "Go into exile abroad", run: (q) => { q.flags.exile = true; moveTo(q, "abroad"); bump(q, "reputation", 10); bump(q, "connections", 5); if (q.politics) q.politics.machine = clamp(q.politics.machine + 8); return "You escape across the border at night and become voice from exile. The diaspora love you."; } },
      { label: "Stay and speak out", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 8); return "You keep talking. The regime blink first and do nothing."; } if (q.politics) q.politics.hero = true; return `${enterPrison(q, randInt(3, 6))}You was arrested for 'sedition'. Your name become rallying cry.`; } },
      { label: "Make peace with the regime", run: (q) => { bump(q, "reputation", -12); bump(q, "connections", 3); q.money += I(q, 20_000_000); return "You accept one 'consultancy' contract. The regime smile. Your friends stop calling."; } },
    ],
  },
  {
    id: "exile_return",
    valid: (p) => Boolean(p.flags.exile) && p.state === "abroad",
    title: "The exile returns",
    weight: (p) => (p.flags.exile && p.state === "abroad" ? 6 : 0),
    text: () => "The regime don fall and democracy is back. Crowds at the airport dey hold your poster. 'Welcome home!'",
    choices: () => [
      { label: "Fly home as a hero", run: (q) => {
        delete q.flags.exile;
        moveTo(q, "lagos");
        bump(q, "reputation", 15); bump(q, "connections", 10);
        if (q.politics) { q.politics.hero = true; q.politics.machine = clamp(q.politics.machine + 10); }
        if (!q.achievements.includes("Returned from exile")) q.achievements.push("Returned from exile");
        return "You land to cheering crowds. Banners say: 'The people's champion'. Your political career don reborn.";
      } },
      { label: "Stay abroad, enjoy the good life", run: (q) => { delete q.flags.exile; bump(q, "happiness", 8); return "You decide say you don tire for Nigerian politics."; } },
    ],
  },
  {
    id: "running_mate",
    valid: (p) => Boolean(p.politics) && !p.politics!.vp && (p.politics?.office ?? -1) < 5,
    title: "Running mate offer",
    weight: (p) => (p.politics && p.politics.highest >= 4 && !p.politics.vp && p.politics.office < 5 ? 2 : 0),
    text: () => "A presidential candidate want you as running mate. 'Together we go win. You go be Vice President.'",
    choices: () => [
      { label: "Accept the ticket", run: (q) => { if (chance(0.55)) { if (q.politics) { q.politics.vp = true; q.politics.vpYears = 0; } bump(q, "reputation", 4); if (!q.achievements.includes("Vice President")) q.achievements.push("Vice President"); return "The ticket win! You are the Vice President. Keep your eyes on the principal's health."; } bump(q, "stress", 6); return "The ticket lose. You return to your old life."; } },
      { label: "Decline. Chase your own ambition", run: (q) => { bump(q, "reputation", 2); return "You say no. Your eyes dey on the top seat."; } },
    ],
  },
  {
    id: "succession",
    valid: (p) => Boolean(p.politics?.vp),
    title: "Constitutional moment",
    weight: () => 0,
    text: () => "Sad news from the Villa. The President don die (or too sick to continue). The constitution clear: you are next.",
    choices: () => [
      { label: "Take the oath of office", run: (q) => {
        const pol = q.politics!;
        pol.vp = false; pol.vpYears = 0;
        pol.office = 5; pol.highest = 5; pol.yearsLeft = 3; pol.terms = 1;
        q.nation = freshNation();
        q.nation.approval = 65;
        q.prestige += 6;
        bump(q, "reputation", 6);
        if (!q.achievements.includes("Became President")) q.achievements.push("Became President");
        return "You are sworn in as President. The nation dey mourn, and dey watch you closely.";
      } },
    ],
  },
  {
    id: "godfather_demand",
    valid: inOffice,
    title: "The godfather calls",
    weight: () => 0,
    text: () => "The man wey put you for office want him share. 'Remember who made you.'",
    choices: (p) => [
      { label: "Pay him", sub: naira(Math.max(I(p, 10_000_000), p.money * 0.15)), run: (q) => { q.money -= Math.max(I(q, 10_000_000), q.money * 0.15); bump(q, "connections", 3); return "Peace get price. He is content for now."; } },
      { label: "Tell him no", run: (q) => { q.nation.heat = clamp(q.nation.heat + 10); q.nation.approval = clamp(q.nation.approval - 6); if (q.politics) q.politics.godfather = false; return "He leak documents to the press. Wahala dey!"; } },
    ],
  },
  {
    id: "efcc",
    valid: (p) => p.loot > 0,
    title: "EFCC invitation",
    weight: () => 0,
    text: (p) => `EFCC investigators wan see you. Dem get documents tracing ${naira(p.loot)} in suspicious funds. Plenty politicians don survive worse. All na wetin you do next.`,
    choices: (p) => [
      { label: "Settle quietly", sub: naira(p.loot * 0.2), disabled: p.money < p.loot * 0.2 ? "Not enough cash" : false, run: (q) => { q.money -= q.loot * 0.2; q.nation.heat = clamp(q.nation.heat - 35); delete q.flags.efccWatch; return "Deal was made behind closed doors. The matter was 'resolved'."; } },
      { label: "Cry persecution (turn it political)", run: (q) => { if (chance(0.55)) { bump(q, "reputation", 10); q.nation.heat = clamp(q.nation.heat - 25); if (q.politics) q.politics.machine = clamp(q.politics.machine + 5); return "'Na political witch-hunt!' Your supporters storm the streets. The agency blink and slow down."; } bump(q, "reputation", -8); q.nation.heat = clamp(q.nation.heat + 8); return "Nobody believe the persecution story. The headlines get worse."; } },
      { label: "Defect to the ruling party", sub: p.politics ? "Case goes quiet" : "Need to be in politics", disabled: p.politics ? false : "Need to be in politics", run: (q) => { q.nation.heat = clamp(q.nation.heat - 40); bump(q, "reputation", -6); if (q.politics) { q.politics.machine = clamp(q.politics.machine + 5); q.politics.defected = true; } delete q.flags.efccWatch; return "You cross over to the ruling party. Welcome ceremony, new cap, and the case file go quiet. Dem say all sins dey wash for there."; } },
      { label: "Fight them in court", run: (q) => { if (chance(0.55 + (q.politics?.courts ?? 0) / 250)) { q.nation.heat = clamp(q.nation.heat - 20); bump(q, "reputation", -8); return "Judge adjourn the case to 2038. Typical."; } if (q.politics && q.politics.office >= 0) leaveOffice(q, ""); return `${enterPrison(q, randInt(6, 14))}You was convicted.`; } },
      { label: "Flee abroad", run: (q) => { if (q.politics && q.politics.office >= 0) leaveOffice(q, ""); moveTo(q, "abroad"); q.money -= q.money * 0.2; delete q.flags.efccWatch; return "You escape Nigeria with your assets. You are now a fugitive."; } },
    ],
  },
];
