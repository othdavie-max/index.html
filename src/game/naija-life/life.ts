import { I, bump, enterPrison, luckBonus } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { remember } from "./family";
import { primaryProvider } from "./family";
import type { Choice, EventDef, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

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
  { id: "coding", get label() { return T("Coding", "Coding"); }, cost: 120_000, get blurb() { return T("Build software. Opens tech jobs even without a degree.", "Build software. E dey open tech work even if you no get degree."); } },
  { id: "writing", get label() { return T("Writing and copywriting", "Writing and copy"); }, cost: 30_000, get blurb() { return T("Useful for media, marketing and content.", "E dey useful for media, marketing and content work."); } },
  { id: "cooking", get label() { return T("Catering and cooking", "Catering and cooking"); }, cost: 60_000, get blurb() { return T("Makes restaurants and food hustles stronger.", "E dey make restaurant and food hustle strong well."); } },
  { id: "tailoring", get label() { return T("Tailoring and design", "Tailoring and design"); }, cost: 80_000, get blurb() { return T("Helps fashion businesses and hustles.", "E dey help fashion business and hustle."); } },
  { id: "sales", get label() { return T("Sales and negotiation", "Sales and negotiation"); }, cost: 40_000, get blurb() { return T("Better pay, better deals, better luck.", "Better pay, better deals, better luck."); } },
  { id: "music", get label() { return T("Music and performance", "Music and performance"); }, cost: 70_000, get blurb() { return T("Instruments, vocals and stagecraft.", "Instruments, singing and how to hold stage."); } },
  { id: "welding", get label() { return T("Welding and fabrication", "Welding and fabrication"); }, cost: 150_000, get blurb() { return T("A solid trade that pays well in building and repairs.", "Solid trade wey dey pay well for building and repair work."); } },
];
export interface TradeDef { id: string; label: string; skill: string; years: number; blurb: string }
export const TRADES: TradeDef[] = [
  { id: "tailoring", get label() { return T("Fashion and tailoring", "Fashion and tailoring"); }, skill: "tailoring", years: 2, get blurb() { return T("Apprentice under a master tailor and learn pattern making.", "Learn under master tailor and sabi how to cut pattern."); } },
  { id: "welding", get label() { return T("Welding and auto mechanics", "Welding and auto mechanics"); }, skill: "welding", years: 2, get blurb() { return T("A solid trade that never runs out of customers.", "Solid trade wey customer no dey ever finish."); } },
  { id: "catering", get label() { return T("Catering and hospitality", "Catering and hospitality"); }, skill: "cooking", years: 1, get blurb() { return T("Cook, cost a menu and run an event kitchen.", "Cook food, price menu and run kitchen for events."); } },
  { id: "coding", get label() { return T("Coding bootcamp", "Coding bootcamp"); }, skill: "coding", years: 1, get blurb() { return T("A year of intensive software training.", "One full year of serious software training."); } },
  { id: "sales", get label() { return T("Business and sales", "Business and sales"); }, skill: "sales", years: 1, get blurb() { return T("Bookkeeping, marketing and selling.", "Bookkeeping, marketing and how to sell."); } },
];

export function tradeBlock(p: Player): string | null {
  if (p.school) return T("You are already in school", "You dey school already");
  if (p.age < 15) return T("From age 15", "From age 15");
  if (p.age > 45) return T("Too late for a training programme", "E don late for training programme");
  if (p.edu === "none" || p.edu === "primary") return T("Finish secondary school first", "Finish secondary school first");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (p.flags.trade) return T("You already hold a trade certificate", "You don get trade certificate already");
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
  return T(
    `You enrol for ${t.label.toLowerCase()} (${t.years} year${t.years > 1 ? "s" : ""}). Fees apply each term unless your family covers them.`,
    `You register for ${t.label.toLowerCase()} (${t.years} year${t.years > 1 ? "s" : ""}). You go pay fees every term unless your family cover am.`,
  );
}

