"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { HeroQuickstart } from "@/components/home/hero-quickstart";
import { openWhatsApp } from "@/lib/whatsapp";

const HEADLINE = "Your journey from Nigeria to the world's best universities starts here.";

const headlineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function Hero() {
  const [playVideo, setPlayVideo] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(rm);
    if (!rm) setPlayVideo(true);
  }, []);

  return (
    <section className="relative flex min-h-[620px] items-end overflow-hidden bg-ink-950 sm:min-h-[720px]">
      <div className={reducedMotion ? "absolute inset-0" : "absolute inset-0 animate-ken-burns"}>
        {playVideo ? (
          <video autoPlay muted loop playsInline poster="/hero-poster.jpg" className="h-full w-full object-cover">
            <source src="/hero-video.webm" type="video/webm" />
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        ) : (
          <Image src="/hero-poster.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/75 to-ink-950/30" />

      <div className="relative w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <span className="mb-4 inline-block h-1 w-10 rounded-full bg-gold-500" />

          <motion.h1
            initial={reducedMotion ? "show" : "hidden"}
            animate="show"
            variants={headlineContainer}
            className="font-display max-w-2xl text-balance text-h1 font-bold leading-[1.08] text-white"
          >
            {HEADLINE.split(" ").map((word, i) => (
              <motion.span key={i} variants={wordVariant} className="mr-[0.28em] inline-block">
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.div
            initial={reducedMotion ? "show" : "hidden"}
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.5 }}
            className="mt-6 flex flex-wrap gap-2"
          >
            <Chip tone="dark" icon={<Check size={14} className="text-gold-500" />}>
              Free consultation
            </Chip>
            <Chip tone="dark" icon={<Check size={14} className="text-gold-500" />}>
              Real counsellors in Abuja
            </Chip>
            <Chip tone="dark" icon={<Check size={14} className="text-gold-500" />}>
              Any country
            </Chip>
          </motion.div>

          <motion.div
            initial={reducedMotion ? "show" : "hidden"}
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button href="/book" size="lg" magnetic icon={<ArrowRight size={18} />}>
              Book a Free Consultation
            </Button>
            <Button
              onClick={() => openWhatsApp("Hi Baseline, I'd like to know more about studying abroad.", "hero")}
              size="lg"
              variant="outline-light"
              magnetic
              icon={<WhatsAppIcon size={18} />}
            >
              Chat on WhatsApp
            </Button>
          </motion.div>

          <motion.div initial={reducedMotion ? "show" : "hidden"} animate="show" variants={fadeUp} transition={{ delay: 0.7 }}>
            <HeroQuickstart />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
