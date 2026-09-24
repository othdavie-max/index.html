"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { JourneyVisual } from "@/components/home/journey-visual";
import { howItWorksSteps, type HowItWorksStep } from "@/data/how-it-works";
import { cn } from "@/lib/utils";

// The step whose block crosses the middle of the viewport is the active one.
// IntersectionObserver (not a per-frame scroll listener) keeps this cheap,
// and an element hidden with display:none never intersects, so the desktop
// and mobile layouts each track only while they're the visible one.
function useActiveStep(refs: RefObject<(HTMLElement | null)[]>) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [refs]);
  return active;
}

function StepRail({ active, onSelect, className }: { active: number; onSelect: (i: number) => void; className?: string }) {
  return (
    <nav aria-label="Stages of the Baseline journey" className={className}>
      <ol className="grid grid-cols-5 gap-2">
        {howItWorksSteps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === active ? "step" : undefined}
              className="group flex min-h-[48px] w-full flex-col items-start gap-1.5 rounded-md pt-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
            >
              <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-ink-900/10">
                <span
                  className={cn(
                    "absolute inset-0 origin-left rounded-full bg-gold-500 transition-transform duration-500 ease-out",
                    i <= active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums transition-colors",
                    i === active ? "text-gold-500" : "text-ink-900/40 group-hover:text-ink-900/70",
                  )}
                >
                  <span className="sr-only">Stage </span>
                  {s.number}
                </span>
                <span
                  className={cn(
                    "sr-only text-[13px] font-medium leading-tight transition-colors sm:not-sr-only",
                    i === active ? "text-ink-900" : "text-muted group-hover:text-ink-900",
                  )}
                >
                  {s.short}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function MobileStage({
  step,
  index,
  reduced,
  stepRef,
}: {
  step: HowItWorksStep;
  index: number;
  reduced: boolean;
  stepRef: (el: HTMLLIElement | null) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, amount: 0.35 });
  return (
    <li ref={stepRef} data-step={index} className="scroll-mt-28 md:grid md:grid-cols-2 md:gap-x-10">
      <div className="md:col-start-2 md:row-start-1 md:self-end">
        <p className="text-sm font-semibold tabular-nums text-gold-500">{step.number}</p>
        <h3 className="mt-1.5 font-display text-h3 text-ink-900">{step.title}</h3>
      </div>
      <div ref={cardRef} className="mt-5 md:col-start-1 md:row-span-2 md:row-start-1 md:mt-0 md:self-center">
        <JourneyVisual stage={index} play={inView} reduced={reduced} />
      </div>
      <p className="mt-5 text-base leading-relaxed text-muted md:col-start-2 md:row-start-2 md:mt-3 md:self-start">{step.description}</p>
    </li>
  );
}

export function HowItWorks() {
  const reduced = !!useReducedMotion();

  const desktopRefs = useRef<(HTMLLIElement | null)[]>([]);
  const mobileRefs = useRef<(HTMLLIElement | null)[]>([]);
  const desktopActive = useActiveStep(desktopRefs);
  const mobileActive = useActiveStep(mobileRefs);

  const visualRef = useRef<HTMLDivElement>(null);
  const visualInView = useInView(visualRef, { once: true, amount: 0.3 });

  function jumpTo(refs: RefObject<(HTMLLIElement | null)[]>, i: number, block: ScrollLogicalPosition) {
    refs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block });
  }

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How Baseline Works"
          title="From your first conversation to your"
          emphasis="first day abroad."
          description="Baseline guides you through the whole journey, one stage at a time. Scroll through to see what we do with you at each step."
        />

        {/* Desktop: step copy scrolls on the left, the student file stays pinned on the right and evolves */}
        <div className="mt-16 hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 xl:gap-24">
          <ol>
            {howItWorksSteps.map((s, i) => (
              <li
                key={s.id}
                ref={(el) => {
                  desktopRefs.current[i] = el;
                }}
                data-step={i}
                className="flex min-h-[60vh] flex-col justify-center"
              >
                <div
                  className={cn(
                    "max-w-md transition-opacity duration-500",
                    desktopActive === i ? "opacity-100" : "opacity-30",
                  )}
                >
                  <p className="text-sm font-semibold tabular-nums text-gold-500">{s.number}</p>
                  <h3 className="mt-2 font-display text-h3 text-ink-900">{s.title}</h3>
                  <p className="mt-3 text-body text-muted">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div>
            <div className="sticky top-24 pt-[8vh]">
              <StepRail active={desktopActive} onSelect={(i) => jumpTo(desktopRefs, i, "center")} />
              <div ref={visualRef} className="mt-6 rounded-3xl bg-offwhite p-8 xl:p-10">
                <JourneyVisual stage={desktopActive} play={visualInView} reduced={reduced} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile & tablet: each stage is its own block with its own stage of the student file */}
        <div className="mt-10 lg:hidden">
          <div className="sticky top-0 z-30 -mx-4 border-b border-ink-900/8 bg-white/95 px-4 pb-1 backdrop-blur sm:-mx-6 sm:px-6">
            <StepRail active={mobileActive} onSelect={(i) => jumpTo(mobileRefs, i, "start")} />
          </div>
          <ol className="mt-10 flex flex-col gap-16">
            {howItWorksSteps.map((s, i) => (
              <MobileStage
                key={s.id}
                step={s}
                index={i}
                reduced={reduced}
                stepRef={(el) => {
                  mobileRefs.current[i] = el;
                }}
              />
            ))}
          </ol>
        </div>

        <div className="mt-14 flex justify-center lg:mt-4">
          <Button href="/book" variant="primary" magnetic icon={<ArrowRight size={16} />}>
            Step 1 is free
          </Button>
        </div>
      </div>
    </section>
  );
}
