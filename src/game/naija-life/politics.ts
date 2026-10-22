import { OFFICES } from "./data";
import { I, addLoot, bump, enterPrison, moveTo } from "./helpers";
import type { EventDef, Nation, Pending, Player } from "./types";
import { chance, clamp, naira, rand, randInt } from "./util";

export const freshNation = (): Nation => ({ economy: 50, security: 50, welfare: 45, approval: 55, heat: 0, projects: [] });

const evt = (id: string, data: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data });

export const officeTitle = (p: Player): string | null => (p.politics && p.politics.office >= 0 ? OFFICES[p.politics.office].title : null);
const scaleOf = (p: Player) => (p.politics && p.politics.office >= 0 ? OFFICES[p.politics.office].scale * Math.pow(p.index, 0.9) : 0);
const campaignCost = (p: Player, office: number) => Math.round(OFFICES[office].cost * Math.pow(p.index, 0.9));

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
  p.politics = { office: -1, yearsLeft: 0, terms: 0, godfather: false, highest: -1 };
  return "You bought the party forms and joined politics. The ward chairman shook your hand with both hands.";
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
  const t = nextTarget(p);
  if (t === null) return "You've reached the top";
  if (pol.office >= 0 && pol.yearsLeft > 1) return "Wait for election year";
  if (p.stats.connections < OFFICES[t].minConnections) return `Need ${OFFICES[t].minConnections}+ connections`;
  if (p.age < (t === 5 ? 35 : 25)) return "Too young";
  if (p.prison > 0) return "In prison";
  return null;
}

