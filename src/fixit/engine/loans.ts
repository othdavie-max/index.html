/**
 * The loan book. Nigeria's debt is not one number: it is a list of real creditors with different rates, due dates and
 * strings. This file keeps that list. It always adds up to the two totals the rest of the game uses (naira debt and
 * dollar debt): anything borrowed elsewhere in the game (deficit financing, event loans) is added to the book as
 * "new borrowing", and repayments take money out of the right lines.
 *
 * Mechanics: bonds come due and are rolled over if lenders still trust you (they cost more if your rating is weak, and
 * if they refuse you must pay cash or fall into arrears); crude-backed loans are paid back automatically in oil;
 * multilateral lenders are cheap and slow and come with conditions; Chinese loans are fast and come with strings; you
 * can prepay any line, usually starting with the dearest. Names and sizes are simplified from Nigeria's public debt data.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, jflag, nb, pushNews } from "./util";
import { noteStolen } from "./ledger";
import { payPc } from "./meta";

export type LenderId = "ida" | "afdb" | "imf" | "eurobond" | "chinaexim" | "bilateral" | "afrexim" | "fgnbond" | "tbills" | "cbn" | "sukuk" | "other";
export interface Lender {
  id: LenderId; name: string; icon: string; cur: "ngn" | "usd"; blurb: string; strings: string;
  /** largest single loan, in the lender's currency (₦bn or $bn) */
  max: number; termYears: number; cooldown: number; float?: boolean; oil?: boolean; kickback?: boolean;
  open: (s: FixState) => string | null; rate: (s: FixState) => number;
}
const mkt = (s: FixState) => s.fin.domRate;
export const LENDERS: Lender[] = [
  { id: "ida", name: "World Bank (IDA)", icon: "🌍", cur: "usd", blurb: "The cheapest money there is, for roads, schools and clinics.", strings: "Slow, tied to projects, and demands cleaner procurement.", max: 2, termYears: 30, cooldown: 12, open: (s) => (s.fin.creditRating >= 15 ? null : "They will not lend while the credit rating is this weak."), rate: () => 3 },
  { id: "afdb", name: "African Development Bank", icon: "🏦", cur: "usd", blurb: "Cheap, friendly, and a little small.", strings: "Favours power, farming and roads.", max: 1, termYears: 20, cooldown: 9, open: (s) => (s.fin.creditRating >= 15 ? null : "Rating too low."), rate: () => 4.5 },
  { id: "imf", name: "IMF", icon: "🏛️", cur: "usd", blurb: "Big, cheap and credible. The money comes with a lecture.", strings: "Wants a floating naira, a smaller subsidy and tighter spending. The streets will grumble.", max: 3, termYears: 8, cooldown: 24, open: (s) => (s.eco.reserves < 25 || s.fin.creditRating < 35 ? null : "The IMF only lends to countries in real trouble."), rate: () => 4.5 },
  { id: "eurobond", name: "Eurobond investors", icon: "📈", cur: "usd", blurb: "Fast and big. The market sets the price.", strings: "Dear when your rating is weak, and repaid in dollars: a falling naira makes it heavier.", max: 3, termYears: 10, cooldown: 6, kickback: true, open: (s) => (s.fin.creditRating >= 25 ? null : "Investors will not buy bonds at this rating."), rate: (s) => clamp(8 + (60 - s.fin.creditRating) * 0.15 + 0.1 * Math.max(0, s.eco.inflation - 15), 7, 16) },
  { id: "chinaexim", name: "China Exim Bank", icon: "🇨🇳", cur: "usd", blurb: "Fast, big and asks few questions.", strings: "Chinese contractors build it, Washington frowns, and the books are less open.", max: 3, termYears: 20, cooldown: 12, kickback: true, open: (s) => (s.foreign.rel.china >= 35 ? null : "China is not warm enough."), rate: () => 3.5 },
  { id: "bilateral", name: "Other governments (France, Japan, Germany)", icon: "🤝", cur: "usd", blurb: "Cheap, tied to their firms and their projects.", strings: "Their companies get the contracts.", max: 1, termYears: 25, cooldown: 12, open: (s) => (s.foreign.rel.usa >= 40 ? null : "Western governments are not warm enough."), rate: () => 2.5 },
  { id: "afrexim", name: "Afreximbank (paid in crude oil)", icon: "🛢️", cur: "usd", blurb: "Quick money against future oil. Lenders are repaid in barrels.", strings: "A share of your crude goes to the lender every month until it is paid off, whatever else happens.", max: 2, termYears: 5, cooldown: 12, oil: true, kickback: true, open: (s) => (s.oil.production > 600 ? null : "There is not enough oil to pledge."), rate: () => 10 },
  { id: "fgnbond", name: "Naira bonds (investors and banks)", icon: "📜", cur: "ngn", blurb: "Borrow at home for years at a fixed rate.", strings: "Pushes up interest rates and leaves less for business loans.", max: 3000, termYears: 10, cooldown: 3, open: (s) => (s.fin.domRate < 36 ? null : "Rates are too high."), rate: (s) => mkt(s) + 1.5 },
  { id: "tbills", name: "Treasury bills", icon: "🧾", cur: "ngn", blurb: "Short-term borrowing at the going rate.", strings: "Rolled over every year, so the interest bill moves with the market.", max: 3000, termYears: 1, cooldown: 1, float: true, open: () => null, rate: (s) => mkt(s) },
  { id: "cbn", name: "Central bank advance (\"ways and means\")", icon: "🖨️", cur: "ngn", blurb: "The central bank prints the money and lends it to you.", strings: "Cheap and instant, but it feeds inflation and the markets hate it.", max: 1500, termYears: 1, cooldown: 3, float: true, open: () => null, rate: () => 9 },
  { id: "sukuk", name: "Sukuk (Islamic bonds)", icon: "☪️", cur: "ngn", blurb: "Bonds that fund roads and pay like rent, not interest.", strings: "Smaller, but it pleases investors and the faithful.", max: 600, termYears: 7, cooldown: 6, open: () => null, rate: (s) => mkt(s) - 1 },
  { id: "other", name: "New borrowing", icon: "➕", cur: "ngn", blurb: "", strings: "", max: 0, termYears: 5, cooldown: 99, open: () => "Not for sale", rate: (s) => mkt(s) },
];
export const LENDER_BY_ID = Object.fromEntries(LENDERS.map((l) => [l.id, l])) as Record<LenderId, Lender>;

