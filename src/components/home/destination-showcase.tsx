"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { destinations } from "@/data/destinations";

export function DestinationShowcase() {
  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Study Destinations"
          title="Where would you like to study?"
          description="Six countries, one clear plan. Explore what each destination actually offers before you commit."
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <RevealItem key={d.code}>
              <Link href={`/destinations/${d.slug}`} className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-2xl">
                <ImagePlaceholder
                  label={`${d.name} skyline photo`}
                  dark
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />

                <div className="relative p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{d.flag}</span>
                    <h3 className="font-display text-xl font-bold text-white">{d.name}</h3>
                  </div>
                  <p className="text-sm text-white/70">{d.heroTagline}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 group-hover:translate-x-1">
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
