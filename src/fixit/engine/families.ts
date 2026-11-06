/**
 * Five ordinary Nigerian families you follow for the whole game. Their lives move with your decisions: Mama Nkechi's
 * shop, a nurse who might "japa", an okada rider, a farmer in Benue, a graduate in Kaduna. Once a year one of them
 * visits your desk. All people are fictional.
 */
import { subRng, type Rng } from "../../game/engine/rng";
import type { Family, FixState } from "./types";
import { clamp100, foodAffordIdx, nb, powerRatio, pushNews } from "./util";
import { createEvent } from "./spawn";

interface Def { id: string; name: string; role: string; stateId: string; place: string; target: (s: FixState) => number; up: string[]; down: string[]; thrive: string; fall: string; letterUp: string; letterDown: string }
const reg = (s: FixState, id: string, k: "insecurity" | "jobless" | "food" | "power" | "unrest") => s.regions[id]?.[k] ?? 40;
export const FAMILY_DEFS: Def[] = [
  { id: "nkechi", name: "Mama Nkechi", role: "market trader and mother of four", stateId: "NG-AN", place: "Onitsha",
    target: (s) => 50 + 0.5 * (foodAffordIdx(s) - 100) - 0.5 * (s.eco.inflation - 22) + 18 * (powerRatio(s) - 0.25) - 0.15 * (reg(s, "NG-AN", "insecurity") - 40),
    up: ["Her stall sells out by noon.", "She paid school fees for all four children on time.", "She bought a second generator and does not use it."], down: ["She sells half of what she used to.", "She took a loan from a cooperative to restock.", "Her eldest left school to help at the stall."],
    thrive: "Mama Nkechi opened a second shop and hired two girls from the village.", fall: "Mama Nkechi closed her stall. Her children are eating once a day.", letterUp: "'Mr President, God bless you. I am hiring now.'", letterDown: "'Oga, I have nothing to sell. Please help us.'" },
  { id: "ebiere", name: "Nurse Ebiere", role: "nurse at a general hospital", stateId: "NG-RI", place: "Port Harcourt",
    target: (s) => 50 + 0.3 * (s.soc.health + 0 - 40) + 0.4 * (s.gov.happiness - 50) - 0.012 * (s.eco.fx - 1400) * 0.1 - 0.2 * (reg(s, "NG-RI", "insecurity") - 40),
    up: ["Her ward has working oxygen again.", "She got a pay rise and a housing allowance.", "Fewer colleagues are leaving."], down: ["She worked three shifts in a row.", "Her ward ran out of gloves.", "Half her class has left for the UK."],
    thrive: "Nurse Ebiere was promoted to matron. She is training new nurses and says she is staying.", fall: "Nurse Ebiere has left for Canada. 'Japa' took another one.", letterUp: "'The hospital is better. I may stay after all.'", letterDown: "'I have my visa. I am sorry, Mr President.'" },
  { id: "chidi", name: "Chidi", role: "okada rider and father of two", stateId: "NG-LA", place: "Lagos",
    target: (s) => 50 - 0.04 * (s.fuel.pump - 750) * 0.3 + 0.4 * (s.gov.happiness - 50) - 0.3 * (s.jobs.unemployment - 20) - (s.rule.democracy < 40 ? 8 : 0),
    up: ["Petrol is cheaper and he does extra trips.", "He paid off his motorbike.", "He earns more than the last two years."], down: ["Fuel took half his day's earnings.", "Police stopped him at three checkpoints.", "His bike broke and he could not afford the part."],
    thrive: "Chidi bought a keke and now runs a small fleet of two riders.", fall: "Chidi gave up riding after a checkpoint seized his bike. He now hawks sachet water.", letterUp: "'Boss, I bought a keke. God dey.'", letterDown: "'Oga, I lost my bike. Abeg do something about these checkpoints.'" },
  { id: "terver", name: "Terver", role: "yam farmer and community elder", stateId: "NG-BE", place: "Benue",
    target: (s) => 50 - 0.5 * (reg(s, "NG-BE", "insecurity") - 45) + 0.2 * (s.agri.inputs - 30) + 0.25 * (s.agri.storage - 14) - 0.3 * (s.eco.foodInflation - 25) * 0.2,
    up: ["He harvested his full farm without an attack.", "Fertiliser was cheaper this year.", "A silo near him now keeps yams from rotting."], down: ["Armed men visited his village at night.", "He abandoned a field he could not reach.", "Fertiliser costs doubled."],
    thrive: "Terver bought a tractor and employed five young men from the village.", fall: "Terver and his family fled to a displacement camp. The farm is burnt.", letterUp: "'The harvest was good. The young men are working.'", letterDown: "'We are in the camp. The children have no school.'" },
  { id: "aisha", name: "Aisha", role: "graduate, 2021 class", stateId: "NG-KD", place: "Kaduna",
    target: (s) => 50 - 0.8 * (s.jobs.youth - 33) + 20 * (powerRatio(s) - 0.25) + 0.3 * (s.gov.happiness - 50),
    up: ["She got interviews for the first time.", "A tech hub opened near her.", "She earns freelance dollars on stable light."], down: ["She applied for 200 jobs and got none.", "She sold her phone to pay rent.", "Her friends keep talking about leaving."],
    thrive: "Aisha started a small software company and hired three other graduates.", fall: "Aisha gave up on Nigeria and joined a friend abroad.", letterUp: "'I have clients now. Please keep the light on.'", letterDown: "'I am leaving, Mr President. Nobody here will give me a chance.'" },
];

