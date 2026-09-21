import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { MatcherQuiz } from "@/components/tools/course-matcher/matcher-quiz";

export const metadata: Metadata = {
  title: "Course Matcher Quiz",
  description: "A 2-minute quiz that ranks the UK, Ireland, Germany, Canada, the USA and Australia by fit for your grades, budget and goals.",
  alternates: { canonical: "/tools/course-matcher" },
};

export default function CourseMatcherPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Find your best-fit"
        emphasis="country."
        description="Answer a few quick questions — no guesswork, just a rule-based match to your grades, budget and goals."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MatcherQuiz />
        </div>
      </section>
    </>
  );
}
