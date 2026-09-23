import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { CostCalculatorTool } from "@/components/tools/cost-calculator/cost-calculator-tool";

export const metadata: Metadata = {
  title: "Cost Calculator",
  description: "Estimate tuition and living costs in naira for studying in the UK, Ireland, Germany, Canada, the USA or Australia.",
  alternates: { canonical: "/tools/cost-calculator" },
};

export default function CostCalculatorPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Estimate your"
        emphasis="total cost."
        description="Adjust country, city, accommodation and duration to see a personalised naira estimate."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <CostCalculatorTool />
        </div>
      </section>
    </>
  );
}
