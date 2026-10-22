import { COURSES, STATE_BY_ID, TRAVEL_STATES } from "./data";
import { I, bump, eligibleJobs, enterPrison, jobDef, moveTo, randomName, stateOf } from "./helpers";
import type { AutoDef, Choice, EventDef, Pending, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";

const isSelfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const adult = (p: Player) => p.age >= 18;
const evt = (id: string, data: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data });

function startTertiary(p: Player, type: "university" | "polytechnic"): void {
  p.school = { stage: "tertiary", yearsLeft: type === "university" ? 4 : 3, type };
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
    text: (p, d) => `${d.who} calls you from ${STATE_BY_ID[p.family.state].name}. "Omo, you are the one God use to bless this family. We need money for ${d.why}."`,
    choices: (p) => [
      { label: "Send generously", sub: `${naira(p.money * 0.08)} (8% of your cash)`, run: (q) => { const a = Math.max(0, q.money * 0.08); q.money -= a; q.family.happy = clamp(q.family.happy + 15); bump(q, "reputation", 3); return `You sent ${naira(a)}. Everybody prays for you.`; } },
      { label: "Send a small amount", sub: `${naira(p.money * 0.02)}`, run: (q) => { const a = Math.max(0, q.money * 0.02); q.money -= a; q.family.happy = clamp(q.family.happy + 5); return `You sent ${naira(a)}. They say 'thank you' but it sounds like 'is that all?'`; } },
      { label: "Block their number", run: (q) => { q.family.happy = clamp(q.family.happy - 18); bump(q, "reputation", -4); bump(q, "stress", 4); return "You went silent. By Sunday, the whole family WhatsApp group knows."; } },
    ],
  },
  {
    id: "checkpoint",
    title: "Police checkpoint",
    weight: (p) => (adult(p) ? (p.traveled ? 7 : 2) : 0),
    text: () => "A policeman flags you down at a checkpoint. \"Oga, where your particulars? Wetin you carry for me?\"",
    choices: (p) => [
      { label: "Settle him small", sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); return "He smiles. 'Safe journey, sir.'"; } },
      { label: "Argue your rights", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 2); return "He backs down. You wonder if you just lost a day, but you got your pride."; } q.money -= I(q, 20_000); bump(q, "stress", 8); return "He took you to the station. After three hours you paid 'bail' of ₦20K anyway."; } },
      { label: "Speed off", run: (q) => { if (chance(0.3)) { const r = enterPrison(q, 1); return `${r}They caught you down the road.`; } bump(q, "stress", 5); return "You escaped. Your heart is still pounding."; } },
    ],
  },
  {
    id: "scam_text",
    title: "SMS alert",
    weight: (p) => (p.age >= 16 ? 2.5 : 0),
    text: () => "Unknown number: \"CONGRATULATIONS! Your BVN has won ₦5,000,000 in the Presidential Empowerment Draw. Send ₦25,000 to claim.\"",
    choices: (p) => [
      { label: "Send the ₦25,000", disabled: p.money < 25_000 ? "Not enough cash" : false, run: (q) => { q.money -= 25_000; bump(q, "happiness", -6); return "You were scammed. The number is switched off. Lesson learned."; } },
      { label: "Ignore it", run: () => "You saw through it. Smart." },
      { label: "Report to the bank", run: (q) => { bump(q, "smarts", 1); return "The bank thanked you and then did nothing."; } },
    ],
  },
  {
    id: "love",
    title: "Heart matter",
    weight: (p) => (adult(p) && !p.spouse && !p.flags.dating ? 3 : 0),
    init: (p) => {
      const g = p.gender === "male" ? "female" : "male";
      return { name: `${randomName(p.tribe, g)} ${pick(["Okoro", "Bello", "Adeola", "Nwachukwu", "Danjuma", "Ekpo"])}`, where: pick(["at church", "at a friend's wedding", "on Instagram", "at the market", "in the danfo"]) };
    },
    text: (_p, d) => `You meet ${d.name} ${d.where}. There is definitely something there.`,
    choices: (p, d) => [
      { label: "Shoot your shot", run: (q) => { if (chance(0.3 + q.stats.looks / 250 + q.stats.happiness / 400 + q.stats.reputation / 400)) { q.flags.dating = String(d.name); bump(q, "happiness", 12); return `${d.name} said yes! You are officially dating.`; } bump(q, "happiness", -6); return `${d.name} left you on 'seen'. Chai.`; } },
      { label: "Spend on a fancy date", sub: naira(I(p, 80_000)), disabled: p.money < I(p, 80_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 80_000); if (chance(0.7)) { q.flags.dating = String(d.name); bump(q, "happiness", 14); return `The jollof, the music, the vibes. ${d.name} is now your girlfriend/boyfriend.`; } return "You spent it all and got friend-zoned. Painful."; } },
      { label: "Not interested", run: () => "You walk away. Maybe next time." },
    ],
  },
  {
    id: "proposal",
    title: "Time to marry",
    weight: (p) => (p.flags.dating && !p.spouse && p.age >= 20 ? 6 : 0),
    init: (p) => ({ bride: Math.round(I(p, rand(1_200_000, 5_000_000))) }),
    text: (p, d) => `You and ${p.flags.dating} are serious. Their family wants to meet yours. The bride price list arrives: ${naira(Number(d.bride))} plus yam tubers, wrappers, and 'miscellaneous'.`,
    choices: (p, d) => {
      const price = Number(d.bride);
      const finish = (q: Player, cost: number, family: number): string => { q.money -= cost; q.spouse = { name: String(q.flags.dating), happy: 80 }; delete q.flags.dating; q.family.happy = clamp(q.family.happy + family); bump(q, "happiness", 15); return `You are married! ${q.spouse.name} is now your spouse.`; };
      return [
        { label: "Full traditional wedding", sub: naira(price * 2), disabled: p.money < price * 2 ? "Need more money" : false, run: (q) => finish(q, price * 2, 12) },
        { label: "Negotiate the price", sub: naira(price * 0.6), run: (q) => { if (chance(0.6)) return finish(q, price * 0.6, 5); bump(q, "happiness", -8); delete q.flags.dating; return "The negotiation turned into an argument. They called off the wedding."; } },
        { label: "Court wedding only", sub: naira(I(p, 150_000)), run: (q) => finish(q, I(q, 150_000), -8) },
        { label: "Not ready yet", run: (q) => { bump(q, "stress", 3); return "You asked for more time. They did not look happy."; } },
      ];
    },
  },
  {
    id: "hospital",
    title: "You are sick",
    weight: (p) => (p.stats.health < 55 || p.age > 55 ? 4 : p.age > 30 ? 0.8 : 0),
    text: () => "You have a fever, a body ache and a terrible headache. Malaria? Typhoid? Something worse?",
    choices: (p) => [
      { label: "Government hospital", sub: naira(I(p, 30_000)), run: (q) => { q.money -= I(q, 30_000); if (chance(0.7)) { bump(q, "health", 10); return "You waited 6 hours, but they treated you. Cheap, but exhausting."; } bump(q, "health", -6); return "Strike by resident doctors. You went home untreated."; } },
      { label: "Private hospital", sub: naira(I(p, 1_500_000)), disabled: p.money < I(p, 1_500_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_500_000); bump(q, "health", 18); return "Air-conditioned ward. Fast service. Expensive, but you are well again."; } },
      { label: "Prayer house / herbal mixture", run: (q) => { if (chance(0.4)) { bump(q, "health", 8); return "The herbs worked. Or the malaria wore off by itself."; } bump(q, "health", -14); return "It got worse. You should have gone to a hospital."; } },
      { label: "Fly abroad for treatment", sub: naira(I(p, 25_000_000)), disabled: p.money < I(p, 25_000_000) ? "Only for big people" : false, run: (q) => { q.money -= I(q, 25_000_000); bump(q, "health", 30); return "The best doctors in the world fixed you up. Wow."; } },
    ],
  },
  {
    id: "jamb",
    title: "JAMB season",
    weight: () => 0,
    text: () => "You finished secondary school! JAMB exam day is here and everyone from the street is staring at you. Time to chase university admission.",
    choices: (p) => [
      { label: "Write it honestly", run: (q) => { const score = Math.round(clamp(110 + q.stats.smarts * 1.7 + rand(-25, 25), 100, 380)); return { text: `Your score: ${score}.`, spawn: [evt("admission", { score })] }; } },
      { label: "Buy 'expo' from a centre", sub: naira(I(p, 30_000)), disabled: p.money < I(p, 30_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 30_000); if (chance(0.3)) { bump(q, "reputation", -15); q.edu = "secondary"; return "You were caught. JAMB banned you from the exam. You have to find another path."; } const score = randInt(240, 320); return { text: `The 'expo' worked. Score: ${score}!`, spawn: [evt("admission", { score })] }; } },
      { label: "Skip school, go hustle", run: (q) => { q.edu = "secondary"; return "Certificates are not everything. Time to make money."; } },
    ],
  },
  {
    id: "admission",
    title: "Admission list",
    weight: () => 0,
    text: (_p, d) => `Your JAMB score is ${d.score}. Cut-off marks are everything. Where will you go?`,
    choices: (p, d) => [
      { label: "University", sub: "4 years", disabled: Number(d.score) < 200 ? "Score too low" : false, run: (q) => { startTertiary(q, "university"); q.edu = "secondary"; return { text: "You got into university! Welcome to campus life.", spawn: [evt("course")] }; } },
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
    text: () => "Fees are due and your family cannot pay on time. The bursar says 'no fees, no exam'.",
    choices: () => [
      { label: "Hustle on weekends", run: (q) => { bump(q, "stress", 10); bump(q, "health", -3); return "You sold recharge cards and tutored juniors. You paid, barely."; } },
      { label: "Borrow from a loan app", run: (q) => { q.debt += I(q, 300_000); bump(q, "stress", 12); return "The fees are paid. The interest will haunt you for years."; } },
      { label: "Defer a year", run: (q) => { if (q.school) q.school.yearsLeft += 1; return "You sat out a year to work and save."; } },
    ],
  },
  {
    id: "cult",
    title: "Campus brotherhood",
    weight: (p) => (p.school?.stage === "tertiary" ? 2 : 0),
    text: () => "A senior brother pulls you aside near the hostel. \"You are smart. Join us. We protect our own.\"",
    choices: () => [
      { label: "Join the brotherhood", run: (q) => { bump(q, "connections", 12); if (chance(0.35)) { q.flags.cult = true; bump(q, "reputation", -10); bump(q, "health", -15); return "A rival clash left you injured, but you are connected for life."; } return "You are in. The connections are real."; } },
      { label: "Politely decline", run: (q) => { bump(q, "reputation", 2); return "You keep your head down and keep your head."; } },
    ],
  },
  {
    id: "robbery",
    title: "Armed robbery!",
    weight: (p) => (adult(p) ? 0.6 + stateOf(p).risk * 0.5 : 0),
    text: () => "Midnight. Armed robbers jump the fence of your compound and storm the sitting room. \"Where is the money?!\"",
    choices: () => [
      { label: "Hand over everything", run: (q) => { const lost = Math.max(0, q.money * rand(0.1, 0.3)); q.money -= lost; bump(q, "stress", 14); return `They left with ${naira(lost)}, your phones and your generator. You are alive.`; } },
      { label: "Fight back", run: (q) => { if (chance(0.45)) { bump(q, "reputation", 10); return "You raised alarm; neighbours came; the robbers fled. You are a hero."; } bump(q, "health", -30); const lost = Math.max(0, q.money * 0.3); q.money -= lost; return `They shot you in the arm and took ${naira(lost)}. You survived.`; } },
    ],
  },
  {
    id: "bet",
    title: "Betting slip",
    weight: (p) => (adult(p) && p.age < 50 && p.money > I(p, 100_000) ? 2.5 : 0),
    text: () => "Your guy says 'Arsenal go win, 7 odds sure bet'. The app is open. Odds look so beautiful.",
    choices: (p) => [
      { label: "Stake small", sub: naira(p.money * 0.03), run: (q) => { const a = q.money * 0.03; q.money -= a; if (chance(0.2)) { q.money += a * 7; return `It entered! You won ${naira(a * 7)}!`; } return `Lost ${naira(a)}. 'It was almost', you tell yourself.`; } },
      { label: "Go all in (30%)", sub: naira(p.money * 0.3), run: (q) => { const a = q.money * 0.3; q.money -= a; if (chance(0.15)) { q.money += a * 8; return `ALL IN WON. ${naira(a * 8)} in the bank. Legend.`; } bump(q, "stress", 10); return `Bet9ja swallowed ${naira(a)}. You said never again.`; } },
      { label: "Delete the app", run: (q) => { bump(q, "smarts", 1); return "You saved yourself today."; } },
    ],
  },
  {
    id: "ponzi",
    title: "'Guaranteed' investment",
    weight: (p) => (adult(p) && p.money > I(p, 2_000_000) ? 2 : 0),
    text: () => "A friend shows you screenshots of an online platform. \"Invest ₦100K, get ₦200K in 30 days! Everyone is making it!\"",
    choices: (p) => [
      { label: "Invest 20% of your cash", sub: naira(p.money * 0.2), run: (q) => { const a = q.money * 0.2; q.money -= a; if (chance(0.35)) { q.money += a * 2; return `You doubled your money! You cashed out in time. ${naira(a * 2)} back.`; } bump(q, "stress", 12); return `The platform crashed overnight. ${naira(a)} gone. The founder is in Dubai.`; } },
      { label: "Run away from it", run: (q) => { bump(q, "smarts", 1); return "If it sounds too good to be true... You did not touch it."; } },
    ],
  },
  {
    id: "ajo",
    title: "Ajo / Esusu savings",
    weight: (p) => (adult(p) && p.money > I(p, 300_000) ? 2 : 0),
    text: () => "Women in the market invite you to join their monthly savings circle. The collector is respected, but the whole thing is on trust.",
    choices: (p) => [
      { label: "Join the circle", sub: naira(Math.max(I(p, 300_000), p.money * 0.1)), run: (q) => { const a = Math.max(I(q, 300_000), q.money * 0.1); q.money -= a; if (chance(0.78)) { q.money += a * 1.25; bump(q, "connections", 2); return `Your turn came, and you got ${naira(a * 1.25)}. Trust is a currency.`; } bump(q, "stress", 8); return "The collector disappeared with everybody's money. A police report was made. Nothing happened."; } },
      { label: "Pass", run: () => "You prefer your own account." },
    ],
  },
  {
    id: "yahoo_invite",
    title: "Easy money",
    weight: (p) => (p.age >= 17 && p.age <= 32 && !p.job && stateOf(p).opp >= 2 ? 3 : 0),
    text: () => "Your friend pulls up in a new car. \"I make more than your oga. Join me, I'll teach you everything. Fast money.\"",
    choices: () => [
      { label: "Learn the game", run: (q) => { q.job = { id: "yahoo", rank: 0, years: 0 }; bump(q, "reputation", -6); return "You are now a 'Yahoo boy'. EFCC is real, remember that."; } },
      { label: "No way", run: (q) => { bump(q, "reputation", 2); return "Your conscience is clear."; } },
    ],
  },
  {
    id: "gang_invite",
    title: "Dangerous offer",
    weight: (p) => (p.age >= 18 && p.age <= 36 && stateOf(p).risk >= 5 && p.money < I(p, 500_000) && p.job?.id !== "kidnapper" ? 1.2 : 0),
    text: () => "A man from the forest area offers you a job: \"Just be our eyes on the highway. We pay well.\" You know what that means.",
    choices: () => [
      { label: "Join the gang", run: (q) => { q.job = { id: "kidnapper", rank: 0, years: 0 }; bump(q, "reputation", -30); return "You've joined a kidnapping gang. You will not sleep easy again."; } },
      { label: "Refuse and leave", run: (q) => { bump(q, "stress", 6); return "You declined and moved quietly. Smart."; } },
    ],
  },
  {
    id: "gang_op",
    title: "Gang operation",
    weight: (p) => (p.job?.id === "kidnapper" ? 14 : 0),
    text: (p) => `The commander sends you to the ${stateOf(p).name} highway. "Pick the target. Choose well. Ransom must enter this week."`,
    choices: () => [
      { label: "Soft target: a trader", sub: "Low ransom, low risk", run: (q) => { if (chance(0.15)) { const r = enterPrison(q, randInt(3, 8)); return `${r}The target's family called the police.`; } const cut = Math.round(I(q, rand(1_500_000, 4_000_000))); q.money += cut; q.loot += cut; return `Ransom paid. Your share: ${naira(cut)}.`; } },
      { label: "Big target: a rich man's son", sub: "Huge ransom, high risk", run: (q) => { if (chance(0.45)) { if (chance(0.5)) { q.alive = false; q.cause = "Killed in a military raid on a kidnappers' camp"; return "Soldiers surrounded the camp at dawn. There was no escape."; } const r = enterPrison(q, randInt(8, 18)); return `${r}Soldiers caught the whole gang.`; } const cut = Math.round(I(q, rand(15_000_000, 60_000_000))); q.money += cut; q.loot += cut; return `The family paid big. Your share: ${naira(cut)}. Don't spend it all in one place.`; } },
      { label: "Quit the gang", run: (q) => { if (chance(0.4)) { q.alive = false; q.cause = "Killed by former gang members"; return "You tried to quit. They found you."; } q.job = null; bump(q, "stress", 12); return "You slipped away in the night and left the area. For now, you're free."; } },
    ],
  },
  {
    id: "yahoo_op",
    title: "The big hit",
    weight: (p) => (p.job?.id === "yahoo" ? 8 : 0),
    text: () => "A 'client' abroad is about to send money. This could be the big one... or the last one.",
    choices: () => [
      { label: "Push for the big payout", run: (q) => { if (chance(0.3)) { const r = enterPrison(q, randInt(2, 7)); return `${r}EFCC raided your apartment at 5 a.m.`; } const g = Math.round(I(q, rand(8_000_000, 40_000_000))); q.money += g; q.loot += g; return `You got ${naira(g)}. Flash that new car (carefully).`; } },
      { label: "Quit and go legit", run: (q) => { q.job = null; bump(q, "stress", -5); return "You deleted the accounts and started over."; } },
    ],
  },
  {
    id: "arrested",
    title: "Arrested!",
    weight: () => 0,
    init: (p) => ({ years: randInt(2, 6), bribe: Math.round(I(p, rand(2_000_000, 8_000_000))) }),
    text: (_p, d) => `You are in a cell facing ${d.years} years. A lawyer says there might be 'another way'.`,
    choices: (p, d) => [
      { label: "'Settle' with the officers", sub: naira(Number(d.bribe)), disabled: p.money < Number(d.bribe) ? "Not enough cash" : false, run: (q) => { q.money -= Number(d.bribe); if (chance(0.55)) return "The case disappeared. Nigeria."; return `${enterPrison(q, Number(d.years))}You were still jailed after paying.`; } },
      { label: "Hire a good lawyer", sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 3_000_000); if (chance(0.5)) return "Your lawyer found a loophole. You walked free."; return enterPrison(q, Math.max(1, Number(d.years) - 2)); } },
      { label: "Accept your fate", run: (q) => enterPrison(q, Number(d.years)) },
    ],
  },
  {
    id: "prison_bribe",
    title: "Kuje life",
    weight: (p) => (p.prison > 1 ? 5 : 0),
    text: () => "Life in Kuje is hard: overcrowded, hot, and food is awful. A warder says for a 'little something' he can make your stay easier.",
    choices: (p) => [
      { label: "Pay the warder", sub: naira(I(p, 1_000_000)), disabled: p.money < I(p, 1_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_000_000); q.prison = Math.max(0, q.prison - 1); return "He pulled some strings. You'll be out a year sooner."; } },
      { label: "Keep your head down", run: (q) => { bump(q, "health", -4); bump(q, "smarts", 2); return "You read, you waited. You survived another year."; } },
    ],
  },
  {
    id: "tenant",
    title: "Tenant trouble",
    weight: (p) => (p.houses.some((h) => h.use === "rent") ? 4 : 0),
    text: () => "One of your tenants has not paid in months. He says 'Sir, business is bad, just give me small time'.",
    choices: (p) => [
      { label: "Be merciful", run: (q) => { bump(q, "reputation", 4); q.money -= I(q, 200_000); return "You forgave the debt. People call you a good landlord."; } },
      { label: "Serve a quit notice", run: (q) => { bump(q, "reputation", -3); const rented = q.houses.find((h) => h.use === "rent"); if (rented) rented.use = "empty"; return "He moved out. The house stands empty for now."; } },
      { label: "Send area boys to 'talk'", sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); bump(q, "reputation", -10); return "The rent was paid the next day. People in the area talk, though."; } },
    ],
  },
  {
    id: "levy",
    title: "Market levy",
    weight: (p) => (isSelfEmployed(p) ? 3.5 : 0),
    text: () => "The market association chairman wants a 'development levy'. Task force men are also walking around.",
    choices: (p) => [
      { label: "Pay up", sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "connections", 1); return "No trouble this year. For now."; } },
      { label: "Refuse", run: (q) => { if (chance(0.5)) { q.money -= I(q, 350_000); return "Task force confiscated your goods. You paid a fine of ₦350K."; } return "They left you alone. This time."; } },
    ],
  },
  {
    id: "job_plug",
    title: "A plug",
    weight: (p) => (p.age >= 20 && !p.job && !p.school && p.stats.connections >= 20 ? 6 : 0),
    text: () => "Your uncle says: \"I spoke to somebody for you. There's a vacancy and the boss says to bring your CV on Monday.\"",
    choices: () => [
      { label: "Take it", run: (q) => { const options = eligibleJobs(q).filter((j) => j.group === "formal" || j.id === "rideapp" || j.id === "attendant"); if (options.length === 0) return "You went for the interview but didn't have the qualifications."; const best = options[randInt(0, Math.min(options.length - 1, 3))]; q.job = { id: best.id, rank: 0, years: 0 }; return `You got the job: ${best.title}! "Who you know" at work.`; } },
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
    text: () => "Your parent has died. In Nigeria, burial is a major event: relatives expect a proper send-off. Everyone is watching what you will do.",
    choices: (p) => [
      { label: "Grand burial", sub: naira(I(p, 6_000_000)), disabled: p.money < I(p, 6_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 6_000_000); bump(q, "reputation", 12); bump(q, "connections", 5); q.family.happy = clamp(q.family.happy + 12); return "A week of mourning, live band, 500 people. The village will talk about it for years."; } },
      { label: "Decent burial", sub: naira(I(p, 1_500_000)), run: (q) => { q.money -= I(q, 1_500_000); bump(q, "reputation", 3); return "A respectful and modest burial."; } },
      { label: "Simple, quiet burial", run: (q) => { bump(q, "reputation", -6); q.family.happy = clamp(q.family.happy - 12); return "Some relatives grumbled that it was too small."; } },
    ],
  },
  {
    id: "owambe_invite",
    title: "Owambe weekend",
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 2 : 0),
    text: () => "Your friend's wedding is this Saturday. Aso-ebi money is due, and the Owambe will be loud.",
    choices: (p) => [
      { label: "Buy the aso-ebi and spray", sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "happiness", 8); bump(q, "connections", 3); return "You danced all night and met useful people."; } },
      { label: "Stay home", run: (q) => { bump(q, "happiness", -2); return "You saved money but missed the jollof."; } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Automatic events (no decisions)
// ---------------------------------------------------------------------------
export const AUTOS: AutoDef[] = [
  { id: "nepa", weight: (p) => (p.age >= 6 ? 4 : 0), run: (p) => { p.money -= I(p, 80_000) * (p.age >= 18 ? 1 : 0); bump(p, "stress", 4); return "NEPA took light for three weeks. You bought fuel for the generator. Chai."; } },
  { id: "fuel", weight: (p) => (p.age >= 16 ? 3 : 0), run: (p) => { bump(p, "stress", 3); return "Fuel scarcity! Queues at every filling station. A litre now costs the same as small rice."; } },
  { id: "subsidy", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.12; bump(p, "stress", 4); return "Government announced fuel subsidy removal. Transport fares doubled overnight."; } },
  { id: "naira", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.1; return "The naira crashed against the dollar. Prices in the market jumped again."; } },
  { id: "harmattan", weight: () => 3, run: (p) => { bump(p, "health", -4); return "Harmattan season: dry throat, cracked lips, and dust on everything."; } },
  { id: "asuu", weight: (p) => (p.school?.stage === "tertiary" ? 5 : 0), run: (p) => { if (p.school && chance(0.4)) { p.school.yearsLeft += 1; return "ASUU declared a strike. School closed for months; your graduation is delayed by a year."; } bump(p, "stress", 4); return "ASUU strike threatened and was called off after emergency talks."; } },
  { id: "traffic", weight: (p) => (p.age >= 18 && stateOf(p).opp >= 8 ? 3 : 0), run: (p) => { bump(p, "stress", 5); return "You spent 4 hours in Lagos/Abuja-style traffic. 'Go-slow' is a lifestyle."; } },
  { id: "kindness", weight: () => 2, run: (p) => { bump(p, "happiness", 6); bump(p, "reputation", 1); return "A stranger returned your lost phone. There is still hope in this country."; } },
  { id: "baby", weight: (p) => (p.spouse && p.age >= 21 && p.age <= 44 && p.kids.length < 5 ? 6 : 0), run: (p) => {
    const gender = chance(0.5) ? "male" : "female";
    const name = randomName(p.tribe, gender);
    p.kids.push({ name, age: 0, gender });
    bump(p, "happiness", 12);
    p.money -= I(p, 250_000);
    return `${p.spouse?.name} gave birth to ${name}! The naming ceremony drew half the street.`;
  } },
  { id: "viral", weight: (p) => (p.job && isSelfEmployed(p) ? 1.6 : p.job?.id === "creator" || p.job?.id === "singer" || p.job?.id === "actor" ? 2.5 : 0), run: (p) => {
    const j = jobDef(p);
    if (j && p.job && p.job.rank < j.ladder.length - 1) { p.job.rank += 1; p.flags.viral = (Number(p.flags.viral) || 0) + 1; return `Your ${j.group === "creative" ? "post" : "business"} went VIRAL! You moved up to: ${j.ladder[p.job.rank].title}.`; }
    bump(p, "reputation", 3); return "Your stuff went viral again. People keep recognising you.";
  } },
  { id: "okada", weight: (p) => (["keke", "conductor", "rideapp"].includes(p.job?.id ?? "") ? 4 : 0), run: (p) => { bump(p, "health", -10); p.money -= I(p, 90_000); return "A trailer hit your vehicle. Nobody died, but you spent weeks in recovery."; } },
  { id: "rain", weight: (p) => (["akara", "corn", "suya", "purewater"].includes(p.job?.id ?? "") ? 3.5 : 0), run: (p) => { p.money -= I(p, 60_000); return "Heavy rain washed out your sales for a week."; } },
  { id: "layoff", weight: (p) => (p.job && jobDef(p)?.group === "formal" && p.job.years > 1 ? 1.2 : 0), run: (p) => { p.job = null; bump(p, "stress", 12); return "The company is downsizing. You were laid off. Welcome to the job market."; } },
  { id: "roadside", weight: (p) => (p.traveled ? 3 : 0), run: (p) => { bump(p, "stress", 4); return "Your bus broke down halfway. You ate suya by the roadside and made two new friends."; } },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const AUTO_BY_ID: Record<string, AutoDef> = Object.fromEntries(AUTOS.map((a) => [a.id, a]));