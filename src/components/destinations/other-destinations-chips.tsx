import Link from "next/link";
import { Flag } from "@/components/ui/flag";
import { otherDestinations } from "@/data/other-destinations";
import { cn } from "@/lib/utils";

export function OtherDestinationsChips({ dark = false }: { dark?: boolean }) {
  return (
    <div>
      <p className={cn("text-xs font-semibold uppercase tracking-[0.15em]", dark ? "text-white/50" : "text-muted")}>
        Students also ask us about
      </p>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {otherDestinations.map((c) => (
          <Link
            key={c.name}
            href={`/destinations/other?country=${encodeURIComponent(c.name)}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
              dark
                ? "border-white/15 bg-white/5 text-white hover:border-gold-500/50 hover:bg-white/10"
                : "border-ink-900/10 bg-white text-ink-900 hover:border-gold-500/40 hover:bg-gold-500/5",
            )}
          >
            <Flag code={c.flagCode} size={16} alt={`${c.name} flag`} />
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
