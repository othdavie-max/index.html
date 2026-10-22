import { monthIndex, transact } from "./ledger";
import { I, bump, luckBonus } from "./helpers";
import type { EventDef, Platform, Player, SocialAccount, SocialState } from "./types";
import { chance, clamp, naira, pick, rand, randInt, uid } from "./util";

/** Careers whose income comes from followers, not a salary ladder. */
export const SOCIAL_JOBS = ["creator", "tiktoker", "influencer", "youtuber", "streamer", "fitness"];

export const PLATFORMS: { id: Platform; label: string; blurb: string; payoutPer1k: number; minAge: number }[] = [
  { id: "gram", label: "Gram", blurb: "Photos, reels and brand deals. No payouts, but sponsors love it.", payoutPer1k: 0, minAge: 13 },
  { id: "toktik", label: "TokTik", blurb: "Short videos and trends. A small creator fund.", payoutPer1k: 900, minAge: 13 },
  { id: "vidtube", label: "VidTube", blurb: "Long videos. The best ad revenue, and the slowest growth.", payoutPer1k: 2200, minAge: 13 },
];
const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((x) => [x.id, x])) as Record<Platform, (typeof PLATFORMS)[number]>;

export type ContentKind = "photo" | "skit" | "music" | "vlog" | "fitness" | "live" | "trend" | "prank";
export const CONTENT: { id: ContentKind; label: string; cost: number; viral: number; edge: number }[] = [
  { id: "photo", label: "Photo set", cost: 2_000, viral: 0.8, edge: 0.01 },
  { id: "skit", label: "Comedy skit", cost: 8_000, viral: 1.2, edge: 0.03 },
  { id: "music", label: "Music clip", cost: 40_000, viral: 1.0, edge: 0.02 },
  { id: "vlog", label: "Vlog", cost: 6_000, viral: 0.9, edge: 0.02 },
  { id: "fitness", label: "Workout video", cost: 5_000, viral: 1.0, edge: 0.01 },
  { id: "live", label: "Livestream", cost: 3_000, viral: 0.7, edge: 0.03 },
  { id: "trend", label: "Join a viral trend", cost: 4_000, viral: 1.5, edge: 0.04 },
  { id: "prank", label: "Risky prank", cost: 10_000, viral: 2.4, edge: 0.2 },
];

export function newSocial(p: Player): SocialState {
  return { handle: `@${p.name.toLowerCase()}${randInt(10, 99)}`, accounts: {}, skill: 8 + Math.round(p.stats.smarts / 15), brand: 20, controversy: 0, sponsors: [], niche: "lifestyle", postsLeft: 12, collabs: 0, lastPostMonth: monthIndex(p), gear: 0 };
}

export function socialBlock(p: Player): string | null {
  if (p.age < 13) return "Social platforms need you to be 13+";
  if (!p.possessions.smartphone) return "You need a smartphone";
  return null;
}

export function ensureAccount(p: Player, plat: Platform): SocialAccount {
  if (!p.social) p.social = newSocial(p);
  if (!p.social.accounts[plat]) p.social.accounts[plat] = { followers: randInt(30, 300), engagement: rand(0.03, 0.08), posts: 0 };
  return p.social.accounts[plat]!;
}

export function createAccount(p: Player, plat: Platform): string {
  const b = socialBlock(p);
  if (b) return b;
  if (p.social?.accounts[plat]) return "You already have this account.";
  ensureAccount(p, plat);
  return `Your ${PLATFORM_BY_ID[plat].label} account is live (${p.social!.handle}).`;
}

export const totalFollowers = (p: Player) => (p.social ? Object.values(p.social.accounts).reduce((s, a) => s + (a?.followers ?? 0), 0) : 0);
export function rankFromFollowers(f: number): number {
  return f >= 2_000_000 ? 4 : f >= 500_000 ? 3 : f >= 100_000 ? 2 : f >= 5_000 ? 1 : 0;
}
export const isSocialJob = (p: Player) => Boolean(p.job && SOCIAL_JOBS.includes(p.job.id));
/** 0-0.2 bonus used by acting, music and comedy careers. */
export function fameBonus(p: Player): number {
  const f = totalFollowers(p);
  return clamp(Math.log10(Math.max(f, 1)) / 30, 0, 0.2);
}

export function postBlock(p: Player, plat: Platform, kind: ContentKind): string | null {
  const b = socialBlock(p);
  if (b) return b;
  if (!p.social?.accounts[plat]) return "Create the account first";
  if (p.social.postsLeft <= 0) return "No time to post more this year";
  const c = CONTENT.find((x) => x.id === kind);
  if (c && p.money < I(p, c.cost)) return "Not enough cash";
  return null;
}