export interface Loan {
  id: string; lender: LenderId; label: string; cur: "ngn" | "usd"; bal: number; rate: number; float?: boolean;
  start: number; maturity: number; oil?: boolean; /** the original size, to show how much has been paid back */ orig: number; cut?: number;
}
const KEY = "loanbook";
const f1 = (n: number) => Math.round(n * 1000) / 1000;
function seed(s: FixState): Loan[] {
  const m = s.month, f = s.fin;
  const D = (id: string, lender: LenderId, label: string, share: number, rate: number, years: number, float = false): Loan => ({ id, lender, label, cur: "ngn", bal: f1(f.domesticDebt * share), orig: f1(f.domesticDebt * share), rate, float, start: m - 24, maturity: m + Math.round(years * 12) });
  const U = (id: string, lender: LenderId, label: string, usd: number, rate: number, years: number, oil = false): Loan => ({ id, lender, label, cur: "usd", bal: f1(f.foreignDebt * usd), orig: f1(f.foreignDebt * usd), rate, start: m - 36, maturity: m + Math.round(years * 12), oil });
  const dom = [D("b29", "fgnbond", "Naira bond due 2029", 0.17, 13.5, 4), D("b32", "fgnbond", "Naira bond due 2032", 0.2, 15.5, 7), D("b35", "fgnbond", "Naira bond due 2035", 0.19, 16.5, 10), D("tb", "tbills", "Treasury bills", 0.24, f.domRate, 1, true), D("wm", "cbn", "Central bank advances (ways and means)", 0.12, 9, 1, true), D("suk", "sukuk", "Sukuk", 0.04, 14, 6), D("pn", "other", "Promissory notes and arrears", 0.04, 12, 3)];
  const usd = [U("ida", "ida", "World Bank (IDA) loans", 0.345, 3, 26), U("e29", "eurobond", "Eurobond due 2029", 0.035, 9, 4), U("e31", "eurobond", "Eurobond due 2031", 0.085, 9.2, 6), U("e33", "eurobond", "Eurobond due 2033", 0.095, 9.5, 8), U("e38", "eurobond", "Eurobond due 2038", 0.085, 10, 13), U("cx", "chinaexim", "China Exim Bank loans (rail, ports, power)", 0.12, 3.5, 14), U("afdb", "afdb", "African Development Bank", 0.07, 4.5, 15), U("imf", "imf", "IMF (emergency financing)", 0.05, 4.5, 4), U("bil", "bilateral", "France, Japan and Germany", 0.07, 2.5, 18), U("afx", "afrexim", "Afreximbank crude-backed facility", 0.036, 10, 4, true), U("oc", "other", "Other commercial banks", 0.012, 11, 5)];
  const sum = (l: Loan[]) => l.reduce((a, x) => a + x.bal, 0);
  const scale = (l: Loan[], target: number) => { const k = target / Math.max(1e-9, sum(l)); for (const x of l) { x.bal = f1(x.bal * k); x.orig = f1(x.orig * k); } };
  scale(dom, f.domesticDebt); scale(usd, f.foreignDebt);
  return [...dom, ...usd];
}
const save = (s: FixState, l: Loan[]) => { s.flags[KEY] = JSON.stringify(l); };
export function loanBook(s: FixState): Loan[] {
  const l = jflag<Loan[] | null>(s, KEY, null);
  if (l) return syncBook(s, l);
  const fresh = seed(s); save(s, fresh); return fresh;
}
/** keep the book equal to the two totals the rest of the game moves directly */
function syncBook(s: FixState, l: Loan[]): Loan[] {
  let changed = false;
  for (const cur of ["ngn", "usd"] as const) {
    const target = cur === "ngn" ? s.fin.domesticDebt : s.fin.foreignDebt;
    const have = l.filter((x) => x.cur === cur).reduce((a, x) => a + x.bal, 0);
    const diff = target - have; if (Math.abs(diff) < 0.001 * Math.max(1, target)) continue; changed = true;
    if (diff > 0) {
      const id = cur === "ngn" ? "new-ngn" : "new-usd"; let x = l.find((y) => y.id === id);
      if (!x) { x = { id, lender: "other", label: cur === "ngn" ? "New borrowing (deficit financing)" : "New dollar borrowing", cur, bal: 0, orig: 0, rate: cur === "ngn" ? s.fin.domRate : s.fin.forRate, float: cur === "ngn", start: s.month, maturity: s.month + 36 }; l.push(x); }
      x.bal = f1(x.bal + diff); x.orig = f1(x.orig + diff);
    } else {
      let owe = -diff;
      const order = l.filter((x) => x.cur === cur && !x.oil).sort((a, b) => (a.lender === "other" ? -1 : 0) - (b.lender === "other" ? -1 : 0) || b.rate - a.rate);
      for (const x of order) { if (owe <= 0) break; const cut = Math.min(x.bal, owe); x.bal = f1(x.bal - cut); owe -= cut; }
    }
  }
  const out = l.filter((x) => x.bal > 0.0005);
  if (changed || out.length !== l.length) save(s, out);
  return out;
}
export const loanTotals = (s: FixState) => { const l = loanBook(s); return { ngn: l.filter((x) => x.cur === "ngn").reduce((a, x) => a + x.bal, 0), usd: l.filter((x) => x.cur === "usd").reduce((a, x) => a + x.bal, 0) }; };
export const loanRate = (s: FixState, x: Loan) => (x.float ? (x.lender === "cbn" ? 9 : s.fin.domRate) : x.rate);
export const monthsLeft = (s: FixState, x: Loan) => Math.max(0, x.maturity - s.month);
/** the dollar loans' average rate, plus 1 point for fees and guarantees */
export const avgUsdRate = (s: FixState) => { const l = loanBook(s).filter((x) => x.cur === "usd"); const t = l.reduce((a, x) => a + x.bal, 0); return t > 0 ? l.reduce((a, x) => a + x.bal * x.rate, 0) / t + 1 : s.fin.forRate; };
export const oilBarrelsPerDay = (s: FixState, usdPerMonth: number) => Math.round((usdPerMonth * 1e9) / Math.max(20, s.eco.oilPrice) / 30);

