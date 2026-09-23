import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Icon3DTile } from "@/components/ui/icon-3d";
import { OtherDestinationsGrouped } from "@/components/destinations/other-destinations-grouped";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Study Abroad Anywhere",
  description:
    "Considering a country that isn't one of our featured destinations? Baseline researches, guides and supports students heading anywhere in the world.",
  alternates: { canonical: "/destinations/other" },
};

const steps = [
  {
    icon: "speech-balloon" as const,
    title: "Tell us where",
    description: "Your country, course and budget.",
  },
  {
    icon: "world-map" as const,
    title: "We research it for you",
    description: "Universities, real costs, entry and visa requirements.",
  },
  {
    icon: "outbox-tray" as const,
    title: "We guide you through it",
    description: "Application, documents, visa, pre-departure.",
  },
];

export default async function OtherDestinationPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const trimmedCountry = country?.trim();

  const heroTitle = trimmedCountry ? `Studying in ${trimmedCountry}? That's fine.` : "Your destination isn't on our list? That's fine.";
  const heroIntro = trimmedCountry
    ? `Our six featured destinations are simply where most Nigerian students go. They're not a limit. Whether you're considering ${trimmedCountry} or anywhere else, we'll research your options, guide your application, and support your visa, just as we would for the UK or Canada.`
    : "Our six featured destinations are simply where most Nigerian students go. They're not a limit. Whether you're considering Europe, Asia, the Middle East, Oceania, or another African country, we'll research your options, guide your application, and support your visa, just as we would for the UK or Canada.";

  const bookHref = trimmedCountry ? `/book?destination=${encodeURIComponent(trimmedCountry)}` : "/book?destination=Another%20country";
  const waMessage = trimmedCountry
    ? `Hi Baseline, I'd like to study in ${trimmedCountry}. Can you help?`
    : "Hi Baseline, I'm interested in studying in a country that isn't listed on your website. Can you help?";

  return (
    <>
      <PageHero eyebrow="Study Anywhere" title={heroTitle} description={heroIntro}>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={bookHref} size="lg" magnetic>
            Book a Free Consultation
          </Button>
          <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg" icon={<MessageCircle size={18} />}>
            Ask on WhatsApp
          </Button>
        </div>
      </PageHero>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How It Works" title="Three steps," emphasis="wherever you're headed." align="center" className="mx-auto" />
          <RevealGroup className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem key={step.title}>
                <div className="flex flex-col items-center text-center">
                  <Icon3DTile name={step.icon} size={40} tileSize={64} />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gold-500">Step {i + 1}</p>
                  <h3 className="mt-1 font-display text-lg text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-gold-500/20 bg-gold-500/5 p-6 text-center">
            <p className="text-sm leading-relaxed text-ink-900">
              Costs, intakes and visa rules differ in every country, so we prepare this information for you personally rather
              than publishing estimates we can&apos;t stand behind.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Beyond Our Popular Destinations" title="Countries students" emphasis="ask us about." align="center" className="mx-auto" />
          <div className="mt-12">
            <OtherDestinationsGrouped />
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-3">
            <Button href={bookHref} size="lg" magnetic>
              Book a Free Consultation
            </Button>
            <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg" icon={<MessageCircle size={18} />}>
              Ask on WhatsApp
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
