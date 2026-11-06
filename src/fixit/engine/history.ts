/**
 * Record cards: when a number crosses a line Nigeria has not seen in years, the game says so, with the real history
 * behind it ("first time since 2016"). Reference points are approximate public figures (official exchange rates,
 * pump prices, headline inflation, peak grid output, reserves) and are only used for comparison.
 */
import type { FixState } from "./types";
import { pushNews } from "./util";

export interface RecordDef {
  id: string; icon: string; tone: "good" | "bad";
  /** the big line on the card */
  big: string;
  title: string;
  body: string;
  test: (s: FixState) => boolean;
}

import { annualGdpNgn, debtServiceRatio, debtTotalNgn } from "./util";
const fx = (s: FixState) => s.eco.fx;
const dgdp = (s: FixState) => (debtTotalNgn(s) / annualGdpNgn(s)) * 100;
const pump = (s: FixState) => s.fuel.pump;

export const RECORDS: RecordDef[] = [
  // ---------------------------------------------------------------- the naira
  { id: "n1000", icon: "💵", tone: "good", big: "FIRST TIME SINCE 2023", title: "The naira is under ₦1,000 to the dollar", body: "The naira has not been this strong since the months after it was floated in 2023.", test: (s) => fx(s) < 1000 },
  { id: "n750", icon: "💵", tone: "good", big: "STRONGER THAN BEFORE THE FLOAT", title: "Under ₦750 to the dollar", body: "When the naira was floated in June 2023 it fell straight past ₦750. You have pulled it back.", test: (s) => fx(s) < 750 },
  { id: "n500", icon: "💵", tone: "good", big: "BUHARI-ERA NAIRA", title: "The naira is under ₦500", body: "In 2022 the official rate was about ₦420 to ₦460. You have taken the naira back to the Buhari years.", test: (s) => fx(s) < 500 },
  { id: "n400", icon: "💵", tone: "good", big: "FIRST TIME SINCE 2020", title: "Under ₦400 to the dollar", body: "₦380 was the official rate in 2020, before the long slide began.", test: (s) => fx(s) < 400 },
  { id: "n306", icon: "💵", tone: "good", big: "YOU UNDID THE 2016 DEVALUATION", title: "Under ₦306 to the dollar", body: "In June 2016 the naira was devalued from ₦197 to above ₦280. No president has brought it back since. You just did.", test: (s) => fx(s) < 306 },
  { id: "n200", icon: "🏆", tone: "good", big: "JONATHAN-ERA NAIRA!", title: "Under ₦200 to the dollar", body: "In early 2015, under Goodluck Jonathan, the official rate was about ₦197. Nobody has seen it since. Nigerians are dancing in the street.", test: (s) => fx(s) < 200 },
  { id: "n160", icon: "🏆", tone: "good", big: "FIRST TIME SINCE 2014", title: "Under ₦160 to the dollar", body: "From 2010 to 2014 the naira held around ₦150 to ₦160. You are the best naira president in a generation.", test: (s) => fx(s) < 160 },
  { id: "nLow2000", icon: "📉", tone: "bad", big: "ALL-TIME RECORD LOW", title: "The naira crosses ₦2,000 to the dollar", body: "The naira has never been this weak. Importers, students abroad and anyone with a dollar loan are in pain.", test: (s) => fx(s) > 2000 },
  { id: "nLow3000", icon: "📉", tone: "bad", big: "THE NAIRA IS IN FREE FALL", title: "₦3,000 to the dollar", body: "Nigerians are pricing everything in dollars now. Traders change price tags twice a day.", test: (s) => fx(s) > 3000 },
  // ---------------------------------------------------------------- petrol
  { id: "f617", icon: "⛽", tone: "good", big: "CHEAPER THAN SUBSIDY-REMOVAL DAY", title: "Petrol under ₦617 a litre", body: "When the subsidy was removed in June 2023, petrol jumped from ₦185 to about ₦500 to ₦617. You have brought it back below that.", test: (s) => pump(s) < 617 },
  { id: "f400", icon: "⛽", tone: "good", big: "FIRST TIME SINCE 2023", title: "Petrol under ₦400 a litre", body: "Petrol has not been this cheap since the subsidy was removed. Danfo drivers are cutting fares.", test: (s) => pump(s) < 400 },
  { id: "f200", icon: "⛽", tone: "good", big: "PETROL UNDER ₦200!", title: "Petrol under ₦200 a litre", body: "₦185 was the price before the subsidy was removed in May 2023. You are back there.", test: (s) => pump(s) < 200 },
  { id: "f150", icon: "⛽", tone: "good", big: "FIRST TIME SINCE 2016", title: "Petrol under ₦150", body: "In 2016 Buhari raised petrol from ₦86.50 to ₦145. You have beaten that.", test: (s) => pump(s) < 150 },
  { id: "f100", icon: "🏆", tone: "good", big: "PETROL UNDER ₦100, LIKE 2015!", title: "Petrol under ₦100 a litre", body: "Goodluck Jonathan cut petrol to ₦87 in January 2015. Nigerians have not seen double digits since. Until now.", test: (s) => pump(s) < 100 },
  { id: "fHigh1200", icon: "⛽", tone: "bad", big: "MOST EXPENSIVE PETROL EVER", title: "Petrol crosses ₦1,200 a litre", body: "Nigerians have never paid this much for petrol. Okada riders and bus drivers are parking their vehicles.", test: (s) => pump(s) > 1200 },
  // ---------------------------------------------------------------- inflation
  { id: "i20", icon: "🛒", tone: "good", big: "FIRST TIME SINCE 2022", title: "Inflation is below 20%", body: "Inflation crossed 20% in late 2022 and kept climbing to a 28-year high. You have broken the fever.", test: (s) => s.eco.inflation < 20 },
  { id: "i15", icon: "🛒", tone: "good", big: "FIRST TIME SINCE 2020", title: "Inflation is below 15%", body: "Prices have not been this calm since 2020.", test: (s) => s.eco.inflation < 15 },
  { id: "i10", icon: "🏆", tone: "good", big: "SINGLE-DIGIT INFLATION!", title: "Inflation is below 10%", body: "The last time Nigeria had single-digit inflation was January 2016, at the end of the Jonathan years. Market women are smiling.", test: (s) => s.eco.inflation < 10 },
  { id: "i6", icon: "🏆", tone: "good", big: "LOWEST SINCE 2007", title: "Inflation is below 6%", body: "Inflation was about 5.4% in 2007, under Yar'Adua. This is the calmest Nigeria's prices have been in a generation.", test: (s) => s.eco.inflation < 6 },
  { id: "iHigh35", icon: "🔥", tone: "bad", big: "WORST SINCE 1996", title: "Inflation crosses 35%", body: "Nigeria has not seen prices rise this fast since the mid-1990s under military rule.", test: (s) => s.eco.inflation > 35 },
  { id: "iHigh50", icon: "🔥", tone: "bad", big: "1995-STYLE INFLATION", title: "Inflation crosses 50%", body: "In 1995 inflation hit 72%. You are heading there. Savings are melting.", test: (s) => s.eco.inflation > 50 },
  // ---------------------------------------------------------------- electricity
  { id: "p5k", icon: "💡", tone: "good", big: "OVER 5,000 MW", title: "The grid is delivering over 5,000 MW", body: "Nigeria's grid has crossed 5,000 MW only on a handful of days in its history.", test: (s) => s.power.available >= 5000 },
  { id: "p5802", icon: "🏆", tone: "good", big: "NATIONAL POWER RECORD!", title: "More electricity than ever before", body: "The grid's highest peak was about 5,800 MW in 2021. You have beaten every government since independence.", test: (s) => s.power.available >= 5802 },
  { id: "p10k", icon: "🏆", tone: "good", big: "OBASANJO'S DREAM, DELIVERED", title: "10,000 MW", body: "Obasanjo promised 10,000 MW by 2007. Nigerians waited. You delivered it. Generator sellers are worried.", test: (s) => s.power.available >= 10000 },
  { id: "p15k", icon: "🏆", tone: "good", big: "NIGERIA DON LIGHT UP", title: "15,000 MW", body: "More than double the old national record. Barbers, tailors and welders are working through the night.", test: (s) => s.power.available >= 15000 },
  { id: "pLow3000", icon: "🕯️", tone: "bad", big: "BLACKOUT NATION", title: "The grid falls below 3,000 MW", body: "Whole cities are in darkness. Diesel sellers are the richest people in town.", test: (s) => s.power.available < 3000 },
  // ---------------------------------------------------------------- reserves
  { id: "r45", icon: "🏦", tone: "good", big: "FIRST TIME SINCE 2019", title: "Reserves above $45bn", body: "Nigeria's reserves last stood this high in 2019.", test: (s) => s.eco.reserves >= 45 },
  { id: "r62", icon: "🏆", tone: "good", big: "ALL-TIME RESERVES RECORD", title: "Reserves above $62bn", body: "The previous record was about $62bn in 2008, under Yar'Adua. Nigeria has never had this much in the bank.", test: (s) => s.eco.reserves >= 62.1 },
  { id: "rLow15", icon: "🏦", tone: "bad", big: "RESERVES RUNNING DRY", title: "Reserves below $15bn", body: "Nigeria's reserves have not been this low in about twenty years. The naira has nothing left to defend it.", test: (s) => s.eco.reserves < 15 },
  // ---------------------------------------------------------------- debt
  { id: "d30", icon: "💳", tone: "good", big: "DEBT UNDER CONTROL", title: "Debt below 30% of the economy", body: "Nigeria's debt was over 50% of the economy when you started. It is now a manageable load.", test: (s) => dgdp(s) < 30 },
  { id: "d15", icon: "💳", tone: "good", big: "LOW-DEBT NATION", title: "Debt below 15% of the economy", body: "Lenders now compete to lend to Nigeria on good terms. Interest payments are a small part of the budget.", test: (s) => dgdp(s) < 15 },
  { id: "dfree", icon: "🏆", tone: "good", big: "DEBT-FREE NIGERIA", title: "Nigeria owes almost nothing", body: "Not since independence has Nigeria been this free of debt. The country can now save, invest, and even lend to others.", test: (s) => dgdp(s) <= 5 },
  { id: "ds15", icon: "💳", tone: "good", big: "ROOM TO BREATHE", title: "Debt payments below 15% of revenue", body: "More of every naira collected can now go to schools, roads and clinics.", test: (s) => debtServiceRatio(s) < 0.15 },
  { id: "dbad70", icon: "💥", tone: "bad", big: "DEBT TRAP", title: "Debt payments take over 70% of revenue", body: "Almost everything the government collects now goes to lenders. There is hardly any money left to govern.", test: (s) => debtServiceRatio(s) > 0.7 },
  { id: "dbad80", icon: "💥", tone: "bad", big: "RECORD DEBT", title: "Debt above 80% of the economy", body: "The country owes almost as much as it earns in a year. Lenders are demanding punishing rates.", test: (s) => dgdp(s) > 80 },
  // ---------------------------------------------------------------- jobs
  { id: "u10", icon: "👷", tone: "good", big: "JOBS, JOBS, JOBS", title: "Unemployment below 10%", body: "Fewer young Nigerians are at home with certificates and no work. The japa queue at the embassies is shorter.", test: (s) => s.jobs.unemployment < 10 },
];
export const RECORD_BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r])) as Record<string, RecordDef>;

export const isRecord = (achId: string) => achId.startsWith("rec:");
export const recordOf = (achId: string) => RECORD_BY_ID[achId.slice(4)];

/** Monthly: award any record crossed for the first time. Stored as achievements with a "rec:" prefix. */
export function checkRecords(s: FixState): string[] {
  const got: string[] = [];
  const pegged = typeof s.flags.peg === "number";
  for (const r of RECORDS) {
    const id = `rec:${r.id}`;
    if (s.achievements.some((a) => a.id === id)) continue;
    if (!r.test(s)) continue;
    // a peg is a decree, not a market: say so
    const fake = pegged && r.id.startsWith("n") && r.tone === "good";
    s.achievements.push({ id, label: `${r.big}: ${r.title}${fake ? " (official rate only)" : ""}`, month: s.month });
    pushNews(s, { source: `ach:${id}`, headline: `${r.big}: ${r.title}`, body: fake ? `${r.body} Officially. On the black market a dollar still costs ₦${Math.round(Number(s.flags.shadowFx ?? s.eco.fx)).toLocaleString()}.` : r.body, tone: r.tone });
    got.push(r.id);
  }
  return got;
}
