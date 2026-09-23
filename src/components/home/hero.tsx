"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/lib/whatsapp";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-950">
      {/* The headline below is baked into the banner image for the visual
          design; kept here as real text (visually hidden) so it's still
          readable by screen readers and indexable by search engines. */}
      <h1 className="sr-only">
        Your journey from Abuja to the world&apos;s best universities starts here. Admissions, scholarships and visa
        guidance.
      </h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative w-full"
      >
        <Image
          src="/hero-banner.png"
          alt="Your journey from Abuja to the world's best universities starts here. Admissions, Scholarships, Visa Guidance."
          width={1344}
          height={752}
          priority
          sizes="100vw"
          className="h-auto w-full"
        />
      </motion.div>

      <div className="relative border-t border-white/10 bg-ink-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-wrap items-center gap-5"
          >
            <Button href="/book" size="lg" magnetic icon={<ArrowRight size={18} />}>
              Book a Consultation
            </Button>
            <button
              type="button"
              onClick={() => openWhatsApp("Hi Baseline, I'd like to know more about studying abroad.", "hero")}
              className="group flex items-center gap-2.5 text-sm font-semibold text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-gold-500">
                <Play size={14} fill="currentColor" />
              </span>
              Chat on WhatsApp
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
