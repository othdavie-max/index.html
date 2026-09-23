"use client";

import { MessagesSquare, Compass, FileText, Award, ShieldCheck, PlaneTakeoff, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { howItWorksSteps } from "@/data/how-it-works";

const icons: Record<string, LucideIcon> = {
  MessagesSquare,
  Compass,
  FileText,
  Award,
  ShieldCheck,
  PlaneTakeoff,
};

export function HowItWorks() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Process" title="How Baseline works" align="center" className="mx-auto" />

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-ink-900/10 md:block" />
          <RevealGroup className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {howItWorksSteps.map((step, i) => {
              const Icon = icons[step.icon];
              return (
                <RevealItem key={step.title} className="relative flex flex-col items-center text-center">
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-900/10 bg-white text-gold-500">
                    {Icon && <Icon size={22} />}
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 font-display text-sm font-bold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.description}</p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
