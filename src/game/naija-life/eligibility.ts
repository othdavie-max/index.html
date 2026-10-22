import type { Player } from "./types";

type Need = "phone" | "smartphone" | "laptop" | "job" | "noJob" | "spouse" | "house" | "school";

interface Gate {
  minAge?: number;
  maxAge?: number;
  needs?: Need[];
}

/**
 * Every random event is adult-only unless it appears here with a lower minimum age.
 * This keeps children away from adult life and requires possessions where they matter.
 */
const GATES: Record<string, Gate> = {
  // Childhood and school
  teacher_flog: { minAge: 6, maxAge: 16, needs: ["school"] },
  inter_house: { minAge: 8, maxAge: 17, needs: ["school"] },
  extra_lessons: { minAge: 8, maxAge: 17, needs: ["school"] },
  waec_cheat: { minAge: 15, maxAge: 18, needs: ["school"] },
  cult: { minAge: 17, needs: ["school"] },
  fees_trouble: { minAge: 16, needs: ["school"] },
  hospital: { minAge: 0 },
  mama_put: { minAge: 13 },
  apprenticeship: { minAge: 14, maxAge: 22 },
  owambe_invite: { minAge: 16 },
  love: { minAge: 16 },
  // Phone-dependent
  scam_text: { minAge: 12, needs: ["phone"] },
  twitter_trend: { minAge: 14, needs: ["smartphone"] },
  fake_job_offer: { minAge: 18, needs: ["phone"] },
  remote_job: { minAge: 20, needs: ["laptop"] },
  crowdfund: { minAge: 16, needs: ["phone"] },
  phone_stolen: { minAge: 12, needs: ["phone"] },
  // Teen-appropriate autos
  nepa: { minAge: 6 },
  fuel: { minAge: 10 },
  subsidy: { minAge: 12 },
  naira: { minAge: 12 },
  harmattan: { minAge: 3 },
  asuu: { minAge: 17, needs: ["school"] },
  kindness: { minAge: 6 },
  jollof: { minAge: 12 },
  eagles: { minAge: 8 },
  gist: { minAge: 10 },
  malaria: { minAge: 3 },
  rice_price: { minAge: 10 },
  flood: { minAge: 6 },
  up_nepa: { minAge: 8 },
  heat_wave: { minAge: 6 },
  pidgin_proverb: { minAge: 6 },
  nin: { minAge: 16 },
  agbero: { minAge: 16 },
  baby: { minAge: 18, needs: ["spouse"] },
  kids_school: { minAge: 18 },
  enrol_kids: { minAge: 18 },
  // Family and money events from the new systems
  bullying: { minAge: 8, maxAge: 17, needs: ["school"] },
  school_discipline: { minAge: 10, maxAge: 17, needs: ["school"] },
  report_card: { minAge: 8, maxAge: 18, needs: ["school"] },
  scholarship_offer: { minAge: 14, needs: ["school"] },
  weekend_job: { minAge: 13, maxAge: 17 },
  friend_remembers: { minAge: 14 },
  friend_wedding: { minAge: 20 },
  friend_success: { minAge: 20 },
  deployment: { minAge: 18, needs: ["job"] },
  retire_option: { minAge: 38, needs: ["job"] },
  friend_request: { minAge: 14 },
  friend_help: { minAge: 14 },
  sibling_ask: { minAge: 14 },
  unexpected_inheritance: { minAge: 22 },
  boarding_incident: { minAge: 10, maxAge: 18, needs: ["school"] },
  support_reply: { minAge: 0 },
  kid_sick: { minAge: 18 },
  kid_trouble: { minAge: 18 },
  kid_talent: { minAge: 18 },
  kid_asks_money: { minAge: 30 },
  ponzi_offer: { minAge: 20 },
  relative_wedding: { minAge: 18 },
  relative_medical: { minAge: 18 },
  relative_school_fees: { minAge: 20 },
  relative_business: { minAge: 22 },
  relative_levy: { minAge: 22 },
  promotion_board: { minAge: 18, needs: ["job"] },
};

const has = (p: Player, n: Need): boolean => {
  switch (n) {
    case "phone": return p.possessions.phone;
    case "smartphone": return p.possessions.smartphone;
    case "laptop": return p.possessions.laptop;
    case "job": return Boolean(p.job);
    case "noJob": return !p.job;
    case "spouse": return Boolean(p.spouse);
    case "house": return p.houses.length > 0;
    case "school": return Boolean(p.school);
  }
};

/** True when the event may be offered to this character right now. */
/** While locked up, only events that can happen inside a prison fire. */
const PRISON_EVENTS_OK = new Set(["jail_inside", "prison_bribe", "prison_visit", "medical_care", "emergency_response", "follow_up", "court_trial", "bail_decision", "loan_due", "funeral"]);

export function eligible(p: Player, id: string): boolean {
  if (p.prison > 0) return PRISON_EVENTS_OK.has(id);
  const gate = GATES[id] ?? { minAge: 18 };
  if (gate.minAge !== undefined && p.age < gate.minAge) return false;
  if (gate.maxAge !== undefined && p.age > gate.maxAge) return false;
  if (gate.needs && !gate.needs.every((n) => has(p, n))) return false;
  return true;
}
