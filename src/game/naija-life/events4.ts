import { I, bump, eligibleJobs, jobDef, luckBonus } from "./helpers";
import type { EventDef, Player } from "./types";
import { chance, clamp, naira, rand } from "./util";

const adult = (p: Player) => p.age >= 18;
const selfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const insured = (p: Player) => Number(p.flags.insuredUntil ?? 0) > p.age;

/** Events driven by luck and by smart decisions. */
export const EVENTS4: EventDef[] = [
  {
    id: "old_friend",
    title: "Old friend resurfaces",
    weight: (p) => (adult(p) ? 1.6 * (0.5 + p.luck / 100) : 0),
    text: () => "You bump into an old classmate at a wedding. He now dey work for a big company and still remember you well: 'Ah! Na you? Wetin you dey do these days? Make we talk.'",
    choices: (p) => [
      { label: "Ask for a job referral", disabled: p.job ? "You already get work" : false, run: (q) => { const options = eligibleJobs(q).filter((j) => j.group === "formal"); if (options.length && chance(0.45 + luckBonus(q))) { const j = options[0]; q.job = { id: j.id, rank: 0, years: 0 }; bump(q, "connections", 3); return `He walk your CV through the door. You land a job as ${j.ladder[0].title}.`; } bump(q, "connections", 2); return "He promise to 'look into it' and then go silent. Na so e dey be."; } },
      { label: "Ask him to invest in your hustle", disabled: !selfEmployed(p) ? "You need a business" : false, run: (q) => { if (chance(0.4 + luckBonus(q))) { const g = I(q, rand(300_000, 1_500_000)); q.money += g; bump(q, "connections", 3); return `He put ${naira(g)} into your business, no strings. Good friend.`; } bump(q, "reputation", -1); return "He laugh nervously and change the topic."; } },
      { label: "Just catch up and exchange numbers", run: (q) => { bump(q, "connections", 4); bump(q, "happiness", 4); return "Good gist, good jollof, good connection. You never know."; } },
    ],
  },
  {
    id: "tender",
    title: "Supply contract",
    weight: (p) => (adult(p) && (selfEmployed(p) || p.stats.smarts >= 55) && p.money > I(p, 800_000) ? 1.8 : 0),
    text: () => "The local government advertise a small supply contract (stationery, food, or repairs). An insider whisper to you: 'Bid properly or pay processing fee. Your choice.'",
    choices: (p) => [
      { label: "Bid with proper documents", sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 150_000); if (chance(0.18 + q.stats.connections / 300 + q.stats.smarts / 450 + luckBonus(q))) { const g = I(q, rand(1_500_000, 5_000_000)); q.money += g; bump(q, "reputation", 4); return `Your clean bid win! Contract payout: ${naira(g)} (after delays, of course).`; } bump(q, "stress", 4); return "You lose to a company that no one has ever heard of. Typical."; } },
      { label: "Pay the 'processing fee' to the insider", sub: naira(I(p, 500_000)), disabled: p.money < I(p, 500_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 500_000); if (chance(0.12)) { bump(q, "reputation", -12); return "Whistleblower expose the arrangement. You lose the money and the contract."; } if (chance(0.55 + luckBonus(q))) { const g = I(q, rand(1_500_000, 5_000_000)); q.money += g; bump(q, "reputation", -3); return `Contract awarded! You collect ${naira(g)}. Nobody ask how.`; } return "The 'fee' disappear along with the insider's phone number."; } },
      { label: "Skip it", run: () => "You let this one pass. Tenders no dey run from Naija." },
    ],
  },
  {
    id: "investor_pitch",
    title: "An investor visits",
    weight: (p) => (selfEmployed(p) && (p.job?.rank ?? 0) >= 1 && p.stats.smarts >= 40 ? 1.4 : 0),
    text: () => "A well-dressed man try your product and say: 'This thing good. I go put money for the business and take a share. We go grow am big.'",
    choices: () => [
      { label: "Accept the investment", run: (q) => { const j = jobDef(q); if (!q.job || !j) return "Nothing happened."; q.job.rank = Math.min(q.job.rank + 1, j.ladder.length - 1); q.job.years = 0; q.flags.investorShare = true; bump(q, "stress", -3); return `He fund the next stage: ${j.ladder[q.job.rank].title}. But now he take 12% of everything you earn.`; } },
      { label: "Decline and grow slowly", run: (q) => { bump(q, "smarts", 1); return "You keep full ownership. Slow and steady, but entirely yours."; } },
    ],
  },
  {
    id: "fire_outbreak",
    title: "Fire!",
    weight: (p) => ((selfEmployed(p) || p.houses.length > 0) ? 1.2 * (1.5 - p.luck / 100) : 0),
    text: (p) => (selfEmployed(p) ? "At 2am your phone ring: fire don burn the whole market row. Your shop dey inside." : "A power surge start a fire in the neighbourhood. Smoke dey rise from your side."),
    choices: (p) => {
      const loss = I(p, rand(400_000, 1_500_000));
      return [
        { label: insured(p) ? "File your insurance claim" : "Count the loss", sub: naira(insured(p) ? loss * 0.2 : loss), run: (q) => { const l = insured(q) ? loss * 0.2 : loss; q.money -= l; bump(q, "stress", insured(q) ? 4 : 12); return insured(q) ? `The insurance cover most of it. You pay only ${naira(l)}. Smart move.` : `You lose ${naira(l)}. No insurance, no help. Na so e be.`; } },
        { label: "Rebuild with family help", disabled: p.family.happy < 40 ? "Family no dey talk" : false, run: (q) => { const l = loss * 0.6; q.money -= l; q.family.happy = clamp(q.family.happy - 4); return `Family chip in, you still lose ${naira(l)}.`; } },
      ];
    },
  },
  {
    id: "insurance_offer",
    title: "Insurance agent",
    weight: (p) => (adult(p) && p.money > I(p, 1_500_000) && !insured(p) ? 2 : 0),
    text: () => "A polite agent visit: 'Oga/Madam, one small premium and your shop, house and health go dey covered for five years. Accident no get date.'",
    choices: (p) => [
      { label: "Buy the five-year cover", sub: naira(I(p, 300_000)), disabled: p.money < I(p, 300_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 300_000); q.flags.insuredUntil = q.age + 5; bump(q, "stress", -3); return "You sign. Whatever happen next, you no go start from zero."; } },
      { label: "No, God is in control", run: (q) => { bump(q, "smarts", -1); return "You trust fate more than paper. Fate sometimes disagree."; } },
    ],
  },
  {
    id: "hospital_surprise",
    title: "Surprise medical bill",
    weight: (p) => (adult(p) ? 1.3 * (1.4 - p.luck / 100) : 0),
    text: () => "A scan, some tests, two nights admission: the hospital hand you a bill that look like a phone number.",
    choices: (p) => {
      const bill = I(p, rand(250_000, 1_200_000));
      return [
        { label: insured(p) ? "Use your health cover" : "Pay it", sub: naira(insured(p) ? bill * 0.2 : bill), run: (q) => { const b = insured(q) ? bill * 0.2 : bill; q.money -= b; bump(q, "health", 6); return insured(q) ? `Your cover pay most of it. You pay only ${naira(b)}.` : `You pay ${naira(b)}. Health is wealth, but wealth no be small.`; } },
        { label: "Negotiate and pay in instalments", run: (q) => { q.debt += bill * 1.2; bump(q, "stress", 6); return "The hospital agree, with interest. The debt follow you home."; } },
      ];
    },
  },
  {
    id: "raffle_win",
    title: "Jackpot?",
    weight: (p) => (adult(p) ? 0.18 * (p.luck / 50) : 0),
    text: () => "A telco SMS: 'Congratulations! You have won the monthly raffle.' This time, na real. They call you back to verify.",
    choices: () => [
      { label: "Claim the prize", run: (q) => { const g = I(q, rand(500_000, 4_000_000)); q.money += g; bump(q, "happiness", 12); return `You win ${naira(g)}! Nobody believe you until the alert enter.`; } },
    ],
  },
];
