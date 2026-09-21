import { Marquee } from "@/components/ui/marquee";
import { partners } from "@/data/partners";

export function TrustStrip() {
  return (
    <section className="border-y border-navy-900/8 bg-offwhite py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Our partner institutions
        </p>
        <Marquee>
          {partners.map((p) => (
            <div
              key={p.slug}
              className="flex h-14 min-w-[160px] items-center justify-center rounded-xl border border-navy-900/8 bg-white px-6 text-sm font-semibold text-navy-900/50"
              title={p.name}
            >
              {p.logoPlaceholder}
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
