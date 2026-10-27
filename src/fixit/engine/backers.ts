/**
 * Backers. The people who paid for your campaign want something back: ministries, contracts, respect. Give it to them
 * and they steal and demand more. Refuse and fill the cabinet with qualified strangers, and they turn on you:
 * sponsored protests, bandits in their zone, a blocked Assembly and leaks to the press. All people are fictional.
 */
import { subRng, type Rng } from "../../game/engine/rng";
import type { AideKind, Backer, FixState, Faction, Portfolio } from "./types";
import { clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";

export const BACKER_DEFS: Omit<Backer, "mood" | "owed">[] = [
  { id: "godfather", name: "Chief Obiora 'Ozo' Eze", title: "The Godfather", zone: "SE", power: 1.2, bio: "Paid for your campaign planes and the posters in every ward. Sits at the head of the table at every party meeting." },
  { id: "kingmaker", name: "Alhaji Danladi Mai-Gida", title: "The Northern Kingmaker", zone: "NW", power: 1.0, bio: "Delivered three states' worth of votes and a river of cash. Receives governors in his compound on Fridays." },
  { id: "financier", name: "Otunba Kayode Bakare", title: "The Lagos Financier", zone: "SW", power: 0.9, bio: "Bankrolled your TV ads and your private jet. Owns half a port and wants the other half." },
];

export function initBackers(s: FixState) {
  const rng = subRng(s.meta.seed, "backers");
  s.backers = BACKER_DEFS.map((d) => ({ ...d, mood: Math.round(rng.range(62, 78)), owed: Math.round(rng.range(60, 140)) }));
}
export const backerOf = (s: FixState, id: string) => s.backers.find((b) => b.id === id);
export const mood = (s: FixState, id: string, d: number) => { const b = backerOf(s, id); if (b) b.mood = clamp100(b.mood + d); };
export const moodAll = (s: FixState, d: number) => { for (const b of s.backers) b.mood = clamp100(b.mood + d * b.power); };
export const backerLabel = (b: Backer) => (b.mood >= 75 ? "Devoted" : b.mood >= 55 ? "Content" : b.mood >= 35 ? "Restless" : b.mood >= 20 ? "Furious" : "At war with you");

/** the effect of who you hire on the backers */
export function hireMood(faction: Faction | undefined, hired: boolean): number {
  const d = faction === "crony" ? 9 : faction === "loyalist" ? 5 : faction === "heavyweight" ? 1 : faction === "technocrat" ? -7 : 0;
  return hired ? d : -d * 0.9;
}
export function cosMood(kind: AideKind): number { return kind === "friend" ? 10 : kind === "chieftain" ? 10 : kind === "technocrat" ? -8 : kind === "general" ? -2 : 1; }
export const backerSupport = (s: FixState) => (s.backers ?? []).reduce((a, b) => a + Math.max(-4, Math.min(4, (b.mood - 50) / 10)) * b.power, 0);
export const worstBacker = (s: FixState) => [...(s.backers ?? [])].sort((a, b) => a.mood - b.mood)[0];

const cronyMinisters = (s: FixState) => Object.values(s.cabinet.members).filter((m) => m && (m.faction === "crony" || m.faction === "loyalist") && m.integrity < 48);

export function backersMonthly(s: FixState, rng: Rng) {
  const P = s.rule;
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  for (const b of s.backers) {
    b.mood = clamp100(b.mood + 0.03 * (52 - b.mood) + rng.normal(0, 0.6));
    if (b.mood < 30) {
      const w = (30 - b.mood) / 30;
      P.streetAnger = clamp100(P.streetAnger + 0.9 * w * b.power);
      s.assembly.support = clamp100(s.assembly.support - 0.7 * w * b.power);
      for (const [id, r] of Object.entries(s.regions)) if (id.length && zoneOfRegion(id) === b.zone) r.insecurity = clamp100(r.insecurity + 0.5 * w);
      if (rng.chance(0.2)) pushNews(s, { source: `backer:${b.id}:${s.month}`, headline: sabotageHeadline(b, rng), body: `${b.name} denies involvement.`, tone: "bad" });
    }
  }
  const angry = s.backers.filter((b) => b.mood < 30);
  if (angry.length && !open("backerSabotage") && s.month - Number(s.flags.lastSab ?? -9) >= 5 && rng.chance(0.12 + 0.1 * angry.length)) { s.flags.lastSab = s.month; createEvent(s, "backerSabotage", "NG-FC"); }
  const owing = s.backers.filter((b) => b.owed > 10 && b.mood < 60);
  if (owing.length && !open("backerDemand") && s.month >= 4 && s.month - Number(s.flags.lastDemand ?? -9) >= 8 && rng.chance(0.1)) { s.flags.lastDemand = s.month; createEvent(s, "backerDemand", "NG-FC"); }
  const bad = cronyMinisters(s);
  if (bad.length && !open("cronyLoot") && s.month - Number(s.flags.lastLoot ?? -9) >= 7 && rng.chance(0.08)) { s.flags.lastLoot = s.month; s.flags.lootPort = bad[0]!.portfolio; createEvent(s, "cronyLoot", "NG-FC"); }
}
const ZONE: Record<string, string> = {};
function zoneOfRegion(id: string) { return ZONE[id] ?? (ZONE[id] = zoneLookup(id)); }
import { STATE_BY_ID } from "../../game/data/states";
function zoneLookup(id: string) { return STATE_BY_ID[id]?.zone ?? ""; }
const HEAD = ["Sponsored 'youth protests' block roads in the capital: organisers deny being paid", "Bandits 'suddenly' multiply in a political stronghold after a party row", "Anonymous dossier on the presidency lands in newsrooms", "Senators stay away from the chamber: 'a matter of principle'", "Market women march with identical banners printed overnight"];
function sabotageHeadline(b: Backer, rng: Rng) { return rng.pick(HEAD).replace("a political stronghold", `${b.zone === "NW" ? "the North-West" : b.zone === "SE" ? "the South-East" : "the South-West"}`); }

const bname = (s: FixState, id?: unknown) => backerOf(s, String(id ?? s.flags.demandBacker ?? s.flags.sabBacker ?? ""))?.name ?? "Your biggest backer";
const lootMin = (s: FixState) => s.cabinet.members[s.flags.lootPort as Portfolio];

export const BACKER_TEMPLATES = [
  {
    id: "backerDemand", kind: "request" as const, urgency: 3,
    onCreate: (s: FixState) => { const b = [...s.backers].filter((x) => x.owed > 10).sort((a, b2) => a.mood - b2.mood)[0]; if (b) s.flags.demandBacker = b.id; },
    title: (s: FixState) => `${bname(s, s.flags.demandBacker)} wants his money back, with interest`,
    cause: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); return `${b ? b.name : "A backer"} spent about ${nb(b?.owed ?? 80)} getting you elected. He is not asking for a refund. He wants road contracts, import licences and 'a few appointments'. "Politics is investment, Mr President."`; },
    options: [
      { id: "pay", label: "Give him the contracts", explain: "Contracts at inflated prices, no questions.", cost: 40, tradeoff: "Money leaks, and he will be back.", unc: "low" as const, chance: () => 0.95, win: { corruption: 1.5, evidence: 4, assembly: 3, run: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); if (b) { b.mood = clamp100(b.mood + 22); b.owed = Math.max(0, b.owed - 45); } return `${b?.name ?? "He"} is delighted. The contracts will cost the treasury far more than the road is worth.`; } }, lose: { corruption: 1.5 }, winText: "", loseText: "" },
      { id: "partial", label: "Give a little, promise more later", explain: "Buy time with a small contract and big smiles.", cost: 10, tradeoff: "He is a patient man, but not that patient.", unc: "medium" as const, chance: (s: FixState) => 0.5 + 0.2 * (s.gov.approval / 100), win: { run: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); if (b) { b.mood = clamp100(b.mood + 8); b.owed = Math.max(0, b.owed - 12); } return "He accepted the 'first instalment' with a cold smile."; } }, lose: { run: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); if (b) b.mood = clamp100(b.mood - 8); return "He saw through it: 'I did not spend that money to be patient.'"; } }, winText: "", loseText: "" },
      { id: "refuse", label: "Refuse: 'I owe the nation, not you'", explain: "A clean break. The press will love it.", cost: 0, tradeoff: "Expect him to make your life very difficult.", unc: "medium" as const, chance: () => 0.9, win: { trust: 4, mods: { procurement: 1.5 }, dur: 10, run: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); if (b) { b.mood = clamp100(b.mood - 25); b.owed = 0; } return `${b?.name ?? "He"} left your office without a handshake. Newspapers call you 'a president who cannot be bought'. He will not forget this.`; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { const b = backerOf(s, String(s.flags.demandBacker)); if (b) b.mood = clamp100(b.mood - 12); return "He took your silence as an insult."; } }, expireText: () => "He took your silence as an insult.",
  },
  {
    id: "backerSabotage", kind: "power" as const, urgency: 1,
    onCreate: (s: FixState) => { const b = worstBacker(s); if (b) s.flags.sabBacker = b.id; },
    title: (s: FixState) => `${bname(s, s.flags.sabBacker)} is paying to make you look bad`,
    cause: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); return `Your man in the party tells you what everyone suspects: ${b?.name ?? "a former backer"} (${b?.title ?? ""}) is funding rent-a-crowd protests, whispering to journalists and quietly letting trouble grow in the ${b?.zone === "NW" ? "North-West" : b?.zone === "SE" ? "South-East" : "South-West"}. "You hired strangers over the people who made you, Sir." Street anger is ${Math.round(s.rule.streetAnger)}/100.`; },
    options: [
      { id: "reconcile", label: "Go to his house and make peace", explain: "A private visit, a gift, some contracts.", cost: 50, tradeoff: "It sets a precedent: threaten and be paid.", unc: "medium" as const, chance: () => 0.7, win: { corruption: 1, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) b.mood = clamp100(b.mood + 38); s.rule.streetAnger = clamp100(s.rule.streetAnger - 6); return `${b?.name ?? "He"} receives you like a prodigal son. The sponsored protests stop overnight.`; } }, lose: { run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) b.mood = clamp100(b.mood + 8); return "He took the gifts and kept the pressure on."; } }, winText: "", loseText: "" },
      { id: "expose", label: "Expose him: leak how he got his contracts", explain: "Turn the public against him.", cost: 5, tradeoff: "He has dirt on you too.", unc: "high" as const, chance: (s: FixState) => (s.me.evidence < 30 ? 0.65 : 0.35), win: { trust: 4, assembly: -2, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) { b.mood = 48; b.power *= 0.6; } return `The press feasts on his secrets. ${b?.name ?? "He"} is humiliated and much less powerful. He is also still angry.`; } }, lose: { evidence: 12, scandal: 1, trust: -3, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) b.mood = clamp100(b.mood - 12); return "He leaked your own old dealings first. Now it is a mud-fight."; } }, winText: "", loseText: "" },
      { id: "security", label: "Send the security agencies after his people", explain: "Arrests for 'incitement'.", cost: 10, tradeoff: "Looks like political persecution.", unc: "high" as const, chance: () => 0.55, win: { democracy: -4, anger: -6, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) { b.mood = clamp100(b.mood + 5); b.power *= 0.7; } return "Three of his organisers were arrested. The crowds thinned. He is scared, for now."; } }, lose: { democracy: -4, anger: 8, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) b.mood = clamp100(b.mood - 10); return "The arrests backfired: he is now a 'victim of persecution'."; } }, winText: "", loseText: "" },
    ],
    expire: { anger: 8, assembly: -3, run: (s: FixState) => { const b = backerOf(s, String(s.flags.sabBacker)); if (b) b.mood = clamp100(b.mood - 6); return "The campaign against you grew louder."; } }, expireText: () => "The campaign against you grew louder.",
  },
  {
    id: "cronyLoot", kind: "scandal" as const, urgency: 2,
    title: (s: FixState) => `${lootMin(s)?.name ?? "A minister"} is stealing with both hands`,
    cause: (s: FixState) => { const m = lootMin(s); return `${m?.name ?? "A minister"}, one of the people who 'fought for you', is awarding contracts to relatives and has built three houses in Abuja. The accountant general quietly flagged it. If you stop him, he and his sponsors will be angry. If you do not, the country notices.`; },
    options: [
      { id: "confront", label: "Confront him: 'stop, or you are out'", explain: "Warn him in private.", cost: 0, tradeoff: "His sponsors hear about it by lunchtime.", unc: "medium" as const, chance: (s: FixState) => 0.5 + 0.2 * ((lootMin(s)?.integrity ?? 30) / 100), win: { corruption: -1, run: (s: FixState) => { const m = lootMin(s); if (m) { m.integrity = clamp100(m.integrity + 20); m.mood = clamp100(m.mood - 15); } for (const b of s.backers) b.mood = clamp100(b.mood - 5); return `${m?.name ?? "He"} promised to behave. He is sulking, and his sponsors are asking why you embarrassed one of your own.`; } }, lose: { corruption: 1, run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood - 6); const m = lootMin(s); if (m) m.mood = clamp100(m.mood - 15); return `${m?.name ?? "He"} ignored the warning and told his sponsors about it.`; } }, winText: "", loseText: "" },
      { id: "sack", label: "Sack him now", explain: "Zero tolerance.", cost: 0, tradeoff: "His backers will remember.", unc: "low" as const, chance: () => 0.95, win: { sackMinister: false, trust: 5, run: (s: FixState) => { const m = lootMin(s); const port = s.flags.lootPort as Portfolio; if (m && port) { delete s.cabinet.members[port]; s.cabinet.pool.push({ ...m, mood: 20 }); } for (const b of s.backers) b.mood = clamp100(b.mood - 12 * b.power); return `${m?.name ?? "He"} is out. Voters applaud. Your backers say, in unison, that you have 'forgotten where you came from'.`; } }, lose: {}, winText: "", loseText: "" },
      { id: "look", label: "Look the other way, he is one of ours", explain: "Loyalty has a price.", cost: 0, tradeoff: "Corruption grows, and a journalist is digging.", unc: "high" as const, chance: () => 0.9, win: { corruption: 2, evidence: 5, assembly: 2, run: (s: FixState) => { for (const b of s.backers) b.mood = clamp100(b.mood + 4); return "Nothing was said. The minister now believes he is untouchable."; } }, lose: { corruption: 2, scandal: 1, trust: -3 }, winText: "", loseText: "A journalist published the story. You look like you knew." },
    ],
    expire: { corruption: 1.5, trust: -2 }, expireText: () => "The story leaked anyway, and you were seen to have done nothing.",
  },
];
void createEvent;
