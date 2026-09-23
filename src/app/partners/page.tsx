import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { PartnersGrid } from "@/components/partners/partners-grid";

export const metadata: Metadata = {
  title: "Partner Universities",
  description: "Browse Baseline's partner universities across the UK, Ireland, Germany, Canada, the USA and Australia.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <>
      <PageHero
        eyebrow="Partners"
        title="Our partner"
        emphasis="institutions."
        description="We work with universities across all six destinations. Browse by country to see what each partner offers."
      />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PartnersGrid />
        </div>
      </section>
    </>
  );
}
