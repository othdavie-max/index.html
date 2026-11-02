/**
 * The fun layer: Nigerian calendar seasons, press conferences, timed crisis rooms, quarterly cabinet rows, multi-month
 * story campaigns, titles the country gives you, and a satirical front page every month.
 * Templates are late-bound through events.ts like every other module.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState, Portfolio } from "./types";
import { addMod, calMonth, calYear, clamp, clamp100, jflag, monthLabel, nb, powerRatio, pushNews } from "./util";
import { createEvent } from "./spawn";
import { PROMISE_BY_ID } from "./promises";
import { earnPc } from "./meta";
import { overthrow } from "./power";

const money = (s: FixState, bn: number) => bn * (0.6 + 0.4 * s.eco.priceLevel / 100);
/** marker: the outcome does not depend on luck (the 3% "failure" roll gets the same result) */
const SAME = {};
const opt = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: (s: FixState) => number, cost = 0) => ({ id, label, explain, cost, tradeoff, unc: "medium" as const, chance, win, lose: lose === SAME ? win : lose, winText: "", loseText: "" });
const mod = (s: FixState, id: string, label: string, e: Effects, dur: number | null) => addMod(s, `fun:${id}`, label, e, { duration: dur, ramp: 1 });
const minister = (s: FixState, p: Portfolio) => s.cabinet.members[p];
const mname = (s: FixState, p: Portfolio, role: string) => minister(s, p)?.name ?? `the ${role} minister`;
const moodM = (s: FixState, p: Portfolio, d: number) => { const m = minister(s, p); if (m) m.mood = clamp100(m.mood + d); };
const rice = (s: FixState) => `₦${Math.round(90000 * s.eco.foodPriceIdx / 100).toLocaleString("en-NG")}`;

