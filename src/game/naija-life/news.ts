import { STATE_BY_ID, TRAVEL_STATES } from "./data";
import type { Player, WorldState } from "./types";
import { chance, clamp, dual, pick, rand, type Dual } from "./util";

export const emptyWorld = (): WorldState => ({ until: {}, news: [] });

/** True while a national condition (fuel hike, strike, boom ...) is still in force. */
export function modActive(p: Player, key: string): boolean {
  return (p.world?.until[key] ?? -1) >= p.age;
}

interface NewsDef {
  id: string;
  weight: (p: Player) => number;
  /** Applies the effect and returns the headline. */
  run: (p: Player) => Dual;
}

const NEWS: NewsDef[] = [
  {
    id: "fuel",
    weight: (p) => (modActive(p, "fuel") ? 0 : 2),
    run: (p) => { p.world!.until.fuel = p.age + 2; return dual("Government removes more fuel subsidy. Transport and food prices climb for the next two years.", "Government remove fuel subsidy again. Transport and food price go climb for two years."); },
  },
  {
    id: "strike",
    weight: (p) => (modActive(p, "strike") ? 0 : 1.6),
    run: (p) => { p.world!.until.strike = p.age + 1; return dual("Doctors begin a nationwide strike. Government hospitals are shut this year.", "Doctors begin strike for whole country. Government hospitals shut this year."); },
  },
  {
    id: "crash",
    weight: (p) => (modActive(p, "crash") ? 0 : 1.2),
    run: (p) => {
      p.world!.until.crash = p.age + 1;
      p.index *= 1.07;
      for (const h of p.holdings) if (h.kind === "usd") { h.value = Math.round(h.value * 1.3); if (h.units !== undefined) h.units *= 1.3; }
      return dual("The naira crashes against the dollar. Prices jump, but dollar savings gain value.", "Naira crash against dollar. Prices jump, but dollar savings gain value.");
    },
  },
  {
    id: "insecurity",
    weight: (p) => (modActive(p, "insecurity") ? 0 : 1.4),
    run: (p) => { p.world!.until.insecurity = p.age + 2; return dual("A wave of kidnappings hits the highways. Travelling and being visibly rich are riskier for two years.", "Kidnapping plenty for road. Travel and showing money go dey risky for two years."); },
  },
  {
    id: "boom",
    weight: (p) => (modActive(p, "boom") ? 0 : 1),
    run: (p) => { p.world!.until.boom = p.age + 2; return dual("Oil prices surge and the economy warms up. Salaries and business revenues rise for two years.", "Oil price jump and the economy warm. Salary and business money go rise for two years."); },
  },
  {
    id: "flood",
    weight: (p) => (p.houses.length > 0 ? 1.2 : 0.3),
    run: (p) => {
      const st = pick(TRAVEL_STATES.filter((s) => !s.abroad));
      for (const h of p.houses) if (h.state === st.id) h.value = Math.round(h.value * 0.93);
      const hit = p.houses.some((h) => h.state === st.id);
      return hit
        ? dual(`Floods hit ${st.name}. Property values drop, including yours.`, `Flood enter ${st.name}. Property value fall, even yours.`)
        : dual(`Floods hit ${st.name}. Thousands are displaced.`, `Flood enter ${st.name}. Thousands of people lose house.`);
    },
  },
  {
    id: "nepa",
    weight: (p) => (modActive(p, "grid") ? 0 : 1),
    run: (p) => { p.world!.until.grid = p.age + 1; return dual("The national grid collapses again. Businesses burn more diesel this year.", "National grid collapse again. Business go burn more diesel this year."); },
  },
];

/** A few national headlines a year, each with an effect that persists for a while. */
export function yearlyNews(p: Player, lines: string[]) {
  if (!p.world) p.world = emptyWorld();
  p.world.news = p.world.news.slice(-12);
  if (!chance(0.42)) return;
  const pool = NEWS.map((n) => ({ n, w: n.weight(p) })).filter((x) => x.w > 0);
  const total = pool.reduce((s, x) => s + x.w, 0);
  if (total <= 0) return;
  let r = rand(0, total);
  let chosen = pool[0].n;
  for (const x of pool) { r -= x.w; if (r <= 0) { chosen = x.n; break; } }
  const headline = chosen.run(p);
  p.world.news.push({ age: p.age, en: headline.en, pcm: headline.pcm });
  lines.push(`${p.lang === "en" ? "News" : "Gist"}: ${p.lang === "en" ? headline.en : headline.pcm}`);
}

/** Multipliers other systems read. */
export const costMultiplier = (p: Player) => (modActive(p, "fuel") ? 1.22 : 1) * (modActive(p, "crash") ? 1.05 : 1);
export const payMultiplier = (p: Player) => (modActive(p, "boom") ? 1.06 : 1);
export const kidnapMultiplier = (p: Player) => (modActive(p, "insecurity") ? 1.5 : 1);
export const businessMultiplier = (p: Player) => (modActive(p, "boom") ? 1.08 : 1) * (modActive(p, "grid") ? 0.93 : 1);

void STATE_BY_ID;
void clamp;
