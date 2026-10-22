import { I, bump, eligibleJobs, jobDef, luckBonus } from "./helpers";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, rand } from "./util";

const adult = (p: Player) => p.age >= 18;
const selfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const insured = (p: Player) => Number(p.flags.insuredUntil ?? 0) > p.age;

/** Events driven by luck and by smart decisions. */
export const EVENTS4: EventDef[] = [
  {
    id: "old_friend",
    title: dual("Old friend resurfaces", "Old padi don show face"),
    weight: (p) => (adult(p) ? 1.6 * (0.5 + p.luck / 100) : 0),
    text: () => T("You bump into an old classmate at a wedding. He now works at a big company and remembers you well: 'Ah! Is that you? What are you up to these days? Let's talk.'", "You bump into old classmate for wedding. He don dey work for big company and he still remember you well: 'Ah! Na you? Wetin you dey do these days? Make we talk.'"),
    choices: (p) => [
      { label: T("Ask for a job referral", "Ask am for job connection"), disabled: p.job ? T("You already have a job", "You don already get work") : false, run: (q) => { const options = eligibleJobs(q).filter((j) => j.group === "formal"); if (options.length && chance(0.45 + luckBonus(q))) { const j = options[0]; q.job = { id: j.id, rank: 0, years: 0 }; bump(q, "connections", 3); return T(`He walks your CV through the door. You land a job as ${j.ladder[0].title}.`, `He carry your CV enter inside. You land job as ${j.ladder[0].title}.`); } bump(q, "connections", 2); return T("He promises to 'look into it' and then goes silent. That is how it goes.", "He promise say 'I go look into am' then e go quiet. Na so e dey be."); } },
      { label: T("Ask him to invest in your hustle", "Ask am to put money for your hustle"), disabled: !selfEmployed(p) ? T("You need a business", "You need business first") : false, run: (q) => { if (chance(0.4 + luckBonus(q))) { const g = I(q, rand(300_000, 1_500_000)); q.money += g; bump(q, "connections", 3); return T(`He puts ${naira(g)} into your business, no strings attached. A good friend indeed.`, `He put ${naira(g)} inside your business, no strings. Na real padi be that.`); } bump(q, "reputation", -1); return T("He laughs nervously and changes the subject.", "He laugh anyhow then change topic."); } },
      { label: T("Just catch up and exchange numbers", "Just gist and swap numbers"), run: (q) => { bump(q, "connections", 4); bump(q, "happiness", 4); return T("Good chat, good jollof, good connection. You never know.", "Better gist, better jollof, better connection. You no fit know."); } },
    ],
  },
  {
    id: "tender",
    title: dual("Supply contract", "Government contract"),
    weight: (p) => (adult(p) && (selfEmployed(p) || p.stats.smarts >= 55) && p.money > I(p, 800_000) ? 1.8 : 0),
    text: () => T("The local government advertises a small supply contract (stationery, food, or repairs). An insider whispers to you: 'Bid properly or pay the processing fee. Your choice.'", "Local government announce small supply contract (stationery, food, or repair). One insider whisper to you: 'Either you bid well or you pay processing fee. Na your choice.'"),
    choices: (p) => [
      { label: T("Bid with proper documents", "Bid with correct papers"), sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 150_000); if (chance(0.18 + q.stats.connections / 300 + q.stats.smarts / 450 + luckBonus(q))) { const g = I(q, rand(1_500_000, 5_000_000)); q.money += g; bump(q, "reputation", 4); return T(`Your clean bid wins! Contract payout: ${naira(g)} (after delays, of course).`, `Your clean bid win o! Contract money: ${naira(g)} (after plenty delay, of course).`); } bump(q, "stress", 4); return T("You lose to a company no one has ever heard of. Typical.", "Company wey nobody don hear before collect am from you. Normal thing."); } },
      { label: T("Pay the 'processing fee' to the insider", "Settle the insider 'processing fee'"), sub: naira(I(p, 500_000)), disabled: p.money < I(p, 500_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 500_000); if (chance(0.12)) { bump(q, "reputation", -12); return T("A whistleblower exposes the arrangement. You lose the money and the contract.", "Whistleblower expose the arrangement. You lose both money and contract."); } if (chance(0.55 + luckBonus(q))) { const g = I(q, rand(1_500_000, 5_000_000)); q.money += g; bump(q, "reputation", -3); return T(`Contract awarded! You collect ${naira(g)}. Nobody asks how.`, `Dem give you the contract! You collect ${naira(g)}. Nobody ask how.`); } return T("The 'fee' disappears along with the insider's phone number.", "The 'fee' vanish with the insider phone number."); } },
      { label: T("Skip it", "Leave am"), run: () => T("You let this one pass. There will always be another tender in Nigeria.", "You let this one pass. Tender no dey finish for Naija.") },
    ],
  },
  {
    id: "investor_pitch",
    title: dual("An investor visits", "Investor come visit"),
    weight: (p) => (selfEmployed(p) && (p.job?.rank ?? 0) >= 1 && p.stats.smarts >= 40 ? 1.4 : 0),
    text: () => T("A well-dressed man tries your product and says: 'This is good. I will invest in the business and take a share. We will grow it big.'", "One well-dressed man try your product and talk say: 'This thing good. I go put money for the business and take share. We go grow am big.'"),
    choices: () => [
      { label: T("Accept the investment", "Accept the money"), run: (q) => { const j = jobDef(q); if (!q.job || !j) return T("Nothing happened.", "Nothing happen."); q.job.rank = Math.min(q.job.rank + 1, j.ladder.length - 1); q.job.years = 0; q.flags.investorShare = true; bump(q, "stress", -3); return T(`He funds the next stage: ${j.ladder[q.job.rank].title}. But now he takes 12% of everything you earn.`, `He fund the next level: ${j.ladder[q.job.rank].title}. But now he don dey collect 12% of everything wey you make.`); } },
      { label: T("Decline and grow slowly", "Refuse and grow small small"), run: (q) => { bump(q, "smarts", 1); return T("You keep full ownership. Slow and steady, but entirely yours.", "You keep the whole business. E slow small, but na your own."); } },
    ],
  },
  {
    id: "fire_outbreak",
    title: dual("Fire!", "Fire dey burn!"),
    weight: (p) => ((selfEmployed(p) || p.houses.length > 0) ? 1.2 * (1.5 - p.luck / 100) : 0),
    text: (p) => (selfEmployed(p) ? T("At 2am your phone rings: fire has burnt the whole market row. Your shop is inside.", "2am your phone ring: fire don burn the whole market row. Your shop dey inside.") : T("A power surge starts a fire in the neighbourhood. Smoke is rising from your side.", "Light surge cause fire for your area. Smoke dey rise from your side.")),
    choices: (p) => {
      const loss = I(p, rand(400_000, 1_500_000));
      return [
        { label: insured(p) ? T("File your insurance claim", "Go claim insurance") : T("Count the loss", "Count your loss"), sub: naira(insured(p) ? loss * 0.2 : loss), run: (q) => { const l = insured(q) ? loss * 0.2 : loss; q.money -= l; bump(q, "stress", insured(q) ? 4 : 12); return insured(q) ? T(`The insurance covers most of it. You pay only ${naira(l)}. Smart move.`, `Insurance cover most of am. You pay only ${naira(l)}. Wise move.`) : T(`You lose ${naira(l)}. No insurance, no help. That is how it is.`, `You lose ${naira(l)}. No insurance, nobody to help. Na so e be.`); } },
        { label: T("Rebuild with family help", "Rebuild with family help"), disabled: p.family.happy < 40 ? T("Family not on speaking terms", "Family no dey talk to you") : false, run: (q) => { const l = loss * 0.6; q.money -= l; q.family.happy = clamp(q.family.happy - 4); return T(`Family chips in, but you still lose ${naira(l)}.`, `Family chip in, but you still lose ${naira(l)}.`); } },
      ];
    },
  },
  {
    id: "insurance_offer",
    title: dual("Insurance agent", "Insurance agent"),
    weight: (p) => (adult(p) && p.money > I(p, 1_500_000) && !insured(p) ? 2 : 0),
    text: () => T("A polite agent visits: 'Sir/Madam, one small premium and your shop, house and health are covered for five years. Accidents do not come with a date.'", "One polite agent visit you: 'Oga/Madam, pay one small premium and your shop, house and health go dey covered for five years. Accident no get date.'"),
    choices: (p) => [
      { label: T("Buy the five-year cover", "Buy the five-year cover"), sub: naira(I(p, 300_000)), disabled: p.money < I(p, 300_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 300_000); q.flags.insuredUntil = q.age + 5; bump(q, "stress", -3); return T("You sign. Whatever happens next, you will not start from zero.", "You sign. Whatever happen next, you no go start from zero."); } },
      { label: T("No, God is in control", "No o, God dey in control"), run: (q) => { bump(q, "smarts", -1); return T("You trust fate more than paper. Fate sometimes disagrees.", "You trust God pass paper. Sometimes fate no agree."); } },
    ],
  },
  {
    id: "hospital_surprise",
    title: dual("Surprise medical bill", "Hospital bill don land"),
    weight: (p) => (adult(p) ? 1.3 * (1.4 - p.luck / 100) : 0),
    text: () => T("A scan, some tests, two nights on admission: the hospital hands you a bill that looks like a phone number.", "One scan, some tests, two night for admission: hospital hand you bill wey long like phone number."),
    choices: (p) => {
      const bill = I(p, rand(250_000, 1_200_000));
      return [
        { label: insured(p) ? T("Use your health cover", "Use your health insurance") : T("Pay it", "Pay am"), sub: naira(insured(p) ? bill * 0.2 : bill), run: (q) => { const b = insured(q) ? bill * 0.2 : bill; q.money -= b; bump(q, "health", 6); return insured(q) ? T(`Your cover pays most of it. You pay only ${naira(b)}.`, `Your cover pay most of am. You pay only ${naira(b)}.`) : T(`You pay ${naira(b)}. Health is wealth, but wealth is not cheap.`, `You pay ${naira(b)}. Health na wealth, but wealth no cheap.`); } },
        { label: T("Negotiate and pay in instalments", "Beg and pay small small"), run: (q) => { q.debt += bill * 1.2; bump(q, "stress", 6); return T("The hospital agrees, with interest. The debt follows you home.", "Hospital agree, but with interest. The debt follow you reach house."); } },
      ];
    },
  },
  {
    id: "raffle_win",
    title: dual("Jackpot?", "Jackpot?"),
    weight: (p) => (adult(p) ? 0.18 * (p.luck / 50) : 0),
    text: () => T("A telco SMS: 'Congratulations! You have won the monthly raffle.' This time, it is real. They call you back to verify.", "Telco send SMS: 'Congratulations! You have won the monthly raffle.' This time, na real one. Dem even call you back to verify."),
    choices: () => [
      { label: T("Claim the prize", "Go collect the prize"), run: (q) => { const g = I(q, rand(500_000, 4_000_000)); q.money += g; bump(q, "happiness", 12); return T(`You win ${naira(g)}! Nobody believes you until the alert comes in.`, `You win ${naira(g)}! Nobody believe you until alert enter.`); } },
    ],
  },
];
