import { I, bump, enterPrison, luckBonus } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { remember } from "./family";
import { primaryProvider } from "./family";
import type { Choice, EventDef, Pending, Player } from "./types";
import { T, chance, clamp, naira, pick, rand, randInt } from "./util";

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
export interface SkillDef {
  id: string;
  label: string;
  cost: number;
  blurb: string;
}
export const SKILLS: SkillDef[] = [
  { id: "coding", label: "Coding", cost: 120_000, blurb: "Build software. Opens tech jobs even without a degree." },
  { id: "writing", label: "Writing and copy", cost: 30_000, blurb: "Useful for media, marketing and content." },
  { id: "cooking", label: "Catering and cooking", cost: 60_000, blurb: "Makes restaurants and food hustles stronger." },
  { id: "tailoring", label: "Tailoring and design", cost: 80_000, blurb: "Helps fashion businesses and hustles." },
  { id: "sales", label: "Sales and negotiation", cost: 40_000, blurb: "Better pay, better deals, better luck." },
  { id: "music", label: "Music and performance", cost: 70_000, blurb: "Instruments, vocals and stagecraft." },
  { id: "welding", label: "Welding and fabrication", cost: 150_000, blurb: "A solid trade that pays well in building and repairs." },
];
export interface TradeDef { id: string; label: string; skill: string; years: number; blurb: string }
export const TRADES: TradeDef[] = [
  { id: "tailoring", label: "Fashion and tailoring", skill: "tailoring", years: 2, blurb: "Apprentice under a master tailor and learn pattern making." },
  { id: "welding", label: "Welding and auto mechanics", skill: "welding", years: 2, blurb: "A solid trade that never runs out of customers." },
  { id: "catering", label: "Catering and hospitality", skill: "cooking", years: 1, blurb: "Cook, cost a menu and run an event kitchen." },
  { id: "coding", label: "Coding bootcamp", skill: "coding", years: 1, blurb: "A year of intensive software training." },
  { id: "sales", label: "Business and sales", skill: "sales", years: 1, blurb: "Bookkeeping, marketing and selling." },
];

export function tradeBlock(p: Player): string | null {
  if (p.school) return "You are already in school";
  if (p.age < 15) return "From age 15";
  if (p.age > 45) return "Too late for a training programme";
  if (p.edu === "none" || p.edu === "primary") return "Finish secondary school first";
  if (p.prison > 0) return "Not from prison";
  if (p.flags.trade) return "You already hold a trade certificate";
  return null;
}

export function enrollTrade(p: Player, id: string): string {
  const t = TRADES.find((x) => x.id === id);
  const b = tradeBlock(p);
  if (!t) return "";
  if (b) return b;
  p.school = { stage: "tertiary", yearsLeft: t.years, type: "vocational" };
  p.flags.schoolType = "public";
  p.flags.tradeId = t.id;
  p.job = null;
  return `You enrol for ${t.label.toLowerCase()} (${t.years} year${t.years > 1 ? "s" : ""}). Fees apply each term unless your family covers them.`;
}

/** Called when a vocational programme ends. */
export function finishTrade(p: Player): string {
  const t = TRADES.find((x) => x.id === p.flags.tradeId);
  if (!t) return "You complete your training.";
  p.skills[t.skill] = clamp(Math.max(p.skills[t.skill] ?? 0, 55) + randInt(0, 10), 0, 100);
  p.flags.trade = t.label;
  bump(p, "smarts", 1);
  return `You complete ${t.label.toLowerCase()} and receive your certificate. Skill level ${Math.round(p.skills[t.skill])}: employers and customers pay more for it.`;
}

export const skillLevel = (p: Player, id: string) => p.skills[id] ?? 0;

export function learnBlock(p: Player, s: SkillDef): string | null {
  if (p.age < 10) return "Too young";
  if (p.prison > 0) return "Not from prison";
  if (p.actionsLeft <= 0) return "No actions left this year";
  const c = Math.round(s.cost * Math.pow(p.index, 0.92));
  if (p.money < c) return `Needs ${naira(c)}`;
  return null;
}

