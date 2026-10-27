/**
 * Ripples and enemies. Big acts do not just nudge a meter: they set off a chain of reactions from named people over
 * months (senators flee abroad, a home state erupts, a son swears revenge). The people you wrong become enemies with a
 * face and a plan, and you can buy them off, crush them or make peace. All people are fictional.
 */
import { subRng, type Rng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Enemy, FixState, GroupId } from "./types";
import { clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";

interface Ctx { name?: string; stateId?: string; lmId?: string; extra?: number }
interface Beat { delay: number; title: string; text: (s: FixState, c: Ctx) => string; tone: "good" | "bad" | "neutral"; fx?: (s: FixState, c: Ctx) => void; enemy?: (s: FixState, c: Ctx) => Omit<Enemy, "id" | "since" | "status" | "portrait"> | null; p?: number }

const sname = (id?: string) => (id ? STATE_BY_ID[id]?.name ?? id : "his home state");
const zoneOf = (id?: string) => (id ? STATE_BY_ID[id]?.zone ?? "NC" : "NC");
const grp = (s: FixState, d: Partial<Record<GroupId, number>>) => { for (const [k, v] of Object.entries(d)) s.groupMood[k as GroupId] = Math.max(-40, Math.min(40, s.groupMood[k as GroupId] + (v as number))); };
const casesBetween = (s: FixState, a: number, b: number) => s.events.filter((e) => e.tpl === "lmCase" && e.born >= a && e.born < b).length;
const regionsOf = (s: FixState, id?: string) => (id && s.regions[id] ? [s.regions[id]] : []);
const FIRST = ["Obinna", "Hadiza", "Tunde", "Ifeoma", "Danjuma", "Segun", "Zainab", "Chidi", "Bala", "Yetunde"];

export const CHAINS: Record<string, Beat[]> = {
  execute: [
    { delay: 1, title: "Senators fly abroad", tone: "bad", text: () => `Two senators left for Dubai "for urgent medical treatment" the day after the sentence. One came back a week later and quietly returned ${nb(18)} "voluntarily".`, fx: (s) => { const rich = [...s.lawmakers].filter((l) => l.status === "active").sort((a, b) => b.stolen - a.stolen).slice(0, 2); for (const l of rich) { s.fin.treasury += l.stolen * 0.4; l.stolen *= 0.4; l.greed = clamp100(l.greed - 18); } } },
    { delay: 2, title: "Fear in the Assembly", tone: "good", text: (s) => `Corruption cases fell from ${casesBetween(s, s.month - 8, s.month - 2)} in the last two seasons to ${casesBetween(s, s.month - 2, s.month + 1)} this one. Lawmakers are checking their accounts twice.`, fx: (s) => { for (const l of s.lawmakers) l.greed = clamp100(l.greed - 7); s.rule.deterrence = clamp100(s.rule.deterrence + 4); } },
    { delay: 2, title: "Home state erupts", tone: "bad", text: (s, c) => `Youths in ${sname(c.stateId)} burned tyres and carried his portrait. Elders say the sentence was "too harsh for a son of the soil".`, fx: (s, c) => { for (const r of regionsOf(s, c.stateId)) r.unrest = clamp100(r.unrest + 9); for (const g of s.governors) if (g.zone === zoneOf(c.stateId)) g.relation = clamp100(g.relation - 10); } },
    { delay: 4, title: "Rights groups condemn Nigeria", tone: "bad", text: () => "International human-rights groups called the execution 'a grave step backwards'. Two foreign governments summoned the ambassador.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 6); s.eco.investor = clamp100(s.eco.investor - 2); } },
    { delay: 6, title: "A son swears revenge", tone: "bad", p: 0.8, text: (_s, c) => `${c.name?.replace(/^(Sen\.|Hon\.) /, "").split(" ").slice(0, 2).join(" ") ?? "The family"}'s eldest son told a Sunday paper: "My father was not the only one. Everybody knew." He is now raising money.`, enemy: (s, c) => ({ name: `${FIRST[(c.extra ?? 0) % FIRST.length]} ${(c.name ?? "Okoro").split(" ").slice(-1)[0]} Jr.`, reason: `His father ${c.name ?? "a senator"} was executed on your orders`, plan: "rival", power: 45, grudge: 90, zone: zoneOf(c.stateId) }) },
    { delay: 14, title: "Was he framed?", tone: "bad", p: 0.45, text: () => "A journalist published bank records suggesting part of the case was fabricated. The courts are 'looking into it'.", fx: (s) => { s.gov.trust = clamp100(s.gov.trust - 3); s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); s.rule.wrongful += 0; } },
  ],
  jail: [
    { delay: 2, title: "Nervous colleagues", tone: "good", text: () => "Lawmakers in the same party suddenly turned up to every committee session. Three returned allowances.", fx: (s) => { for (const l of s.lawmakers) l.greed = clamp100(l.greed - 3); } },
    { delay: 4, title: "The party chairman visits the cell", tone: "bad", text: () => "The party chairman was seen leaving the prison with a basket of food and a very serious face.", fx: (s) => { s.assembly.support = clamp100(s.assembly.support - 2); } },
    { delay: 9, title: "A patron plots", tone: "bad", p: 0.35, text: (_s, c) => `Friends of ${c.name ?? "the jailed lawmaker"} are meeting in a hotel in Abuja. They have money and a grievance.`, enemy: (s, c) => ({ name: `Chief ${FIRST[(c.extra ?? 1) % FIRST.length]} Adeleke`, reason: `He bankrolled ${c.name ?? "a jailed lawmaker"}`, plan: "leaks", power: 30, grudge: 65, zone: zoneOf(c.stateId) }) },
  ],
  wrongful: [
    { delay: 1, title: "Lawyers march", tone: "bad", text: () => "The Bar Association marched in black gowns. The caption on social media: #NoEvidenceNoJail.", fx: (s) => { s.rule.judiciary = clamp100(s.rule.judiciary - 3); s.gov.trust = clamp100(s.gov.trust - 1.5); } },
    { delay: 3, title: "A foreign newspaper asks questions", tone: "bad", text: () => "A foreign newspaper ran the story under 'Nigeria's president locks up critics'.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); } },
    { delay: 7, title: "His lawyer becomes an activist", tone: "bad", p: 0.6, text: (_s, c) => `The lawyer of ${c.name ?? "the detained lawmaker"} is now on TV every night. Millions follow her.`, enemy: (s, c) => ({ name: `Barr. ${FIRST[(c.extra ?? 2) % FIRST.length]} Okeke`, reason: `You jailed ${c.name ?? "a lawmaker"} without evidence`, plan: "leaks", power: 35, grudge: 70, zone: zoneOf(c.stateId) }) },
  ],
  press: [
    { delay: 2, title: "Foreign press campaign", tone: "bad", text: () => "Foreign newspapers carried your picture beside the words 'strongman'. Editors say they will not be silenced.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); } },
    { delay: 4, title: "An underground paper trends", tone: "bad", text: () => "A pamphlet called 'Truth Speaks' is being copied in print shops across the country. Hashtags follow.", fx: (s) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); grp(s, { youth: -3 }); } },
    { delay: 8, title: "An exiled editor", tone: "bad", p: 0.6, text: () => "An editor who escaped to London is posting leaked documents from inside the villa.", enemy: () => ({ name: "Editor Folake Adeyemi", reason: "Her newspaper was raided on your orders", plan: "leaks", power: 40, grudge: 80, zone: "SW" }) },
  ],
  rival: [
    { delay: 1, title: "A martyr is born", tone: "bad", text: (s) => `${s.rival.name}'s supporters filled the streets with candles. Their popularity in the polls jumped.`, fx: (s) => { s.rival.popularity = clamp100(s.rival.popularity + 4); s.rule.streetAnger = clamp100(s.rule.streetAnger + 4); } },
    { delay: 3, title: "Foreign envoys call", tone: "bad", text: () => "Ambassadors from three capitals asked to visit the detained opposition leader. You refused.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); } },
    { delay: 6, title: "The campaign manager takes over", tone: "bad", p: 0.7, text: (s) => `${s.rival.name}'s campaign manager now runs a nightly press conference from a car park.`, enemy: () => ({ name: "Dr. Kemi Ogunbiyi", reason: "You jailed her party leader", plan: "protests", power: 45, grudge: 75, zone: "SW" }) },
  ],
  rigged: [
    { delay: 1, title: "Observers condemn the count", tone: "bad", text: () => "Local and foreign observers said the result 'does not reflect the will of voters'.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 6); } },
    { delay: 3, title: "Diaspora protests", tone: "bad", text: () => "Nigerians marched outside the embassy in London and Washington with signs reading 'Give us our vote back'.", fx: (s) => { s.eco.investor = clamp100(s.eco.investor - 2); s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); } },
    { delay: 5, title: "An opposition governor refuses to cooperate", tone: "bad", p: 0.75, text: () => "A governor of the opposition party said he no longer recognises your government and stopped sending security reports.", enemy: () => ({ name: "Gov. Ibrahim Waziri", reason: "He says you stole the election", plan: "rival", power: 55, grudge: 85, zone: "NW" }) },
  ],
  purge: [
    { delay: 2, title: "Retired officers talk", tone: "bad", text: () => "A retired general said on radio that 'the army will not forget how some of its sons were treated.'", fx: (s) => { s.groupMood.military = Math.max(-40, s.groupMood.military - 4); } },
    { delay: 5, title: "A purged colonel disappears", tone: "bad", p: 0.7, text: () => "The colonel dismissed in the purge is no longer at his address. His neighbours say soldiers have visited him at night.", enemy: () => ({ name: "Col. Danjuma Bello (rtd)", reason: "You purged him from the army", plan: "coup", power: 40, grudge: 85, zone: "NW" }) },
  ],
  crackdown: [
    { delay: 1, title: "Hospital figures leak", tone: "bad", text: () => "Doctors told reporters the real number of wounded. It was higher than the official one.", fx: (s) => { s.rule.intlPressure = clamp100(s.rule.intlPressure + 5); } },
    { delay: 3, title: "Families camp outside", tone: "bad", text: () => "Mothers of those killed sat outside the Assembly with framed photos for a week.", fx: (s) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 4); s.gov.trust = clamp100(s.gov.trust - 2); } },
    { delay: 7, title: "A protest leader emerges", tone: "bad", p: 0.7, text: () => "A young organiser who lost her brother in the protests now speaks at rallies and has 2 million followers.", enemy: () => ({ name: "Aisha Lawal (activist)", reason: "Her brother was killed by troops", plan: "protests", power: 50, grudge: 90, zone: "NW" }) },
  ],
  sacked: [
    { delay: 2, title: "Backers gossip", tone: "bad", text: (_s, c) => `${c.name ?? "The sacked minister"}'s sponsors say publicly that you 'forgot where you came from'.`, fx: (s) => { for (const b of s.backers) b.mood = clamp100(b.mood - 3); } },
    { delay: 6, title: "He starts talking", tone: "bad", p: 0.5, text: (_s, c) => `${c.name ?? "The sacked minister"} gave an interview about 'what really goes on in Aso Rock'.`, enemy: (s, c) => ({ name: c.name ?? "Former minister", reason: "You sacked him", plan: "leaks", power: 28, grudge: 60, zone: "NC" }) },
  ],
};

