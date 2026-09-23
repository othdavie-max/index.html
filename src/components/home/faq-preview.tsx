import { SectionHeading } from "@/components/ui/section-heading";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { faqs } from "@/data/faqs";

export function FaqPreview() {
  const top5 = faqs.slice(0, 5);

  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions people" emphasis="actually ask." align="center" className="mx-auto" />
        <div className="mt-12">
          <Accordion items={top5} />
        </div>
        <div className="mt-8 text-center">
          <Button href="/faq" variant="secondary">
            See all FAQs
          </Button>
        </div>
      </div>
    </section>
  );
}
