/** Headlines are generated only from real changes between last month and this one; every item carries a traceable source id. */
import type { FixState, Snap } from "./types";
import { pushNews, nb, round } from "./util";

export function makeNews(s: FixState, prev: Snap, now: Snap) {
  const m = s.month;
  const fxPct = (now.fx / prev.fx - 1) * 100;
  if (fxPct >= 3) pushNews(s, { source: "fx-weak", headline: `Naira slides to ₦${now.fx.toLocaleString()} per dollar`, body: `A ${round(fxPct, 1)}% fall in a month. ${s.why.fx?.[0] ?? ""}`, tone: "bad" });
  else if (fxPct <= -2.5) pushNews(s, { source: "fx-strong", headline: `Naira gains to ₦${now.fx.toLocaleString()} per dollar`, body: `The naira strengthened ${round(-fxPct, 1)}% in a month. ${s.why.fx?.[0] ?? ""}`, tone: "good" });
  const di = now.inflation - prev.inflation;
  if (di >= 1.2) pushNews(s, { source: "infl-up", headline: `Inflation climbs to ${now.inflation}%`, body: s.why.inflation?.[0] ?? "", tone: "bad" });
  else if (di <= -1.2) pushNews(s, { source: "infl-down", headline: `Inflation eases to ${now.inflation}%`, body: s.why.inflation?.[0] ?? "", tone: "good" });
  const fuelPct = (now.fuel / prev.fuel - 1) * 100;
  if (fuelPct >= 8) pushNews(s, { source: "fuel-up", headline: `Petrol rises to ₦${now.fuel} a litre`, body: s.why.fuel?.[1] ?? "", tone: "bad" });
  else if (fuelPct <= -6) pushNews(s, { source: "fuel-down", headline: `Petrol falls to ₦${now.fuel} a litre`, body: s.why.fuel?.[1] ?? "", tone: "good" });
  if (now.power - prev.power >= 250) pushNews(s, { source: "power-up", headline: `Electricity supply improves to ${now.power.toLocaleString()} MW`, body: "More power is reaching homes and factories.", tone: "good" });
  else if (prev.power - now.power >= 300) pushNews(s, { source: "power-down", headline: `Blackouts worsen: only ${now.power.toLocaleString()} MW delivered`, body: "Generation or the grid has weakened.", tone: "bad" });
  if (now.reserves < 15 && prev.reserves >= 15) pushNews(s, { source: "reserves-low", headline: `Dollar reserves fall to $${now.reserves}bn`, body: "Analysts warn the central bank cannot defend the naira for long.", tone: "bad" });
  if (s.fin.waysAndMeans > 0) pushNews(s, { source: `wm:${m}`, headline: "Central bank prints money to pay government bills", body: `${nb(s.fin.waysAndMeans)} was created to cover the budget gap; economists warn of higher prices.`, tone: "bad" });
  if (now.dsr >= 55 && prev.dsr < 55) pushNews(s, { source: "dsr-high", headline: `Debt payments swallow ${now.dsr}% of revenue`, body: "Lenders are watching closely.", tone: "bad" });
  if (now.unemployment - prev.unemployment >= 0.6) pushNews(s, { source: "unemp-up", headline: `Unemployment rises to ${now.unemployment}%`, body: "Firms are shedding workers.", tone: "bad" });
  else if (prev.unemployment - now.unemployment >= 0.6) pushNews(s, { source: "unemp-down", headline: `Unemployment falls to ${now.unemployment}%`, body: "Hiring is picking up.", tone: "good" });
  if (now.approval < 30 && prev.approval >= 30) pushNews(s, { source: "approval-low", headline: "Approval ratings fall below 30%", body: s.why.happiness?.[0] ?? "", tone: "bad" });
  if (now.approval >= 60 && prev.approval < 60) pushNews(s, { source: "approval-high", headline: "Approval ratings top 60%", body: "Voters credit recent improvements.", tone: "good" });
  if (m > 0 && m % 12 === 0) pushNews(s, { source: `year:${m}`, headline: `One year in: prices ${now.inflation}%, naira ₦${now.fx.toLocaleString()}`, body: `Approval stands at ${Math.round(now.approval)}%.`, tone: "neutral" });
}
