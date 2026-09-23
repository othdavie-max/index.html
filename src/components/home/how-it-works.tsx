"use client";

import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { howItWorksSteps } from "@/data/how-it-works";
import { ArrowRight } from "lucide-react";

export function HowItWorks() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 0.85", "end 0.6"] });

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Process" title="How Baseline works, start to finish" align="center" className="mx-auto" />

        <div ref={trackRef} className="relative mt-16">
          {/* Connecting line: static track + scroll-drawn progress, vertical on mobile, horizontal on desktop */}
          <svg className="pointer-events-none absolute bottom-7 left-7 top-7 w-px md:hidden" preserveAspectRatio="none">
            <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="currentColor" strokeWidth="2" className="text-ink-900/10" />
            <motion.line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="var(--color-gold-500)" strokeWidth="2" style={{ pathLength: scrollYProgress }} />
          </svg>
          <svg className="pointer-events-none absolute left-0 right-0 top-7 hidden h-[2px] md:block" preserveAspectRatio="none">
            <line x1="0" y1="1" x2="100%" y2="1" stroke="currentColor" strokeWidth="2" className="text-ink-900/10" />
            <motion.line x1="0" y1="1" x2="100%" y2="1" stroke="var(--color-gold-500)" strokeWidth="2" style={{ pathLength: scrollYProgress }} />
          </svg>

          <RevealGroup className="relative flex flex-col gap-10 md:grid md:grid-cols-6 md:gap-x-4 md:gap-y-0">
            {howItWorksSteps.map((s, i) => (
              <RevealItem key={s.title} className="flex gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold-500 bg-white shadow-soft">
                  <Icon3D name={s.icon as Icon3DName} size={26} alt="" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="md:mt-1">
                  <h3 className="font-display text-sm font-bold text-ink-900 md:text-base">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted md:text-xs">{s.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <div className="mt-12 flex justify-center">
          <Button href="/book" variant="primary" magnetic icon={<ArrowRight size={16} />}>
            Step 1 is free
          </Button>
        </div>
      </div>
    </section>
  );
}
