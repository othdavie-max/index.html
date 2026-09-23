"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Icon3DTile, type Icon3DName } from "@/components/ui/icon-3d";
import { Counter } from "@/components/ui/counter";

function ProgressRing({ percent }: { percent: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-gold-500)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (percent / 100) * c}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-display text-xs font-bold text-white">{percent}%</span>
    </span>
  );
}

function MilestoneDots({ count = 9, filled = 4 }: { count?: number; filled?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < filled ? "bg-gold-500" : "bg-white/15"}`} />
      ))}
    </div>
  );
}

const tools: { href: string; icon: Icon3DName; title: string; description: string; preview: ReactNode }[] = [
  {
    href: "/tools/course-matcher",
    icon: "bullseye",
    title: "Course Matcher",
    description: "A 2-minute quiz that ranks our popular destinations by fit for your grades, budget and goals.",
    preview: (
      <div className="flex items-center gap-3">
        <ProgressRing percent={87} />
        <div>
          <p className="text-xs text-white/50">Best match</p>
          <p className="font-display text-sm text-white">Canada</p>
        </div>
      </div>
    ),
  },
  {
    href: "/tools/cost-calculator",
    icon: "money-bag",
    title: "Cost Calculator",
    description: "Estimate tuition and living costs in naira, broken down by country, level and city.",
    preview: (
      <div>
        <p className="text-xs text-white/50">Estimated per year</p>
        <Counter value={18_400_000} format={(v) => `₦${(v / 1_000_000).toFixed(1)}M`} className="font-display text-lg text-white" />
      </div>
    ),
  },
  {
    href: "/tools/timeline-planner",
    icon: "spiral-calendar",
    title: "Timeline Planner",
    description: "A personalised, milestone-by-milestone roadmap working backwards from your intake date.",
    preview: (
      <div>
        <p className="text-xs text-white/50">Your roadmap</p>
        <div className="mt-2">
          <MilestoneDots />
        </div>
      </div>
    ),
  },
];

export function ToolsTeaser() {
  return (
    <section className="bg-ink-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Free Tools"
          title="Plan before you"
          emphasis="apply."
          description="Three interactive tools to help you make decisions with real numbers, not guesswork."
          dark
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tools.map((tool) => (
            <RevealItem key={tool.href}>
              <Link
                href={tool.href}
                className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/30 hover:bg-white/[0.05]"
              >
                <div>
                  <Icon3DTile name={tool.icon} size={40} tileSize={56} className="bg-white/[0.06]" />
                  <h3 className="mt-5 font-display text-xl text-white">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{tool.description}</p>
                </div>
                <div className="mt-6 hidden items-center justify-between rounded-xl bg-white/5 px-4 py-3 sm:flex">
                  {tool.preview}
                  <ArrowRight size={16} className="text-white transition-transform duration-300 group-hover:translate-x-1" />
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500">
                  Try it free — 2 min
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
