import { STATE_BY_ID } from "./data";
import { makeNpc, remember } from "./family";
import { developCondition } from "./health";
import { I, bump, luckBonus, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { borrowFrom } from "./loans";
import { kidLook, randomLook, type Look } from "./look";
import { netWorthReal } from "./finance";
import type { Candidate, Choice, EventDef, Gender, Npc, PartnerRel, Pending, Player, RelStage } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";

const INTERESTS = ["football", "music", "church", "mosque", "fitness", "cooking", "travel", "movies", "business", "fashion", "gaming", "reading", "art", "dancing", "tech"];
const OCCUPATIONS = ["Nurse", "Banker", "Teacher", "Software developer", "Trader", "Engineer", "Makeup artist", "Fashion designer", "Lawyer", "Civil servant", "Musician", "Barber", "Marketer", "Pharmacist", "Entrepreneur", "Student", "Photographer", "Accountant"];
export const MATCH_STAGES: RelStage[] = ["dating", "exclusive", "engaged", "married"];

const first = (n: Npc) => n.name.split(" ")[0];
const idxNow = (p: Player) => monthIndex(p);

export function partnerOf(p: Player, npcId: string): PartnerRel | undefined {
  return p.rel.partners.find((r) => r.npcId === npcId);
}
export function activePartners(p: Player): { rel: PartnerRel; npc: Npc }[] {
  return p.rel.partners.filter((r) => r.stage !== "ex" && p.npcs[r.npcId]).map((rel) => ({ rel, npc: p.npcs[rel.npcId] }));
}
export const committedPartners = (p: Player) => activePartners(p).filter((x) => ["exclusive", "engaged", "married"].includes(x.rel.stage));
/** True when the player is seeing someone while committed to someone else. */
export function isCheating(p: Player): boolean {
  const act = activePartners(p).filter((x) => MATCH_STAGES.includes(x.rel.stage));
  return act.length > 1 && act.some((x) => ["exclusive", "engaged", "married"].includes(x.rel.stage));
}

// ---------------------------------------------------------------------------
// Candidates and the dating app
// ---------------------------------------------------------------------------
export function datingAllowed(p: Player): string | null {
  if (p.age < 18) return "The app is for adults (18+)";
  if (!p.possessions.smartphone) return "You need a smartphone";
  if (p.prison > 0) return "Not from prison";
  return null;
}

export function makeCandidate(p: Player, gender: Gender): Candidate {
  const age = clamp(p.age + randInt(-6, 8), 18, 60);
  const st = chance(0.7) ? stateOf(p) : STATE_BY_ID[pick(Object.keys(STATE_BY_ID).filter((id) => id !== "abroad"))];
  const income = Math.round(rand(0.4e6, 18e6) * (chance(0.07) ? 6 : 1) * (age > 26 ? 1.4 : 0.8));
  const n = makeNpc({
    role: "match", gender, ageDelta: age - p.age, tribe: p.tribe, stateId: st.id, occupation: pick(OCCUPATIONS), income,
    look: randomLook(gender, { region: st.region, religion: chance(0.5) ? p.religion : undefined }), generosity: randInt(10, 90), strictness: randInt(10, 70), responsibility: randInt(25, 90), closeness: 30,
  });
  const interests = Array.from(new Set([pick(INTERESTS), pick(INTERESTS), pick(INTERESTS)]));
  return { ...n, attractiveness: randInt(25, 95), interests, kindness: randInt(15, 95), ambition: randInt(15, 95), jealousy: randInt(5, 85) };
}

export function createProfile(p: Player, bio: string, interests: string[], looking: "men" | "women" | "everyone"): string {
  const block = datingAllowed(p);
  if (block) return block;
  const bioBonus = bio.length > 20 ? 6 : 0;
  const quality = clamp(35 + (p.stats.looks - 50) * 0.25 + interests.length * 4 + bioBonus + p.stats.smarts / 12 + randInt(-4, 4), 10, 95);
  p.rel.profile = { bio, interests, quality, looking };
  p.rel.deck = [];
  refreshDeck(p);
  return "Your Spark profile is live. Let's see who is out there.";
}

export function lookingGenders(p: Player): Gender[] {
  const pr = p.rel.profile?.looking ?? (p.gender === "male" ? "women" : "men");
  return pr === "men" ? ["male"] : pr === "women" ? ["female"] : ["male", "female"];
}

export function refreshDeck(p: Player) {
  const genders = lookingGenders(p);
  while (p.rel.deck.length < 8) p.rel.deck.push(makeCandidate(p, pick(genders)));
}

export function swipe(p: Player, candId: string, like: boolean): string {
  const i = p.rel.deck.findIndex((c) => c.id === candId);
  if (i < 0) return "";
  if (p.rel.swipesLeft <= 0) return "You are out of swipes for the year. Try again after your birthday.";
  const c = p.rel.deck[i];
  p.rel.deck.splice(i, 1);
  p.rel.swipesLeft -= 1;
  refreshDeck(p);
  if (!like) return `You passed on ${first(c)}.`;
  const status = clamp(Math.log10(Math.max(netWorthReal(p), 1e5) / 1e5) / 4, 0, 0.25);
  const pr = clamp(0.2 + (p.stats.looks - 50) / 250 + (p.rel.profile?.quality ?? 40) / 400 + status + luckBonus(p) - (c.attractiveness - 60) / 300, 0.05, 0.85);
  if (!chance(pr)) return `You liked ${first(c)}, but nothing came of it.`;
  const { attractiveness, interests, kindness, ambition, jealousy, ...rest } = c;
  const npc: Npc = { ...rest, traits: [`kind ${kindness}`, `ambition ${ambition}`, `jealous ${jealousy}`, ...interests] };
  p.npcs[npc.id] = npc;
  void attractiveness;
  p.rel.partners.push({ npcId: npc.id, stage: "chatting", affection: 30, trust: 50, satisfaction: 50, since: idxNow(p), lastInteract: idxNow(p), moneyRequests: 0, cheated: false, messages: [] });
  logMsg(p, npc.id, "note", "You matched on Spark.");
  logMsg(p, npc.id, "them", `Hey ${p.name}! Saw that we matched. ${interestsOf(npc)[0] ? `I am into ${interestsOf(npc)[0]}.` : "How are you?"}`);
  return `It's a match! You and ${first(c)} can start chatting.`;
}

function traitNum(n: Npc, key: string, dflt: number): number {
  const t = n.traits.find((x) => x.startsWith(`${key} `));
  return t ? Number(t.split(" ")[1]) : dflt;
}
const interestsOf = (n: Npc) => n.traits.filter((t) => !/^(kind|ambition|jealous) \d+/.test(t));

const THREAD_CAP = 80;

/** Adds a line to the conversation with a partner. "note" lines record moments such as dates. */
export function logMsg(p: Player, npcId: string, from: "me" | "them" | "note", text: string) {
  const r = partnerOf(p, npcId);
  if (!r || !text) return;
  (r.messages ??= []).push({ from, text, age: p.age, month: p.month });
  if (r.messages.length > THREAD_CAP) r.messages.splice(0, r.messages.length - THREAD_CAP);
}

const MY_LINES: Record<string, string[]> = {
  flirty: ["Hey you. Your profile just made my evening.", "I was going to say something smooth, but I forgot after your photo.", "Be honest: are you always this fine or is it the lighting?"],
  funny: ["Quick question: jollof rice, party or ghana? Choose wisely, your answer decides everything.", "My phone said I should text someone interesting. Here I am.", "I promise I am only 40% chaos."],
  genuine: ["Hi. I liked what you wrote. How has your week been?", "I would like to get to know you properly. What do you enjoy doing?", "Your profile felt honest. That is rare here."],
  boring: ["hi", "wyd", "hello"],
};
const THEIR_WARM = ["Haha, you actually made me laugh out loud. Go on.", "Now you have my attention. Tell me more.", "This is the best chat I have had on here all week."];
const THEIR_OK = ["Hey! Doing well, thanks. And you?", "That is sweet. Good to meet you.", "Not bad at all. What do you do?"];
const THEIR_DRY = ["ok", "lol", "hmm. busy, I will reply later."];

export type ChatTone = "flirty" | "funny" | "genuine" | "boring";

export function chat(p: Player, npcId: string, tone: ChatTone): string {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n) return "";
  if (p.rel.chatsLeft <= 0) return "You have used up your chatting time this year.";
  p.rel.chatsLeft -= 1;
  r.lastInteract = idxNow(p);
  const common = interestsOf(n).filter((i) => p.rel.profile?.interests.includes(i)).length;
  const kind = traitNum(n, "kind", 50);
  const base = tone === "boring" ? -6 : tone === "flirty" ? 6 + p.stats.looks / 40 : tone === "funny" ? 7 + p.stats.smarts / 40 : 5 + kind / 25;
  const delta = Math.round(base + common * 3 + rand(-5, 6));
  r.affection = clamp(r.affection + delta);
  logMsg(p, npcId, "me", pick(MY_LINES[tone]));
  const shared = interestsOf(n).find((i) => p.rel.profile?.interests.includes(i));
  logMsg(p, npcId, "them", delta >= 8 ? `${pick(THEIR_WARM)}${shared ? ` I love ${shared} too.` : ""}` : delta >= 2 ? pick(THEIR_OK) : pick(THEIR_DRY));
  if (r.affection < 12 && chance(0.55)) {
    logMsg(p, npcId, "note", "They stopped replying.");
    r.stage = "ex";
    r.exitReason = "ghosted";
    return `${first(n)} stopped replying. You have been ghosted.`;
  }
  if (delta >= 8) return `${first(n)} loves your messages. The chat runs for hours. (+${delta})`;
  if (delta >= 2) return `${first(n)} replies warmly. (+${delta})`;
  return `${first(n)} gives dry answers. (${delta})`;
}

