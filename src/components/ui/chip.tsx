import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark" | "outline";

const toneClasses: Record<Tone, string> = {
  light: "bg-white text-ink-900 shadow-soft",
  dark: "bg-white/10 text-white border border-white/15",
  outline: "border border-ink-900/15 text-ink-900",
};

export function Chip({
  children,
  icon,
  tone = "light",
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium sm:text-sm", toneClasses[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
