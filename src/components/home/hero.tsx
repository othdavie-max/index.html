"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/lib/whatsapp";

export function Hero() {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) setPlayVideo(true);
  }, []);

  return (
    <section className="relative flex min-h-[560px] items-end overflow-hidden bg-ink-950 sm:min-h-[680px]">
      <div className="absolute inset-0">
        {playVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/hero-poster.jpg"
            className="h-full w-full object-cover"
          >
            <source src="/hero-video.webm" type="video/webm" />
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        ) : (
          <Image
            src="/hero-poster.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/25" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <span className="mb-4 inline-block h-1 w-10 rounded-full bg-gold-500" />
          <h1 className="font-hero max-w-2xl text-3xl font-light leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            Your journey from Nigeria to the world&apos;s best universities starts here.
          </h1>
          <p className="mt-4 max-w-lg text-sm font-semibold uppercase tracking-[0.15em] text-white/70 sm:text-base">
            Admissions &middot; Scholarships &middot; Visa Guidance
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center gap-5"
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
      </motion.div>
    </section>
  );
}
