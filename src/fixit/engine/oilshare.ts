/**
 * Who owns Nigeria's oil. Most crude comes from joint ventures (JVs) between the state oil company (NNPC) and the big
 * companies: NNPC holds about 55 to 60 per cent and the partners (Shell, TotalEnergies, Eni and others) the rest. Deep-water
 * fields run on production-sharing contracts, where the state's cut is about 60 per cent of profit oil, and small
 * "marginal" fields belong to Nigerian companies. Overall the country keeps about 58 per cent of the value of a barrel.
 * Here you can buy out partners, squeeze the terms, hand blocks to Nigerian firms, or sell stakes for cash. Every
 * move changes oil revenue, investor confidence, and the cash-call bill you owe the partners. Shares and figures are
 * simplified from public reporting and are not exact.
 */
import type { FixState } from "./types";
import { addMod, clamp, clamp100, jflag, pushNews, removeMods } from "./util";
import { payPc } from "./meta";
import { noteStolen } from "./ledger";

export interface Block {
  id: string; name: string; kind: "jv" | "psc" | "local"; prod: number;
  /** the state's equity (JV) or its share of profit oil (PSC), 0..1 */
  state: number; partners: { who: string; share: number }[]; blurb: string; floor: number; ceiling: number;
}
const SEED: Block[] = [
  { id: "spdc", name: "Western Niger Delta onshore JV", kind: "jv", prod: 0.17, state: 0.55, partners: [{ who: "Shell", share: 0.3 }, { who: "TotalEnergies", share: 0.1 }, { who: "Eni", share: 0.05 }], blurb: "The oldest and biggest joint venture, in the swamps. Pipelines leak and thieves tap them.", floor: 0.4, ceiling: 0.95 },
  { id: "mpn", name: "Offshore shelf JV (Mobil fields)", kind: "jv", prod: 0.12, state: 0.6, partners: [{ who: "ExxonMobil", share: 0.4 }], blurb: "Shallow-water fields off Akwa Ibom, steady and well run.", floor: 0.4, ceiling: 0.95 },
  { id: "cnl", name: "Chevron JV (Escravos and Delta fields)", kind: "jv", prod: 0.13, state: 0.6, partners: [{ who: "Chevron", share: 0.4 }], blurb: "Gas and oil in the western Delta.", floor: 0.4, ceiling: 0.95 },
  { id: "naoc", name: "Eni JV (Niger Delta and Imo)", kind: "jv", prod: 0.08, state: 0.6, partners: [{ who: "Eni", share: 0.2 }, { who: "Nigerian partner", share: 0.2 }], blurb: "Smaller, with a lot of theft and community trouble.", floor: 0.4, ceiling: 0.95 },
  { id: "deep", name: "Deep-water fields (Bonga, Agbami, Erha, Egina)", kind: "psc", prod: 0.32, state: 0.6, partners: [{ who: "Shell, Chevron, Total, Exxon", share: 0.4 }], blurb: "Floating platforms in 1,000 metres of water. The partners pay all the costs and share the oil afterwards.", floor: 0.45, ceiling: 0.8 },
  { id: "marginal", name: "Marginal fields and Nigerian firms", kind: "local", prod: 0.18, state: 0.48, partners: [{ who: "Nigerian companies", share: 0.52 }], blurb: "Small fields that foreign majors left behind. Nigerian-owned, fast, sometimes shady.", floor: 0.3, ceiling: 0.7 },
];
export interface OilShare { blocks: Block[]; sold: number; indig: number }
const store = (s: FixState): OilShare => jflag<OilShare>(s, "oilshare", { blocks: SEED.map((b) => ({ ...b, partners: b.partners.map((p) => ({ ...p })) })), sold: 0, indig: 0 });
const put = (s: FixState, o: OilShare) => { s.flags.oilshare = JSON.stringify(o); };
export const oilShare = (s: FixState) => { const o = store(s); if (!s.flags.oilshare) put(s, o); return o; };
/** what the country keeps of each barrel's money, 0..1 */
export const take = (s: FixState) => oilShare(s).blocks.reduce((a, b) => a + b.prod * b.state, 0);
export const BASE_TAKE = SEED.reduce((a, b) => a + b.prod * b.state, 0);