/** Called when a vocational programme ends. */
export function finishTrade(p: Player): string {
  const t = TRADES.find((x) => x.id === p.flags.tradeId);
  if (!t) return T("You complete your training.", "You don finish your training.");
  p.skills[t.skill] = clamp(Math.max(p.skills[t.skill] ?? 0, 55) + randInt(0, 10), 0, 100);
  p.flags.trade = t.label;
  bump(p, "smarts", 1);
  return T(
    `You complete ${t.label.toLowerCase()} and receive your certificate. Skill level ${Math.round(p.skills[t.skill])}: employers and customers pay more for it.`,
    `You don finish ${t.label.toLowerCase()} and collect your certificate. Skill level na ${Math.round(p.skills[t.skill])}: employer and customer go pay more for am.`,
  );
}

export const skillLevel = (p: Player, id: string) => p.skills[id] ?? 0;

export function learnBlock(p: Player, s: SkillDef): string | null {
  if (p.age < 10) return T("Too young", "You too small");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain for this year");
  const c = Math.round(s.cost * Math.pow(p.index, 0.92));
  if (p.money < c) return T(`Needs ${naira(c)}`, `E need ${naira(c)}`);
  return null;
}

export function learnSkill(p: Player, id: string): string {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) return "";
  const block = learnBlock(p, s);
  if (block) return block;
  p.actionsLeft -= 1;
  const cost = Math.round(s.cost * Math.pow(p.index, 0.92));
  transact(p, { amount: -cost, reason: T(`Course: ${s.label}`, `Course: ${s.label}`), category: "education" });
  const gain = Math.round(10 + p.stats.smarts / 10 + rand(0, 8));
  p.skills[id] = clamp((p.skills[id] ?? 0) + gain);
  bump(p, "smarts", 1);
  return T(
    `You finish a ${s.label.toLowerCase()} course. Skill level: ${Math.round(p.skills[id])}.`,
    `You don finish ${s.label.toLowerCase()} course. Skill level: ${Math.round(p.skills[id])}.`,
  );
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
  { id: "read", get label() { return T("Read a book", "Read book"); }, get desc() { return T("Knowledge and a calmer mind.", "Sense and cool head."); }, cost: 3_000, minAge: 7 },
  { id: "run", get label() { return T("Go for a run or walk", "Go run or waka"); }, get desc() { return T("Free fitness and fresh air.", "Free exercise and fresh air."); }, cost: 0, minAge: 6 },
  { id: "weights", get label() { return T("Weight training", "Lift weights"); }, get desc() { return T("Build strength. Needs a gym day pass.", "Build strength. You go need gym day pass."); }, cost: 8_000, minAge: 15 },
  { id: "rest", get label() { return T("Rest and sleep properly", "Rest and sleep well"); }, get desc() { return T("Lower stress and recover.", "Reduce stress and recover."); }, cost: 0, minAge: 3 },
  { id: "hobby", get label() { return T("Pursue a hobby", "Do your hobby"); }, get desc() { return T("Guitar, football, art or cooking for joy.", "Guitar, football, art or cooking for fun."); }, cost: 5_000, minAge: 6 },
];

export function growthBlock(p: Player, a: GrowthActivity): string | null {
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (p.age < a.minAge) return T(`From age ${a.minAge}`, `From age ${a.minAge}`);
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain for this year");
  if (a.cost && p.age >= 14 && p.money < I(p, a.cost)) return T("Not enough cash", "Cash no reach");
  return null;
}

export function doGrowth(p: Player, id: string): string {
  const a = GROWTH_ACTIVITIES.find((x) => x.id === id);
  if (!a || growthBlock(p, a)) return growthBlock(p, a ?? GROWTH_ACTIVITIES[0]) ?? "";
  p.actionsLeft -= 1;
  const cost = Math.round(I(p, a.cost));
  if (cost > 0 && p.age >= 14) transact(p, { amount: -cost, reason: a.label, category: "personal" });
  switch (id) {
    case "read": bump(p, "smarts", 2); bump(p, "stress", -2); return T("You get lost in a good book. You learn something new.", "You enter one sweet book and forget everything. You learn something new.");
    case "run": bump(p, "fitness", 3); bump(p, "health", 1); bump(p, "stress", -2); return T("You run until your lungs burn, then feel great.", "You run till your chest dey burn, then you feel fine well well.");
    case "weights": bump(p, "fitness", 4); bump(p, "looks", 0.6); bump(p, "stress", -1); return T("You hit the weights hard. Tomorrow you will feel it.", "You lift weights anyhow. Tomorrow your body go remind you.");
    case "rest": bump(p, "stress", -8); bump(p, "health", 1.5); return T("A proper long sleep. The world looks softer.", "Proper long sleep. Life dey look soft now.");
    case "hobby": { bump(p, "happiness", 5); p.skills.music = clamp((p.skills.music ?? 0) + 2); return T("You lose track of time doing what you love.", "You forget time dey go as you dey do wetin you love."); }
  }
  return "";
}

