import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/page-hero";
import { CostCalculatorTool } from "@/components/tools/cost-calculator/cost-calculator-tool";

export const metadata: Metadata = {
  title: "Cost Calculator",
  description: "Estimate tuition, living costs, visa fees and flights in naira for 39 countries, with year-by-year totals and what you need before your visa.",
  alternates: { canonical: "/tools/cost-calculator" },
};

export default function CostCalculatorPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Estimate your"
        emphasis="total cost."
        description="Any country, any level. See every cost in naira, what you need before your visa, and what happens if the naira weakens."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <CostCalculatorTool />
          </Suspense>
        </div>
      </section>
    </>
  );
}
