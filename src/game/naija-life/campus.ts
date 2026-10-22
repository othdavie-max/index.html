import { I, bump, enterPrison } from "./helpers";
import { transact } from "./ledger";
import type { Campus, Player } from "./types";
import { T, chance, clamp, naira, rand, randInt } from "./util";
import { MAJOR_BY_ID, UNI_BY_ID, cutoffFor, majorsOf, offers, type Major, type Uni } from "./universities";
import { capacityOf, primaryProvider } from "./family";
import { schoolHousing } from "./world";

// ---------------------------------------------------------------------------
// JAMB and admission
// ---------------------------------------------------------------------------
export function jambBlock(p: Player): string | null {
  if (p.school) return T("Finish your current school first", "Finish your current school first");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (p.edu !== "secondary") return p.edu === "tertiary" ? T("You already have a degree", "You don get degree") : T("You need your secondary school certificate", "You need your secondary school certificate");
  if (p.age < 16 || p.age > 40) return T("Ages 16 to 40", "Age 16 to 40");
  if (p.campus && !p.campus.graduated) return T("You left a course earlier. Try again later.", "You drop one course before. Try again later.");
  if (p.flags.admOpen) return T("Admissions are already open", "Admission don already open");
  if (p.money < I(p, 12_000)) return T("Not enough cash for the form", "Cash no reach for the form");
  return null;
}

export function writeJamb(p: Player, cheat: boolean): string {
  const b = jambBlock(p);
  if (b) return b;
  transact(p, { amount: -I(p, cheat ? 40_000 : 12_000), reason: cheat ? T("JAMB form and 'expo'", "JAMB form and 'expo'") : T("JAMB form and CBT centre", "JAMB form and CBT centre"), category: "education" });
  if (cheat && chance(0.3)) {
    bump(p, "reputation", -12);
    return T("The centre was raided. JAMB blacklists your result.", "Dem raid the centre. JAMB blacklist your result.");
  }
  const score = Math.round(cheat ? randInt(230, 320) : clamp(110 + p.stats.smarts * 1.7 + rand(-25, 25), 100, 380));
  p.flags.admScore = score;
  p.flags.admOpen = 1;
  p.flags.admAge = p.age;
  return T(`You score ${score} in JAMB. Admissions are open: pick a university.`, `You score ${score} for JAMB. Admission don open: pick university.`);
}

export const openAdmission = (p: Player, score: number) => {
  p.flags.admScore = score;
  p.flags.admOpen = 1;
  p.flags.admAge = p.age;
};

export const uniFee = (p: Player, u: Uni, mj: Major) => Math.round(u.fee * mj.fee * Math.pow(p.index, 0.92));

/** Merit aid a university would offer, as a share of the fee. */
export function meritAid(p: Player, u: Uni, mj: Major): number {
  const score = Number(p.flags.admScore ?? 0);
  const over = score - cutoffFor(u, mj);
  if (u.kind === "private") return over >= 70 ? 1 : over >= 40 ? 0.5 : over >= 20 ? 0.25 : 0;
  return score >= 320 ? 0.3 : 0;
}

export type PayMode = "family" | "self" | "aid";

export function familyCanPay(p: Player, fee: number): boolean {
  const prov = primaryProvider(p);
  if (!prov || p.age >= 25 || p.fam.cutOff.includes("schoolFees")) return false;
  return capacityOf(p, prov) >= fee * 0.8;
}

export function enrolBlock(p: Player, u: Uni, mj: Major, pay: PayMode): string | null {
  if (!p.flags.admOpen) return T("Admissions are not open", "Admission no open");
  if (p.school) return T("You are already in school", "You dey school already");
  if (!offers(u, mj.id)) return T(`${u.short} does not offer this`, `${u.short} no dey offer this one`);
  const score = Number(p.flags.admScore ?? 0);
  const cut = cutoffFor(u, mj);
  if (score < cut) return T(`Cut-off is ${cut}. You scored ${score}`, `Cut-off na ${cut}. You score ${score}`);
  const fee = uniFee(p, u, mj);
  const aid = pay === "aid" ? meritAid(p, u, mj) : 0;
  if (pay === "aid" && aid <= 0) return T("No scholarship at your score", "No scholarship for your score");
  if (pay === "family" && !familyCanPay(p, fee * (1 - aid))) return T("Your family cannot afford it", "Your family no fit afford am");
  if (pay !== "family" && p.money < fee * (1 - aid) * 0.34) return T(`Keep at least ${naira(fee * (1 - aid) * 0.34)} for the first term`, `Keep at least ${naira(fee * (1 - aid) * 0.34)} for first term`);
  return null;
}

