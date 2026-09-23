"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Flag } from "@/components/ui/flag";
import { destinations } from "@/data/destinations";
import { AnywhereElseBanner } from "@/components/destinations/anywhere-else-banner";
import { formatNaira } from "@/lib/utils";

function photoFor(code: string) {
  return `/destinations/${code}.webp`;
}

export function DestinationShowcase() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Study Destinations"
          title="Where would you like to study?"
          description="Start with our most popular destinations, or tell us where you're dreaming of. Wherever you want to study, we'll help you get there."
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => {
            const photo = photoFor(d.code);
            return (
              <RevealItem key={d.code}>
                <Link href={`/destinations/${d.slug}`} className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-2xl sm:h-80">
                  {photo ? (
                    <Image
                      src={photo}
                      alt={`${d.name} skyline`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <ImagePlaceholder label={`${d.name} skyline photo`} dark className="absolute inset-0 h-full w-full rounded-none border-0" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />

                  <div className="relative p-5 sm:p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Flag code={d.flagCode} size={24} alt={`${d.name} flag`} />
                      <h3 className="font-display text-xl font-bold text-white">{d.name}</h3>
                    </div>
                    <p className="text-sm text-white/70">{d.heroTagline}</p>

                    <div className="mt-3 hidden flex-col gap-1.5 sm:flex">
                      <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        Tuition from {formatNaira(d.tuitionRangeNgnPerYear[0])}/yr
                      </span>
                      <span className="line-clamp-1 text-xs text-white/60">{d.postStudyWork}</span>
                    </div>

                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 group-hover:translate-x-1">
                      Explore <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <div className="mt-8">
          <AnywhereElseBanner />
        </div>
      </div>
    </section>
  );
}
