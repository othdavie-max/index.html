import { GraduationCap, Building2, Globe2, CalendarClock } from "lucide-react";
import { StatCounter } from "@/components/ui/stat-counter";
import { siteSettings } from "@/data/site-settings";

// Renders nothing until real numbers are supplied (siteSettings.showStats),
// same truthfulness gate as the rest of the site — never replace the old
// placeholder-logo marquee ("UK-1", "IE-1"...) with invented figures.
// Once real partner-university logos exist, reintroduce <Marquee> here
// (see src/components/ui/marquee.tsx), greyscale by default, colour +
// paused on hover.
export function TrustStrip() {
  if (!siteSettings.showStats) return null;

  const stats = [
    { icon: GraduationCap, label: "Students placed", value: siteSettings.stats.studentsPlaced },
    { icon: Building2, label: "Partner universities", value: siteSettings.stats.partnerUniversities, suffix: "+" },
    { icon: Globe2, label: "Destination countries", value: siteSettings.stats.countries },
    { icon: CalendarClock, label: "Years of experience", value: siteSettings.stats.yearsOfExperience, suffix: "+" },
  ];

  return (
    <section className="border-y border-ink-900/8 bg-offwhite py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        {stats.map((s) => (
          <StatCounter key={s.label} icon={s.icon} value={s.value} suffix={s.suffix} label={s.label} />
        ))}
      </div>
    </section>
  );
}