export function enrol(p: Player, uniId: string, majorId: string, pay: PayMode): string {
  const u = UNI_BY_ID[uniId];
  const mj = MAJOR_BY_ID[majorId];
  if (!u || !mj) return "";
  const b = enrolBlock(p, u, mj, pay);
  if (b) return b;
  const aid = pay === "aid" ? meritAid(p, u, mj) : 0;
  p.school = { stage: "tertiary", yearsLeft: mj.years, type: "university" };
  p.course = mj.field;
  p.flags.schoolType = u.kind === "private" ? (u.fee > 3_000_000 ? "elite" : "private") : "public";
  p.campus = { uni: u.id, major: mj.id, year: 1, payer: pay === "self" ? "self" : "family", aid, effort: 0, used: [], gpas: [], cgpa: 0, network: 6, lead: 0, clubs: [], sug: "none", siwes: false, offer: false, project: false, trouble: 0, strikes: 0 };
  p.stats.connections = clamp(p.stats.connections + 2);
  p.family.happy = clamp(p.family.happy + (["Medicine", "Law", "Engineering"].includes(mj.field) ? 8 : 2));
  delete p.flags.admOpen;
  schoolHousing(p, true);
  return T(`You are admitted into ${u.name} to study ${mj.label}. Welcome to campus life!`, `Dem admit you for ${u.name} to read ${mj.label}. Welcome to campus life!`);
}

// ---------------------------------------------------------------------------
// Life on campus
// ---------------------------------------------------------------------------
export const CLUBS: { id: string; en: string; pcm: string; blurb: string }[] = [
  { id: "press", en: "Campus press and radio", pcm: "Campus press and radio", blurb: "Smarts, reputation" },
  { id: "debate", en: "Debating society", pcm: "Debating society", blurb: "Smarts, leadership" },
  { id: "drama", en: "Drama and dance troupe", pcm: "Drama and dance troupe", blurb: "Happiness, leadership" },
  { id: "sports", en: "Sports team", pcm: "Sports team", blurb: "Fitness, happiness" },
  { id: "fellowship", en: "Campus fellowship", pcm: "Campus fellowship", blurb: "Calm, connections" },
  { id: "eclub", en: "Entrepreneurs' club", pcm: "Entrepreneurs' club", blurb: "Connections, leadership" },
  { id: "dept", en: "Course association", pcm: "Course association", blurb: "Connections, grades" },
];