type R = { ok: boolean; message: string };
const ADVICE = (s: FixState) => Math.max(0, s.fin.treasury - 400 * (0.6 + 0.4 * s.eco.priceLevel / 100));
const PREPAY_FEE: Partial<Record<LenderId, number>> = { eurobond: 0.03, fgnbond: 0.01 };
export function prepayCost(s: FixState, x: Loan, amt: number) { const base = x.cur === "usd" ? amt * s.eco.fx : amt; return base * (1 + (PREPAY_FEE[x.lender] ?? 0)); }
export function prepay(s: FixState, id: string, amt: number): R {
  const l = loanBook(s); const x = l.find((y) => y.id === id); if (!x) return { ok: false, message: "No such loan." };
  amt = Math.min(amt, x.bal); if (!(amt > 0)) return { ok: false, message: "Choose an amount." };
  const cost = prepayCost(s, x, amt), room = ADVICE(s);
  if (cost > room) return { ok: false, message: `Only ${nb(room)} can be spared while keeping a cash buffer. This costs ${nb(cost)}.` };
  s.fin.treasury -= cost;
  x.bal = f1(x.bal - amt);
  if (x.cur === "usd") { s.fin.foreignDebt = Math.max(0, s.fin.foreignDebt - amt); s.eco.reserves = Math.max(0, s.eco.reserves - amt * 0.1); } else s.fin.domesticDebt = Math.max(0, s.fin.domesticDebt - amt);
  s.fin.creditRating = Math.min(100, s.fin.creditRating + (x.cur === "usd" ? amt * 0.8 : amt / 4000));
  const L = LENDER_BY_ID[x.lender]; if (x.lender === "chinaexim") s.foreign.rel.china = clamp100(s.foreign.rel.china + 1);
  save(s, l.filter((y) => y.bal > 0.0005));
  const left = x.bal > 0.0005;
  return { ok: true, message: `${left ? "Paid back part of" : "Cleared"} ${x.label}: ${x.cur === "usd" ? `$${amt.toFixed(2)}bn` : nb(amt)}${PREPAY_FEE[x.lender] ? ` (a ${Math.round((PREPAY_FEE[x.lender] ?? 0) * 100)}% early-payment fee applied)` : ""}.${L.id === "afrexim" && !left ? " The crude is yours again." : ""}` };
}
/** which loans to clear first: the dearest that you can afford to repay */
export function dearest(s: FixState, n = 3) { return loanBook(s).filter((x) => !x.oil).sort((a, b) => loanRate(s, b) - loanRate(s, a)).slice(0, n); }