export function post(p: Player, plat: Platform, kind: ContentKind): string {
  const block = postBlock(p, plat, kind);
  if (block) return block;
  const s = p.social!;
  const acc = s.accounts[plat]!;
  const c = CONTENT.find((x) => x.id === kind)!;
  transact(p, { amount: -I(p, c.cost), reason: `${c.label} for ${PLATFORM_BY_ID[plat].label}`, category: "social" });
  s.postsLeft -= 1;
  acc.posts += 1;
  const consistency = monthIndex(p) - s.lastPostMonth <= 3 ? 8 : 0;
  s.lastPostMonth = monthIndex(p);
  const score = s.skill * 0.45 + p.stats.looks * 0.15 + consistency + luckBonus(p) * 30 + rand(0, 45) + s.brand / 10;
  const base = 18 + Math.pow(acc.followers, 0.55);
  let gain = base * (0.4 + score / 60);
  let msg = "";
  if (chance(clamp((0.012 + s.skill / 3000 + luckBonus(p) / 25) * c.viral, 0, 0.3))) {
    gain *= rand(10, 80);
    msg = " It goes VIRAL.";
    s.brand = clamp(s.brand + 10);
    if (!p.achievements.includes("Went viral")) p.achievements.push("Went viral");
  } else if (score < 25) {
    gain *= 0.2;
    msg = " Barely anyone watches.";
  }
  gain = Math.round(gain);
  acc.followers += gain;
  acc.engagement = clamp(acc.engagement + (score > 60 ? 0.003 : -0.001), 0.015, 0.12);
  s.skill = clamp(s.skill + 0.8, 0, 100);
  s.brand = clamp(s.brand + 0.8);
  if (chance(c.edge)) {
    s.controversy = clamp(s.controversy + randInt(15, 40));
    msg += " Some people take it the wrong way.";
  }
  return `Your ${c.label.toLowerCase()} on ${PLATFORM_BY_ID[plat].label} gains ${gain.toLocaleString()} followers.${msg}`;
}

export function collab(p: Player, plat: Platform): string {
  const b = socialBlock(p);
  if (b) return b;
  const s = p.social;
  const acc = s?.accounts[plat];
  if (!s || !acc) return "Create the account first";
  if (s.postsLeft <= 0) return "No time left this year";
  if (acc.followers < 800) return "You need about 800 followers before creators will collaborate";
  s.postsLeft -= 1;
  s.collabs += 1;
  const partner = pick(["a popular skit maker", "a rising musician", "a lifestyle influencer", "a comedian", "a fitness coach"]);
  const gain = Math.round((200 + acc.followers * rand(0.04, 0.2)) * (chance(0.2 + luckBonus(p)) ? 3 : 1));
  acc.followers += gain;
  s.brand = clamp(s.brand + 4);
  return `You collaborate with ${partner}. Your audience grows by ${gain.toLocaleString()}.`;
}

export const GEAR = [
  { level: 1, label: "Ring light and tripod", cost: 45_000 },
  { level: 2, label: "Good camera and microphone", cost: 450_000 },
  { level: 3, label: "Studio set-up", cost: 3_000_000 },
];
export function buyGear(p: Player): string {
  const s = p.social;
  if (!s) return "Start a social account first.";
  const g = s.gear ?? 0;
  const next = GEAR.find((x) => x.level === g + 1);
  if (!next) return "You already have the best gear.";
  const cost = Math.round(next.cost * Math.pow(p.index, 0.92));
  if (p.money < cost) return `You need ${naira(cost)}.`;
  transact(p, { amount: -cost, reason: next.label, category: "social" });
  s.gear = next.level;
  s.skill = clamp(s.skill + next.level * 3);
  return `You bought: ${next.label}. Production quality goes up.`;
}

/** Monthly income, expenses and decay. */
export function socialMonth(p: Player, lines: string[]) {
  const s = p.social;
  if (!s) return;
  const idx = Math.pow(p.index, 0.92);
  // Inactive accounts shrink.
  if (monthIndex(p) - s.lastPostMonth > 4) for (const a of Object.values(s.accounts)) if (a) a.followers = Math.round(a.followers * 0.985);
  const total = totalFollowers(p);
  if (p.age >= 18) {
    let payout = 0;
    for (const [plat, acc] of Object.entries(s.accounts) as [Platform, SocialAccount][]) {
      payout += (acc.followers / 1000) * PLATFORM_BY_ID[plat].payoutPer1k * (acc.engagement / 0.05) * idx * rand(0.7, 1.3);
    }
    if (payout > 0) transact(p, { amount: payout, reason: "Platform payouts (views and ads)", category: "social", recurring: "social-payout" });
  }
  for (const sp of s.sponsors) {
    if (p.age >= 16) transact(p, { amount: sp.monthly, reason: `Sponsorship: ${sp.brand}`, category: "social", recurring: sp.id });
    sp.monthsLeft -= 1;
  }
  const done = s.sponsors.filter((x) => x.monthsLeft <= 0);
  for (const d of done) lines.push(`Your sponsorship with ${d.brand} ended.`);
  s.sponsors = s.sponsors.filter((x) => x.monthsLeft > 0);
  if (total > 500 && isSocialJob(p)) {
    transact(p, { amount: -Math.min(total * 0.15, 40_000) * idx, reason: "Data bundles, editing apps and props", category: "social", recurring: "social-costs" });
  }
}

