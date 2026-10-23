import { I, bump } from "./helpers";
import { GATES } from "./eligibility";
import { SKILLS, skillLevel, skillTier, skillTopPct } from "./life";
import { transact } from "./ledger";
import type { EventDef, Player } from "./types";
import { T, chance, dual, naira, rand } from "./util";

GATES.skill_gig = { minAge: 14 };
GATES.skill_contest = { minAge: 14 };

const best = (p: Player) => SKILLS.map((s) => ({ s, lv: skillLevel(p, s.id) })).sort((a, b) => b.lv - a.lv)[0];
const idOf = (p: Player, d: Record<string, string | number | boolean>) => SKILLS.find((x) => x.id === d.skill) ?? best(p).s;

/** People hire and challenge you when you are good at something. */
export const SKILL_EVENTS: EventDef[] = [
  {
    id: "skill_gig",
    title: dual("Someone wants your skill", "Person wan use your skill"),
    weight: (p) => (best(p).lv >= 40 ? 0.9 + best(p).lv / 80 : 0),
    init: (p) => ({ skill: best(p).s.id }),
    text: (p, d) => { const s = idOf(p, d); return T(`Word has spread that you are good at ${s.label.toLowerCase()}. A client offers you a paid gig.`, `Word don waka say you sabi ${s.label.toLowerCase()}. Client offer you paid gig.`); },
    choices: (p, d) => {
      const s = idOf(p, d);
      const lv = skillLevel(p, s.id);
      const pay = Math.round(lv * 14_000);
      return [
        { label: T(`Take the gig (${naira(I(p, pay))})`, `Take the gig (${naira(I(p, pay))})`), run: (q) => { transact(q, { amount: I(q, pay) * rand(0.8, 1.25), reason: T(`${s.label} gig`, `${s.label} gig`), category: "salary" }); q.skills[s.id] = Math.min(100, (q.skills[s.id] ?? 0) + 1); bump(q, "reputation", 1); bump(q, "stress", 2); return T("The client is happy and recommends you to others.", "Client happy and e recommend you to others."); } },
        { label: T("Charge double", "Charge double"), run: (q) => { if (chance(0.35 + lv / 250)) { transact(q, { amount: I(q, pay) * 2, reason: T(`${s.label} gig (premium)`, `${s.label} gig (premium)`), category: "salary" }); bump(q, "reputation", 2); return T("They pay without blinking. You are clearly worth it.", "Dem pay without blinking. You dey worth am."); } bump(q, "reputation", -1); return T("They hire someone cheaper. Pride is expensive.", "Dem hire cheaper person. Pride dey cost."); } },
        { label: T("Decline", "Decline"), run: () => T("You are busy with your own life.", "You dey busy with your life.") },
      ];
    },
  },
  {
    id: "skill_contest",
    title: dual("National competition", "National competition"),
    weight: (p) => (best(p).lv >= 70 ? 0.7 : 0),
    init: (p) => ({ skill: best(p).s.id }),
    text: (p, d) => { const s = idOf(p, d); const l = skillLevel(p, s.id); return T(`A national ${s.label.toLowerCase()} competition is coming. At level ${Math.round(l)} you are ${skillTier(l).en.toLowerCase()}, around the top ${skillTopPct(l)}% in the country.`, `National ${s.label.toLowerCase()} competition dey come. For level ${Math.round(l)} you be ${skillTier(l).pcm.toLowerCase()}, near top ${skillTopPct(l)}% for the country.`); },
    choices: (p, d) => {
      const s = idOf(p, d);
      const lv = skillLevel(p, s.id);
      return [
        { label: T("Enter and give it everything", "Enter and give am everything"), sub: naira(I(p, 100_000)), disabled: p.money < I(p, 100_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => {
          transact(q, { amount: -I(q, 100_000), reason: T(`${s.label} competition entry`, `${s.label} competition entry`), category: "education" });
          if (chance(0.15 + (lv - 70) / 60)) { transact(q, { amount: I(q, 3_000_000), reason: T(`Won the ${s.label} competition`, `Win ${s.label} competition`), category: "salary" }); bump(q, "reputation", 8); bump(q, "happiness", 10); bump(q, "connections", 4); if (!q.achievements.includes(`${s.label} champion`)) q.achievements.push(`${s.label} champion`); return T("You WIN. Cameras, handshakes and sponsor calls.", "You WIN. Camera, handshake and sponsor call."); }
          bump(q, "reputation", 2); q.skills[s.id] = Math.min(100, (q.skills[s.id] ?? 0) + 2); return T("You place well and learn a lot from the winners.", "You do well and learn plenty from the winners.");
        } },
        { label: T("Skip it", "Skip am"), run: () => T("Not this year.", "No be this year.") },
      ];
    },
  },
];
