import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Flag } from "@/components/ui/flag";
import { StoriesGrid } from "@/components/success-stories/stories-grid";
import { FinalCta } from "@/components/home/final-cta";
import { testimonials } from "@/data/testimonials";
import { getDestination } from "@/data/destinations";

export const metadata: Metadata = {
  title: "Success Stories",
  description: "Real student journeys and visa approvals. Hear from students who studied abroad with Baseline.",
  alternates: { canonical: "/success-stories" },
};

export default function SuccessStoriesPage() {
  const approved = testimonials.filter((t) => t.visaApproved);

  return (
    <>
      <PageHero eyebrow="Success Stories" title="Real students," emphasis="real journeys." description="Video stories and visa approvals from students who trusted us with their journey." />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StoriesGrid />
        </div>
      </section>

      <section className="bg-offwhite py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Visa Approvals Wall" title="Recently" emphasis="approved." align="center" className="mx-auto" />
          <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted">
            Shared only with each student&apos;s consent. PLACEHOLDER entries, replace with real approvals as they come in.
          </p>

          <RevealGroup className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {approved.map((t) => {
              const destination = getDestination(t.country);
              return (
                <RevealItem key={t.id}>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink-900/8 bg-white p-5 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 font-display text-sm text-ink-900">
                      {t.photoPlaceholder}
                    </div>
                    <p className="text-xs font-semibold text-ink-900">{t.name}</p>
                    <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
                      {destination && <Flag code={destination.flagCode} size={12} alt="" />} {destination?.name}
                    </p>
                    <span className="mt-1 flex items-center gap-1 rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold text-gold-600">
                      <ShieldCheck size={10} /> Approved
                    </span>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