export function logTimeline(s: FixState, title: string, text: string, tone: "good" | "bad" | "neutral", chain?: string) {
  s.timeline.push({ month: s.month, title, text, tone, chain });
  if (s.timeline.length > 120) s.timeline.shift();
}

/** schedule the reactions to a big act */
export function ripple(s: FixState, key: keyof typeof CHAINS | string, ctx: Ctx = {}) {
  const chain = CHAINS[key];
  if (!chain) return;
  const q = JSON.parse(String(s.flags.ripples ?? "[]")) as { due: number; key: string; i: number; ctx: Ctx }[];
  const k = (s.enemies?.length ?? 0) + q.length;
  chain.forEach((b, i) => q.push({ due: s.month + b.delay, key, i, ctx: { ...ctx, extra: k + i } }));
  s.flags.ripples = JSON.stringify(q);
  logTimeline(s, ({ execute: "You ordered an execution", jail: "A lawmaker was jailed", wrongful: "A political arrest", press: "You cracked down on the press", rival: "You arrested the opposition leader", rigged: "A stolen election", purge: "You purged the army", crackdown: "Troops fired on protesters", sacked: "You sacked a minister" } as Record<string, string>)[key] ?? "A big decision", ctx.name ? `${ctx.name}. The reactions will arrive over the coming months.` : "The reactions will arrive over the coming months.", "neutral", key);
}

