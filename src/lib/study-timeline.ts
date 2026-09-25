import { MONTHS, type Month, type StudyCountry } from "@/data/study-countries";
import type { CostLevel } from "@/lib/study-costs";

export type Phase = "Prepare" | "Apply" | "Accept & fund" | "Visa" | "Travel";
export const PHASES: Phase[] = ["Prepare", "Apply", "Accept & fund", "Visa", "Travel"];

export type ProgressKey = "passport" | "shortlist" | "english" | "documents" | "applied" | "offer" | "funds";
export const PROGRESS_OPTIONS: { value: ProgressKey; label: string; description?: string }[] = [
  { value: "passport", label: "I have a valid international passport" },
  { value: "shortlist", label: "I've shortlisted universities" },
  { value: "english", label: "I have my English test result", description: "Or know my WAEC English is accepted" },
  { value: "documents", label: "My documents are ready", description: "Results, transcripts, statement, references" },
  { value: "applied", label: "I've submitted applications" },
  { value: "offer", label: "I have an offer" },
  { value: "funds", label: "My funds are ready for the visa" },
];

export interface Milestone {
  id: string;
  phase: Phase;
  label: string;
  detail: string;
  offsetDays: number;
  progressKey?: ProgressKey;
  essential?: boolean;
}

export interface TimelineItem extends Milestone {
  due: Date;
  status: "done" | "overdue" | "soon" | "upcoming";
}

const DAY = 86_400_000;

export function intakeDate(month: Month, year: number) {
  return new Date(year, MONTHS.indexOf(month), 1);
}

/** Days from applying to the course start that we treat as comfortable. */
export function comfortableLeadDays(c: StudyCountry) {
  return c.applyMonthsAhead * 30;
}

