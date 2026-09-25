"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizProgress } from "@/components/tools/quiz-progress";

export function StepShell({
  step,
  total,
  title,
  hint,
  children,
  onBack,
  onNext,
  canNext = true,
  nextLabel = "Next",
}: {
  step: number;
  total: number;
  title: string;
  hint?: string;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  canNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <QuizProgress step={step} total={total} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-8"
        >
          <h2 className="font-display text-xl text-ink-900 sm:text-2xl">{title}</h2>
          {hint && <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>}
          <div className="mt-6">{children}</div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={step === 0} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canNext} icon={<ArrowRight size={16} />}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
