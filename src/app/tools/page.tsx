import type { Metadata } from "next";
import { Compass, Calculator, CalendarClock } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Free Planning Tools",
  description: "Course Matcher, Cost Calculator and Timeline Planner — three free tools to help you plan your study abroad journey.",
  alternates: { canonical: "/tools" },
};

const tools = [
  { href: "/tools/course-matcher", icon: Compass, title: "Course Matcher", description: "A 2-minute quiz that ranks destinations by fit for your grades, budget and goals." },
  { href: "/tools/cost-calculator", icon: Calculator, title: "Cost Calculator", description: "Estimate tuition and living costs in naira, broken down by country, level and city." },
  { href: "/tools/timeline-planner", icon: CalendarClock, title: "Timeline Planner", description: "A personalised, milestone-by-milestone roadmap working backwards from your intake." },
];

export default function ToolsPage() {
  return (
    <>
      <PageHero eyebrow="Free Tools" title="Plan before you" emphasis="apply." description="Three interactive tools to help you make decisions with real numbers, not guesswork." />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {tools.map((tool) => (
              <RevealItem key={tool.href}>
                <div className="flex h-full flex-col rounded-2xl border border-ink-900/8 bg-offwhite p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white">
                    <tool.icon size={22} />
                  </div>
                  <h2 className="mt-5 font-display text-xl text-ink-900">{tool.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{tool.description}</p>
                  <Button href={tool.href} variant="secondary" className="mt-6 justify-center">
                    Try it now
                  </Button>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