export function learnSkill(p: Player, id: string): string {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) return "";
  const block = learnBlock(p, s);
  if (block) return block;
  p.actionsLeft -= 1;
  const cost = Math.round(s.cost * Math.pow(p.index, 0.92));
  transact(p, { amount: -cost, reason: `Course: ${s.label}`, category: "education" });
  const gain = Math.round(10 + p.stats.smarts / 10 + rand(0, 8));
  p.skills[id] = clamp((p.skills[id] ?? 0) + gain);
  bump(p, "smarts", 1);
  return `You finish a ${s.label.toLowerCase()} course. Skill level: ${Math.round(p.skills[id])}.`;
}

/** Fraction added to pay for relevant skills. */
export function skillPayBonus(p: Player, jobId: string): number {
  const map: Record<string, string> = { dev: "coding", tailor: "tailoring", salon: "tailoring", journalist: "writing", singer: "music", mechanic: "welding", akara: "cooking", suya: "cooking", banker: "sales" };
  const k = map[jobId];
  return k ? skillLevel(p, k) / 250 : 0;
}

// ---------------------------------------------------------------------------
// Activities beyond the basics
// ---------------------------------------------------------------------------
export interface GrowthActivity {
  id: string;
  label: string;
  desc: string;
  cost: number;
  minAge: number;
}
export const GROWTH_ACTIVITIES: GrowthActivity[] = [
  { id: "read", label: "Read a book", desc: "Knowledge and a calmer mind.", cost: 3_000, minAge: 7 },
  { id: "run", label: "Go for a run or walk", desc: "Free fitness and fresh air.", cost: 0, minAge: 6 },
  { id: "weights", label: "Weight training", desc: "Build strength. Needs a gym day pass.", cost: 8_000, minAge: 15 },
  { id: "rest", label: "Rest and sleep properly", desc: "Lower stress and recover.", cost: 0, minAge: 3 },
  { id: "hobby", label: "Pursue a hobby", desc: "Guitar, football, art or cooking for joy.", cost: 5_000, minAge: 6 },
];

export function growthBlock(p: Player, a: GrowthActivity): string | null {
  if (p.prison > 0) return "In prison";
  if (p.age < a.minAge) return `From age ${a.minAge}`;
  if (p.actionsLeft <= 0) return "No actions left this year";
  if (a.cost && p.age >= 14 && p.money < I(p, a.cost)) return "Not enough cash";
  return null;
}

export function doGrowth(p: Player, id: string): string {
  const a = GROWTH_ACTIVITIES.find((x) => x.id === id);
  if (!a || growthBlock(p, a)) return growthBlock(p, a ?? GROWTH_ACTIVITIES[0]) ?? "";
  p.actionsLeft -= 1;
  const cost = Math.round(I(p, a.cost));
  if (cost > 0 && p.age >= 14) transact(p, { amount: -cost, reason: a.label, category: "personal" });
  switch (id) {
    case "read": bump(p, "smarts", 2); bump(p, "stress", -2); return "You get lost in a good book. You learn something new.";
    case "run": bump(p, "fitness", 3); bump(p, "health", 1); bump(p, "stress", -2); return "You run until your lungs burn, then feel great.";
    case "weights": bump(p, "fitness", 4); bump(p, "looks", 0.6); bump(p, "stress", -1); return "You hit the weights hard. Tomorrow you will feel it.";
    case "rest": bump(p, "stress", -8); bump(p, "health", 1.5); return "A proper long sleep. The world looks softer.";
    case "hobby": { bump(p, "happiness", 5); p.skills.music = clamp((p.skills.music ?? 0) + 2); return "You lose track of time doing what you love."; }
  }
  return "";
}

