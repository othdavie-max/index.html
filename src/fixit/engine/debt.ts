/** National debt: how much the country owes, whether it is getting better, and the road to being debt-free. */
import type { FixState } from "./types";
import { annualGdpNgn, debtServiceRatio, debtTotalNgn, nb, pushNews } from "./util";

export interface DebtView { total: number; domestic: number; foreign: number; foreignUsd: number; pctGdp: number; dsr: number; rate: number; rating: number; interest: number; label: string; tone: "good" | "ok" | "warn" | "bad"; yearsLeft: number | null }
export const DEBT_FREE_AT = 5;
export function debtView(s: FixState): DebtView {
  const total = debtTotalNgn(s), gdp = annualGdpNgn(s), pct = (total / gdp) * 100;
  const f = s.fin, foreign = f.foreignDebt * s.eco.fx;
  const h = s.history, past = h.length > 12 ? h[h.length - 13].debtGdp : null;
  const drop = past === null ? 0 : past - pct; // per year
  const yearsLeft = pct <= DEBT_FREE_AT ? 0 : drop > 0.5 ? Math.ceil((pct - DEBT_FREE_AT) / drop) : null;
  const label = pct <= DEBT_FREE_AT ? "Debt-free" : pct < 20 ? "Low debt" : pct < 40 ? "Manageable" : pct < 60 ? "Heavy" : "Crushing";
  return { total, domestic: f.domesticDebt, foreign, foreignUsd: f.foreignDebt, pctGdp: pct, dsr: debtServiceRatio(s) * 100, rate: f.domRate, rating: f.creditRating, interest: f.debtService, label, tone: pct <= 20 ? "good" : pct < 40 ? "ok" : pct < 60 ? "warn" : "bad", yearsLeft };
}
export const debtFree = (s: FixState) => debtView(s).pctGdp <= DEBT_FREE_AT;

/** pay down dollar debt from the treasury */
export function repayForeign(s: FixState, usd: number): { ok: boolean; message: string } {
  const f = s.fin;
  if (!(usd > 0)) return { ok: false, message: "Enter an amount." };
  if (usd > f.foreignDebt) return { ok: false, message: "That is more than the foreign debt." };
  const cost = usd * s.eco.fx, room = Math.max(0, f.treasury - 400 * (0.6 + 0.4 * s.eco.priceLevel / 100));
  if (cost > room) return { ok: false, message: `Only ${nb(room)} can be spared while keeping a cash buffer. This needs ${nb(cost)}.` };
  f.treasury -= cost; f.foreignDebt -= usd;
  s.eco.reserves = Math.max(0, s.eco.reserves - usd * 0.1);
  s.fin.creditRating = Math.min(100, s.fin.creditRating + usd * 0.8);
  return { ok: true, message: `Repaid $${usd}bn of foreign debt (${nb(cost)}). Interest payments fall.` };
}

/** Monthly: the annual debt review, and the debt-free moment */
export function debtMonthly(s: FixState) {
  const d = debtView(s);
  if (s.month > 0 && s.month % 12 === 11) pushNews(s, { source: `debtrev:${s.month}`, headline: `Annual debt review: ${d.label.toLowerCase()}, ${d.pctGdp.toFixed(0)}% of the economy`, body: `Debt payments take ${d.dsr.toFixed(0)}% of revenue. ${d.yearsLeft === 0 ? "You are debt-free." : d.yearsLeft ? `At this pace you are debt-free in about ${d.yearsLeft} years.` : "Debt is not falling: it is time to decide whether to borrow less or repay more."}`, tone: d.tone === "bad" || d.tone === "warn" ? "bad" : "good" });
  if (d.pctGdp <= DEBT_FREE_AT && !s.flags.debtFree) { s.flags.debtFree = s.month; s.fin.creditRating = Math.min(100, s.fin.creditRating + 10); s.eco.investor = Math.min(100, s.eco.investor + 5); }
}