export function contestPending(p: Player): Pending | null {
  const t = nextTarget(p);
  if (t === null) return null;
  return evt("contest", { target: t });
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
  { id: "power", label: "Fix electricity supply", desc: "Real investment. Slow and tedious, but it works.", side: "good", minOffice: 0 },
  { id: "roads", label: "Build roads & bridges", desc: "Visible progress. Contractors will queue to see you.", side: "good", minOffice: 0 },
  { id: "health", label: "Fund hospitals & schools", desc: "Free care. Teachers get paid on time. People notice.", side: "good", minOffice: 0 },
  { id: "cash", label: "Conditional cash transfers", desc: "Pay the poorest families directly. Small leaks, big smiles.", side: "good", minOffice: 1 },
  { id: "army", label: "Fund the army & police", desc: "Better equipment, better pay. Insecurity falls.", side: "good", minOffice: 1 },
  { id: "diversify", label: "Diversify the economy", desc: "Agriculture, tech and manufacturing, beyond oil.", side: "good", minOffice: 2 },
  { id: "contract", label: "Award an inflated contract to a crony", desc: "Same road, ten times the price.", side: "corrupt", minOffice: 0 },
  { id: "ghost", label: "Put ghost workers on the payroll", desc: "A thousand names that never show up to work.", side: "corrupt", minOffice: 0 },
  { id: "vote", label: "Cash out the security vote", desc: "Nobody audits it. Nobody dares.", side: "corrupt", minOffice: 1 },
  { id: "oilblock", label: "Sell an oil block to a friend", desc: "A nice commission for a nice friend.", side: "corrupt", minOffice: 3 },
  { id: "palliative", label: "Warehouse the food palliatives", desc: "Hoard, then sell at a higher price.", side: "corrupt", minOffice: 2 },
  { id: "gag", label: "Gag the press", desc: "Fewer questions. More silence. Less approval.", side: "neutral", minOffice: 1 },
  { id: "cover", label: "Pay off investigators / cover tracks", desc: "Lowers EFCC heat. Costs real money.", side: "neutral", minOffice: 0, disabled: (p) => (p.nation.heat < 5 ? "No heat to cool" : false) },
  { id: "appoint", label: "Appoint cronies & pardon a friend", desc: "Loyalty has a price. Connections go up.", side: "neutral", minOffice: 1 },
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
    case "power": n.economy = clamp(n.economy + mag * 1.4); ap(3); p.goodDeeds += 1; n.projects.push("Power plant"); return "Light finally came to whole communities. People actually clapped.";
    case "roads": n.economy = clamp(n.economy + mag); ap(4); p.goodDeeds += 1; n.projects.push("Roads"); return "Roads got built. Real ones, with markings. Traders are thrilled.";
    case "health": n.welfare = clamp(n.welfare + mag * 1.3); ap(4); p.goodDeeds += 1; n.projects.push("Hospitals & schools"); return "Clinics have drugs and schools have chairs. A rare sight.";
    case "cash": n.welfare = clamp(n.welfare + mag * 1.5); ap(5); p.goodDeeds += 1; return "Cash reached poor families directly. A few 'leaks', but mostly it worked.";
    case "army": n.security = clamp(n.security + mag * 1.6); ap(2); p.goodDeeds += 1; return "Better kit, better pay. Patrols went up and attacks went down.";
    case "diversify": n.economy = clamp(n.economy + mag * 1.6); ap(3); p.goodDeeds += 2; n.projects.push("Diversification programme"); return "Farms, factories and startups got funding. The economy has more legs now.";
    case "contract": { const g = sc * rand(0.03, 0.06); addLoot(p, g); n.heat = clamp(n.heat + 10); n.economy = clamp(n.economy - 3); ap(-3); bump(p, "connections", 3); return `A crony got a contract inflated beyond belief. Your cut: ${naira(g)}.`; }
    case "ghost": { const g = sc * rand(0.015, 0.03); addLoot(p, g); n.heat = clamp(n.heat + 6); ap(-2); return `A thousand ghost workers collected salaries. You collected ${naira(g)}.`; }
    case "vote": { const g = sc * rand(0.04, 0.08); addLoot(p, g); n.heat = clamp(n.heat + 12); n.security = clamp(n.security - 4); ap(-4); return `You cashed out the security vote: ${naira(g)}. Nobody dares ask.`; }
    case "oilblock": { const g = sc * rand(0.08, 0.14); addLoot(p, g); n.heat = clamp(n.heat + 18); n.economy = clamp(n.economy - 4); ap(-5); return `An oil block went to your friend at a 'special price'. Your thank-you: ${naira(g)}.`; }
    case "palliative": { const g = sc * rand(0.03, 0.05); addLoot(p, g); n.welfare = clamp(n.welfare - 7); n.heat = clamp(n.heat + 12); ap(-6); return `The food warehouses were full while people queued. You sold the stock for ${naira(g)}. #EndHunger trends.`; }
    case "gag": n.heat = clamp(n.heat - 8); ap(-5); return "Some journalists were 'invited for questioning'. Fewer questions about your bank accounts.";
    case "cover": { const cost = p.loot * 0.04 + I(p, 5_000_000); p.money -= cost; n.heat = clamp(n.heat - 25); return `${naira(cost)} 'settled' the right people. The file mysteriously disappeared.`; }
    case "appoint": bump(p, "connections", 5); n.heat = clamp(n.heat + 3); ap(-2); return "You appointed loyalists and pardoned a friend. The elite club loves you.";
    case "trip": {
      p.money += sc * 0.001;
      p.traveled = true;
      bump(p, "connections", 4); bump(p, "happiness", 4); n.approval = clamp(n.approval - 1);
      return "Photos at the summit, handshakes with world leaders, and dollar allowances in your bag.";
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
  if (pol.office < 0) {
    p.nation.heat = clamp(p.nation.heat - 3);
    return;
  }
  const n = p.nation;
  const office = OFFICES[pol.office];
  p.money += office.salary * Math.pow(p.index, 0.9);

  // Indicators drift: insecurity and inflation eat at governments.
  n.economy = clamp(n.economy + rand(-4, 3));
  n.security = clamp(n.security + rand(-4, 2));
  n.welfare = clamp(n.welfare + rand(-3, 2));
  n.heat = clamp(n.heat - 3);
  const target = n.economy * 0.4 + n.security * 0.3 + n.welfare * 0.3;
  n.approval = clamp(n.approval * 0.6 + target * 0.4 + rand(-3, 3));
  pol.yearsLeft -= 1;

  if (pol.godfather && chance(0.5)) pending.push(evt("godfather_demand"));
  if (n.approval < 40 || n.welfare < 30) { if (chance(0.5)) pending.push(evt("protest")); }
  if (pol.office === 5 && n.security < 32 && n.heat > 45 && chance(0.4)) pending.push(evt("coup"));
  if (n.heat > 60 && chance(0.45)) pending.push(evt("efcc", { inOffice: true }));

  if (pol.yearsLeft <= 0) {
    if (pol.terms < 2) pending.push(evt("reelect"));
    else {
      pending.push(evt("termend"));
    }
    lines.push(`Your term as ${office.title} has ended.`);
  }
}

export function leaveOffice(p: Player, reason: string): string {
  const pol = p.politics;
  if (!pol) return "";
  const title = OFFICES[Math.max(0, pol.office)].title;
  pol.highest = Math.max(pol.highest, pol.office);
  pol.office = -1;
  pol.yearsLeft = 0;
  pol.terms = 0;
  bump(p, "connections", 3);
  p.flags[`ex_${title}`] = true;
  if (title === "President") p.flags.ex_president = true;
  p.nation = freshNation();
  if (p.loot > 0 && p.nation.heat >= 0) p.flags.efccWatch = Math.round(p.loot);
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
  p.nation = freshNation();
  p.prestige += target + 1;
  bump(p, "reputation", 4);
  if (target === 5 && !p.achievements.includes("Became President")) p.achievements.push("Became President");
  else if (target >= 4 && !p.achievements.includes("Became Governor")) p.achievements.push("Became Governor");
  return `${label} You are now ${OFFICES[target].title}!`;
}

export const POLITICS_EVENTS: EventDef[] = [
  {
    id: "party_elders",
    title: "Party elders call",
    weight: (p) => (!p.politics && p.age >= 28 && p.stats.connections >= 30 && p.money > I(p, 5_000_000) ? 1.4 : 0),
    text: () => "Party elders invite you to a closed-door meeting. \"We see potential in you. Politics is the next level.\"",
    choices: (p) => [
      { label: "Join politics", sub: naira(I(p, 2_000_000)), disabled: p.money < I(p, 2_000_000) ? "Not enough cash" : false, run: (q) => joinPolitics(q) },
      { label: "Stay out of it", run: () => "You smile, shake hands, and leave." },
    ],
  },
  {
    id: "contest",
    valid: (p) => Boolean(p.politics),
    title: "Campaign",
    weight: () => 0,
    text: (_p, d) => `You're running for ${OFFICES[Number(d.target)].title}. Posters on every pole, jingles on every radio. How do you want to play this?`,
    choices: (p, d) => {
      const t = Number(d.target);
      const base = campaignCost(p, t);
      const sway = 0.2 + p.stats.connections / 250 + p.stats.reputation / 500 + (p.politics?.godfather ? 0.2 : 0);
      const win = (q: Player, extra: number, label: string) => {
        if (chance(clamp(sway + extra, 0.05, 0.92) )) return winElection(q, t, label);
        bump(q, "stress", 12); bump(q, "reputation", -5);
        return `${label} But you LOST. Results were announced and the crowd went quiet.`;
      };
      return [
        { label: "Run a modest campaign", sub: naira(base), disabled: p.money < base ? "Not enough cash" : false, run: (q) => { q.money -= base; return win(q, 0, "You campaigned door to door."); } },
        { label: "Spend heavily (rice, cash, branded cloth)", sub: naira(base * 2), disabled: p.money < base * 2 ? "Not enough cash" : false, run: (q) => { q.money -= base * 2; return win(q, 0.22, "Vote buying was the whole strategy."); } },
        { label: "Rig it (thugs, ballot boxes)", sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.5;
          if (chance(0.3)) { const r = enterPrison(q, randInt(2, 5)); return `${r}Your rigging was exposed on live TV.`; }
          bump(q, "reputation", -15);
          return win(q, 0.38, "Ballot boxes appeared from nowhere.");
        } },
        { label: "Take a godfather's backing", sub: naira(base * 0.15), disabled: p.money < base * 0.15 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.15; if (q.politics) q.politics.godfather = true; return win(q, 0.3, "A godfather arranged everything. You owe him."); } },
        { label: "Cancel", run: () => "You pulled out of the race." },
      ];
    },
  },
  {
    id: "reelect",
    valid: (p) => (p.politics?.office ?? -1) >= 0,
    title: "Re-election",
    weight: () => 0,
    text: (p) => `Your first term as ${officeTitle(p) ?? "official"} is ending. Approval: ${Math.round(p.nation.approval)}%. Do you want a second term?`,
    choices: (p) => {
      const o = p.politics?.office ?? 0;
      const base = campaignCost(p, o);
      const chanceBase = 0.15 + p.nation.approval / 140 + (p.politics?.godfather ? 0.1 : 0);
      const win = (q: Player, extra: number, msg: string) => {
        if (chance(clamp(chanceBase + extra, 0.05, 0.93)) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = OFFICES[o].term; bump(q, "reputation", 3); q.prestige += 1; return `${msg} You won a second term!`; }
        leaveOffice(q, "");
        return `${msg} You lost. Time to hand over power.`;
      };
      return [
        { label: "Campaign on your record", sub: naira(base * 0.5), disabled: p.money < base * 0.5 ? "Not enough cash" : false, run: (q) => { q.money -= base * 0.5; return win(q, 0, "You ran on your record."); } },
        { label: "Spend heavily", sub: naira(base * 1.5), disabled: p.money < base * 1.5 ? "Not enough cash" : false, run: (q) => { q.money -= base * 1.5; return win(q, 0.2, "Rice and cash flowed again."); } },
        { label: "Rig it", sub: naira(base * 0.3), disabled: p.money < base * 0.3 ? "Not enough cash" : false, run: (q) => {
          q.money -= base * 0.3;
          if (chance(0.25)) { leaveOffice(q, ""); return `${enterPrison(q, randInt(2, 5))}Your rigging was exposed. Impeached and arrested.`; }
          bump(q, "reputation", -12);
          return win(q, 0.35, "Results were 'adjusted'.");
        } },
        { label: "Step down with dignity", run: (q) => { bump(q, "reputation", 8); leaveOffice(q, ""); return "You handed over peacefully. People remember it."; } },
      ];
    },
  },
  {
    id: "termend",
    valid: (p) => (p.politics?.office ?? -1) >= 0,
    title: "Term limit",
    weight: () => 0,
    text: () => "Your constitutional term limit has been reached. Some in your circle suggest 'tenure elongation'.",
    choices: () => [
      { label: "Hand over power", run: (q) => { bump(q, "reputation", 6); leaveOffice(q, ""); return "You left office. Statues may be built."; } },
      { label: "Push for tenure elongation", run: (q) => { if (chance(0.4) && q.politics) { q.politics.terms = 2; q.politics.yearsLeft = 4; bump(q, "reputation", -15); q.nation.approval = clamp(q.nation.approval - 15); q.nation.heat = clamp(q.nation.heat + 20); return "The assembly bent the rules. Protests erupted, but you stayed."; } leaveOffice(q, ""); bump(q, "reputation", -10); return "The attempt failed and you left in disgrace."; } },
    ],
  },
  {
    id: "protest",
    valid: (p) => (p.politics?.office ?? -1) >= 0,
    title: "#EndBadGovernance",
    weight: () => 0,
    text: () => "Young people are on the streets with placards. Hashtags are trending worldwide. The TV stations are showing it live.",
    choices: () => [
      { label: "Listen and make concessions", run: (q) => { q.nation.approval = clamp(q.nation.approval + 8); q.nation.welfare = clamp(q.nation.welfare + 5); q.goodDeeds += 1; return "You met the protesters, announced new measures, and calm returned."; } },
      { label: "Crack down hard", run: (q) => { q.nation.approval = clamp(q.nation.approval - 12); q.nation.heat = clamp(q.nation.heat + 15); bump(q, "reputation", -12); return "Tear gas, arrests, and international condemnation."; } },
      { label: "Ignore it", run: (q) => { q.nation.approval = clamp(q.nation.approval - 5); return "The crowd thinned after a week, but the anger hasn't gone."; } },
    ],
  },
  {
    id: "coup",
    valid: (p) => (p.politics?.office ?? -1) >= 0,
    title: "Coup rumour",
    weight: () => 0,
    text: () => "Military radio chatter at midnight. Officers are moving. A trusted aide whispers: \"Sir, tonight might be the night.\"",
    choices: (p) => [
      { label: "Pay off key generals", sub: naira(Math.max(I(p, 50_000_000), p.loot * 0.1)), run: (q) => { q.money -= Math.max(I(q, 50_000_000), q.loot * 0.1); q.nation.security = clamp(q.nation.security + 10); q.nation.heat = clamp(q.nation.heat - 10); return "The generals suddenly remembered their loyalty. The coup fizzled."; } },
      { label: "Trust your guards", run: (q) => { if (chance(0.5)) return "Your guards held the villa. The plotters were arrested."; leaveOffice(q, ""); moveTo(q, "abuja"); if (chance(0.35)) { q.alive = false; q.cause = "Killed in a military coup"; return "Soldiers stormed the villa at dawn."; } return "You were removed from power. You spent months in detention before release."; } },
      { label: "Flee the country", run: (q) => { leaveOffice(q, ""); moveTo(q, "abroad"); bump(q, "reputation", -10); return "A jet to nowhere and a new life abroad. Your enemies are celebrating."; } },
    ],
  },
  {
    id: "efcc",
    valid: (p) => p.loot > 0,
    title: "EFCC invitation",
    weight: () => 0,
    text: (p) => `EFCC investigators want to see you. They have documents tracing ${naira(p.loot)} in suspicious funds.`,
    choices: (p) => [
      { label: "Settle quietly", sub: naira(p.loot * 0.2), disabled: p.money < p.loot * 0.2 ? "Not enough cash" : false, run: (q) => { q.money -= q.loot * 0.2; q.nation.heat = clamp(q.nation.heat - 35); delete q.flags.efccWatch; return "A deal was made behind closed doors. The matter was 'resolved'."; } },
      { label: "Fight them in court", run: (q) => { if (chance(0.55)) { q.nation.heat = clamp(q.nation.heat - 20); bump(q, "reputation", -8); return "Judge adjourned the case to 2038. Typical."; } if (q.politics) leaveOffice(q, ""); return `${enterPrison(q, randInt(6, 14))}You were convicted.`; } },
      { label: "Flee abroad", run: (q) => { if (q.politics && q.politics.office >= 0) leaveOffice(q, ""); moveTo(q, "abroad"); q.money -= q.money * 0.2; delete q.flags.efccWatch; return "You escaped Nigeria with your assets. You are now a fugitive."; } },
    ],
  },
  {
    id: "godfather_demand",
    valid: (p) => (p.politics?.office ?? -1) >= 0,
    title: "The godfather calls",
    weight: () => 0,
    text: () => "The man who put you in office wants his share. \"Remember who made you.\"",
    choices: (p) => [
      { label: "Pay him", sub: naira(Math.max(I(p, 10_000_000), p.money * 0.15)), run: (q) => { q.money -= Math.max(I(q, 10_000_000), q.money * 0.15); bump(q, "connections", 3); return "Peace has a price. He is content for now."; } },
      { label: "Tell him no", run: (q) => { q.nation.heat = clamp(q.nation.heat + 10); q.nation.approval = clamp(q.nation.approval - 6); if (q.politics) q.politics.godfather = false; return "He leaked documents to the press. Messy."; } },
    ],
  },
];
