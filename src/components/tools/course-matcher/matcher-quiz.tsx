"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizProgress } from "@/components/tools/quiz-progress";
import { ChoiceGrid } from "@/components/tools/choice-grid";
import { MatcherResults } from "@/components/tools/course-matcher/matcher-results";
import { scoreDestinations, type MatcherAnswers } from "@/data/matcher-rules";
import { destinations } from "@/data/destinations";
import { trackEvent } from "@/lib/analytics";
import type { CountryCode } from "@/types";

type Answers = Partial<MatcherAnswers>;

const steps: { key: keyof MatcherAnswers; question: string }[] = [
  { key: "level", question: "What level do you want to study?" },
  { key: "fieldOfInterest", question: "What field are you interested in?" },
  { key: "gradeBand", question: "How would you describe your grades?" },
  { key: "englishTest", question: "What's your English test status?" },
  { key: "englishScoreBand", question: "How does your score compare to typical requirements?" },
  { key: "budgetNairaPerYear", question: "What's your total annual budget?" },
  { key: "intake", question: "Which intake are you targeting?" },
  { key: "wantsPostStudyWork", question: "Do you want to work abroad after graduating?" },
  { key: "preferredCountries", question: "Any countries you're already leaning toward?" },
];

const budgetOptions = [
  { value: "8000000", label: "Under ₦8,000,000/yr" },
  { value: "14000000", label: "₦8,000,000 – ₦14,000,000/yr" },
  { value: "22000000", label: "₦14,000,000 – ₦22,000,000/yr" },
  { value: "35000000", label: "Above ₦22,000,000/yr" },
];

export function MatcherQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ preferredCountries: [] });
  const [showResults, setShowResults] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function update<K extends keyof MatcherAnswers>(key: K, value: MatcherAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function next() {
    if (isLast) {
      trackEvent("course_matcher_completed");
      setShowResults(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  const canProceed = (() => {
    switch (current.key) {
      case "level":
        return !!answers.level;
      case "fieldOfInterest":
        return !!answers.fieldOfInterest;
      case "gradeBand":
        return !!answers.gradeBand;
      case "englishTest":
        return !!answers.englishTest;
      case "englishScoreBand":
        return !!answers.englishScoreBand;
      case "budgetNairaPerYear":
        return !!answers.budgetNairaPerYear;
      case "intake":
        return !!answers.intake;
      case "wantsPostStudyWork":
        return !!answers.wantsPostStudyWork;
      case "preferredCountries":
        return true;
      default:
        return false;
    }
  })();

  if (showResults) {
    const results = scoreDestinations(answers as MatcherAnswers);
    return <MatcherResults results={results} answers={answers as MatcherAnswers} />;
  }

  return (
    <div className="mx-auto max-w-xl">
      <QuizProgress step={step} total={steps.length} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-8"
        >
          <h2 className="font-display text-xl text-ink-900 sm:text-2xl">{current.question}</h2>

          <div className="mt-6">
            {current.key === "level" && (
              <ChoiceGrid
                value={answers.level}
                onChange={(v) => update("level", v)}
                options={[
                  { value: "foundation", label: "Foundation Programme" },
                  { value: "undergraduate", label: "Undergraduate" },
                  { value: "masters", label: "Master's Degree" },
                  { value: "phd", label: "PhD" },
                ]}
              />
            )}

            {current.key === "fieldOfInterest" && (
              <ChoiceGrid
                value={answers.fieldOfInterest}
                onChange={(v) => update("fieldOfInterest", v)}
                columns={2}
                options={[
                  "Business & Management",
                  "Engineering & Technology",
                  "Computer Science & IT",
                  "Health & Medical Sciences",
                  "Law",
                  "Arts, Media & Design",
                  "Sciences",
                  "Other",
                ].map((f) => ({ value: f, label: f }))}
              />
            )}

            {current.key === "gradeBand" && (
              <ChoiceGrid
                value={answers.gradeBand}
                onChange={(v) => update("gradeBand", v)}
                options={[
                  { value: "70+", label: "First Class / 70%+", description: "or equivalent GPA/degree classification" },
                  { value: "60-69", label: "Second Class Upper / 60–69%" },
                  { value: "50-59", label: "Second Class Lower / 50–59%" },
                  { value: "below-50", label: "Below 50% / Third Class" },
                ]}
              />
            )}

            {current.key === "englishTest" && (
              <ChoiceGrid
                value={answers.englishTest}
                onChange={(v) => update("englishTest", v)}
                options={[
                  { value: "ielts", label: "IELTS" },
                  { value: "toefl", label: "TOEFL" },
                  { value: "pte", label: "PTE Academic" },
                  { value: "duolingo", label: "Duolingo English Test" },
                  { value: "none", label: "Haven't taken one yet" },
                ]}
              />
            )}

            {current.key === "englishScoreBand" && (
              <ChoiceGrid
                value={answers.englishScoreBand}
                onChange={(v) => update("englishScoreBand", v)}
                options={[
                  { value: "not-yet", label: "Not applicable yet" },
                  { value: "below-requirement", label: "Below typical requirements" },
                  { value: "meets-requirement", label: "Meets typical requirements" },
                  { value: "exceeds-requirement", label: "Exceeds typical requirements" },
                ]}
              />
            )}

            {current.key === "budgetNairaPerYear" && (
              <ChoiceGrid
                value={answers.budgetNairaPerYear?.toString()}
                onChange={(v) => update("budgetNairaPerYear", Number(v))}
                options={budgetOptions}
              />
            )}

            {current.key === "intake" && (
              <ChoiceGrid
                value={answers.intake}
                onChange={(v) => update("intake", v)}
                options={["January", "February", "April", "May", "July", "September", "October"].map((m) => ({ value: m, label: m }))}
              />
            )}

            {current.key === "wantsPostStudyWork" && (
              <ChoiceGrid
                value={answers.wantsPostStudyWork}
                onChange={(v) => update("wantsPostStudyWork", v)}
                options={[
                  { value: "yes", label: "Yes, that's a priority" },
                  { value: "no", label: "No, just studying" },
                  { value: "unsure", label: "Not sure yet" },
                ]}
              />
            )}

            {current.key === "preferredCountries" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {destinations.map((d) => {
                  const selected = answers.preferredCountries?.includes(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => {
                        const list = new Set(answers.preferredCountries ?? []);
                        if (selected) list.delete(d.code);
                        else list.add(d.code);
                        update("preferredCountries", Array.from(list) as CountryCode[]);
                      }}
                      className={`rounded-xl border p-4 text-center transition-all duration-200 ${
                        selected ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30"
                      }`}
                    >
                      <span className="text-2xl">{d.flag}</span>
                      <p className="mt-1 text-xs font-medium text-ink-900">{d.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 0} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <Button onClick={next} disabled={!canProceed} icon={<ArrowRight size={16} />}>
          {isLast ? "See My Results" : "Next"}
        </Button>
      </div>
    </div>
  );
}
