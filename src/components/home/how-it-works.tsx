"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { howItWorksSteps } from "@/data/how-it-works";
import { SectionHeading } from "@/components/ui/section-heading";

export function HowItWorks() {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const triggers = stepRefs.current.map((el, i) => {
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => self.isActive && setActive(i),
      });
    });

    return () => triggers.forEach((t) => t?.kill());
  }, []);

  return (
    <section className="bg-ink-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How It Works" title="Six steps from" emphasis="here to there." dark align="center" className="mx-auto" />

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col">
            {howItWorksSteps.map((step, i) => (
              <div
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="flex min-h-[22vh] items-center gap-4 py-4 lg:min-h-[30vh]"
              >
                <div
                  className={cn(
                    "flex items-start gap-4 rounded-xl px-4 py-4 transition-all duration-500",
                    active === i ? "bg-white/8" : "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-500",
                      active === i ? "border-gold-500 bg-gold-500 text-ink-900" : "border-white/20 text-white/60",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-base text-white sm:text-lg">{step.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative hidden lg:block">
            <div className="sticky top-28 flex aspect-square items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
              <span className="font-display text-[10rem] leading-none text-white/10">{active + 1}</span>
              <div className="absolute bottom-10 left-10 right-10">
                <p className="font-display text-2xl text-white">{howItWorksSteps[active].title}</p>
                <p className="mt-2 text-sm text-white/60">{howItWorksSteps[active].description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