export interface CampusOp { id: string; en: string; pcm: string; descEn: string; descPcm: string; }
export const CAMPUS_OPS: CampusOp[] = [
  { id: "study", en: "Study hard", pcm: "Read book well", descEn: "Boosts your grades. A bit stressful.", descPcm: "E go raise your grade. Small stress." },
  { id: "group", en: "Reading group", pcm: "Reading group", descEn: "Study with friends. Grades and connections.", descPcm: "Read with friends. Grade and connections." },
  { id: "party", en: "Party and network", pcm: "Party and network", descEn: "Big connections, big fun. Grades slip.", descPcm: "Plenty connections, plenty fun. Grade fit drop." },
  { id: "club", en: "Join a club", pcm: "Join a club", descEn: "Pick a club or society.", descPcm: "Pick club or society." },
  { id: "hustle", en: "Campus hustle", pcm: "Campus hustle", descEn: "Sell snacks, tutor or print projects.", descPcm: "Sell snacks, teach or print project." },
  { id: "dept", en: "Run for class rep", pcm: "Run for class rep", descEn: "Win a student office. Leadership grows.", descPcm: "Win student office. Leadership go grow." },
  { id: "sug", en: "Run for SUG president", pcm: "Run for SUG president", descEn: "The big one. Campaign money buys votes, not respect.", descPcm: "Na the big one. Campaign money dey buy votes." },
  { id: "siwes", en: "SIWES internship", pcm: "SIWES internship", descEn: "Industrial attachment. A job offer may follow.", descPcm: "Industrial attachment. Job offer fit follow." },
  { id: "project", en: "Final-year project", pcm: "Final-year project", descEn: "Big grade boost, big stress.", descPcm: "Big grade boost, big stress." },
  { id: "scholar", en: "Apply for a scholarship", pcm: "Apply for scholarship", descEn: "Cut your fees if you succeed.", descPcm: "Cut your fees if you win am." },
  { id: "sort", en: "'Sort' a lecturer", pcm: "'Sort' lecturer", descEn: "Pay for marks. Risky if caught.", descPcm: "Pay for marks. E hot if dem catch you." },
  { id: "confra", en: "Join a confraternity", pcm: "Join confraternity", descEn: "Connections and protection. Dangerous and frowned upon.", descPcm: "Connections and protection. E dangerous." },
];

const inCampus = (p: Player): p is Player & { campus: Campus } => Boolean(p.campus && !p.campus.graduated && p.school?.type === "university");
const yearsTotal = (c: Campus) => MAJOR_BY_ID[c.major]?.years ?? 4;

export function campusBlock(p: Player, op: string, arg?: string): string | null {
  if (!inCampus(p)) return T("Only for students", "Only for students");
  const c = p.campus;
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (c.used.includes(op)) return T("Already done this year", "You don do am this year");
  const total = yearsTotal(c);
  switch (op) {
    case "club": {
      if (c.clubs.length >= 3) return T("You are in three clubs already", "You don join three clubs");
      if (arg && c.clubs.includes(arg)) return T("Already a member", "You be member already");
      return null;
    }
    case "party": return p.money < I(p, 20_000) ? T("Not enough cash", "Cash no reach") : null;
    case "dept": return c.sug === "none" ? (p.money < I(p, 20_000) ? T("Not enough cash", "Cash no reach") : null) : T("You hold or have run for office", "You don hold or run for office");
    case "sug": {
      if (c.year < 2) return T("From second year", "From second year");
      if (c.sug === "won" || c.sug === "lost") return T("You have run already", "You don run before");
      const cost = I(p, arg === "high" ? 3_000_000 : 600_000);
      return p.money < cost ? T("Not enough cash for the campaign", "Cash no reach for campaign") : null;
    }
    case "siwes": return c.siwes ? T("Done already", "You don do am") : c.year < Math.max(2, total - 2) ? T("From the later years", "From the later years") : null;
    case "project": return c.project ? T("Done already", "You don do am") : c.year < total ? T("Final year only", "Final year only") : null;
    case "scholar": return c.aid >= 1 ? T("Fees fully covered", "Fees don cover finish") : null;
    case "sort": return p.money < I(p, 150_000) ? T("Not enough cash", "Cash no reach") : null;
    case "confra": return c.trouble >= 60 ? T("Too much on your record", "Too much for your record") : null;
    default: return null;
  }
}

