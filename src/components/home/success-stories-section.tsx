import Link from "next/link";
import { Play, ShieldCheck, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem, Reveal } from "@/components/ui/reveal";
import { realTestimonials, MIN_REAL_TESTIMONIALS_TO_SHOW_GRID } from "@/data/testimonials";

// Never renders placeholder testimonials — below the real-story threshold
// this collapses to a single honest "your story could be next" prompt.
export function SuccessStoriesSection() {
  const hasEnoughRealStories = realTestimonials.length >= MIN_REAL_TESTIMONIALS_TO_SHOW_GRID;

  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Success Stories" title="Real students," emphasis="real journeys." />
          {hasEnoughRealStories && (
            <Button href="/success-stories" variant="secondary" size="sm">
              View all stories
            </Button>
          )}
        </div>

        {hasEnoughRealStories ? (
          <RevealGroup className="no-scrollbar mt-12 flex snap-x gap-5 overflow-x-auto pb-2">
            {realTestimonials.slice(0, 4).map((t) => (
              <RevealItem key={t.id} className="w-[280px] shrink-0 snap-start">
                <Link href="/success-stories" className="group block overflow-hidden rounded-2xl border border-ink-900/8 bg-white">
                  <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
                    <span className="font-display text-4xl text-white/20">{t.photoPlaceholder}</span>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
                      <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                        <Play size={18} className="ml-0.5 fill-ink-900 text-ink-900" />
                      </span>
                    </div>
                    {t.visaApproved && (
                      <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <ShieldCheck size={12} /> Visa Approved
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-display text-sm text-ink-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t.course} · {t.university}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <Reveal className="mt-12">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-900/15 bg-white px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
                <Sparkles size={22} />
              </span>
              <div>
                <p className="font-display text-lg text-ink-900">Your story could be next.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  We&apos;re building our wall of real, consented student journeys. Book a free consultation and start
                  yours.
                </p>
              </div>
              <Button href="/book" size="sm">
                Book a Free Consultation
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
