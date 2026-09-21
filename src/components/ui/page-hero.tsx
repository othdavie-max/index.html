import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

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
  return (
    <section className={cn("relative overflow-hidden bg-navy-950 py-20 sm:py-28", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(224,58,62,0.18),transparent_45%)]" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          {eyebrow && <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">{eyebrow}</p>}
          <h1 className="font-display text-balance text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.1] text-white">
            {title} {emphasis && <span className="font-serif-em font-normal text-red-400">{emphasis}</span>}
          </h1>
          {description && <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">{description}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