export function yearlySocial(p: Player, lines: string[], pendingPush: (id: string, data?: Record<string, string | number | boolean>) => void) {
  const s = p.social;
  if (!s) return;
  s.postsLeft = 12;
  s.controversy = clamp(s.controversy - 12);
  if (isSocialJob(p) && p.job) {
    const j = rankFromFollowers(totalFollowers(p));
    if (j > p.job.rank) { p.job.rank = j; lines.push(`Your following has grown. You are now rated: rank ${j + 1} creator.`); }
  }
  const total = totalFollowers(p);
  if (total >= 3000 && p.age >= 16 && chance(0.25 + s.brand / 300)) pendingPush("brand_deal");
  if (s.controversy > 20 && chance(0.4)) pendingPush("online_scandal");
  if (total > 20_000 && chance(0.1)) pendingPush("troll_attack");
}

export const SOCIAL_EVENTS: EventDef[] = [
  {
    id: "brand_deal",
    title: "A brand wants you",
    weight: () => 0,
    valid: (p) => Boolean(p.social),
    init: (p) => ({ brand: pick(["a telecom giant", "a new fintech app", "a skincare brand", "a fashion label", "a beverage company", "a betting platform"]), monthly: Math.round(totalFollowers(p) * rand(0.8, 2.4) * Math.pow(p.index, 0.92)), months: randInt(3, 12) }),
    text: (p, d) => `${String(d.brand)} offers a ${d.months}-month sponsorship for ${naira(Number(d.monthly))} a month if you post about their product regularly.`,
    choices: (p, d) => [
      { label: "Accept the deal", run: (q) => { q.social?.sponsors.push({ id: uid(), brand: String(d.brand), monthly: Number(d.monthly), monthsLeft: Number(d.months) }); if (String(d.brand).includes("betting")) { bump(q, "reputation", -2); } return "You sign the contract. Time to make content."; } },
      { label: "Negotiate for more", run: (q) => { if (chance(0.45 + luckBonus(q))) { q.social?.sponsors.push({ id: uid(), brand: String(d.brand), monthly: Math.round(Number(d.monthly) * 1.35), monthsLeft: Number(d.months) }); return "They agree to a better rate."; } return "They lose interest and go with someone else."; } },
      { label: "Decline", run: (q) => { bump(q, "reputation", 1); return "You turn it down to protect your brand."; } },
    ],
  },
  {
    id: "online_scandal",
    title: "Online controversy",
    weight: () => 0,
    valid: (p) => Boolean(p.social),
    text: () => "Screenshots of an old post are circulating. People are calling you out, and brands are going quiet.",
    choices: () => [
      { label: "Apologise sincerely", run: (q) => { if (q.social) { q.social.controversy = clamp(q.social.controversy - 25); for (const a of Object.values(q.social.accounts)) if (a) a.followers = Math.round(a.followers * 0.97); } return "The apology lands. The storm calms down in a week."; } },
      { label: "Double down", run: (q) => { if (q.social) { if (chance(0.4)) { for (const a of Object.values(q.social.accounts)) if (a) a.followers = Math.round(a.followers * 1.15); return "Your defiance goes viral. Half hate you, half love you."; } for (const a of Object.values(q.social.accounts)) if (a) a.followers = Math.round(a.followers * 0.7); q.social.sponsors = []; bump(q, "reputation", -8); } return "It backfires. Brands cancel and followers leave."; } },
      { label: "Delete everything and go quiet", run: (q) => { if (q.social) { q.social.controversy = clamp(q.social.controversy - 15); for (const a of Object.values(q.social.accounts)) if (a) a.followers = Math.round(a.followers * 0.9); } return "You disappear for a while. Some forget, some do not."; } },
    ],
  },
  {
    id: "troll_attack",
    title: "Trolls descend",
    weight: () => 0,
    valid: (p) => Boolean(p.social),
    text: () => "A wave of trolls floods your comments with insults about your looks and your family.",
    choices: () => [
      { label: "Ignore and mute", run: (q) => { bump(q, "stress", 4); return "Mute, block, breathe. It passes."; } },
      { label: "Reply with humour", run: (q) => { if (chance(0.5)) { if (q.social) for (const a of Object.values(q.social.accounts)) if (a) a.followers = Math.round(a.followers * 1.08); return "Your reply is hilarious and spreads fast."; } bump(q, "stress", 6); return "The reply makes things worse."; } },
      { label: "Take a social media break", run: (q) => { bump(q, "stress", -6); if (q.social) q.social.lastPostMonth -= 3; return "You log off for weeks. It helps."; } },
    ],
  },
];
