import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { TimelinePlannerTool } from "@/components/tools/timeline-planner/timeline-planner-tool";

export const metadata: Metadata = {
  title: "Timeline Planner",
  description: "Build a personalised, milestone-by-milestone roadmap working backwards from your target intake date.",
  alternates: { canonical: "/tools/timeline-planner" },
};

export default function TimelinePlannerPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Your"
        emphasis="personal timeline."
        description="Pick your destination, level and intake — we'll work backwards to show exactly when each step is due."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <TimelinePlannerTool />
        </div>
      </section>
    </>
  );
}