export type DatePlan = "cheap" | "nice" | "luxury";
const DATE_COST: Record<DatePlan, number> = { cheap: 8_000, nice: 35_000, luxury: 150_000 };
export const dateCost = (p: Player, plan: DatePlan) => Math.round(DATE_COST[plan] * Math.pow(p.index, 0.92));

export function askOnDate(p: Player, npcId: string, plan: DatePlan): string {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n) return "";
  const cost = dateCost(p, plan);
  if (p.money < cost) return `You need ${naira(cost)} for that date.`;
  if (r.affection < 45 && r.stage === "chatting") return `${first(n)} is not ready to meet yet. Keep chatting.`;
  transact(p, { amount: -cost, reason: `${plan === "cheap" ? "Cheap date" : plan === "nice" ? "Nice dinner" : "Luxury date"} with ${first(n)}`, category: "dating" });
  const planQ = plan === "cheap" ? 0 : plan === "nice" ? 0.5 : 1;
  const pr = clamp(0.3 + r.affection / 200 + (planQ * 0.3 - n.materialism / 300) + p.stats.looks / 450 + luckBonus(p), 0.1, 0.92);
  r.lastInteract = idxNow(p);
  if (chance(pr)) {
    r.affection = clamp(r.affection + 10);
    r.satisfaction = clamp(r.satisfaction + 6);
    if (r.stage === "chatting") r.stage = "dating";
    remember(p, n, `Had a good ${plan} date with you.`, "good");
    return `The date goes beautifully. ${first(n)} walks away smiling.`;
  }
  r.affection = clamp(r.affection - 6);
  if (chance(0.25)) {
    r.stage = "ex"; r.exitReason = "bad date";
    return `${first(n)} leaves early and later says the vibes were off. That is that.`;
  }
  return pick([`${first(n)} spends the whole evening on their phone.`, `The conversation dries up. Awkward.`, `${first(n)} says: "I had fun" but you can tell they did not.`]);
}

