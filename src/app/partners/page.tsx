import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { PartnersGrid } from "@/components/partners/partners-grid";

export const metadata: Metadata = {
  title: "Partner Universities",
  description: "Browse Baseline's featured partner universities by country, and ask us about institutions anywhere else in the world.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <>
      <PageHero
        eyebrow="Partners"
        title="Our partner"
        emphasis="institutions."
        description="We work with universities around the world. Browse our featured partners by country below, and ask us about institutions anywhere else."
      />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PartnersGrid />
        </div>
      </section>
    </>
  );
}