// ================================================================================================ 2. the calendar
export const ramadanMonth = (year: number) => (((2 - Math.round((year - 2025) * 11 / 30.4)) % 12) + 12) % 12;
const CAL_TEMPLATES = [
  { id: "calAfcon", kind: "opportunity" as const, urgency: 2, title: () => "AFCON: the Super Eagles need you", cause: () => "The Africa Cup of Nations kicks off. The coach says the players have not been paid their bonuses, and the whole country is watching.",
    options: [
      opt("big", "Pay everything and fly the fans out", "Bonuses, a charter jet and a presidential send-off.", "Costly, and you own the result.", { run: (s: FixState) => afcon(s, 0.42) }, { run: (s: FixState) => afcon(s, 0.42) }, () => 1, 18),
      opt("fair", "Pay the bonuses, nothing more", "Do the right thing quietly.", "Less hype.", { run: (s: FixState) => afcon(s, 0.3) }, { run: (s: FixState) => afcon(s, 0.3) }, () => 1, 6),
      opt("none", "The federation must sort itself out", "Save the money.", "If they lose, it is your fault.", { run: (s: FixState) => afcon(s, 0.14) }, { run: (s: FixState) => afcon(s, 0.14) }, () => 1),
    ], expire: { run: (s: FixState) => afcon(s, 0.14) }, expireText: () => "You said nothing and the team flew off unpaid." },
  { id: "calJamb", kind: "scandal" as const, urgency: 2, title: () => "Exam season: the JAMB results scandal", cause: () => "Thousands of students say their scores were changed. A leaked video shows officials selling 'upgrades' for ₦50,000.",
    options: [
      opt("retake", "Order a free retake for everyone affected", "Fair, slow and expensive.", "Costs money; students wait.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); s.groupMood.youth = clamp(s.groupMood.youth + 4, -40, 40); return "The retake was clean. Parents exhaled."; } }, { run: (s: FixState) => { s.groupMood.youth = clamp(s.groupMood.youth - 2, -40, 40); return "The retake had its own leaks. Twitter was merciless."; } }, () => 0.65, 12),
      opt("sack", "Sack the exam board and prosecute", "Heads roll on live television.", "The real network survives.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2.5); s.gov.corruption = clamp100(s.gov.corruption - 0.8); return "The board was dissolved and three officials were charged."; } }, { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 1); return "The case collapsed for lack of evidence."; } }, () => 0.55),
      opt("deny", "Say the results are valid", "Defend the institution.", "If it is true, you are complicit.", { run: () => "The story faded. Some students never got answers." }, { run: (s: FixState) => { s.groupMood.youth = clamp(s.groupMood.youth - 6, -40, 40); s.gov.trust = clamp100(s.gov.trust - 3); return "More videos leaked. #JAMBMustGo trended for a week."; } }, () => 0.35),
    ], expire: { run: (s: FixState) => { s.groupMood.youth = clamp(s.groupMood.youth - 4, -40, 40); return "You stayed silent and students marched."; } }, expireText: () => "You stayed silent." },
];
function afcon(s: FixState, p: number): string {
  const win = (Number(s.flags.afconRoll ?? 0.5)) < p; s.flags.afconAt = s.month;
  if (win) { s.flags.afconWin = s.month; mod(s, "afcon", "AFCON champions", { happiness: 5 }, 3); s.gov.trust = clamp100(s.gov.trust + 3); earnPc(s, 3); pushNews(s, { source: `afcon:${s.month}`, headline: "SUPER EAGLES ARE CHAMPIONS OF AFRICA!", body: "The streets explode in green and white. For one week, nobody mentions the price of rice.", tone: "good" }); return "The Super Eagles won AFCON! Lagos did not sleep for three days, and nobody is angry with you this month."; }
  mod(s, "afconl", "AFCON heartbreak", { happiness: -1.5 }, 1); pushNews(s, { source: `afcon:${s.month}`, headline: "Super Eagles crash out of AFCON", body: "Penalties, again. The nation mourns and the memes begin.", tone: "bad" });
  return "The Super Eagles went out on penalties. The nation is in mourning, and some people blame you.";
}
function calendarMonthly(s: FixState, rng: Rng) {
  const cm = calMonth(s.month), y = calYear(s.month), key = `${y}-${cm}`;
  if (s.flags.calDone === key) return; s.flags.calDone = key;
  if (cm === 11) { // Detty December
    mod(s, `detty${y}`, "Detty December", { happiness: 1.5, inflation: 0.25 }, 1); s.fin.treasury += money(s, 8);
    const queues = (s.fuel.importShare ?? 0) > 0.5 || (s.oil.scarcity ?? 0) > 20;
    pushNews(s, { source: `detty:${y}`, headline: queues ? "Detty December meets Christmas fuel queues" : "Detty December: the diaspora is home", body: queues ? "Owambe outfits ready, but the queue at the filling station is three kilometres long." : "Flights are full, Lagos traffic is legendary, and every hall is booked for weddings. Prices climb with the party.", tone: queues ? "bad" : "good" });
    if (queues) mod(s, `xmasq${y}`, "Christmas fuel queues", { happiness: -1.5, transport: 2 }, 1);
  }
  if (cm === ramadanMonth(y)) { mod(s, `ramadan${y}`, "Ramadan food demand", { foodPrice: 2 }, 1); pushNews(s, { source: `ramadan:${y}`, headline: "Ramadan begins: food prices climb in northern markets", body: "Families break the fast together, and traders raise the price of dates, rice and sugar.", tone: "neutral" }); }
  if (cm === (ramadanMonth(y) + 1) % 12) pushNews(s, { source: `sallah:${y}`, headline: "Sallah celebrations across the north", body: "Durbar horses, new clothes and ram markets. A good month for traders.", tone: "good" });
  if (cm === 6) { const dams = s.projects.filter((p) => p.defId === "dams" && p.status === "done").length; pushNews(s, { source: `rains:${y}`, headline: dams ? "Rainy season arrives, and the new dams are holding" : "Rainy season arrives: river states brace for floods", body: dams ? "Engineers say the reservoirs are doing their job." : "Benue, Kogi and the Delta are watching the rivers rise.", tone: dams ? "good" : "bad" }); if (!dams) mod(s, `rains${y}`, "Flood season", { foodSupply: -1 }, 3); }
  if (cm === 9) pushNews(s, { source: `oct1:${y}`, headline: `Independence Day: ${y - 1960} years of Nigeria`, body: "Parades in Abuja, jollof in every compound, and the usual debate about what independence means.", tone: "neutral" });
  if (cm === 4 && s.month >= 6) createEvent(s, "calJamb", "NG-FC");
  if (cm === 0 && y % 2 === 0 && s.flags.afconAt !== s.month) { s.flags.afconRoll = rng.next(); createEvent(s, "calAfcon", "NG-LA"); }
}

// ================================================================================================ 3. press conferences
interface Q { topic: string; text: string; truth: boolean }
function question(s: FixState): Q {
  const broken = s.promises.map((id) => PROMISE_BY_ID[id]).filter((p) => p && !p.kept(s) && p.progress(s) < 0.5);
  const qs: (Q & { w: number })[] = [];
  if (broken.length) qs.push({ topic: "promise", text: `"You promised to ${broken[0].short.toLowerCase()}. It is ${monthLabel(s.month)}. Where is it, Mr President?"`, truth: true, w: 3 });
  if (s.me.evidence > 30) qs.push({ topic: "scandal", text: `"Documents suggest people close to you are getting rich. Are you protecting thieves?"`, truth: true, w: 3 });
  if (s.eco.foodInflation > 25) qs.push({ topic: "prices", text: `"A bag of rice is now ${rice(s)}. Do you know what ordinary Nigerians are going through?"`, truth: true, w: 2 });
  if (s.fuel.pump > 900) qs.push({ topic: "fuel", text: `"Petrol is ₦${Math.round(s.fuel.pump)} a litre. When does this end?"`, truth: true, w: 2 });
  if (s.sec.index > 55) qs.push({ topic: "security", text: `"Farmers cannot reach their farms. Is the north still part of your plans?"`, truth: true, w: 2 });
  qs.push({ topic: "record", text: `"Some numbers are improving. Critics say it is luck. What is your plan for the next year?"`, truth: false, w: 1 });
  qs.sort((a, b) => b.w - a.w);
  return qs[0];
}
const pq = (s: FixState): Q => jflag<Q>(s, "pressQ", { topic: "record", text: "", truth: false });
const PRESS_TEMPLATES = [
  { id: "pressConf", kind: "moment" as const, urgency: 2, title: () => "Press conference at the Villa", cause: (s: FixState) => `The cameras are rolling and the first hand goes up. ${pq(s).text}`,
    onCreate: (s: FixState) => { s.flags.pressQ = JSON.stringify(question(s)); },
    options: [
      opt("honest", "Answer honestly", "Admit what is wrong, explain what you are doing.", "Honesty is rare, which is why it works, unless your record is very bad.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2.5); s.gov.approval = clamp(s.gov.approval + 1, 0, 100); return "A straight answer. Even hostile columnists called it refreshing."; } }, { run: (s: FixState) => { s.gov.approval = clamp(s.gov.approval - 1, 0, 100); return "Honest, but the follow-up questions were brutal and the clip went viral for the wrong reasons."; } }, (s) => clamp(0.7 - s.me.evidence / 200, 0.3, 0.8)),
      opt("dodge", "Talk around it", "Statistics, long sentences, a story about your childhood.", "Nobody is fooled for long.", { run: () => "You survived the question. Nobody remembers the answer." }, { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 1.5); return "\"He did not answer the question\" became the headline."; } }, () => 0.5),
      opt("blame", "Blame the last government", "They left the mess. True, but how long can you say it?", "Works early in a term, backfires later.", { run: (s: FixState) => { s.gov.approval = clamp(s.gov.approval + 1, 0, 100); return "The room nodded. People still remember who left the potholes."; } }, { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 2.5); return "\"You have been here for years. Stop blaming others,\" said the next reporter, to applause."; } }, (s) => (s.month - s.termStart < 18 ? 0.65 : 0.2)),
      opt("attack", "Attack the journalist", "\"Which newspaper are you from? Who pays you?\"", "Loyalists cheer; press freedom suffers.", { run: (s: FixState) => { s.rule.pressFreedom = clamp100(s.rule.pressFreedom - 2); s.groupMood.faith = clamp(s.groupMood.faith + 1, -40, 40); return "Your base loved it. Journalists' unions issued a statement."; } }, { run: (s: FixState) => { s.rule.pressFreedom = clamp100(s.rule.pressFreedom - 3); s.gov.trust = clamp100(s.gov.trust - 2); s.rule.intlPressure = clamp100(s.rule.intlPressure + 1.5); return "The clip went around the world. Embassies asked questions."; } }, () => 0.4),
    ], expire: { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 1); return "You cancelled the press conference. 'What is he hiding?' asked every paper."; } }, expireText: () => "You cancelled." },
];