export function spendTime(p: Player, npcId: string): string {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n || !MATCH_STAGES.includes(r.stage)) return "";
  if (p.rel.chatsLeft <= 0) return "No time left this year.";
  p.rel.chatsLeft -= 1;
  const cost = Math.round(15_000 * Math.pow(p.index, 0.92));
  if (p.money >= cost) transact(p, { amount: -cost, reason: `Time out with ${first(n)}`, category: "dating" });
  r.affection = clamp(r.affection + 7);
  r.satisfaction = clamp(r.satisfaction + 5);
  r.lastInteract = idxNow(p);
  return `You spend quality time with ${first(n)}. Things feel solid.`;
}

export function makeOfficial(p: Player, npcId: string): string {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n || r.stage !== "dating") return "";
  if (r.affection < 60) return `${first(n)} says: "Let's give it more time."`;
  const jealous = traitNum(n, "jealous", 40);
  // If you're seeing others, a jealous partner may hear and walk.
  if (isCheating(p) && chance(jealous / 120)) {
    r.stage = "ex"; r.exitReason = "heard about the others";
    return `${first(n)} heard about the others. "I'm out."`;
  }
  r.stage = "exclusive";
  r.satisfaction = clamp(r.satisfaction + 8);
  p.flags.dating = n.name;
  p.flags.datingLook = lookStr(n.look);
  p.flags.datingNpc = n.id;
  return `${first(n)} says yes. You are officially together.`;
}

