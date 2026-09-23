"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { HeroQuickstart } from "@/components/home/hero-quickstart";
import { openWhatsApp } from "@/lib/whatsapp";

const HEADLINE = "Your journey from Nigeria to the world's best universities starts here.";
const WORD_STAGGER_S = 0.06;

export function Hero() {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) return;

    // Swap the poster image for the autoplaying video only after the page
    // has settled, so the fast, static image (not the video's decode time)
    // is what LCP measures — video-as-hero-background is otherwise a common
    // cause of a slow Largest Contentful Paint.
    const start = () => setPlayVideo(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(start, 300);
    return () => clearTimeout(timer);
  }, []);

  const words = HEADLINE.split(" ");

  return (
    <section className="relative flex min-h-[620px] items-end overflow-hidden bg-ink-950 sm:min-h-[720px]">
      <div className="absolute inset-0 animate-ken-burns">
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
          <span className="animate-word-in mb-4 inline-block h-1 w-10 rounded-full bg-gold-500" />

          {/* CSS-only reveal (not framer-motion): stays on the critical
              rendering path so the headline paints as soon as CSS is
              parsed, instead of waiting on React hydration — the biggest
              single lever for this section's Largest Contentful Paint. */}
          <h1 className="font-display max-w-2xl text-balance text-h1 font-bold leading-[1.08] text-white">
            {words.map((word, i) => (
              <span
                key={i}
                className="animate-word-in mr-[0.28em] inline-block"
                style={{ animationDelay: `${i * WORD_STAGGER_S}s` }}
              >
                {word}
              </span>
            ))}
          </h1>

          <div
            className="animate-word-in mt-6 flex flex-wrap gap-2"
            style={{ animationDelay: `${words.length * WORD_STAGGER_S + 0.1}s` }}
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
          </div>

          <div
            className="animate-word-in mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: `${words.length * WORD_STAGGER_S + 0.2}s` }}
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
          </div>

          <div className="animate-word-in" style={{ animationDelay: `${words.length * WORD_STAGGER_S + 0.3}s` }}>
            <HeroQuickstart />
          </div>
        </div>
      </div>
    </section>
  );
}
