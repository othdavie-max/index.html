import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { otherDestinationsByRegion } from "@/data/other-destinations";

export function OtherDestinationsGrouped() {
  const groups = otherDestinationsByRegion();

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <div key={group.region}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500">{group.region}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.countries.map((c) => (
              <Link
                key={c.name}
                href={`/destinations/other?country=${encodeURIComponent(c.name)}`}
                className="flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white px-3 py-1.5 text-sm text-ink-900 transition-colors hover:border-gold-500/40 hover:bg-gold-500/5"
              >
                <Flag code={c.flagCode} size={16} alt={`${c.name} flag`} />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