function lookStr(l: Look) {
  return [l.skin, l.hair, l.hairColor, l.beard, l.wear, l.outfit, l.outfitColor].join("|");
}

export function breakUp(p: Player, npcId: string, reason = "you ended it"): string {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n) return "";
  r.stage = "ex";
  r.exitReason = reason;
  n.role = "ex";
  if (p.flags.datingNpc === npcId) { delete p.flags.dating; delete p.flags.datingLook; delete p.flags.datingNpc; }
  bump(p, "happiness", -8);
  remember(p, n, `Broke up (${reason}).`, "bad");
  return `You and ${first(n)} are over (${reason}).`;
}

/** Records a partner introduced outside the app (events, aunties, etc.). */
export function addPartner(p: Player, info: { name: string; look: Look; gender: Gender }, stage: RelStage): Npc {
  const age = p.age + randInt(-3, 4);
  const n = makeNpc({ role: "partner", gender: info.gender, ageDelta: age - p.age, tribe: p.tribe, name: info.name, look: info.look, occupation: pick(OCCUPATIONS), income: Math.round(rand(0.6e6, 12e6)), stateId: p.state, closeness: 60 });
  n.traits = [`kind ${randInt(30, 90)}`, `ambition ${randInt(25, 90)}`, `jealous ${randInt(5, 70)}`, pick(INTERESTS)];
  p.npcs[n.id] = n;
  p.rel.partners.push({ npcId: n.id, stage, affection: 62, trust: 60, satisfaction: 60, since: idxNow(p), lastInteract: idxNow(p), moneyRequests: 0, cheated: false });
  return n;
}

export function marry(p: Player, npcId: string): void {
  const n = p.npcs[npcId];
  const r = partnerOf(p, npcId);
  if (!n || !r) return;
  r.stage = "married";
  n.role = "partner";
  p.spouse = { name: n.name, happy: 80, look: n.look, npcId: n.id };
  for (const o of p.rel.partners) if (o.npcId !== npcId && o.stage !== "ex") { o.stage = "ex"; o.exitReason = "you got married"; }
  delete p.flags.dating; delete p.flags.datingLook; delete p.flags.datingNpc;
}

// ---------------------------------------------------------------------------
// Intimacy, protection, pregnancy (adults only, kept non-explicit)
// ---------------------------------------------------------------------------
export type Protection = "condom" | "pill" | "none";

export function intimacyBlock(p: Player, npcId: string): string | null {
  const r = partnerOf(p, npcId);
  const n = p.npcs[npcId];
  if (!r || !n) return "Not available";
  if (p.age < 18 || npcAgeOf(p, n) < 18) return "Adults only";
  if (r.stage === "chatting" && r.affection < 55) return "You barely know each other";
  if (r.stage === "ex") return "Not an option";
  return null;
}
const npcAgeOf = (p: Player, n: Npc) => Math.max(0, p.age + n.ageDelta);

