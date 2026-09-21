"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  emphasis,
  description,
  align = "left",
  dark = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  emphasis?: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "text-center mx-auto" : "text-left", "max-w-2xl", className)}>
      {eyebrow && (
        <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.2em]", dark ? "text-red-400" : "text-red-500")}>
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-display text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-tight",
          dark ? "text-white" : "text-navy-900",
        )}
      >
        {title} {emphasis && <span className="font-serif-em font-normal text-red-500">{emphasis}</span>}
      </h2>
      <motion.span
        initial={{ width: 0 }}
        whileInView={{ width: 56 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("mt-4 block h-[3px] rounded-full bg-red-500", align === "center" && "mx-auto")}
      />
      {description && (
        <p className={cn("mt-5 text-base leading-relaxed md:text-lg", dark ? "text-white/70" : "text-muted")}>
          {description}
        </p>
      )}
    </div>
  );
}
