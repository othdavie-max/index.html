import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Marquee({
  children,
  className,
  fast = false,
}: {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}) {
  return (
    <div className={cn("group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]", className)}>
      <div className={cn("flex shrink-0 items-center gap-12 pr-12", fast ? "animate-marquee-fast" : "animate-marquee", "group-hover:[animation-play-state:paused]")}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn("flex shrink-0 items-center gap-12 pr-12", fast ? "animate-marquee-fast" : "animate-marquee", "group-hover:[animation-play-state:paused]")}
      >
        {children}
      </div>
    </div>
  );
}
