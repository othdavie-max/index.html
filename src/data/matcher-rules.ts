import { destinations } from "@/data/destinations";
import type { CountryCode, EnglishTest, StudyLevel } from "@/types";

export interface MatcherAnswers {
  level: StudyLevel;
  fieldOfInterest: string;
  gradeBand: "below-50" | "50-59" | "60-69" | "70+";
  englishTest: EnglishTest;
  englishScoreBand: "not-yet" | "below-requirement" | "meets-requirement" | "exceeds-requirement";
  budgetNairaPerYear: number;
  intake: string;
  wantsPostStudyWork: "yes" | "no" | "unsure";
  preferredCountries: CountryCode[];
}

export interface MatcherResult {
  code: CountryCode;
  score: number;
  reasons: string[];
}

const gradeBandToPercent: Record<MatcherAnswers["gradeBand"], number> = {
  "below-50": 45,
  "50-59": 55,
  "60-69": 65,
  "70+": 78,
};

// Weights sum to 100 — tune here rather than touching scoring logic.
const WEIGHTS = { budget: 35, grades: 20, english: 15, postStudyWork: 15, intake: 15 };

export function scoreDestinations(answers: MatcherAnswers): MatcherResult[] {
  const results = destinations.map((d): MatcherResult => {
    const reasons: string[] = [];
    let score = 0;

    // Budget fit — compare total est. annual cost (tuition + living midpoint) to user's budget.
    const estAnnualCost =
      (d.tuitionRangeNgnPerYear[0] + d.tuitionRangeNgnPerYear[1]) / 2 + (d.livingCostsNgnPerYear[0] + d.livingCostsNgnPerYear[1]) / 2;
    const minTotal = d.tuitionRangeNgnPerYear[0] + d.livingCostsNgnPerYear[0];
    let budgetScore: number;
    if (answers.budgetNairaPerYear >= estAnnualCost) {
      budgetScore = 100;
      reasons.push(`Comfortably within your budget for ${d.name}`);
    } else if (answers.budgetNairaPerYear >= minTotal) {
      budgetScore = 65;
      reasons.push(`Achievable at the lower end of costs for ${d.name}`);
    } else {
      budgetScore = Math.max(0, 40 - ((minTotal - answers.budgetNairaPerYear) / minTotal) * 100);
      reasons.push(`Tight fit for your stated budget`);
    }
    score += (budgetScore / 100) * WEIGHTS.budget;

    // Grades fit
    const userGrade = gradeBandToPercent[answers.gradeBand];
    const gradeScore = userGrade >= d.minGradePercent ? 100 : Math.max(0, 100 - (d.minGradePercent - userGrade) * 5);
    if (userGrade >= d.minGradePercent) reasons.push("Your grades meet typical entry requirements");
    score += (gradeScore / 100) * WEIGHTS.grades;

    // English test fit
    let englishScore = 50;
    if (answers.englishTest === "none" && answers.englishScoreBand === "not-yet") englishScore = 40;
    else if (answers.englishScoreBand === "exceeds-requirement") englishScore = 100;
    else if (answers.englishScoreBand === "meets-requirement") englishScore = 85;
    else if (answers.englishScoreBand === "below-requirement") englishScore = 30;
    if (englishScore >= 85) reasons.push(`Strong fit for the ${d.requiredEnglishBand} requirement`);
    score += (englishScore / 100) * WEIGHTS.english;

    // Post-study work interest
    const hasStrongPSW = /2|3|4/.test(d.postStudyWork);
    let pswScore = 60;
    if (answers.wantsPostStudyWork === "yes") pswScore = hasStrongPSW ? 100 : 55;
    if (answers.wantsPostStudyWork === "yes" && hasStrongPSW) reasons.push("Strong post-study work options");
    score += (pswScore / 100) * WEIGHTS.postStudyWork;

    // Intake fit
    const intakeMatches = d.intakes.some((i) => i.toLowerCase().includes(answers.intake.toLowerCase()));
    const intakeScore = intakeMatches ? 100 : 40;
    if (intakeMatches) reasons.push(`Offers your preferred ${answers.intake} intake`);
    score += (intakeScore / 100) * WEIGHTS.intake;

    // Small boost if explicitly preferred
    if (answers.preferredCountries.length > 0) {
      score = answers.preferredCountries.includes(d.code) ? score + 5 : score - 5;
    }

    return { code: d.code, score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 3) };
  });

  return results.sort((a, b) => b.score - a.score);
}
