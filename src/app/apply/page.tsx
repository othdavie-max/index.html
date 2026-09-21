import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { ApplicationWizard } from "@/components/apply/application-wizard";

export const metadata: Metadata = {
  title: "Apply Now",
  description: "Submit your study abroad application to Baseline Educational Services — personal details, documents, and everything in between.",
  alternates: { canonical: "/apply" },
};

export default function ApplyPage() {
  return (
    <>
      <PageHero
        eyebrow="Apply"
        title="Start your"
        emphasis="application."
        description="Six short steps. Your progress is saved automatically as you go, so you can pick up where you left off."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ApplicationWizard />
        </div>
      </section>
    </>
  );
}
