import { FIELDS, studyCountries, type FieldId, type StudyCountry, type StudyRegion } from "@/data/study-countries";
import { typicalAnnualCostNgn, type CostLevel } from "@/lib/study-costs";

export type EnglishBand = "not-taken" | "below-5.5" | "5.5" | "6.0-6.5" | "7.0+";
export type LanguageOpenness = "english-only" | "open" | "speaks-other";
export type StartWhen = "asap" | "6-12" | "12+" | "flexible";
export type Priority =
  | "low-cost"
  | "post-study-work"
  | "short-programme"
  | "scholarships"
  | "english-speaking"
  | "close-to-home"
  | "top-universities"
  | "work-while-studying"
  | "settle-long-term"
  | "nigerian-community";

export interface MatcherAnswers {
  level: CostLevel;
  field: FieldId | "undecided";
  grade: string;
  english: EnglishBand;
  languageOpenness: LanguageOpenness;
  budgetNgn: number;
  priorities: Priority[];
  start: StartWhen;
  regions: StudyRegion[];
}

export const PRIORITY_LABELS: Record<Priority, { label: string; description: string }> = {
  "low-cost": { label: "Lowest total cost", description: "Tuition plus living costs" },
  "post-study-work": { label: "Work after graduating", description: "A post-study work visa" },
  "short-programme": { label: "Finish faster", description: "e.g. one-year Master's" },
  scholarships: { label: "Scholarship chances", description: "Government or university awards" },
  "english-speaking": { label: "English-speaking country", description: "Everyday life in English" },
  "close-to-home": { label: "Close to Nigeria", description: "Shorter, cheaper trips home" },
  "top-universities": { label: "Top-ranked universities", description: "Global reputation" },
  "work-while-studying": { label: "Part-time work", description: "Earn while you study" },
  "settle-long-term": { label: "Path to settle long-term", description: "Residency options later" },
  "nigerian-community": { label: "Nigerian community", description: "Friends, food, church and support" },
};

export const SCHOOL_LEVELS: CostLevel[] = ["foundation", "undergraduate", "medicine"];

export const GRADE_OPTIONS: Record<"school" | "postgrad" | "research", { value: string; label: string; description?: string; percent: number }[]> = {
  school: [
    { value: "school-a", label: "Mostly A1–B3", description: "Strong WAEC/NECO: 5+ credits including English & Maths", percent: 75 },
    { value: "school-c", label: "Mostly credits (B2–C6)", description: "5 credits including English & Maths", percent: 60 },
    { value: "school-alevel", label: "A-levels, JUPEB or IB", description: "On top of WAEC/NECO", percent: 72 },
    { value: "school-missing", label: "Missing English or Maths credit", description: "Or fewer than 5 credits", percent: 42 },
    { value: "school-awaiting", label: "Still writing / awaiting results", percent: 60 },
  ],
  postgrad: [
    { value: "pg-first", label: "First Class", description: "70%+ or CGPA 4.5+/5", percent: 78 },
    { value: "pg-21", label: "Second Class Upper", description: "60–69% or CGPA 3.5–4.49", percent: 65 },
    { value: "pg-22", label: "Second Class Lower", description: "50–59% or CGPA 2.4–3.49", percent: 55 },
    { value: "pg-third", label: "Third Class, Pass or HND", description: "Some universities accept these with work experience", percent: 45 },
  ],
  research: [
    { value: "phd-distinction", label: "Master's with Distinction or Merit", percent: 78 },
    { value: "phd-pass", label: "Master's with a Pass", percent: 62 },
    { value: "phd-first", label: "Strong first degree only", description: "First Class or Second Class Upper", percent: 66 },
    { value: "phd-other", label: "Other", percent: 50 },
  ],
};

export function gradeGroup(level: CostLevel): "school" | "postgrad" | "research" {
  if (SCHOOL_LEVELS.includes(level)) return "school";
  return level === "phd" ? "research" : "postgrad";
}

export interface MatchFactor {
  id: "budget" | "academic" | "language" | "field" | "priorities" | "timing";
  label: string;
  score: number;
  weight: number;
}

export interface MatchResult {
  country: StudyCountry;
  score: number;
  factors: MatchFactor[];
  strengths: string[];
  watchOuts: string[];
  annualCostNgn: number;
  lowCostNgn: number;
}

const WEIGHTS = { budget: 30, academic: 15, language: 15, field: 10, priorities: 20, timing: 10 };
const RATING = [30, 65, 100];
const BAND_VALUE: Record<EnglishBand, number | null> = { "not-taken": null, "below-5.5": 5, "5.5": 5.5, "6.0-6.5": 6.25, "7.0+": 7.25 };
const START_MONTHS: Record<StartWhen, number> = { asap: 6, "6-12": 12, "12+": 18, flexible: 24 };

