"use client";

import { motion } from "framer-motion";
import { formatNaira } from "@/lib/utils";

const COLORS = ["#C4A57B", "#2A1810", "#4A4240", "#8B6F47", "#7A6F68", "#A38F7E", "#EDE4DD"];

export function DonutChart({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce<{ label: string; dash: number; offset: number }[]>((acc, d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    return [...acc, { label: d.label, dash, offset }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-48 w-48 shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#EDE4DD" strokeWidth="20" />
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: -seg.offset }}
              transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total (est.)</span>
          <span className="font-display text-base text-ink-900">{formatNaira(total)}</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink-900">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {d.label}
            </span>
            <span className="font-medium text-muted">{formatNaira(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
