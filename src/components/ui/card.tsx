"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  hoverLift = true,
}: {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}) {
  return (
    <motion.div
      whileHover={hoverLift ? { y: -6 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft transition-shadow duration-300 hover:shadow-hover",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
