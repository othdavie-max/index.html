"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { howItWorksSteps } from "@/data/how-it-works";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 4500;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % howItWorksSteps.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reducedMotion, active]);

  function selectStep(i: number) {
    setActive(i);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const step = howItWorksSteps[active];

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Process" title="How Baseline works" align="center" className="mx-auto" />

        {/* Step selector: numbered nodes on a connecting progress line */}
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-ink-900/10 md:block" />
          <motion.div
            className="absolute left-0 top-7 hidden h-px bg-gold-500 md:block"
            animate={{ width: `${(active / (howItWorksSteps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-6">
            {howItWorksSteps.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => selectStep(i)}
                  className="group relative flex flex-col items-center text-center"
                  aria-current={isActive}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                >
                  <motion.span
                    animate={{ scale: isActive ? 1.15 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white transition-colors duration-300",
                      isActive ? "border-gold-500 shadow-lg shadow-gold-500/20" : "border-ink-900/10 opacity-50 group-hover:border-gold-500/50 group-hover:opacity-100",
                    )}
                  >
                    <Icon3D name={s.icon as Icon3DName} size={26} alt="" />
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300",
                        isActive ? "bg-gold-500 text-white" : "bg-ink-100 text-ink-900/50",
                      )}
                    >
                      {i + 1}
                    </span>
                  </motion.span>
                  <span className={cn("mt-3 hidden text-xs font-semibold sm:block", isActive ? "text-ink-900" : "text-ink-900/40")}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active step detail panel */}
        <Reveal className="mt-12">
          <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-10 sm:px-12 sm:py-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-10 sm:text-left"
              >
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gold-500/10">
                  <Icon3D name={step.icon as Icon3DName} size={44} alt="" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
                    Step {active + 1} of {howItWorksSteps.length}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{step.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot navigation */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {howItWorksSteps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => selectStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === active ? "w-6 bg-gold-500" : "w-2 bg-ink-900/15 hover:bg-ink-900/30",
                )}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