export function gymBlock(p: Player): string | null {
  if (p.age < 15) return T("From age 15", "From age 15");
  return null;
}
export function toggleGym(p: Player): string {
  const has = p.subs.some((s) => s.id === "gym");
  if (has) { p.subs = p.subs.filter((s) => s.id !== "gym"); return T("You cancelled your gym membership.", "You cancel your gym membership."); }
  p.subs.push({ id: "gym", label: T("Gym membership", "Gym membership"), monthly: 15_000, category: "personal", since: monthIndex(p) });
  return T("You joined a gym. The monthly fee will be charged automatically.", "You join gym. Them go dey cut the monthly fee by themselves.");
}

export function growthMonth(p: Player) {
  if (p.subs.some((s) => s.id === "gym")) {
    bump(p, "fitness", 0.5);
    bump(p, "health", 0.1);
    bump(p, "stress", -0.2);
  }
  if (p.flags.weekendJob && p.age >= 13 && p.age <= 19) {
    transact(p, { amount: Math.round(8_000 * Math.pow(p.index, 0.92) * rand(0.8, 1.3)), reason: T("Weekend shop job", "Weekend shop work"), category: "salary", recurring: "weekend-job" });
  }
  if (p.flags.pension) {
    transact(p, { amount: Math.round(Number(p.flags.pensionAnnual ?? 0) / 12), reason: T("Pension payment", "Pension payment"), category: "salary", recurring: "pension" });
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
    title: dual("Trouble at school", "Wahala for school"),
    weight: (p) => (inSchool(p) && p.age >= 8 ? 1.8 : 0),
    text: () => T("An older boy keeps taking your lunch money and shoving you in the corridor. Other children laugh.", "One big boy dey always collect your lunch money and dey shove you for corridor. Other pikin dey laugh."),
    choices: () => [
      { label: T("Tell a teacher", "Report to teacher"), run: (q) => { if (chance(0.6)) { bump(q, "stress", -3); return T("The teacher punishes the bully. He leaves you alone for a while.", "Teacher punish the bully. E leave you alone for some time."); } bump(q, "reputation", -2); bump(q, "stress", 4); return T("The teacher shrugs. The bully gets angrier.", "Teacher no gree take am serious. The bully come vex pass."); } },
      { label: T("Tell your parents", "Tell your parent"), run: (q) => { const prov = primaryProvider(q); if (prov) { prov.closeness = clamp(prov.closeness + 2); } bump(q, "stress", -2); return T("Your parent goes to the school and has a word with the principal.", "Your parent go school go talk to the principal."); } },
      { label: T("Fight back", "Fight am back"), run: (q) => { if (chance(0.45 + q.stats.fitness / 300)) { bump(q, "reputation", 4); bump(q, "fitness", 1); return T("You stand your ground. The bully backs off, and so does everyone else.", "You hold your ground. The bully back down, everybody else too."); } bump(q, "health", -3); bump(q, "reputation", -2); return T("You lose the fight, but you went down swinging.", "You lose the fight, but you try well."); } },
      { label: T("Stay out of his way", "Avoid am"), run: (q) => { bump(q, "stress", 4); return T("You avoid the corridor and the lunch break. It is not a solution.", "You dey avoid corridor and break time. E no be solution."); } },
    ],
  },
  {
    id: "school_discipline",
    title: dual("Sent to the principal", "Dem send you go principal office"),
    weight: (p) => (inSchool(p) && p.age >= 10 ? 1.6 : 0),
    text: (p) => (p.possessions.phone ? T("A teacher catches you with a phone in class. The principal wants to see you and your parents.", "Teacher catch you with phone for class. Principal want see you and your parent.") : T("You are caught talking back in class. The principal wants to see you and your parents.", "Dem catch you dey talk back for class. Principal want see you and your parent.")),
    choices: () => [
      { label: T("Apologise and accept the punishment", "Beg and take the punishment"), run: (q) => { bump(q, "reputation", 1); bump(q, "stress", 2); return T("You kneel, apologise and get detention. The matter ends there.", "You kneel down, beg, and dem give you detention. Na so the matter end."); } },
      { label: T("Argue that it was unfair", "Argue say e no fair"), run: (q) => { const prov = primaryProvider(q); if (prov && prov.strictness > 55) prov.closeness = clamp(prov.closeness - 4); bump(q, "reputation", -2); return T("It escalates. Your parents are not pleased.", "The matter grow. Your parent no happy at all."); } },
    ],
  },
  {
    id: "report_card",
    title: dual("End-of-term results", "End-of-term results"),
    weight: (p) => (inSchool(p) && p.age >= 8 ? 2.4 : 0),
    text: () => T("Report cards are out. Everyone is comparing grades in the corridor.", "Report card don come out. Everybody dey compare grades for corridor."),
    choices: () => [
      { label: T("Open your report", "Open your report"), run: (q) => {
        const quality = q.flags.schoolType === "elite" ? 6 : q.flags.schoolType === "private" ? 3 : 0;
        const score = q.stats.smarts * 0.8 + quality + rand(-14, 14);
        const prov = primaryProvider(q);
        if (score >= 70) { if (prov) { prov.closeness = clamp(prov.closeness + 3); if (prov.generosity > 50) { transact(q, { amount: Math.round(I(q, 8_000)), reason: T(`Reward from ${first(prov.name)} for good results`, `Reward from ${first(prov.name)} for good results`), category: "gift" }); } } bump(q, "happiness", 4); return T("Excellent results! Your family is proud, and there might be a small reward.", "Wonderful results! Your family dey proud, and small reward fit land."); }
        if (score >= 45) return T("Decent results. Nothing to celebrate, nothing to hide.", "Okay-okay results. Nothing to celebrate, nothing to hide.");
        if (prov && prov.strictness > 60) { prov.closeness = clamp(prov.closeness - 2); bump(q, "stress", 5); return T("Poor results. The lecture at home lasts all evening.", "Results bad. Lecture for house go last the whole evening."); }
        bump(q, "stress", 3);
        return T("Poor results. Your parents ask what happened.", "Results bad. Your parent dey ask wetin happen.");
      } },
    ],
  },
  {
    id: "scholarship_offer",
    title: dual("A scholarship chance", "Scholarship chance"),
    weight: (p) => (p.stats.smarts >= 68 && p.fam.income < 15e6 && ((p.school?.stage === "secondary" && p.age >= 14) || p.school?.stage === "tertiary") && !p.flags.scholarship ? 3 : 0),
    text: () => T("A foundation is offering a scholarship for brilliant students who cannot easily afford school. The application needs an essay and an interview.", "One foundation dey offer scholarship for bright students wey no fit pay school fees easy. You go write essay and do interview."),
    choices: () => [
      { label: T("Apply seriously", "Apply well well"), run: (q) => { if (chance(clamp(0.2 + q.stats.smarts / 200 + luckBonus(q), 0.1, 0.8))) { q.flags.scholarship = true; if (!q.achievements.includes("Won a scholarship")) q.achievements.push("Won a scholarship"); return T("You win the scholarship! School fees are largely covered.", "You win the scholarship! Dem don cover most of your school fees."); } return T("You are shortlisted but not selected. Keep trying.", "Dem shortlist you but dem no pick you. Keep trying."); } },
      { label: T("Don't bother", "No bother"), run: () => T("You decide it is not for you.", "You decide say e no be for you.") },
    ],
  },
  {
    id: "weekend_job",
    title: dual("A weekend job", "Weekend work"),
    weight: (p) => (p.age >= 13 && p.age <= 17 && !p.flags.weekendJob && p.fam.income < 12e6 ? 2 : 0),
    text: () => T("A neighbour who owns a shop offers you a weekend job: sweeping, arranging goods and running errands.", "One neighbour wey get shop offer you weekend work: sweep, arrange goods and run errand."),
    choices: () => [
      { label: T("Take it", "Take am"), run: (q) => { q.flags.weekendJob = true; bump(q, "stress", 2); bump(q, "connections", 1); return T("You start on Saturdays. The money is small, but it is yours.", "You start work for Saturdays. The money small, but na your own."); } },
      { label: T("Focus on school", "Face your school"), run: (q) => { bump(q, "smarts", 1); return T("Studying comes first for now.", "Reading come first for now."); } },
    ],
  },
  {
    id: "trade_choice",
    title: dual("Choose a trade", "Choose trade"),
    weight: () => 0,
    text: () => T("Not everyone needs a degree. A good trade pays the bills, and a certificate opens doors.", "Not everybody need degree. Good trade dey pay bills, and certificate dey open door."),
    choices: () => [
      ...TRADES.map<Choice>((t) => ({ label: t.label, sub: T(`${t.years} year${t.years > 1 ? "s" : ""}`, `${t.years} year${t.years > 1 ? "s" : ""}`), run: (q) => enrollTrade(q, t.id) })),
      { label: T("Not now", "No now"), run: () => T("You decide to think about it.", "You decide to think am first.") },
    ],
  },
  {
    id: "learn_skill",
    title: dual("Learn something new", "Learn new thing"),
    weight: () => 0,
    text: () => T("A friend recommends a course that could change what you can do.", "One friend recommend course wey fit change wetin you fit do."),
    choices: () => [{ label: T("Maybe later", "Maybe later"), run: () => T("You keep it in mind.", "You keep am for mind.") }],
  },
  // -------- NPCs remember --------
  {
    id: "friend_remembers",
    title: dual("A friend has not forgotten", "Friend never forget"),
    weight: (p) => (Object.values(p.npcs).some((n) => n.alive && n.role === "friend" && n.memories.some((m) => m.tone === "bad" && p.age - m.age <= 4)) ? 1.8 : 0),
    init: (p) => {
      const f = pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend" && n.memories.some((m) => m.tone === "bad")));
      const m = f.memories.filter((x) => x.tone === "bad").slice(-1)[0];
      return { friendId: f.id, memory: m?.text ?? T("something you did", "something wey you do") };
    },
    text: (p, d) => T(
      `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} brings it up again: "I still remember when you ${String(d.memory).toLowerCase()}"`,
      `${first(p.npcs[String(d.friendId)]?.name ?? "Your friend")} bring am up again: "I still remember when you ${String(d.memory).toLowerCase()}"`,
    ),
    choices: (p, d) => [
      { label: T("Apologise and make it right", "Beg and make am right"), sub: naira(I(p, 25_000)), disabled: p.money < I(p, 25_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -I(q, 25_000), reason: T(`Making amends with ${first(n.name)}`, `Make peace with ${first(n.name)}`), category: "family" }); n.closeness = clamp(n.closeness + 8); n.trust = clamp(n.trust + 6); n.memories = n.memories.filter((m) => m.tone !== "bad"); remember(q, n, T("Made amends with you.", "Beg you and make peace with you."), "good"); return T("You say sorry and mean it. Things feel lighter.", "You beg and you mean am. Heart don light small."); } },
      { label: T("Brush it off", "Waka pass am"), run: (q) => { const n = q.npcs[String(d.friendId)]; n.closeness = clamp(n.closeness - 6); return T("The friendship cools noticeably.", "The friendship don cool well well."); } },
    ],
  },
  {
    id: "friend_wedding",
    title: dual("A friend is getting married", "Friend dey marry"),
    weight: (p) => (p.age >= 20 && Object.values(p.npcs).some((n) => n.alive && n.role === "friend" && n.closeness > 40) ? 2.2 : 0),
    init: (p) => ({ friendId: pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend")).id }),
    text: (p, d) => T(
      `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} is getting married and you are on the guest list. Aso-ebi money is due.`,
      `${first(p.npcs[String(d.friendId)]?.name ?? "Your friend")} dey marry and your name dey guest list. Aso-ebi money don due.`,
    ),
    choices: (p, d) => [
      { label: T("Attend with a generous gift", "Go with big gift"), sub: naira(I(p, 60_000)), disabled: p.money < I(p, 60_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -I(q, 60_000), reason: T(`Wedding gift and aso-ebi for ${first(n.name)}`, `Wedding gift and aso-ebi for ${first(n.name)}`), category: "social" }); n.closeness = clamp(n.closeness + 6); bump(q, "happiness", 5); bump(q, "connections", 2); return T("A beautiful day, a loud DJ, and enough jollof for everyone.", "Beautiful day, loud DJ, and jollof wey go reach everybody."); } },
      { label: T("Attend with a small gift", "Go with small gift"), sub: naira(I(p, 15_000)), run: (q) => { const n = q.npcs[String(d.friendId)]; transact(q, { amount: -Math.min(q.money, I(q, 15_000)), reason: T(`Wedding gift for ${first(n.name)}`, `Wedding gift for ${first(n.name)}`), category: "social" }); n.closeness = clamp(n.closeness + 2); return T("You show up and dance your heart out.", "You show face and dance anyhow."); } },
      { label: T("Send your regrets", "Send apology"), run: (q) => { const n = q.npcs[String(d.friendId)]; n.closeness = clamp(n.closeness - 5); remember(q, n, T("Missed your wedding.", "No come your wedding."), "bad"); return T("They say they understand. They don't.", "Dem talk say dem understand. Dem no understand."); } },
    ],
  },
  {
    id: "friend_success",
    title: dual("A friend makes it", "Friend don blow"),
    weight: (p) => (p.age >= 20 && Object.values(p.npcs).some((n) => n.alive && n.role === "friend") ? 1.2 : 0),
    init: (p) => ({ friendId: pick(Object.values(p.npcs).filter((n) => n.alive && n.role === "friend")).id }),
    text: (p, d) => T(
      `${first(p.npcs[String(d.friendId)]?.name ?? "A friend")} just landed a big break (a promotion, a contract, a visa). They want to celebrate with you.`,
      `${first(p.npcs[String(d.friendId)]?.name ?? "Your friend")} just land big breakthrough (promotion, contract, visa). E wan celebrate with you.`,
    ),
    choices: () => [
      { label: T("Celebrate with them", "Celebrate with am"), run: (q) => { bump(q, "happiness", 5); bump(q, "connections", 2); return T("You raise a glass. Their success might open a door for you too.", "You raise glass. Im success fit open door for you too."); } },
      { label: T("Feel a little jealous", "Dey envy small"), run: (q) => { bump(q, "stress", 3); return T("You smile for the photos and feel like you are falling behind.", "You smile for the photos but inside you feel say you dey fall behind."); } },
    ],
  },
  // -------- Military --------
  {
    id: "military_training",
    title: dual("Recruit training", "Recruit training"),
    weight: () => 0,
    text: () => T("Basic training is brutal: 4 a.m. wake-ups, drills in the sun and an instructor who never smiles.", "Basic training hard well: wake up 4 a.m., drill under sun and instructor wey no dey smile."),
    choices: () => [
      { label: T("Push yourself to the limit", "Push yourself reach limit"), run: (q) => { bump(q, "fitness", 8); bump(q, "stress", 8); if (chance(0.15)) q.flags.spawnCondition = "sprain"; delete q.flags.training; return T("You come out stronger, sharper and exhausted.", "You comot strong, sharp and tire pass."); } },
      { label: T("Do just enough to get through", "Do just enough to pass"), run: (q) => { bump(q, "fitness", 3); delete q.flags.training; return T("You graduate quietly with the pack.", "You graduate quietly with the rest."); } },
      { label: T("Desert", "Run comot"), run: (q) => { q.job = null; delete q.flags.training; bump(q, "reputation", -10); if (chance(0.4)) return enterPrison(q, 2); return T("You vanish from the barracks. They will be looking.", "You disappear from barracks. Dem go dey find you."); } },
    ],
  },
  {
    id: "deployment",
    title: dual("Deployment orders", "Deployment orders"),
    weight: (p) => (isMilitary(p) && !p.flags.training ? 2.2 : 0),
    text: () => {
      const place = pick([
        ["the North East", "North East"],
        ["the North West", "North West"],
        ["the Niger Delta", "Niger Delta"],
        ["a peacekeeping mission abroad", "peacekeeping mission abroad"],
      ] as const);
      return T(`Your unit is ordered to deploy to a troubled area of ${place[0]}.`, `Dem order your unit make e go troubled area for ${place[1]}.`);
    },
    choices: (p) => [
      { label: T("Go and do your duty", "Go do your duty"), run: (q) => { const hazard = chance(0.22); q.flags.tours = (Number(q.flags.tours) || 0) + 1; transact(q, { amount: Math.round(I(q, 450_000)), reason: T("Deployment allowance", "Deployment allowance"), category: "salary" }); bump(q, "reputation", 3); bump(q, "stress", 10); if (hazard) { q.flags.spawnCondition = chance(0.5) ? "gunshot" : "stab"; return T("You complete the tour, but you are hurt in an ambush.", "You finish the tour, but dem wound you for ambush."); } if (q.job && chance(0.35)) { q.job.years += 1; } return T("You return safely with a medal, a bonus and heavy memories.", "You return safe with medal, bonus and heavy memories."); } },
      { label: T("Seek an exemption", "Look for exemption"), sub: T("Needs connections", "E need connection"), disabled: p.stats.connections < 30 ? T("Not enough connections", "Connection no reach") : false, run: (q) => { bump(q, "reputation", -2); return T("A phone call from the right person keeps you in barracks.", "Phone call from correct person keep you for barracks."); } },
      { label: T("Refuse the order", "Refuse the order"), run: (q) => { q.job = null; bump(q, "reputation", -8); return enterPrison(q, 2); } },
    ],
  },
  {
    id: "retire_option",
    title: dual("Retirement from the service", "Retirement from service"),
    weight: (p) => (isMilitary(p) && p.job && p.job.years >= 20 ? 6 : 0),
    text: () => T("You have served twenty years. The service offers you retirement with a pension.", "You don serve twenty years. The service dey offer you retirement with pension."),
    choices: () => [
      { label: T("Retire with a pension", "Retire with pension"), run: (q) => { const j = q.job; q.flags.pension = true; q.flags.pensionAnnual = Math.round(1_800_000 * Math.pow(q.index, 0.9) * (1 + (j?.rank ?? 0) * 0.8)); q.job = null; return T("You hand in your uniform. A modest pension will arrive every month.", "You hand over your uniform. Small pension go dey enter every month."); } },
      { label: T("Serve a few more years", "Serve small more"), run: () => T("You stay on, for the rank and the discipline.", "You stay on, for the rank and the discipline.") },
    ],
  },
];

