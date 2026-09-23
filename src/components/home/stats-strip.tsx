import { GraduationCap, Building2, Globe2, CalendarClock } from "lucide-react";
import { Counter } from "@/components/ui/counter";
import { Button } from "@/components/ui/button";
import { siteSettings } from "@/data/site-settings";

// Renders nothing when showStats is off — never ship this section with
// placeholder/invented numbers.
export function StatsStrip() {
  if (!siteSettings.showStats) return null;

  const stats = [
    { label: "Students placed", value: siteSettings.stats.studentsPlaced, icon: GraduationCap },
    { label: "Partner universities", value: siteSettings.stats.partnerUniversities, suffix: "+", icon: Building2 },
    { label: "Destination countries", value: siteSettings.stats.countries, icon: Globe2 },
    { label: "Years of experience", value: siteSettings.stats.yearsOfExperience, suffix: "+", icon: CalendarClock },
  ];

  return (
    <section className="relative overflow-hidden bg-ink-950 py-16 sm:py-20">
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">Our Impact</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white">
            More than just a process<span className="text-gold-500">.</span>
          </h2>
          <p className="mt-3 text-sm text-white/60">
            We don&apos;t just help you study abroad, we help you build a future without limits.
          </p>
          <Button href="/book" className="mt-6" magnetic>
            Start Your Journey
          </Button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <s.icon size={22} className="text-gold-500" />
              <Counter value={s.value} suffix={s.suffix} className="mt-3 block font-display text-3xl font-bold text-white sm:text-4xl" />
              <p className="mt-1 text-xs font-medium text-white/60 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
