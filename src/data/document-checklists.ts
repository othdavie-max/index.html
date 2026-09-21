import type { StudyLevel } from "@/types";

export interface DocumentRequirement {
  id: string;
  label: string;
  required: boolean;
}

// Admin-editable in production. Adjust per level as Baseline's real
// requirements are confirmed.
export const documentChecklists: Record<StudyLevel, DocumentRequirement[]> = {
  foundation: [
    { id: "passport", label: "Passport data page", required: true },
    { id: "transcripts", label: "Academic transcripts / WAEC-NECO results", required: true },
    { id: "certificates", label: "School leaving certificate", required: true },
    { id: "cv", label: "CV / Resume", required: false },
    { id: "english-test", label: "English test result", required: false },
    { id: "reference-letter", label: "Reference letter", required: false },
  ],
  undergraduate: [
    { id: "passport", label: "Passport data page", required: true },
    { id: "transcripts", label: "Academic transcripts / WAEC-NECO results", required: true },
    { id: "certificates", label: "School leaving certificate", required: true },
    { id: "cv", label: "CV / Resume", required: false },
    { id: "english-test", label: "English test result", required: true },
    { id: "reference-letter", label: "Reference letter", required: true },
    { id: "sop", label: "Personal statement", required: true },
  ],
  masters: [
    { id: "passport", label: "Passport data page", required: true },
    { id: "transcripts", label: "Academic transcripts", required: true },
    { id: "certificates", label: "Degree certificate", required: true },
    { id: "cv", label: "CV / Resume", required: true },
    { id: "english-test", label: "English test result", required: true },
    { id: "reference-letter", label: "2 reference letters", required: true },
    { id: "sop", label: "Statement of purpose", required: true },
  ],
  phd: [
    { id: "passport", label: "Passport data page", required: true },
    { id: "transcripts", label: "Academic transcripts (all degrees)", required: true },
    { id: "certificates", label: "Degree certificates", required: true },
    { id: "cv", label: "Academic CV", required: true },
    { id: "english-test", label: "English test result", required: true },
    { id: "reference-letter", label: "3 reference letters", required: true },
    { id: "sop", label: "Research proposal", required: true },
  ],
};

export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_FILE_SIZE_MB = 10;