export function intakeOptions(c: StudyCountry, now: number) {
  const months = c.generic ? MONTHS : c.intakes;
  const start = new Date(now);
  const options: { month: Month; year: number; date: Date; daysAway: number }[] = [];
  for (let y = start.getFullYear(); y <= start.getFullYear() + 3; y++) {
    for (const m of months) {
      const date = intakeDate(m, y);
      const daysAway = Math.round((date.getTime() - now) / DAY);
      if (daysAway > 20 && daysAway < 365 * 2.5) options.push({ month: m, year: y, date, daysAway });
    }
  }
  return options.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function documentsDetail(level: CostLevel) {
  if (level === "phd")
    return "Degree certificates, official transcripts (request early: Nigerian universities can take weeks), CV, a research proposal and 2–3 academic references.";
  if (level === "masters" || level === "mba")
    return `Degree certificate, official transcripts (request early: Nigerian universities can take weeks), CV, statement of purpose and two references${
      level === "mba" ? ", plus evidence of work experience and GMAT if required" : ""
    }.`;
  return "WAEC/NECO results (with scratch cards for online verification), birth certificate, passport photos, a personal statement and a reference from your school.";
}

export function buildMilestones(c: StudyCountry, level: CostLevel, scholarships: boolean): Milestone[] {
  const apply = comfortableLeadDays(c);
  const visaSubmit = c.visa.weeks[1] * 7 + 21;
  const appointment = visaSubmit + c.visa.appointmentWaitWeeks * 7;
  const fundsHeld = c.id === "uk" ? 28 : 0;
  const acceptBy = appointment + fundsHeld + 35;

  const m: Milestone[] = [
    {
      id: "passport",
      phase: "Prepare",
      label: "Get or renew your international passport",
      detail: "Make sure it's valid for your whole course. Renewals with the Nigeria Immigration Service can take several weeks.",
      offsetDays: apply + 75,
      progressKey: "passport",
      essential: true,
    },
    {
      id: "shortlist",
      phase: "Prepare",
      label: "Research and shortlist universities",
      detail: `Compare courses, entry requirements and total costs. ${c.languageNote}`,
      offsetDays: apply + 60,
      progressKey: "shortlist",
    },
    {
      id: "english",
      phase: "Prepare",
      label: c.waecEnglishOften ? "Confirm your English requirement" : "Book and sit your English test",
      detail: c.waecEnglishOften
        ? `Many universities here accept a WAEC English credit. Otherwise: ${c.englishNote}`
        : `${c.englishNote} IELTS results take about 1–2 weeks; leave time for a retake.`,
      offsetDays: apply + 45,
      progressKey: "english",
      essential: true,
    },
    {
      id: "documents",
      phase: "Prepare",
      label: level === "phd" ? "Prepare documents and research proposal" : "Gather your application documents",
      detail: documentsDetail(level),
      offsetDays: apply + 30,
      progressKey: "documents",
      essential: true,
    },
    {
      id: "applications",
      phase: "Apply",
      label: "Submit your university applications",
      detail: c.deadlineNote ?? `Aim to apply about ${c.applyMonthsAhead} months before the course starts; popular courses fill early.`,
      offsetDays: apply,
      progressKey: "applied",
      essential: true,
    },
    {
      id: "offers",
      phase: "Apply",
      label: "Receive and compare offers",
      detail: "Check any conditions, scholarship awards and the total cost before you accept.",
      offsetDays: Math.max(apply - 75, acceptBy + 21),
      progressKey: "offer",
    },
    {
      id: "accept",
      phase: "Accept & fund",
      label: "Accept your offer and pay the deposit",
      detail: `You'll then receive your ${c.visa.confirmationDoc}, which your visa application needs. ${c.tuitionNote}`,
      offsetDays: acceptBy,
      essential: true,
    },
    {
      id: "funds",
      phase: "Accept & fund",
      label: c.id === "germany" ? "Open and fund your blocked account" : "Arrange your proof of funds",
      detail: `${c.visa.funds}${c.id === "uk" ? " The money must sit in the account for 28 consecutive days before you apply." : ""}`,
      offsetDays: appointment + fundsHeld + 14,
      progressKey: "funds",
      essential: true,
    },
  ];

  if (scholarships) {
    m.push({
      id: "scholarships",
      phase: "Prepare",
      label: "Apply for scholarships",
      detail: `${c.scholarshipNote} Many scholarships close 9–12 months before the course starts.`,
      offsetDays: Math.max(apply + 90, 330),
    });
  }
  if (level === "phd") {
    m.push({
      id: "supervisors",
      phase: "Prepare",
      label: "Contact potential supervisors",
      detail: "Email academics whose research matches yours, with a short proposal and CV.",
      offsetDays: apply + 90,
    });
  }
  if (c.visa.appointmentWaitWeeks >= 2) {
    m.push({
      id: "appointment",
      phase: "Visa",
      label: "Book your visa appointment",
      detail: `Appointments in Lagos and Abuja can take ${c.visa.appointmentWaitWeeks}+ weeks to get. Book as soon as you have your ${c.visa.confirmationDoc}.`,
      offsetDays: appointment,
    });
  }
  if (c.visa.medical) {
    m.push({
      id: "medical",
      phase: "Visa",
      label: c.visa.medical,
      detail: "Book with an approved clinic in Lagos or Abuja; results are needed for your application.",
      offsetDays: visaSubmit + 14,
    });
  }

  m.push(
    {
      id: "visa",
      phase: "Visa",
      label: `Apply for your ${c.visa.name}`,
      detail: `Processing usually takes ${c.visa.weeks[0]}–${c.visa.weeks[1]} weeks after your appointment.`,
      offsetDays: visaSubmit,
      essential: true,
    },
    {
      id: "decision",
      phase: "Visa",
      label: "Expect your visa decision",
      detail: "Don't book non-refundable flights before your visa is approved.",
      offsetDays: 21,
    },
    {
      id: "accommodation",
      phase: "Travel",
      label: "Secure your accommodation",
      detail: "University halls fill fast: apply as soon as you accept your offer, and have a back-up plan.",
      offsetDays: 45,
    },
    {
      id: "flight",
      phase: "Travel",
      label: "Book your flight",
      detail: "Aim to arrive a week or so before orientation.",
      offsetDays: 18,
    },
    {
      id: "predeparture",
      phase: "Travel",
      label: "Pre-departure checklist",
      detail: "Forex and a card that works abroad, original documents in your hand luggage, weather-appropriate clothing, and your Baseline pre-departure briefing.",
      offsetDays: 10,
    },
    {
      id: "arrive",
      phase: "Travel",
      label: "Arrive and register",
      detail: c.visa.arrival,
      offsetDays: 3,
    },
  );

  return m;
}

export function buildTimeline(milestones: Milestone[], intake: Date, now: number, done: Set<string>): TimelineItem[] {
  return milestones
    .map((m) => {
      const due = new Date(intake.getTime() - m.offsetDays * DAY);
      const daysUntil = (due.getTime() - now) / DAY;
      const status: TimelineItem["status"] = done.has(m.id) ? "done" : daysUntil < 0 ? "overdue" : daysUntil <= 30 ? "soon" : "upcoming";
      return { ...m, due, status };
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

export type Verdict = "on-track" | "tight" | "unrealistic";

/** Whether the chosen intake is achievable from where the student is today. */
export function assessFeasibility(c: StudyCountry, intake: Date, now: number, done: Set<string>): { verdict: Verdict; daysLeft: number; minimumDays: number } {
  const daysLeft = Math.round((intake.getTime() - now) / DAY);
  const visaDays = (c.visa.weeks[1] + c.visa.appointmentWaitWeeks) * 7 + 21 + (c.id === "uk" ? 28 : 0);
  const minimumDays = (done.has("applications") ? 0 : 45) + (done.has("offers") ? 0 : 30) + visaDays;
  if (daysLeft < minimumDays) return { verdict: "unrealistic", daysLeft, minimumDays };
  if (daysLeft < comfortableLeadDays(c) && !done.has("applications")) return { verdict: "tight", daysLeft, minimumDays };
  return { verdict: "on-track", daysLeft, minimumDays };
}
