import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { destinations } from "@/data/destinations";

const SHORT_NAME: Record<string, string> = {
  uk: "UK",
  ireland: "Ireland",
  germany: "Germany",
  canada: "Canada",
  usa: "USA",
  australia: "Australia",
};

export function HeroQuickstart() {
  return (
    <div className="mt-7">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">Where do you want to study?</p>
      <div className="no-scrollbar -mx-4 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {destinations.map((d) => (
          <Link
            key={d.slug}
            href={`/destinations/${d.slug}`}
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:border-gold-500 hover:bg-white/10"
          >
            <Flag code={d.flagCode} size={16} alt="" />
            {SHORT_NAME[d.code] ?? d.name}
          </Link>
        ))}
        <Link
          href="/tools/course-matcher"
          className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-gold-500/60 bg-gold-500/10 px-3.5 py-2 text-sm font-semibold text-gold-500 transition-colors hover:bg-gold-500/20"
        >
          Not sure? Take the quiz
        </Link>
      </div>
    </div>
  );
}