function formatMillions(ngn: number) {
  return `₦${(ngn / 1_000_000).toFixed(ngn >= 10_000_000 ? 0 : 1)}m`;
}

export function priorityScore(c: StudyCountry, p: Priority, level: CostLevel, annualCostNgn: number): number {
  switch (p) {
    case "low-cost":
      return annualCostNgn < 12e6 ? 100 : annualCostNgn < 20e6 ? 85 : annualCostNgn < 30e6 ? 65 : annualCostNgn < 45e6 ? 45 : annualCostNgn < 65e6 ? 30 : 15;
    case "post-study-work":
      return c.pswMonths >= 24 ? 100 : c.pswMonths >= 12 ? 80 : c.pswMonths >= 6 ? 55 : 20;
    case "short-programme":
      if (level === "masters" || level === "mba") return c.years.masters <= 1 ? 100 : 50;
      if (level === "undergraduate") return c.years.undergraduate <= 3 ? 100 : 55;
      return 70;
    case "scholarships":
      return RATING[c.ratings.scholarships];
    case "english-speaking":
      return c.language === "english" ? 100 : c.language === "mixed" ? 60 : 20;
    case "close-to-home":
      return c.region === "Africa" ? 100 : c.flightNgn <= 1_000_000 ? 70 : 35;
    case "top-universities":
      return RATING[c.ratings.ranking];
    case "work-while-studying":
      return c.workHours >= 24 ? 100 : c.workHours >= 20 ? 85 : c.workHours >= 15 ? 60 : c.workHours >= 10 ? 40 : 10;
    case "settle-long-term":
      return RATING[c.ratings.settlement];
    case "nigerian-community":
      return RATING[c.ratings.community];
  }
}

