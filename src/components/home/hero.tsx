"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/home/globe";
import { openWhatsApp } from "@/lib/whatsapp";

const headline = ["Your journey from Abuja", "to the world's", "best universities", "starts here."];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 20 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative overflow-hidden bg-ink-950 pb-16 pt-14 sm:pb-24 sm:pt-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196, 165, 123,0.16),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(74, 66, 64, 0.5),transparent_50%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/70"
          >
            Study Abroad Consultants · Abuja, Nigeria
          </motion.div>

          <h1 className="font-display text-balance text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] tracking-tight text-white">
            {headline.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                  className={i === headline.length - 1 ? "inline-block font-serif-em font-normal text-gold-500" : "inline-block"}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
          >
            Admissions, scholarships and visa guidance for the UK, Ireland, Germany, Canada, the USA and Australia,
            built around your grades, your budget, and your goals.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button href="/tools/course-matcher" size="lg" magnetic icon={<ArrowRight size={18} />}>
              Take the Course Matcher Quiz
            </Button>
            <Button href="/book" size="lg" variant="outline-light" magnetic>
              Book a Free Consultation
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-5 text-sm text-white/45"
          >
            No guarantees, no pressure, just an honest, personalised plan for your first free consultation.
          </motion.p>

          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            onClick={() => openWhatsApp("Hi Baseline, I'd like to know more about studying abroad.", "hero")}
            className="mt-2 text-sm font-medium text-[#3ee089] underline-offset-4 hover:underline"
          >
            or chat with us on WhatsApp →
          </motion.button>
        </div>

        <motion.div
          style={{ rotateX, rotateY, transformPerspective: 800 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="relative"
        >
          <Globe />
        </motion.div>
      </div>
    </section>
  );
}
