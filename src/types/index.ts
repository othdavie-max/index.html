export type CountryCode = "uk" | "ireland" | "germany" | "canada" | "usa" | "australia";

export type StudyLevel = "foundation" | "undergraduate" | "masters" | "phd";

export type EnglishTest = "ielts" | "toefl" | "pte" | "duolingo" | "none";

export interface Destination {
  code: CountryCode;
  name: string;
  flag: string;
  slug: string;
  heroTagline: string;
  summary: string;
  topCourses: string[];
  tuitionRangeNgnPerYear: [number, number];
  livingCostsNgnPerYear: [number, number];
  intakes: string[];
  postStudyWork: string;
  visaNotes: string;
  currency: string;
  minGradePercent: number; // rough academic threshold used by the matcher
  requiredEnglishBand: string;
  mapCoords: [number, number]; // [longitude, latitude]
}

export interface Service {
  slug: string;
  name: string;
  icon: string;
  shortDescription: string;
  description: string;
  highlights: string[];
}

export interface Partner {
  slug: string;
  name: string;
  country: CountryCode;
  logoPlaceholder: string;
  overview: string;
  popularCourses: string[];
  intakes: string[];
}

export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoPlaceholder: string;
}

export interface FaqItem {
  id: string;
  category: "Costs" | "Visas" | "Admissions" | "English Tests" | "Scholarships" | "Working Abroad";
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  course: string;
  university: string;
  country: CountryCode;
  visaApproved: boolean;
  consentGiven: boolean;
  videoUrl?: string;
  photoPlaceholder: string;
  quote: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTimeMinutes: number;
  coverPlaceholder: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  fileUrl: string;
  pageCount?: number;
}

export type LeadSource =
  | "course-matcher"
  | "ai-chat"
  | "guide-download"
  | "contact"
  | "booking"
  | "newsletter"
  | "timeline-planner"
  | "application";

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: "New" | "Contacted" | "In progress" | "Converted" | "Closed";
  notes: string | null;
  payload: Record<string, unknown>;
}
