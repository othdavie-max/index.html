"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Flag } from "@/components/ui/flag";
import { Icon3D } from "@/components/ui/icon-3d";
import { destinations } from "@/data/destinations";
import { OtherDestinationsChips } from "@/components/destinations/other-destinations-chips";

const photos: Record<string, string> = {
  uk: "/destinations/uk.png",
  ireland: "/destinations/ireland.png",
  germany: "/destinations/germany.png",
  canada: "/destinations/canada.png",
  usa: "/destinations/usa.webp",
  australia: "/destinations/australia.webp",
};

export function DestinationShowcase() {
  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Study Destinations"
          title="Where would you like to study?"
          description="Start with our most popular destinations, or tell us where you're dreaming of. Wherever you want to study, we'll help you get there."
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => {
            const photo = photos[d.code];
            return (
              <RevealItem key={d.code}>
                <Link href={`/destinations/${d.slug}`} className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-2xl">
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
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />

                  <div className="relative p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Flag code={d.flagCode} size={24} alt={`${d.name} flag`} />
                      <h3 className="font-display text-xl font-bold text-white">{d.name}</h3>
                    </div>
                    <p className="text-sm text-white/70">{d.heroTagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 group-hover:translate-x-1">
                      Explore <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}

          <RevealItem>
            <Link
              href="/destinations/other"
              className="group relative flex h-80 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gold-500/40 bg-gradient-to-br from-ink-900 to-ink-950 p-6 text-center transition-colors hover:border-gold-500"
            >
              <Icon3D name="globe-europe-africa" size={88} alt="" className="drop-shadow-lg" />
              <h3 className="mt-5 font-display text-xl font-bold text-white">Anywhere else in the world</h3>
              <p className="mt-2 text-sm text-white/70">
                Netherlands, France, Malaysia, the UAE, South Africa, Ghana and beyond. If you want to study there,
                we&apos;ll help.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 group-hover:translate-x-1">
                Talk to us <ArrowRight size={14} />
              </span>
            </Link>
          </RevealItem>
        </RevealGroup>

        <OtherDestinationsChips />
      </div>
    </section>
  );
}
