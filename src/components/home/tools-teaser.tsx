import Link from "next/link";
import { Compass, Calculator, CalendarClock, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

const tools = [
  {
    href: "/tools/course-matcher",
    icon: Compass,
    title: "Course Matcher",
    description: "A 2-minute quiz that ranks the six destinations by fit for your grades, budget and goals.",
    preview: "Match: Canada 87%",
  },
  {
    href: "/tools/cost-calculator",
    icon: Calculator,
    title: "Cost Calculator",
    description: "Estimate tuition and living costs in naira, broken down by country, level and city.",
    preview: "₦18.4M / year",
  },
  {
    href: "/tools/timeline-planner",
    icon: CalendarClock,
    title: "Timeline Planner",
    description: "A personalised, milestone-by-milestone roadmap working backwards from your intake date.",
    preview: "9 milestones",
  },
];

export function ToolsTeaser() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Free Tools"
          title="Plan before you"
          emphasis="apply."
          description="Three interactive tools to help you make decisions with real numbers, not guesswork."
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tools.map((tool) => (
            <RevealItem key={tool.href}>
              <Link
                href={tool.href}
                className="group flex h-full flex-col justify-between rounded-2xl border border-ink-900/8 bg-offwhite p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/30 hover:shadow-[0_20px_40px_-15px_rgba(10,31,68,0.2)]"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white">
                    <tool.icon size={22} />
                  </div>
                  <h3 className="mt-5 font-display text-xl text-ink-900">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{tool.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-xl bg-white px-4 py-3">
                  <span className="font-display text-sm text-gold-500">{tool.preview}</span>
                  <ArrowRight size={16} className="text-ink-900 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
