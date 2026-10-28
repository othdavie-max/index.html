/**
 * The armed forces. A stronger army makes the country safer and respected, but it costs money every month, makes
 * generals more dangerous, alarms the neighbours, and only matters if it has a job to do. All countries are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import { addMod, clamp, clamp100, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";

export interface Programme { id: string; name: string; blurb: string; cost: number; strength: number; effects: Effects; side?: string }
export const MIL_PROGRAMMES: Programme[] = [
  { id: "recruit", name: "Recruit and train", blurb: "More soldiers, better training, regular pay.", cost: 40, strength: 7, effects: { forces: 3, security: 2 } },
  { id: "import", name: "Buy jets and ships from abroad", blurb: "Fast strength, paid in dollars. The supplier gets leverage over you.", cost: 70, strength: 14, effects: { forces: 4, fxDemand: 0.12 } },
  { id: "local", name: "Build a local arms industry", blurb: "Slow, but it creates jobs and cuts imports over the years.", cost: 45, strength: 6, effects: { manuf: 1.5, jobs: 0.3, forces: 1 } },
  { id: "veterans", name: "Veterans' welfare and barracks housing", blurb: "Keeps soldiers happy and loyal. Does not add strength.", cost: 15, strength: 0, effects: {} },
];
const key = (id: string) => `mil:${id}`;
export const milOn = (s: FixState, id: string) => !!s.flags[key(id)];
export const milLeak = (s: FixState) => clamp(1 - 0.004 * s.gov.corruption, 0.5, 1);
export function toggleMil(s: FixState, id: string): { ok: boolean; message: string } {
  const p = MIL_PROGRAMMES.find((x) => x.id === id); if (!p) return { ok: false, message: "Unknown." };
  const src = `military:${id}`;
  if (milOn(s, id)) { delete s.flags[key(id)]; removeMods(s, src); return { ok: true, message: `${p.name} ended.` }; }
  if (p.cost * 3 > s.fin.treasury) return { ok: false, message: `You need three months of its cost (${Math.round(p.cost * 3)}bn) in the treasury.` };
  s.flags[key(id)] = s.month + 1;
  addMod(s, src, p.name, p.effects, { duration: null, ramp: 4, scale: milLeak(s) });
  const m = s.modifiers[s.modifiers.length - 1]; if (m && m.source === src) m.monthly = p.cost;
  if (id === "import") s.foreign.rel.china = clamp100(s.foreign.rel.china + 3);
  return { ok: true, message: `${p.name} is running at about ₦${p.cost}bn a month.${milLeak(s) < 0.85 ? " Corruption will skim part of it." : ""}` };
}
/** where Nigeria stands among its neighbours */
export const regionalRank = (s: FixState) => 1 + s.mil.neighbours.filter((n) => n.strength > s.mil.strength).length;
export const strongestNeighbour = (s: FixState) => [...s.mil.neighbours].sort((a, b) => b.strength - a.strength)[0];
/** extra coup danger from a strong army that is not looked after */
export const milCoup = (s: FixState) => Math.max(0, s.mil.strength - 55) * (milOn(s, "veterans") ? 0.06 : 0.2) - (milOn(s, "veterans") ? 3 : 0);

export function militaryMonthly(s: FixState, rng: Rng) {
  const M = s.mil;
  let target = 30;
  for (const p of MIL_PROGRAMMES) if (milOn(s, p.id)) target += p.strength * milLeak(s) * 2.2;
  M.strength = clamp100(M.strength + 0.06 * (target - M.strength) - (target <= 31 ? 0.12 : 0));
  if (milOn(s, "veterans")) s.groupMood.military = clamp(s.groupMood.military + 0.1, -40, 40);
  for (const n of M.neighbours) {
    const arms = M.strength > n.strength * 1.25 ? 0.08 : 0;
    n.strength = clamp100(n.strength + 0.02 + arms + rng.normal(0, 0.12) + (n.mood < 35 ? 0.05 : 0));
    n.mood = clamp100(n.mood + 0.05 * (58 - n.mood) - (M.strength > n.strength * 1.5 ? 0.35 : 0) + (s.foreign.rel.ecowas > 60 ? 0.12 : 0) + rng.normal(0, 0.4));
    n.stability = clamp100(n.stability + rng.normal(0, 0.35));
  }
  if (M.strength > 62 && s.foreign.rel.ecowas > 20) s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 0.05);
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  const gap = (k: string, m: number) => s.month - Number(s.flags[`lastMil:${k}`] ?? -99) >= m;
  const mk = (k: string) => { s.flags[`lastMil:${k}`] = s.month; createEvent(s, k, k === "borderClash" ? "NG-KT" : "NG-FC"); };
  const angry = [...M.neighbours].sort((a, b) => a.mood - b.mood)[0];
  if (angry && angry.mood < 40 && !open("borderClash") && gap("borderClash", 14) && rng.chance(0.15)) { s.flags.clashWith = angry.id; mk("borderClash"); }
  const shaky = [...M.neighbours].sort((a, b) => a.stability - b.stability)[0];
  if (shaky && shaky.stability < 32 && !open("neighbourCrisis") && gap("neighbourCrisis", 16) && rng.chance(0.12)) { s.flags.crisisIn = shaky.id; mk("neighbourCrisis"); }
}

