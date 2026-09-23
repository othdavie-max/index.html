import { motion } from "framer-motion";

export function QuizProgress({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span>
          Question {step + 1} of {total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-900/10">
        <motion.div
          className="h-full rounded-full bg-gold-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
