"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { destinations } from "@/data/destinations";

export function DestinationShowcase() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Destinations"
          title="Where do you want to"
          emphasis="study?"
          description="Six countries, one clear plan. Explore what each destination actually offers before you commit."
        />

        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <RevealItem key={d.code}>
              <motion.div whileHover="hover" initial="rest" animate="rest" className="group relative h-72 overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-900 to-navy-950" />
                <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,rgba(224,58,62,0.5),transparent_60%)]" />

                <div className="relative flex h-full flex-col justify-between p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{d.flag}</span>
                    <Link
                      href={`/destinations/${d.slug}`}
                      className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
                    >
                      Explore <ArrowUpRight size={14} />
                    </Link>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold text-white">{d.name}</h3>
                    <p className="mt-1 text-sm text-white/60">{d.heroTagline}</p>

                    <motion.div
                      variants={{ rest: { height: 0, opacity: 0 }, hover: { height: "auto", opacity: 1 } }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {d.topCourses.slice(0, 3).map((c) => (
                          <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">
                            {c}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>

                <Link href={`/destinations/${d.slug}`} className="absolute inset-0" aria-label={`Explore studying in ${d.name}`} />
              </motion.div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
