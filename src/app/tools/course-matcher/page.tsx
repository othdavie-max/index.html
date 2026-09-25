import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { MatcherQuiz } from "@/components/tools/course-matcher/matcher-quiz";

export const metadata: Metadata = {
  title: "Course Matcher Quiz",
  description: "A 3-minute quiz that ranks 39 study destinations worldwide by fit for your grades, budget, English, priorities and timing.",
  alternates: { canonical: "/tools/course-matcher" },
};

export default function CourseMatcherPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Find your best-fit"
        emphasis="country."
        description="Nine quick questions. We compare 39 countries on budget, grades, English, your priorities and timing, and show exactly why each one fits."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MatcherQuiz />
        </div>
      </section>
    </>
  );
}