export function borrowBlock(s: FixState, id: LenderId): string | null {
  const L = LENDER_BY_ID[id]; if (!L || L.id === "other") return "Unknown lender.";
  const o = L.open(s); if (o) return o;
  const last = Number(s.flags[`loan:${id}`] ?? -99); if (s.month - last < L.cooldown) return `They want ${L.cooldown - (s.month - last)} more month(s) before another loan.`;
  if (id !== "cbn" && id !== "tbills" && id !== "fgnbond" && id !== "sukuk" && L.cur === "ngn") return null;
  return null;
}
export function borrowFrom(s: FixState, id: LenderId, amount: number, kickback = false): R {
  const L = LENDER_BY_ID[id]; const b = borrowBlock(s, id); if (b) return { ok: false, message: b };
  if (!(amount > 0) || amount > L.max) return { ok: false, message: `Choose an amount up to ${L.cur === "usd" ? `$${L.max}bn` : nb(L.max)}.` };
  const dsr = (s.fin.debtService * 12) / Math.max(1, s.fin.revenue * 12);
  if (L.cur === "ngn" && dsr > 0.9) return { ok: false, message: "Debt payments already take almost all revenue. Lenders refuse." };
  const e = payPc(s, 2, `borrow from ${L.name}`); if (e) return { ok: false, message: e };
  const l = loanBook(s); const rate = L.rate(s);
  const loan: Loan = { id: `${id}-${s.month}-${l.length}`, lender: id, label: `${L.name.replace(/ \(.*\)/, "")}, ${monthYear(s.month)}`, cur: L.cur, bal: amount, orig: amount, rate, float: L.float, start: s.month, maturity: s.month + Math.round(L.termYears * 12), oil: L.oil };
  const f = s.fin;
  if (L.cur === "usd") { f.forRate = (f.forRate * f.foreignDebt + (rate + 1) * amount) / (f.foreignDebt + amount); f.foreignDebt += amount; f.treasury += amount * s.eco.fx; s.eco.reserves += amount * 0.5; }
  else { f.domesticDebt += amount; f.treasury += amount; }
  l.push(loan); save(s, l); s.flags[`loan:${id}`] = s.month;
  // what the lender wants in return
  const notes: string[] = [];
  if (id === "ida") { s.gov.procurement = clamp(s.gov.procurement + 1.5, 0, 100); s.gov.transparency = clamp(s.gov.transparency + 1, 0, 100); notes.push("Procurement rules tighten."); }
  if (id === "imf") { s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); s.rule.intlPressure = clamp100(s.rule.intlPressure - 3); s.fin.creditRating = clamp100(s.fin.creditRating + 4); notes.push("Conditions: the streets grumble."); }
  if (id === "chinaexim") { s.foreign.rel.china = clamp100(s.foreign.rel.china + 4); s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 2); s.gov.corruption = clamp100(s.gov.corruption + 0.4); notes.push("Beijing is pleased, Washington is not."); }
  if (id === "bilateral") { s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 2); }
  if (id === "afdb") s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 1.5);
  if (id === "eurobond") { f.creditRating = clamp100(f.creditRating - 1); }
  if (id === "cbn") { addMod(s, `wm:${s.month}`, "Central bank printed money for the government", { inflation: 0.8 * (amount / 1000), fxDemand: 0.3 * (amount / 1000) }, { duration: 12, ramp: 2 }); notes.push("The central bank prints; prices will feel it."); }
  if (id === "fgnbond" || id === "tbills") { f.domRate = Math.min(34, f.domRate + 0.15 * (amount / 1000)); s.jobs.sme = clamp100(s.jobs.sme - 0.4 * (amount / 1000)); }
  if (id === "afrexim") { notes.push("A share of crude is pledged to the lender every month."); }
  if (kickback && L.kickback) { const cut = Math.round(40 + (L.cur === "usd" ? amount * 60 : amount / 60)); s.me.wealth += cut; s.me.evidence = clamp(s.me.evidence + 8, 0, 100); noteStolen(s, cut / 1000); s.me.acts = [...s.me.acts, "kickback"].slice(-30); loan.cut = cut; save(s, l); notes.push(`₦${cut}m "commission" reaches your private account.`); }
  pushNews(s, { source: `loan:${id}:${s.month}`, headline: `Nigeria borrows ${L.cur === "usd" ? `$${amount}bn` : nb(amount)} from ${L.name.replace(/ \(.*\)/, "")}`, body: L.strings, tone: "neutral" });
  return { ok: true, message: `Borrowed ${L.cur === "usd" ? `$${amount}bn` : nb(amount)} at ${rate.toFixed(1)}%, due ${monthYear(loan.maturity)}.${notes.length ? " " + notes.join(" ") : ""}` };
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthYear = (m: number) => `${MONTHS[((m % 12) + 12) % 12]} ${2027 + Math.floor(m / 12)}`;