export function gymBlock(p: Player): string | null {
  if (p.age < 15) return "From age 15";
  return null;
}
export function toggleGym(p: Player): string {
  const has = p.subs.some((s) => s.id === "gym");
  if (has) { p.subs = p.subs.filter((s) => s.id !== "gym"); return "You cancelled your gym membership."; }
  p.subs.push({ id: "gym", label: "Gym membership", monthly: 15_000, category: "personal", since: monthIndex(p) });
  return "You joined a gym. The monthly fee will be charged automatically.";
}

export function growthMonth(p: Player) {
  if (p.subs.some((s) => s.id === "gym")) {
    bump(p, "fitness", 0.5);
    bump(p, "health", 0.1);
    bump(p, "stress", -0.2);
  }
  if (p.flags.weekendJob && p.age >= 13 && p.age <= 19) {
    transact(p, { amount: Math.round(8_000 * Math.pow(p.index, 0.92) * rand(0.8, 1.3)), reason: "Weekend shop job", category: "salary", recurring: "weekend-job" });
  }
  if (p.flags.pension) {
    transact(p, { amount: Math.round(Number(p.flags.pensionAnnual ?? 0) / 12), reason: "Pension payment", category: "salary", recurring: "pension" });
  }
}

export function yearlyGrowth(p: Player) {
  if (p.age > 28) bump(p, "fitness", -2.2);
  if (p.stats.fitness > 70) bump(p, "health", 0.8);
  if (p.stats.fitness < 25) bump(p, "health", -1);
}

// ---------------------------------------------------------------------------
// School life and early work
// ---------------------------------------------------------------------------
const inSchool = (p: Player) => Boolean(p.school) && p.age <= 18;
const first = (s: string) => s.split(" ")[0];

