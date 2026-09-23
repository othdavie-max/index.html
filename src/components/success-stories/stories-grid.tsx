"use client";

import { useState } from "react";
import { Play, ShieldCheck } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Flag } from "@/components/ui/flag";
import { TestimonialLightbox } from "@/components/success-stories/testimonial-lightbox";
import { testimonials } from "@/data/testimonials";
import { destinations } from "@/data/destinations";
import type { CountryCode } from "@/types";
import type { Testimonial } from "@/types";

const filterTabs = [{ id: "all" as const, label: "All Countries" }, ...destinations.map((d) => ({ id: d.code, label: d.name }))];

export function StoriesGrid() {
  const [filter, setFilter] = useState<CountryCode | "all">("all");
  const [active, setActive] = useState<Testimonial | null>(null);
  const filtered = filter === "all" ? testimonials : testimonials.filter((t) => t.country === filter);

  return (
    <div>
      <Tabs tabs={filterTabs} defaultTab="all" onChange={setFilter} />

      <p className="mt-6 rounded-xl border border-gold-500/20 bg-gold-500/5 p-3 text-xs text-muted sm:text-sm">
        PLACEHOLDER testimonials shown below. Replace with real, consented student stories before launch.
      </p>

      <RevealGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const destination = destinations.find((d) => d.code === t.country);
          return (
            <RevealItem key={t.id}>
              <button onClick={() => setActive(t)} className="group block w-full overflow-hidden rounded-2xl border border-ink-900/8 bg-white text-left">
                <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
                  <span className="font-display text-4xl text-white/20">{t.photoPlaceholder}</span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
                    <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                      <Play size={18} className="ml-0.5 fill-ink-900 text-ink-900" />
                    </span>
                  </div>
                  {t.visaApproved && (
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                      <ShieldCheck size={12} /> Visa Approved
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-sm text-ink-900">{t.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    {t.course} · {destination && <Flag code={destination.flagCode} size={13} alt="" />} {destination?.name}
                  </p>
                </div>
              </button>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <TestimonialLightbox testimonial={active} onClose={() => setActive(null)} />
    </div>
  );
}
