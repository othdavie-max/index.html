import { I, bump } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, randInt } from "./util";
import { primaryProvider, capacityOf } from "./family";
import { campusPay } from "./campus";

export const POSTGRAD = [
  { id: "masters", en: "Master's degree", pcm: "Master's degree", years: 1 },
  { id: "phd", en: "PhD", pcm: "PhD", years: 3 },
] as const;

export function postgradBlock(p: Player, id: string): string | null {
  if (p.school) return T("You are already in school", "You dey school already");
  if (p.edu !== "tertiary") return T("You need a first degree", "You need first degree");
  if (p.age < 21 || p.age > 55) return T("Ages 21 to 55", "Age 21 to 55");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (id === "masters" && (p.flags.postgrad === "Masters" || p.flags.postgrad === "PhD")) return T("You already hold a Master's", "You don get Master's");
  if (id === "phd" && p.flags.postgrad !== "Masters") return T("Needs a Master's first", "You need Master's first");
  if (p.flags.postgrad === "PhD") return T("You already have a PhD", "You don get PhD");
  return null;
}

export function enrollPostgrad(p: Player, id: string): string {
  const def = POSTGRAD.find((x) => x.id === id);
  const b = postgradBlock(p, id);
  if (!def) return "";
  if (b) return b;
  p.school = { stage: "tertiary", yearsLeft: def.years, type: "postgrad" };
  p.flags.postgradTrack = def.id;
  p.flags.schoolType = "public";
  p.job = null;
  return T(`You enrol for a ${def.en} (${def.years} year${def.years > 1 ? "s" : ""}). Fees apply each term.`, `You register for ${def.pcm} (${def.years} year${def.years > 1 ? "s" : ""}). You go pay fees every term.`);
}

export function finishPostgrad(p: Player): string {
  const phd = p.flags.postgradTrack === "phd";
  p.flags.postgrad = phd ? "PhD" : "Masters";
  delete p.flags.postgradTrack;
  bump(p, "smarts", phd ? 5 : 3);
  bump(p, "reputation", phd ? 6 : 3);
  return phd ? T("You defend your thesis. You are now a doctor of philosophy.", "You defend your thesis. Na Dr. be your name now.") : T("You complete your Master's degree. Employers notice.", "You finish your Master's. Employers don notice.");
}

/** Extra pay for advanced degrees. */
export const degreeBonus = (p: Player) => (p.flags.postgrad === "PhD" ? 1.2 : p.flags.postgrad === "Masters" ? 1.1 : 1) * campusPay(p);

export const EDU_EVENTS: EventDef[] = [
  {
    id: "boarding_choice",
    title: dual("Day school or boarding?", "Day school or boarding?"),
    weight: () => 0,
    text: () => T("It is time for secondary school. Your family can send you to a day school near home, or to a boarding school with discipline and long holidays.", "Na time for secondary school. Your family fit put you for day school near house, or boarding school with strong discipline and long holiday."),
    choices: (p) => {
      const prov = primaryProvider(p);
      const afford = !prov || capacityOf(p, prov) > I(p, 300_000);
      return [
        { label: T("Day school", "Day school"), run: (q) => { q.flags.boarding = false; return T("You go to school in the morning and come home at night.", "You dey go school morning and dey come house night."); } },
        { label: T("Boarding school", "Boarding school"), sub: T("Higher fees, more independence", "Fees pass, but you go learn to stand"), disabled: afford ? false : T("Your family cannot afford it", "Your family no fit afford am"), run: (q) => {
          q.flags.boarding = true;
          const prov2 = primaryProvider(q);
          if (prov2) prov2.closeness = clamp(prov2.closeness - 4);
          bump(q, "smarts", 2);
          return T("You pack your trunk and bucket. Boarding house life begins.", "You pack your box and bucket. Boarding house life don start.");
        } },
      ];
    },
  },
  {
    id: "boarding_incident",
    title: dual("Boarding house wahala", "Boarding house wahala"),
    weight: (p) => (p.flags.boarding && p.school?.stage === "secondary" ? 3 : 0),
    text: () => T("Something goes wrong in the hostel: food shortage, a missing locker, or a senior who wants you to run his errands.", "Wahala dey hostel: food no dey, locker go missing, or senior wan make you dey run errand."),
    choices: (p) => [
      { label: T("Report to the house master", "Report to housemaster"), run: (q) => { bump(q, "reputation", 1); return chance(0.6) ? T("The house master sorts it out.", "Housemaster settle am.") : (bump(q, "stress", 3), T("Nothing changes, and some boys call you a snitch.", "Nothing change, some boys call you snitch.")); } },
      { label: T("Ask your parents to send provisions", "Ask your people send provision"), sub: naira(I(p, 40_000)), disabled: false, run: (q) => { const prov = primaryProvider(q); if (prov && capacityOf(q, prov) > I(q, 40_000)) { transact(q, { amount: 0, memo: true, reason: T("Parents sent provisions to boarding school", "Parents send provision for boarding school"), category: "family" }); bump(q, "happiness", 3); return T("A box of provisions arrives. You are the most popular boy or girl in the dorm.", "Box of provision land. You become most popular for hostel."); } return T("They cannot send much this term.", "Dem no fit send plenty this term."); } },
      { label: T("Stand up for yourself", "Stand your ground"), run: (q) => { if (chance(0.5 + q.stats.fitness / 300)) { bump(q, "reputation", 3); return T("The senior backs off. You earn respect.", "The senior comot. You gain respect."); } bump(q, "health", -2); bump(q, "stress", 4); return T("It does not go well. You learn a lesson.", "E no go well. You learn lesson."); } },
    ],
  },
];

void randInt;