function scoreCountry(c: StudyCountry, a: MatcherAnswers): MatchResult {
  const strengths: string[] = [];
  const watchOuts: string[] = [];

  // Budget
  const annualCostNgn = typicalAnnualCostNgn(c, a.level, "mid");
  const lowCostNgn = typicalAnnualCostNgn(c, a.level, "budget");
  let budget: number;
  if (a.budgetNgn >= annualCostNgn * 1.1) {
    budget = 100;
    strengths.push(`Comfortably within your budget (typical year about ${formatMillions(annualCostNgn)})`);
  } else if (a.budgetNgn >= annualCostNgn * 0.95) {
    budget = 88;
    strengths.push(`Within your budget at a typical university (about ${formatMillions(annualCostNgn)} a year)`);
  } else if (a.budgetNgn >= lowCostNgn) {
    budget = 65;
    strengths.push(`Affordable if you choose lower-cost universities (from about ${formatMillions(lowCostNgn)} a year)`);
  } else if (a.budgetNgn >= lowCostNgn * 0.8) {
    budget = 40;
    watchOuts.push(`Slightly above your budget even at lower-cost universities (from ${formatMillions(lowCostNgn)} a year): a scholarship would close the gap.`);
  } else {
    budget = Math.max(5, Math.round((30 * a.budgetNgn) / lowCostNgn));
    watchOuts.push(`Well above your budget: even lower-cost options start around ${formatMillions(lowCostNgn)} a year.`);
  }

  // Academics
  const group = gradeGroup(a.level);
  const gradeOption = GRADE_OPTIONS[group].find((g) => g.value === a.grade);
  const gradePercent = gradeOption?.percent ?? 60;
  const diff = gradePercent - c.minGradePercent;
  let academic = diff >= 10 ? 100 : diff >= 0 ? 85 : diff >= -5 ? 60 : 30;
  if (academic >= 85) strengths.push("Your grades meet typical entry requirements");
  else if (academic <= 30) watchOuts.push("Your grades are below what most universities here usually ask for.");
  if (a.level === "undergraduate" || a.level === "medicine") {
    if (c.waecDirectEntry === "rarely") {
      academic = Math.min(academic, 50);
      watchOuts.push("WAEC/NECO alone rarely gives direct entry here: expect a foundation year or some university study first.");
    } else if (c.waecDirectEntry === "sometimes" && a.grade !== "school-alevel") {
      academic = Math.min(academic, 80);
      watchOuts.push("Some universities here will ask for a foundation year, A-levels or JUPEB on top of WAEC.");
    }
  }
  if (a.grade === "pg-third") watchOuts.push("With a Third Class or HND, look for universities that weigh work experience or offer pre-Master's routes.");

  // Language
  const postgrad = a.level === "masters" || a.level === "mba" || a.level === "phd";
  let languageFit: number;
  if (c.language === "english") languageFit = 100;
  else if (c.language === "mixed") languageFit = postgrad ? 95 : a.languageOpenness === "english-only" ? 65 : 90;
  else languageFit = a.languageOpenness === "english-only" ? 30 : a.languageOpenness === "speaks-other" ? 80 : 60;
  if (c.language !== "english" && languageFit < 70) watchOuts.push(`${c.languageNote} Your choice of programmes will be narrower in English.`);

  const band = BAND_VALUE[a.english];
  let englishFit: number;
  if (band === null) {
    englishFit = c.waecEnglishOften ? 95 : 70;
    if (!c.waecEnglishOften) watchOuts.push(`You'll need an English test: most universities here ask for IELTS ${c.ieltsMin.toFixed(1)} or equivalent. Book early.`);
    else strengths.push("Many universities here accept your WAEC English instead of IELTS");
  } else if (band >= c.ieltsMin) {
    englishFit = 100;
  } else if (band >= c.ieltsMin - 0.5) {
    englishFit = 65;
    watchOuts.push("Your English score is just under typical requirements: a pre-sessional English course can bridge the gap.");
  } else {
    englishFit = 35;
    watchOuts.push(`Most universities here ask for IELTS ${c.ieltsMin.toFixed(1)} or equivalent: plan time to retake your test.`);
  }
  const language = Math.round(languageFit * 0.5 + englishFit * 0.5);

  // Course/field
  let field = 80;
  if (a.field !== "undecided") {
    if (c.strongFields.includes(a.field)) {
      field = 100;
      strengths.push(`Well known for ${FIELDS.find((f) => f.id === a.field)?.label}`);
    } else {
      field = 60;
    }
  }

  // Priorities
  let priorities = 70;
  if (a.priorities.length > 0) {
    const scores = a.priorities.map((p) => ({ p, s: priorityScore(c, p, a.level, annualCostNgn) }));
    priorities = Math.round(scores.reduce((sum, x) => sum + x.s, 0) / scores.length);
    for (const { p, s } of scores) {
      if (s >= 85 && p !== "low-cost") strengths.push(`Strong on your priority: ${PRIORITY_LABELS[p].label.toLowerCase()}`);
    }
  }
  if (a.priorities.includes("post-study-work") && c.pswMonths === 0) watchOuts.push(`Post-study work: ${c.pswNote}`);

  // Timing
  const lead = c.applyMonthsAhead + Math.ceil((c.visa.weeks[1] + c.visa.appointmentWaitWeeks) / 4);
  const available = START_MONTHS[a.start];
  let timing: number;
  if (available >= lead + 2) timing = 100;
  else if (available >= lead) timing = 80;
  else if (available >= lead - 2) {
    timing = 55;
    watchOuts.push(`Tight timing: applications here usually go in about ${c.applyMonthsAhead} months before the course starts.`);
  } else {
    timing = 30;
    watchOuts.push(`You'd most likely need to aim for a later intake: the process here usually takes about ${lead} months.`);
  }
  if (a.start === "asap" && timing >= 80) strengths.push("Realistic for your start date");

  const factors: MatchFactor[] = [
    { id: "budget", label: "Budget", score: budget, weight: WEIGHTS.budget },
    { id: "academic", label: "Academics", score: academic, weight: WEIGHTS.academic },
    { id: "language", label: "Language & English", score: language, weight: WEIGHTS.language },
    { id: "field", label: "Course fit", score: field, weight: WEIGHTS.field },
    { id: "priorities", label: "Your priorities", score: priorities, weight: WEIGHTS.priorities },
    { id: "timing", label: "Timing", score: timing, weight: WEIGHTS.timing },
  ];

  let score = factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0);
  if (a.regions.length > 0) {
    if (a.regions.includes(c.region)) strengths.push(`In your preferred region (${c.region})`);
    else score *= 0.85;
  }

  if (c.watchOut) watchOuts.push(c.watchOut);
  if (a.level === "medicine" && !c.watchOut?.includes("MDCN")) {
    watchOuts.push("Check the medical school is recognised by the Medical and Dental Council of Nigeria (MDCN) if you plan to practise at home.");
  }

  return {
    country: c,
    score: Math.max(1, Math.min(99, Math.round(score))),
    factors,
    strengths: Array.from(new Set(strengths)).slice(0, 5),
    watchOuts: Array.from(new Set(watchOuts)).slice(0, 4),
    annualCostNgn,
    lowCostNgn,
  };
}

export function rankCountries(answers: MatcherAnswers): MatchResult[] {
  return studyCountries.map((c) => scoreCountry(c, answers)).sort((x, y) => y.score - x.score || x.annualCostNgn - y.annualCostNgn);
}