// ================================================================================================ 4. crisis rooms (timed in the UI)
export const CRISIS_SECONDS = 20;
/** a fumbled coup night succeeds when the regime has no legitimacy left to fall back on */
const coupWins = (s: FixState) => s.rule.coupRisk >= 40 && s.rule.democracy < 30;
const CRISIS_TEMPLATES = [
  { id: "crisisCoup", kind: "power" as const, urgency: 5, title: () => "⏱️ CRISIS: tanks near the Villa", cause: () => "3:12 a.m. Armoured vehicles are moving toward Aso Rock. Your guard commander is on the line. You have seconds.",
    options: [
      opt("guard", "Order the Guards Brigade to block the roads", "Trust your own soldiers.", "If they waver, it is over.", { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk - 6); s.gov.trust = clamp100(s.gov.trust + 2); return "The Guards held. By dawn the tanks were back in barracks and the ringleaders were in custody."; } }, { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 10); s.gov.approval = clamp(s.gov.approval - 4, 0, 100); if (coupWins(s)) return overthrow(s, "coup"); return "Some units hesitated. The plotters were stopped, but only just."; } }, (s) => clamp(0.5 + (40 - s.rule.coupRisk) / 100 + s.groupMood.military / 100 - (s.rule.democracy < 40 ? 0.15 : 0), 0.15, 0.85)),
      opt("tv", "Go live on television and call people out", "Let the people protect democracy.", "Brave. Risky.", { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk - 6); s.rule.democracy = clamp100(s.rule.democracy + 3); s.gov.trust = clamp100(s.gov.trust + 4); return "Crowds filled the streets in their pyjamas. The soldiers did not fire. History will remember tonight."; } }, { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 8); s.rule.streetAnger = clamp100(s.rule.streetAnger + 6); return "The broadcast cut out halfway. Confusion reigned until morning."; } }, (s) => clamp(0.35 + s.gov.approval / 150, 0.2, 0.85)),
      opt("freeze", "Wait for more information", "Do not act on a rumour.", "Waiting is also a decision.", { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 4); return "It was an exercise nobody told you about. Your hesitation is now a joke in the officers' mess."; } }, { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 18); s.gov.approval = clamp(s.gov.approval - 6, 0, 100); if (coupWins(s)) return overthrow(s, "coup"); return "You waited too long. The plotters got further than anyone thought possible before loyal units stopped them."; } }, () => 0.3),
    ], expire: { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 15); return "Nobody gave an order."; } }, expireText: () => "Nobody gave an order." },
  { id: "crisisBomb", kind: "insecurity" as const, urgency: 5, title: () => "⏱️ CRISIS: bomb threat at a packed stadium", cause: () => "Sixty thousand people are inside for a match. Intelligence says a device may be in the stands. Evacuate and risk a stampede, or search quietly?",
    options: [
      opt("evac", "Evacuate now", "Stop the match and clear the stands.", "A stampede is possible.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); return "The stands emptied in eighteen minutes. A device was found under seat block F. Nobody died."; } }, { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 2); s.gov.happiness = clamp100(s.gov.happiness - 2); return "The evacuation turned into a crush at Gate 4. Dozens were hurt, and the threat was a hoax."; } }, () => 0.62),
      opt("search", "Search quietly with sniffer dogs", "Avoid panic.", "If they miss it…", { run: () => "The dogs found it within ten minutes. The crowd never knew." }, { run: (s: FixState) => { s.sec.index = clamp100(s.sec.index + 4); s.gov.trust = clamp100(s.gov.trust - 4); return "The device went off before it was found. The nation is in mourning."; } }, (s) => clamp(0.4 + (100 - s.sec.index) / 250, 0.3, 0.75)),
      opt("freeze", "Wait for confirmation", "It may be a hoax.", "Every second counts.", { run: () => "It was a hoax. You got lucky." }, { run: (s: FixState) => { s.sec.index = clamp100(s.sec.index + 6); s.gov.trust = clamp100(s.gov.trust - 6); return "It was not a hoax."; } }, () => 0.35),
    ], expire: { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 4); return "Nobody gave an order."; } }, expireText: () => "Nobody gave an order." },
  { id: "crisisCrash", kind: "global" as const, urgency: 5, title: () => "⏱️ CRISIS: the naira is crashing right now", cause: () => "Rumours of a devaluation are spreading on WhatsApp. The naira has lost 9% since breakfast. The central bank governor needs an answer before markets close.",
    options: [
      opt("defend", "Sell dollars hard and deny the rumour", "Show the market you have the reserves.", "Costs reserves.", { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 2); return "The naira bounced back by closing time. The speculators lost money."; } }, { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 4); s.eco.fx *= 1.06; return "You spent billions and the naira still fell."; } }, (s) => (s.eco.reserves > 25 ? 0.75 : 0.4)),
      opt("calm", "Go on air and explain calmly", "No panic, no devaluation, here are the facts.", "Words versus markets.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 1.5); return "Your calm worked. The panic faded by evening."; } }, { run: (s: FixState) => { s.eco.fx *= 1.05; return "Nobody listened to the speech. They were watching the rate."; } }, (s) => clamp(0.35 + s.gov.trust / 150, 0.25, 0.8)),
      opt("freeze", "Wait until tomorrow", "Markets overreact.", "Panic feeds on silence.", { run: () => "The rate drifted back overnight. Lucky." }, { run: (s: FixState) => { s.eco.fx *= 1.12; s.eco.investor = clamp100(s.eco.investor - 4); return "Silence fed the panic. The naira lost 12% in two days."; } }, () => 0.3),
    ], expire: { run: (s: FixState) => { s.eco.fx *= 1.1; return "Nobody gave an order."; } }, expireText: () => "Nobody gave an order." },
];

