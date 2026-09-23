import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Home, CalendarDays, Briefcase, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Accordion } from "@/components/ui/accordion";
import { DestinationSubNav } from "@/components/destinations/destination-sub-nav";
import { FinalCta } from "@/components/home/final-cta";
import { destinations } from "@/data/destinations";
import { faqs } from "@/data/faqs";
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

const relevantFaqs = faqs.filter((f) => f.category === "Costs" || f.category === "Visas").slice(0, 4);

export default async function DestinationDetailPage({ params }: PageProps<"/destinations/[country]">) {
  const { country } = await params;
  const destination = destinations.find((d) => d.slug === country);
  if (!destination) notFound();

  const waMessage = `Hi Baseline, I'm interested in studying in ${destination.name}. Can you tell me more?`;

  return (
    <>
      <section id="overview" className="relative flex min-h-[440px] scroll-mt-36 items-end overflow-hidden bg-ink-950 sm:min-h-[540px]">
        <Image src={`/destinations/${destination.code}.webp`} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/25" />

        <div className="relative w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center gap-2.5">
              <Flag code={destination.flagCode} size={26} alt="" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">Study in {destination.name}</p>
            </div>
            <h1 className="mt-4 font-display text-balance text-h1 font-bold leading-[1.08] text-white">{destination.name}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">{destination.summary}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href="/book" size="lg" magnetic>
                Book a Free Consultation
              </Button>
              <Button
                href={buildWhatsAppLink(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline-light"
                size="lg"
                magnetic
                icon={<WhatsAppIcon size={18} />}
              >
                Ask About {destination.name} on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>

      <DestinationSubNav />

      <section id="costs" className="scroll-mt-36 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {facts.map((f) => (
              <RevealItem key={f.key}>
                <div className="h-full rounded-2xl border border-ink-900/8 bg-offwhite p-6 shadow-soft">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500">
                    <f.icon size={24} />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">{f.label}</p>
                  <p className="mt-1.5 font-display text-h3 font-bold text-ink-900">
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

          <div className="mt-8 flex justify-center">
            <Link
              href={`/tools/cost-calculator?country=${destination.code}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 hover:translate-x-1"
            >
              Compare {destination.name} with another country <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs text-muted sm:text-sm">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-gold-500" />
            Figures above are estimates only and change over time. Confirm current tuition, visa fees and post-study
            work rules with us before making any decisions.
          </div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-36 bg-offwhite py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Popular Courses" title="What students" emphasis="study here." />
          <div className="mt-8 flex flex-wrap gap-3">
            {destination.topCourses.map((c) => (
              <span key={c} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-900 shadow-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="visa" className="scroll-mt-36 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Visa Notes" title="What the visa" emphasis="looks like." />
          <Reveal>
            <p className="mt-6 text-base leading-relaxed text-muted">{destination.visaNotes}</p>
            <p className="mt-4 text-sm text-muted">
              Requirements change and vary by applicant. We confirm the current process for you as part of our{" "}
              <Link href="/services/visa-assistance" className="text-gold-500 underline-offset-4 hover:underline">
                Visa Assistance
              </Link>{" "}
              service.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="faq" className="scroll-mt-36 bg-offwhite py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Common" emphasis="questions." />
          <div className="mt-8">
            <Accordion items={relevantFaqs} />
          </div>
          <div className="mt-6 text-center">
            <Link href="/faq" className="text-sm font-semibold text-gold-500 hover:underline">
              See all FAQs
            </Link>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