let ENEMY_SEQ = 0;
function makeEnemy(s: FixState, e: NonNullable<ReturnType<NonNullable<Beat["enemy"]>>>, rng: Rng): Enemy {
  ENEMY_SEQ++;
  return { ...e, id: `en${s.enemies.length + 1}-${ENEMY_SEQ}`, since: s.month, status: "active", portrait: { skin: rng.int(1, 5), hair: rng.int(0, 3), style: rng.int(0, 3), accent: rng.int(0, 4) } };
}
export const activeEnemies = (s: FixState) => s.enemies.filter((e) => e.status === "active");

export function ripplesMonthly(s: FixState, rng: Rng) {
  const q = JSON.parse(String(s.flags.ripples ?? "[]")) as { due: number; key: string; i: number; ctx: Ctx }[];
  if (q.length) {
    const rest: typeof q = [];
    for (const r of q) {
      if (r.due > s.month) { rest.push(r); continue; }
      const b = CHAINS[r.key]?.[r.i]; if (!b) continue;
      const roll = subRng(s.meta.seed, "ripple", r.key, r.i, r.due).next();
      if (b.p !== undefined && roll > b.p) continue;
      b.fx?.(s, r.ctx);
      const text = b.text(s, r.ctx);
      pushNews(s, { source: `ripple:${r.key}:${r.i}:${s.month}`, headline: b.title, body: text, tone: b.tone, stateId: r.ctx.stateId });
      logTimeline(s, b.title, text, b.tone, r.key);
      const spec = b.enemy?.(s, r.ctx);
      if (spec) { const en = makeEnemy(s, spec, rng); s.enemies.push(en); logTimeline(s, `New enemy: ${en.name}`, en.reason, "bad", r.key); }
    }
    s.flags.ripples = JSON.stringify(rest);
  }
  // enemies act
  for (const en of activeEnemies(s)) {
    en.power = clamp100(en.power + (en.grudge > 60 ? 0.6 : -0.2));
    if (!rng.chance(0.07 + en.power / 700)) continue;
    const P = s.rule, z = en.zone;
    const hit = (txt: string, tone: "bad" = "bad") => { pushNews(s, { source: `enemy:${en.id}:${s.month}`, headline: `${en.name}: ${txt}`, body: en.reason, tone }); logTimeline(s, en.name, txt, tone, "enemy"); };
    switch (en.plan) {
      case "protests": P.streetAnger = clamp100(P.streetAnger + 2.5 + en.power / 30); hit("paid crowds hit the streets"); break;
      case "leaks": s.me.evidence = clamp100(s.me.evidence + 3); s.gov.trust = clamp100(s.gov.trust - 1.5); hit("a new batch of leaked documents appears"); break;
      case "rival": s.rival.popularity = clamp100(s.rival.popularity + 2 + en.power / 40); hit("is campaigning against you with party money"); break;
      case "bandits": for (const [id, r] of Object.entries(s.regions)) if (STATE_BY_ID[id]?.zone === z) r.insecurity = clamp100(r.insecurity + 3); hit("is suspected of feeding trouble in his region"); break;
      case "coup": P.coupRisk = clamp100(P.coupRisk + 2 + en.power / 25); hit("is quietly meeting officers"); break;
    }
  }
  const strong = activeEnemies(s).sort((a, b) => b.power - a.power)[0];
  if (strong && strong.power >= 40 && s.month - Number(s.flags.lastEnemyEv ?? -9) >= 8 && !s.events.some((e) => e.tpl === "enemyMove" && e.status === "open") && rng.chance(0.12)) { s.flags.lastEnemyEv = s.month; s.flags.enemyId = strong.id; createEvent(s, "enemyMove", "NG-FC"); }
}