// ---------------------------------------------------------------- the month
export function loansMonthly(s: FixState, rng: Rng) {
  const l = loanBook(s); const f = s.fin; let changed = false;
  // 1. crude-backed loans are paid in barrels: a slice of oil money goes straight to the lender
  for (const x of l.filter((y) => y.oil && y.bal > 0)) {
    const left = Math.max(1, x.maturity - s.month); const pay = Math.min(x.bal, x.bal / left);
    x.bal = f1(x.bal - pay); f.foreignDebt = Math.max(0, f.foreignDebt - pay); f.treasury -= pay * s.eco.fx; s.flags[`crude:${x.id}`] = oilBarrelsPerDay(s, pay); changed = true;
  }
  // 2. loans come due: rolled over if lenders still trust you, otherwise paid or in arrears
  for (const x of l) {
    if (x.oil || s.month < x.maturity) continue;
    const L = LENDER_BY_ID[x.lender]; const roll = x.cur === "ngn" || x.lender !== "eurobond" || f.creditRating >= 28;
    if (x.lender === "eurobond" || x.lender === "afrexim") {
      if (f.creditRating < 28) { const cost = x.bal * s.eco.fx; if (f.treasury - cost > 200) { f.treasury -= cost; f.foreignDebt = Math.max(0, f.foreignDebt - x.bal); pushNews(s, { source: `repaid:${x.id}`, headline: `Nigeria repays ${x.label} in full`, body: "Investors would not refinance it, so the Treasury paid cash.", tone: "neutral" }); x.bal = 0; changed = true; continue; } f.arrears += cost * 0.4; f.creditRating = Math.max(0, f.creditRating - 6); pushNews(s, { source: `miss:${x.id}`, headline: `Nigeria misses a payment on ${x.label}`, body: "Lenders refused to refinance and the Treasury could not pay. Ratings agencies react.", tone: "bad" }); }
    }
    if (roll) { const newRate = x.float ? x.rate : Math.max(x.rate, L.rate(s)) + (f.creditRating < 35 ? 1.5 : 0); x.rate = x.cur === "ngn" ? Math.max(8, Math.min(30, newRate)) : Math.min(16, newRate); x.maturity = s.month + Math.round(L.termYears * 12); x.label = x.label.replace(/ due \d{4}/, ` (rolled ${monthYear(s.month)})`); pushNews(s, { source: `roll:${x.id}:${s.month}`, headline: `${x.label} refinanced at ${x.rate.toFixed(1)}%`, body: "The debt office extends the loan, at today's price.", tone: "neutral" }); changed = true; }
  }
  // 3. the dollar side's average cost follows the book
  const usd = l.filter((x) => x.cur === "usd" && x.bal > 0);
  if (usd.length) f.forRate = avgUsdRate(s);
  if (changed) save(s, l.filter((x) => x.bal > 0.0005));
  void rng;
}
/** loans falling due in the next N months, soonest first */
export const dueSoon = (s: FixState, months = 24) => loanBook(s).filter((x) => !x.oil && x.maturity - s.month <= months && x.maturity >= s.month).sort((a, b) => a.maturity - b.maturity);
