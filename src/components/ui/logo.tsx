import Link from "next/link";
import { cn } from "@/lib/utils";

// PLACEHOLDER wordmark. Swap for the real logo here — this is the single
// place the logo renders across the site.
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex flex-col leading-none group", className)} aria-label="Baseline Educational Services — Home">
      <span
        className={cn(
          "font-display text-xl font-bold tracking-tight",
          dark ? "text-white" : "text-navy-900",
        )}
      >
        Baseline
      </span>
      <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-red-500/20 mt-0.5">
        <span className="absolute inset-y-0 left-0 w-2/3 bg-red-500 transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  );
}