export function spendTheNight(p: Player, npcId: string, protection: Protection): string {
  const block = intimacyBlock(p, npcId);
  if (block) return block;
  const r = partnerOf(p, npcId)!;
  const n = p.npcs[npcId];
  const committed = ["exclusive", "engaged", "married"].includes(r.stage);
  r.satisfaction = clamp(r.satisfaction + (committed ? 6 : 3));
  r.affection = clamp(r.affection + 4);
  r.lastInteract = idxNow(p);
  const lines = [`You spend the night with ${first(n)}. The rest stays between the two of you.`];
  // Sexual health risk: casual and unprotected is risky.
  const stiRisk = protection === "condom" ? 0.015 : protection === "pill" ? 0.08 : 0.12;
  if (chance(committed ? stiRisk * 0.3 : stiRisk)) {
    const r2 = developCondition(p, "sti");
    lines.push("A few weeks later you notice something is wrong. You will need to see a doctor.");
    p.flags.pendingConditionEvents = 1;
    if (r2.pending.length) p.flags.queuedHealth = JSON.stringify(r2.pending);
  }
  const canConceive = p.gender !== n.gender;
  const pregRisk = protection === "condom" ? 0.025 : protection === "pill" ? 0.01 : 0.14;
  if (canConceive && !p.flags.pregnantBy && chance(pregRisk)) {
    p.flags.pregnantBy = n.id;
    p.flags.pregnancyDue = p.age + 1;
    lines.push("Some weeks on, a pregnancy test comes back positive.");
    p.flags.pregnancyNews = 1;
  }
  return lines.join(" ");
}

function makeKid(p: Player, n: Npc | undefined, gender: Gender): { name: string; look: Look } {
  const dadLook = p.gender === "male" ? p.look : n?.look;
  const momLook = p.gender === "female" ? p.look : n?.look;
  return { name: pick(gender === "male" ? ["Tobi", "Chidera", "Musa", "Ifeanyi", "Ibrahim", "Tunde", "Emeka"] : ["Zainab", "Ngozi", "Amara", "Bisi", "Hauwa", "Chioma", "Tolani"]), look: kidLook(dadLook, momLook, gender) };
}

// ---------------------------------------------------------------------------
// Yearly and monthly hooks
// ---------------------------------------------------------------------------
export function yearlyRelationships(p: Player, lines: string[], pending: Pending[]) {
  p.rel.swipesLeft = 12;
  p.rel.chatsLeft = 10;
  const now = idxNow(p);
  const cheating = isCheating(p);
  for (const r of p.rel.partners) {
    const n = p.npcs[r.npcId];
    if (!n || r.stage === "ex") continue;
    // Relationships need attention.
    const neglect = (now - r.lastInteract) / 12;
    r.affection = clamp(r.affection - 3 - neglect * 5);
    r.satisfaction = clamp(r.satisfaction + (neglect > 1 ? -8 : 1) + randInt(-3, 3));
    if (MATCH_STAGES.includes(r.stage)) {
      // Partner leaves when love and satisfaction die.
      if (r.affection < 12 && chance(0.55) && r.stage !== "married") {
        r.stage = "ex"; r.exitReason = "drifted apart"; n.role = "ex";
        lines.push(`${first(n)} ended things. "It's just not working anymore."`);
        if (p.flags.datingNpc === n.id) { delete p.flags.dating; delete p.flags.datingLook; delete p.flags.datingNpc; }
        continue;
      }
      if (cheating && ["exclusive", "engaged", "married"].includes(r.stage) && chance(0.3)) {
        pending.push({ kind: "event", id: "cheating_caught", data: { npcId: n.id, month: randInt(1, 12) } });
      } else if (chance(traitNum(n, "jealous", 40) / 500) && r.stage !== "chatting") {
        pending.push({ kind: "event", id: "jealousy_row", data: { npcId: n.id, month: randInt(1, 12) } });
      }
      if (["dating", "exclusive", "engaged"].includes(r.stage) && n.materialism > 40 && chance(0.12 + n.materialism / 400)) {
        pending.push({ kind: "event", id: "partner_request", data: { npcId: n.id, month: randInt(1, 12), amount: Math.round(I(p, rand(15_000, 120_000))), why: pick(["rent", "a hospital bill", "a new outfit", "transport", "a family wedding", "data and airtime", "stock for a small business"]) } });
      }
      if (["exclusive", "engaged", "married"].includes(r.stage) && r.trust < 45 && chance(0.05)) {
        pending.push({ kind: "event", id: "partner_cheats", data: { npcId: n.id, month: randInt(1, 12) } });
      }
      if (r.stage === "exclusive" && r.satisfaction > 70 && p.age >= 22 && chance(0.03)) {
        pending.push({ kind: "event", id: "third_wheel", data: { npcId: n.id, month: randInt(1, 12) } });
      }
    }
  }
  // Ex wants back?
  const ex = p.rel.partners.filter((r) => r.stage === "ex" && p.npcs[r.npcId] && r.affection > 50 && r.exitReason !== "ghosted" && r.exitReason !== "bad date");
  if (ex.length && !p.spouse && chance(0.05)) {
    pending.push({ kind: "event", id: "ex_returns", data: { npcId: ex[0].npcId, month: randInt(1, 12) } });
  }
  // Pregnancy
  if (p.flags.pregnancyNews) {
    delete p.flags.pregnancyNews;
    pending.push({ kind: "event", id: "pregnancy_news", data: { npcId: String(p.flags.pregnantBy), month: randInt(1, 12) } });
  }
  if (p.flags.pregnantBy && Number(p.flags.pregnancyDue) <= p.age && p.flags.keepPregnancy) {
    const n = p.npcs[String(p.flags.pregnantBy)];
    const gender: Gender = chance(0.5) ? "male" : "female";
    const { name, look } = makeKid(p, n, gender);
    p.kids.push({ name, age: 0, gender, look, otherParentId: n?.id });
    lines.push(`${name} was born! ${n ? `With ${first(n)} as the other parent.` : ""}`);
    p.stats.happiness = clamp(p.stats.happiness + 12);
    delete p.flags.pregnantBy; delete p.flags.pregnancyDue; delete p.flags.keepPregnancy;
    if (n && p.spouse?.npcId !== n.id) {
      if (!p.subs.some((s) => s.id === `cs-${n.id}`)) p.subs.push({ id: `cs-${n.id}`, label: `Child support for ${name}`, monthly: 35_000, category: "family", since: idxNow(p) });
    }
  }
  if (p.flags.queuedHealth) {
    try { pending.push(...(JSON.parse(String(p.flags.queuedHealth)) as Pending[])); } catch { /* ignore bad data */ }
    delete p.flags.queuedHealth;
  }
}

