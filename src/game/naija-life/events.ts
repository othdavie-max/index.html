import { COURSES, STATE_BY_ID, TRAVEL_STATES } from "./data";
import { I, bump, eligibleJobs, luckBonus, enterPrison, jobDef, moveTo, randomName, stateOf } from "./helpers";
import type { AutoDef, Choice, EventDef, Pending, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";
import { kidLook, lookToStr, randomLook, strToLook } from "./look";
import { developCondition } from "./health";
import { addPartner, marry } from "./relationships";
import { schoolHousing } from "./world";

const isSelfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const adult = (p: Player) => p.age >= 18;
const evt = (id: string, data: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data });

function startTertiary(p: Player, type: "university" | "polytechnic"): void {
  p.school = { stage: "tertiary", yearsLeft: type === "university" ? 4 : 3, type };
  p.flags.schoolType = type === "university" && ["nepo", "strictRich", "upperMiddle", "newlyRich"].includes(p.fam.archetype) && chance(0.45) ? "private" : "public";
  schoolHousing(p, true);
}

// ---------------------------------------------------------------------------
// Events with choices
// ---------------------------------------------------------------------------
export const EVENTS: EventDef[] = [
  {
    id: "family_ask",
    title: "Family wahala",
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 3 + (STATE_BY_ID[p.family.state].opp < 4 ? 2 : 0) : 0),
    init: () => ({ who: pick(["Uncle Emeka", "Aunty Bisi", "Your cousin", "Mama", "Your elder brother", "Papa"]), why: pick(["school fees", "a hospital bill", "a wedding contribution", "rent that is due", "a funeral levy", "a goat for the festival"]) }),
    text: (p, d) => `${d.who} don call you from ${STATE_BY_ID[p.family.state].name}. "Omo, na you God use bless this family. We need money for ${d.why}. No vex o."`,
    choices: (p) => [
      { label: "Send generously", sub: `${naira(p.money * 0.08)} (8% of your cash)`, run: (q) => { const a = Math.max(0, q.money * 0.08); q.money -= a; q.family.happy = clamp(q.family.happy + 15); bump(q, "reputation", 3); return `You send ${naira(a)}. Everybody dey pray for you.`; } },
      { label: "Send a small amount", sub: `${naira(p.money * 0.02)}`, run: (q) => { const a = Math.max(0, q.money * 0.02); q.money -= a; q.family.happy = clamp(q.family.happy + 5); return `You send ${naira(a)}. Dem say 'thank you' but e sound like 'na only this one?'`; } },
      { label: "Block their number", run: (q) => { q.family.happy = clamp(q.family.happy - 18); bump(q, "reputation", -4); bump(q, "stress", 4); return "You go silent. By Sunday, the whole family WhatsApp group don hear am."; } },
    ],
  },
  {
    id: "checkpoint",
    title: "Police checkpoint",
    weight: (p) => (adult(p) ? (p.traveled ? 7 : 2) : 0),
    text: () => "One policeman flag you down for checkpoint. \"Oga, where your particulars? Wetin you carry for me?\"",
    choices: (p) => [
      { label: "Settle him small", sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); return "He smile. 'Safe journey, sir.'"; } },
      { label: "Argue your rights", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 2); return "He back down. You lose one hour but you keep your pride."; } q.money -= I(q, 20_000); bump(q, "stress", 8); return "He carry you go station. After three hours you still pay ₦20K 'bail'."; } },
      { label: "Speed off", run: (q) => { if (chance(0.3)) { const r = enterPrison(q, 1); return `${r}Dem catch you down the road.`; } bump(q, "stress", 5); return "You escape. Your heart still dey pound."; } },
    ],
  },
  {
    id: "scam_text",
    title: "SMS alert",
    weight: (p) => (p.age >= 16 ? 2.5 : 0),
    text: () => "Unknown number: \"CONGRATULATIONS! Your BVN don win ₦5,000,000 for Presidential Empowerment Draw. Send ₦25,000 to claim am.\"",
    choices: (p) => [
      { label: "Send the ₦25,000", disabled: p.money < I(p, 25_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 25_000); bump(q, "happiness", -6); return "Dem scam you. The number don switch off. Lesson learnt."; } },
      { label: "Ignore it", run: () => "You see through am. Sharp guy." },
      { label: "Report to the bank", run: (q) => { bump(q, "smarts", 1); return "The bank thank you and do nothing."; } },
    ],
  },
  {
    id: "love",
    title: "Heart matter",
    weight: (p) => (adult(p) && !p.spouse && !p.flags.dating ? 3 : 0),
    init: (p) => {
      const g = p.gender === "male" ? "female" : "male";
      return { name: `${randomName(p.tribe, g)} ${pick(["Okoro", "Bello", "Adeola", "Nwachukwu", "Danjuma", "Ekpo"])}`, where: pick(["at church", "at a friend's wedding", "on Instagram", "at the market", "in the danfo"]), look: lookToStr(randomLook(g, { region: stateOf(p).region, religion: p.religion })) };
    },
    text: (_p, d) => `You meet ${d.name} ${d.where}. Something dey there o.`,
    choices: (p, d) => [
      { label: "Shoot your shot", run: (q) => { if (chance(0.3 + q.stats.looks / 250 + q.stats.happiness / 400 + q.stats.reputation / 400)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "exclusive"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 12); return `${d.name} said yes! You are officially dating.`; } bump(q, "happiness", -6); return `${d.name} leave you on 'seen'. Chai.`; } },
      { label: "Spend on a fancy date", sub: naira(I(p, 80_000)), disabled: p.money < I(p, 80_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 80_000); if (chance(0.7)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "exclusive"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 14); return `The jollof, the music, the vibes sweet die. ${d.name} is now your girlfriend/boyfriend.`; } return "You spent it all and got friend-zoned. Painful."; } },
      { label: "Not interested", run: () => "You waka go. Maybe next time." },
    ],
  },
  {
    id: "proposal",
    title: "Time to marry",
    weight: (p) => (p.flags.dating && !p.spouse && p.age >= 20 ? 6 : 0),
    init: (p) => ({ bride: Math.round(I(p, rand(1_200_000, 5_000_000))) }),
    text: (p, d) => `You and ${p.flags.dating} don dey serious. Their family wan meet yours. The bride price list don land: ${naira(Number(d.bride))} plus yam tubers, wrappers, and 'miscellaneous'.`,
    choices: (p, d) => {
      const price = Number(d.bride);
      const finish = (q: Player, cost: number, family: number): string => { q.money -= cost; let sid = String(q.flags.datingNpc ?? ""); if (!sid || !q.npcs[sid]) { const g2 = q.gender === "male" ? "female" : "male"; sid = addPartner(q, { name: String(q.flags.dating), look: strToLook(String(q.flags.datingLook ?? "")) ?? randomLook(g2, { region: stateOf(q).region }), gender: g2 }, "engaged").id; } marry(q, sid); q.family.happy = clamp(q.family.happy + family); bump(q, "happiness", 15); return `You don marry! ${q.spouse?.name ?? "Your partner"} is now your spouse.`; };
      return [
        { label: "Full traditional wedding", sub: naira(price * 2), disabled: p.money < price * 2 ? "Need more money" : false, run: (q) => finish(q, price * 2, 12) },
        { label: "Negotiate the price", sub: naira(price * 0.6), run: (q) => { if (chance(0.6)) return finish(q, price * 0.6, 5); bump(q, "happiness", -8); delete q.flags.dating; return "The negotiation turn argument. Dem cancel the wedding."; } },
        { label: "Court wedding only", sub: naira(I(p, 150_000)), run: (q) => finish(q, I(q, 150_000), -8) },
        { label: "Not ready yet", run: (q) => { bump(q, "stress", 3); return "You asked for more time. They did not look happy."; } },
      ];
    },
  },
  {
    id: "hospital",
    title: "You are sick",
    weight: () => 0,
    text: () => "Body dey hot, joints dey ache, head dey pound. Na malaria? Typhoid? Or something worse?",
    choices: (p) => [
      { label: "Government hospital", sub: naira(I(p, 30_000)), run: (q) => { q.money -= I(q, 30_000); if (chance(0.7)) { bump(q, "health", 10); return "You wait 6 hours but dem treat you. Cheap, but e tire you."; } bump(q, "health", -6); return "Doctors dey strike. You go back home without treatment."; } },
      { label: "Private hospital", sub: naira(I(p, 1_500_000)), disabled: p.money < I(p, 1_500_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_500_000); bump(q, "health", 18); return "Air-conditioned ward. Fast service. E cost, but you don well again."; } },
      { label: "Prayer house / herbal mixture", run: (q) => { if (chance(0.4)) { bump(q, "health", 8); return "The herbs work. Or the malaria just leave by itself."; } bump(q, "health", -14); return "E worse. You for go hospital."; } },
      { label: "Fly abroad for treatment", sub: naira(I(p, 25_000_000)), disabled: p.money < I(p, 25_000_000) ? "Only for big people" : false, run: (q) => { q.money -= I(q, 25_000_000); bump(q, "health", 30); return "The best doctors in the world fixed you up. Wow."; } },
    ],
  },
  {
    id: "jamb",
    title: "JAMB season",
    weight: () => 0,
    text: () => "You don finish secondary school! JAMB day don reach and the whole street dey look you. Time to chase admission.",
    choices: (p) => [
      { label: "Write it honestly", run: (q) => { const score = Math.round(clamp(110 + q.stats.smarts * 1.7 + rand(-25, 25), 100, 380)); return { text: `Your score: ${score}.`, spawn: [evt("admission", { score })] }; } },
      { label: "Buy 'expo' from a centre", sub: naira(I(p, 30_000)), disabled: p.money < I(p, 30_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 30_000); if (chance(0.3)) { bump(q, "reputation", -15); q.edu = "secondary"; return "Dem catch you. JAMB ban you. You go find another road."; } const score = randInt(240, 320); return { text: `The 'expo' work. Score: ${score}!`, spawn: [evt("admission", { score })] }; } },
      { label: "Skip school, go hustle", run: (q) => { q.edu = "secondary"; return "Certificates are not everything. Time to make money."; } },
    ],
  },
  {
    id: "admission",
    title: "Admission list",
    weight: () => 0,
    text: (_p, d) => `Your JAMB score is ${d.score}. Cut-off marks are everything. Where will you go?`,
    choices: (p, d) => [
      { label: "University", sub: "4 years", disabled: Number(d.score) < 200 ? "Score too low" : false, run: (q) => { startTertiary(q, "university"); q.edu = "secondary"; return { text: "You enter university! Welcome to campus life.", spawn: [evt("course")] }; } },
      { label: "Polytechnic", sub: "3 years", disabled: Number(d.score) < 150 ? "Score too low" : false, run: (q) => { startTertiary(q, "polytechnic"); q.course = "Engineering"; return "You enrolled at a polytechnic. Practical skills, real work."; } },
      { label: "Retake JAMB next year", run: (q) => { bump(q, "stress", 6); q.edu = "secondary"; return "You will try again."; } },
      { label: "Skip school and hustle", run: (q) => { q.edu = "secondary"; return "School is not for everyone."; } },
    ],
  },
  {
    id: "course",
    title: "Choose a course",
    weight: () => 0,
    text: () => "What are you studying? Your parents already have an opinion (it is Medicine, Law or Engineering).",
    choices: () => COURSES.map<Choice>((c) => ({
      label: c,
      run: (q) => {
        q.course = c;
        const parentsHappy = ["Medicine", "Law", "Engineering"].includes(c);
        q.family.happy = clamp(q.family.happy + (parentsHappy ? 8 : -5));
        return parentsHappy ? `You chose ${c}. Your parents are already telling the neighbours.` : `You chose ${c}. Your mother is disappointed but supportive.`;
      },
    })),
  },
  {
    id: "nysc",
    title: "NYSC posting",
    weight: () => 0,
    init: () => ({ posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id }),
    text: (_p, d) => `You are a graduate! NYSC has posted you to ${STATE_BY_ID[String(d.posted)].name} State for national service.`,
    choices: (p, d) => [
      { label: "Go and serve", run: (q) => { const note = moveTo(q, String(d.posted)); bump(q, "connections", 6); bump(q, "smarts", 2); q.flags.nysc = true; q.money += I(q, 77_000); return `Camp, khaki, 'Ever Ready', and a year in ${STATE_BY_ID[String(d.posted)].name}. You made friends.${note}`; } },
      { label: "Work your posting to Abuja", sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 150_000); q.flags.nysc = true; const note = moveTo(q, "abuja"); bump(q, "connections", 10); return `A 'contact' at NYSC secretariat arranged it. You now serve in Abuja.${note}`; } },
      { label: "Skip it entirely", run: (q) => { q.flags.nysc = true; bump(q, "reputation", -8); return "No certificate for you, but you saved a year."; } },
    ],
  },
  {
    id: "fees_trouble",
    title: "School fees wahala",
    weight: (p) => (p.school?.stage === "tertiary" && p.classAtBirth === "struggling" ? 4 : 0),
    text: () => "School fees don reach and your family no fit pay on time. Bursar say 'no fees, no exam'.",
    choices: () => [
      { label: "Hustle on weekends", run: (q) => { bump(q, "stress", 10); bump(q, "health", -3); return "You sell recharge cards and teach juniors. You pay, just barely."; } },
      { label: "Borrow from a loan app", run: (q) => { q.debt += I(q, 300_000); bump(q, "stress", 12); return "Fees don pay. The interest go dey follow you for years."; } },
      { label: "Defer a year", run: (q) => { if (q.school) q.school.yearsLeft += 1; return "You sat out a year to work and save."; } },
    ],
  },
  {
    id: "cult",
    title: "Campus brotherhood",
    weight: (p) => (p.school?.stage === "tertiary" ? 2 : 0),
    text: () => "One senior brother pull you aside near hostel. \"You sharp. Join us. We dey protect our own.\"",
    choices: () => [
      { label: "Join the brotherhood", run: (q) => { bump(q, "connections", 12); if (chance(0.35)) { q.flags.cult = true; bump(q, "reputation", -10); bump(q, "health", -15); return "Rival clash leave you injured, but you don connect for life."; } return "You are in. The connections are real."; } },
      { label: "Politely decline", run: (q) => { bump(q, "reputation", 2); return "You keep low profile and you still get your head."; } },
    ],
  },
  {
    id: "robbery",
    title: "Armed robbery!",
    weight: (p) => (adult(p) ? 0.6 + stateOf(p).risk * 0.5 : 0),
    text: () => "Midnight. Armed robbers jump your fence and enter sitting room. \"Where the money dey?!\"",
    choices: () => [
      { label: "Hand over everything", run: (q) => { const lost = Math.max(0, q.money * rand(0.1, 0.3)); q.money -= lost; bump(q, "stress", 14); return `They left with ${naira(lost)}, your phones and your generator. You are alive.`; } },
      { label: "Fight back", run: (q) => { if (chance(0.45)) { bump(q, "reputation", 10); return "You raise alarm; neighbours come; robbers run. You be hero now."; } const lost = Math.max(0, q.money * 0.3); q.money -= lost; const r = developCondition(q, "gunshot"); return { text: `They shot you and took ${naira(lost)}. You are bleeding badly.`, spawn: r.pending }; } },
    ],
  },
  {
    id: "bet",
    title: "Betting slip",
    weight: (p) => (adult(p) && p.age < 50 && p.money > I(p, 100_000) ? 2.5 : 0),
    text: () => "Your guy talk say 'Arsenal go win, 7 odds, sure bet'. The app dey open. The odds dey sweet you.",
    choices: (p) => [
      { label: "Stake small", sub: naira(p.money * 0.03), run: (q) => { const a = q.money * 0.03; q.money -= a; if (chance(0.2 + luckBonus(q) / 2)) { q.money += a * 7; return `E enter! You win ${naira(a * 7)}!`; } return `Lost ${naira(a)}. 'It was almost', you tell yourself.`; } },
      { label: "Go all in (30%)", sub: naira(p.money * 0.3), run: (q) => { const a = q.money * 0.3; q.money -= a; if (chance(0.15 + luckBonus(q) / 2)) { q.money += a * 8; return `ALL IN WON. ${naira(a * 8)} in the bank. Legend.`; } bump(q, "stress", 10); return `Betting app swallow ${naira(a)}. You swear 'never again'.`; } },
      { label: "Delete the app", run: (q) => { bump(q, "smarts", 1); return "You saved yourself today."; } },
    ],
  },
  {
    id: "ponzi",
    title: "'Guaranteed' investment",
    weight: (p) => (adult(p) && p.money > I(p, 2_000_000) ? 2 : 0),
    text: () => "Your friend show you screenshot of one online platform. \"Invest ₦100K, get ₦200K in 30 days! Everyone is making it!\"",
    choices: (p) => [
      { label: "Invest 20% of your cash", sub: naira(p.money * 0.2), run: (q) => { const a = q.money * 0.2; q.money -= a; if (chance(0.3 + luckBonus(q))) { q.money += a * 2; return `You double your money! You cash out in time. ${naira(a * 2)} back.`; } bump(q, "stress", 12); return `The platform crash overnight. ${naira(a)} gone. The founder is in Dubai.`; } },
      { label: "Run away from it", run: (q) => { bump(q, "smarts", 1); return "If it sounds too good to be true... You did not touch it."; } },
    ],
  },
  {
    id: "ajo",
    title: "Ajo / Esusu savings",
    weight: (p) => (adult(p) && p.money > I(p, 300_000) ? 2 : 0),
    text: () => "Market women invite you join their monthly ajo. The collector get respect, but everything na trust.",
    choices: (p) => [
      { label: "Join the circle", sub: naira(Math.max(I(p, 300_000), p.money * 0.1)), run: (q) => { const a = Math.max(I(q, 300_000), q.money * 0.1); q.money -= a; if (chance(0.78)) { q.money += a * 1.25; bump(q, "connections", 2); return `Your turn reach, and you collect ${naira(a * 1.25)}. Trust is a currency.`; } bump(q, "stress", 8); return "Collector vanish with everybody money. Dem report to police. Nothing happen."; } },
      { label: "Pass", run: () => "You prefer your own account." },
    ],
  },
  {
    id: "yahoo_invite",
    title: "Easy money",
    weight: (p) => (p.age >= 17 && p.age <= 32 && !p.job && stateOf(p).opp >= 2 ? 3 : 0),
    text: () => "Your friend pull up in new car. \"I dey make pass your oga. Join me, I go teach you everything. Fast money.\"",
    choices: () => [
      { label: "Learn the game", run: (q) => { q.job = { id: "yahoo", rank: 0, years: 0 }; bump(q, "reputation", -6); return "You don become 'Yahoo boy'. EFCC dey o, no forget am."; } },
      { label: "No way", run: (q) => { bump(q, "reputation", 2); return "Your conscience is clear."; } },
    ],
  },
  {
    id: "gang_invite",
    title: "Dangerous offer",
    weight: (p) => (p.age >= 18 && p.age <= 36 && stateOf(p).risk >= 5 && p.money < I(p, 500_000) && p.job?.id !== "kidnapper" ? 1.2 : 0),
    text: () => "One man from the forest area offer you work: \"Just be our eye for highway. We dey pay well.\" You sabi wetin e mean.",
    choices: () => [
      { label: "Join the gang", run: (q) => { q.job = { id: "kidnapper", rank: 0, years: 0 }; bump(q, "reputation", -30); return "You don join kidnapping gang. Sleep no go easy again."; } },
      { label: "Refuse and leave", run: (q) => { bump(q, "stress", 6); return "You refuse and waka quietly. Wise."; } },
    ],
  },
  {
    id: "gang_op",
    title: "Gang operation",
    weight: (p) => (p.job?.id === "kidnapper" ? 14 : 0),
    text: (p) => `The commander send you go ${stateOf(p).name} highway. "Pick target. Choose well. Ransom must enter this week."`,
    choices: () => [
      { label: "Soft target: a trader", sub: "Low ransom, low risk", run: (q) => { if (chance(0.15)) { const r = enterPrison(q, randInt(3, 8)); return `${r}The target's family called the police.`; } const cut = Math.round(I(q, rand(1_500_000, 4_000_000))); q.money += cut; q.loot += cut; return `Ransom don pay. Your share: ${naira(cut)}.`; } },
      { label: "Big target: a rich man's son", sub: "Huge ransom, high risk", run: (q) => { if (chance(0.45)) { if (chance(0.5)) { q.alive = false; q.cause = "Killed in a military raid on a kidnappers' camp"; return "Soldiers surrounded the camp at dawn. There was no escape."; } const r = enterPrison(q, randInt(8, 18)); return `${r}Soldiers caught the whole gang.`; } const cut = Math.round(I(q, rand(15_000_000, 60_000_000))); q.money += cut; q.loot += cut; return `The family pay big. Your share: ${naira(cut)}. Don't spend it all in one place.`; } },
      { label: "Quit the gang", run: (q) => { if (chance(0.4)) { q.alive = false; q.cause = "Killed by former gang members"; return "You tried to quit. They found you."; } q.job = null; bump(q, "stress", 12); return "You slipped away in the night and left the area. For now, you're free."; } },
    ],
  },
  {
    id: "yahoo_op",
    title: "The big hit",
    weight: (p) => (p.job?.id === "yahoo" ? 8 : 0),
    text: () => "One 'client' abroad wan send money. This fit be the big one... or the last one.",
    choices: () => [
      { label: "Push for the big payout", run: (q) => { if (chance(0.3)) { const r = enterPrison(q, randInt(2, 7)); return `${r}EFCC raid your apartment 5 a.m.`; } const g = Math.round(I(q, rand(8_000_000, 40_000_000))); q.money += g; q.loot += g; return `You collect ${naira(g)}. Flash that new car (small small).`; } },
      { label: "Quit and go legit", run: (q) => { q.job = null; bump(q, "stress", -5); return "You deleted the accounts and started over."; } },
    ],
  },
  {
    id: "arrested",
    title: "Arrested!",
    weight: () => 0,
    init: (p) => ({ years: randInt(2, 6), bribe: Math.round(I(p, rand(2_000_000, 8_000_000))) }),
    text: (_p, d) => `You dey for cell facing ${d.years} years. One lawyer say 'another way' dey.`,
    choices: (p, d) => [
      { label: "'Settle' with the officers", sub: naira(Number(d.bribe)), disabled: p.money < Number(d.bribe) ? "Not enough cash" : false, run: (q) => { q.money -= Number(d.bribe); if (chance(0.55)) return "The case vanish. Naija."; return `${enterPrison(q, Number(d.years))}You were still jailed after paying.`; } },
      { label: "Hire a good lawyer", sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 3_000_000); if (chance(0.5)) return "Your lawyer found a loophole. You walked free."; return enterPrison(q, Math.max(1, Number(d.years) - 2)); } },
      { label: "Accept your fate", run: (q) => enterPrison(q, Number(d.years)) },
    ],
  },
  {
    id: "prison_bribe",
    title: "Kuje life",
    weight: (p) => (p.prison > 1 ? 5 : 0),
    text: () => "Life for Kuje hard: overcrowded, hot, food no good. One warder say for 'small something' e fit make your stay easier.",
    choices: (p) => [
      { label: "Pay the warder", sub: naira(I(p, 1_000_000)), disabled: p.money < I(p, 1_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_000_000); q.prison = Math.max(0, q.prison - 1); return "He pulled some strings. You'll be out a year sooner."; } },
      { label: "Keep your head down", run: (q) => { bump(q, "health", -4); bump(q, "smarts", 2); return "You read, you waited. You survived another year."; } },
    ],
  },
  {
    id: "tenant",
    title: "Tenant trouble",
    weight: (p) => (p.houses.some((h) => h.use === "rent") ? 4 : 0),
    text: () => "One of your tenants never pay for months. He say 'Sir, business dey dull, just give me small time'.",
    choices: (p) => [
      { label: "Be merciful", run: (q) => { bump(q, "reputation", 4); q.money -= I(q, 200_000); return "You forgive the debt. People call you good landlord."; } },
      { label: "Serve a quit notice", run: (q) => { bump(q, "reputation", -3); const rented = q.houses.find((h) => h.use === "rent"); if (rented) rented.use = "empty"; return "He moved out. The house stands empty for now."; } },
      { label: "Send area boys to 'talk'", sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); bump(q, "reputation", -10); return "The rent was paid the next day. People in the area talk, though."; } },
    ],
  },
  {
    id: "levy",
    title: "Market levy",
    weight: (p) => (isSelfEmployed(p) ? 3.5 : 0),
    text: () => "Market association chairman want 'development levy'. Task force men sef dey waka around.",
    choices: (p) => [
      { label: "Pay up", sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "connections", 1); return "No wahala this year. For now."; } },
      { label: "Refuse", run: (q) => { if (chance(0.5)) { q.money -= I(q, 350_000); return "Task force seize your goods. You pay ₦350K fine."; } return "They left you alone. This time."; } },
    ],
  },
  {
    id: "job_plug",
    title: "A plug",
    weight: (p) => (p.age >= 20 && !p.job && !p.school && p.stats.connections >= 20 ? 6 : 0),
    text: () => "Your uncle talk: \"I don talk to somebody for you. Vacancy dey and oga say bring your CV Monday.\"",
    choices: () => [
      { label: "Take it", run: (q) => { const options = eligibleJobs(q).filter((j) => j.group === "formal" || j.id === "rideapp" || j.id === "attendant"); if (options.length === 0) return "You went for the interview but didn't have the qualifications."; const best = options[randInt(0, Math.min(options.length - 1, 3))]; q.job = { id: best.id, rank: 0, years: 0 }; return `You land the job: ${best.title}! Na 'who you know' work again.`; } },
      { label: "Decline politely", run: () => "Thanks, but no thanks." },
    ],
  },
  {
    id: "church_seed",
    title: "Sow a seed",
    weight: (p) => (adult(p) && p.money > I(p, 500_000) ? 2 : 0),
    text: (p) => `Sunday service. The ${p.religion === "Muslim" ? "Imam" : "pastor"} says: "Whoever gives the biggest seed today will see the miracle by morning."`,
    choices: (p) => [
      { label: "Give a big offering", sub: naira(p.money * 0.05), run: (q) => { const a = q.money * 0.05; q.money -= a; bump(q, "reputation", 6); bump(q, "happiness", 4); q.stats.connections = clamp(q.stats.connections + 2); return `You gave ${naira(a)} and got a loud 'Amen'.`; } },
      { label: "Give small", sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); return "Small money, small blessing."; } },
      { label: "Keep your money", run: (q) => { bump(q, "reputation", -2); return "You kept your seed for yourself."; } },
    ],
  },
  {
    id: "funeral",
    title: "Burial arrangements",
    weight: () => 0,
    text: () => "Your parent don die. For Naija, burial na big matter: relatives expect proper send-off. Everybody dey watch wetin you go do.",
    choices: (p) => [
      { label: "Grand burial", sub: naira(I(p, 6_000_000)), disabled: p.money < I(p, 6_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 6_000_000); bump(q, "reputation", 12); bump(q, "connections", 5); q.family.happy = clamp(q.family.happy + 12); return "One week of mourning, live band, 500 people. The village go talk about am for years."; } },
      { label: "Decent burial", sub: naira(I(p, 1_500_000)), run: (q) => { q.money -= I(q, 1_500_000); bump(q, "reputation", 3); return "Decent and respectful burial."; } },
      { label: "Simple, quiet burial", run: (q) => { bump(q, "reputation", -6); q.family.happy = clamp(q.family.happy - 12); return "Some relatives grumble say e too small."; } },
    ],
  },
  {
    id: "owambe_invite",
    title: "Owambe weekend",
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 2 : 0),
    text: () => "Your friend wedding dey this Saturday. Aso-ebi money don due and the owambe go loud.",
    choices: (p) => [
      { label: "Buy the aso-ebi and spray", sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "happiness", 8); bump(q, "connections", 3); return "You dance whole night and meet useful people."; } },
      { label: "Stay home", run: (q) => { bump(q, "happiness", -2); return "You save money but you miss the jollof."; } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Automatic events (no decisions)
// ---------------------------------------------------------------------------
export const AUTOS: AutoDef[] = [
  { id: "nepa", weight: (p) => (p.age >= 6 ? 4 : 0), run: (p) => { if (p.flags.solar) return "NEPA take light again, but your solar carry the whole house. Neighbours dey envy you."; p.money -= I(p, 80_000) * (p.age >= 18 ? 1 : 0); bump(p, "stress", 4); return "NEPA take light for three weeks. You dey buy fuel for generator. Chai."; } },
  { id: "fuel", weight: (p) => (p.age >= 16 ? 3 : 0), run: (p) => { bump(p, "stress", 3); return "Fuel scarcity! Queue dey every filling station. One litre now cost like small rice."; } },
  { id: "subsidy", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.12; bump(p, "stress", 4); return "Government announce fuel subsidy removal. Transport fare double overnight."; } },
  { id: "naira", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.1; return "Naira crash against dollar. Market price jump again."; } },
  { id: "harmattan", weight: () => 3, run: (p) => { bump(p, "health", -4); return "Harmattan season: dry throat, cracked lips, dust for everywhere."; } },
  { id: "asuu", weight: (p) => (p.school?.stage === "tertiary" ? 5 : 0), run: (p) => { if (p.school && chance(0.4)) { p.school.yearsLeft += 1; return "ASUU declare strike. School shut for months; your graduation delay by one year."; } bump(p, "stress", 4); return "ASUU threaten strike but dem call am off after emergency talks."; } },
  { id: "traffic", weight: (p) => (p.age >= 18 && stateOf(p).opp >= 8 ? 3 : 0), run: (p) => { bump(p, "stress", 5); return "You spend 4 hours for Lagos/Abuja go-slow. Traffic na lifestyle."; } },
  { id: "kindness", weight: () => 2, run: (p) => { bump(p, "happiness", 6); bump(p, "reputation", 1); return "One stranger return your lost phone. Hope still dey this country."; } },
  { id: "baby", weight: (p) => (p.spouse && p.age >= 21 && p.age <= 44 && p.kids.length < 5 ? 6 : 0), run: (p) => {
    const gender = chance(0.5) ? "male" : "female";
    const name = randomName(p.tribe, gender);
    const dadLook = p.gender === "male" ? p.look : p.spouse?.look; const momLook = p.gender === "female" ? p.look : p.spouse?.look;
    p.kids.push({ name, age: 0, gender, look: kidLook(dadLook, momLook, gender) });
    bump(p, "happiness", 12);
    p.money -= I(p, 250_000);
    return `${p.spouse?.name} born ${name}! The naming ceremony pull half the street.`;
  } },
  { id: "viral", weight: (p) => (p.job && isSelfEmployed(p) ? 1.0 * (0.4 + p.luck / 80) : p.job?.id === "creator" || p.job?.id === "singer" || p.job?.id === "actor" ? 1.6 * (0.4 + p.luck / 80) : 0), run: (p) => {
    const j = jobDef(p);
    if (j && p.job && p.job.rank < j.ladder.length - 1) { p.job.rank += 1; p.flags.viral = (Number(p.flags.viral) || 0) + 1; return `Your ${j.group === "creative" ? "post" : "business"} go VIRAL! You move up to: ${j.ladder[p.job.rank].title}.`; }
    bump(p, "reputation", 3); return "Your stuff go viral again. People dey recognise you everywhere.";
  } },
  { id: "okada", weight: (p) => (["keke", "conductor", "rideapp"].includes(p.job?.id ?? "") ? 4 : 0), run: (p) => { p.flags.spawnCondition = chance(0.5) ? "fracture" : "sprain"; return "A trailer hit your vehicle on the highway. You are injured."; } },
  { id: "rain", weight: (p) => (["akara", "corn", "suya", "purewater"].includes(p.job?.id ?? "") ? 3.5 : 0), run: (p) => { p.money -= I(p, 60_000); return "Heavy rain wash away your sales for one week."; } },
  { id: "layoff", weight: (p) => (p.job && jobDef(p)?.group === "formal" && p.job.years > 1 ? 1.2 : 0), run: (p) => { p.job = null; bump(p, "stress", 12); return "Company dey downsize. Dem sack you. Welcome to the job market."; } },
  { id: "roadside", weight: (p) => (p.traveled ? 3 : 0), run: (p) => { bump(p, "stress", 4); return "Your bus break down halfway. You chop suya for roadside and make two new friends."; } },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const AUTO_BY_ID: Record<string, AutoDef> = Object.fromEntries(AUTOS.map((a) => [a.id, a]));