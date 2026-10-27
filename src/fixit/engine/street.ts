/** What Nigerians see: market prices (rice, garri, bread, bus fares, petrol, the dollar) and a social feed. Generated from the real state. */
import { subRng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { foodAffordIdx, powerRatio } from "./util";
import { backerLabel } from "./backers";
import { pegged, shadowFx } from "./bigmoves";

export interface PriceRow { id: string; icon: string; label: string; unit: string; now: number; start: number; goodWhenDown: boolean }
export function marketBoard(s: FixState): PriceRow[] {
  const f = s.eco.foodPriceIdx / 100, p = s.eco.priceLevel / 100, pump = s.fuel.pump / 750;
  const row = (id: string, icon: string, label: string, unit: string, base: number, k: number): PriceRow => ({ id, icon, label, unit, start: base, now: Math.round(base * k), goodWhenDown: true });
  const rows = [
    row("rice", "🍚", "Bag of rice", "50kg", 90000, f),
    row("garri", "🥣", "Garri, paint bucket", "", 4500, f * 0.98),
    row("beans", "🫘", "Beans, paint bucket", "", 6500, f * 1.02),
    row("bread", "🍞", "Loaf of bread", "", 1800, 0.55 * f + 0.45 * p),
    row("eggs", "🥚", "Crate of eggs", "30", 6000, 0.7 * f + 0.3 * pump),
    row("fare", "🚌", "Danfo fare, Oshodi–Yaba", "", 500, 0.4 * pump + 0.6 * p),
    row("petrol", "⛽", "Petrol", "per litre", 750, pump),
    row("diesel", "🛢️", "Diesel", "per litre", 1300, 0.9 * pump + 0.1 * (s.eco.fx / s.baseline.fx)),
  ];
  rows.push({ id: "usd", icon: "💵", label: pegged(s) ? "Dollar (black market)" : "Dollar", unit: "", now: Math.round(pegged(s) ? Number(s.flags.blackFx ?? shadowFx(s)) : s.eco.fx), start: s.baseline.fx, goodWhenDown: true });
  return rows;
}

export interface Post { name: string; handle: string; text: string; likes: number; tone: "good" | "bad" | "neutral"; verified?: boolean }
type Rule = { w: (s: FixState) => number; make: (s: FixState) => Omit<Post, "likes"> };
const N = (n: number) => n.toLocaleString("en-NG");
const RULES: Rule[] = [
  { w: (s) => (s.eco.foodInflation > 28 ? 3 : 0), make: (s) => ({ name: "Mama Nkechi POS", handle: "@mamanke_shop", text: `Rice don reach ₦${N(Math.round(90000 * s.eco.foodPriceIdx / 100))}. Customers just dey look and go. Una dey hear?`, tone: "bad" }) },
  { w: (s) => (s.eco.foodInflation < 14 ? 3 : 0), make: () => ({ name: "Mama Nkechi POS", handle: "@mamanke_shop", text: "Market don calm down small. Customers dey buy again. God dey!", tone: "good" }) },
  { w: (s) => (s.fuel.pump > 900 ? 3 : 0), make: (s) => ({ name: "Danfo Chronicles", handle: "@danfo_gist", text: `Petrol ₦${Math.round(s.fuel.pump)}. Conductor says fare is now "depends on your face".`, tone: "bad" }) },
  { w: (s) => (s.fuel.pump < 500 ? 3 : 0), make: (s) => ({ name: "Danfo Chronicles", handle: "@danfo_gist", text: `Petrol is ₦${Math.round(s.fuel.pump)}. Conductor refunded my change. First time ever.`, tone: "good" }) },
  { w: (s) => (powerRatio(s) < 0.27 ? 3 : 0), make: () => ({ name: "Tolu Codes", handle: "@tolu_ships", text: "NEPA took light again. Diesel plus data plus rent. Developer life in Nigeria is a full-time prayer meeting.", tone: "bad" }) },
  { w: (s) => (powerRatio(s) > 0.4 ? 3 : 0), make: () => ({ name: "Tolu Codes", handle: "@tolu_ships", text: "Light has not gone in 5 days. I almost called the power company to confirm it's not a glitch.", tone: "good" }) },
  { w: (s) => (s.rule.streetAnger > 50 ? 3 : 0), make: () => ({ name: "Citizens' Voice", handle: "@endbadgov", text: "#EndBadGovernance trending again. Enough is enough.", tone: "bad" }) },
  { w: (s) => (s.rule.streetAnger < 30 && s.gov.happiness > 55 ? 2 : 0), make: () => ({ name: "Abuja Insider", handle: "@abuja_insider", text: "Honestly? First time in years the mood in this country is positive. Don't jinx it.", tone: "good" }) },
  { w: (s) => (s.jobs.youth > 33 ? 3 : 0), make: (s) => ({ name: "Aisha (grad, 2021)", handle: "@aisha_hustles", text: `${Math.round(s.jobs.youth)}% of us have no job. I have a first class and I sell shawarma. Government, wake up.`, tone: "bad" }) },
  { w: (s) => (s.me.evidence > 40 ? 3 : 0), make: () => ({ name: "Naija Leaks", handle: "@naija_leaks", text: "Documents suggest Aso Rock insiders are getting very comfortable. We have receipts. Thread 🧵", tone: "bad" }) },
  { w: (s) => (s.backers?.some((b) => b.mood < 30) ? 4 : 0), make: (s) => { const b = [...s.backers].sort((x, y) => x.mood - y.mood)[0]; return { name: "Political Gist", handle: "@gist_politico", text: `They say ${b.name} (${backerLabel(b).toLowerCase()}) is no longer returning the president's calls. Interesting week ahead 👀`, tone: "bad" }; } },
  { w: (s) => (s.backers?.every((b) => b.mood > 65) ? 2 : 0), make: () => ({ name: "Political Gist", handle: "@gist_politico", text: "The president's godfathers are all smiling in photos. Make of that what you will.", tone: "neutral" }) },
  { w: (s) => (typeof s.flags.peg === "number" ? 5 : 0), make: (s) => ({ name: "Alaba FX Boy", handle: "@alaba_dollar", text: `Official rate ₦${N(Number(s.flags.peg))}. Black market ₦${N(Math.round(Number(s.flags.blackFx ?? s.eco.fx)))}. Abeg who dey sell dollar?`, tone: "bad" }) },
  { w: (s) => (s.eco.fx < 1100 ? 3 : 0), make: (s) => ({ name: "Femi (importer)", handle: "@femi_imports", text: `Naira at ₦${N(Math.round(s.eco.fx))}. My landing costs dropped. Even my accountant smiled.`, tone: "good" }) },
  { w: (s) => (s.eco.fx > 1900 ? 3 : 0), make: (s) => ({ name: "Femi (importer)", handle: "@femi_imports", text: `₦${N(Math.round(s.eco.fx))} to the dollar. Every price tag in my shop is a lie by evening.`, tone: "bad" }) },
  { w: (s) => (s.sec.index > 60 ? 3 : 0), make: () => ({ name: "Terver (farmer)", handle: "@terver_farms", text: "Can't reach my farm again. Prayers please. Government please.", tone: "bad" }) },
  { w: (s) => (s.rule.democracy < 40 ? 3 : 0), make: () => ({ name: "Sowore-style Activist", handle: "@freespeech_ng", text: "Strange how nobody on TV says anything bad about the government anymore. Strange, strange.", tone: "bad" }) },
  { w: (s) => (s.achievements.some((a) => a.id.startsWith("rec:") && s.month - a.month < 3) ? 6 : 0), make: (s) => { const a = [...s.achievements].reverse().find((x) => x.id.startsWith("rec:"))!; return { name: "NigeriaStats", handle: "@ngstats", text: `🚨 RECORD: ${a.label.replace(/^[A-Z0-9 ,'!\\-]+: /, "")}. Nigerians online are dancing.`, tone: "good", verified: true }; } },
  { w: () => 1, make: () => ({ name: "Lagos Traffic Update", handle: "@lagostraffic", text: "Third Mainland Bridge: moving. Do not celebrate yet. It is 6 a.m.", tone: "neutral" }) },
  { w: () => 1, make: () => ({ name: "Big Brother Fan", handle: "@bbn_addict", text: "Nigeria will find a way to make a government speech trend below Big Brother. Priorities.", tone: "neutral" }) },
  { w: () => 1, make: () => ({ name: "Jollof Defence Force", handle: "@jollofwars", text: "Ghana can talk all they want. Our jollof has the smoky party flavour. End of discussion.", tone: "neutral" }) },
];
export function feed(s: FixState, n = 7): Post[] {
  const rng = subRng(s.meta.seed, "feed", s.month);
  const pool = RULES.map((r) => ({ r, w: r.w(s) })).filter((x) => x.w > 0);
  const out: Post[] = [];
  const bag = [...pool];
  while (out.length < n && bag.length) {
    const tot = bag.reduce((a, b) => a + b.w, 0);
    let x = rng.next() * tot, i = 0;
    for (; i < bag.length - 1; i++) { x -= bag[i].w; if (x <= 0) break; }
    const [{ r }] = bag.splice(i, 1);
    const p = r.make(s);
    out.push({ ...p, likes: Math.round((p.tone === "neutral" ? 400 : 1200) * (0.4 + rng.next() * 3.2) * (1 + foodAffordIdx(s) / 400)) });
  }
  return out;
}
