import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

// Old call sites still pass emphasis text with a trailing "." from the
// previous italic-emphasis design; strip it here so we don't double up
// with the accent period this component always renders. A trailing "?"
// or "!" is preserved as-is (no accent period appended after those).
function stripTrailingPeriod(text: string) {
  return text.replace(/\.+$/, "");
}

export function PageHero({
  eyebrow,
  title,
  emphasis,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  emphasis?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  const cleanTitle = stripTrailingPeriod(title);
  const cleanEmphasis = emphasis ? stripTrailingPeriod(emphasis) : undefined;
  const lastChar = (cleanEmphasis ?? cleanTitle).trim().slice(-1);
  const skipAccentPeriod = lastChar === "?" || lastChar === "!";

  return (
    <section className={cn("relative overflow-hidden bg-offwhite py-20 sm:py-28", className)}>
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          {eyebrow && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">{eyebrow}</p>
              <span className="mx-auto mt-2 block h-[3px] w-8 rounded-full bg-gold-500" />
            </>
          )}
          <h1 className="mt-4 font-display text-balance text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.1] text-ink-900">
            {cleanTitle}
            {cleanEmphasis && <span className="text-gold-500"> {cleanEmphasis}</span>}
            {!skipAccentPeriod && <span className="text-gold-500">.</span>}
          </h1>
          {description && <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{description}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
