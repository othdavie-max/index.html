import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { WorldMapLoader } from "@/components/destinations/world-map-loader";
import { destinations } from "@/data/destinations";
import { formatNaira } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Study Destinations",
  description: "Explore study-abroad options in the UK, Ireland, Germany, Canada, the USA and Australia: tuition ranges, intakes, and post-study work.",
  alternates: { canonical: "/destinations" },
};

export default function DestinationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Destinations"
        title="Six countries,"
        emphasis="one clear plan."
        description="Every destination offers something different. Compare tuition, intakes and post-study work before you decide."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-sm text-muted">Hover or tap a highlighted country for a quick preview, or click for the full picture.</p>
          <WorldMapLoader />
        </div>
      </section>

      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d) => (
              <RevealItem key={d.code}>
                <Link
                  href={`/destinations/${d.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-offwhite p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_20px_40px_-15px_rgba(11,_37,_69,0.2)]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-4xl">{d.flag}</span>
                    <ArrowUpRight size={18} className="text-ink-900/40 transition-colors group-hover:text-gold-500" />
                  </div>
                  <h2 className="mt-4 font-display text-xl text-ink-900">{d.name}</h2>
                  <p className="mt-1 text-sm text-muted">{d.heroTagline}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-900/8 pt-4 text-xs">
                    <div>
                      <p className="text-muted">Tuition / year (est.)</p>
                      <p className="mt-0.5 font-semibold text-ink-900">
                        {formatNaira(d.tuitionRangeNgnPerYear[0])}–{formatNaira(d.tuitionRangeNgnPerYear[1])}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted">Intakes</p>
                      <p className="mt-0.5 font-semibold text-ink-900">{d.intakes.join(", ")}</p>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>

          <p className="mt-8 text-center text-xs text-muted">
            Figures are estimates only and vary by university and city, see each country page and our{" "}
            <Link href="/tools/cost-calculator" className="underline">
              Cost Calculator
            </Link>{" "}
            for a personalised breakdown.
          </p>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
