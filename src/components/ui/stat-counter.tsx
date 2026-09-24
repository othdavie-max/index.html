import type { LucideIcon } from "lucide-react";
import { Counter } from "@/components/ui/counter";
import { cn } from "@/lib/utils";

export function StatCounter({
  icon: Icon,
  value,
  suffix,
  label,
  dark = false,
  className,
}: {
  icon?: LucideIcon;
  value: number;
  suffix?: string;
  label: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {Icon && <Icon size={20} className="text-gold-500" />}
      <Counter
        value={value}
        suffix={suffix}
        className={cn("mt-2.5 block font-display text-h3 font-bold", dark ? "text-white" : "text-ink-900")}
      />
      <p className={cn("mt-1 text-xs font-medium sm:text-sm", dark ? "text-white/60" : "text-muted")}>{label}</p>
    </div>
  );
}
