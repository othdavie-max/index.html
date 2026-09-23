import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { otherDestinations } from "@/data/other-destinations";

export function OtherDestinationsChips() {
  return (
    <div className="mt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Students also ask us about</p>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {otherDestinations.map((c) => (
          <Link
            key={c.name}
            href={`/destinations/other?country=${encodeURIComponent(c.name)}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-900/10 bg-white px-3.5 py-2 text-sm text-ink-900 transition-colors hover:border-gold-500/40 hover:bg-gold-500/5"
          >
            <Flag code={c.flagCode} size={16} alt={`${c.name} flag`} />
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