// ================================================================================================ 7. the cabinet meeting
const CABINET_TEMPLATES = [
  { id: "cabinetMeeting", kind: "moment" as const, urgency: 2, title: () => "Quarterly cabinet meeting: the room is arguing", cause: (s: FixState) => `${mname(s, "finance", "finance")} (Finance) wants cuts: "We are spending like it is 2008." ${mname(s, "power", "power")} (Power) wants ${nb(money(s, 60))} for the grid. ${mname(s, "security", "security")} (Security) wants the same for the army. Everyone looks at you.`,
    options: [
      opt("finance", "Side with Finance: tighten the belt", "Freeze new spending for a quarter.", "Power and Security ministers sulk.", { run: (s: FixState) => { s.fin.treasury += money(s, 40); moodM(s, "finance", 10); moodM(s, "power", -10); moodM(s, "security", -10); mod(s, "cabcut", "Spending freeze", { capacity: -0.5 }, 3); return `${mname(s, "finance", "finance")} smiled for the first time this year. The other two left early.`; } }, SAME, () => 1),
      opt("power", "Side with Power: fund the grid", "More megawatts, sooner.", "Costly; Finance is unhappy.", { run: (s: FixState) => { s.fin.treasury -= money(s, 60); moodM(s, "power", 12); moodM(s, "finance", -8); mod(s, "cabpow", "Cabinet grid push", { power: 1.5, grid: 1 }, 12); return `${mname(s, "power", "power")} promised results by the rainy season. Finance muttered about the deficit.`; } }, SAME, () => 1),
      opt("security", "Side with Security: fund the army", "Boots, trucks and drones.", "Costly; Finance is unhappy.", { run: (s: FixState) => { s.fin.treasury -= money(s, 60); moodM(s, "security", 12); moodM(s, "finance", -8); mod(s, "cabsec", "Cabinet security push", { security: 1.5, forces: 1 }, 12); return `${mname(s, "security", "security")} saluted. The generals will hear about this.`; } }, SAME, () => 1),
      opt("split", "Split the difference", "A little for everyone, a lot for nobody.", "Nobody is thrilled.", { run: (s: FixState) => { s.fin.treasury -= money(s, 25); for (const p of ["finance", "power", "security"] as Portfolio[]) moodM(s, p, 2); mod(s, "cabsplit", "Cabinet compromise", { power: 0.5, security: 0.5 }, 6); return "A compromise. Everyone left with something, and complained about it in the car park."; } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => { for (const p of ["finance", "power", "security"] as Portfolio[]) moodM(s, p, -4); return "You skipped the meeting. The ministers noticed."; } }, expireText: () => "You skipped it." },
];

// ================================================================================================ 6. story campaigns
export interface Campaign { id: string; icon: string; name: string; blurb: string; titleWin: string }
export const CAMPAIGNS: Campaign[] = [
  { id: "oil", icon: "🛢️", name: "The Oil Cartel", blurb: "Somebody is stealing crude by the tanker-load, and they have friends in high places.", titleWin: "cartelBreaker" },
  { id: "billions", icon: "💼", name: "The Missing Billions", blurb: "Two billion dollars vanished before you took office. Following the money leads somewhere uncomfortable.", titleWin: "billionHunter" },
  { id: "plot", icon: "🎖️", name: "The General's Plot", blurb: "A group of officers is meeting at night. Are they loyal, or counting days?", titleWin: "coupProof" },
  { id: "gov", icon: "👑", name: "The Prodigal Governor", blurb: "A rich, popular governor is building his own army, and his own ambitions.", titleWin: "kingmaker" },
];
const cstep = (s: FixState, id: string) => Number(s.flags[`camp:${id}`] ?? 0);
const choice = (s: FixState, id: string, step: number) => String(s.flags[`campC:${id}:${step}`] ?? "");
function advance(s: FixState, id: string, step: number, c: string, text: string) {
  s.flags[`campC:${id}:${step}`] = c;
  if (step >= 3) { s.flags[`camp:${id}`] = 4; s.flags[`campEnd:${id}`] = s.month; delete s.flags.campActive; s.flags.campCd = s.month + 8; s.timeline.push({ month: s.month, title: `Story ended: ${CAMPAIGNS.find((x) => x.id === id)!.name}`, text, tone: "neutral", chain: "campaign" }); }
  else { s.flags[`camp:${id}`] = step + 1; s.flags.campNext = s.month + 3; }
  return text;
}
const win = (s: FixState, id: string) => { const c = CAMPAIGNS.find((x) => x.id === id)!; s.flags[`title:${c.titleWin}`] = s.month; earnPc(s, 5); };
const CAMP_TEMPLATES = [
  // ---------------- The Oil Cartel
  { id: "camp_oil_1", kind: "story" as const, urgency: 3, title: () => "📖 The Oil Cartel · 1/3: a phantom terminal", cause: () => "A navy captain sends you a satellite photo: tankers loading at a terminal that does not exist on any map. Forty thousand barrels a day are disappearing.",
    options: [
      opt("quiet", "Investigate quietly", "Follow the money before you strike.", "Slow.", { run: (s: FixState) => advance(s, "oil", 1, "quiet", "Your investigators start tracing the tankers' owners.") }, SAME, () => 1),
      opt("raid", "Raid it tonight", "Show strength now.", "The big fish may escape.", { run: (s: FixState) => { s.oil.theft = Math.max(0, s.oil.theft - 15); return advance(s, "oil", 1, "raid", "The raid seized two tankers. The owners vanished overnight."); } }, SAME, () => 1),
      opt("cut", "Ask what's in it for you", "Every cartel pays somebody.", "You become part of it.", { run: (s: FixState) => { s.me.wealth += 60; s.me.evidence = clamp100(s.me.evidence + 8); return advance(s, "oil", 1, "cut", "A briefcase arrives at the Villa. You are now a silent partner."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "oil", 1, "quiet", "You did nothing, and the tankers kept loading.") }, expireText: () => "" },
  { id: "camp_oil_2", kind: "story" as const, urgency: 3, title: () => "📖 The Oil Cartel · 2/3: the senator", cause: (s: FixState) => choice(s, "oil", 1) === "cut" ? "Your 'partners' want more protection: a senator who runs the cartel asks you to transfer the navy captain who found them." : "The money trail leads to Senator Bassey Okon, chairman of the oil committee and a member of your own party. He asks for a private meeting.",
    options: [
      opt("arrest", "Arrest him", "No one is above the law.", "Your party will be furious.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 3); s.assembly.support = clamp(s.assembly.support - 4, 0, 100); return advance(s, "oil", 2, "arrest", "The senator is in custody. Half your party stopped returning calls."); } }, SAME, () => 1),
      opt("deal", "Make a deal", "He gives up the network; you give him a quiet exit.", "Justice, half-served.", { run: (s: FixState) => { s.oil.theft = Math.max(0, s.oil.theft - 10); return advance(s, "oil", 2, "deal", "He named twelve names and kept his mansion."); } }, SAME, () => 1),
      opt("protect", "Protect him and transfer the captain", "Party loyalty first.", "The captain will not stay quiet.", { run: (s: FixState) => { s.me.evidence = clamp100(s.me.evidence + 10); return advance(s, "oil", 2, "protect", "The captain was sent to a desk job in Sokoto. He kept copies."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "oil", 2, "protect", "You never took the meeting. He took that as protection.") }, expireText: () => "" },
  { id: "camp_oil_3", kind: "story" as const, urgency: 3, title: () => "📖 The Oil Cartel · 3/3: the showdown", cause: (s: FixState) => choice(s, "oil", 2) === "protect" ? "The navy captain has gone to the press with everything, including your name. The country waits for your response." : "The network is exposed. Now the question is what Nigeria sees: justice, or a deal in the dark.",
    options: [
      opt("trial", "A televised trial, whoever falls", "Let the cameras in.", "If your own name comes up…", { run: (s: FixState) => { const dirty = choice(s, "oil", 1) === "cut" || choice(s, "oil", 2) === "protect"; if (dirty) { s.me.evidence = clamp100(s.me.evidence + 15); s.gov.trust = clamp100(s.gov.trust - 6); return advance(s, "oil", 3, "trial", "The trial was riveting, especially when the defence produced a photo of your briefcase."); } s.gov.trust = clamp100(s.gov.trust + 6); s.oil.theft = Math.max(0, s.oil.theft - 20); win(s, "oil"); return advance(s, "oil", 3, "trial", "Guilty on all counts. Oil theft collapsed. The country has a new nickname for you: Cartel Breaker."); } }, SAME, () => 1),
      opt("exile", "Quiet exile for the ringleaders", "No mess, no trial.", "Nobody believes it is over.", { run: (s: FixState) => { s.oil.theft = Math.max(0, s.oil.theft - 8); return advance(s, "oil", 3, "exile", "The ringleaders flew to Dubai. Theft dropped, for now."); } }, SAME, () => 1),
      opt("bury", "Bury it", "Deny everything; call it fake news.", "The story never dies.", { run: (s: FixState) => { s.me.evidence = clamp100(s.me.evidence + 12); s.gov.trust = clamp100(s.gov.trust - 5); return advance(s, "oil", 3, "bury", "You called it fake news. Naija X called it something else."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "oil", 3, "bury", "You said nothing. It looked like guilt.") }, expireText: () => "" },
  // ---------------- The Missing Billions
  { id: "camp_billions_1", kind: "story" as const, urgency: 3, title: () => "📖 The Missing Billions · 1/3: a hole in the books", cause: () => "The central bank's new auditor found a gap: $2 billion paid to 'consultants' in the final month of the last government.",
    options: [
      opt("audit", "Hire forensic auditors", "Find out where it went.", "Costs money; takes months.", { run: (s: FixState) => advance(s, "billions", 1, "audit", "A team of forensic accountants moves into the central bank.") }, SAME, () => 1, 10),
      opt("blame", "Announce it publicly and blame them", "Political points now.", "Warns the thieves.", { run: (s: FixState) => { s.gov.approval = clamp(s.gov.approval + 2, 0, 100); return advance(s, "billions", 1, "blame", "The country was outraged. Somewhere, a lot of documents were shredded."); } }, SAME, () => 1),
      opt("ignore", "Let it go: we need to look forward", "No witch-hunts.", "The money stays gone.", { run: (s: FixState) => advance(s, "billions", 1, "ignore", "You let it go. The money stays gone, for now.") }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "billions", 1, "ignore", "The file gathered dust.") }, expireText: () => "" },
  { id: "camp_billions_2", kind: "story" as const, urgency: 3, title: () => "📖 The Missing Billions · 2/3: too close to home", cause: (s: FixState) => choice(s, "billions", 1) === "ignore" ? "A journalist found the hole anyway, and traced the money to your own party chairman." : "The trail leads to your own party chairman, the man who ran your campaign.",
    options: [
      opt("expose", "Expose him", "Party or country? Country.", "The party may split.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 4); s.party.oldguard = clamp100(s.party.oldguard - 12); return advance(s, "billions", 2, "expose", "You named him at a press conference. The old guard will never forgive you."); } }, SAME, () => 1),
      opt("bargain", "Make him return it privately", "Get the money back, keep the peace.", "Nobody sees justice done.", { run: (s: FixState) => { s.fin.treasury += money(s, 120); return advance(s, "billions", 2, "bargain", "Some money came back in unmarked transfers. The chairman kept his seat."); } }, SAME, () => 1),
      opt("protect", "Protect him", "He made you president.", "Now you are part of the story.", { run: (s: FixState) => { s.me.evidence = clamp100(s.me.evidence + 10); s.party.oldguard = clamp100(s.party.oldguard + 6); return advance(s, "billions", 2, "protect", "The old guard toasted you. The journalist kept digging."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "billions", 2, "protect", "Silence counted as protection.") }, expireText: () => "" },
  { id: "camp_billions_3", kind: "story" as const, urgency: 3, title: () => "📖 The Missing Billions · 3/3: the Dubai account", cause: () => "The money has been found: most of it sits in a bank account in Dubai. Getting it back needs diplomacy, lawyers and nerve.",
    options: [
      opt("repatriate", "Fight to bring it home", "Lawyers, diplomats, and patience.", "Needs good foreign relations.", { run: (s: FixState) => { const ok = s.foreign.rel.usa + s.foreign.rel.imf > 100 && choice(s, "billions", 2) !== "protect"; if (ok) { s.fin.treasury += money(s, 900); s.ledger.recovered += 900; s.gov.trust = clamp100(s.gov.trust + 5); win(s, "billions"); return advance(s, "billions", 3, "repatriate", "The money came home and went into schools and hospitals. Nigerians call you the Billion Hunter."); } return advance(s, "billions", 3, "repatriate", "The courts stalled for years. Only a fraction came back."); } }, SAME, () => 1),
      opt("auction", "Sell the assets bought with it", "Mansions, jets, a football club.", "Quick, but only part of it.", { run: (s: FixState) => { s.fin.treasury += money(s, 300); return advance(s, "billions", 3, "auction", "A London mansion and two private jets were sold. Part of the money is back."); } }, SAME, () => 1),
      opt("keep", "Let some of it 'disappear' again", "Nobody is watching closely.", "This is how it started last time.", { run: (s: FixState) => { s.me.wealth += 200; s.me.evidence = clamp100(s.me.evidence + 15); return advance(s, "billions", 3, "keep", "Some of the money found a new home. History has a sense of humour."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "billions", 3, "auction", "Lawyers sold what they could.") }, expireText: () => "" },
  // ---------------- The General's Plot
  { id: "camp_plot_1", kind: "story" as const, urgency: 3, title: () => "📖 The General's Plot · 1/3: night meetings", cause: () => "Intelligence says a group of colonels meets every Thursday at a farm outside Kaduna. They complain about pay, promotions and 'the direction of the country'.",
    options: [
      opt("talk", "Meet them and listen", "Most grievances are about pay.", "They may see it as weakness.", { run: (s: FixState) => { s.groupMood.military = clamp(s.groupMood.military + 5, -40, 40); return advance(s, "plot", 1, "talk", "You heard them out. Some of them meant it. Some did not."); } }, SAME, () => 1),
      opt("purge", "Retire them all", "Cut it off at the root.", "Purges create enemies.", { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk - 6); s.groupMood.military = clamp(s.groupMood.military - 6, -40, 40); return advance(s, "plot", 1, "purge", "Eleven colonels were retired. The barracks went very quiet."); } }, SAME, () => 1),
      opt("watch", "Watch and wait", "Let them show their hand.", "Dangerous.", { run: (s: FixState) => advance(s, "plot", 1, "watch", "Your agents bugged the farmhouse.") }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "plot", 1, "watch", "Nobody acted.") }, expireText: () => "" },
  { id: "camp_plot_2", kind: "story" as const, urgency: 3, title: () => "📖 The General's Plot · 2/3: the vice president", cause: (s: FixState) => choice(s, "plot", 1) === "watch" ? "The recordings are clear: the plotters have approached your vice president. He has not said no." : "The plotters have a new friend: your vice president was seen at the farm.",
    options: [
      opt("confront", "Confront the vice president", "Face to face, tonight.", "He may deny everything.", { run: (s: FixState) => { s.party.vpAmbition = Math.max(0, s.party.vpAmbition - 20); return advance(s, "plot", 2, "confront", "He broke down and told you everything. He is still VP, but he knows you know."); } }, SAME, () => 1),
      opt("trap", "Set a trap", "Feed them false information and wait.", "If it fails, they move first.", { run: (s: FixState) => advance(s, "plot", 2, "trap", "Fake plans for a military reshuffle were leaked to the farmhouse.") }, SAME, () => 1),
      opt("buy", "Buy their loyalty", "Promotions and contracts for everyone.", "Expensive, and it never ends.", { run: (s: FixState) => { s.fin.treasury -= money(s, 40); s.rule.coupRisk = clamp100(s.rule.coupRisk - 5); return advance(s, "plot", 2, "buy", "Everyone got a promotion. Loyalty, for now, has a price tag."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "plot", 2, "trap", "You waited.") }, expireText: () => "" },
  { id: "camp_plot_3", kind: "story" as const, urgency: 4, title: () => "📖 The General's Plot · 3/3: coup night", cause: () => "It is happening. Radio stations in Kaduna have gone silent. A column is moving south. Your loyal commanders want orders.",
    options: [
      opt("stand", "Stand and fight with loyal units", "You are the commander-in-chief.", "Depends on who is loyal.", { run: (s: FixState) => { const ok = choice(s, "plot", 2) === "trap" || choice(s, "plot", 1) === "purge" || s.rule.coupRisk < 40; if (ok) { s.rule.coupRisk = clamp100(s.rule.coupRisk - 10); win(s, "plot"); return advance(s, "plot", 3, "stand", "The column was surrounded before it reached Abuja. The plotters surrendered at dawn. Nobody will try that again: you are Coup Proof."); } s.rule.coupRisk = clamp100(s.rule.coupRisk + 15); s.gov.approval = clamp(s.gov.approval - 6, 0, 100); return advance(s, "plot", 3, "stand", "The fighting lasted two days. You survived, barely, and the army is split."); } }, SAME, () => 1),
      opt("people", "Call the people into the streets", "Democracy defends itself.", "Lives at risk.", { run: (s: FixState) => { s.rule.democracy = clamp100(s.rule.democracy + 4); s.rule.coupRisk = clamp100(s.rule.coupRisk - 6); return advance(s, "plot", 3, "people", "Millions came out. The soldiers would not fire on their own people. The coup collapsed by noon."); } }, SAME, () => 1),
      opt("negotiate", "Negotiate with the plotters", "Avoid bloodshed at any cost.", "They will want something big.", { run: (s: FixState) => { s.rule.democracy = clamp100(s.rule.democracy - 4); s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty - 4); return advance(s, "plot", 3, "negotiate", "No shots were fired. The generals got ministries. You got to stay."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk + 20); return advance(s, "plot", 3, "negotiate", "Loyal units acted without orders. You survived, owing them everything."); } }, expireText: () => "" },
  // ---------------- The Prodigal Governor
  { id: "camp_gov_1", kind: "story" as const, urgency: 3, title: () => "📖 The Prodigal Governor · 1/3: a private army", cause: () => "Governor Emeka 'Ikemba' Nwosu has built schools, roads and a 4,000-strong 'state security outfit' with uniforms that look very military.",
    options: [
      opt("fund", "Fund his security outfit", "If it works, copy it.", "You arm a rival.", { run: (s: FixState) => { s.sec.index = Math.max(0, s.sec.index - 2); return advance(s, "gov", 1, "fund", "His outfit grew to 9,000 and crime in his state fell. People noticed who paid."); } }, SAME, () => 1, 15),
      opt("probe", "Investigate where his money comes from", "Nobody builds that much honestly.", "He will fight back.", { run: (s: FixState) => advance(s, "gov", 1, "probe", "The anti-graft agency opened a file. The governor opened a newspaper.") }, SAME, () => 1),
      opt("ignore", "Leave him alone", "He is doing good work.", "Ambition grows in silence.", { run: (s: FixState) => advance(s, "gov", 1, "ignore", "He kept building, and kept recruiting.") }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "gov", 1, "ignore", "") }, expireText: () => "" },
  { id: "camp_gov_2", kind: "story" as const, urgency: 3, title: () => "📖 The Prodigal Governor · 2/3: he wants your job", cause: () => "At a rally of 200,000 people, Governor Nwosu says: \"Nigeria needs a leader who delivers.\" Everyone knows what he means.",
    options: [
      opt("vp", "Offer him the vice presidency", "Keep your friends close and rivals closer.", "Your current VP will be furious.", { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition + 15); s.assembly.support = clamp(s.assembly.support + 4, 0, 100); return advance(s, "gov", 2, "vp", "He accepted with a smile that worried everybody."); } }, SAME, () => 1),
      opt("fight", "Fight him", "Cut his federal funds and expose him.", "A war with a popular man.", { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 4); return advance(s, "gov", 2, "fight", "You cut his funds. His supporters marched in three states."); } }, SAME, () => 1),
      opt("mentor", "Make him your successor", "Groom him; channel his ambition.", "He may not wait.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); return advance(s, "gov", 2, "mentor", "You named him your political heir. He seemed genuinely moved."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "gov", 2, "fight", "Silence was read as war.") }, expireText: () => "" },
  { id: "camp_gov_3", kind: "story" as const, urgency: 3, title: () => "📖 The Prodigal Governor · 3/3: the reckoning", cause: (s: FixState) => choice(s, "gov", 2) === "fight" ? "Nwosu's outfit has surrounded federal buildings in his state. He says he is 'protecting the people from Abuja'." : "Nwosu has a choice to make, and so do you: partnership or rivalry, for good.",
    options: [
      opt("deal", "Make him a partner", "Merge his outfit into the national police; share the credit.", "He becomes very powerful.", { run: (s: FixState) => { const ok = choice(s, "gov", 2) !== "fight"; if (ok) { s.sec.index = Math.max(0, s.sec.index - 4); s.assembly.support = clamp(s.assembly.support + 6, 0, 100); win(s, "gov"); return advance(s, "gov", 3, "deal", "His outfit became the model for state police nationwide, and he became your strongest ally. They call you the Kingmaker."); } s.assembly.support = clamp(s.assembly.support - 4, 0, 100); return advance(s, "gov", 3, "deal", "He took the deal, and your concessions, and still badmouths you on television."); } }, SAME, () => 1),
      opt("army", "Send the army", "No private armies in Nigeria.", "Bloodshed is possible.", { run: (s: FixState) => { s.rule.coupRisk = clamp100(s.rule.coupRisk - 3); s.sec.humanRights = clamp100(s.sec.humanRights - 6); s.rule.streetAnger = clamp100(s.rule.streetAnger + 6); return advance(s, "gov", 3, "army", "The outfit was disbanded at gunpoint. His state will vote against you for a generation."); } }, SAME, () => 1),
      opt("court", "Take him to the Supreme Court", "Let the law decide.", "Slow.", { run: (s: FixState) => { s.rule.judiciary = clamp100(s.rule.judiciary + 3); return advance(s, "gov", 3, "court", "The court ruled his outfit illegal. He obeyed, grudgingly."); } }, SAME, () => 1),
    ], expire: { run: (s: FixState) => advance(s, "gov", 3, "court", "The lawyers took over.") }, expireText: () => "" },
];

function campaignsMonthly(s: FixState, rng: Rng) {
  const active = s.flags.campActive as string | undefined;
  if (active) {
    const st = cstep(s, active); const open = s.events.some((e) => e.tpl.startsWith(`camp_${active}_`) && e.status === "open");
    if (!open && st >= 1 && st <= 3 && s.month >= Number(s.flags.campNext ?? 0)) createEvent(s, `camp_${active}_${st}`, "NG-FC");
    return;
  }
  if (s.month < 8 || s.month < Number(s.flags.campCd ?? 0) || !rng.chance(0.08)) return;
  const pool = CAMPAIGNS.filter((c) => cstep(s, c.id) === 0); if (!pool.length) return;
  const c = rng.pick(pool); s.flags.campActive = c.id; s.flags[`camp:${c.id}`] = 1; s.flags.campNext = s.month;
  pushNews(s, { source: `camp:${c.id}`, headline: `A new story begins: ${c.name}`, body: c.blurb, tone: "neutral" });
  createEvent(s, `camp_${c.id}_1`, "NG-FC");
}

// ================================================================================================ 5. titles
export interface Title { id: string; icon: string; name: string; how: string; test: (s: FixState) => boolean }
export const TITLES: Title[] = [
  { id: "babaLight", icon: "💡", name: "Baba Light", how: "Keep the lights on: more than 45% of demand met.", test: (s) => powerRatio(s) > 0.45 },
  { id: "mamaNaira", icon: "💵", name: "Mama/Papa Naira", how: "Make the naira 30% stronger than when you started.", test: (s) => s.eco.fx < s.baseline.fx * 0.7 },
  { id: "mrIntegrity", icon: "🕊️", name: "Mr/Madam Integrity", how: "Two years with clean hands and low corruption.", test: (s) => s.month - s.termStart >= 24 && s.me.evidence < 10 && s.gov.corruption < 40 },
  { id: "foodBasket", icon: "🌾", name: "Food Basket President", how: "Bring food inflation under 10%.", test: (s) => s.eco.foodInflation < 10 },
  { id: "safeHands", icon: "🛡️", name: "Safe Hands", how: "Bring the insecurity index under 30.", test: (s) => s.sec.index < 30 },
  { id: "peoples", icon: "❤️", name: "The People's President", how: "Reach 70% approval.", test: (s) => s.gov.approval >= 70 },
  { id: "builder", icon: "🏗️", name: "Bulldozer", how: "Finish eight projects.", test: (s) => s.projects.filter((p) => p.status === "done").length >= 8 },
  { id: "jobs", icon: "👷", name: "Job Creator-in-Chief", how: "Bring unemployment under 12%.", test: (s) => s.jobs.unemployment < 12 },
  { id: "borrower", icon: "💳", name: "Chief Borrower", how: "Let debt pass 70% of the economy (not a compliment).", test: (s) => (s.fin.domesticDebt + s.fin.foreignDebt * s.eco.fx) / (230000 * (s.eco.gdpIdx / 100) * (s.eco.priceLevel / 100)) > 0.7 },
  { id: "ironFist", icon: "✊", name: "Iron Fist", how: "Rule with democracy below 35 (not a compliment).", test: (s) => s.rule.democracy < 35 },
  { id: "afcon", icon: "⚽", name: "Super Eagles' Lucky Charm", how: "Win AFCON while in office.", test: (s) => s.flags.afconWin !== undefined },
  { id: "worldStage", icon: "🌍", name: "Africa's Big Brother", how: "Become Africa's number one in the world league.", test: (s) => s.flags.africaFirst !== undefined },
  { id: "cartelBreaker", icon: "🛢️", name: "Cartel Breaker", how: "Win the Oil Cartel story.", test: (s) => s.flags["title:cartelBreaker"] !== undefined },
  { id: "billionHunter", icon: "💼", name: "Billion Hunter", how: "Win the Missing Billions story.", test: (s) => s.flags["title:billionHunter"] !== undefined },
  { id: "coupProof", icon: "🎖️", name: "Coup Proof", how: "Win the General's Plot story.", test: (s) => s.flags["title:coupProof"] !== undefined },
  { id: "kingmaker", icon: "👑", name: "Kingmaker", how: "Win the Prodigal Governor story.", test: (s) => s.flags["title:kingmaker"] !== undefined },
];
export const earnedTitles = (s: FixState) => jflag<{ id: string; month: number }[]>(s, "titles", []);
function titlesMonthly(s: FixState) {
  const got = earnedTitles(s); let changed = false;
  for (const t of TITLES) if (!got.some((g) => g.id === t.id) && t.test(s)) {
    got.push({ id: t.id, month: s.month }); changed = true;
    pushNews(s, { source: `title:${t.id}`, headline: `Nigerians have a new name for their president: "${t.name}"`, body: t.how, tone: ["borrower", "ironFist"].includes(t.id) ? "bad" : "good" });
  }
  if (changed) s.flags.titles = JSON.stringify(got);
}

// ================================================================================================ 1. the front page
export interface FrontPage { paper: string; date: string; headline: string; sub: string; stories: string[]; prices: { label: string; v: string }[]; quote: string }
const PAPERS = ["THE DAILY WAHALA", "NAIJA TRUMPET", "THE ABUJA GBEDU", "LAGOS LOUDSPEAKER"];
const SHOUT: Record<string, { good: string[]; bad: string[] }> = {
  power: { good: ["BABA LIGHT! NEPA FORGETS HOW TO TAKE LIGHT", "GENERATOR SELLERS IN MOURNING AS LIGHT STAYS ON"], bad: ["DARKNESS! NEPA TAKES LIGHT, PRESIDENT TAKES PHOTOS", "GENERATOR NATION: DIESEL SELLERS BUY NEW JEEPS"] },
  fuel: { good: ["FUEL QUEUES VANISH! DANFO DRIVERS CONFUSED", "PETROL PRICE FALLS, OKADA RIDERS DANCE"], bad: ["QUEUE NATION! MOTORISTS SLEEP AT FILLING STATIONS", "PETROL NOW COSTS MORE THAN BEER"] },
  food: { good: ["RICE PRICE FALLS! MAMA PUT ADDS EXTRA MEAT", "GARRI IS CHEAP AGAIN, NATION REJOICES"], bad: ["RICE NOW COSTS SCHOOL FEES", "TOMATO GOES TO SPACE: PRICES HIT THE MOON"] },
  fx: { good: ["NAIRA FLEXES MUSCLES ON DOLLAR", "BUREAU DE CHANGE BOYS REPORT EMPTY POCKETS"], bad: ["NAIRA ON LIFE SUPPORT", "DOLLAR CLIMBS, NAIRA CRIES"] },
  corruption: { good: ["THIEVES ON THE RUN AS LOOT RETURNS", "ANTI-GRAFT AGENCY FINALLY CATCHES SOMEBODY BIG"], bad: ["HOW THEY CHOP: BILLIONS VANISH AGAIN", "SENATOR CAUGHT WITH CASH IN SOAKAWAY"] },
  security: { good: ["FARMERS RETURN TO FARMS AS PEACE HOLDS", "BANDITS ON THE BACK FOOT"], bad: ["TERROR ON THE HIGHWAY", "VILLAGES EMPTY AS BANDITS ROAM"] },
  jobs: { good: ["FACTORIES HIRING! GRADUATES ABANDON SHAWARMA STANDS", "JOBS, JOBS, JOBS"], bad: ["GRADUATES TURN TO BETTING AS JOBS VANISH", "FIRST-CLASS DEGREE, NO JOB"] },
  general: { good: ["SMALL SMALL, NIGERIA IS MOVING", "GOOD NEWS IS BACK IN FASHION"], bad: ["WAHALA EVERYWHERE", "NIGERIANS ASK: WHO DID WE OFFEND?"] },
};
export function frontPage(s: FixState, topicOf: (t: string) => string): FrontPage {
  const recent = s.news.filter((n) => n.month >= s.month - 1 && !n.source.startsWith("echo:")).slice(-30);
  const big = [...recent].sort((a, b) => (b.tone === "neutral" ? 0 : 1) - (a.tone === "neutral" ? 0 : 1) || (b.source.startsWith("event-res") ? 1 : 0) - (a.source.startsWith("event-res") ? 1 : 0))[0];
  let h = 7; for (const ch of String(s.month) + s.meta.seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const topic = big ? topicOf(big.headline) : "general"; const tone = big?.tone === "good" ? "good" : big?.tone === "bad" ? "bad" : s.gov.happiness >= 50 ? "good" : "bad";
  const list = SHOUT[topic] ?? SHOUT.general;
  const titles = earnedTitles(s); const nick = titles.length ? TITLES.find((t) => t.id === titles[titles.length - 1].id)?.name : null;
  const stories = recent.filter((n) => n !== big).slice(-3).reverse().map((n) => n.headline);
  return {
    paper: PAPERS[h % PAPERS.length], date: monthLabel(s.month),
    headline: list[tone][h % list[tone].length],
    sub: big ? big.headline : nick ? `They are calling the president "${nick}" now.` : "A quiet month in Abuja. Suspiciously quiet.",
    stories,
    prices: [{ label: "Rice (50kg)", v: rice(s) }, { label: "Petrol", v: `₦${Math.round(s.fuel.pump)}` }, { label: "Dollar", v: `₦${Math.round(s.eco.fx).toLocaleString("en-NG")}` }],
    quote: s.gov.happiness >= 55 ? "\"Things are better small. Don't jinx it.\" — Mama Nkechi, Yaba market" : s.gov.happiness >= 40 ? "\"We are managing. Managing is our national sport.\" — Chidi, okada rider" : "\"Even my generator is tired of this country.\" — Tolu, developer",
  };
}

// ================================================================================================ the month
export function funMonthly(s: FixState, rng: Rng) {
  calendarMonthly(s, rng);
  campaignsMonthly(s, rng);
  titlesMonthly(s);
  if (!s.staff?.picked) return;
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  if (s.month >= 4 && s.month - Number(s.flags.pressAt ?? -99) >= 5 && !open("pressConf") && rng.chance(0.5)) { s.flags.pressAt = s.month; createEvent(s, "pressConf", "NG-FC"); }
  if (s.month >= 3 && s.month - Number(s.flags.cabAt ?? -99) >= 4 && !open("cabinetMeeting")) { s.flags.cabAt = s.month; createEvent(s, "cabinetMeeting", "NG-FC"); }
  if (s.month >= 8 && s.month - Number(s.flags.crisisAt ?? -99) >= 14 && rng.chance(0.06 + (s.rule.democracy < 35 ? s.rule.coupRisk / 500 : 0))) {
    const pool = ["crisisCoup", "crisisBomb", "crisisCrash"].filter((t) => !open(t) && (t !== "crisisCoup" || s.rule.coupRisk > 20));
    if (s.rule.coupRisk > 30 && s.rule.democracy < 35 && pool.includes("crisisCoup")) pool.push("crisisCoup", "crisisCoup");
    if (pool.length) { s.flags.crisisAt = s.month; createEvent(s, rng.pick(pool), "NG-FC"); }
  }
}
export const FUN_TEMPLATES = [...CAL_TEMPLATES, ...PRESS_TEMPLATES, ...CRISIS_TEMPLATES, ...CABINET_TEMPLATES, ...CAMP_TEMPLATES];
export const isCrisis = (tpl: string) => tpl.startsWith("crisis");