type R = { ok: boolean; message: string };
const bnNgn = (s: FixState, usd: number) => usd * s.eco.fx;
const stakeValueUsd = (s: FixState, b: Block) => 6 * b.prod * (s.eco.oilPrice / 75); // $bn for 10 points of equity, scaled by price
export const stepCost = (s: FixState, b: Block) => Math.round(stakeValueUsd(s, b) * 0.5 * 100) / 100; // $bn for 5 points
export function buyoutBlock(s: FixState, id: string): string | null {
  const o = oilShare(s); const b = o.blocks.find((x) => x.id === id); if (!b) return "Unknown block.";
  if (b.kind === "local") return "Nigerian firms own these. Use Indigenise or tighten terms instead.";
  if (b.state >= b.ceiling) return "Nigeria already holds as much as it sensibly can.";
  if (!b.partners.length) return "No partner left to buy out.";
  if (stepCost(s, b) * s.eco.fx > s.fin.treasury - 200) return "Not enough cash.";
  return null;
}
export function buyout(s: FixState, id: string): R {
  const err = buyoutBlock(s, id); if (err) return { ok: false, message: err };
  const e = payPc(s, 3, "buy out a partner"); if (e) return { ok: false, message: e };
  const o = oilShare(s); const b = o.blocks.find((x) => x.id === id)!; const usd = stepCost(s, b);
  s.fin.treasury -= bnNgn(s, usd); b.state = clamp(b.state + 0.05, 0, b.ceiling);
  const p = b.partners[0]; p.share = Math.max(0, p.share - 0.05); if (p.share <= 0.0001) b.partners.shift();
  s.eco.investor = clamp100(s.eco.investor - 1.2); put(s, o);
  pushNews(s, { source: `buyout:${id}:${s.month}`, headline: `Nigeria raises its stake in the ${b.name}`, body: `${p.who} sells five points. Oil analysts ask whether the state can fund its share of the costs.`, tone: "neutral" });
  return { ok: true, message: `You paid $${usd.toFixed(2)}bn for 5 more points of the ${b.name}. The state now holds ${Math.round(b.state * 100)}%. Your share of the running costs rises too.` };
}
export function sellStake(s: FixState, id: string): R {
  const o = oilShare(s); const b = o.blocks.find((x) => x.id === id); if (!b) return { ok: false, message: "Unknown block." };
  if (b.state <= b.floor) return { ok: false, message: "That would leave Nigeria with too little of its own oil." };
  const e = payPc(s, 3, "sell a stake"); if (e) return { ok: false, message: e };
  const usd = stepCost(s, b) * 0.85; b.state = clamp(b.state - 0.05, b.floor, 1); o.sold += 0.05; put(s, o);
  s.fin.treasury += bnNgn(s, usd); s.eco.reserves += usd * 0.6; s.eco.investor = clamp100(s.eco.investor + 1);
  pushNews(s, { source: `sell:${id}:${s.month}`, headline: `Nigeria sells a slice of the ${b.name}`, body: "Cash now, less oil money every month for as long as the field runs.", tone: "neutral" });
  return { ok: true, message: `You sold 5 points of the ${b.name} for $${usd.toFixed(2)}bn. Oil revenue is a little lower for good.` };
}
export function renegotiate(s: FixState, id: string): R {
  const o = oilShare(s); const b = o.blocks.find((x) => x.id === id); if (!b) return { ok: false, message: "Unknown block." };
  if (b.kind === "jv") return { ok: false, message: "A JV's split is its equity. Buy out partners instead." };
  if (b.state >= b.ceiling) return { ok: false, message: "Nobody will sign worse terms." };
  const key = `oilterms:${id}`; if (s.month - Number(s.flags[key] ?? -99) < 24) return { ok: false, message: "The companies say you only just changed the terms." };
  const e = payPc(s, 4, "tighten oil terms"); if (e) return { ok: false, message: e };
  s.flags[key] = s.month; const win = s.foreign.rel.usa + s.rule.democracy > 100 ? 0.62 : 0.5;
  if (((s.month * 7 + Math.round(s.eco.oilPrice)) % 100) / 100 < win) { b.state = clamp(b.state + 0.04, 0, b.ceiling); s.eco.investor = clamp100(s.eco.investor - 3); put(s, o); return { ok: true, message: `New terms signed on the ${b.name}: the state's share rises to ${Math.round(b.state * 100)}%. The companies are unhappy and investors take note.` }; }
  s.eco.investor = clamp100(s.eco.investor - 5); s.rule.intlPressure = clamp100(s.rule.intlPressure + 2);
  return { ok: false, message: "The companies refuse, threaten arbitration abroad, and rattle investors. Nothing changes." };
}
export function indigenise(s: FixState, id: string, toFriend: boolean): R {
  const o = oilShare(s); const b = o.blocks.find((x) => x.id === id); if (!b) return { ok: false, message: "Unknown block." };
  if (b.kind === "local") return { ok: false, message: "Already Nigerian." };
  if (!b.partners.length) return { ok: false, message: "No foreign partner to replace." };
  const e = payPc(s, 4, "hand a block to Nigerian firms"); if (e) return { ok: false, message: e };
  const p = b.partners[0]; const move = Math.min(p.share, 0.1); p.share -= move; if (p.share <= 0.0001) b.partners.shift();
  const nat = b.partners.find((x) => x.who === "Nigerian partner"); if (nat) nat.share += move; else b.partners.push({ who: "Nigerian partner", share: move });
  o.indig += move; put(s, o);
  s.jobs.sme = clamp100(s.jobs.sme + 0.6); s.eco.investor = clamp100(s.eco.investor - 1.5);
  let extra = "";
  if (toFriend) { const cut = 420; s.me.wealth += cut; s.me.evidence = clamp(s.me.evidence + 9, 0, 100); noteStolen(s, cut / 1000); s.me.acts = [...s.me.acts, "kickback"].slice(-30); s.gov.corruption = clamp100(s.gov.corruption + 1); extra = ` A "signature bonus" of ₦${cut}m reaches you.`; }
  else { s.gov.transparency = clamp(s.gov.transparency + 0.5, 0, 100); }
  pushNews(s, { source: `indig:${id}:${s.month}`, headline: `${p.who} hands a slice of the ${b.name} to a Nigerian firm`, body: toFriend ? "Critics ask who the new owner really is." : "The change follows an open bidding round.", tone: toFriend ? "bad" : "good" });
  return { ok: true, message: `Ten points of the ${b.name} pass from ${p.who} to a Nigerian company.${toFriend ? " Chosen without a bidding round." : " Chosen by open bidding."}${extra}` };
}
export const cashCallMonthly = (s: FixState) => oilShare(s).blocks.filter((b) => b.kind !== "local").reduce((a, b) => a + Math.max(0, b.state - 0.4) * b.prod * 60, 0) * (0.6 + 0.4 * s.eco.priceLevel / 100);

export function oilShareMonthly(s: FixState) {
  const t = take(s); removeMods(s, "oilshare");
  const oil = Math.max(0, s.fin.oilRev);
  const gain = oil * (t / BASE_TAKE - 1); // the game's oil revenue is calibrated to today's take
  const eff: Record<string, number> = { revenue: gain, investor: -clamp((t - BASE_TAKE) * 22, -3, 6) };
  addMod(s, "oilshare", "How much of the oil Nigeria owns", eff as never, { duration: null, ramp: 2 });
  // you pay your share of the costs in the JVs; if you cannot, partners cut investment and output slips
  const call = cashCallMonthly(s);
  if (call > 0) { s.fin.treasury -= call; if (s.fin.treasury < 150) { s.oil.production = Math.max(400, s.oil.production * 0.997); if (s.month % 6 === 0) pushNews(s, { source: `cashcall:${s.month}`, headline: "Joint-venture partners complain of unpaid cash calls", body: "The state could not fund its share. Drilling slows and output slips.", tone: "bad" }); } }
}
export { clamp100 };