/** Spouses share household costs. */
export function spouseMonth(p: Player, living: number) {
  if (!p.spouse?.npcId) return;
  const n = p.npcs[p.spouse.npcId];
  if (!n || !n.alive || n.income <= 0) return;
  const share = Math.min(living * 0.4, (n.income * Math.pow(p.index, 0.9)) / 12 * 0.35);
  if (share > 0) transact(p, { amount: share, reason: `${first(n)} contributed to household expenses`, category: "family", recurring: "spouse" });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const rel = (p: Player, id: unknown) => partnerOf(p, String(id));
const npc = (p: Player, id: unknown) => p.npcs[String(id)];

export const REL_EVENTS: EventDef[] = [
  {
    id: "partner_request",
    title: "Partner needs money",
    weight: () => 0,
    valid: (p) => committedOrDating(p),
    text: (p, d) => {
      const n = npc(p, d.npcId);
      return `${first(n)} messages you: "Babe, I need ${naira(Number(d.amount ?? 0) || I(p, 40_000))} for ${String(d.why ?? "something small")}. Can you help?"`;
    },
    choices: (p, d) => {
      const n = npc(p, d.npcId);
      const r = rel(p, d.npcId);
      const amt = Number(d.amount ?? I(p, 40_000));
      return [
        { label: "Send the full amount", sub: naira(amt), disabled: p.money < amt ? "You are short" : false, run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); transact(q, { amount: -amt, reason: `Sent ${first(nn)} money`, category: "dating" }); if (rr) { rr.affection = clamp(rr.affection + 5); rr.trust = clamp(rr.trust + 2); rr.moneyRequests += 1; if (rr.moneyRequests > 3) rr.satisfaction = clamp(rr.satisfaction - 3); } return `${first(nn)} sends back a thousand kisses.`; } },
        { label: "Send half", sub: naira(amt / 2), disabled: p.money < amt / 2 ? "You are short" : false, run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); transact(q, { amount: -Math.round(amt / 2), reason: `Sent ${first(nn)} part of what was asked`, category: "dating" }); if (rr) { rr.moneyRequests += 1; rr.affection = clamp(rr.affection + 1); } return `${first(nn)} says thank you, but you can feel it was not what they hoped for.`; } },
        { label: "Explain that you are broke", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (rr) { const ok = chance(clamp(0.4 + (nn.materialism > 60 ? -0.2 : 0.2) + rr.affection / 250, 0.1, 0.9)); rr.trust = clamp(rr.trust + (ok ? 3 : -2)); rr.affection = clamp(rr.affection + (ok ? 1 : -5)); return ok ? `${first(nn)} understands: "We'll manage."` : `${first(nn)} sulks for days. "So what are you good for, then?"`; } return ""; } },
        { label: "Borrow from a friend to help", run: (q) => { const f = Object.values(q.npcs).find((x) => x.role === "friend" && x.alive); if (!f) return "You have nobody to ask."; const res = borrowFrom(q, f, amt, (pp, nn, a) => ({ type: chance(0.6) ? "full" : "refuse", amount: a, text: `${first(nn)} thinks about it.` })); if (res.loan) { transact(q, { amount: -amt, reason: `Sent ${first(npc(q, d.npcId))} money`, category: "dating" }); const rr = rel(q, d.npcId); if (rr) rr.affection = clamp(rr.affection + 4); return `${res.text} You sent the money onward. Your friend is waiting on you now.`; } return res.text; } },
        { label: "Say no firmly", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (rr) { rr.affection = clamp(rr.affection - (nn.materialism > 60 ? 12 : 5)); rr.satisfaction = clamp(rr.satisfaction - 4); } if (r && r.affection < 25) return breakUp(q, String(d.npcId), "money wahala"); return `${first(nn)} goes quiet.`; } },
      ];
    },
  },
  {
    id: "jealousy_row",
    title: "A jealous argument",
    weight: () => 0,
    valid: (p) => committedOrDating(p),
    text: (p, d) => `${first(npc(p, d.npcId))} found a message on your phone and the quarrel starts: "Who is that?!"`,
    choices: (_p, d) => [
      { label: "Calm down, explain and apologise", run: (q) => { const rr = rel(q, d.npcId); if (rr) { rr.trust = clamp(rr.trust + 3); rr.affection = clamp(rr.affection + 1); } return "You talk it through until midnight. It ends in a hug."; } },
      { label: "Defend yourself loudly", run: (q) => { const rr = rel(q, d.npcId); if (rr) { rr.trust = clamp(rr.trust - 6); rr.affection = clamp(rr.affection - 6); } return "You both say things you cannot take back."; } },
      { label: "Walk out", run: (q) => (chance(0.5) ? breakUp(q, String(d.npcId), "a jealous argument") : "You cool off for a day and both apologise.") },
    ],
  },
  {
    id: "cheating_caught",
    title: "Caught!",
    weight: () => 0,
    valid: (p) => committedOrDating(p),
    text: (p, d) => `${first(npc(p, d.npcId))} has found out you have been seeing someone else. The screenshots are on the table.`,
    choices: (p, d) => [
      { label: "Confess and beg forgiveness", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (rr) { rr.cheated = true; rr.trust = clamp(rr.trust - 30); if (chance(0.45 + rr.affection / 250)) { rr.affection = clamp(rr.affection - 10); remember(q, nn, "Cheated on you but begged for forgiveness.", "bad"); return `${first(nn)} cries, then stays. "One more chance. Only one."`; } } return breakUp(q, String(d.npcId), "you cheated"); } },
      { label: "Deny everything", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (chance(0.25)) { return `${first(nn)} wavers. "I want to believe you."`; } bump(q, "reputation", -4); return breakUp(q, String(d.npcId), "you lied about cheating"); } },
      { label: "Blame them", run: (q) => { bump(q, "reputation", -5); return breakUp(q, String(d.npcId), "you cheated and blamed them"); } },
    ],
  },
  {
    id: "partner_cheats",
    title: "Something is off",
    weight: () => 0,
    valid: (p) => committedOrDating(p),
    text: (p, d) => `A friend sends you a photo: ${first(npc(p, d.npcId))} with someone else, at a restaurant you have never been to.`,
    choices: (p, d) => [
      { label: "Confront them", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (chance(0.5)) { if (rr) { rr.trust = clamp(rr.trust - 20); } return `${first(nn)} admits it. You need to decide what comes next.`; } return `${first(nn)} swears it is a cousin. You are not sure.`; } },
      { label: "End the relationship", run: (q) => breakUp(q, String(d.npcId), "they cheated") },
      { label: "Let it slide", run: (q) => { const rr = rel(q, d.npcId); if (rr) rr.trust = clamp(rr.trust - 10); bump(q, "stress", 8); return "You say nothing. It eats you inside."; } },
    ],
  },
  {
    id: "ex_returns",
    title: "An ex reaches out",
    weight: () => 0,
    valid: (p) => p.rel.partners.some((r) => r.stage === "ex"),
    text: (p, d) => `${first(npc(p, d.npcId))} messages you out of the blue: "I miss you. Can we talk?"`,
    choices: (p, d) => [
      { label: "Give it another try", run: (q) => { const rr = rel(q, d.npcId); const nn = npc(q, d.npcId); if (rr) { rr.stage = "dating"; rr.affection = clamp(rr.affection + 8); rr.exitReason = undefined; } nn.role = "partner"; return `You and ${first(nn)} agree to start over.`; } },
      { label: "Stay friends", run: (q) => { bump(q, "happiness", 2); return "You keep it civil and friendly."; } },
      { label: "Block them", run: (q) => { bump(q, "stress", -2); return "Closure, finally."; } },
    ],
  },
  {
    id: "third_wheel",
    title: "An unusual suggestion",
    weight: () => 0,
    valid: (p) => committedOrDating(p),
    text: (p, d) => `${first(npc(p, d.npcId))} brings up something you did not expect: inviting another consenting adult into your relationship, just once. It is entirely your call.`,
    choices: (p, d) => [
      { label: "Talk it over and agree", run: (q) => { const rr = rel(q, d.npcId); if (rr) { if (chance(0.5)) { rr.satisfaction = clamp(rr.satisfaction + 6); rr.trust = clamp(rr.trust - 2); } else { rr.trust = clamp(rr.trust - 12); rr.affection = clamp(rr.affection - 8); } } if (chance(0.06)) developCondition(q, "sti"); return "It happens, and afterwards you both need to talk about what it means."; } },
      { label: "Decline politely", run: (q) => { const rr = rel(q, d.npcId); if (rr) rr.trust = clamp(rr.trust + 2); return "You say no. They respect it."; } },
      { label: "Say no and question the relationship", run: (q) => { const rr = rel(q, d.npcId); if (rr) rr.affection = clamp(rr.affection - 6); return "The conversation gets tense."; } },
    ],
  },
  {
    id: "pregnancy_news",
    title: "A positive test",
    weight: () => 0,
    text: (p, d) => `A pregnancy test shows two lines. ${p.gender === "male" ? `${first(npc(p, d.npcId))} is expecting your child.` : "You are expecting."} Life is about to change.`,
    choices: (p, d) => {
      const n = npc(p, d.npcId);
      const married = p.spouse?.npcId === n?.id;
      return [
        { label: married ? "Celebrate and prepare" : "Commit to raising the baby together", run: (q) => { q.flags.keepPregnancy = 1; const rr = rel(q, d.npcId); if (rr) { rr.affection = clamp(rr.affection + 6); rr.satisfaction = clamp(rr.satisfaction + 4); } bump(q, "stress", 6); return "You both decide to prepare for the baby. Money plans will need to change."; } },
        { label: "Support the baby financially but stay apart", disabled: married ? "You are married" : false, run: (q) => { q.flags.keepPregnancy = 1; const rr = rel(q, d.npcId); if (rr && rr.stage !== "married") { rr.stage = "ex"; rr.exitReason = "separated over the pregnancy"; } return "You agree to support the child from a distance. It is not easy for anyone."; } },
        { label: "Ask for time to decide", run: (q) => { q.flags.keepPregnancy = 1; const rr = rel(q, d.npcId); if (rr) rr.trust = clamp(rr.trust - 5); bump(q, "stress", 8); return "Time passes, and the decision gets made by circumstance. A baby is coming."; } },
      ];
    },
  },
];

const committedOrDating = (p: Player) => activePartners(p).length > 0;

/** Handy for the UI: label for a stage. */
export const STAGE_LABEL: Record<RelStage, string> = { chatting: "Chatting", dating: "Dating", exclusive: "Exclusive", engaged: "Engaged", married: "Married", ex: "Ex" };