const nb = (s: FixState, id: unknown) => s.mil.neighbours.find((n) => n.id === id);
export const MIL_TEMPLATES = [
  {
    id: "borderClash", kind: "insecurity" as const, urgency: 2,
    title: (s: FixState) => `Border clash with ${nb(s, s.flags.clashWith)?.name ?? "a neighbour"}`,
    cause: (s: FixState) => { const n = nb(s, s.flags.clashWith); return `Troops from ${n?.name ?? "a neighbour"} crossed a disputed river in the north-west after a smuggling row. Your army strength is ${Math.round(s.mil.strength)}/100 against ${Math.round(n?.strength ?? 30)}/100. The generals are asking for orders.`; },
    options: [
      { id: "strike", label: "Order a show of force", explain: "Jets overhead, tanks at the border.", cost: 25, tradeoff: "If it fails, you look weak; if it works too well, neighbours panic.", unc: "high" as const, chance: (s: FixState) => clamp(0.3 + 0.012 * (s.mil.strength - (nb(s, s.flags.clashWith)?.strength ?? 30)), 0.1, 0.92), win: { trust: 3, groups: { military: 4 }, run: (s: FixState) => { const n = nb(s, s.flags.clashWith); if (n) { n.mood = clamp100(n.mood - 8); n.strength = clamp100(n.strength + 2); } s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 3); return "They withdrew within the day. The Chief of Defence Staff stood very straight at the press conference."; } }, lose: { trust: -4, groups: { military: -4 }, coup: 4, run: () => "The show of force was matched and then some. The press asked why the army was not ready." }, winText: "", loseText: "" },
      { id: "talk", label: "Send the foreign minister and a delegation", explain: "Talk before anyone shoots.", cost: 5, tradeoff: "A strong army makes talks easier; a weak one makes them humiliating.", unc: "medium" as const, chance: (s: FixState) => clamp(0.45 + 0.004 * (s.mil.strength - 40) + 0.003 * (s.foreign.rel.ecowas - 50), 0.2, 0.9), win: { trust: 2, run: (s: FixState) => { const n = nb(s, s.flags.clashWith); if (n) n.mood = clamp100(n.mood + 14); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 3); return "A joint border commission was formed. Both sides claimed victory."; } }, lose: { trust: -2, run: (s: FixState) => { const n = nb(s, s.flags.clashWith); if (n) n.mood = clamp100(n.mood - 3); return "Talks stalled. The soldiers stayed where they were."; } }, winText: "", loseText: "" },
      { id: "ignore", label: "Treat it as a local matter", explain: "Do not escalate.", cost: 0, tradeoff: "Villages near the border suffer.", unc: "low" as const, chance: () => 1, win: { insecurity: 2, trust: -1.5 }, lose: {}, winText: "The border villages felt abandoned.", loseText: "" },
    ],
    expire: { insecurity: 2, trust: -2 }, expireText: () => "The clash dragged on without orders.",
  },
  {
    id: "neighbourCrisis", kind: "global" as const, urgency: 2,
    title: (s: FixState) => `Crisis in ${nb(s, s.flags.crisisIn)?.name ?? "a neighbouring country"}`,
    cause: (s: FixState) => `${nb(s, s.flags.crisisIn)?.name ?? "A neighbour"} is in turmoil: a coup attempt, fighting in the capital and thousands of refugees at your border. The regional bloc wants Nigeria to lead a peacekeeping force. It is a chance to be the continent's big brother, and a risk.`,
    options: [
      { id: "lead", label: "Lead a peacekeeping mission", explain: "Send troops and money.", cost: 60, tradeoff: "Costs money, risks casualties; wins you respect.", unc: "high" as const, chance: (s: FixState) => clamp(0.35 + 0.01 * (s.mil.strength - 35), 0.15, 0.9), win: { trust: 3, groups: { military: 3 }, run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 14); s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 5); s.mil.peace += 1; const n = nb(s, s.flags.crisisIn); if (n) n.stability = clamp100(n.stability + 20); return `Your soldiers restored order in ${n?.name ?? "the capital"}. Nigerians were proud, and the AU thanked you.`; } }, lose: { trust: -4, run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 2); s.groupMood.military = clamp(s.groupMood.military - 4, -40, 40); return "The mission dragged on, with casualties. Mothers of soldiers wrote to the papers."; } }, winText: "", loseText: "" },
      { id: "aid", label: "Send aid and take refugees", explain: "Humanitarian help only.", cost: 25, tradeoff: "Money and camps; no glory.", unc: "low" as const, chance: () => 0.9, win: { trust: 1, run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 6); return "Trucks of food and tents crossed the border. The UN praised the response."; } }, lose: {}, winText: "", loseText: "" },
      { id: "stay", label: "Stay out of it", explain: "Look after your own people.", cost: 0, tradeoff: "The bloc will not forget.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 5); const n = nb(s, s.flags.crisisIn); if (n) n.stability = clamp100(n.stability - 8); return "Refugees crossed anyway. Local governments had to cope without help."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { trust: -1 }, expireText: () => "The bloc acted without you.",
  },
];
void addMod; void pushNews;
