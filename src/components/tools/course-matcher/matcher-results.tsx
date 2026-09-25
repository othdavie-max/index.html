"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Calculator, CalendarClock, Check, MessageCircle, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { LeadCaptureForm } from "@/components/tools/lead-capture-form";
import { FIELDS } from "@/data/study-countries";
import { PRIORITY_LABELS, type MatchResult, type MatcherAnswers } from "@/lib/course-matcher";
import { LEVEL_LABELS, tuitionRange } from "@/lib/study-costs";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import { cn, formatCurrency, formatNaira } from "@/lib/utils";

function millions(ngn: number) {
  return `₦${(ngn / 1_000_000).toFixed(1)}m`;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-900">{label}</span>
        <span className="tabular-nums text-muted">{score}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-900/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", score >= 75 ? "bg-gold-500" : score >= 50 ? "bg-ink-700" : "bg-ink-900/30")}
        />
      </div>
    </div>
  );
}

function toolLinks(r: MatchResult, answers: MatcherAnswers) {
  const q = `country=${r.country.id}&level=${answers.level}`;
  return { cost: `/tools/cost-calculator?${q}`, timeline: `/tools/timeline-planner?${q}` };
}

function TopMatch({ result, answers }: { result: MatchResult; answers: MatcherAnswers }) {
  const c = result.country;
  const [min, max] = tuitionRange(c, answers.level);
  const links = toolLinks(result, answers);
  const years = answers.level === "undergraduate" ? c.years.undergraduate : answers.level === "phd" ? c.years.phd : answers.level === "medicine" ? c.years.medicine : answers.level === "foundation" ? 1 : c.years.masters;

  const facts = [
    { label: "Typical year (tuition + living)", value: `${millions(result.annualCostNgn)}`, sub: `from ${millions(result.lowCostNgn)} at lower-cost universities` },
    { label: "Tuition per year", value: max === 0 ? "Usually funded" : `${formatCurrency(min, c.currency)} – ${formatCurrency(max, c.currency)}` },
    { label: "Typical length", value: `${years} year${years === 1 ? "" : "s"}` },
    { label: "Main intakes", value: c.intakes.join(", ") },
    { label: "Work while studying", value: c.workNote },
    { label: "After graduating", value: c.pswNote },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-hover">
      <div className="bg-ink-900 px-6 py-6 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">Your top match</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-3 font-display text-2xl sm:text-3xl">
            <Flag code={c.flagCode} size={34} alt={`${c.name} flag`} />
            {c.name}
          </h2>
          <div className="text-right">
            <p className="font-display text-3xl tabular-nums sm:text-4xl">{result.score}%</p>
            <p className="text-xs text-white/60">match</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Why it fits</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {result.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-900">
                <Check size={16} className="mt-0.5 shrink-0 text-gold-500" strokeWidth={3} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">How we scored it</p>
          <div className="mt-3 flex flex-col gap-3">
            {result.factors.map((f) => (
              <ScoreBar key={f.id} label={`${f.label} (${f.weight}%)`} score={f.score} />
            ))}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-px border-y border-ink-900/8 bg-ink-900/8 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="bg-offwhite px-6 py-4">
            <dt className="text-xs text-muted">{f.label}</dt>
            <dd className="mt-1 text-sm font-semibold leading-snug text-ink-900">{f.value}</dd>
            {f.sub && <dd className="mt-0.5 text-xs text-muted">{f.sub}</dd>}
          </div>
        ))}
      </dl>

      {result.watchOuts.length > 0 && (
        <div className="mx-6 mt-6 rounded-xl border border-gold-500/25 bg-gold-500/5 p-4 sm:mx-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <AlertTriangle size={16} className="text-gold-500" /> Worth knowing
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.watchOuts.map((w) => (
              <li key={w} className="text-sm leading-relaxed text-ink-900/80">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:flex-wrap sm:p-8">
        <Button href={links.cost} icon={<Calculator size={16} />} className="justify-center">
          Full cost breakdown
        </Button>
        <Button href={links.timeline} variant="secondary" icon={<CalendarClock size={16} />} className="justify-center">
          Plan my timeline
        </Button>
        {c.popular && (
          <Button href={`/destinations/${c.id}`} variant="ghost" icon={<ArrowRight size={16} />} className="justify-center">
            {c.name} guide
          </Button>
        )}
      </div>
    </div>
  );
}

function RunnerUp({ result, rank, answers }: { result: MatchResult; rank: number; answers: MatcherAnswers }) {
  const c = result.country;
  const links = toolLinks(result, answers);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-900/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 font-display text-lg text-ink-900">
          <span className="text-sm text-ink-900/30">#{rank}</span>
          <Flag code={c.flagCode} size={24} alt="" />
          {c.name}
        </p>
        <span className="font-display text-xl tabular-nums text-gold-500">{result.score}%</span>
      </div>
      <p className="mt-2 text-sm text-muted">Typical year: {millions(result.annualCostNgn)}</p>
      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {result.strengths.slice(0, 3).map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-ink-900">
            <Check size={14} className="mt-1 shrink-0 text-gold-500" strokeWidth={3} />
            {s}
          </li>
        ))}
      </ul>
      {result.watchOuts[0] && <p className="mt-3 text-xs leading-relaxed text-muted">Watch out: {result.watchOuts[0]}</p>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <Link href={links.cost} className="inline-flex min-h-[44px] items-center text-gold-500 hover:underline">
          Costs →
        </Link>
        <Link href={links.timeline} className="inline-flex min-h-[44px] items-center text-gold-500 hover:underline">
          Timeline →
        </Link>
      </div>
    </div>
  );
}

