import { I } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { netWorth } from "./kidnap";
import type { EventDef, FeedItem, Market, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

type Tone = "up" | "down" | "flat";
interface MarketEvent {
  id: string;
  weight: number;
  tone: Tone;
  en: string;
  pcm: string;
  /** Effects applied when the news hits, as multipliers on each index. */
  hit: (m: Market, p: Player) => void;
  /** Event that follows a couple of months later. */
  then?: string;
}

const mul = (m: Market, k: "ngx" | "crypto" | "penny" | "cfund" | "reit" | "bond" | "fund", f: number) => { m[k] = Math.max(2, (m[k] ?? 100) * f); };

const EVENTS: MarketEvent[] = [
  { id: "hike", weight: 1.3, tone: "down", en: "The central bank raises interest rates. Stocks and bonds slide, but treasury bills pay more.", pcm: "Central bank raise interest rate. Stocks and bonds dey slide, but treasury bills go pay pass.", hit: (m) => { mul(m, "ngx", 0.94); mul(m, "bond", 0.96); mul(m, "crypto", 0.95); mul(m, "fund", 0.97); m.tbill = clamp(m.tbill + 0.015, 0.08, 0.3); } },
  { id: "cut", weight: 0.9, tone: "up", en: "Interest rates are cut. Stocks and bonds rally.", pcm: "Dem cut interest rate. Stocks and bonds dey rally.", hit: (m) => { mul(m, "ngx", 1.05); mul(m, "bond", 1.03); mul(m, "fund", 1.03); mul(m, "reit", 1.02); m.tbill = clamp(m.tbill - 0.012, 0.08, 0.3); } },
  { id: "oilup", weight: 1, tone: "up", en: "Oil prices surge. The naira firms and the stock market jumps.", pcm: "Oil price jump. Naira firm and stock market jump.", hit: (m) => { mul(m, "ngx", 1.08); mul(m, "reit", 1.02); mul(m, "fund", 1.04); } },
  { id: "oildown", weight: 1, tone: "down", en: "Oil prices crash. Stocks tumble and the dollar gains.", pcm: "Oil price crash. Stocks fall and dollar gain.", hit: (m) => { mul(m, "ngx", 0.91); mul(m, "fund", 0.95); mul(m, "reit", 0.97); } },
  { id: "devalue", weight: 0.8, tone: "down", en: "The naira is devalued again. Dollar savings gain, stocks wobble.", pcm: "Dem devalue naira again. Dollar savings gain, stocks dey shake.", hit: (m) => { mul(m, "ngx", 0.97); mul(m, "bond", 0.97); } },
  { id: "recap", weight: 0.8, tone: "up", en: "Banks announce recapitalisation plans. Bank stocks rally hard.", pcm: "Banks announce recapitalisation. Bank stocks dey rally well well.", hit: (m) => { mul(m, "ngx", 1.1); mul(m, "fund", 1.05); } },
  { id: "earnings", weight: 1.2, tone: "up", en: "A strong earnings season lifts blue-chip stocks.", pcm: "Strong earnings season lift blue-chip stocks.", hit: (m) => { mul(m, "ngx", 1.05); mul(m, "fund", 1.02); } },
  { id: "etf", weight: 0.7, tone: "up", en: "Crypto hype: a major fund approval sends coins soaring.", pcm: "Crypto hype: big fund approval make coins fly.", hit: (m) => { mul(m, "crypto", 1.45); mul(m, "cfund", 1.25); mul(m, "penny", 1.1); } },
  { id: "hack", weight: 0.7, tone: "down", en: "A major crypto exchange is hacked. Prices plunge.", pcm: "Dem hack one big crypto exchange. Price dey plunge.", hit: (m) => { mul(m, "crypto", 0.65); mul(m, "cfund", 0.82); } },
  { id: "pump", weight: 0.9, tone: "up", en: "A social-media frenzy pumps penny stocks. Everyone is talking about them.", pcm: "Social-media frenzy dey pump penny stocks. Everybody dey talk about am.", hit: (m) => { mul(m, "penny", 2.2); }, then: "dump" },
  { id: "dump", weight: 0, tone: "down", en: "The penny stock frenzy ends in a crash. Latecomers are wiped out.", pcm: "Penny stock frenzy end for crash. People wey enter late don lose.", hit: (m) => { mul(m, "penny", 0.35); } },
  { id: "election", weight: 0.8, tone: "down", en: "Election tension rattles investors. Risky assets fall.", pcm: "Election tension dey shake investors. Risky assets dey fall.", hit: (m) => { mul(m, "ngx", 0.93); mul(m, "penny", 0.85); mul(m, "bond", 0.98); } },
  { id: "auction", weight: 0.8, tone: "up", en: "A government bond auction is oversubscribed. Bond prices rise.", pcm: "Dem oversubscribe government bond auction. Bond price dey rise.", hit: (m) => { mul(m, "bond", 1.025); } },
  { id: "recession", weight: 0.6, tone: "down", en: "Global recession fears hit markets everywhere.", pcm: "Global recession fear dey hit market everywhere.", hit: (m) => { mul(m, "ngx", 0.92); mul(m, "crypto", 0.8); mul(m, "penny", 0.8); mul(m, "reit", 0.97); } },
  { id: "housing", weight: 0.7, tone: "up", en: "A housing boom lifts real estate funds.", pcm: "Housing boom dey lift real estate funds.", hit: (m) => { mul(m, "reit", 1.06); } },
];
const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<string, MarketEvent>;

function pushFeed(m: Market, p: Player, item: Omit<FeedItem, "age" | "month">) {
  (m.feed ??= []).push({ age: p.age, month: p.month, ...item });
  if (m.feed.length > 16) m.feed.splice(0, m.feed.length - 16);
}

/** Starts a new market mood now and then. */
function regimeStep(m: Market, p: Player) {
  m.regimeLeft = (m.regimeLeft ?? 12) - 1;
  if (m.regimeLeft > 0) return;
  const r = rand(0, 1);
  const next: Market["regime"] = r < 0.3 ? "bull" : r < 0.72 ? "normal" : "bear";
  m.regime = next;
  m.regimeLeft = randInt(6, 20);
  if (next === "bull") pushFeed(m, p, { kind: "news", tone: "up", en: "Investor mood turns bullish. Markets are climbing.", pcm: "Investors mood don turn bullish. Market dey climb." });
  if (next === "bear") pushFeed(m, p, { kind: "news", tone: "down", en: "A bear market begins as investors run for safety.", pcm: "Bear market don start as investors dey run for safety." });
}

/** Adviser quality decides how often a warning is right. */
const accuracy = (tier: number) => [0, 0.55, 0.75, 0.92][tier] ?? 0.55;

export function marketDynamics(p: Player) {
  const m = p.market;
  m.pending ??= [];
  m.feed ??= [];
  regimeStep(m, p);
  const reg = m.regime ?? "normal";
  const drift = reg === "bull" ? 0.012 : reg === "bear" ? -0.016 : 0.003;
  m.ngx = Math.max(5, m.ngx * (1 + rand(-0.06, 0.07) + drift));
  m.fund = Math.max(5, m.fund * (1 + rand(-0.02, 0.03) + drift * 0.5 + 0.002));
  const cryptoMove = rand(-0.18, 0.2) + drift * 2;
  m.crypto = Math.max(2, m.crypto * (1 + cryptoMove));
  m.cfund = Math.max(2, (m.cfund ?? 100) * (1 + cryptoMove * 0.55 - 0.0015));
  m.penny = Math.max(1, (m.penny ?? 100) * (1 + rand(-0.3, 0.28) + drift * 2.5 - 0.006));
  m.reit = Math.max(5, (m.reit ?? 100) * (1 + rand(-0.012, 0.02) + drift * 0.25 + 0.006));
  m.bond = Math.max(5, (m.bond ?? 100) * (1 + (m.tbill + 0.03) / 12 + rand(-0.012, 0.012) + (reg === "bear" ? 0.003 : 0)));
  if (chance(0.012)) m.crypto *= 0.5;
  else if (chance(0.012)) m.crypto *= 1.8;

  // Queued news arrives.
  for (const q of m.pending) q.inMonths -= 1;
  const due = m.pending.filter((q) => q.inMonths <= 0);
  m.pending = m.pending.filter((q) => q.inMonths > 0);
  for (const q of due) applyEvent(p, q.id);

  // Fresh news is decided now, sometimes with a delay a good adviser can see coming.
  if (chance(0.2)) {
    const total = EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = rand(0, total);
    let ev = EVENTS[0];
    for (const e of EVENTS) { r -= e.weight; if (r <= 0) { ev = e; break; } }
    const delay = randInt(0, 3);
    if (delay === 0) applyEvent(p, ev.id);
    else {
      m.pending.push({ inMonths: delay, id: ev.id });
      if (p.advisor && chance(accuracy(p.advisor.tier))) {
        pushFeed(m, p, { kind: "tip", tone: ev.tone, en: `${p.advisor.name} (your adviser) says: expect this in about ${delay} month${delay > 1 ? "s" : ""}: ${ev.en}`, pcm: `${p.advisor.name} (your adviser) talk say: expect this in like ${delay} month${delay > 1 ? "s" : ""}: ${ev.pcm}` });
      }
    }
  }
  // A weaker adviser also gives the odd false alarm.
  if (p.advisor && chance(0.04 * (4 - p.advisor.tier))) {
    const fake = pick(EVENTS.filter((e) => e.weight > 0));
    pushFeed(m, p, { kind: "tip", tone: fake.tone, en: `${p.advisor.name} (your adviser) has a hunch, not a certainty: ${fake.en}`, pcm: `${p.advisor.name} (your adviser) get feeling, but e never sure: ${fake.pcm}` });
  }
}

function applyEvent(p: Player, id: string) {
  const ev = EVENT_BY_ID[id];
  if (!ev) return;
  ev.hit(p.market, p);
  pushFeed(p.market, p, { kind: "news", tone: ev.tone, en: ev.en, pcm: ev.pcm });
  if (id === "devalue") for (const h of p.holdings) if (h.kind === "usd") h.value = Math.round(h.value * 1.12);
  if (id === "oildown") for (const h of p.holdings) if (h.kind === "usd") h.value = Math.round(h.value * 1.05);
  if (id === "oilup") for (const h of p.holdings) if (h.kind === "usd") h.value = Math.round(h.value * 0.97);
  if (ev.then) (p.market.pending ??= []).push({ inMonths: randInt(2, 3), id: ev.then });
}

// ---------------------------------------------------------------------------
// The financial adviser
// ---------------------------------------------------------------------------
export const ADVISOR_TIERS: { tier: 1 | 2 | 3; en: string; pcm: string; fee: number; need: number; alpha: number }[] = [
  { tier: 1, en: "Junior adviser", pcm: "Junior adviser", fee: 250_000, need: 30_000_000, alpha: 0.0012 },
  { tier: 2, en: "Private wealth manager", pcm: "Private wealth manager", fee: 1_100_000, need: 150_000_000, alpha: 0.0022 },
  { tier: 3, en: "Family-office chief investment officer", pcm: "Family-office chief investment officer", fee: 4_000_000, need: 600_000_000, alpha: 0.0035 },
];
const NAMES = ["Tola Adewale", "Ngozi Eze", "Bashir Lawal", "Funke Bankole", "Emeka Obi", "Halima Sani", "Dapo Ogunleye", "Kemi Balogun"];

export const advisorFee = (p: Player, tier: number) => Math.round((ADVISOR_TIERS[tier - 1].fee) * Math.pow(p.index, 0.92));
export function advisorBlock(p: Player, tier: 1 | 2 | 3): string | null {
  const t = ADVISOR_TIERS[tier - 1];
  if (p.age < 21) return T("Adults only", "Na only adult");
  if (p.advisor) return T("You already have an adviser", "You get adviser already");
  if (netWorth(p) < t.need * Math.pow(p.index, 0.95)) return T(`Advisers at this level need a net worth of ${naira(t.need * Math.pow(p.index, 0.95))}`, `Adviser for this level need net worth of ${naira(t.need * Math.pow(p.index, 0.95))}`);
  if (p.money < advisorFee(p, tier)) return T("You cannot cover the first month's fee", "You no fit pay the first month fee");
  return null;
}
export function hireAdvisor(p: Player, tier: 1 | 2 | 3): string {
  const b = advisorBlock(p, tier);
  if (b) return b;
  const name = pick(NAMES);
  p.advisor = { tier, name, since: monthIndex(p), missed: 0 };
  return T(`${name} joins you as your ${ADVISOR_TIERS[tier - 1].en.toLowerCase()}. Expect market tips in your news feed.`, `${name} join you as your ${ADVISOR_TIERS[tier - 1].pcm.toLowerCase()}. Expect market tips for your news feed.`);
}
export function fireAdvisor(p: Player): string {
  if (!p.advisor) return "";
  const n = p.advisor.name;
  p.advisor = undefined;
  return T(`You part ways with ${n}.`, `You and ${n} don separate.`);
}

/** Monthly fee and the adviser's small edge on market holdings. */
export function advisorMonth(p: Player, lines: string[]) {
  const a = p.advisor;
  if (!a) return;
  const fee = advisorFee(p, a.tier) + p.holdings.reduce((s, h) => s + h.value, 0) * 0.0002;
  if (p.money >= fee) {
    transact(p, { amount: -fee, reason: T(`Adviser fee: ${a.name}`, `Adviser fee: ${a.name}`), category: "investment", recurring: "advisor" });
    a.missed = 0;
    const alpha = ADVISOR_TIERS[a.tier - 1].alpha;
    for (const h of p.holdings) if (["stocks", "fund", "bond", "reit"].includes(h.kind)) h.value = Math.round(h.value * (1 + alpha));
  } else {
    a.missed += 1;
    if (a.missed >= 3) { lines.push(T(`${a.name} quits because you stopped paying.`, `${a.name} quit because you no dey pay.`)); p.advisor = undefined; }
  }
}

export const ponziDefence = (p: Player) => Boolean(p.advisor);

export const MARKET_EVENTS: EventDef[] = [
  {
    id: "ponzi_offer",
    title: dual("A 'sure' investment", "'Sure' investment"),
    weight: (p) => (p.age >= 20 && p.money > I(p, 3_000_000) ? 1.1 : 0),
    text: () => T("A friend shows you screenshots: an 'investment platform' paying 40% a month. 'Everybody is cashing out!' The agent says spaces are almost gone.", "Your padi show you screenshot: one 'investment platform' wey dey pay 40% every month. 'Everybody dey cash out!' The agent talk say space almost finish."),
    choices: (p) => {
      const amt = Math.round(Math.min(p.money * 0.3, I(p, 4_000_000)));
      return [
        { label: T("Put money in", "Put money inside"), sub: naira(amt), disabled: p.money < amt ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          transact(q, { amount: -amt, reason: T("Money put into a 'sure' investment platform", "Money for 'sure' investment platform"), category: "investment" });
          if (chance(0.22)) { transact(q, { amount: Math.round(amt * 1.7), reason: T("You pulled out of the platform early", "You comot from the platform early"), category: "investment" }); return T("You got out early with a big profit. Then the platform froze withdrawals.", "You comot early with big profit. Then dem freeze withdrawals."); }
          q.stats.stress = clamp(q.stats.stress + 12);
          return T("The platform vanishes. The agent's phone is off, and so is your money.", "The platform disappear. Agent phone off, your money don go too.");
        } },
        { label: T("Ask your adviser", "Ask your adviser"), disabled: p.advisor ? false : T("You need an adviser", "You need adviser"), run: (q) => { q.stats.reputation = clamp(q.stats.reputation + 1); return T("Your adviser takes one look: 'This is a Ponzi scheme. Walk away.' Weeks later it collapses.", "Your adviser look am once: 'Na Ponzi scheme. Waka comot.' After some weeks e collapse."); } },
        { label: T("Walk away", "Waka comot"), run: () => T("If it sounds too good to be true, it is. You keep your money.", "If e sweet pass, e no be true. You keep your money.") },
      ];
    },
  },
];
