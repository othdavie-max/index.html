"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Calculator, CalendarPlus, CheckCircle2, Globe2, MessageCircle, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { ChoiceGrid } from "@/components/tools/choice-grid";
import { CountryPicker } from "@/components/tools/country-picker";
import { LeadCaptureForm } from "@/components/tools/lead-capture-form";
import { MultiChoice } from "@/components/tools/multi-choice";
import { StepShell } from "@/components/tools/step-shell";
import { DATA_REVIEWED, getStudyCountry, type Month } from "@/data/study-countries";
import { LEVEL_LABELS, type CostLevel } from "@/lib/study-costs";
import {
  PHASES,
  PROGRESS_OPTIONS,
  assessFeasibility,
  buildMilestones,
  buildTimeline,
  comfortableLeadDays,
  intakeDate,
  intakeOptions,
  type ProgressKey,
  type TimelineItem,
} from "@/lib/study-timeline";
import { buildIcsFile, downloadIcsFile } from "@/lib/ics";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const STEPS = ["country", "level", "intake", "progress", "scholarships"] as const;
const LEVELS = Object.keys(LEVEL_LABELS) as CostLevel[];

const STATUS_STYLE: Record<TimelineItem["status"], { label: string; className: string; dot: string }> = {
  done: { label: "Done", className: "bg-ink-100 text-ink-700", dot: "bg-ink-700" },
  overdue: { label: "Overdue", className: "bg-gold-500/10 text-gold-600", dot: "bg-gold-500" },
  soon: { label: "Due soon", className: "bg-ink-900 text-white", dot: "bg-ink-900" },
  upcoming: { label: "Upcoming", className: "bg-offwhite text-muted", dot: "bg-ink-900/25" },
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function monthsAway(days: number) {
  const months = Math.round(days / 30);
  return months <= 1 ? `${days} days away` : `${months} months away`;
}

export function TimelinePlannerTool() {
  const searchParams = useSearchParams();
  const [now] = useState(() => Date.now());
  const prefillCountry = getStudyCountry(searchParams.get("country"))?.id ?? null;
  const prefillLevel = LEVELS.find((l) => l === searchParams.get("level"));

  const [step, setStep] = useState(prefillCountry ? (prefillLevel ? 2 : 1) : 0);
  const [showResults, setShowResults] = useState(false);
  const [countryId, setCountryId] = useState<string | null>(prefillCountry);
  const [otherName, setOtherName] = useState("");
  const [level, setLevel] = useState<CostLevel>(prefillLevel ?? "masters");
  const [intake, setIntake] = useState<{ month: Month; year: number } | null>(null);
  const [progress, setProgress] = useState<ProgressKey[]>([]);
  const [scholarships, setScholarships] = useState<"yes" | "no">("no");
  const [extraDone, setExtraDone] = useState<Set<string>>(new Set());
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [emailCaptured, setEmailCaptured] = useState(false);

  const country = getStudyCountry(countryId);
  const options = useMemo(() => (country ? intakeOptions(country, now) : []), [country, now]);
  const lead = country ? comfortableLeadDays(country) : 0;

  const milestones = useMemo(() => (country ? buildMilestones(country, level, scholarships === "yes") : []), [country, level, scholarships]);
  const done = useMemo(() => {
    const fromProgress = milestones.filter((m) => m.progressKey && progress.includes(m.progressKey)).map((m) => m.id);
    const set = new Set([...fromProgress, ...extraDone]);
    undone.forEach((id) => set.delete(id));
    return set;
  }, [milestones, progress, extraDone, undone]);

  const intakeAt = intake ? intakeDate(intake.month, intake.year) : null;
  const timeline = useMemo(() => (intakeAt ? buildTimeline(milestones, intakeAt, now, done) : []), [milestones, intakeAt, now, done]);

  function toggleDone(id: string) {
    const isDone = done.has(id);
    setExtraDone((s) => {
      const n = new Set(s);
      if (isDone) n.delete(id);
      else n.add(id);
      return n;
    });
    setUndone((s) => {
      const n = new Set(s);
      if (isDone) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const shell = {
    step,
    total: STEPS.length,
    onBack: () => setStep((s) => Math.max(0, s - 1)),
    onNext: () => {
      if (isLast) {
        trackEvent("timeline_planner_completed");
        setShowResults(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setStep((s) => s + 1);
    },
    canNext: current === "country" ? !!country : current === "intake" ? !!intake : true,
    nextLabel: isLast ? "Build my timeline" : "Next",
  };

  if (!showResults || !country || !intakeAt || !intake) {
    switch (current) {
      case "country":
        return (
          <StepShell {...shell} title="Where are you planning to study?">
            <CountryPicker
              value={countryId}
              onChange={(id) => {
                setCountryId(id);
                setIntake(null);
              }}
              otherName={otherName}
              onOtherNameChange={setOtherName}
            />
          </StepShell>
        );
      case "level":
        return (
          <StepShell {...shell} title="What are you applying for?">
            <ChoiceGrid value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))} />
          </StepShell>
        );
      case "intake":
        return (
          <StepShell
            {...shell}
            title="Which intake are you aiming for?"
            hint={
              country?.generic
                ? "Pick the month your course starts."
                : `${country?.name}'s main intakes are ${country?.intakes.join(" and ")}. Applications usually go in about ${country?.applyMonthsAhead} months ahead.`
            }
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.map((o) => {
                const selected = intake?.month === o.month && intake.year === o.year;
                const tag = o.daysAway >= lead + 30 ? "Comfortable" : o.daysAway >= lead * 0.6 ? "Tight" : "Very tight";
                return (
                  <button
                    key={`${o.month}-${o.year}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setIntake({ month: o.month, year: o.year })}
                    className={cn(
                      "flex min-h-[60px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      selected ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30",
                    )}
                  >
                    <span>
                      <span className="block font-medium text-ink-900">
                        {o.month} {o.year}
                      </span>
                      <span className="block text-xs text-muted">{monthsAway(o.daysAway)}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                        tag === "Comfortable" ? "bg-ink-100 text-ink-700" : tag === "Tight" ? "bg-gold-500/10 text-gold-600" : "bg-gold-500 text-white",
                      )}
                    >
                      {tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        );
      case "progress":
        return (
          <StepShell {...shell} title="Where are you right now?" hint="Tick everything you've already done, and we'll mark those steps complete.">
            <MultiChoice<ProgressKey> values={progress} onChange={setProgress} options={PROGRESS_OPTIONS} />
          </StepShell>
        );
      case "scholarships":
        return (
          <StepShell {...shell} title="Will you apply for scholarships?" hint="Scholarship deadlines come much earlier than admission deadlines, so we'll add them to your plan.">
            <ChoiceGrid<"yes" | "no">
              value={scholarships}
              onChange={setScholarships}
              columns={1}
              options={[
                { value: "yes", label: "Yes, add scholarship deadlines", description: country?.scholarshipNote },
                { value: "no", label: "No, I'm self-funded or sponsored" },
              ]}
            />
          </StepShell>
        );
    }
  }

  const feasibility = assessFeasibility(country, intakeAt, now, done);
  const overdueEssential = timeline.filter((t) => t.status === "overdue" && t.essential);
  const verdict = feasibility.verdict === "on-track" && overdueEssential.length > 0 ? "tight" : feasibility.verdict;
  const nextSteps = timeline.filter((t) => t.status !== "done").slice(0, 3);
  const suggested = options.find((o) => o.daysAway >= lead + 30);
  const place = country.generic ? otherName.trim() || country.name : country.name;
  const intakeLabel = `${intake.month} ${intake.year}`;

  function handleIcs() {
    trackEvent("timeline_ics_download");
    const ics = buildIcsFile(
      timeline.filter((t) => t.status !== "done").map((t) => ({ title: `Baseline: ${t.label}`, description: t.detail, date: t.due })),
    );
    downloadIcsFile(`baseline-timeline-${country!.id}.ics`, ics);
  }

  const waMessage = `Hi Baseline, I planned my timeline for ${place} (${LEVEL_LABELS[level]}, ${intakeLabel} intake). ${
    verdict === "on-track" ? "It looks on track." : verdict === "tight" ? "It looks tight." : "It doesn't look realistic yet."
  } ${done.size} of ${timeline.length} steps done. Can we talk about next steps?`;

  const verdictCopy = {
    "on-track": {
      icon: <CheckCircle2 size={20} className="text-ink-700" />,
      title: "You're on track",
      body: `${intakeLabel} is ${monthsAway(feasibility.daysLeft)}. Keep to the dates below and you'll have time to spare.`,
      className: "border-ink-900/10 bg-offwhite",
    },
    tight: {
      icon: <AlertTriangle size={20} className="text-gold-500" />,
      title: "Achievable, but tight",
      body: `${intakeLabel} is ${monthsAway(feasibility.daysLeft)}, and ${
        overdueEssential.length > 0 ? `${overdueEssential.length} key step${overdueEssential.length === 1 ? " is" : "s are"} already overdue` : "you're behind the usual schedule"
      }. It can still work if you move quickly: a counsellor can help you prioritise.`,
      className: "border-gold-500/30 bg-gold-500/5",
    },
    unrealistic: {
      icon: <XCircle size={20} className="text-gold-600" />,
      title: "This intake probably isn't realistic",
      body: `From where you are, the remaining steps usually take at least ${Math.round(feasibility.minimumDays / 30)} months, and ${intakeLabel} is ${monthsAway(
        feasibility.daysLeft,
      )}.${suggested ? ` ${suggested.month} ${suggested.year} would give you a comfortable run-up.` : ""}`,
      className: "border-gold-500/40 bg-gold-500/10",
    },
  }[verdict];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">Your study timeline</p>
          <h2 className="mt-2 flex items-center gap-3 font-display text-2xl text-ink-900 sm:text-3xl">
            {country.generic ? <Globe2 size={30} className="text-gold-500" /> : <Flag code={country.flagCode} size={32} alt="" />}
            {place}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {LEVEL_LABELS[level]} · {intakeLabel} intake · {done.size} of {timeline.length} steps done
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowResults(false);
            setStep(0);
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gold-500 hover:underline"
        >
          <Pencil size={14} /> Edit answers
        </button>
      </div>

      <div className={cn("mt-6 rounded-2xl border p-5", verdictCopy.className)}>
        <p className="flex items-center gap-2 font-display text-lg text-ink-900">
          {verdictCopy.icon}
          {verdictCopy.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-900/80">{verdictCopy.body}</p>
        {verdict === "unrealistic" && suggested && (
          <button
            type="button"
            onClick={() => setIntake({ month: suggested.month, year: suggested.year })}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-700"
          >
            Switch to {suggested.month} {suggested.year}
          </button>
        )}
      </div>

      {nextSteps.length > 0 && (
        <section className="mt-8">
          <h3 className="font-display text-lg text-ink-900">Focus on these next</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {nextSteps.map((t, i) => (
              <div key={t.id} className="rounded-xl border border-ink-900/10 bg-white p-4">
                <p className="text-xs font-semibold text-gold-500">
                  {i + 1} · {t.status === "overdue" ? "Overdue" : `By ${formatDate(t.due)}`}
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-ink-900">{t.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-10">
        {PHASES.map((phase) => {
          const items = timeline.filter((t) => t.phase === phase);
          if (items.length === 0) return null;
          const phaseDone = items.filter((t) => t.status === "done").length;
          return (
            <section key={phase}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg text-ink-900">{phase}</h3>
                <span className="text-xs font-medium text-muted">
                  {phaseDone}/{items.length} done
                </span>
              </div>
              <ol className="relative mt-4 border-l-2 border-ink-900/10 pl-6">
                {items.map((t, i) => {
                  const style = STATUS_STYLE[t.status];
                  return (
                    <motion.li
                      key={t.id}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="relative pb-6 last:pb-0"
                    >
                      <span className={cn("absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white", style.dot)} />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-ink-900/70">{formatDate(t.due)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", style.className)}>{style.label}</span>
                      </div>
                      <div className="mt-1.5 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium text-ink-900", t.status === "done" && "text-ink-900/50 line-through")}>{t.label}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted">{t.detail}</p>
                        </div>
                        <label className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 text-xs text-muted">
                          <input type="checkbox" checked={t.status === "done"} onChange={() => toggleDone(t.id)} className="h-4 w-4 accent-gold-500" />
                          <span className="hidden sm:inline">Done</span>
                          <span className="sr-only sm:hidden">Mark {t.label} as done</span>
                        </label>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={handleIcs} icon={<CalendarPlus size={16} />} className="justify-center">
          Add to my calendar
        </Button>
        <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" variant="secondary" icon={<MessageCircle size={16} />} className="justify-center">
          Send to WhatsApp
        </Button>
        <Button href={`/tools/cost-calculator?country=${country.id}&level=${level}`} variant="ghost" icon={<Calculator size={16} />} className="justify-center">
          Estimate my costs
        </Button>
      </div>

      {!emailCaptured ? (
        <div className="mt-10 max-w-md">
          <LeadCaptureForm
            source="timeline-planner"
            payload={{ country: place, level, intake: intakeLabel, verdict, done: [...done] }}
            title="Get reminders before each deadline"
            description="We'll email you this timeline and check in on WhatsApp as key dates approach."
            onSuccess={() => setEmailCaptured(true)}
          />
        </div>
      ) : (
        <p className="mt-10 text-sm font-medium text-ink-900">Done. Check your email and WhatsApp for your timeline.</p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Dates are planning guides worked back from the start of your intake month, not official deadlines. Processing times and requirements change: we
        confirm the exact dates for your university and visa route. Reviewed {DATA_REVIEWED}.
      </p>
    </div>
  );
}
