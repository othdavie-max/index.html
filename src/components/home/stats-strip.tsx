import { Counter } from "@/components/ui/counter";
import { siteSettings } from "@/data/site-settings";

// Renders nothing when showStats is off — never ship this section with
// placeholder/invented numbers.
export function StatsStrip() {
  if (!siteSettings.showStats) return null;

  const stats = [
    { label: "Students placed", value: siteSettings.stats.studentsPlaced },
    { label: "Partner universities", value: siteSettings.stats.partnerUniversities, suffix: "+" },
    { label: "Destination countries", value: siteSettings.stats.countries },
    { label: "Years of experience", value: siteSettings.stats.yearsOfExperience, suffix: "+" },
  ];

  return (
    <section className="bg-red-500 py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <Counter value={s.value} suffix={s.suffix} className="font-display text-3xl font-bold text-white sm:text-4xl" />
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