export function initFamilies(s: FixState) {
  const rng = subRng(s.meta.seed, "families");
  s.families = FAMILY_DEFS.map((d) => ({ id: d.id, name: d.name, role: d.role, stateId: d.stateId, place: d.place, portrait: { skin: rng.int(1, 5), hair: rng.int(0, 3), style: rng.int(0, 3), accent: rng.int(0, 4) }, mood: 45, status: "ok" as const, high: 0, low: 0, stage: 0, log: [{ month: s.month, text: `${d.name}, ${d.role}, ${d.place}.` }] }));
}
export const faceOf = (f: Family) => (f.status === "left" ? "✈️" : f.mood >= 68 ? "😀" : f.mood >= 52 ? "🙂" : f.mood >= 38 ? "😐" : f.mood >= 25 ? "😟" : "😢");

export function familiesMonthly(s: FixState, rng: Rng) {
  for (const f of s.families) {
    if (f.status === "left") continue;
    const d = FAMILY_DEFS.find((x) => x.id === f.id)!;
    const target = Math.max(0, Math.min(100, d.target(s) + (f.helped !== undefined && s.month - f.helped < 18 ? 10 : 0)));
    f.mood = clamp100(f.mood + 0.1 * (target - f.mood) + rng.normal(0, 0.6));
    f.high = f.mood >= 66 ? f.high + 1 : 0; f.low = f.mood <= 30 ? f.low + 1 : 0;
    f.status = f.mood >= 62 ? "thriving" : f.mood <= 33 ? "struggling" : "ok";
    if (s.month % 3 === 0 && rng.chance(0.7)) { const line = f.mood >= 52 ? rng.pick(d.up) : rng.pick(d.down); f.log.push({ month: s.month, text: line }); if (f.log.length > 12) f.log.shift(); }
    if (f.high >= 8 && f.stage < 1) {
      f.stage = 1; f.high = 0; f.log.push({ month: s.month, text: d.thrive });
      pushNews(s, { source: `fam:${f.id}:up`, headline: d.thrive, body: `${f.name}, ${f.role}: ${d.letterUp}`, tone: "good", stateId: f.stateId });
      s.gov.trust = clamp100(s.gov.trust + 1);
    }
    if (f.low >= 7 && f.stage > -1) {
      f.stage = -1; f.status = "left"; f.low = 0; f.log.push({ month: s.month, text: d.fall });
      pushNews(s, { source: `fam:${f.id}:down`, headline: d.fall, body: `${f.name}: ${d.letterDown}`, tone: "bad", stateId: f.stateId });
      s.gov.trust = clamp100(s.gov.trust - 1.5);
      if (f.id === "ebiere") s.soc.health = clamp100(s.soc.health - 1);
    }
  }
  // once a year, one of them visits your desk
  if (s.month >= 10 && s.month % 12 === 10 && s.flags.famVisit !== Math.floor(s.month / 12)) {
    const live = s.families.filter((f) => f.status !== "left");
    if (live.length) {
      s.flags.famVisit = Math.floor(s.month / 12);
      const pick = [...live].sort((a, b) => Math.abs(b.mood - 50) - Math.abs(a.mood - 50))[0];
      s.flags.famId = pick.id; createEvent(s, "familyVisit", pick.stateId);
    }
  }
}

const fam = (s: FixState) => s.families.find((f) => f.id === s.flags.famId);
export const FAMILY_TEMPLATES = [
  {
    id: "familyVisit", kind: "story" as const, urgency: 3,
    title: (s: FixState) => { const f = fam(s); return f ? `${f.name} writes to you` : "A family writes to you"; },
    cause: (s: FixState) => { const f = fam(s); const d = FAMILY_DEFS.find((x) => x.id === f?.id); if (!f || !d) return ""; return `${f.name}, ${f.role} in ${f.place}, ${f.mood >= 55 ? "is doing better" : f.mood < 38 ? "is struggling badly" : "is just about coping"}. ${f.mood >= 55 ? d.letterUp : d.letterDown} You first heard of ${f.name.split(" ")[0]} in your first month in office.`; },
    options: [
      { id: "help", label: "Send a personal gift and a thank-you letter", explain: "A small cheque and a handwritten note.", cost: 6, tradeoff: "A small gesture; a very large story.", unc: "low" as const, chance: () => 0.95, win: { trust: 1.5, run: (s: FixState) => { const f = fam(s); if (f) { f.helped = s.month; f.mood = clamp100(f.mood + 12); f.log.push({ month: s.month, text: "The President sent a personal letter and a gift." }); return `${f.name} read your letter to the whole street. ${f.place} has not stopped talking about it.`; } return undefined; } }, lose: {}, winText: "", loseText: "" },
      { id: "visit", label: "Visit them with the cameras", explain: "A photo with the family.", cost: 4, tradeoff: "If their life is bad, it looks like a stunt.", unc: "medium" as const, chance: (s: FixState) => ((fam(s)?.mood ?? 50) >= 50 ? 0.85 : 0.45), win: { trust: 2.5 }, lose: { trust: -2.5 }, winText: "The photo of you eating with the family was shared everywhere.", loseText: "People asked why you came for a photo when nothing had changed." },
      { id: "ignore", label: "Read it and move on", explain: "You are busy.", cost: 0, tradeoff: "They remember.", unc: "low" as const, chance: () => 1, win: { trust: -0.5, run: (s: FixState) => { const f = fam(s); if (f) f.mood = clamp100(f.mood - 4); return undefined; } }, lose: {}, winText: "The letter went into the pile.", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
];
void nb;
