"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { destinations } from "@/data/destinations";
import { services } from "@/data/services";
import { openWhatsApp } from "@/lib/whatsapp";

const stats = [
  { value: `${destinations.length}`, label: "Study Destinations" },
  { value: `${services.length}`, label: "Expert-Led Services" },
  { value: "100%", label: "Personalised Plans" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-500"
          >
            Study Abroad With Baseline
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-balance text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.1] tracking-tight text-ink-900"
          >
            Your journey from Abuja to the world&apos;s best universities starts here
            <span className="text-gold-500">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
          >
            Admissions, scholarships and visa guidance for the UK, Ireland, Germany, Canada, the USA and Australia,
            built around your grades, your budget, and your goals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-5"
          >
            <Button href="/book" size="lg" magnetic icon={<ArrowRight size={18} />}>
              Book a Consultation
            </Button>
            <button
              type="button"
              onClick={() => openWhatsApp("Hi Baseline, I'd like to know more about studying abroad.", "hero")}
              className="group flex items-center gap-2.5 text-sm font-semibold text-ink-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 transition-colors group-hover:bg-gold-500 group-hover:text-white">
                <Play size={14} fill="currentColor" />
              </span>
              Chat on WhatsApp
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-10 flex flex-wrap gap-8 border-t border-ink-900/8 pt-6"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl font-bold text-ink-900">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-ink-100">
            <Image
              src="/hero-student.webp"
              alt="Nigerian student standing in front of a UK university, ready to begin her study-abroad journey"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-ink-900 px-5 py-4 text-white shadow-xl sm:block">
            <p className="font-display text-lg font-bold">Better Education.</p>
            <p className="font-display text-lg font-bold text-gold-500">Bigger Opportunities.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