// ---------------------------------------------------------------- dealing with an enemy
export const ENEMY_ACTIONS = [
  { id: "buy", label: "Buy him off", explain: "Contracts or cash. Quick, but he knows how much you paid.", cost: (e: Enemy) => Math.round(15 + e.power * 0.8) },
  { id: "peace", label: "Make peace", explain: "A private meeting, an apology or a job for his people.", cost: (e: Enemy) => Math.round(5 + e.power * 0.1) },
  { id: "crush", label: "Crush him", explain: "Arrests and investigations. If it fails, he becomes a martyr.", cost: () => 5 },
] as const;
export function dealWithEnemy(s: FixState, id: string, how: "buy" | "peace" | "crush"): { ok: boolean; message: string } {
  const en = s.enemies.find((x) => x.id === id);
  if (!en || en.status !== "active") return { ok: false, message: "That enemy is no longer active." };
  const def = ENEMY_ACTIONS.find((a) => a.id === how)!;
  const cost = def.cost(en) * (0.6 + 0.4 * s.eco.priceLevel / 100);
  if (cost > s.fin.treasury) return { ok: false, message: `You need ${nb(cost)}.` };
  s.fin.treasury -= cost;
  const roll = subRng(s.meta.seed, "enemy", en.id, how, s.month).next();
  const P = s.rule;
  if (how === "buy") {
    const ok = roll < 0.55 + 0.3 * (1 - en.grudge / 100);
    if (ok) { en.status = "bought"; s.gov.corruption = clamp100(s.gov.corruption + 0.8); s.me.evidence = clamp100(s.me.evidence + 3); logTimeline(s, `${en.name} was bought off`, "The money changed hands quietly.", "neutral", "enemy"); return { ok: true, message: `${en.name} took the money and went quiet. He will remember how much you paid.` }; }
    en.grudge = clamp100(en.grudge + 6); return { ok: false, message: `${en.name} took your money and kept fighting.` };
  }
  if (how === "peace") {
    const ok = roll < 0.65 - en.grudge / 200 + s.gov.trust / 500;
    if (ok) { en.status = "reconciled"; en.grudge = 20; s.gov.trust = clamp100(s.gov.trust + 1); logTimeline(s, `${en.name} made peace`, "A handshake in private.", "good", "enemy"); return { ok: true, message: `${en.name} accepted your hand. The feud is over, for now.` }; }
    en.grudge = clamp100(en.grudge + 5); return { ok: false, message: `${en.name} refused to meet you.` };
  }
  const ok = roll < 0.4 + 0.25 * (P.judiciary / 100) + 0.002 * (80 - en.power);
  P.abuse = clamp100(P.abuse + 6); P.democracy = clamp100(P.democracy - 5); P.intlPressure = clamp100(P.intlPressure + 4);
  if (ok) { en.status = "crushed"; logTimeline(s, `${en.name} was crushed`, "Arrested and investigated.", "neutral", "enemy"); return { ok: true, message: `${en.name} was arrested. Others noticed.` }; }
  en.power = clamp100(en.power + 18); en.grudge = clamp100(en.grudge + 12); P.streetAnger = clamp100(P.streetAnger + 4);
  return { ok: false, message: `The case against ${en.name} fell apart and he is now a martyr.` };
}

