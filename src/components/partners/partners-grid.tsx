"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { partners } from "@/data/partners";
import { destinations } from "@/data/destinations";
import type { CountryCode } from "@/types";

const filterTabs = [{ id: "all" as const, label: "All Countries" }, ...destinations.map((d) => ({ id: d.code, label: d.name }))];

export function PartnersGrid() {
  const [filter, setFilter] = useState<CountryCode | "all">("all");
  const filtered = filter === "all" ? partners : partners.filter((p) => p.country === filter);

  return (
    <>
      <Tabs tabs={filterTabs} defaultTab="all" onChange={setFilter} />

      <p className="mt-6 rounded-xl border border-gold-500/20 bg-gold-500/5 p-3 text-xs text-muted sm:text-sm">
        PLACEHOLDER partner list shown below — replace with Baseline&apos;s confirmed partner universities and logos
        before launch.
      </p>

      <RevealGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const dest = destinations.find((d) => d.code === p.country);
          return (
            <RevealItem key={p.slug}>
              <Link
                href={`/partners/${p.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-offwhite p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_20px_40px_-15px_rgba(42,_24,_16,0.2)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-xs font-bold text-white">
                    {p.logoPlaceholder}
                  </div>
                  <ArrowUpRight size={18} className="text-ink-900/40 transition-colors group-hover:text-gold-500" />
                </div>
                <h2 className="mt-4 font-display text-base text-ink-900">{p.name}</h2>
                <p className="mt-1 text-xs text-muted">
                  {dest?.flag} {dest?.name}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.popularCourses.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-ink-900">
                      {c}
                    </span>
                  ))}
                </div>
              </Link>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </>
  );
}