export const LIFE_EVENTS: EventDef[] = [
  {
    id: "bullying",
    title: "Trouble at school",
    weight: (p) => (inSchool(p) && p.age >= 8 ? 1.8 : 0),
    text: () => "An older boy keeps taking your lunch money and shoving you in the corridor. Other children laugh.",
    choices: (p) => [
      { label: "Tell a teacher", run: (q) => { if (chance(0.6)) { bump(q, "stress", -3); return "The teacher punishes the bully. He leaves you alone for a while."; } bump(q, "reputation", -2); bump(q, "stress", 4); return "The teacher shrugs. The bully gets angrier."; } },
      { label: "Tell your parents", run: (q) => { const prov = primaryProvider(q); if (prov) { prov.closeness = clamp(prov.closeness + 2); } bump(q, "stress", -2); return "Your parent goes to the school and has a word with the principal."; } },
      { label: "Fight back", run: (q) => { if (chance(0.45 + q.stats.fitness / 300)) { bump(q, "reputation", 4); bump(q, "fitness", 1); return "You stand your ground. The bully backs off, and so does everyone else."; } bump(q, "health", -3); bump(q, "reputation", -2); return "You lose the fight, but you went down swinging."; } },
      { label: "Stay out of his way", run: (q) => { bump(q, "stress", 4); return "You avoid the corridor and the lunch break. It is not a solution."; } },
    ],
  },
  {
    id: "school_discipline",
    title: "Sent to the principal",
    weight: (p) => (inSchool(p) && p.age >= 10 ? 1.6 : 0),
    text: (p) => (p.possessions.phone ? "A teacher catches you with a phone in class. The principal wants to see you and your parents." : "You are caught talking back in class. The principal wants to see you and your parents."),
    choices: () => [
      { label: "Apologise and accept the punishment", run: (q) => { bump(q, "reputation", 1); bump(q, "stress", 2); return "You kneel, apologise and get detention. The matter ends there."; } },
      { label: "Argue that it was unfair", run: (q) => { const prov = primaryProvider(q); if (prov && prov.strictness > 55) prov.closeness = clamp(prov.closeness - 4); bump(q, "reputation", -2); return "It escalates. Your parents are not pleased."; } },
    ],
  },
  {
    id: "report_card",
    title: "End-of-term results",
    weight: (p) => (inSchool(p) && p.age >= 8 ? 2.4 : 0),
    text: () => "Report cards are out. Everyone is comparing grades in the corridor.",
    choices: () => [
      { label: "Open your report", run: (q) => {
        const quality = q.flags.schoolType === "elite" ? 6 : q.flags.schoolType === "private" ? 3 : 0;
        const score = q.stats.smarts * 0.8 + quality + rand(-14, 14);
        const prov = primaryProvider(q);
        if (score >= 70) { if (prov) { prov.closeness = clamp(prov.closeness + 3); if (prov.generosity > 50) { transact(q, { amount: Math.round(I(q, 8_000)), reason: `Reward from ${first(prov.name)} for good results`, category: "gift" }); } } bump(q, "happiness", 4); return "Excellent results! Your family is proud, and there might be a small reward."; }
        if (score >= 45) return "Decent results. Nothing to celebrate, nothing to hide.";
        if (prov && prov.strictness > 60) { prov.closeness = clamp(prov.closeness - 2); bump(q, "stress", 5); return "Poor results. The lecture at home lasts all evening."; }
        bump(q, "stress", 3);
        return "Poor results. Your parents ask what happened.";
      } },
    ],
  },
  {
    id: "scholarship_offer",
    title: "A scholarship chance",
    weight: (p) => (p.stats.smarts >= 68 && p.fam.income < 15e6 && ((p.school?.stage === "secondary" && p.age >= 14) || p.school?.stage === "tertiary") && !p.flags.scholarship ? 3 : 0),
    text: () => "A foundation is offering a scholarship for brilliant students who cannot easily afford school. The application needs an essay and an interview.",
    choices: () => [
      { label: "Apply seriously", run: (q) => { if (chance(clamp(0.2 + q.stats.smarts / 200 + luckBonus(q), 0.1, 0.8))) { q.flags.scholarship = true; if (!q.achievements.includes("Won a scholarship")) q.achievements.push("Won a scholarship"); return "You win the scholarship! School fees are largely covered."; } return "You are shortlisted but not selected. Keep trying."; } },
      { label: "Don't bother", run: () => "You decide it is not for you." },
    ],
  },
  {
    id: "weekend_job",
    title: "A weekend job",
    weight: (p) => (p.age >= 13 && p.age <= 17 && !p.flags.weekendJob && p.fam.income < 12e6 ? 2 : 0),
    text: () => "A neighbour who owns a shop offers you a weekend job: sweeping, arranging goods and running errands.",
    choices: () => [
      { label: "Take it", run: (q) => { q.flags.weekendJob = true; bump(q, "stress", 2); bump(q, "connections", 1); return "You start on Saturdays. The money is small, but it is yours."; } },
      { label: "Focus on school", run: (q) => { bump(q, "smarts", 1); return "Studying comes first for now."; } },
    ],
  },
  {
    id: "trade_choice",
    title: "Choose a trade",
    weight: () => 0,
    text: () => "Not everyone needs a degree. A good trade pays the bills, and a certificate opens doors.",
    choices: () => [
      ...TRADES.map<Choice>((t) => ({ label: t.label, sub: `${t.years} year${t.years > 1 ? "s" : ""}`, run: (q) => enrollTrade(q, t.id) })),
      { label: "Not now", run: () => "You decide to think about it." },
    ],
  },
  {
    id: "learn_skill",
    title: "Learn something new",
    weight: () => 0,
    text: () => "A friend recommends a course that could change what you can do.",
    choices: () => [{ label: "Maybe later", run: () => "You keep it in mind." }],
  },
  // -------- NPCs remember --------
  {
    id: "friend_remembers",
    title: "A friend has not forgotten",
    weight: (p) => (Object.values(p.npcs).some((n) => n.alive && n.role === "friend" && n.memories.some((m) => m.tone === "bad" && p.age - m.age <= 4)) ? 1.8 : 0),
    init: (p) => {
      const f = pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend" && n.memories.some((m) => m.tone === "bad")));
      const m = f.memories.filter((x) => x.tone === "bad").slice(-1)[0];
      return { friendId: f.id, memory: m?.text ?? "something you did" };
    },
    text: (p, d) => `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} brings it up again: "I still remember when you ${String(d.memory).toLowerCase()}"`,
    choices: (p, d) => [
      { label: "Apologise and make it right", sub: naira(I(p, 25_000)), disabled: p.money < I(p, 25_000) ? "Not enough cash" : false, run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -I(q, 25_000), reason: `Making amends with ${first(n.name)}`, category: "family" }); n.closeness = clamp(n.closeness + 8); n.trust = clamp(n.trust + 6); n.memories = n.memories.filter((m) => m.tone !== "bad"); remember(q, n, "Made amends with you.", "good"); return "You say sorry and mean it. Things feel lighter."; } },
      { label: "Brush it off", run: (q) => { const n = q.npcs[String(d.friendId)]; n.closeness = clamp(n.closeness - 6); return "The friendship cools noticeably."; } },
    ],
  },
  {
    id: "friend_wedding",
    title: "A friend is getting married",
    weight: (p) => (p.age >= 20 && Object.values(p.npcs).some((n) => n.alive && n.role === "friend" && n.closeness > 40) ? 2.2 : 0),
    init: (p) => ({ friendId: pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend")).id }),
    text: (p, d) => `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} is getting married and you are on the guest list. Aso-ebi money is due.`,
    choices: (p, d) => [
      { label: "Attend with a generous gift", sub: naira(I(p, 60_000)), disabled: p.money < I(p, 60_000) ? "Not enough cash" : false, run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -I(q, 60_000), reason: `Wedding gift and aso-ebi for ${first(n.name)}`, category: "social" }); n.closeness = clamp(n.closeness + 6); bump(q, "happiness", 5); bump(q, "connections", 2); return "A beautiful day, a loud DJ, and enough jollof for everyone."; } },
      { label: "Attend with a small gift", sub: naira(I(p, 15_000)), run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -Math.min(q.money, I(q, 15_000)), reason: `Wedding gift for ${first(n.name)}`, category: "social" }); n.closeness = clamp(n.closeness + 2); return "You show up and dance your heart out."; } },
      { label: "Send your regrets", run: (q) => { const n = q.npcs[String(d.friendId)]; n.closeness = clamp(n.closeness - 5); remember(q, n, "Missed your wedding.", "bad"); return "They say they understand. They don't."; } },
    ],
  },
  {
    id: "friend_success",
    title: "A friend makes it",
    weight: (p) => (p.age >= 20 && Object.values(p.npcs).some((n) => n.alive && n.role === "friend") ? 1.2 : 0),
    init: (p) => ({ friendId: pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend")).id }),
    text: (p, d) => `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} just landed a big break (a promotion, a contract, a visa). They want to celebrate with you.`,
    choices: () => [
      { label: "Celebrate with them", run: (q) => { bump(q, "happiness", 5); bump(q, "connections", 2); return "You raise a glass. Their success might open a door for you too."; } },
      { label: "Feel a little jealous", run: (q) => { bump(q, "stress", 3); return "You smile for the photos and feel like you are falling behind."; } },
    ],
  },
  // -------- Military --------
  {
    id: "military_training",
    title: "Recruit training",
    weight: () => 0,
    text: () => "Basic training is brutal: 4 a.m. wake-ups, drills in the sun and an instructor who never smiles.",
    choices: () => [
      { label: "Push yourself to the limit", run: (q) => { bump(q, "fitness", 8); bump(q, "stress", 8); if (chance(0.15)) q.flags.spawnCondition = "sprain"; delete q.flags.training; return "You come out stronger, sharper and exhausted."; } },
      { label: "Do just enough to get through", run: (q) => { bump(q, "fitness", 3); delete q.flags.training; return "You graduate quietly with the pack."; } },
      { label: "Desert", run: (q) => { q.job = null; delete q.flags.training; bump(q, "reputation", -10); if (chance(0.4)) return enterPrison(q, 2); return "You vanish from the barracks. They will be looking."; } },
    ],
  },
  {
    id: "deployment",
    title: "Deployment orders",
    weight: (p) => (isMilitary(p) && !p.flags.training ? 2.2 : 0),
    text: (p) => `Your unit is ordered to deploy to a troubled area of ${pick(["the North East", "the North West", "the Niger Delta", "a peacekeeping mission abroad"])}.`,
    choices: (p) => [
      { label: "Go and do your duty", run: (q) => { const hazard = chance(0.22); q.flags.tours = (Number(q.flags.tours) || 0) + 1; transact(q, { amount: Math.round(I(q, 450_000)), reason: "Deployment allowance", category: "salary" }); bump(q, "reputation", 3); bump(q, "stress", 10); if (hazard) { q.flags.spawnCondition = chance(0.5) ? "gunshot" : "stab"; return "You complete the tour, but you are hurt in an ambush."; } if (q.job && chance(0.35)) { q.job.years += 1; } return "You return safely with a medal, a bonus and heavy memories."; } },
      { label: "Seek an exemption", sub: "Needs connections", disabled: p.stats.connections < 30 ? "Not enough connections" : false, run: (q) => { bump(q, "reputation", -2); return "A phone call from the right person keeps you in barracks."; } },
      { label: "Refuse the order", run: (q) => { q.job = null; bump(q, "reputation", -8); return enterPrison(q, 2); } },
    ],
  },
  {
    id: "retire_option",
    title: "Retirement from the service",
    weight: (p) => (isMilitary(p) && p.job && p.job.years >= 20 ? 6 : 0),
    text: () => "You have served twenty years. The service offers you retirement with a pension.",
    choices: () => [
      { label: "Retire with a pension", run: (q) => { const j = q.job; q.flags.pension = true; q.flags.pensionAnnual = Math.round(1_800_000 * Math.pow(q.index, 0.9) * (1 + (j?.rank ?? 0) * 0.8)); q.job = null; return "You hand in your uniform. A modest pension will arrive every month."; } },
      { label: "Serve a few more years", run: () => "You stay on, for the rank and the discipline." },
    ],
  },
];

export function enlistBlock(p: Player): string | null {
  if (p.age < 18 || p.age > 30) return "Recruits must be 18 to 30";
  if (p.edu === "none" || p.edu === "primary") return "Needs secondary education";
  if (p.stats.health < 50) return "Health too low";
  if (p.stats.fitness < 30) return "Fitness too low";
  if (isMilitary(p)) return T("Already serving", "You don dey service already");
  if (p.prison > 0) return "In prison";
  return null;
}

export const MILITARY_BRANCHES = { army: "soldier", navy: "navy", airforce: "airforce" } as const;
export const isMilitary = (p: Player) => Boolean(p.job && ["soldier", "navy", "airforce"].includes(p.job.id));

export function enlist(p: Player, branch: keyof typeof MILITARY_BRANCHES = "army"): { text: string; spawn: Pending[] } {
  const block = enlistBlock(p);
  if (block) return { text: block, spawn: [] };
  const pr = clamp(0.4 + p.stats.fitness / 250 + p.stats.smarts / 300 + p.stats.connections / 400 + luckBonus(p), 0.1, 0.9);
  if (!chance(pr)) return { text: "Your recruitment application is not successful this time.", spawn: [] };
  p.job = { id: MILITARY_BRANCHES[branch], rank: 0, years: 0 };
  p.flags.branch = branch;
  p.flags.training = 1;
  return { text: "You are accepted into the army. Training begins.", spawn: [{ kind: "event", id: "military_training", data: { month: randInt(1, 12) } }] };
}

