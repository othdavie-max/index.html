"use client";

import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { openWhatsApp } from "@/lib/whatsapp";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <ImagePlaceholder
        label="CTA background — skyline at dusk with passport and boarding pass"
        dark
        className="absolute inset-0 h-full w-full rounded-none border-0"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">Ready To Take The Next Step?</p>
          <h2 className="mt-4 font-display text-balance text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-tight text-white">
            Your global future is closer than you think<span className="text-gold-500">.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            Book a free, no-pressure consultation, or message us on WhatsApp right now. A real counsellor will respond.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/book" size="lg" magnetic icon={<CalendarCheck size={18} />}>
              Book a Consultation
            </Button>
            <Button
              onClick={() => openWhatsApp("Hi Baseline, I'd like to speak with a counsellor about studying abroad.", "final-cta")}
              size="lg"
              variant="outline-light"
              magnetic
            >
              Chat on WhatsApp
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
