/** "What happened because of you": ties each change in the month summary to the decisions behind it. Pure reading, no state changes. */
import type { FixState, Lever } from "./types";
import { strength } from "./util";

type Metric = { levers: [Lever, 1 | -1][]; why?: string; words: RegExp };
/** sign = what a positive value of that lever does to the metric as shown in the summary */
const METRICS: Record<string, Metric> = {
  "Naira per dollar": { levers: [["fxSupply", -1], ["fxDemand", 1], ["investor", -1]], why: "fx", words: /naira|dollar|reserve|fx|import|investor/i },
  "Inflation": { levers: [["inflation", 1], ["foodPrice", 1], ["transport", 1], ["fxSupply", -1]], why: "inflation", words: /inflation|price|wage|naira|subsid|fuel/i },
  "Food prices (yearly)": { levers: [["foodPrice", 1], ["foodSupply", -1], ["postHarvest", -1], ["storage", -1], ["irrigation", -1], ["inputs", -1]], why: "food", words: /food|grain|farm|harvest|rice|voucher/i },
  "Petrol per litre": { levers: [["refinery", -1], ["transport", 1]], why: "fuel", words: /fuel|petrol|subsid|refiner|pump/i },
  "Unemployment": { levers: [["jobs", 1], ["sme", -1], ["manuf", -1], ["skills", -1]], words: /job|factory|industr|youth|sme|training/i },
  "Happiness": { levers: [["happiness", 1], ["trust", 1], ["welfare", 1]], why: "happiness", words: /relief|voucher|protest|strike|welfare|allowance|speech/i },
  "Electricity (MW)": { levers: [["power", 1], ["grid", 1], ["gas", 1], ["maint", 1]], words: /power|grid|gas|electric|solar|substation/i },
  "Security risk": { levers: [["security", -1], ["forces", -1]], words: /secur|troop|police|army|bandit|military/i },
  "Government cash": { levers: [["revenue", 1], ["taxCompl", 1], ["corruption", -1]], why: "fiscal", words: /project|policy|cost|loan|borrow|tax|repay|recover/i },
  "Dollar reserves": { levers: [["fxSupply", 1]], why: "fx", words: /dollar|naira|reserve|fx|peg|import/i },
};
const VERB: [string, string][] = [["policy:", "you started "], ["project:", "you built "], ["measure:", "you used "], ["event:", "your answer to "], ["agenda:", "you set your agenda: "], ["loot:", "you spent recovered money on "], ["law", "your "], ["cos", ""], ["move:", "you made the move: "], ["minister:", "your "], ["deal:", "the investor deal "], ["foreign:", "your foreign deal: "], ["echo:", "an earlier decision: "], ["newstate:", "you created "]];
const verb = (src: string) => VERB.find(([p]) => src.startsWith(p))?.[1] ?? "";
const clean = (label: string) => label.replace(/ \(completed\)$/, "").replace(/^Agenda: /, "").replace(/^Chief of Staff: .*/, "your Chief of Staff").replace(/^([A-Za-z ]+ Minister): .*/, "$1 appointment");

/** up to two plain-language causes for a change in `label` (delta > 0 means the number went up) */
export function because(s: FixState, label: string, delta: number, sinceMonth: number): string[] {
  const m = METRICS[label];
  if (!m) return [];
  const out: { text: string; w: number }[] = [];
  const dir = delta >= 0 ? 1 : -1;
  for (const mod of s.modifiers) {
    const st = strength(mod, s.month);
    if (!st || mod.start < sinceMonth - 8) continue;
    let push = 0;
    for (const [lv, sign] of m.levers) { const v = (mod.effects as Record<string, number | undefined>)[lv]; if (v !== undefined) push += sign * v * mod.scale * st; }
    if (Math.abs(push) < 0.25 || Math.sign(push) !== dir) continue;
    const v = verb(mod.source);
    if (/^(meters|cos|groups|reputation|fuelqueue|law|speech)/.test(mod.source)) continue;
    out.push({ text: `${v}${clean(mod.label)}${mod.start >= sinceMonth ? "" : " earlier"}`, w: Math.abs(push) });
  }
  // decisions you took in the window that name this area
  for (const r of s.reports) {
    if (r.month < sinceMonth - 1) continue;
    if (m.words.test(r.title) && !out.some((o) => o.text.includes(clean(r.title).slice(0, 18)))) out.push({ text: `you decided: ${r.title.replace(/^Policy started: /, "").replace(/^Project started: /, "")}`, w: 0.3 });
  }
  const sorted = out.sort((a, b) => b.w - a.w).slice(0, 2).map((x) => x.text);
  if (sorted.length) return sorted.map((t, i) => (i === 0 ? `Because ${t}` : `and ${t}`));
  const w = m.why ? s.why[m.why]?.[0] : undefined;
  return w ? [w] : [];
}