export function MatcherResults({ results, answers, onEdit }: { results: MatchResult[]; answers: MatcherAnswers; onEdit: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [top, second, third] = results;
  const fieldLabel = answers.field === "undecided" ? "an undecided field" : FIELDS.find((f) => f.id === answers.field)?.label;
  const cheapest = [...results].sort((a, b) => a.lowCostNgn - b.lowCostNgn).slice(0, 3);
  const budgetStretched = top.factors.find((f) => f.id === "budget")!.score < 60;

  const waMessage = `Hi Baseline, I just used the Course Matcher. I want to study ${LEVEL_LABELS[answers.level]} in ${fieldLabel} with a budget of about ${formatNaira(
    answers.budgetNgn,
  )} a year. My top matches were ${results
    .slice(0, 3)
    .map((r) => `${r.country.name} (${r.score}%)`)
    .join(", ")}. Can we talk?`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {LEVEL_LABELS[answers.level]} · {fieldLabel} · budget about {millions(answers.budgetNgn)}/yr · compared across {results.length} countries
        </p>
        <button type="button" onClick={onEdit} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gold-500 hover:underline">
          <Pencil size={14} /> Edit answers
        </button>
      </div>

      {budgetStretched && (
        <div className="mb-6 rounded-xl border border-gold-500/25 bg-gold-500/5 p-4 text-sm leading-relaxed text-ink-900">
          <p className="font-semibold">Your budget is tight for most countries.</p>
          <p className="mt-1 text-ink-900/80">
            The lowest-cost options for {LEVEL_LABELS[answers.level].toLowerCase()} are{" "}
            {cheapest.map((r, i) => (
              <span key={r.country.id}>
                {i > 0 && (i === cheapest.length - 1 ? " and " : ", ")}
                <strong>{r.country.name}</strong> (from {millions(r.lowCostNgn)}/yr)
              </span>
            ))}
            . Scholarships and cheaper cities can also close the gap: a counsellor can show you how.
          </p>
        </div>
      )}

      <TopMatch result={top} answers={answers} />

      <h3 className="mt-10 font-display text-xl text-ink-900">Also a strong fit</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[second, third].filter(Boolean).map((r, i) => (
          <RunnerUp key={r.country.id} result={r} rank={i + 2} answers={answers} />
        ))}
      </div>

      <div className="mt-10">
        {!unlocked ? (
          <LeadCaptureForm
            source="course-matcher"
            payload={{ answers, top: results.slice(0, 5).map((r) => ({ country: r.country.name, score: r.score })) }}
            title={`See all ${results.length} countries ranked for you`}
            description="Get your full ranking with costs and post-study work for every country, and we'll send your top matches to WhatsApp."
            onSuccess={(v) => {
              setName(v.name);
              setUnlocked(true);
              trackEvent("course_matcher_lead_captured");
            }}
          />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="font-display text-xl text-ink-900">
              {name ? `${name.split(" ")[0]}, here's` : "Here's"} your full ranking
            </h3>
            <div className="mt-4 overflow-hidden rounded-2xl border border-ink-900/10">
              {results.map((r, i) => (
                <div key={r.country.id} className={cn("flex items-center gap-3 px-4 py-3 sm:gap-4", i % 2 === 0 ? "bg-white" : "bg-offwhite")}>
                  <span className="w-7 shrink-0 text-sm tabular-nums text-ink-900/40">#{i + 1}</span>
                  <Flag code={r.country.flagCode} size={22} alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{r.country.name}</p>
                    <p className="truncate text-xs text-muted">
                      {millions(r.annualCostNgn)}/yr · {r.country.pswMonths > 0 ? `${r.country.pswMonths} mo post-study work` : "limited post-study work"}
                    </p>
                  </div>
                  <div className="hidden w-24 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/10">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${r.score}%` }} />
                    </div>
                  </div>
                  <span className="w-11 shrink-0 text-right font-display tabular-nums text-ink-900">{r.score}%</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} className="justify-center">
                Talk it through on WhatsApp
              </Button>
              <Button href="/book" variant="secondary" className="justify-center">
                Book a free consultation
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-ink-900/15 p-5 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-ink-900">Thinking of a country that isn&apos;t listed?</p>
        <p className="mt-1">
          We compare {results.length} countries here, but we help students go anywhere in the world.{" "}
          <a href={buildWhatsAppLink("Hi Baseline, I'd like advice on studying in a country that isn't in your Course Matcher.")} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-500 hover:underline">
            Ask us on WhatsApp
          </a>
          .
        </p>
      </div>

      <details className="mt-6 rounded-2xl border border-ink-900/10 bg-offwhite p-5 text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-ink-900">How the matching works</summary>
        <p className="mt-3 leading-relaxed">
          Each country gets a score out of 100 from six factors: budget (30%), your priorities (20%), academics (15%), language and English (15%), course
          fit (10%) and timing (10%). Countries outside your preferred regions are marked down. Costs are typical estimates for a mid-range university,
          shared housing and a standard city, converted at current naira rates. Your priorities: {answers.priorities.map((p) => PRIORITY_LABELS[p].label).join(", ")}.
        </p>
        <p className="mt-2 leading-relaxed">
          This is a planning guide, not an admissions decision. A counsellor will check real entry requirements for your exact course.
        </p>
      </details>

      <div className="mt-6 text-center">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-muted hover:text-ink-900">
          <RotateCcw size={12} /> Start over
        </button>
      </div>
    </div>
  );
}
