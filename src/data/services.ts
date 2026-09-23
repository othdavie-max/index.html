import type { Service } from "@/types";

export const services: Service[] = [
  {
    slug: "career-counselling",
    name: "Career Counselling",
    icon: "compass",
    shortDescription: "Clarity on the course and country that fit your goals.",
    description:
      "We start with you: your grades, budget, interests, and where you want your career to go. Our counsellors help you weigh countries, courses, and universities against your goals, not just a generic ranking list.",
    highlights: [
      "One-on-one sessions with a dedicated counsellor",
      "Course and country shortlist based on your profile",
      "Honest guidance on realistic budgets and timelines",
    ],
  },
  {
    slug: "admission-services",
    name: "Admission Services",
    icon: "graduation-cap",
    shortDescription: "End-to-end support through the university application process.",
    description:
      "From shortlisting universities to compiling documents and submitting applications, we manage the admission process with you so nothing is missed and every deadline is met.",
    highlights: [
      "Application strategy across multiple universities",
      "Statement of purpose and CV review",
      "Offer comparison and scholarship guidance",
    ],
  },
  {
    slug: "english-test-preparation",
    name: "English Test Preparation",
    icon: "open-book",
    shortDescription: "Structured prep for IELTS, TOEFL, PTE and Duolingo.",
    description:
      "Your English test score can decide which universities and visas are open to you. We help you prepare with structured practice, mock tests, and targeted feedback.",
    highlights: [
      "Diagnostic assessment to find your starting point",
      "Practice materials for IELTS, TOEFL, PTE and Duolingo",
      "Guidance on which test fits your target country",
    ],
  },
  {
    slug: "visa-assistance",
    name: "Visa Assistance",
    icon: "passport-control",
    shortDescription: "Careful, document-by-document visa application support.",
    description:
      "Visa applications are detail-heavy and unforgiving of mistakes. We help you understand requirements, prepare financial and supporting documents, and complete your application correctly.",
    highlights: [
      "Country-specific document checklists",
      "Proof of funds and financial documentation guidance",
      "Application review before submission",
      "Support for student visa applications to any destination you're considering, not just our popular ones",
    ],
  },
  {
    slug: "interview-preparation",
    name: "Interview Preparation",
    icon: "speaking-head",
    shortDescription: "Practice sessions for visa and admission interviews.",
    description:
      "Some visas and scholarships include an interview. We run mock interviews and give direct feedback so you walk in prepared and confident.",
    highlights: [
      "Mock interview sessions with feedback",
      "Common question banks by country",
      "Confidence-building coaching",
    ],
  },
];