export function campusDo(p: Player, op: string, arg?: string): string {
  const b = campusBlock(p, op, arg);
  if (b) return b;
  if (!inCampus(p)) return "";
  const c = p.campus;
  const u = UNI_BY_ID[c.uni];
  c.used.push(op);
  switch (op) {
    case "study": c.effort += 1.4; bump(p, "smarts", 1); bump(p, "stress", 6); bump(p, "happiness", -2); return T("You read until the generator goes off. Your notes are thick.", "You read till generator go off. Your notes don thick.");
    case "group": c.effort += 0.8; c.network = clamp(c.network + 3); bump(p, "happiness", 2); return T("The reading group splits the tough topics. You all pass together.", "Reading group share the hard topics. All of una go pass together.");
    case "party": {
      transact(p, { amount: -I(p, 20_000), reason: T("Campus parties and outings", "Campus parties and outings"), category: "personal" });
      c.effort -= 0.6; c.network = clamp(c.network + 6); c.trouble = clamp(c.trouble + 2); bump(p, "happiness", 7); bump(p, "health", -1);
      return T("Fresher's night, hostel jams and a lot of new numbers in your phone.", "Fresher's night, hostel jams and plenty new numbers for your phone.");
    }
    case "club": {
      const id = arg ?? "dept";
      c.clubs.push(id);
      if (id === "press") { bump(p, "smarts", 2); bump(p, "reputation", 2); c.lead = clamp(c.lead + 4); }
      else if (id === "debate") { bump(p, "smarts", 2); c.lead = clamp(c.lead + 8); }
      else if (id === "drama") { bump(p, "happiness", 5); c.lead = clamp(c.lead + 3); bump(p, "looks", 1); }
      else if (id === "sports") { bump(p, "fitness", 8); bump(p, "happiness", 3); }
      else if (id === "fellowship") { bump(p, "happiness", 3); bump(p, "reputation", 3); bump(p, "stress", -5); c.network = clamp(c.network + 3); }
      else if (id === "eclub") { c.network = clamp(c.network + 6); c.lead = clamp(c.lead + 5); }
      else { c.network = clamp(c.network + 5); c.effort += 0.6; }
      return T("You join and make real friends. It will show on your CV.", "You join and make real friends. E go show for your CV.");
    }
    case "hustle": {
      const amt = Math.round(I(p, 150_000) * rand(0.5, 1.5));
      transact(p, { amount: amt, reason: T("Campus hustle: snacks, tutoring and printing", "Campus hustle: snacks, tutoring and printing"), category: "business" });
      c.effort -= 0.3; c.network = clamp(c.network + 2); bump(p, "stress", 2);
      return T(`The hustle pays ${naira(amt)} this year. Your fees look friendlier.`, `The hustle pay ${naira(amt)} this year. Your fees look better.`);
    }
    case "dept": {
      transact(p, { amount: -I(p, 20_000), reason: T("Class rep campaign posters", "Class rep campaign posters"), category: "personal" });
      if (chance(clamp(0.35 + c.network / 200 + c.lead / 200 + p.stats.reputation / 300, 0.1, 0.85))) {
        c.sug = "deptRep"; c.lead = clamp(c.lead + 8); c.network = clamp(c.network + 6); bump(p, "reputation", 3);
        return T("You win! Class rep. Lecturers know your name now.", "You win! Class rep. Lecturers don know your name.");
      }
      bump(p, "stress", 4); c.lead = clamp(c.lead + 2);
      return T("You lose by a few votes. Next time.", "You lose by small votes. Next time.");
    }
    case "sug": {
      const high = arg === "high";
      transact(p, { amount: -I(p, high ? 3_000_000 : 600_000), reason: high ? T("SUG campaign: rallies, banners and 'logistics'", "SUG campaign: rallies, banners and 'logistics'") : T("SUG campaign: posters and a small rally", "SUG campaign: posters and small rally"), category: "personal" });
      const win = clamp(0.1 + c.network / 220 + c.lead / 180 + p.stats.reputation / 350 + (c.sug === "deptRep" ? 0.1 : 0) + (high ? 0.15 : 0) + (u?.prestige ?? 5) / 120, 0.05, 0.75);
      if (chance(win)) {
        c.sug = "won"; c.lead = clamp(c.lead + 25); c.network = clamp(c.network + 20); bump(p, "reputation", 10); bump(p, "connections", 10); bump(p, "stress", 8); c.effort -= 0.5;
        return T("You are the SUG president! Delegations, a big office and an even bigger network. Your name rings beyond campus.", "You be SUG president now! Delegations, big office and bigger network. Your name don pass campus.");
      }
      c.sug = "lost"; c.lead = clamp(c.lead + 4); bump(p, "reputation", -3); bump(p, "stress", 8);
      return T("You lose the SUG election. Rigging is alleged, but you also learn a lot.", "You lose the SUG election. Dem talk say rigging dey, but you learn plenty.");
    }
    case "siwes": {
      const stipend = I(p, 150_000);
      transact(p, { amount: stipend, reason: T("SIWES stipend", "SIWES stipend"), category: "salary" });
      c.siwes = true; c.network = clamp(c.network + 8); c.effort += 0.5; bump(p, "smarts", 2);
      if (chance(0.35 + c.effort / 20)) { c.offer = true; return T("You impress your supervisor. A job offer after graduation is on the table.", "You impress your supervisor. Job offer dey wait for you after school."); }
      return T("You learn real work and make useful contacts.", "You learn real work and make useful contacts.");
    }
    case "project": {
      c.project = true; c.effort += 2; bump(p, "stress", 10); bump(p, "smarts", 2);
      return T("You defend your project in front of the panel. Your supervisor nods.", "You defend your project for panel. Your supervisor nod.");
    }
    case "scholar": {
      if (chance(clamp(0.15 + p.stats.smarts / 200 + (c.gpas.length ? c.cgpa / 12 : 0.1), 0.05, 0.7))) {
        c.aid = Math.min(1, c.aid + 0.35); bump(p, "reputation", 2);
        return T("You win a scholarship! Your fees drop sharply.", "You win scholarship! Your fees don drop well well.");
      }
      return T("No luck this time. They gave it to someone with a godfather.", "No luck this time. Dem give person wey get godfather.");
    }
    case "sort": {
      transact(p, { amount: -I(p, 150_000), reason: T("'Sorting' a lecturer", "'Sorting' lecturer"), category: "other" });
      if (chance(0.72)) { c.effort += 1.6; c.trouble = clamp(c.trouble + 4); return T("Marks adjusted. Nobody asks questions.", "Dem adjust marks. Nobody ask question."); }
      c.trouble = clamp(c.trouble + 28); bump(p, "reputation", -8); bump(p, "stress", 10); c.effort -= 1;
      return T("The lecturer reports you to the senate. Your name is mud.", "Lecturer report you to senate. Your name don spoil.");
    }
    case "confra": {
      c.network = clamp(c.network + 14); c.trouble = clamp(c.trouble + 20); bump(p, "reputation", -4);
      const r = rand(0, 1);
      if (r < 0.12) return T(`You are arrested after a campus clash. ${enterPrison(p, 1)}`, `Dem arrest you after campus clash. ${enterPrison(p, 1)}`);
      if (r < 0.4) { bump(p, "health", -14); return T("A rival group jumps you. You survive, barely.", "Rival group jump you. You survive, just barely."); }
      return T("You are 'initiated'. Doors open, but a lot of people avoid you.", "Dem 'initiate' you. Doors open but plenty people dey avoid you.");
    }
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Grades and graduation
// ---------------------------------------------------------------------------
export function classOf(g: number): string {
  return g >= 4.5 ? "First Class" : g >= 3.5 ? "Second Class Upper" : g >= 2.4 ? "Second Class Lower" : g >= 1.5 ? "Third Class" : "Pass";
}

/** Called each year while a student. Returns false if the student is withdrawn. */
export function campusYearEnd(p: Player, lines: string[]): void {
  if (!inCampus(p)) return;
  const c = p.campus;
  const mj = MAJOR_BY_ID[c.major];
  const u = UNI_BY_ID[c.uni];
  if (!mj || !u) return;
  let effort = c.effort;
  if (c.year === yearsTotal(c) && !c.project) effort -= 0.5;
  const g = clamp(1.85 + (p.stats.smarts / 100) * 2.0 + effort * 0.32 - mj.hard * 0.9 + u.prestige * 0.02 + rand(-0.45, 0.45) - (p.stats.stress > 85 ? 0.2 : 0), 0, 5);
  c.gpas.push(Math.round(g * 100) / 100);
  c.cgpa = Math.round((c.gpas.reduce((s, x) => s + x, 0) / c.gpas.length) * 100) / 100;
  lines.push(T(`Year ${c.year} results: GPA ${g.toFixed(2)} (CGPA ${c.cgpa.toFixed(2)}, ${classOf(c.cgpa)} so far).`, `Year ${c.year} result: GPA ${g.toFixed(2)} (CGPA ${c.cgpa.toFixed(2)}, ${classOf(c.cgpa)} so far).`));
  if (c.year >= 2 && c.cgpa < 1) {
    lines.push(T("Your grades are too poor. The school asks you to withdraw.", "Your grades too poor. School ask you to withdraw."));
    p.school = null;
    (p as Player).campus = undefined;
    p.flags.droppedUni = 1;
    schoolHousing(p, false);
    return;
  }
  if (c.trouble >= 70 && chance(0.6) && p.school) {
    p.school.yearsLeft += 1;
    c.trouble = 40;
    lines.push(T("The senate suspends you for a year over your record.", "Senate suspend you for one year because of your record."));
  }
  if (u.kind !== "private" && p.school && p.school.yearsLeft > 1 && chance(0.2)) {
    p.school.yearsLeft += 1;
    c.strikes += 1;
    lines.push(T("An ASUU strike drags on for months. Graduation is pushed back a year.", "ASUU strike drag for months. Dem push your graduation back one year."));
  }
  c.year += 1;
  c.effort = 0;
  c.used = [];
}

export function graduateCampus(p: Player, lines: string[]): void {
  const c = p.campus;
  if (!c) return;
  const u = UNI_BY_ID[c.uni];
  const mj = MAJOR_BY_ID[c.major];
  const cgpa = c.gpas.length ? c.cgpa : 2.5;
  c.cls = classOf(cgpa);
  c.graduated = true;
  c.gradAge = p.age;
  p.flags.degreeClass = c.cls;
  bump(p, "connections", Math.round(c.network / 8));
  bump(p, "reputation", c.cls === "First Class" ? 6 : c.cls === "Second Class Upper" ? 3 : 0);
  if (c.sug === "won") bump(p, "reputation", 4);
  lines.push(T(`You graduate from ${u?.short ?? "university"} with a degree in ${mj?.label ?? "your course"}: ${c.cls} (CGPA ${cgpa.toFixed(2)}).`, `You graduate from ${u?.short ?? "university"} with degree for ${mj?.label ?? "your course"}: ${c.cls} (CGPA ${cgpa.toFixed(2)}).`));
  if (c.sug === "won") lines.push(T("Former SUG president: the political class has noticed you.", "Former SUG president: the political class don notice you."));
}

/** Lifetime pay edge from how you did at university. */
export function campusPay(p: Player): number {
  const c = p.campus;
  if (!c?.graduated) return 1;
  const k = c.cls === "First Class" ? 0.14 : c.cls === "Second Class Upper" ? 0.07 : c.cls === "Third Class" ? -0.04 : c.cls === "Pass" ? -0.08 : 0;
  return 1 + k + (UNI_BY_ID[c.uni]?.prestige ?? 5) * 0.008;
}

/** Edge in job interviews during the first years after graduating. */
export function campusHire(p: Player): number {
  const c = p.campus;
  if (!c?.graduated) return 0;
  const recent = p.age - (c.gradAge ?? p.age) <= 6;
  const k = (c.cls === "First Class" ? 0.1 : c.cls === "Second Class Upper" ? 0.05 : 0) + (UNI_BY_ID[c.uni]?.prestige ?? 5) * 0.008 + c.network / 500 + (c.offer && p.age - (c.gradAge ?? p.age) <= 2 ? 0.25 : 0);
  return recent ? k : k * 0.4;
}

/** Student politics carries into real politics. */
export function campusPolitics(p: Player): number {
  const c = p.campus;
  if (!c) return 0;
  return (c.sug === "won" ? 0.07 : c.sug === "deptRep" ? 0.02 : 0) + c.network / 1200;
}

export const campusLabel = (p: Player): string => {
  const c = p.campus;
  if (!c) return "";
  const mj = MAJOR_BY_ID[c.major];
  const u = UNI_BY_ID[c.uni];
  return `${mj?.label ?? ""}, ${u?.short ?? ""}`;
};

export { majorsOf };
