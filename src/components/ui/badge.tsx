import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "navy",
}: {
  children: ReactNode;
  className?: string;
  tone?: "navy" | "red" | "light";
}) {
  const tones = {
    navy: "bg-ink-100 text-ink-900",
    red: "bg-gold-500/10 text-gold-600",
    light: "bg-white/10 text-white border border-white/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
