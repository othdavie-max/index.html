import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { partners } from "@/data/partners";
import { getDestination } from "@/data/destinations";

export function generateStaticParams() {
  return partners.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/partners/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const partner = partners.find((p) => p.slug === slug);
  if (!partner) return {};
  return { title: partner.name, alternates: { canonical: `/partners/${partner.slug}` } };
}

export default async function PartnerDetailPage({ params }: PageProps<"/partners/[slug]">) {
  const { slug } = await params;
  const partner = partners.find((p) => p.slug === slug);
  if (!partner) notFound();

  const destination = getDestination(partner.country);

  return (
    <>
      <PageHero eyebrow={destination ? `${destination.flag} ${destination.name}` : undefined} title={partner.name} description={partner.overview} />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading eyebrow="Popular Courses" title="What to" emphasis="study." />
            <Reveal>
              <div className="mt-5 flex flex-wrap gap-2">
                {partner.popularCourses.map((c) => (
                  <span key={c} className="rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-900">
                    {c}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <div>
            <SectionHeading eyebrow="Intakes" title="When to" emphasis="apply." />
            <Reveal>
              <div className="mt-5 flex flex-wrap gap-2">
                {partner.intakes.map((i) => (
                  <span key={i} className="rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-900">
                    {i}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Button href="/apply" size="lg" magnetic>
            Apply with Baseline
          </Button>
        </div>
      </section>
    </>
  );
}
