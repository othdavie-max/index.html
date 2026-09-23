import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { GuideCard } from "@/components/guides/guide-card";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  title: "Free Guides",
  description: "Free downloadable guides on visas, scholarships and applications for Nigerian students studying abroad.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <>
      <PageHero eyebrow="Free Guides" title="Download, don't" emphasis="guess." description="Practical PDF guides you can save, print and follow step by step." />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {guides.map((g) => (
              <RevealItem key={g.slug}>
                <GuideCard guide={g} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
