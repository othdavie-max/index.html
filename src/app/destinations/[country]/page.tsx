import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Home, CalendarDays, Briefcase, ShieldAlert } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { destinations } from "@/data/destinations";
import { formatNaira } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function generateStaticParams() {
  return destinations.map((d) => ({ country: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/destinations/[country]">): Promise<Metadata> {
  const { country } = await params;
  const destination = destinations.find((d) => d.slug === country);
  if (!destination) return {};
  return {
    title: `Study in ${destination.name}`,
    description: destination.summary,
    alternates: { canonical: `/destinations/${destination.slug}` },
  };
}

const facts = [
  { key: "tuition", icon: GraduationCap, label: "Tuition (est.)" },
  { key: "living", icon: Home, label: "Living costs (est.)" },
  { key: "intakes", icon: CalendarDays, label: "Intakes" },
  { key: "work", icon: Briefcase, label: "Post-study work" },
] as const;

export default async function DestinationDetailPage({ params }: PageProps<"/destinations/[country]">) {
  const { country } = await params;
  const destination = destinations.find((d) => d.slug === country);
  if (!destination) notFound();

  const waMessage = `Hi Baseline, I'm interested in studying in ${destination.name}. Can you tell me more?`;

  return (
    <>
      <PageHero eyebrow={`Study in ${destination.name}`} title={destination.name} description={destination.summary}>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/book" size="lg" magnetic>
            Book a Free Consultation
          </Button>
          <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" variant="outline-light" size="lg" magnetic>
            Ask About {destination.name} on WhatsApp
          </Button>
        </div>
      </PageHero>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {facts.map((f) => (
              <RevealItem key={f.key}>
                <div className="h-full rounded-2xl border border-navy-900/8 bg-offwhite p-5">
                  <f.icon size={20} className="text-red-500" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">{f.label}</p>
                  <p className="mt-1 font-display text-sm font-bold text-navy-900 sm:text-base">
                    {f.key === "tuition" &&
                      `${formatNaira(destination.tuitionRangeNgnPerYear[0])} – ${formatNaira(destination.tuitionRangeNgnPerYear[1])}/yr`}
                    {f.key === "living" &&
                      `${formatNaira(destination.livingCostsNgnPerYear[0])} – ${formatNaira(destination.livingCostsNgnPerYear[1])}/yr`}
                    {f.key === "intakes" && destination.intakes.join(", ")}
                    {f.key === "work" && destination.postStudyWork}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-muted sm:text-sm">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
            Figures above are estimates only and change over time. Confirm current tuition, visa fees and post-study
            work rules with us before making any decisions.
          </div>
        </div>
      </section>

      <section className="bg-offwhite py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Popular Courses" title="What students" emphasis="study here." />
          <div className="mt-8 flex flex-wrap gap-3">
            {destination.topCourses.map((c) => (
              <span key={c} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-900 shadow-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Visa Notes" title="What the visa" emphasis="looks like." />
          <Reveal>
            <p className="mt-6 text-base leading-relaxed text-muted">{destination.visaNotes}</p>
            <p className="mt-4 text-sm text-muted">
              Requirements change and vary by applicant. We confirm the current process for you as part of our{" "}
              <Link href="/services/visa-assistance" className="text-red-500 underline-offset-4 hover:underline">
                Visa Assistance
              </Link>{" "}
              service.
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
