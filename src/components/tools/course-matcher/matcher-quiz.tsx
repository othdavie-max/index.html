"use client";

import { useState } from "react";
import { ChoiceGrid } from "@/components/tools/choice-grid";
import { MultiChoice } from "@/components/tools/multi-choice";
import { StepShell } from "@/components/tools/step-shell";
import { MatcherResults } from "@/components/tools/course-matcher/matcher-results";
import { FIELDS, REGIONS, type StudyRegion } from "@/data/study-countries";
import {
  GRADE_OPTIONS,
  PRIORITY_LABELS,
  gradeGroup,
  rankCountries,
  type EnglishBand,
  type LanguageOpenness,
  type MatcherAnswers,
  type Priority,
  type StartWhen,
} from "@/lib/course-matcher";
import { LEVEL_LABELS, type CostLevel } from "@/lib/study-costs";
import { trackEvent } from "@/lib/analytics";

type Answers = Partial<MatcherAnswers> & { priorities: Priority[]; regions: StudyRegion[] };

const STEPS = ["level", "field", "grade", "english", "language", "budget", "priorities", "start", "regions"] as const;

const LEVEL_DESCRIPTIONS: Record<CostLevel, string> = {
  foundation: "A one-year bridge into a Bachelor's",
  undergraduate: "Straight after WAEC, A-levels or JUPEB",
  masters: "Taught or research Master's",
  mba: "Usually needs work experience",
  medicine: "MBBS, MD or dentistry",
  phd: "Doctoral research",
};

const BUDGETS = [
  { value: "8000000", label: "Under ₦10 million a year" },
  { value: "15000000", label: "₦10m – ₦20m a year" },
  { value: "27000000", label: "₦20m – ₦35m a year" },
  { value: "45000000", label: "₦35m – ₦55m a year" },
  { value: "67000000", label: "₦55m – ₦80m a year" },
  { value: "95000000", label: "Above ₦80 million a year" },
];

export function MatcherQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ priorities: [], regions: [] });
  const [showResults, setShowResults] = useState(false);

  function update<K extends keyof MatcherAnswers>(key: K, value: MatcherAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canNext = (() => {
    switch (current) {
      case "level":
        return !!answers.level;
      case "field":
        return !!answers.field;
      case "grade":
        return !!answers.grade;
      case "english":
        return !!answers.english;
      case "language":
        return !!answers.languageOpenness;
      case "budget":
        return !!answers.budgetNgn;
      case "priorities":
        return answers.priorities.length > 0;
      case "start":
        return !!answers.start;
      case "regions":
        return true;
    }
  })();

  function next() {
    if (isLast) {
      trackEvent("course_matcher_completed");
      setShowResults(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => s + 1);
  }

  if (showResults) {
    const full = answers as MatcherAnswers;
    return (
      <MatcherResults
        results={rankCountries(full)}
        answers={full}
        onEdit={() => {
          setShowResults(false);
          setStep(0);
        }}
      />
    );
  }

  const shell = { step, total: STEPS.length, onBack: () => setStep((s) => Math.max(0, s - 1)), onNext: next, canNext };
  const group = answers.level ? gradeGroup(answers.level) : "school";

  switch (current) {
    case "level":
      return (
        <StepShell {...shell} title="What do you want to study?">
          <ChoiceGrid
            value={answers.level}
            onChange={(v) => setAnswers((a) => ({ ...a, level: v, grade: undefined }))}
            options={(Object.keys(LEVEL_LABELS) as CostLevel[]).map((l) => ({ value: l, label: LEVEL_LABELS[l], description: LEVEL_DESCRIPTIONS[l] }))}
          />
        </StepShell>
      );
    case "field":
      return (
        <StepShell {...shell} title="Which field are you interested in?" hint="We'll favour countries whose universities are known for it.">
          <ChoiceGrid
            value={answers.field}
            onChange={(v) => update("field", v)}
            options={[...FIELDS.map((f) => ({ value: f.id as MatcherAnswers["field"], label: f.label })), { value: "undecided", label: "Not decided yet" }]}
          />
        </StepShell>
      );
    case "grade":
      return (
        <StepShell
          {...shell}
          title={group === "school" ? "How did you do in WAEC/NECO?" : group === "postgrad" ? "What class of degree do you have (or expect)?" : "What are your highest qualifications?"}
          hint={group === "school" ? "Include A-levels, JUPEB or IB if you have them." : undefined}
        >
          <ChoiceGrid value={answers.grade} onChange={(v) => update("grade", v)} options={GRADE_OPTIONS[group]} />
        </StepShell>
      );
    case "english":
      return (
        <StepShell
          {...shell}
          title="What's your English test score?"
          hint="IELTS or equivalent (TOEFL, PTE, Duolingo). Some countries accept a WAEC English credit instead, and we'll factor that in."
        >
          <ChoiceGrid<EnglishBand>
            value={answers.english}
            onChange={(v) => update("english", v)}
            options={[
              { value: "not-taken", label: "Haven't taken one yet" },
              { value: "below-5.5", label: "Below 5.5" },
              { value: "5.5", label: "5.5" },
              { value: "6.0-6.5", label: "6.0 – 6.5" },
              { value: "7.0+", label: "7.0 or higher" },
            ]}
          />
        </StepShell>
      );
    case "language":
      return (
        <StepShell
          {...shell}
          title="Would you study in another language?"
          hint="Some of the best-value countries teach many Bachelor's degrees in German, French or other languages."
        >
          <ChoiceGrid<LanguageOpenness>
            value={answers.languageOpenness}
            onChange={(v) => update("languageOpenness", v)}
            columns={1}
            options={[
              { value: "english-only", label: "English only, please" },
              { value: "open", label: "I'm open to learning a new language" },
              { value: "speaks-other", label: "I already speak French, German or another language" },
            ]}
          />
        </StepShell>
      );
    case "budget":
      return (
        <StepShell
          {...shell}
          title="What can you realistically spend each year?"
          hint="Tuition plus living costs, per year. Be honest: we'll show options that stretch further, including scholarships."
        >
          <ChoiceGrid value={answers.budgetNgn?.toString()} onChange={(v) => update("budgetNgn", Number(v))} options={BUDGETS} />
        </StepShell>
      );
    case "priorities":
      return (
        <StepShell {...shell} title="What matters most to you?" hint="Pick up to three.">
          <MultiChoice<Priority>
            max={3}
            values={answers.priorities}
            onChange={(v) => update("priorities", v)}
            options={(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => ({ value: p, ...PRIORITY_LABELS[p] }))}
          />
        </StepShell>
      );
    case "start":
      return (
        <StepShell {...shell} title="When do you want to start?">
          <ChoiceGrid<StartWhen>
            value={answers.start}
            onChange={(v) => update("start", v)}
            options={[
              { value: "asap", label: "As soon as possible", description: "Within the next 6 months" },
              { value: "6-12", label: "In 6–12 months" },
              { value: "12+", label: "In more than a year" },
              { value: "flexible", label: "I'm flexible" },
            ]}
          />
        </StepShell>
      );
    case "regions":
      return (
        <StepShell
          {...shell}
          title="Any regions you prefer?"
          hint="Optional. Leave blank to compare every country we cover."
          nextLabel="See my matches"
        >
          <MultiChoice<StudyRegion> values={answers.regions} onChange={(v) => update("regions", v)} options={REGIONS.map((r) => ({ value: r, label: r }))} />
        </StepShell>
      );
  }
}
