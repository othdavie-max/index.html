"use client";

import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { openWhatsApp } from "@/lib/whatsapp";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink-900 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(196, 165, 123,0.25),transparent_55%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-display text-balance text-[clamp(1.75rem,4.5vw,3rem)] leading-tight text-white">
            Ready to start your <span className="font-serif-em font-normal text-gold-500">study abroad</span> journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            Book a free, no-pressure consultation, or message us on WhatsApp right now — a real counsellor will respond.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/book" size="lg" magnetic icon={<CalendarCheck size={18} />}>
              Book a Free Consultation
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
