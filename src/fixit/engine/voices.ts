/** "Voices from the street": short fictional quotes written from the real numbers, so people react to your choices. */
import { subRng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { foodAffordIdx, powerRatio, realWage } from "./util";

export interface Voice { who: string; place: string; topic: string; quote: string; mood: "good" | "bad" | "neutral" }

type Persona = { who: string; place: string; topic: "food" | "fuel" | "jobs" | "power" | "security" | "wages" | "naira" | "health" };
const PEOPLE: Persona[] = [
  { who: "Mama Bisi, food trader", place: "Kano", topic: "food" },
  { who: "Chidi, okada rider", place: "Lagos", topic: "fuel" },
  { who: "Aisha, graduate", place: "Kaduna", topic: "jobs" },
  { who: "Emeka, tailor", place: "Aba", topic: "power" },
  { who: "Terver, yam farmer", place: "Benue", topic: "security" },
  { who: "Mrs Ojo, civil servant", place: "Abuja", topic: "wages" },
  { who: "Femi, importer", place: "Lagos", topic: "naira" },
  { who: "Ebiere, nurse", place: "Port Harcourt", topic: "health" },
  { who: "Garba, truck driver", place: "Sokoto", topic: "fuel" },
  { who: "Ngozi, shop owner", place: "Onitsha", topic: "naira" },
  { who: "Usman, rice farmer", place: "Kebbi", topic: "food" },
  { who: "Tolu, software developer", place: "Ibadan", topic: "power" },
];

function quote(s: FixState, p: Persona): { q: string; mood: Voice["mood"] } {
  const h = s.history, a = h[Math.max(0, h.length - 4)], b = h[h.length - 1];
  const fuel = Math.round(s.fuel.pump), fx = Math.round(s.eco.fx).toLocaleString();
  switch (p.topic) {
    case "food": return b.foodInflation > a.foodInflation + 0.5 || foodAffordIdx(s) < 92
      ? { q: `A bag of rice costs so much more than last year. My customers buy half of what they used to.`, mood: "bad" }
      : b.foodInflation < a.foodInflation - 1 ? { q: `Prices at the market are finally calming down. People are buying again.`, mood: "good" } : { q: `Food prices are still high, but at least they are not jumping every week.`, mood: "neutral" };
    case "fuel": return b.fuel > a.fuel * 1.05
      ? { q: `Petrol is now ₦${fuel} a litre. I had to raise my fares, and passengers are angry with me.`, mood: "bad" }
      : b.fuel < a.fuel * 0.97 ? { q: `Fuel is a bit cheaper now, ₦${fuel}. Every naira counts.`, mood: "good" } : { q: `₦${fuel} for a litre. We are managing, but only just.`, mood: "neutral" };
    case "jobs": return s.jobs.youth > 34
      ? { q: `I have a degree and I have sent a hundred applications. Nothing. ${s.jobs.youth.toFixed(0)}% of us young people have no work.`, mood: "bad" }
      : { q: `My friends are getting jobs now. Things feel more hopeful than before.`, mood: "good" };
    case "power": return powerRatio(s) < 0.27
      ? { q: `NEPA took the light again. I spend more on diesel for my generator than on rent.`, mood: "bad" }
      : { q: `We get more hours of light now. I don't run the generator every day.`, mood: "good" };
    case "security": return s.regions["NG-BE"]?.insecurity > 65 || s.sec.index > 58
      ? { q: `We are afraid to go to the farm. Last month armed men attacked the next village.`, mood: "bad" }
      : s.sec.index < 48 ? { q: `It is calmer now. We can farm again without fear.`, mood: "good" } : { q: `Things are a little better, but we still farm in groups for safety.`, mood: "neutral" };
    case "wages": return realWage(s) < 95
      ? { q: `My salary is the same but it buys less every month. By the 20th, the money is finished.`, mood: "bad" }
      : { q: `For the first time in a long while, my salary is keeping up with prices.`, mood: "good" };
    case "naira": return b.fx > a.fx * 1.03
      ? { q: `The dollar is now ₦${fx}. My goods cost more every time I restock, so I have to raise prices.`, mood: "bad" }
      : b.fx < a.fx * 0.98 ? { q: `The naira is getting stronger, ₦${fx} to the dollar. My suppliers have cut prices.`, mood: "good" } : { q: `At ₦${fx} to the dollar, at least I can plan.`, mood: "neutral" };
    default: return s.soc.health < 38
      ? { q: `We are short of drugs and nurses. Patients wait all day.`, mood: "bad" }
      : { q: `The clinic has supplies now. It makes a difference.`, mood: "good" };
  }
}

/** a few voices for this month, chosen so the ones with the most to say (strong changes) speak first */
export function streetVoices(s: FixState, n = 3): Voice[] {
  const rng = subRng(s.meta.seed, "voices", s.month);
  const order = rng.shuffle([...PEOPLE]);
  const all = order.map((p) => { const r = quote(s, p); return { who: p.who, place: p.place, topic: p.topic, quote: r.q, mood: r.mood } as Voice; });
  const seen = new Set<string>();
  const pick: Voice[] = [];
  for (const v of [...all.filter((v) => v.mood !== "neutral"), ...all]) {
    if (seen.has(v.topic) || pick.includes(v)) continue;
    seen.add(v.topic); pick.push(v);
    if (pick.length >= n) break;
  }
  return pick;
}
