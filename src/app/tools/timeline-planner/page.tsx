import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/page-hero";
import { TimelinePlannerTool } from "@/components/tools/timeline-planner/timeline-planner-tool";

export const metadata: Metadata = {
  title: "Timeline Planner",
  description: "A personalised, milestone-by-milestone study-abroad roadmap for 39 countries, worked back from your intake date, with visa steps and deadlines.",
  alternates: { canonical: "/tools/timeline-planner" },
};

export default function TimelinePlannerPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Your"
        emphasis="personal timeline."
        description="Pick any destination, your level and intake. We'll work backwards through applications, funds and visa steps, and tell you honestly if your timing is realistic."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <TimelinePlannerTool />
          </Suspense>
        </div>
      </section>
    </>
  );
}
