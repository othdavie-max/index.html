import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { FaqExplorer } from "@/components/faq/faq-explorer";
import { FinalCta } from "@/components/home/final-cta";
import { faqs } from "@/data/faqs";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about costs, visas, admissions, English tests, scholarships and working abroad.",
  alternates: { canonical: "/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageHero eyebrow="FAQ" title="Questions people" emphasis="actually ask." description="Search or filter by category to find your answer." />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FaqExplorer />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
