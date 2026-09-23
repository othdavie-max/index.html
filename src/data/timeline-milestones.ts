import type { CountryCode, StudyLevel } from "@/types";

export interface Milestone {
  id: string;
  label: string;
  description: string;
  offsetDays: number; // days before the intake date this should be done by
}

// PLACEHOLDER offsets — sensible defaults, not guarantees. Confirm current
// processing times with us once you have a specific university/visa route.
// In production this mirrors the admin-editable `timeline_milestones` table.
const baseMilestones: Milestone[] = [
  { id: "research", label: "Research & shortlist universities", description: "Compare courses, tuition and entry requirements across your shortlisted countries.", offsetDays: 270 },
  { id: "english-test", label: "Book & sit your English test", description: "Results typically take 1–2 weeks and are needed for most applications.", offsetDays: 240 },
  { id: "documents", label: "Prepare documents", description: "Transcripts, certificates, CV, statement of purpose and reference letters.", offsetDays: 210 },
  { id: "applications", label: "Submit university applications", description: "Apply to your shortlisted universities before their deadlines.", offsetDays: 180 },
  { id: "offers", label: "Receive & compare offers", description: "Review conditions, scholarships, and decide which offer to accept.", offsetDays: 120 },
  { id: "deposit", label: "Pay deposit & get confirmation letter", description: "Secure your place and receive the document your visa application needs.", offsetDays: 100 },
  { id: "funds", label: "Arrange proof of funds", description: "Ensure funds are held for the required period before you apply for your visa.", offsetDays: 90 },
  { id: "visa", label: "Submit visa application", description: "Complete your application with all required supporting documents.", offsetDays: 60 },
  { id: "accommodation", label: "Arrange accommodation", description: "Book university halls or private accommodation ahead of arrival.", offsetDays: 45 },
  { id: "travel", label: "Book travel & prepare to fly", description: "Flights, pre-departure briefing, and final packing checklist.", offsetDays: 14 },
];

const visaLabelByCountry: Partial<Record<CountryCode, string>> = {
  uk: "Submit visa application (after receiving your CAS)",
  usa: "Submit visa application (after receiving your I-20 & SEVIS payment)",
  australia: "Submit visa application (after receiving your CoE)",
  canada: "Submit study permit application",
  ireland: "Submit visa/immigration permission application",
  germany: "Submit visa application (with blocked account confirmation)",
};

const visaOffsetByCountry: Partial<Record<CountryCode, number>> = {
  uk: 60,
  usa: 100,
  australia: 70,
  canada: 65,
  ireland: 55,
  germany: 85,
};

export function getMilestones(country: CountryCode, level: StudyLevel): Milestone[] {
  return baseMilestones.map((m) => {
    if (m.id === "visa") {
      return { ...m, label: visaLabelByCountry[country] ?? m.label, offsetDays: visaOffsetByCountry[country] ?? m.offsetDays };
    }
    if (m.id === "documents" && level === "phd") {
      return { ...m, label: "Prepare documents & research proposal", description: "Transcripts, certificates, CV, research proposal and reference letters." };
    }
    return m;
  });
}