const eName = (s: FixState) => s.enemies.find((e) => e.id === s.flags.enemyId)?.name ?? "An old enemy";
export const ENEMY_TEMPLATES = [
  {
    id: "enemyMove", kind: "power" as const, urgency: 2,
    title: (s: FixState) => `${eName(s)} is making a move`,
    cause: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); return e ? `${e.name} (${e.reason.toLowerCase()}) has moved from grumbling to action: ${e.plan === "coup" ? "meeting officers" : e.plan === "rival" ? "funding your opponents" : e.plan === "leaks" ? "preparing a leak of damaging documents" : e.plan === "protests" ? "organising paid crowds" : "stirring trouble in the region"}. You can still deal with this before it grows.` : ""; },
    options: [
      { id: "buy", label: "Send an envoy with an offer", explain: "Make a deal.", cost: 25, tradeoff: "He knows your price.", unc: "medium" as const, chance: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); return 0.55 + 0.3 * (1 - (e?.grudge ?? 60) / 100); }, win: { run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) { e.status = "bought"; } return `${e?.name ?? "He"} accepted. For now.`; } }, lose: { run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) e.grudge = clamp100(e.grudge + 6); return "He took the offer as an insult."; } }, winText: "", loseText: "" },
      { id: "talk", label: "Invite him for a quiet dinner", explain: "Try to make peace.", cost: 5, tradeoff: "He might say no in public.", unc: "high" as const, chance: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); return 0.5 - (e?.grudge ?? 60) / 250 + s.gov.trust / 500; }, win: { trust: 1, run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) { e.status = "reconciled"; e.grudge = 20; } return `${e?.name ?? "He"} left the dinner as a friend.`; } }, lose: { run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) e.grudge = clamp100(e.grudge + 5); return "He did not turn up."; } }, winText: "", loseText: "" },
      { id: "crush", label: "Have him investigated and arrested", explain: "Remove the threat.", cost: 5, tradeoff: "A martyr is more dangerous than an enemy.", unc: "high" as const, chance: (s: FixState) => 0.4 + 0.25 * (s.rule.judiciary / 100), win: { democracy: -4, intl: 3, run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) e.status = "crushed"; return `${e?.name ?? "He"} is in custody.`; } }, lose: { democracy: -4, anger: 4, run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) { e.power = clamp100(e.power + 18); e.grudge = clamp100(e.grudge + 12); } return "The case fell apart and he is now a martyr."; } }, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { const e = s.enemies.find((x) => x.id === s.flags.enemyId); if (e) e.power = clamp100(e.power + 10); return e ? `${e.name} grew bolder.` : undefined; } }, expireText: () => "He grew bolder.",
  },
];
