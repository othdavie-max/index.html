"use client";

import { createContext, useContext, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Flag } from "@/components/ui/flag";
import { howItWorksSteps } from "@/data/how-it-works";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

// Reduced-motion users get every stage in its finished state: each
// animation below runs with duration 0, so it lands on its final value.
const ReducedContext = createContext(false);

function useTransition() {
  const reduced = useContext(ReducedContext);
  return (delay = 0, duration = 0.45) => (reduced ? { duration: 0 } : { delay, duration, ease: EASE });
}

function Appear({ delay = 0, y = 8, className, children }: { delay?: number; y?: number; className?: string; children: ReactNode }) {
  const reduced = useContext(ReducedContext);
  const t = useTransition();
  return (
    <motion.div initial={reduced ? false : { opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={t(delay)} className={className}>
      {children}
    </motion.div>
  );
}

function Tick({ delay }: { delay: number }) {
  const reduced = useContext(ReducedContext);
  const t = useTransition();
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-900/15">
      <motion.span
        initial={reduced ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={t(delay, 0.35)}
        className="absolute -inset-px flex items-center justify-center rounded-full bg-gold-500 text-white"
      >
        <Check size={12} strokeWidth={3} />
      </motion.span>
    </span>
  );
}

function Fill({ delay, className }: { delay: number; className?: string }) {
  const reduced = useContext(ReducedContext);
  const t = useTransition();
  return (
    <span className={cn("relative block h-1 overflow-hidden rounded-full bg-ink-900/10", className)}>
      <motion.span
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={t(delay, 0.5)}
        className="absolute inset-0 origin-left rounded-full bg-gold-500"
      />
    </span>
  );
}

function Caption({ stage }: { stage: number }) {
  const step = howItWorksSteps[stage];
  return (
    <Appear y={4} className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-gold-500 sm:tracking-[0.15em]">
      <span className="tabular-nums">{step.number}</span>
      <span className="hidden h-px w-4 bg-gold-500/40 min-[400px]:block" />
      <span className="truncate">{step.caption}</span>
    </Appear>
  );
}

/* 01 — the counsellor fills in the student's profile */
const PROFILE = [
  { label: "Goal", value: "Master's degree abroad" },
  { label: "Background", value: "BSc, Second Class Upper" },
  { label: "Budget", value: "Agreed range" },
];
const PREFERRED = ["gb", "ca", "ie"];

function ConsultationStage() {
  const reduced = useContext(ReducedContext);
  const t = useTransition();
  return (
    <>
      <Caption stage={0} />
      <div className="divide-y divide-dashed divide-ink-900/10">
        {PROFILE.map((row, i) => (
          <div key={row.label} className="grid grid-cols-[88px_1fr] items-center gap-3 py-2.5">
            <span className="text-xs text-muted">{row.label}</span>
            <span className="relative flex h-5 items-center">
              <motion.span
                initial={reduced ? false : { opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={t(0.35 + i * 0.35, 0.25)}
                className="absolute left-0 h-2.5 w-28 rounded-full bg-ink-100"
              />
              <motion.span
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={t(0.45 + i * 0.35)}
                className="truncate text-sm font-medium text-ink-900"
              >
                {row.value}
              </motion.span>
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[88px_1fr] items-center gap-3 py-2.5">
          <span className="text-xs text-muted">Destinations</span>
          <span className="flex items-center gap-1.5">
            {PREFERRED.map((code, i) => (
              <Appear key={code} delay={1.5 + i * 0.12} y={4}>
                <Flag code={code} size={22} />
              </Appear>
            ))}
          </span>
        </div>
      </div>
      <Appear delay={2} className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-600">
          <Check size={13} strokeWidth={3} /> Goals understood
        </span>
      </Appear>
    </>
  );
}

/* 02 — options appear, the ones that don't fit fall away, a shortlist remains */
// Shortlisted options match the destinations picked in stage 01 (UK, Canada, Ireland).
const OPTIONS = [
  { course: "MSc Data Science", place: "University in the UK", flag: "gb", fit: true, tickDelay: 1.35 },
  { course: "MBA", place: "University in the USA", flag: "us", fit: false, tickDelay: 0 },
  { course: "MSc Computer Science", place: "University in Canada", flag: "ca", fit: true, tickDelay: 1.5 },
  { course: "MEng Civil Engineering", place: "University in Australia", flag: "au", fit: false, tickDelay: 0 },
  { course: "MSc Business Analytics", place: "University in Ireland", flag: "ie", fit: true, tickDelay: 1.65 },
];

function SelectionStage() {
  const reduced = useContext(ReducedContext);
  const t = useTransition();
  return (
    <>
      <Caption stage={1} />
      <div className="flex flex-col gap-0.5">
        {OPTIONS.map((o, i) => {
          return (
            <motion.div
              key={o.course}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: o.fit ? 1 : [0, 1, 1, 0.35], y: 0 }}
              transition={reduced ? { duration: 0 } : o.fit ? t(i * 0.08) : { duration: 1.5, times: [0, 0.3, 0.7, 1], delay: i * 0.08, ease: "easeOut" }}
              className="relative flex items-center gap-3 rounded-xl px-3 py-1.5"
            >
              {o.fit && (
                <motion.span
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={t(1.15, 0.4)}
                  className="absolute inset-0 rounded-xl bg-offwhite ring-1 ring-gold-500/25"
                />
              )}
              <Flag code={o.flag} size={20} className="relative" />
              <span className="relative min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-semibold", o.fit ? "text-ink-900" : "text-ink-900/70 line-through decoration-ink-900/30")}>
                  {o.course}
                </span>
                <span className="block truncate text-xs text-muted">{o.place}</span>
              </span>
              {o.fit && (
                <span className="relative">
                  <Tick delay={o.tickDelay} />
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <Appear delay={1.9} className="mt-3 text-xs font-semibold text-ink-900">
        3 courses shortlisted for you
      </Appear>
    </>
  );
}

/* 03 — documents are prepared, the application goes in, an offer comes back */
const DOCUMENTS = ["Transcripts", "Statement of purpose", "References", "English test result"];
const PIPELINE = ["Documents", "Submitted", "Offer received"];

function ApplicationStage() {
  return (
    <>
      <Caption stage={2} />
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        {DOCUMENTS.map((doc, i) => (
          <Appear key={doc} delay={0.1 + i * 0.08} className="flex items-center gap-2.5 rounded-xl border border-ink-900/8 px-3 py-2">
            <Tick delay={0.4 + i * 0.22} />
            <span className="truncate text-[13px] font-medium text-ink-900">{doc}</span>
          </Appear>
        ))}
      </div>
      <div className="mt-5 flex items-center">
        {PIPELINE.map((label, i) => (
          <div key={label} className={cn("flex items-center", i < PIPELINE.length - 1 && "flex-1")}>
            <Appear delay={1.4 + i * 0.4} y={0} className="flex flex-col items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded-full", i === PIPELINE.length - 1 ? "bg-gold-500 ring-4 ring-gold-500/15" : "bg-ink-900")} />
            </Appear>
            {i < PIPELINE.length - 1 && <Fill delay={1.5 + i * 0.4} className="mx-2 flex-1" />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs">
        {PIPELINE.map((label, i) => (
          <Appear key={label} delay={1.45 + i * 0.4} y={0} className={cn(i === PIPELINE.length - 1 ? "font-semibold text-gold-600" : "text-muted")}>
            {label}
          </Appear>
        ))}
      </div>
      <Appear delay={2.5} className="mt-4 text-xs text-muted">
        Next: compare offers and scholarships together.
      </Appear>
    </>
  );
}

/* 04 — visa documents checked off, the application moves through its stages */
const VISA_CHECKS = ["Offer letter", "Proof of funds", "Passport", "Interview prep"];
const VISA_STATUS = ["Preparing", "Submitted", "Decision"];

function VisaStage() {
  return (
    <>
      <Caption stage={3} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {VISA_CHECKS.map((c, i) => (
          <div key={c} className="flex items-center gap-2.5">
            <Tick delay={0.25 + i * 0.22} />
            <span className="truncate text-[13px] font-medium text-ink-900">{c}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-ink-900/8 bg-offwhite p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-900">Visa application</span>
          <Appear delay={2.4} y={0}>
            <span className="rounded-full bg-gold-500/10 px-2.5 py-1 text-xs font-semibold text-gold-600">Decision received</span>
          </Appear>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {VISA_STATUS.map((s, i) => (
            <div key={s}>
              <Fill delay={1.3 + i * 0.4} />
              <span className="mt-1.5 block text-xs text-muted">{s}</span>
            </div>
          ))}
        </div>
      </div>
      <Appear delay={2.6} className="mt-3 text-xs text-muted">
        Complete, checked and well prepared before it goes in.
      </Appear>
    </>
  );
}

/* 05 — everything comes together: the student is ready to travel */
const READY = ["Pre-departure briefing", "Packing checklist", "Travel booked"];

function DepartureStage() {
  return (
    <>
      <Caption stage={4} />
      <Appear delay={0.1} y={14} className="relative overflow-hidden rounded-xl bg-ink-900 text-white">
        <div className="flex items-center justify-between px-4 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          <span>Boarding pass</span>
          <span>Baseline</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3.5 pt-2">
          <div>
            <p className="font-display text-2xl font-bold leading-none">ABV</p>
            <p className="mt-1 text-xs text-white/60">Abuja</p>
          </div>
          <span className="flex flex-1 items-center gap-2 text-white/40">
            <span className="h-px flex-1 border-t border-dashed border-white/30" />
            <ArrowRight size={14} />
          </span>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 font-display text-2xl font-bold leading-none">
              <Flag code="gb" size={18} /> LHR
            </p>
            <p className="mt-1 text-xs text-white/60">Your new campus</p>
          </div>
        </div>
        <div className="relative border-t border-dashed border-white/20">
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-white" />
          <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-white" />
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-3 text-xs">
          <div>
            <p className="text-white/50">Student</p>
            <p className="mt-0.5 font-semibold">You</p>
          </div>
          <div>
            <p className="text-white/50">Intake</p>
            <p className="mt-0.5 font-semibold">September</p>
          </div>
          <div>
            <p className="text-white/50">Status</p>
            <Appear delay={1.6} y={0}>
              <p className="mt-0.5 font-semibold text-gold-500">Ready</p>
            </Appear>
          </div>
        </div>
      </Appear>
      <div className="mt-3 flex flex-col gap-2">
        {READY.map((r, i) => (
          <div key={r} className="flex items-center gap-2.5">
            <Tick delay={0.7 + i * 0.25} />
            <span className="text-[13px] font-medium text-ink-900">{r}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const STAGES = [ConsultationStage, SelectionStage, ApplicationStage, VisaStage, DepartureStage];

export function JourneyVisual({
  stage,
  play,
  reduced,
  className,
}: {
  stage: number;
  /** Stage contents mount (and animate) only once the card is on screen. */
  play: boolean;
  reduced: boolean;
  className?: string;
}) {
  const Stage = STAGES[stage];
  return (
    <ReducedContext.Provider value={reduced}>
      <div aria-hidden="true" className={cn("overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-hover", className)}>
        <div className="flex items-center justify-between gap-3 border-b border-ink-900/8 px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">You</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-ink-900">Your student file</p>
              <p className="truncate text-xs text-muted">
                With your <span className="hidden min-[400px]:inline md:hidden lg:inline">Baseline </span>counsellor
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            {howItWorksSteps.map((s, i) => (
              <span key={s.id} className="relative h-1 w-4 overflow-hidden rounded-full bg-ink-900/10 sm:w-5">
                <motion.span
                  initial={false}
                  animate={{ scaleX: i <= stage ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }}
                  className="absolute inset-0 origin-left rounded-full bg-gold-500"
                />
              </span>
            ))}
          </div>
        </div>

        <div className="relative h-[340px] px-5 pb-3 pt-4 sm:px-6 lg:h-[350px]">
          {play && (
            <AnimatePresence mode="wait">
              <motion.div key={stage} exit={reduced ? undefined : { opacity: 0, y: -6, transition: { duration: 0.2 } }}>
                <Stage />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </ReducedContext.Provider>
  );
}
