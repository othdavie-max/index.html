/**
 * Your party. Four factions want different things, a challenger can contest your primary, and your Vice President
 * may decide he would rather be president than your deputy. All people are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";

export const FACTIONS = [
  { id: "north", label: "Northern bloc", wants: "ministries and security spending for the north" },
  { id: "south", label: "Southern bloc", wants: "ports, power and contracts for the south" },
  { id: "youth", label: "Youth wing", wants: "jobs, a clean image and a seat at the table" },
  { id: "oldguard", label: "Old guard", wants: "respect, party offices and the old way of doing things" },
] as const;
export type FactionId = (typeof FACTIONS)[number]["id"];

export function partyMonthly(s: FixState, rng: Rng) {
  const P = s.party;
  const gov = (z: string[]) => { const gs = s.governors.filter((g) => z.includes(g.zone)); return gs.length ? gs.reduce((a, g) => a + g.relation, 0) / gs.length : 50; };
  const hw = Object.values(s.cabinet.members).filter((m) => m?.faction === "heavyweight");
  const hwIn = (zs: string[]) => hw.filter((m) => zs.includes(m!.zone)).length;
  const target: Record<FactionId, number> = {
    north: 35 + 0.35 * (gov(["NW", "NE", "NC"]) - 40) + 8 * hwIn(["NW", "NE", "NC"]) + (s.staff.vp?.kind === "regional" ? 6 : 0),
    south: 35 + 0.35 * (gov(["SW", "SE", "SS"]) - 40) + 8 * hwIn(["SW", "SE", "SS"]),
    youth: 30 + 0.5 * (s.groups.youth - 30) + (s.gov.corruption < 60 ? 6 : -6),
    oldguard: 30 + 4 * Object.values(s.cabinet.members).filter((m) => m && (m.faction === "loyalist" || m.faction === "crony")).length + 0.2 * (s.backers.reduce((a, b) => a + b.mood, 0) / Math.max(1, s.backers.length) - 50),
  };
  for (const f of FACTIONS) P[f.id] = clamp100(P[f.id] + 0.06 * (target[f.id] - P[f.id]) + rng.normal(0, 0.5));
  // the VP: ambition grows, especially in later terms and if you sideline him
  const vp = s.staff.vp;
  if (vp) {
    P.vpAmbition = clamp100(P.vpAmbition + (s.term >= 2 ? 1.1 : 0.45) + (s.flags.vpSidelined ? 0.8 : 0) - (vp.kind === "loyalist" ? 0.3 : 0) + (s.home?.illness ? 0.6 : 0));
    if (s.flags.vpSidelined) vp.loyalty = Math.max(0, vp.loyalty - 0.4);
  }
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  const weak = FACTIONS.map((f) => ({ f, v: P[f.id] })).sort((a, b) => a.v - b.v)[0];
  if (weak.v < 33 && !open("factionDemand") && s.month >= 6 && s.month - Number(s.flags.lastFaction ?? -99) >= 10 && rng.chance(0.2)) { s.flags.lastFaction = s.month; s.flags.factionId = weak.f.id; createEvent(s, "factionDemand", "NG-FC"); }
  if (!open("primary") && s.month - s.termStart === 38 && s.flags[`primary:${s.term}`] === undefined && s.term < 4) { s.flags[`primary:${s.term}`] = s.month; createEvent(s, "primary", "NG-FC"); }
  if (vp && P.vpStage === 0 && P.vpAmbition >= 62 && !open("vpDistance")) { P.vpStage = 1; createEvent(s, "vpDistance", "NG-FC"); }
  if (vp && P.vpStage === 1 && P.vpAmbition >= 88 && vp.loyalty < 45 && !open("vpDistance")) {
    P.vpStage = 2;
    s.enemies.push({ id: `vp-${s.month}`, name: vp.name, reason: "Your own vice president, who now wants your job", portrait: vp.portrait, plan: "rival", power: 60, grudge: 85, zone: "NC", status: "active", since: s.month });
    s.rival.popularity = clamp100(s.rival.popularity + 6); s.assembly.support = clamp100(s.assembly.support - 5);
    pushNews(s, { source: `vpdefect:${s.month}`, headline: `Vice President ${vp.name} resigns and joins the opposition`, body: "He says the president 'has lost the confidence of the party'.", tone: "bad" });
    s.timeline.push({ month: s.month, title: "Your vice president defected", text: vp.name, tone: "bad", chain: "vp" });
    s.staff.vp = null;
  }
}

const fac = (s: FixState) => FACTIONS.find((f) => f.id === s.flags.factionId);
export const PARTY_TEMPLATES = [
  {
    id: "factionDemand", kind: "request" as const, urgency: 3,
    title: (s: FixState) => `The ${fac(s)?.label ?? "party faction"} is restless`,
    cause: (s: FixState) => `Leaders of the ${fac(s)?.label.toLowerCase()} (loyalty ${Math.round(s.party[fac(s)?.id ?? "north"])}/100) came to see you. They want ${fac(s)?.wants}. "We do not feel heard, Mr President. There are other parties."`,
    options: [
      { id: "seat", label: "Give them a seat at the table", explain: "A big role for their leader.", cost: 0, tradeoff: "Other factions will want the same.", unc: "low" as const, chance: () => 0.9, win: { assembly: 3, run: (s: FixState) => { const f = fac(s); if (f) { s.party[f.id] = clamp100(s.party[f.id] + 26); for (const o of FACTIONS) if (o.id !== f.id) s.party[o.id] = clamp100(s.party[o.id] - 3); } return "Their leader was named to a committee that does not exist yet. They went home cheering."; } }, lose: {}, winText: "", loseText: "" },
      { id: "money", label: "Send contracts and cash", explain: "Pay for peace.", cost: 30, tradeoff: "Corruption.", unc: "low" as const, chance: () => 0.95, win: { corruption: 1, evidence: 2, run: (s: FixState) => { const f = fac(s); if (f) s.party[f.id] = clamp100(s.party[f.id] + 22); return "The envelopes were gratefully received."; } }, lose: {}, winText: "", loseText: "" },
      { id: "listen", label: "Promise to consult them from now on", explain: "Words and a regular meeting.", cost: 0, tradeoff: "They will check.", unc: "medium" as const, chance: (s: FixState) => 0.4 + 0.4 * (s.gov.trust / 100), win: { run: (s: FixState) => { const f = fac(s); if (f) s.party[f.id] = clamp100(s.party[f.id] + 10); return "They accepted, for now."; } }, lose: { run: (s: FixState) => { const f = fac(s); if (f) s.party[f.id] = clamp100(s.party[f.id] - 5); return "They called it 'the same old promises'."; } }, winText: "", loseText: "" },
    ],
    expire: { assembly: -3, run: (s: FixState) => { const f = fac(s); if (f) s.party[f.id] = clamp100(s.party[f.id] - 8); return undefined; } }, expireText: () => "They left unhappy.",
  },
  {
    id: "primary", kind: "story" as const, urgency: 2,
    title: () => "A challenger enters your party's primary",
    cause: (s: FixState) => `A popular governor from your own party has declared against you. Delegates are being courted with cash and promises. If the party is split at the primary, it will cost you votes in the general election. Your party standing is ${Math.round((s.party.north + s.party.south + s.party.youth + s.party.oldguard) / 4)}/100.`,
    options: [
      { id: "court", label: "Court the delegates with money and favours", explain: "The traditional way.", cost: 40, tradeoff: "Corruption.", unc: "medium" as const, chance: (s: FixState) => 0.5 + 0.3 * ((s.party.north + s.party.south + s.party.oldguard) / 300), win: { corruption: 0.8, run: (s: FixState) => { s.flags.primaryHit = 0; return "You won the primary with 78% of the delegates."; } }, lose: { run: (s: FixState) => { s.flags.primaryHit = 3; return "You won, but narrowly, and the party looks divided."; } }, winText: "", loseText: "" },
      { id: "debate", label: "Win on the merits at a party debate", explain: "Trust your record.", cost: 0, tradeoff: "Risky if your record is poor.", unc: "high" as const, chance: (s: FixState) => 0.3 + 0.5 * (s.gov.approval / 100), win: { trust: 2, run: (s: FixState) => { s.flags.primaryHit = 0; return "Your record spoke for itself. The challenger conceded gracefully."; } }, lose: { trust: -2, run: (s: FixState) => { s.flags.primaryHit = 4; return "He out-argued you. You won, but the party saw how close it was."; } }, winText: "", loseText: "" },
      { id: "block", label: "Disqualify him on a technicality", explain: "Use the party rules.", cost: 5, tradeoff: "Looks authoritarian.", unc: "high" as const, chance: () => 0.55, win: { democracy: -3, run: (s: FixState) => { s.flags.primaryHit = 1; return "The party secretary found a missing signature."; } }, lose: { democracy: -3, trust: -3, run: (s: FixState) => { s.flags.primaryHit = 5; return "The press called it a stitch-up. Half the delegates were furious."; } }, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { s.flags.primaryHit = 3; return "The party decided without you."; } }, expireText: () => "",
  },
  {
    id: "vpDistance", kind: "power" as const, urgency: 2,
    title: (s: FixState) => `${s.staff.vp?.name ?? "Your vice president"} is distancing himself from you`,
    cause: (s: FixState) => `The VP has started giving speeches that do not mention you. His people say he is 'the future of the party'. Ambition ${Math.round(s.party.vpAmbition)}/100, loyalty ${Math.round(s.staff.vp?.loyalty ?? 50)}/100.`,
    options: [
      { id: "promote", label: "Give him a bigger role", explain: "A ministry or a major project.", cost: 0, tradeoff: "He gets stronger.", unc: "medium" as const, chance: () => 0.7, win: { assembly: 2, run: (s: FixState) => { s.party.vpAmbition = 40; s.party.vpStage = 0; if (s.staff.vp) s.staff.vp.loyalty = Math.min(100, s.staff.vp.loyalty + 20); return "He was named to lead a major initiative. For now he is grateful."; } }, lose: { run: (s: FixState) => { s.party.vpAmbition += 6; return "He took the role and asked for more."; } }, winText: "", loseText: "" },
      { id: "talk", label: "Have a frank private talk", explain: "Remind him who is president.", cost: 0, tradeoff: "He may resent it.", unc: "high" as const, chance: (s: FixState) => 0.3 + 0.4 * ((s.staff.vp?.loyalty ?? 40) / 100), win: { run: (s: FixState) => { s.party.vpAmbition = Math.max(0, s.party.vpAmbition - 15); s.party.vpStage = 0; return "He apologised and said it was a misunderstanding."; } }, lose: { run: (s: FixState) => { if (s.staff.vp) s.staff.vp.loyalty = Math.max(0, s.staff.vp.loyalty - 8); return "He left the meeting without saying a word."; } }, winText: "", loseText: "" },
      { id: "sideline", label: "Strip his staff and his motorcade", explain: "Show who is boss.", cost: 0, tradeoff: "A wounded VP is dangerous.", unc: "medium" as const, chance: () => 0.9, win: { elite: -2, run: (s: FixState) => { s.flags.vpSidelined = s.month; if (s.staff.vp) s.staff.vp.loyalty = Math.max(0, s.staff.vp.loyalty - 20); s.party.vpAmbition += 8; return "He now arrives at events in a hired car. He has not said a word in public. That is the problem."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { s.party.vpAmbition += 8; if (s.staff.vp) s.staff.vp.loyalty = Math.max(0, s.staff.vp.loyalty - 8); return undefined; } }, expireText: () => "He read your silence as weakness.",
  },
];
void nb;