export function enlistBlock(p: Player): string | null {
  if (p.age < 18 || p.age > 30) return T("Recruits must be 18 to 30", "Recruit must dey 18 to 30");
  if (p.edu === "none" || p.edu === "primary") return T("Needs secondary education", "E need secondary school");
  if (p.stats.health < 50) return T("Health too low", "Health too low");
  if (p.stats.fitness < 30) return T("Fitness too low", "Fitness too low");
  if (isMilitary(p)) return T("Already serving", "You don dey service already");
  if (p.prison > 0) return T("In prison", "You dey prison");
  return null;
}

export const MILITARY_BRANCHES = { army: "soldier", navy: "navy", airforce: "airforce" } as const;
export const isMilitary = (p: Player) => Boolean(p.job && ["soldier", "navy", "airforce"].includes(p.job.id));

export function enlist(p: Player, branch: keyof typeof MILITARY_BRANCHES = "army"): { text: string; spawn: Pending[] } {
  const block = enlistBlock(p);
  if (block) return { text: block, spawn: [] };
  const pr = clamp(0.4 + p.stats.fitness / 250 + p.stats.smarts / 300 + p.stats.connections / 400 + luckBonus(p), 0.1, 0.9);
  if (!chance(pr)) return { text: T("Your recruitment application is not successful this time.", "Dem no accept your recruitment application this time."), spawn: [] };
  p.job = { id: MILITARY_BRANCHES[branch], rank: 0, years: 0 };
  p.flags.branch = branch;
  p.flags.training = 1;
  return { text: T("You are accepted into the army. Training begins.", "Dem accept you join army. Training don start."), spawn: [{ kind: "event", id: "military_training", data: { month: randInt(1, 12) } }] };
}
