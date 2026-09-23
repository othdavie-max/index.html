import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "white" | "offwhite" | "navy";

const toneClasses: Record<Tone, string> = {
  white: "bg-white",
  offwhite: "bg-offwhite",
  navy: "bg-ink-950",
};

export function Section({
  children,
  tone = "white",
  className,
  containerClassName,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section className={cn("py-20 sm:py-28", toneClasses[tone], className)}>
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", containerClassName)}>{children}</div>
    </section>
  );
}
